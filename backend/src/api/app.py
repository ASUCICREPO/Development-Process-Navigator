"""Functional API dispatcher for ProcessCanvas (DynamoDB + Cognito backed).

Wires REST routes to domain logic. Auth (register/login) uses Cognito; protected routes read the
caller from the API Gateway Cognito authorizer claims. Persistence uses DynamoDB (fixed table names).
Reuses the pure scoring module and authoring validation/seed.
"""
from __future__ import annotations

import json
import os
import uuid
from datetime import datetime, timezone

import boto3

from ..authoring.seed_templates import build_seed_template
from ..authoring.service import validate_configuration
from ..exercise.models import Placement as ExPlacement, StudentExerciseState
from ..exercise.service import ExerciseService
from ..exercise.scoring import scoring as sc
from ..shared.errors import (AppError, ConflictError, ForbiddenError,
                             NotFoundError, ValidationError)
from ..shared.types import Phase, Principal, Role

_ddb = boto3.resource("dynamodb")
_cognito = boto3.client("cognito-idp")

USER_POOL_ID = os.environ.get("USER_POOL_ID", "")
USER_POOL_CLIENT_ID = os.environ.get("USER_POOL_CLIENT_ID", "")


def _t(name: str):
    # CDK injects TABLE_<NAME> env vars when deploying; fall back to bare name for local/test.
    return _ddb.Table(os.environ.get(f"TABLE_{name.upper()}", name))


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---- Principal from authorizer claims --------------------------------------

def principal_from_event(event) -> Principal | None:
    claims = (event.get("requestContext", {}).get("authorizer", {}) or {}).get("claims")
    if not claims:
        return None
    role = claims.get("custom:role", "STUDENT")
    try:
        role_enum = Role(role)
    except ValueError:
        role_enum = Role.STUDENT
    return Principal(user_id=claims.get("sub", ""), role=role_enum)


# ---- Scoring config from a stored snapshot ---------------------------------

def _config_from_snapshot(snapshot: dict) -> sc.Configuration:
    weights: dict[str, dict[Phase, int]] = {}
    for m in snapshot.get("mappings", []):
        aid = m["activityId"]
        weights.setdefault(aid, {})[Phase[m["phase"]]] = int(m["weight"])
    activities = [sc.ActivityConfig(a["activityId"], weights.get(a["activityId"], {}))
                  for a in snapshot.get("activities", [])]
    return sc.Configuration(activities=activities)


# ---- Exercise helpers (DynamoDB-backed providers) --------------------------

def _exercise_record(exercise_id: str) -> dict:
    item = _t("Exercises").get_item(Key={"exerciseId": exercise_id}).get("Item")
    if not item:
        raise NotFoundError("Exercise not found.")
    return item


def _version_snapshot(version_id: str, config_id: str) -> dict:
    # ConfigurationVersions keyed by (configId, versionNumber); store versionId too.
    resp = _t("ConfigurationVersions").query(
        KeyConditionExpression=boto3.dynamodb.conditions.Key("configId").eq(config_id)
    )
    for it in resp.get("Items", []):
        if it.get("versionId") == version_id:
            return json.loads(it["snapshot"])
    raise NotFoundError("Configuration version not found.")


def _config_provider(exercise_id: str) -> sc.Configuration:
    ex = _exercise_record(exercise_id)
    snap = _version_snapshot(ex["versionId"], ex["configId"])
    return _config_from_snapshot(snap)


def _record_attempt(att) -> None:
    _t("Attempts").put_item(Item={
        "studentId": att.student_id,
        "attemptId": att.attempt_id,
        "exerciseId": att.exercise_id,
        "instructorId": att.instructor_id,
        "versionId": att.version_id,
        "attemptNumber": att.attempt_number,
        "isFinal": att.is_final,
        "scorePercent": att.score_percent,
        "totalEarned": att.total_earned,
        "denominator": att.denominator,
        "cardFeedback": json.dumps(att.card_feedback),
        "weakestMatch": json.dumps(att.weakest_match),
        "reflectionResponse": att.reflection_response,
        "sessionId": att.session_id,
        "createdAt": att.created_at,
    })


def _exercise_service() -> ExerciseService:
    return ExerciseService(
        config_provider=_config_provider,
        version_provider=lambda eid: _exercise_record(eid)["versionId"],
        instructor_provider=lambda eid: _exercise_record(eid)["ownerInstructorId"],
        record_attempt=_record_attempt,
    )


def _load_state(exercise_id: str, student_id: str) -> StudentExerciseState:
    item = _t("StudentExerciseState").get_item(
        Key={"exerciseId": exercise_id, "studentId": student_id}).get("Item")
    state = StudentExerciseState(exercise_id=exercise_id, student_id=student_id)
    if item:
        placements = json.loads(item.get("placements", "{}"))
        state.placements = [ExPlacement(aid, {Phase[p] for p in phs})
                            for aid, phs in placements.items()]
        state.attempt_count = int(item.get("attemptCount", 0))
        state.locked = bool(item.get("locked", False))
    return state


def _save_state(state: StudentExerciseState) -> None:
    placements = {p.activity_id: sorted(ph.value for ph in p.phases) for p in state.placements}
    _t("StudentExerciseState").put_item(Item={
        "exerciseId": state.exercise_id,
        "studentId": state.student_id,
        "placements": json.dumps(placements),
        "attemptCount": state.attempt_count,
        "locked": state.locked,
    })


# ---- Auth handlers (Cognito) -----------------------------------------------

def register(body: dict) -> dict:
    email = body.get("email", "").strip()
    password = body.get("password", "")
    display_name = body.get("displayName", email.split("@")[0] if email else "")
    role = body.get("role", "STUDENT")
    join_code = body.get("joinCode")
    if role not in ("INSTRUCTOR", "STUDENT"):
        raise ValidationError("Role must be INSTRUCTOR or STUDENT.")
    if "@" not in email:
        raise ValidationError("Invalid email.")
    if len(password) < 8:
        raise ValidationError("Password must be at least 8 characters.")
    try:
        created = _cognito.admin_create_user(
            UserPoolId=USER_POOL_ID, Username=email, MessageAction="SUPPRESS",
            UserAttributes=[
                {"Name": "email", "Value": email},
                {"Name": "email_verified", "Value": "true"},
                {"Name": "custom:role", "Value": role},
            ],
        )
        _cognito.admin_set_user_password(
            UserPoolId=USER_POOL_ID, Username=email, Password=password, Permanent=True)
    except _cognito.exceptions.UsernameExistsException:
        raise ConflictError("An account with this email already exists.")

    sub = next((a["Value"] for a in created["User"]["Attributes"] if a["Name"] == "sub"), email)
    _t("Users").put_item(Item={
        "userId": sub, "email": email, "displayName": display_name, "role": role,
        "status": "Active", "createdAt": _now(),
    })
    if role == "STUDENT" and join_code:
        _associate_join_code(sub, join_code)
    return {"userId": sub, "role": role}


def login(body: dict) -> dict:
    email = body.get("email", "").strip()
    password = body.get("password", "")
    try:
        resp = _cognito.initiate_auth(
            ClientId=USER_POOL_CLIENT_ID, AuthFlow="USER_PASSWORD_AUTH",
            AuthParameters={"USERNAME": email, "PASSWORD": password})
    except _cognito.exceptions.NotAuthorizedException:
        raise AppError("Invalid email or password.")
    except _cognito.exceptions.UserNotFoundException:
        raise AppError("Invalid email or password.")
    tokens = resp.get("AuthenticationResult", {})
    return {"idToken": tokens.get("IdToken"), "accessToken": tokens.get("AccessToken"),
            "expiresIn": tokens.get("ExpiresIn")}


def _associate_join_code(student_id: str, code: str) -> None:
    jc = _t("JoinCodes").get_item(Key={"code": code}).get("Item")
    if not jc or jc.get("status") != "Active":
        raise ValidationError("Invalid or expired join code.")
    _t("Enrollments").put_item(Item={
        "instructorId": jc["instructorId"], "studentId": student_id, "source": "JOIN_CODE"})


# ---- Templates & Authoring -------------------------------------------------

def _ensure_seed_template() -> None:
    existing = _t("Templates").scan(Limit=1).get("Items")
    if existing:
        return
    snap = build_seed_template()
    _t("Templates").put_item(Item={
        "templateId": "seed-real-estate", "source": "SYSTEM_SEEDED",
        "name": snap["name"], "snapshot": json.dumps(snap)})


def list_templates(principal: Principal) -> dict:
    _require_role(principal, Role.INSTRUCTOR)
    _ensure_seed_template()
    items = _t("Templates").scan().get("Items", [])
    visible = [t for t in items if t["source"] == "SYSTEM_SEEDED"
               or t.get("ownerInstructorId") == principal.user_id]
    return {"templates": [{"templateId": t["templateId"], "source": t["source"],
                           "name": t["name"]} for t in visible]}


def create_configuration(principal: Principal, body: dict) -> dict:
    _require_role(principal, Role.INSTRUCTOR)
    _ensure_seed_template()
    template_id = body.get("templateId")
    name = body.get("name", "Untitled configuration")
    if template_id:
        tmpl = _t("Templates").get_item(Key={"templateId": template_id}).get("Item")
        if not tmpl:
            raise ValidationError("Template not found.")
        snap = json.loads(tmpl["snapshot"])
    else:
        snap = {"phases": ["PLANNING", "CONSTRUCTION", "OPERATIONS"],
                "activities": [], "mappings": [], "prompts": []}
    config_id = str(uuid.uuid4())
    _t("Configurations").put_item(Item={
        "configId": config_id, "ownerInstructorId": principal.user_id, "name": name,
        "status": "Draft", "snapshot": json.dumps(snap)})
    return {"configId": config_id, "snapshot": snap}


def update_configuration(principal: Principal, config_id: str, body: dict) -> dict:
    _require_role(principal, Role.INSTRUCTOR)
    cfg = _load_config(principal, config_id)
    snap = json.loads(cfg["snapshot"])
    for key in ("activities", "mappings", "prompts"):
        if key in body:
            snap[key] = body[key]
    _t("Configurations").update_item(
        Key={"configId": config_id},
        UpdateExpression="SET #snap = :s",
        ExpressionAttributeNames={"#snap": "snapshot"},
        ExpressionAttributeValues={":s": json.dumps(snap)})
    return {"configId": config_id, "snapshot": snap}


def apply_configuration(principal: Principal, config_id: str) -> dict:
    _require_role(principal, Role.INSTRUCTOR)
    cfg = _load_config(principal, config_id)
    snap = json.loads(cfg["snapshot"])
    validate_configuration(snap)
    number = _next_version_number(config_id)
    version_id = str(uuid.uuid4())
    _t("ConfigurationVersions").put_item(Item={
        "configId": config_id, "versionNumber": str(number).zfill(6),
        "versionId": version_id, "snapshot": json.dumps(snap)})
    exercise_id = str(uuid.uuid4())
    _t("Exercises").put_item(Item={
        "exerciseId": exercise_id, "configId": config_id, "versionId": version_id,
        "ownerInstructorId": principal.user_id, "status": "Active"})
    return {"exerciseId": exercise_id, "versionId": version_id, "versionNumber": number}


def _load_config(principal: Principal, config_id: str) -> dict:
    cfg = _t("Configurations").get_item(Key={"configId": config_id}).get("Item")
    if not cfg:
        raise NotFoundError("Configuration not found.")
    if cfg["ownerInstructorId"] != principal.user_id:
        raise ForbiddenError("Not the owner of this configuration.")
    return cfg


def _next_version_number(config_id: str) -> int:
    resp = _t("ConfigurationVersions").query(
        KeyConditionExpression=boto3.dynamodb.conditions.Key("configId").eq(config_id))
    return len(resp.get("Items", [])) + 1


# ---- Exercise & Scoring ----------------------------------------------------

def get_exercise(principal: Principal, exercise_id: str) -> dict:
    ex = _exercise_record(exercise_id)
    snap = _version_snapshot(ex["versionId"], ex["configId"])
    state = _load_state(exercise_id, principal.user_id)
    placements = {p.activity_id: sorted(ph.value for ph in p.phases) for p in state.placements}
    return {
        "exerciseId": exercise_id,
        "phases": snap.get("phases", ["PLANNING", "CONSTRUCTION", "OPERATIONS"]),
        "activities": snap.get("activities", []),
        "placements": placements,
        "attemptCount": state.attempt_count,
        "locked": state.locked,
    }


def _placements_from_body(body: dict) -> list[ExPlacement]:
    placements = body.get("placements", {})
    result = []
    for aid, phs in placements.items():
        parsed = set()
        for p in phs:
            try:
                parsed.add(Phase[p])
            except KeyError:
                raise ValidationError(f"Invalid phase '{p}' for activity '{aid}'.")
        result.append(ExPlacement(aid, parsed))
    return result


def save_placements(principal: Principal, exercise_id: str, body: dict) -> dict:
    state = _load_state(exercise_id, principal.user_id)
    if state.locked:
        raise ConflictError("Exercise is locked.")
    state.placements = _placements_from_body(body)
    _save_state(state)
    return {"ok": True}


def submit(principal: Principal, exercise_id: str, body: dict) -> dict:
    state = _load_state(exercise_id, principal.user_id)
    if body.get("placements"):
        state.placements = _placements_from_body(body)
    attempt = _exercise_service().submit(state)
    _save_state(state)
    return _attempt_view(attempt)


def verify(principal: Principal, exercise_id: str, body: dict) -> dict:
    state = _load_state(exercise_id, principal.user_id)
    revised = _placements_from_body(body)
    _exercise_service().verify(state, revised)
    _save_state(state)
    return {"ok": True, "placements": {p.activity_id: sorted(ph.value for ph in p.phases)
                                       for p in state.placements}}


def resubmit(principal: Principal, exercise_id: str, body: dict) -> dict:
    state = _load_state(exercise_id, principal.user_id)
    revised = _placements_from_body(body) if body.get("placements") else None
    attempt = _exercise_service().resubmit(state, revised)
    _save_state(state)
    return _attempt_view(attempt)


def _attempt_view(att) -> dict:
    return {
        "attemptId": att.attempt_id, "attemptNumber": att.attempt_number,
        "isFinal": att.is_final, "scorePercent": att.score_percent,
        "cardFeedback": att.card_feedback, "weakestMatch": att.weakest_match,
    }


# ---- Results & History -----------------------------------------------------

def get_history(principal: Principal, student_id: str) -> dict:
    if not (principal.role == Role.STUDENT and principal.user_id == student_id) \
            and principal.role != Role.INSTRUCTOR:
        raise ForbiddenError("Not allowed.")
    resp = _t("Attempts").query(
        KeyConditionExpression=boto3.dynamodb.conditions.Key("studentId").eq(student_id))
    items = sorted(resp.get("Items", []), key=lambda a: a.get("createdAt", ""), reverse=True)
    return {"attempts": [_history_row(a) for a in items]}


def get_attempt(principal: Principal, attempt_id: str) -> dict:
    resp = _t("Attempts").scan()  # small scale; refine with GSI if needed
    for a in resp.get("Items", []):
        if a["attemptId"] == attempt_id:
            return _history_row(a, full=True)
    raise NotFoundError("Attempt not found.")


def save_reflection(principal: Principal, attempt_id: str, body: dict) -> dict:
    resp = _t("Attempts").query(
        KeyConditionExpression=boto3.dynamodb.conditions.Key("studentId").eq(principal.user_id))
    for a in resp.get("Items", []):
        if a["attemptId"] == attempt_id:
            if a.get("reflectionResponse"):
                raise ConflictError("Reflection already submitted.")
            _t("Attempts").update_item(
                Key={"studentId": a["studentId"], "attemptId": attempt_id},
                UpdateExpression="SET reflectionResponse = :r",
                ExpressionAttributeValues={":r": body.get("response", "")})
            return {"ok": True}
    raise NotFoundError("Attempt not found.")


def list_exercises(principal: Principal) -> dict:
    resp = _t("Exercises").scan()
    if principal.role == Role.INSTRUCTOR:
        items = [e for e in resp.get("Items", []) if e.get("ownerInstructorId") == principal.user_id]
    else:
        # Students see all active exercises (they need IDs to load them)
        items = [e for e in resp.get("Items", []) if e.get("status") == "Active"]

    # Enrich with configuration name as title
    exercises = []
    for e in items:
        title = e.get("exerciseId", "")
        config_id = e.get("configId")
        if config_id:
            cfg = _t("Configurations").get_item(Key={"configId": config_id}).get("Item")
            if cfg:
                title = cfg.get("name", title)
        exercises.append({
            "exerciseId": e["exerciseId"],
            "configId": e.get("configId", ""),
            "title": title,
            "status": e.get("status", "Active"),
        })
    return {"exercises": exercises}


def class_results(principal: Principal, exercise_id: str) -> dict:
    _require_role(principal, Role.INSTRUCTOR)
    ex = _exercise_record(exercise_id)
    if ex["ownerInstructorId"] != principal.user_id:
        raise ForbiddenError("Not the owner of this exercise.")
    resp = _t("Attempts").query(
        IndexName="byExercise",
        KeyConditionExpression=boto3.dynamodb.conditions.Key("exerciseId").eq(exercise_id))
    finals = [a for a in resp.get("Items", []) if a.get("isFinal") in (True, 1)]
    return {"results": [_history_row(a) for a in finals]}


def _history_row(a: dict, full: bool = False) -> dict:
    row = {
        "attemptId": a["attemptId"], "exerciseId": a["exerciseId"],
        "attemptNumber": int(a.get("attemptNumber") or 1),
        "isFinal": bool(a.get("isFinal")),
        "scorePercent": int(a.get("scorePercent") or 0),
        "studentId": a["studentId"],
        "reflectionResponse": a.get("reflectionResponse"),
        "createdAt": a.get("createdAt"),
    }
    if full:
        row["cardFeedback"] = json.loads(a.get("cardFeedback", "[]"))
        row["weakestMatch"] = json.loads(a.get("weakestMatch", "null"))
    return row


def _require_role(principal: Principal | None, role: Role) -> Principal:
    if principal is None:
        raise AppError("Authentication required.")
    if principal.role != role:
        raise ForbiddenError(f"Requires {role.value} role.")
    return principal


# ---- Roster & Dashboard Stats -----------------------------------------------

def get_roster(principal: Principal) -> dict:
    """List all students enrolled with this instructor, enriched with their latest attempt data."""
    _require_role(principal, Role.INSTRUCTOR)

    # Get enrollments for this instructor
    resp = _t("Enrollments").query(
        KeyConditionExpression=boto3.dynamodb.conditions.Key("instructorId").eq(principal.user_id))
    enrollments = resp.get("Items", [])

    # Also check Users table for all students (fallback if no enrollments table usage)
    users_resp = _t("Users").scan()
    all_students = [u for u in users_resp.get("Items", []) if u.get("role") == "STUDENT"]

    # If no enrollments, show all students (small scale)
    student_ids = [e["studentId"] for e in enrollments] if enrollments else [u["userId"] for u in all_students]

    # Get exercises for this instructor
    ex_resp = _t("Exercises").scan()
    instructor_exercises = [e for e in ex_resp.get("Items", []) if e.get("ownerInstructorId") == principal.user_id]
    exercise_ids = [e["exerciseId"] for e in instructor_exercises]

    # Build roster with attempt data
    roster = []
    for sid in student_ids:
        user = next((u for u in all_students if u["userId"] == sid), None)
        if not user:
            continue

        # Get this student's attempts for instructor's exercises
        attempts_resp = _t("Attempts").query(
            KeyConditionExpression=boto3.dynamodb.conditions.Key("studentId").eq(sid))
        student_attempts = [a for a in attempts_resp.get("Items", []) if a.get("exerciseId") in exercise_ids]
        student_attempts.sort(key=lambda a: a.get("createdAt", ""), reverse=True)

        latest = student_attempts[0] if student_attempts else None
        has_final = any(a.get("isFinal") in (True, 1) for a in student_attempts)
        has_submitted = len(student_attempts) > 0

        # Determine status
        if has_final:
            status = "Completed"
        elif has_submitted:
            status = "Submitted"
        else:
            # Check if they have a state (started but not submitted)
            state_items = []
            for eid in exercise_ids:
                s = _t("StudentExerciseState").get_item(
                    Key={"exerciseId": eid, "studentId": sid}).get("Item")
                if s:
                    state_items.append(s)
            if state_items:
                status = "In Progress"
            else:
                status = "Not Started"

        # Get exercise title for latest attempt
        exercise_title = ""
        if latest:
            ex_match = next((e for e in instructor_exercises if e["exerciseId"] == latest["exerciseId"]), None)
            if ex_match and ex_match.get("configId"):
                cfg = _t("Configurations").get_item(Key={"configId": ex_match["configId"]}).get("Item")
                if cfg:
                    exercise_title = cfg.get("name", "")
            if not exercise_title:
                exercise_title = latest.get("exerciseId", "")[:12]

        roster.append({
            "studentId": sid,
            "name": user.get("displayName", user.get("email", "").split("@")[0]),
            "email": user.get("email", ""),
            "joined": user.get("createdAt", ""),
            "exercise": exercise_title,
            "score": int(latest["scorePercent"]) if latest and latest.get("scorePercent") else None,
            "status": status,
        })

    return {"roster": roster, "totalStudents": len(roster)}


def get_instructor_stats(principal: Principal) -> dict:
    """Dashboard stats for instructor."""
    _require_role(principal, Role.INSTRUCTOR)

    # Count students
    roster_data = get_roster(principal)
    student_count = roster_data["totalStudents"]

    # Count exercises
    ex_resp = _t("Exercises").scan()
    exercise_count = len([e for e in ex_resp.get("Items", []) if e.get("ownerInstructorId") == principal.user_id])

    # Recent activity: latest attempts across all instructor exercises
    instructor_exercises = [e for e in ex_resp.get("Items", []) if e.get("ownerInstructorId") == principal.user_id]
    exercise_ids = [e["exerciseId"] for e in instructor_exercises]

    recent = []
    for eid in exercise_ids[:5]:  # Limit to avoid too many queries
        try:
            resp = _t("Attempts").query(
                IndexName="byExercise",
                KeyConditionExpression=boto3.dynamodb.conditions.Key("exerciseId").eq(eid))
            for a in resp.get("Items", []):
                # Look up student name
                user = _t("Users").get_item(Key={"userId": a["studentId"]}).get("Item")
                student_name = user.get("displayName", "Student") if user else "Student"
                recent.append({
                    "studentName": student_name,
                    "action": f"submitted Exercise",
                    "exerciseId": eid,
                    "score": int(a["scorePercent"]) if a.get("scorePercent") else None,
                    "createdAt": a.get("createdAt", ""),
                })
        except Exception:
            pass

    # Sort by date, take top 10
    recent.sort(key=lambda x: x.get("createdAt", ""), reverse=True)
    recent = recent[:10]

    return {
        "studentCount": student_count,
        "exerciseCount": exercise_count,
        "recentActivity": recent,
    }


def add_student_to_roster(principal: Principal, body: dict) -> dict:
    """Add a student to instructor's roster by email."""
    _require_role(principal, Role.INSTRUCTOR)
    email = body.get("email", "").strip()
    if not email or "@" not in email:
        raise ValidationError("Valid email required.")

    # Find the student
    users_resp = _t("Users").scan()
    student = next((u for u in users_resp.get("Items", [])
                    if u.get("email") == email and u.get("role") == "STUDENT"), None)
    if not student:
        raise NotFoundError("No student account found with that email.")

    # Create enrollment
    _t("Enrollments").put_item(Item={
        "instructorId": principal.user_id,
        "studentId": student["userId"],
        "source": "ROSTER",
    })
    return {"ok": True, "studentId": student["userId"], "name": student.get("displayName", "")}


def create_join_code_endpoint(principal: Principal) -> dict:
    """Create a join code for this instructor."""
    _require_role(principal, Role.INSTRUCTOR)
    code = uuid.uuid4().hex[:8].upper()
    # Format as ASU-XXXX style
    formatted_code = f"ASU-{code[:4]}"
    _t("JoinCodes").put_item(Item={
        "code": formatted_code,
        "instructorId": principal.user_id,
        "status": "Active",
        "createdAt": _now(),
    })
    return {"code": formatted_code}


def get_exercise_results(principal: Principal, exercise_id: str) -> dict:
    """Detailed results for a specific exercise including all attempts."""
    _require_role(principal, Role.INSTRUCTOR)
    ex = _exercise_record(exercise_id)
    if ex["ownerInstructorId"] != principal.user_id:
        raise ForbiddenError("Not the owner of this exercise.")

    # Get all attempts for this exercise
    resp = _t("Attempts").query(
        IndexName="byExercise",
        KeyConditionExpression=boto3.dynamodb.conditions.Key("exerciseId").eq(exercise_id))
    all_attempts = resp.get("Items", [])

    # Group by student
    by_student: dict = {}
    for a in all_attempts:
        sid = a["studentId"]
        if sid not in by_student:
            by_student[sid] = []
        by_student[sid].append(a)

    # Build results
    results = []
    for sid, attempts in by_student.items():
        attempts.sort(key=lambda x: int(x.get("attemptNumber", 1)))
        user = _t("Users").get_item(Key={"userId": sid}).get("Item")
        name = user.get("displayName", "Student") if user else "Student"
        email = user.get("email", "") if user else ""

        attempt1 = attempts[0] if len(attempts) >= 1 else None
        attempt2 = attempts[1] if len(attempts) >= 2 else None
        has_final = any(a.get("isFinal") in (True, 1) for a in attempts)

        score1 = int(attempt1["scorePercent"]) if attempt1 and attempt1.get("scorePercent") else None
        score2 = int(attempt2["scorePercent"]) if attempt2 and attempt2.get("scorePercent") else None

        change = "none"
        if score1 is not None and score2 is not None:
            change = "up" if score2 > score1 else "down" if score2 < score1 else "none"

        status = "Completed" if has_final else "Submitted" if attempts else "Not Started"

        results.append({
            "studentId": sid,
            "name": name,
            "email": email,
            "attempt1": score1,
            "attempt2": score2,
            "change": change,
            "status": status,
        })

    # Stats
    scores = [r["attempt2"] or r["attempt1"] for r in results if (r["attempt2"] or r["attempt1"]) is not None]
    class_avg = round(sum(scores) / len(scores)) if scores else 0
    highest = max(scores) if scores else 0
    lowest = min(scores) if scores else 0
    submitted_count = len([r for r in results if r["status"] in ("Completed", "Submitted")])

    return {
        "results": results,
        "stats": {
            "classAverage": class_avg,
            "highest": highest,
            "lowest": lowest,
            "submitted": submitted_count,
            "total": len(results),
        }
    }


# ---- Dispatcher ------------------------------------------------------------

def dispatch(method: str, path: str, body: dict, principal: Principal | None) -> tuple[int, dict]:
    seg = [s for s in path.split("/") if s]

    # Public auth routes
    if method == "POST" and seg == ["auth", "register"]:
        return 201, register(body)
    if method == "POST" and seg == ["auth", "login"]:
        return 200, login(body)

    # Everything below requires authentication
    if principal is None:
        raise AppError("Authentication required.")

    if method == "GET" and seg == ["me"]:
        return 200, {"userId": principal.user_id, "role": principal.role.value}

    if method == "GET" and seg == ["exercises"]:
        return 200, list_exercises(principal)
    if method == "GET" and seg == ["templates"]:
        return 200, list_templates(principal)
    if method == "GET" and seg == ["roster"]:
        return 200, get_roster(principal)
    if method == "POST" and seg == ["roster", "add"]:
        return 200, add_student_to_roster(principal, body)
    if method == "POST" and seg == ["join-codes"]:
        return 200, create_join_code_endpoint(principal)
    if method == "GET" and seg == ["instructor", "stats"]:
        return 200, get_instructor_stats(principal)
    if method == "POST" and seg == ["configurations"]:
        return 201, create_configuration(principal, body)
    if method == "PUT" and len(seg) == 2 and seg[0] == "configurations":
        return 200, update_configuration(principal, seg[1], body)
    if method == "POST" and len(seg) == 3 and seg[0] == "configurations" and seg[2] == "apply":
        return 200, apply_configuration(principal, seg[1])

    if method == "GET" and len(seg) == 2 and seg[0] == "exercises":
        return 200, get_exercise(principal, seg[1])
    if method == "PUT" and len(seg) == 3 and seg[0] == "exercises" and seg[2] == "placements":
        return 200, save_placements(principal, seg[1], body)
    if method == "POST" and len(seg) == 3 and seg[0] == "exercises" and seg[2] == "submit":
        return 200, submit(principal, seg[1], body)
    if method == "POST" and len(seg) == 3 and seg[0] == "exercises" and seg[2] == "verify":
        return 200, verify(principal, seg[1], body)
    if method == "POST" and len(seg) == 3 and seg[0] == "exercises" and seg[2] == "resubmit":
        return 200, resubmit(principal, seg[1], body)
    if method == "GET" and len(seg) == 3 and seg[0] == "exercises" and seg[2] == "results":
        return 200, class_results(principal, seg[1])
    if method == "GET" and len(seg) == 3 and seg[0] == "exercises" and seg[2] == "detailed-results":
        return 200, get_exercise_results(principal, seg[1])

    if method == "GET" and len(seg) == 3 and seg[0] == "students" and seg[2] == "history":
        return 200, get_history(principal, seg[1])
    if method == "GET" and len(seg) == 2 and seg[0] == "attempts":
        return 200, get_attempt(principal, seg[1])
    if method == "POST" and len(seg) == 3 and seg[0] == "attempts" and seg[2] == "reflection":
        return 200, save_reflection(principal, seg[1], body)

    raise NotFoundError(f"No route for {method} {path}")

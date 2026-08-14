#!/usr/bin/env bash
# End-to-end smoke test against the deployed ProcessCanvas API.
set -euo pipefail
API="${API_URL:-$(aws cloudformation describe-stacks --stack-name ProcessCanvasStack --query 'Stacks[0].Outputs[?OutputKey==`RestApiUrl`].OutputValue' --output text 2>/dev/null)}"
if [ -z "$API" ]; then echo "Set API_URL or deploy the stack first"; exit 1; fi
TS=$(date +%s)
INSTR="instructor_${TS}@example.com"
STUD="student_${TS}@example.com"
PW="Passw0rd123"

echo "== Register instructor =="
curl -s -X POST "$API/auth/register" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$INSTR\",\"password\":\"$PW\",\"displayName\":\"Teacher\",\"role\":\"INSTRUCTOR\"}"
echo

echo "== Login instructor =="
ITOK=$(curl -s -X POST "$API/auth/login" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$INSTR\",\"password\":\"$PW\"}" | python3 -c 'import sys,json;print(json.load(sys.stdin)["idToken"])')
echo "idToken length: ${#ITOK}"

echo "== List templates =="
curl -s "$API/templates" -H "Authorization: Bearer $ITOK"
echo

echo "== Create configuration from seed template =="
CFG=$(curl -s -X POST "$API/configurations" -H "Authorization: Bearer $ITOK" \
  -H 'Content-Type: application/json' \
  -d '{"name":"RE Demo","templateId":"seed-real-estate"}')
echo "$CFG"
CFGID=$(echo "$CFG" | python3 -c 'import sys,json;print(json.load(sys.stdin)["configId"])')

echo "== Apply configuration -> exercise =="
APPLY=$(curl -s -X POST "$API/configurations/$CFGID/apply" -H "Authorization: Bearer $ITOK")
echo "$APPLY"
EXID=$(echo "$APPLY" | python3 -c 'import sys,json;print(json.load(sys.stdin)["exerciseId"])')

echo "== Register + login student =="
curl -s -X POST "$API/auth/register" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$STUD\",\"password\":\"$PW\",\"displayName\":\"Student\",\"role\":\"STUDENT\"}" >/dev/null
STOK=$(curl -s -X POST "$API/auth/login" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$STUD\",\"password\":\"$PW\"}" | python3 -c 'import sys,json;print(json.load(sys.stdin)["idToken"])')

echo "== Get exercise (student) =="
curl -s "$API/exercises/$EXID" -H "Authorization: Bearer $STOK" | python3 -m json.tool

echo "== Submit a correct sort (primary phases) =="
curl -s -X POST "$API/exercises/$EXID/submit" -H "Authorization: Bearer $STOK" \
  -H 'Content-Type: application/json' \
  -d '{"placements":{"act-1":["PLANNING"],"act-2":["PLANNING"],"act-3":["PLANNING"],"act-4":["PLANNING"],"act-5":["PLANNING"],"act-6":["CONSTRUCTION"],"act-7":["CONSTRUCTION"],"act-8":["CONSTRUCTION"],"act-9":["OPERATIONS"],"act-10":["OPERATIONS"]}}'
echo
echo "== DONE =="

#!/usr/bin/env bash
set -uo pipefail
API="${API_URL:-$(aws cloudformation describe-stacks --stack-name ProcessCanvasStack --query 'Stacks[0].Outputs[?OutputKey==`RestApiUrl`].OutputValue' --output text 2>/dev/null)}"
if [ -z "$API" ]; then echo "Set API_URL or deploy the stack first"; exit 1; fi
TS=$(date +%s)
I="i_${TS}@example.com"; S="s_${TS}@example.com"; PW="Passw0rd123"
hdr_json='Content-Type: application/json'

itok() { curl -s -X POST "$API/auth/login" -H "$hdr_json" -d "{\"email\":\"$1\",\"password\":\"$PW\"}" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("idToken",""))'; }

curl -s -X POST "$API/auth/register" -H "$hdr_json" -d "{\"email\":\"$I\",\"password\":\"$PW\",\"displayName\":\"T\",\"role\":\"INSTRUCTOR\"}" >/dev/null
IT=$(itok "$I")
CID=$(curl -s -X POST "$API/configurations" -H "Authorization: Bearer $IT" -H "$hdr_json" -d '{"name":"X","templateId":"seed-real-estate"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["configId"])')
EX=$(curl -s -X POST "$API/configurations/$CID/apply" -H "Authorization: Bearer $IT" | python3 -c 'import sys,json;print(json.load(sys.stdin)["exerciseId"])')
echo "exercise=$EX"

curl -s -X POST "$API/auth/register" -H "$hdr_json" -d "{\"email\":\"$S\",\"password\":\"$PW\",\"displayName\":\"S\",\"role\":\"STUDENT\"}" >/dev/null
ST=$(itok "$S")
SID=$(curl -s "$API/me" -H "Authorization: Bearer $ST" | python3 -c 'import sys,json;print(json.load(sys.stdin)["userId"])')

PL='{"placements":{"act-1":["PLANNING"],"act-2":["PLANNING"],"act-3":["CONSTRUCTION"],"act-4":["PLANNING"],"act-5":["PLANNING"],"act-6":["CONSTRUCTION"],"act-7":["CONSTRUCTION"],"act-8":["CONSTRUCTION"],"act-9":["OPERATIONS"],"act-10":["OPERATIONS"]}}'

probe() { echo "--- $1 ---"; curl -s -o /tmp/b -w "HTTP %{http_code}\n" "${@:2}"; cat /tmp/b; echo; }

probe "submit"   -X POST "$API/exercises/$EX/submit"   -H "Authorization: Bearer $ST" -H "$hdr_json" -d "$PL"
AID=$(python3 -c 'import json;print(json.load(open("/tmp/b"))["attemptId"])' 2>/dev/null || echo "")
probe "verify"   -X POST "$API/exercises/$EX/verify"   -H "Authorization: Bearer $ST" -H "$hdr_json" -d "$PL"
probe "resubmit" -X POST "$API/exercises/$EX/resubmit" -H "Authorization: Bearer $ST" -H "$hdr_json" -d "$PL"
probe "history"  "$API/students/$SID/history" -H "Authorization: Bearer $ST"
probe "attempt"  "$API/attempts/$AID" -H "Authorization: Bearer $ST"
probe "reflection" -X POST "$API/attempts/$AID/reflection" -H "Authorization: Bearer $ST" -H "$hdr_json" -d '{"response":"hello"}'
probe "class_results" "$API/exercises/$EX/results" -H "Authorization: Bearer $IT"

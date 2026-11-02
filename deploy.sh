#!/usr/bin/env bash
# =============================================================================
# Development Process Navigator — One-Click Deployment Script
#
# Usage:
#   ./deploy.sh                     # deploy to default AWS profile / us-east-1
#   AWS_PROFILE=myprofile ./deploy.sh
#   AWS_REGION=us-west-2 ./deploy.sh
#   INSTRUCTOR_ACCESS_CODE=<code> ./deploy.sh   # or read from ~/.dpn_instructor_access_code,
#                                               # or asked once and saved there
#
# Works in AWS CloudShell (no local tooling needed) or any machine with:
#   - AWS CLI v2
#   - Node.js 18+
#   - Python 3.12+
#
# Disk space is managed automatically: the script clears npm caches and stale
# build artifacts up front and again before the frontend build, so it runs
# cleanly within CloudShell's ~1 GB home quota (avoids ENOSPC errors).
# =============================================================================

set -euo pipefail

# ---- Configuration ----------------------------------------------------------
# Absolute repo root, resolved once (the script cd's into subfolders later, so a
# relative "$(dirname "$0")" would point at the wrong place after the first cd).
ROOT="$(cd "$(dirname "$0")" && pwd)"

PROFILE="${AWS_PROFILE:-}"
REGION="${AWS_REGION:-us-east-1}"
STACK_NAME="ProcessCanvasStack"
SES_EMAIL_DOMAIN="${SES_EMAIL_DOMAIN:-wpcarey.asu.edu}"

# Build profile flag (empty if no profile set — works for CloudShell)
PROFILE_FLAG=""
if [ -n "$PROFILE" ]; then
  PROFILE_FLAG="--profile $PROFILE"
fi

# Colours
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'

log()    { echo -e "${CYAN}[deploy]${NC} $1"; }
ok()     { echo -e "${GREEN}[  ok  ]${NC} $1"; }
warn()   { echo -e "${YELLOW}[ warn ]${NC} $1"; }
fail()   { echo -e "${RED}[ fail ]${NC} $1"; exit 1; }

# AWS CloudShell sets AWS_EXECUTION_ENV=CloudShell.
IN_CLOUDSHELL=0
[ "${AWS_EXECUTION_ENV:-}" = "CloudShell" ] && IN_CLOUDSHELL=1

# Free up disk space (important on AWS CloudShell — ~1 GB home quota).
# Safe: only removes caches and regenerable build artifacts.
free_space() {
  local phase="${1:-}"
  log "Reclaiming disk space${phase:+ ($phase)}..."
  # Home-directory caches are only cleared in CloudShell; on a laptop they may
  # hold unrelated tools' data (pip, models, etc.), so leave them alone there.
  if [ "$IN_CLOUDSHELL" = "1" ]; then
    npm cache clean --force >/dev/null 2>&1 || true
    rm -rf "$HOME/.npm/_cacache" >/dev/null 2>&1 || true
  fi
  rm -rf "$ROOT/frontend/.next" "$ROOT/frontend/out" >/dev/null 2>&1 || true
  rm -rf "$ROOT/infrastructure/cdk.out" >/dev/null 2>&1 || true
  if [ "$phase" = "pre-frontend" ]; then
    # CDK deps are no longer needed once the stack is deployed.
    rm -rf "$ROOT/infrastructure/node_modules" >/dev/null 2>&1 || true
  fi
  if [ "$phase" = "start" ]; then
    # Stale deps get reinstalled by this script; clearing them frees space now.
    rm -rf "$ROOT/frontend/node_modules" "$ROOT/infrastructure/node_modules" >/dev/null 2>&1 || true
    [ "$IN_CLOUDSHELL" = "1" ] && rm -rf "$HOME/.cache"/* >/dev/null 2>&1 || true
  fi
  df -h "$HOME" 2>/dev/null | awk 'NR==2{print "         disk: "$4" free of "$2" ("$5" used)"}' || true
}

# ---- Pre-flight checks -------------------------------------------------------
log "Checking prerequisites..."

command -v aws   >/dev/null 2>&1 || fail "AWS CLI not found. Install from https://aws.amazon.com/cli/"
command -v node  >/dev/null 2>&1 || fail "Node.js not found. Install v18+ from https://nodejs.org"
command -v npm   >/dev/null 2>&1 || fail "npm not found."
command -v python3 >/dev/null 2>&1 || fail "Python 3 not found."

NODE_VER=$(node --version | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VER" -lt 18 ]; then
  fail "Node.js 18+ required (found v$NODE_VER)"
fi

AWS_ACCOUNT=$(aws sts get-caller-identity $PROFILE_FLAG --query Account --output text 2>/dev/null) \
  || AWS_ACCOUNT=$(aws sts get-caller-identity --query Account --output text 2>/dev/null) \
  || fail "AWS credentials not configured. Run: aws configure"

ok "AWS account: $AWS_ACCOUNT | region: $REGION | profile: ${PROFILE:-default}"

# ---- Instructor access code (never stored in the repo) -----------------------
# Lookup order:
#   1. INSTRUCTOR_ACCESS_CODE environment variable
#   2. Private file outside the repo (default ~/.dpn_instructor_access_code)
#   3. Hidden prompt when run interactively; the answer is saved to that file
#      (owner-only permissions) so later deploys don't ask again.
CODE_FILE="${INSTRUCTOR_ACCESS_CODE_FILE:-$HOME/.dpn_instructor_access_code}"
if [ -z "${INSTRUCTOR_ACCESS_CODE:-}" ] && [ -s "$CODE_FILE" ]; then
  INSTRUCTOR_ACCESS_CODE="$(head -n 1 "$CODE_FILE" | tr -d '[:space:]')"
  CODE_SOURCE="$CODE_FILE"
fi
if [ -z "${INSTRUCTOR_ACCESS_CODE:-}" ] && [ -t 0 ]; then
  read -r -s -p "Instructor access code (instructors enter this once, when they register): " INSTRUCTOR_ACCESS_CODE
  echo ""
  if [ -n "$INSTRUCTOR_ACCESS_CODE" ]; then
    (umask 077; printf '%s\n' "$INSTRUCTOR_ACCESS_CODE" > "$CODE_FILE")
    CODE_SOURCE="prompt (saved to $CODE_FILE)"
  fi
fi
[ -n "${INSTRUCTOR_ACCESS_CODE:-}" ] || \
  fail "Instructor access code required. Run: INSTRUCTOR_ACCESS_CODE=<code> ./deploy.sh (or put it in $CODE_FILE)"
export INSTRUCTOR_ACCESS_CODE
ok "Instructor access code loaded from ${CODE_SOURCE:-environment} (not displayed)"

# ---- Reclaim disk space up front (prevents ENOSPC on CloudShell) -------------
free_space "start"

# ---- Install CDK CLI ---------------------------------------------------------
log "Installing/updating AWS CDK CLI..."
# Install locally to avoid permission issues in CloudShell
npx --yes aws-cdk@latest --version >/dev/null 2>&1
ok "CDK available via npx"

# ---- Bootstrap CDK (idempotent) ----------------------------------------------
log "Bootstrapping CDK in $AWS_ACCOUNT/$REGION (safe to re-run)..."
cd "$ROOT/infrastructure"
npm install --quiet
npx aws-cdk@latest bootstrap "aws://$AWS_ACCOUNT/$REGION" $PROFILE_FLAG --quiet || \
  warn "Bootstrap returned non-zero (may already be bootstrapped — continuing)"

# ---- Deploy CDK stack --------------------------------------------------------
log "Deploying CDK stack: $STACK_NAME..."
npx aws-cdk@latest deploy "$STACK_NAME" \
  $PROFILE_FLAG \
  --require-approval never \
  --context sesEmailDomain="$SES_EMAIL_DOMAIN" \
  --outputs-file /tmp/cdk-outputs.json

ok "CDK stack deployed."

# ---- Extract stack outputs ---------------------------------------------------
REST_API_URL=$(python3 -c "
import json
outputs = json.load(open('/tmp/cdk-outputs.json'))
stack = outputs.get('$STACK_NAME', {})
for k, v in stack.items():
    if 'RestApiUrl' in k or 'RestApi' in k:
        print(v.rstrip('/'))
        break
" 2>/dev/null || echo "")

AMPLIFY_APP_ID=$(python3 -c "
import json
outputs = json.load(open('/tmp/cdk-outputs.json'))
stack = outputs.get('$STACK_NAME', {})
for k, v in stack.items():
    if 'AmplifyAppId' in k:
        print(v)
        break
" 2>/dev/null || echo "")

WS_API_URL=$(python3 -c "
import json
outputs = json.load(open('/tmp/cdk-outputs.json'))
stack = outputs.get('$STACK_NAME', {})
for k, v in stack.items():
    if 'WsApiUrl' in k:
        print(v)
        break
" 2>/dev/null || echo "")

if [ -z "$REST_API_URL" ] || [ -z "$AMPLIFY_APP_ID" ]; then
  warn "Could not parse stack outputs from /tmp/cdk-outputs.json"
  warn "You can find the outputs in the AWS CloudFormation console under stack: $STACK_NAME"
  REST_API_URL="<RestApiUrl from CloudFormation outputs>"
  AMPLIFY_APP_ID="<AmplifyAppId from CloudFormation outputs>"
fi

ok "REST API URL : $REST_API_URL"
ok "Amplify App  : $AMPLIFY_APP_ID"

# ---- Set APP_URL on the Lambda (for invite emails) ---------------------------
if [ -n "$AMPLIFY_APP_ID" ] && [ "$AMPLIFY_APP_ID" != "<AmplifyAppId from CloudFormation outputs>" ]; then
  FRONTEND_URL="https://main.${AMPLIFY_APP_ID}.amplifyapp.com"
  LAMBDA_NAME=$(aws lambda list-functions $PROFILE_FLAG --region "$REGION" \
    --query "Functions[?contains(FunctionName,'ProcessCanvas') && contains(FunctionName,'ApiFn')].FunctionName" \
    --output text 2>/dev/null || echo "")
  if [ -n "$LAMBDA_NAME" ]; then
    aws lambda update-function-configuration \
      --function-name "$LAMBDA_NAME" \
      --environment "Variables={$(aws lambda get-function-configuration --function-name "$LAMBDA_NAME" $PROFILE_FLAG --region "$REGION" --query 'Environment.Variables' --output json | python3 -c "import sys,json; d=json.load(sys.stdin); d['APP_URL']='$FRONTEND_URL'; print(','.join(f'{k}={v}' for k,v in d.items()))")}" \
      $PROFILE_FLAG --region "$REGION" >/dev/null 2>&1 && \
      ok "Set APP_URL=$FRONTEND_URL on Lambda" || \
      warn "Could not set APP_URL on Lambda — set it manually in the Lambda console"
  fi
fi

# ---- Build frontend ----------------------------------------------------------
# Reclaim space before the (heavy) frontend build: drop CDK deps + stale caches.
free_space "pre-frontend"

log "Building Next.js frontend..."
cd "$ROOT/frontend"

npm install --quiet

# Write env vars for the static build
cat > .env.production << EOF
NEXT_PUBLIC_API_URL=$REST_API_URL
NEXT_PUBLIC_WS_URL=$WS_API_URL
NEXT_PUBLIC_REGION=$REGION
EOF

npm run build
ok "Frontend built → frontend/out/"

# ---- Deploy frontend to Amplify ----------------------------------------------
log "Deploying frontend to Amplify (app: $AMPLIFY_APP_ID)..."

# Zip from inside out/ so index.html is at the root of the zip
cd out
zip -r ../deploy.zip . -q
cd ..

DEPLOY_OUT=$(aws amplify create-deployment \
  --app-id "$AMPLIFY_APP_ID" \
  --branch-name main \
  $PROFILE_FLAG \
  --region "$REGION" \
  --output json)

JOB_ID=$(echo "$DEPLOY_OUT" | python3 -c 'import sys,json;print(json.load(sys.stdin)["jobId"])')
UPLOAD_URL=$(echo "$DEPLOY_OUT" | python3 -c 'import sys,json;print(json.load(sys.stdin)["zipUploadUrl"])')

log "Uploading frontend artifact (job: $JOB_ID)..."
curl -s -X PUT "$UPLOAD_URL" --upload-file deploy.zip
echo ""

aws amplify start-deployment \
  --app-id "$AMPLIFY_APP_ID" \
  --branch-name main \
  --job-id "$JOB_ID" \
  $PROFILE_FLAG \
  --region "$REGION" >/dev/null

log "Waiting for Amplify deployment to complete..."
for i in $(seq 1 40); do
  STATUS=$(aws amplify get-job \
    --app-id "$AMPLIFY_APP_ID" \
    --branch-name main \
    --job-id "$JOB_ID" \
    $PROFILE_FLAG \
    --region "$REGION" \
    --query "job.summary.status" \
    --output text 2>/dev/null || echo "UNKNOWN")

  if [ "$STATUS" = "SUCCEED" ]; then
    ok "Amplify deployment succeeded."
    break
  elif [ "$STATUS" = "FAILED" ] || [ "$STATUS" = "CANCELLED" ]; then
    fail "Amplify deployment $STATUS. Check the Amplify console for details."
  fi

  echo -ne "\r  Status: $STATUS (${i}/40)..."
  sleep 5
done
echo ""

# ---- Cleanup -----------------------------------------------------------------
rm -f .env.production deploy.zip

# ---- Print summary -----------------------------------------------------------
FRONTEND_URL="https://main.${AMPLIFY_APP_ID}.amplifyapp.com"

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  Deployment Complete!${NC}"
echo -e "${GREEN}============================================${NC}"
echo -e "  Frontend URL : ${CYAN}${FRONTEND_URL}${NC}"
echo -e "  REST API     : ${CYAN}${REST_API_URL}${NC}"
if [ -n "$WS_API_URL" ]; then
  echo -e "  WebSocket    : ${CYAN}${WS_API_URL}${NC}"
fi
echo -e "  AWS Account  : ${CYAN}${AWS_ACCOUNT}${NC}"
echo -e "  Region       : ${CYAN}${REGION}${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo "  Instructor Access Code: loaded from ${CODE_SOURCE:-environment} (instructors enter it once, at registration)"
echo "  (To change it: edit $CODE_FILE, or run INSTRUCTOR_ACCESS_CODE=<new code> ./deploy.sh)"
echo ""
echo -e "${GREEN}Open the app:${NC} $FRONTEND_URL"
echo ""
echo -e "${YELLOW}IMPORTANT — Email Setup:${NC}"
echo "  To enable instructor invite emails, verify the email domain in SES:"
echo "  1. Go to SES Console → Verified Identities"
echo "  2. Find 'asu.edu' (or your domain) → Authentication tab"
echo "  3. Add the 3 DKIM CNAME records to your DNS"
echo "  4. Once verified, instructors can send invites from their @asu.edu email"
echo ""

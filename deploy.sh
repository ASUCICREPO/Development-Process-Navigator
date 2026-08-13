#!/usr/bin/env bash
# =============================================================================
# Development Process Navigator — One-Click Deployment Script
#
# Usage:
#   ./deploy.sh                     # deploy to default AWS profile / us-east-1
#   AWS_PROFILE=myprofile ./deploy.sh
#   AWS_REGION=us-west-2 ./deploy.sh
#
# Works in AWS CloudShell (no local tooling needed) or any machine with:
#   - AWS CLI v2
#   - Node.js 18+
#   - Python 3.12+
# =============================================================================

set -euo pipefail

# ---- Configuration ----------------------------------------------------------
PROFILE="${AWS_PROFILE:-default}"
REGION="${AWS_REGION:-us-east-1}"
STACK_NAME="ProcessCanvasStack"
SES_EMAIL_DOMAIN="${SES_EMAIL_DOMAIN:-asu.edu}"

# Colours
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'

log()    { echo -e "${CYAN}[deploy]${NC} $1"; }
ok()     { echo -e "${GREEN}[  ok  ]${NC} $1"; }
warn()   { echo -e "${YELLOW}[ warn ]${NC} $1"; }
fail()   { echo -e "${RED}[ fail ]${NC} $1"; exit 1; }

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

AWS_ACCOUNT=$(aws sts get-caller-identity --profile "$PROFILE" --query Account --output text 2>/dev/null) \
  || fail "AWS credentials not configured. Run: aws configure --profile $PROFILE"

ok "AWS account: $AWS_ACCOUNT | region: $REGION | profile: $PROFILE"

# ---- Install CDK CLI ---------------------------------------------------------
log "Installing/updating AWS CDK CLI..."
npm install -g aws-cdk@latest --quiet
ok "CDK version: $(cdk --version)"

# ---- Bootstrap CDK (idempotent) ----------------------------------------------
log "Bootstrapping CDK in $AWS_ACCOUNT/$REGION (safe to re-run)..."
cd "$(dirname "$0")/infrastructure"
npm install --quiet
cdk bootstrap "aws://$AWS_ACCOUNT/$REGION" --profile "$PROFILE" --quiet || \
  warn "Bootstrap returned non-zero (may already be bootstrapped — continuing)"

# ---- Deploy CDK stack --------------------------------------------------------
log "Deploying CDK stack: $STACK_NAME..."
cdk deploy "$STACK_NAME" \
  --profile "$PROFILE" \
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

# ---- Build frontend ----------------------------------------------------------
log "Building Next.js frontend..."
cd ../frontend
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
  --profile "$PROFILE" \
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
  --profile "$PROFILE" \
  --region "$REGION" >/dev/null

log "Waiting for Amplify deployment to complete..."
for i in $(seq 1 40); do
  STATUS=$(aws amplify get-job \
    --app-id "$AMPLIFY_APP_ID" \
    --branch-name main \
    --job-id "$JOB_ID" \
    --profile "$PROFILE" \
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
echo "  Instructor Access Code: MRED-2026"
echo "  (Change in infrastructure/lib/processcanvas-stack.ts → INSTRUCTOR_ACCESS_CODE)"
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

# Deployment Guide — Development Process Navigator

## Options

| Method | Time | Best For |
|---|---|---|
| [One-Click CloudShell](#one-click-deployment-aws-cloudshell) | ~10 min | Fresh deploy on any AWS account |
| [Manual Step-by-Step](#manual-deployment) | ~15 min | Full control / debugging |
| [Frontend Only](#frontend-only-redeploy) | ~3 min | After frontend-only changes |
| [Backend Only](#backend-only-update) | ~2 min | After Python code changes |

---

## Prerequisites

| Tool | Version | Check |
|---|---|---|
| AWS CLI | v2 | `aws --version` |
| Node.js | 18+ | `node --version` |
| npm | 9+ | `npm --version` |
| Python | 3.12+ | `python3 --version` |
| AWS CDK | latest | `cdk --version` |

### AWS Permissions Required

Your AWS credentials need:
- `CloudFormation:*` (CDK deploys via CloudFormation)
- `Lambda:*`, `DynamoDB:*`, `Cognito-idp:*`, `APIGateway:*`
- `S3:*`, `IAM:PassRole`, `Amplify:*`, `Logs:*`

Or use **AdministratorAccess** for a dev/sandbox account.

---

## One-Click Deployment (AWS CloudShell)

The fastest way to deploy to a fresh AWS account — no local tooling required.

### Step 1 — Open CloudShell

1. Log into the [AWS Console](https://console.aws.amazon.com)
2. Click the **CloudShell** icon (terminal icon, top-right toolbar)
3. Wait for the shell to initialise (~30 seconds)

### Step 2 — Run the deploy script

```bash
# Clone the repository
git clone https://github.com/ASUCICREPO/Development-Process-Navigator.git
cd Development-Process-Navigator

# Run one-click deploy
chmod +x deploy.sh
./deploy.sh
```

The script will:
1. Install CDK CLI (if not present)
2. Install infrastructure dependencies
3. Bootstrap CDK (first-time only)
4. Deploy the CDK stack — Cognito, DynamoDB, Lambda, API Gateway (REST + WebSocket), S3, Amplify
5. Install frontend dependencies and build the Next.js static export
6. Deploy the built frontend to Amplify
7. Print the live URL

**Total time: ~8–12 minutes**

### Step 3 — Done

At the end of the script you will see:

```
============================================
  Deployment Complete!
============================================
  Frontend URL : https://main.<app-id>.amplifyapp.com
  REST API     : https://<api-id>.execute-api.us-east-1.amazonaws.com/prod/
  WebSocket API: wss://<ws-id>.execute-api.us-east-1.amazonaws.com/prod
============================================
```

Open the Frontend URL in your browser to use the app.

---

## Manual Deployment

### 1. Clone the repository

```bash
git clone https://github.com/ASUCICREPO/Development-Process-Navigator.git
cd Development-Process-Navigator
```

### 2. Deploy the CDK stack (backend + all AWS resources)

```bash
cd infrastructure
npm install

# First-time only — bootstrap CDK in your account/region
npx cdk bootstrap --profile <your-aws-profile>

# Deploy all resources
npx cdk deploy --profile <your-aws-profile> --require-approval never
```

Note the outputs printed at the end — you'll need `RestApiUrl` and `AmplifyAppId`.

### 3. Build the frontend

The frontend needs the API URL baked in at build time.

```bash
cd ../frontend
npm install

# Set the API URL from the CDK output
export NEXT_PUBLIC_API_URL=<RestApiUrl from CDK output>

npm run build
# Output: frontend/out/
```

### 4. Deploy the frontend to Amplify

```bash
# From the repo root
cd frontend

# Get the Amplify App ID from CDK output or:
# aws amplify list-apps --query 'apps[?name==`ProcessCanvas`].appId' --output text

APP_ID=<AmplifyAppId>

# Create deployment, upload, and start
OUT=$(aws amplify create-deployment --app-id "$APP_ID" --branch-name main --output json)
JOB_ID=$(echo "$OUT" | python3 -c 'import sys,json;print(json.load(sys.stdin)["jobId"])')
URL=$(echo "$OUT" | python3 -c 'import sys,json;print(json.load(sys.stdin)["zipUploadUrl"])')

# Zip and upload (from inside out/)
cd out && zip -r ../deploy.zip . && cd ..
curl -s -X PUT "$URL" --upload-file deploy.zip
aws amplify start-deployment --app-id "$APP_ID" --branch-name main --job-id "$JOB_ID"

echo "Deployed: https://main.${APP_ID}.amplifyapp.com"
```

Or use the included helper script:

```bash
cd frontend
# Edit deploy_amplify.sh to set your APP_ID and AWS_PROFILE
./deploy_amplify.sh
```

---

## Frontend-Only Redeploy

When you only changed frontend code (TypeScript/TSX), you don't need to touch CDK.

```bash
cd frontend
npm run build                    # Rebuild static export

# Deploy to Amplify (replace APP_ID and PROFILE)
APP_ID=dgai4l6tikxfm
AWS_PROFILE=sandbox2025

cd out && zip -r ../deploy.zip . && cd ..

OUT=$(aws amplify create-deployment --app-id "$APP_ID" --branch-name main --profile "$AWS_PROFILE" --region us-east-1 --output json)
JOB_ID=$(echo "$OUT" | python3 -c 'import sys,json;print(json.load(sys.stdin)["jobId"])')
URL=$(echo "$OUT"    | python3 -c 'import sys,json;print(json.load(sys.stdin)["zipUploadUrl"])')
curl -s -X PUT "$URL" --upload-file deploy.zip
aws amplify start-deployment --app-id "$APP_ID" --branch-name main --job-id "$JOB_ID" --profile "$AWS_PROFILE" --region us-east-1

echo "Frontend deployed."
```

---

## Backend-Only Update

When you only changed Python code in `backend/src/`:

```bash
# Package from inside backend/ so paths are src/... not backend/src/...
cd backend
zip -r /tmp/lambda_update.zip src/ -x "**/__pycache__/*" -x "**/*.pyc" -x "tests/*"

# Deploy to the REST Lambda (get function name from AWS console or CDK output)
FUNCTION_NAME=$(aws lambda list-functions --profile <profile> --region us-east-1 \
  --query 'Functions[?contains(FunctionName,`ProcessCanvas`) && contains(FunctionName,`ApiFn`)].FunctionName' \
  --output text)

aws lambda update-function-code \
  --function-name "$FUNCTION_NAME" \
  --zip-file fileb:///tmp/lambda_update.zip \
  --profile <profile> --region us-east-1
```

**Important:** Always zip from *inside* `backend/` (not from the repo root) so the handler path `src.api.lambda_handler.handler` resolves correctly.

---

## Rotating the Instructor Access Code

1. Edit `infrastructure/lib/processcanvas-stack.ts`:
   ```typescript
   INSTRUCTOR_ACCESS_CODE: "MRED-2027",  // ← new value
   ```
2. Edit `backend/src/api/app.py`:
   ```python
   os.environ.get("INSTRUCTOR_ACCESS_CODE", "MRED-2027")  # ← same value
   ```
3. Deploy:
   ```bash
   cd infrastructure
   cdk deploy --profile <your-profile> --require-approval never
   ```
4. Share the new code with faculty privately (email or in-person).

---

## Verifying the Deployment

### Health check — API Gateway
```bash
API=https://51419m3ko9.execute-api.us-east-1.amazonaws.com/prod
curl -s -o /dev/null -w "%{http_code}" "$API/exercises"
# Expected: 401 (Unauthorized — means API is up, auth is working)
```

### End-to-end smoke test
```bash
cd backend
chmod +x scripts/smoke_test.sh
./scripts/smoke_test.sh
# Registers instructor + student, creates exercise, submits, checks results
```

### Check Lambda logs
```bash
aws logs tail /processcanvas/lambda/api --follow --profile <profile> --region us-east-1
```

---

## Environment Variables

### Lambda (set by CDK — do not edit manually)
| Variable | Description |
|---|---|
| `USER_POOL_ID` | Cognito User Pool ID |
| `USER_POOL_CLIENT_ID` | Cognito App Client ID |
| `ASSET_BUCKET` | S3 bucket name |
| `INSTRUCTOR_ACCESS_CODE` | Instructor registration gate code |
| `TABLE_USERS`, `TABLE_ENROLLMENTS`, ... | DynamoDB table names (one per table) |

### Frontend (set by Amplify build — from CDK outputs)
| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | REST API base URL |
| `NEXT_PUBLIC_WS_URL` | WebSocket API URL |
| `NEXT_PUBLIC_USER_POOL_ID` | Cognito User Pool ID |
| `NEXT_PUBLIC_USER_POOL_CLIENT_ID` | Cognito App Client ID |
| `NEXT_PUBLIC_REGION` | AWS region |

For local development, create `frontend/.env.local`:
```bash
NEXT_PUBLIC_API_URL=https://<api-id>.execute-api.us-east-1.amazonaws.com/prod
NEXT_PUBLIC_WS_URL=wss://<ws-id>.execute-api.us-east-1.amazonaws.com/prod
NEXT_PUBLIC_USER_POOL_ID=us-east-1_xxxxxxxxx
NEXT_PUBLIC_USER_POOL_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_REGION=us-east-1
```

---

## Tear Down

To delete all AWS resources (including all data in DynamoDB):

```bash
cd infrastructure
cdk destroy --profile <your-profile>
```

> ⚠️ This permanently deletes all DynamoDB tables, Cognito users, S3 objects, and the Amplify app. There is no undo.

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| `Failed to fetch` in browser | Lambda handler path wrong (zip structure) | Re-zip from inside `backend/` not repo root |
| `Invalid phase 'X' for activity 'Y'` | Custom phase not in Phase enum | Fixed in latest backend — redeploy Lambda |
| `401 Unauthorized` on all routes | Token expired or missing | Log out and log in again |
| `403 Forbidden` | Wrong role for endpoint | Check you're logged in with correct role |
| `HTTP ERROR 404` on Amplify URL | zip has `out/` prefix | Zip from inside `frontend/out/`, not from `frontend/` |
| CDK deploy fails on first run | CDK not bootstrapped | Run `cdk bootstrap` first |
| `Schema version mismatch` error in CDK | CDK CLI older than library | Run `npm install -g aws-cdk@latest` |

---

*Arizona State University · W.P. Carey School of Business · ASU Cloud Innovation Center*

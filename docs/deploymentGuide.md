# Deployment Guide

This guide walks you through deploying Development Process Navigator to your own AWS account.

---

## Table of Contents

- [Deployment Guide](#deployment-guide)
  - [Requirements](#requirements)
  - [Pre-Deployment](#pre-deployment)
    - [AWS Account Setup](#aws-account-setup)
    - [CLI Tools Installation](#cli-tools-installation)
    - [Environment Configuration](#environment-configuration)
  - [Deployment](#deployment)
    - [Option 1: One-command deploy](#option-1-one-command-deploy-recommended)
    - [Backend Deployment](#backend-deployment)
    - [Frontend Deployment](#frontend-deployment)
  - [Updating an Existing Deployment](#updating-an-existing-deployment)
  - [Post-Deployment Verification](#post-deployment-verification)
  - [Troubleshooting](#troubleshooting)
  - [Cleanup](#cleanup)

---

## Requirements

Before you deploy, you need the following.

### Accounts
- [ ] **AWS Account** - [Create an AWS Account](https://aws.amazon.com/)
- [ ] **DNS access for the email domain** (optional) - only needed for roster invite emails, to add Amazon SES DKIM records

### CLI Tools
- [ ] **AWS CLI** (v2.x) - [Install AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
- [ ] **Node.js** (v18.x or later) - [Install Node.js](https://nodejs.org/)
- [ ] **npm** (v9.x or later) - included with Node.js
- [ ] **AWS CDK** (v2.x) - `deploy.sh` runs it through `npx`, or install it with `npm install -g aws-cdk`
- [ ] **Python** (3.12+) - used by the deploy script and for backend tests
- [ ] **zip** and **curl** - used to upload the frontend to Amplify

AWS CloudShell already has all of these, so the one-command deploy works there without installing anything.

### Access Permissions
- [ ] An AWS IAM user or role with permissions for:
  - CloudFormation
  - Lambda
  - API Gateway (REST and WebSocket)
  - S3
  - DynamoDB
  - Cognito (`cognito-idp`)
  - Amplify
  - SES
  - CloudWatch Logs
  - IAM (create roles and `PassRole`, for the Lambda and Amplify service roles)
- [ ] For a sandbox or dev account, `AdministratorAccess` is the simplest option.

### Software Dependencies
- [ ] Git - [Install Git](https://git-scm.com/downloads)

---

## Pre-Deployment

### AWS Account Setup

1. **Configure the AWS CLI**
   ```bash
   aws configure --profile <your-profile>
   ```
   Enter your:
   - AWS Access Key ID
   - AWS Secret Access Key
   - Default region: `us-east-1` (the stack's default)
   - Default output format: `json`

   Check that it works:
   ```bash
   aws sts get-caller-identity --profile <your-profile>
   ```

2. **Bootstrap CDK** (once per account and region)
   ```bash
   cd infrastructure
   npx cdk bootstrap aws://<ACCOUNT_ID>/us-east-1 --profile <your-profile>
   ```
   Replace `<ACCOUNT_ID>` with the `Account` value from `get-caller-identity`. `deploy.sh` runs this step for you, and running it again is safe.

### CLI Tools Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/ASUCICREPO/Development-Process-Navigator.git
   cd Development-Process-Navigator
   ```

2. **Install the infrastructure (CDK) dependencies**
   ```bash
   cd infrastructure
   npm install
   ```

3. **Install the frontend dependencies**
   ```bash
   cd ../frontend
   npm install
   ```

4. **Backend**: no installation is needed to deploy. CDK packages `backend/` as the Lambda code as it is. To run the tests, install the test requirements with `pip install -r backend/requirements.txt`.

### Environment Configuration

There are no `.env` files to create before deploying. You provide two kinds of values:

1. **Deploy-time values**

   | Variable / context | Description | Example |
   |----------|-------------|---------|
   | `INSTRUCTOR_ACCESS_CODE` (env) or `instructorAccessCode` (CDK context) | **Required.** The code instructors type to register. Never commit it. | `DPN-7F3A91C2` |
   | `AWS_PROFILE` | AWS CLI profile to deploy with | `my-sandbox` |
   | `AWS_REGION` | Region to deploy to (default `us-east-1`). CDK picks this up, or falls back to your profile's default region, so keep the two the same. | `us-east-1` |
   | `SES_EMAIL_DOMAIN` (env) or `sesEmailDomain` (context) | Domain used for invite emails (default `wpcarey.asu.edu`) | `wpcarey.asu.edu` |

   To generate a random access code:
   ```bash
   echo "DPN-$(openssl rand -hex 4 | tr a-f A-F)"
   ```

2. **Frontend build values**: these are baked into the static build from the stack outputs. `deploy.sh` writes them to `frontend/.env.production` for you.

   | Variable | Description | Source |
   |----------|-------------|--------|
   | `NEXT_PUBLIC_API_URL` | REST API base URL (no trailing slash) | `RestApiUrl` output |
   | `NEXT_PUBLIC_WS_URL` | WebSocket URL | `WsApiUrl` output |
   | `NEXT_PUBLIC_REGION` | AWS region | your region |

   > **Important**: if the build runs without `NEXT_PUBLIC_API_URL`, the app calls its own host. Every request then fails with `Unexpected token '<', "<!DOCTYPE "... is not valid JSON`.

3. **Lambda environment** (set by CDK; you don't edit these): `USER_POOL_ID`, `USER_POOL_CLIENT_ID`, `ASSET_BUCKET`, `INSTRUCTOR_ACCESS_CODE`, `SES_SENDER_EMAIL`, and one `TABLE_<NAME>` per DynamoDB table. `deploy.sh` also sets `APP_URL` to the Amplify URL for invite links.

---

## Deployment

### Option 1: One-command deploy (recommended)

From the repository root, on your machine or in AWS CloudShell:

```bash
chmod +x deploy.sh
AWS_PROFILE=<your-profile> ./deploy.sh
```

The script looks for the instructor access code in this order:
- **Environment variable**: `INSTRUCTOR_ACCESS_CODE=<code> ./deploy.sh`
- **Private file**: `~/.dpn_instructor_access_code`, outside the repo and readable only by you
- **Prompt**: if neither is set, it asks once (input is hidden) and saves your answer to that file, so later deploys don't ask again.

The code is never written to the repository. Instructors enter it only once, when they register; logging in doesn't need it.

The script then:
1. Checks the prerequisites and your AWS credentials. In CloudShell it also clears npm and home-folder caches to avoid running out of disk space; on other machines it leaves your caches alone.
2. Bootstraps CDK and deploys `ProcessCanvasStack`: Cognito, 12 DynamoDB tables, two Lambdas, the REST and WebSocket APIs, S3, SES, and Amplify.
3. Sets `APP_URL` on the API Lambda.
4. Builds the frontend with the stack outputs and uploads it to Amplify.
5. Prints the frontend URL and API URLs.

This takes about 8–12 minutes on a fresh account. Skip to [Post-Deployment Verification](#post-deployment-verification) when it finishes.

The two sections below do the same thing by hand.

### Backend Deployment

1. **Go to the infrastructure directory** (the CDK app lives here, not in `backend/`)
   ```bash
   cd infrastructure
   ```

2. **Synthesize the CloudFormation template** (optional, to review it first)
   ```bash
   npx cdk synth --context instructorAccessCode=<your-code>
   ```

3. **Deploy the stack**
   ```bash
   npx cdk deploy --profile <your-profile> \
     --context instructorAccessCode=<your-code> \
     --outputs-file /tmp/cdk-outputs.json
   ```

   When prompted, review the IAM changes and type `y`. Add `--require-approval never` to skip the prompt.

4. **Note the outputs**

   After the deploy finishes, save these outputs. The frontend needs them.
   - **RestApiUrl**: REST API endpoint
   - **WsApiUrl**: WebSocket endpoint
   - **AmplifyAppId** and **AmplifyBranchUrl**: hosting app and its live URL
   - **UserPoolId** and **UserPoolClientId**: Cognito
   - **SesEmailDomain**: the domain to verify in SES

   You can get them again at any time with:
   ```bash
   aws cloudformation describe-stacks --stack-name ProcessCanvasStack --profile <your-profile> \
     --query 'Stacks[0].Outputs[].[OutputKey,OutputValue]' --output table
   ```

5. **Enable invite emails** (optional): open SES → Verified identities, select the domain, and add its three DKIM CNAME records to DNS. If you don't have DNS access, verify individual sender email addresses instead.

### Frontend Deployment

1. **Go to the frontend directory**
   ```bash
   cd frontend
   ```

2. **Configure the frontend environment** with the values from the backend outputs
   ```bash
   cat > .env.production <<EOF
   NEXT_PUBLIC_API_URL=<RestApiUrl without the trailing slash>
   NEXT_PUBLIC_WS_URL=<WsApiUrl>
   NEXT_PUBLIC_REGION=us-east-1
   EOF
   ```

3. **Build the frontend**
   ```bash
   npm run build      # static export, written to frontend/out/
   ```

4. **Deploy the frontend to AWS Amplify**

   The Amplify app has no Git repository connected, so you upload the build as a zip. Zip from **inside** `out/` so `index.html` is at the root of the zip.
   ```bash
   APP_ID=<AmplifyAppId>
   (cd out && zip -rq ../deploy.zip .)

   OUT=$(aws amplify create-deployment --app-id "$APP_ID" --branch-name main --profile <your-profile> --output json)
   JOB_ID=$(echo "$OUT" | python3 -c 'import sys,json;print(json.load(sys.stdin)["jobId"])')
   URL=$(echo "$OUT"    | python3 -c 'import sys,json;print(json.load(sys.stdin)["zipUploadUrl"])')

   curl -s -X PUT "$URL" --upload-file deploy.zip
   aws amplify start-deployment --app-id "$APP_ID" --branch-name main --job-id "$JOB_ID" --profile <your-profile>

   # Check the job until it reports SUCCEED
   aws amplify get-job --app-id "$APP_ID" --branch-name main --job-id "$JOB_ID" \
     --profile <your-profile> --query job.summary.status --output text
   ```

   You can also use the helper script: `APP_ID=<AmplifyAppId> AWS_PROFILE=<your-profile> ./deploy_amplify.sh`. It expects `deploy.zip` to already exist.

5. **Clean up**: `rm -f deploy.zip .env.production`

---

## Updating an Existing Deployment

| Change | What to run | Time |
|---|---|---|
| Frontend only (TSX/CSS) | Steps 2–5 of [Frontend Deployment](#frontend-deployment) | ~3 min |
| Backend Python only | Lambda code update (below) | ~1 min |
| Infrastructure, or rotating the access code | `AWS_PROFILE=<your-profile> ./deploy.sh` with the new code | ~8 min |

**Backend-only update.** Zip from *inside* `backend/` so the handler path `src.api.lambda_handler.handler` still resolves:
```bash
cd backend
zip -rq /tmp/lambda_update.zip src/ -x "**/__pycache__/*" "**/*.pyc"
FN=$(aws lambda list-functions --profile <your-profile> \
  --query 'Functions[?contains(FunctionName,`ProcessCanvas`) && contains(FunctionName,`ApiFn`)].FunctionName' --output text)
aws lambda update-function-code --function-name "$FN" --zip-file fileb:///tmp/lambda_update.zip --profile <your-profile>
```

**Rotating the instructor access code.** Redeploy with a new code. The old one stops working immediately, and instructors who already have accounts aren't affected. Share the new code with faculty privately.

---

## Post-Deployment Verification

### Verify Backend Deployment

1. **Check the CloudFormation stack status**
   ```bash
   aws cloudformation describe-stacks --stack-name ProcessCanvasStack --profile <your-profile> \
     --query 'Stacks[0].StackStatus' --output text
   ```
   Expected status: `CREATE_COMPLETE` or `UPDATE_COMPLETE`

2. **Test the API endpoint**
   ```bash
   API=<RestApiUrl without the trailing slash>
   curl -s -o /dev/null -w "%{http_code}\n" "$API/exercises"
   curl -s -X POST "$API/auth/login" -H 'Content-Type: application/json' \
     -d '{"email":"nobody@example.com","password":"wrongpass1"}'
   ```
   Expected responses:
   - The first call returns `401`. That means the API is up and the authorizer rejected the missing token.
   - The second returns `{"error": "Invalid email or password."}`. That means the Lambda and Cognito are wired up.

3. **Check the Lambda functions**
   ```bash
   aws lambda list-functions --profile <your-profile> \
     --query "Functions[?contains(FunctionName, 'ProcessCanvas')].[FunctionName,Runtime]" --output table
   ```
   You should see `...ApiFn...`, `...WsFn...`, and the S3 auto-delete helper.

### Verify Frontend Deployment

1. **Open the application** at `https://main.<AmplifyAppId>.amplifyapp.com` (the `AmplifyBranchUrl` output).

2. **Test the basic flow**
   - [ ] Register as an **Instructor** with the access code you deployed with. A wrong code should be rejected.
   - [ ] Go to **My Exercises**, pick a scenario (for example "Scenario B — Master-Planned Community"), customize it if you like, and click **Save & Publish Exercise**. Copy the Exercise ID.
   - [ ] On **Student Roster**, generate a join code.
   - [ ] In a private window, register as a **Student** with that join code. The exercise should appear under **My Exercises**.
   - [ ] Complete the rounds (in Round 3, a professional can be dropped into several activities) and the Budget & Schedule step, then submit. A score and a round-by-round breakdown should appear.
   - [ ] As the instructor, open **Results & History** and confirm the submission is listed.

3. **Check the logs** if anything fails:
   ```bash
   aws logs tail /processcanvas/lambda/api --follow --profile <your-profile>
   ```

> `backend/scripts/smoke_test.sh` is **out of date**. It registers an instructor without an access code and uses a template ID that no longer exists (`seed-real-estate`). Use the manual checklist above until the script is updated.

---

## Troubleshooting

### Common Issues

#### Issue: `Missing instructor access code` during synth or deploy
**Symptoms**: `cdk synth` or `cdk deploy` stops right away with this error.

**Solution**:
```bash
INSTRUCTOR_ACCESS_CODE=<your-code> AWS_PROFILE=<your-profile> ./deploy.sh
# or
npx cdk deploy --context instructorAccessCode=<your-code>
```

#### Issue: `Unexpected token '<', "<!DOCTYPE "... is not valid JSON`
**Symptoms**: Every page fails to load data. This often happens with `npm run dev` locally.

**Solution**: The frontend was built or started without `NEXT_PUBLIC_API_URL`, so it called itself and got HTML back. For local development, create `frontend/.env.local`:
```bash
NEXT_PUBLIC_API_URL=<RestApiUrl without the trailing slash>
```
Restart `npm run dev`. For deployed builds, rebuild with `.env.production` set ([Frontend Deployment](#frontend-deployment), step 2).

#### Issue: Amplify URL shows `404`
**Symptoms**: The deployment job succeeds, but the site returns 404.

**Solution**: The zip has an extra `out/` folder at the top. Zip from inside `frontend/out/`: `(cd out && zip -rq ../deploy.zip .)`.

#### Issue: "Instructor registration is not configured"
**Symptoms**: Instructor sign-up is refused with that message.

**Solution**: The Lambda has no `INSTRUCTOR_ACCESS_CODE`. Redeploy with the code supplied.

#### Issue: `Failed to fetch` or `Internal error` after a backend-only update
**Symptoms**: Every API call fails after `update-function-code`.

**Solution**: The zip was made from the repo root, so the handler path doesn't resolve. Re-zip from inside `backend/` ([Updating](#updating-an-existing-deployment)).

#### Issue: Invite emails aren't delivered
**Symptoms**: "Invite sent" is shown, but no email arrives.

**Solution**: The SES domain isn't verified yet (add the DKIM records), or the account is still in the SES sandbox. A sandbox account can only send to verified addresses until you request production access.

#### Issue: "Forgot password" doesn't work
**Symptoms**: The reset request fails with `403`.

**Solution**: This is a known gap. API Gateway doesn't route `/auth/forgot-password` or `/auth/confirm-reset`. See the [Modification Guide](./modificationGuide.md#feature-enable-password-reset). In the meantime, an admin can reset a password with `aws cognito-idp admin-set-user-password`.

#### Issue: CDK bootstrap error
**Symptoms**: An error says the environment isn't bootstrapped, or the schema version doesn't match.

**Solution**:
```bash
npx cdk bootstrap aws://<ACCOUNT_ID>/<REGION> --profile <your-profile>
npm install -g aws-cdk@latest   # if the CLI is older than the library
```

#### Issue: Permission denied
**Symptoms**: Access denied errors during deployment.

**Solution**:
- Check that your AWS credentials are set up (`aws sts get-caller-identity --profile <your-profile>`).
- Make sure your IAM user or role has the [required permissions](#access-permissions).
- Check that you're deploying to the region you intended.

---

## Cleanup

To remove every deployed resource:

```bash
cd infrastructure
npx cdk destroy --profile <your-profile> --context instructorAccessCode=unused
```

> **Warning**: Every table, the bucket, and the Cognito pool use `RemovalPolicy.DESTROY`. This permanently deletes all users, exercises, attempts, and the Amplify app, and it can't be undone. Export anything you need first, for example with `aws dynamodb scan`. The synth step still needs some access code to run; its value doesn't matter for a destroy.

---

## Next Steps

After a successful deployment:
1. Read the [User Guide](./userGuide.md) to learn how to use the application.
2. Check the [API Documentation](./APIDoc.md) for integration details.
3. See the [Modification Guide](./modificationGuide.md) for customization options.

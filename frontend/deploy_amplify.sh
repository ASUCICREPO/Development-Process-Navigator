#!/usr/bin/env bash
set -euo pipefail
export AWS_DEFAULT_REGION=us-east-1
APP_ID="dgai4l6tikxfm"
BRANCH="main"
ZIP="$(pwd)/deploy.zip"

echo "== Creating deployment =="
OUT=$(aws amplify create-deployment --app-id "$APP_ID" --branch-name "$BRANCH" --output json)
JOB_ID=$(echo "$OUT" | python3 -c 'import sys,json;print(json.load(sys.stdin)["jobId"])')
URL=$(echo "$OUT" | python3 -c 'import sys,json;print(json.load(sys.stdin)["zipUploadUrl"])')
echo "jobId=$JOB_ID"

echo "== Uploading artifact =="
curl -s -H "Content-Type: application/zip" --upload-file "$ZIP" "$URL"
echo "upload done"

echo "== Starting deployment =="
aws amplify start-deployment --app-id "$APP_ID" --branch-name "$BRANCH" --job-id "$JOB_ID" >/dev/null

echo "== Polling job status =="
for i in $(seq 1 30); do
  ST=$(aws amplify get-job --app-id "$APP_ID" --branch-name "$BRANCH" --job-id "$JOB_ID" \
        --query "job.summary.status" --output text)
  echo "status: $ST"
  if [ "$ST" = "SUCCEED" ] || [ "$ST" = "FAILED" ] || [ "$ST" = "CANCELLED" ]; then
    break
  fi
  sleep 5
done

echo "== Default domain =="
aws amplify get-app --app-id "$APP_ID" --query "app.defaultDomain" --output text
echo "Site URL: https://${BRANCH}.${APP_ID}.amplifyapp.com"

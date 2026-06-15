# Build Instructions — ProcessCanvas

## Prerequisites
- **Python**: 3.12+ (backend)
- **Node.js**: 18+ and npm (frontend + CDK infrastructure)
- **AWS**: account + credentials (only for deploy), AWS CDK v2
- **System**: macOS/Linux/WSL

## Backend (Python)
### 1. Install dependencies
```bash
cd backend
python3 -m pip install -r requirements.txt
```
### 2. Compile check
```bash
cd backend
python3 -m compileall -q src
```
- **Expected**: no output, exit code 0.

## Frontend (Next.js)
### 1. Install dependencies
```bash
cd frontend
npm install
```
### 2. Build
```bash
npm run build
```
- **Build artifacts**: `.next/` production build.

## Infrastructure (AWS CDK, TypeScript)
### 1. Install dependencies
```bash
cd infrastructure
npm install
```
### 2. Synthesize (no deploy)
```bash
npx cdk synth
```
- **Expected**: CloudFormation template synthesized for `ProcessCanvasStack`.
### 3. Deploy (requires AWS creds)
```bash
npx cdk deploy
```

## Troubleshooting
- **Python import errors in tests**: ensure you run pytest from `backend/` (conftest.py adds `src` to path).
- **CDK synth fails**: run `npm install` in `infrastructure/`; ensure CDK v2 and Node 18+.
- **Frontend build fails**: delete `node_modules` and reinstall; confirm Node 18+.

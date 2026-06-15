# ProcessCanvas Frontend (Next.js)

Next.js (React/TypeScript) SPA for the Instructor and Student experiences, hosted on AWS Amplify
Hosting. The authoritative backend is the separate Python API (REST) + WebSocket API.

## Structure
```
src/
  shared/      api client, auth, real-time client, types
  instructor/  U0A components (authoring, class results, live host)
  student/     U0B components (sorting board, feedback, resubmit, history)
pages/         Next.js routes
```

## Develop
```
cd frontend
npm install
npm run dev
```

## Notes
- Next.js used as a client app (static/client-rendered); server features optional and must not
  duplicate backend authority (scoring/validation live in the Python backend).
- Interactive elements carry stable `data-testid` attributes for automation.

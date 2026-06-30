# ProcessCanvas Frontend (Next.js)

Next.js 14 (React/TypeScript) SPA for the Instructor and Student experiences, hosted on AWS Amplify
Hosting. The authoritative backend is the separate Python API (REST) + WebSocket API.

## Structure
```
app/                    Next.js App Router pages
  instructor/           Instructor-facing pages
    page.tsx              Dashboard
    exercises/            Exercise management & creation
    roster/               Student roster management
    session/              Live session host view
    results/              Results & history viewer
  student/              Student-facing pages
    page.tsx              Dashboard
    exercise/             Drag-and-drop exercise board
    history/              Attempt history + detail view
    scores/               Score overview
  tutorial/             Help Center (role-tabbed guides)
    page.tsx

src/
  shared/               Shared components & utilities
    NavBar.tsx            Top header bar (logo, role toggle, Tutorial button, avatar menu)
    Sidebar.tsx           Student sidebar navigation
    InstructorSidebar.tsx Instructor sidebar navigation
    InfoIcon.tsx          Reusable tooltip info icon component (ⓘ)
    apiClient.ts          REST API client
    session.ts            Auth token & session management
    useRoleGuard.ts       Role-based route guard hook

public/
  images/               Static assets (ASU logo, etc.)
```

## Develop
```bash
npm install
npm run dev       # starts Next.js dev server at http://localhost:3000
npm run build     # production static export (output: out/)
npm run lint      # ESLint
npm run test      # Vitest
```

## Key Components

### Help System
- **Tutorial Page** (`/tutorial`): Accordion-style guides with separate Instructor and Student tabs
- **InfoIcon** (`src/shared/InfoIcon.tsx`): Drop-in tooltip component. Usage:
  ```tsx
  import { InfoIcon } from "../src/shared/InfoIcon";
  <InfoIcon tooltip="Explanation text shown on hover" />
  ```
- **Tutorial Button**: In the NavBar (top-right), visible when logged in
- **Help Link**: In both sidebars as a nav item

### Navigation
- Top NavBar: ASU branding, app title, role toggle (Student/Instructor), Tutorial button, avatar menu
- Sidebars: Role-specific navigation with collapsible design

## Environment Variables
Set via Amplify build or `.env.local`:
```
NEXT_PUBLIC_API_URL=https://<api-id>.execute-api.<region>.amazonaws.com/prod
NEXT_PUBLIC_WS_URL=wss://<ws-api-id>.execute-api.<region>.amazonaws.com/prod
NEXT_PUBLIC_USER_POOL_ID=<cognito-pool-id>
NEXT_PUBLIC_USER_POOL_CLIENT_ID=<cognito-client-id>
NEXT_PUBLIC_REGION=us-east-1
```

## Deployment
Amplify auto-deploys on push to `main`. The build spec is defined in CDK (`infrastructure/`).

Manual deploy:
```bash
npm run build
# Upload out/ to Amplify or use deploy_amplify.sh
```

## Notes
- Next.js used as a client-only app (static export); server features are not used.
- All business logic (scoring, validation, auth) lives in the Python backend.
- Interactive elements carry stable `data-testid` attributes for automation.
- Styling: Plain CSS (`app/globals.css`) with CSS custom properties (ASU brand colors).

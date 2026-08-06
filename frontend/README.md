# ProcessCanvas Frontend (Next.js 14)

Next.js 14 (React/TypeScript) SPA for the Instructor and Student experiences, hosted on AWS Amplify Hosting as a static export. All business logic, scoring, and auth live in the Python backend.

## Structure

```
app/
├── page.tsx                  Login / Register (public)
├── layout.tsx                Root layout: NavBar + footer
├── instructor/
│   ├── page.tsx              Dashboard (exercises, stats, assign modal)
│   ├── exercises/            Exercise creation, weight matrix editor
│   ├── roster/               Student roster (invite / join code)
│   ├── session/              Live session host view
│   └── results/              Class results, score trends, CSV export
└── student/
    ├── page.tsx              Student dashboard
    ├── exercise/             Drag-and-drop ExerciseBoard
    ├── history/              Attempt history + per-card detail
    └── scores/               Score overview

src/shared/
├── NavBar.tsx                Top header (Tutorial button, avatar menu)
├── Sidebar.tsx               Student sidebar navigation
├── InstructorSidebar.tsx     Instructor sidebar navigation
├── InfoIcon.tsx              Reusable tooltip component (ⓘ)
├── apiClient.ts              REST API client (typed)
├── session.ts                Auth token, session helpers, role storage
└── useRoleGuard.ts           Role-based route guard hook

app/tutorial/
└── page.tsx                  Help Center (accordion guides, role-tabbed)
```

## Dev

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production static export → out/
npm run lint
npm run test       # Vitest
```

## Environment Variables

Create `frontend/.env.local` for local development:

```
NEXT_PUBLIC_API_URL=https://<api-id>.execute-api.us-east-1.amazonaws.com/prod
NEXT_PUBLIC_WS_URL=wss://<ws-id>.execute-api.us-east-1.amazonaws.com/prod
NEXT_PUBLIC_USER_POOL_ID=us-east-1_xxxxxxxxx
NEXT_PUBLIC_USER_POOL_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_REGION=us-east-1
```

In production, these are set automatically by the CDK Amplify build spec.

## Deployment

**Manual (Amplify):**
```bash
npm run build
# Zip from inside out/ — NOT from frontend/
cd out && zip -r ../deploy.zip . && cd ..
# Then upload via AWS CLI (see docs/DEPLOYMENT.md or deploy_amplify.sh)
```

**One-click:** Use the root `deploy.sh` script — see [docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md).

### ⚠️ Zip structure note
Always zip from inside `out/` so `index.html` is at the zip root. Zipping the `out/` folder (as `zip -r deploy.zip out/`) causes Amplify 404 errors.

## Key Components

### ExerciseBoard (`src/student/ExerciseBoard.tsx`)
Drag-and-drop exercise interface:
- Left panel: activity cards (filterable by People/Task/Test)
- Right panel: phase columns (drop targets)
- Save Draft, Submit, Resubmit buttons
- Error banner for API failures

### Help System
- **Tutorial Page** (`app/tutorial/page.tsx`): Role-tabbed accordion guides
- **InfoIcon** (`src/shared/InfoIcon.tsx`): Inline tooltip. Usage:
  ```tsx
  import { InfoIcon } from "../src/shared/InfoIcon";
  <InfoIcon tooltip="Text shown on hover" />
  ```
- **Tutorial Button**: NavBar top-right (visible when logged in)
- **Help Link**: Bottom of both sidebars

## Notes

- Next.js is used as a **client-only** app — no SSR, no API routes
- Static export: `output: "export"` in `next.config.js`
- All interactive elements carry `data-testid` attributes for test automation
- Styling: `app/globals.css` with CSS custom properties (ASU brand: maroon `#8C1D40`, gold `#FFC627`)

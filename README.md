# NCRP Citizen Services

React + Vite migration of the NCRP citizen portal, integrated with the provided proof-of-concept API.

## Run

Requires Node.js 18+. Copy `.env.example` to `.env` and set `VITE_API_BASE_URL` if the backend is not at `http://localhost:8000`.

```bash
npm install
npm run dev
npm run build
```

## Architecture

`src/main.jsx` is only the Vite entrypoint. `src/App.jsx` owns routing, `src/components/layout` contains the full and reporting shells, `src/pages` contains feature screens, `src/services/api` owns HTTP requests, `src/context` owns authentication state, and `src/hooks` contains reusable async state. Questionnaire navigation is server-driven: the client renders the returned question and sends answers without calculating branch targets.

## API coverage

The app integrates health-independent auth (`send-otp`, `verify-otp`, `logout`, `me`), draft creation/current/answer/back/save/review/claim/submit, cases and timeline, grievances, notifications, profile read/update, and suspect checks. Evidence upload is intentionally not exposed because the contract identifies it as a placeholder and does not implement draft evidence endpoints.

The backend must allow the Vite origin through CORS when running on separate ports. The demo OTP is `1234`.

# NCRP API mapping

The frontend service boundary in `src/services/api/index.js` is the only place that constructs feature API URLs; shared request/auth behavior lives in `src/services/api/client.js`.

| Feature | UI | Endpoint(s) |
| --- | --- | --- |
| OTP sign-in | `/login` | `POST /api/v1/auth/send-otp`, `POST /api/v1/auth/verify-otp` |
| Session | header sign-out / protected routes | `POST /api/v1/auth/logout`, `GET /api/v1/auth/me` |
| Questionnaire | `/report` | `POST /api/v1/report/drafts`, `GET current`, `POST answers`, `POST back`, `POST save`, `GET review` |
| Submission | report review | `POST /api/v1/auth/claim-draft`, `POST /submit` |
| Cases | `/cases`, `/cases/:caseId` | `GET /api/v1/cases`, `GET /api/v1/cases/:id`, `GET /timeline`, `POST /grievance` |
| Notifications | header drawer | `GET /api/v1/notifications` |
| Profile | `/profile` | `GET/PATCH /api/v1/profile` |
| Suspect check | `/suspect` | `POST /api/v1/suspects/check` |
| Suspect report (planned backend) | `/suspect/report` | `POST /api/v1/suspects/drafts`, `GET /current`, `POST /answers`, `POST /save`, `GET /review`, `POST /submit` |

The questionnaire never derives a next node in the browser. The answer response is rendered as the next state. Evidence upload is not implemented in the UI because the supplied contract describes only a placeholder upload URL and explicitly says draft evidence endpoints are unavailable.

## Suspect-report endpoints required

These endpoints are assumed by the new suspect-report wizard and need to be implemented by the backend. They mirror the cybercrime draft lifecycle and must support anonymous drafts until authentication.

`POST /api/v1/suspects/drafts`

Request: `{ "identifier_type": "upi", "identifier": "example@upi" }` (both fields optional when the report is started from the standalone Report Suspect CTA). Response: `{ "draftId": "<uuid>", "sessionId": "<uuid>" }`.

`POST /api/v1/suspects/drafts/{draft_id}/answers`

Request: `{ "node_id": "suspect_details|suspect_encounter|suspect_description", "option_id": null, "value": "<json value>" }`. Response: the next-step object, including `draftId`, `progress`, `question`, `navigation`, and `complete`, matching the cybercrime `/current` shape.

`GET /api/v1/suspects/drafts/{draft_id}/current`, `POST /api/v1/suspects/drafts/{draft_id}/back`, and `POST /api/v1/suspects/drafts/{draft_id}/save`

Current/back responses should use the next-step object. Save response: `{ "success": true, "draftId": "<uuid>", "status": "IN_PROGRESS" }`. These endpoints must be available anonymously for the pre-auth portion.

`POST /api/v1/auth/claim-suspect-draft`

Request: `{ "draftId": "<uuid>" }`. Requires `Authorization: Bearer <JWT>`. Response: `{ "draftId": "<uuid>", "userId": "<uuid>", "status": "IN_PROGRESS" }`. This must be a separate claim operation because the live `/auth/claim-draft` only recognizes cybercrime report drafts and returns `DRAFT_NOT_FOUND` for suspect drafts.

`GET /api/v1/suspects/drafts/{draft_id}/review`

Response: `{ "draftId": "<uuid>", "answers": { "identifier_type": "upi", "identifier": "example@upi", "reason": "Impersonation", "date": "2026-08-27", "method": "WhatsApp", "description": "..." }, "evidence": [] }`.

`POST /api/v1/suspects/drafts/{draft_id}/submit`

Requires `Authorization: Bearer <JWT>`. Response: `{ "success": true, "report": { "id": "<uuid>", "status": "RECEIVED", "submittedAt": "<ISO-8601>" } }`. This is an internal suspect-report identifier only; it must not create a trackable citizen case.

## Evidence endpoints required

The current backend exposes only `POST /api/v1/evidence/upload-url`, which returns a placeholder `uploadUrl: null` and does not persist a file or evidence record. The frontend now assumes the following endpoints exist so both evidence flows can use the same storage contract while keeping their UX rules separate.

### Upload preparation

`POST /api/v1/evidence/upload-url` (authenticated)

Request: `{ "filename": "payment.png", "contentType": "image/png", "size": 12345 }`. All three fields are required by the live `UploadUrlIn` schema; omitting `contentType` or `size` causes `422 Unprocessable Entity`. Response: `{ "uploadUrl": "<signed-upload-url>", "storagePath": "evidence/<user_uuid>/<uuid>-payment.png", "provider": "supabase_storage", "expiresAt": "<ISO-8601>" }`.

The frontend should upload the binary to `uploadUrl` with the returned content type, then submit the returned `storagePath` as evidence metadata. The backend must validate filename, content type, size, ownership, and signed URL expiry. It must never treat a client-provided storage path as proof of ownership.

### Cybercrime report evidence

`POST /api/v1/report/drafts/{draft_id}/evidence` (authenticated after draft claim)

Request for a file: `{ "kind": "file", "storagePath": "<path>", "tag": "Payment Receipt", "description": "Original receipt" }`. Request for a URL: `{ "kind": "url", "url": "https://example.com", "tag": "Profile Screenshot", "description": "Relevant profile" }`. The frontend uses camelCase `storagePath`; the backend must accept both `storagePath` and legacy `storage_path`, normalize them to one internal field, and perform ownership validation against the authenticated user. Response: `{ "id": "<uuid>", "kind": "file|url", "filename": "payment.png", "url": null, "storage_path": "<path>", "tag": "Payment Receipt", "description": "Original receipt", "createdAt": "<ISO-8601>" }`.

`GET /api/v1/report/drafts/{draft_id}/evidence` (authenticated/owner)

Response: `{ "evidence": [<evidence object>] }`. This is used by Report Review and must return stable, display-safe metadata; signed download URLs may be generated separately or returned as short-lived URLs.

### Suspect report evidence

`POST /api/v1/suspects/drafts/{draft_id}/evidence` (authenticated after draft claim)

Use the same request and response format as cybercrime evidence. Suspect evidence is optional, and a draft may be submitted with an empty evidence list. Suspect submissions must not appear in cases, case evidence, or citizen report history.

`GET /api/v1/suspects/drafts/{draft_id}/evidence` (authenticated/owner)

Response: `{ "evidence": [<evidence object>] }`. This is used by Suspect Review.

### Case evidence

`GET /api/v1/cases/{case_id}/evidence` (authenticated/owner)

Response: `{ "submitted": [<evidence object>], "requested": [ { "id": "<uuid>", "tag": "Bank Statement", "description": "Original statement requested", "status": "OPEN|FULFILLED", "createdAt": "<ISO-8601>" } ] }`.

The Case Evidence page must separate already submitted evidence from evidence requested by the investigating unit. If an item is `OPEN`, the UI may offer an add-evidence action. The backend must determine whether the case is eligible for additional evidence. Because the MVP says files cannot be removed or replaced, no delete or replace endpoint should be exposed. If later required, add `DELETE /api/v1/evidence/{evidence_id}` and enforce owner/case authorization server-side.

### Backend issues found during live testing

- `GET /api/v1/suspects/drafts/{id}/review` currently returns `identifier_type: null` and `identifier: null` even after a suspect identifier is answered; it only preserves the value under `suspect_details`. The backend should persist and return explicit `identifier_type` and `identifier` fields.
- The live suspect questionnaire currently returns `suspect_details`, `suspect_encounter`, and `suspect_description`, while the UI plan requires identifier type, identifier, reason, date, and encounter method. The suspect draft schema/tree must be expanded or the answer value contract must explicitly define the structured object.
- The running backend now returns a signed `uploadUrl` from `POST /api/v1/evidence/upload-url` and accepts both `storagePath` and `storage_path` for evidence metadata. Keep the frontend canonical payload as camelCase `storagePath`.
- The three report-draft evidence endpoints and three suspect-draft evidence endpoints are absent from the live OpenAPI specification.
- The live `/auth/claim-draft` endpoint returns 404 for a suspect draft; implement the separate suspect-draft claim endpoint above before suspect evidence can be submitted.
- `GET /api/v1/cases/{case_id}/evidence`, case messages, report PDF, satisfaction retrieval, and grievance retrieval are absent from the live contract.

## Live backend endpoint test report — 2026-08-27

Tested against `http://localhost:8000` using the demo phone/OTP and a bearer token. `200` means the endpoint responded successfully for the tested payload; expected validation/not-found responses are marked accordingly.

| Endpoint group | Result |
| --- | --- |
| `GET /health` | PASS — 200 |
| Auth send OTP, verify OTP, `/auth/me`, logout | PASS — 200 |
| Profile GET/PATCH | PASS — 200 |
| Report tree | PASS — 200 |
| Notifications GET and read-all PATCH | PASS — 200 |
| Cases GET | PASS — 200 |
| Suspect check and suspect reports GET | PASS — 200 |
| Evidence upload URL | PASS — 200 with `filename`, `contentType`, and positive `size`; returns a signed Supabase upload URL. |
| Report draft create/current/save/back/review | PASS — 200 |
| Report draft evidence POST | EXPECTED BLOCKER — 404, endpoint not implemented |
| Suspect draft create/current/answer/save/back/review | PASS — 200 |
| Suspect draft submit after completing all three live questions | PASS — 200; returned `{ success: true, report: { id, status, submittedAt } }` |
| Suspect draft submit while incomplete | PASS validation — 400 |
| Suspect draft evidence POST | EXPECTED BLOCKER — 404, endpoint not implemented |
| Claim invalid draft | PASS validation — 404 |
| Case evidence GET | NOT VERIFIED with a case ID; endpoint is absent from the live OpenAPI and should be added |
| Notification read-one, case detail/timeline/grievance, suspect detail | Not fully exercised in this sweep; routes exist in OpenAPI, but should be covered by backend integration tests with fixture IDs |

The live tests created anonymous report/suspect drafts and one demo suspect report as test data. No real user data or uploaded file was transmitted.

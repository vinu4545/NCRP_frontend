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

## Admin case preview endpoints

The frontend includes a development-only, unauthenticated admin preview at `/admin/cases/{case_id}`. The “Visit admin preview” link is shown on Case Home so the team can exercise case progression and evidence-request UI before an admin authentication system exists. These endpoints must be protected or disabled outside the POC environment.

`GET /api/v1/admin/cases/{case_id}`

Response:
```json
{
  "case": {
    "id": "<case_uuid>",
    "caseNumber": "NCRP-2026-000001",
    "category": "financial_fraud",
    "status": "UNDER_REVIEW",
    "submittedAt": "<ISO-8601>"
  },
  "submitted": [
    {
      "id": "<evidence_uuid>",
      "kind": "file",
      "filename": "payment.png",
      "tag": "Payment Receipt",
      "description": "Original receipt",
      "createdAt": "<ISO-8601>"
    }
  ],
  "requested": [
    {
      "id": "<request_uuid>",
      "tag": "Bank Statement",
      "description": "Upload the statement covering the disputed transaction.",
      "status": "OPEN",
      "createdAt": "<ISO-8601>"
    }
  ]
}
```

`PATCH /api/v1/admin/cases/{case_id}/status`

Request:
```json
{ "status": "UNDER_REVIEW" }
```

Allowed statuses should be defined by the backend state machine, for example `SUBMITTED`, `UNDER_REVIEW`, `IN_PROGRESS`, `ACTION_REQUIRED`, `RESOLVED`, and `CLOSED`. Response:
```json
{ "success": true, "case": { "id": "<case_uuid>", "status": "UNDER_REVIEW" }, "event": { "type": "STATUS_CHANGED", "createdAt": "<ISO-8601>" } }
```

`POST /api/v1/admin/cases/{case_id}/evidence-requests`

Request:
```json
{ "tag": "Bank Statement", "description": "Upload the statement covering the disputed transaction." }
```

Response:
```json
{ "id": "<request_uuid>", "caseId": "<case_uuid>", "tag": "Bank Statement", "description": "Upload the statement covering the disputed transaction.", "status": "OPEN", "createdAt": "<ISO-8601>" }
```

Backend requirements:

- Validate that the case exists and is eligible for status changes or evidence requests.
- Create a timeline event and notification when status changes.
- Create a citizen-visible open evidence request and include it in `GET /api/v1/cases/{case_id}/evidence`.
- Keep requested evidence scoped to the case owner; never expose internal admin data.
- Return `404` for an unknown case and `422` for an invalid status or incomplete evidence request.
- Add admin authentication/authorization before using these routes outside local development. The current frontend intentionally sends no admin credentials for the POC preview.

## Case Evidence page

`GET /api/v1/cases/{case_id}/evidence` drives `/cases/{case_id}/evidence`. The response must remain:
```json
{
  "submitted": [
    {
      "id": "<evidence_uuid>",
      "kind": "file",
      "filename": "payment.png",
      "url": null,
      "storagePath": "<internal-storage-path>",
      "tag": "Payment Receipt",
      "description": "Original receipt",
      "createdAt": "<ISO-8601>"
    }
  ],
  "requested": [
    {
      "id": "<request_uuid>",
      "tag": "Bank Statement",
      "description": "Upload the statement covering the disputed transaction.",
      "status": "OPEN",
      "createdAt": "<ISO-8601>"
    }
  ]
}
```

The frontend renders submitted evidence in a grid using `filename` for files, `url` for URL evidence, plus `tag`, `description`, and type. It renders open requests as upload cards. `storagePath` is never shown to the citizen.

### Case evidence upload

The frontend assumes the following endpoint for fulfilling an open request:

`POST /api/v1/cases/{case_id}/evidence` (authenticated case owner)

Request after the signed binary upload completes:
```json
{
  "kind": "file",
  "storagePath": "<storagePath from upload-url>",
  "requestId": "<request_uuid>",
  "tag": "Bank Statement",
  "description": "Statement for August 2026"
}
```

Response:
```json
{
  "id": "<evidence_uuid>",
  "caseId": "<case_uuid>",
  "requestId": "<request_uuid>",
  "kind": "file",
  "filename": "statement.pdf",
  "storagePath": "<internal-storage-path>",
  "tag": "Bank Statement",
  "description": "Statement for August 2026",
  "createdAt": "<ISO-8601>"
}
```

On success, the backend should mark the matching request `FULFILLED` (or return an equivalent request state), create a timeline event, and notify the investigating unit. Validate case ownership, request ownership, request status, storage-path ownership, file metadata, and duplicate fulfillment. Return `404` for an unknown case/request, `403` for another user’s case, `409` when a request is already fulfilled, and `422` for invalid metadata.

## Case Details page

`GET /api/v1/cases/{case_id}/details` (authenticated case owner)

This endpoint drives `/cases/{case_id}/details` and should return the case header, every active questionnaire answer, and a structured report suitable for presentation and PDF generation:
```json
{
  "case": {
    "id": "<case_uuid>",
    "caseNumber": "NCRP-2026-000001",
    "category": "financial_fraud",
    "status": "UNDER_REVIEW",
    "submittedAt": "<ISO-8601>"
  },
  "answers": {
    "incident_type": "financial_fraud",
    "financial_method": "upi",
    "transaction_amount": 45000,
    "incident_description": "<citizen answer>"
  },
  "structuredReport": {
    "title": "Cybercrime complaint report",
    "sections": [
      {
        "id": "incident",
        "title": "Incident details",
        "items": [
          { "label": "Incident type", "value": "Financial fraud" },
          { "label": "Transaction amount", "value": "₹45,000" }
        ]
      }
    ]
  }
}
```

The frontend renders all keys in `answers` dynamically and does not assume a fixed V2 tree branch. `structuredReport.sections[].items[]` is the preferred generated-report format. Each item may contain a string, number, boolean, array, or nested object value; the UI formats those values safely without exposing internal storage data.

`GET /api/v1/cases/{case_id}/report.pdf` (authenticated case owner)

Response: `200 OK`, `Content-Type: application/pdf`, with `Content-Disposition: attachment; filename="NCRP-2026-000001.pdf"`.

The Download report PDF button calls this endpoint with the bearer token and downloads the binary response. The backend should generate the PDF from the same authoritative case data, include case ID/number, status, submitted timestamp, all active answers, structured report sections, and evidence summary, and return `404` for an unknown case or `403` when the case is not owned by the current user. Do not return internal `storagePath` values in the citizen-facing PDF.

## Case timeline and messages

`GET /api/v1/cases/{case_id}/timeline` returns detailed citizen-safe events:
```json
{ "events": [{ "id": "<uuid>", "type": "EVIDENCE_REQUESTED", "title": "Evidence requested", "description": "The investigating unit requested your original bank statement.", "stage": "INVESTIGATION", "actor": "Cyber Crime Unit", "approvedBy": null, "forwardedBy": null, "evidenceRequestId": "<request_uuid or null>", "createdAt": "<ISO-8601>" }] }
```

`GET /api/v1/cases/{case_id}/messages` returns `{ "messages": [{ "id": "<uuid>", "type": "CASE_UPDATE", "title": "Your complaint has been assigned", "message": "The investigating unit is reviewing your complaint.", "sender": "Cyber Crime Unit", "createdAt": "<ISO-8601>" }] }`. Timeline events should be ordered oldest-first; messages may include assignment, evidence, resolution, and other citizen-safe case updates. Internal notes must not be exposed.

The local admin preview assumes:

- `POST /api/v1/admin/cases/{case_id}/timeline` with `{ "type": "EVIDENCE_REQUESTED", "title": "Evidence requested", "description": "<text>", "stage": "INVESTIGATION", "actor": "Cyber Crime Unit", "approvedBy": null, "forwardedBy": null, "evidenceRequestId": "<uuid or null>" }`; return the created timeline event with `id` and `createdAt`.
- `POST /api/v1/admin/cases/{case_id}/messages` with `{ "type": "CASE_UPDATE", "title": "<title>", "message": "<citizen-safe message>" }`; return the created message with `id`, `sender`, and `createdAt`.

Both endpoints must validate the case and fields, persist durable records, and return `404` for an unknown case or `422` for invalid input. Timeline evidence references must belong to the same case. Add admin authentication/authorization before production; the current admin preview intentionally uses no credentials.

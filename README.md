# EKTiQ
Electrical procurement assistant for the EKT hackathon case.

## Run locally
Requires Node.js 22+ and npm. Install dependencies with `npm ci` separately in `backend` and `frontend`.
Copy `backend/.env.example` to `backend/.env`, and fill in the EKT API credentials.
For conversational AI, also set `OPENAI_API_KEY` and `OPENAI_MODEL` to a model available to your account supporting Responses structured outputs. Keep credentials on the backend; never use a VITE variable for secrets.

From `backend`: `npm run sync:catalog` when a catalog snapshot is needed, then `npm run dev` (port 3001).
From `frontend`: `npm run dev` (port 5173). Optional `VITE_API_URL` overrides the backend URL.

## Architecture and data
React UI → Express API → local EKT catalog index for candidate search → authenticated EKT detail API for prices, stock and specifications.
The assistant first produces a structured intent using recent conversation history. Deterministic code retrieves products and evaluates constraints. A second model request explains that evidence. AI requests disable response storage. Dialogues remain in process memory for 30 minutes (20 turns; at most 1000 conversations).
Without AI configuration the UI explicitly shows limited catalog mode. This mode handles basic product parameters and commands, not unrestricted conversation.
Product detail requests have a 10-second timeout, 30-second bounded cache and concurrency limit. Unknown prices/stock remain unknown; conflicting specification and description values remain visible.

## Product comparison
Select products from the catalog or assistant. /compare displays up to four products with specification differences, stock by warehouse, available certificates, source links, data timestamps and conflicting facts. “Only differences” reduces the table; refresh fetches fresh data.
The cart confirmation fetches fresh price/stock. Changed data requires another explicit confirmation. Chat messages cannot mutate the cart.

## Checks
Backend: `npm run typecheck`, `npm test`.
Frontend: `npm run build`, `npm run lint`.
Tests use fixtures for EKT; they do not verify a live AI account.

## Prototype boundaries
Cart, favorites and comparison are browser-memory state; no EKT checkout/order API is connected. A cart check is a snapshot, not a stock reservation. Production needs authenticated sessions, durable storage and a server-authoritative checkout.
Photo/document parsing and profile functionality are not implemented. Payment, delivery and minimum-order policies require verified partner data. Candidate suggestions do not certify electrical interchangeability. AI-generated explanations can be wrong; inspect the visible source facts before purchase.
Production deployment also needs an access-controlled AI endpoint, distributed rate limiting and monitoring; the current process-local limits are for a prototype.

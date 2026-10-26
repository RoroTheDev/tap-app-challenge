# TAP — senior orchestration companion

TAP helps older adults turn everyday goals into clear, supported plans. The
first product slice is a welcoming registration and onboarding flow that gives
the future conductor enough context to personalize suggestions without sending
raw private data to an AI model.

Live app: <https://congressapp-849ff.web.app>

## What works now

- Responsive public landing page with large controls, readable contrast, and keyboard-friendly sign-in
- Firebase Google sign-in and email/password registration
- Five-step onboarding for language, phone, general location, mobility,
  transportation, walking comfort, travel-time limits, plan detail, interests,
  schedule, accessibility, and trusted contacts
- A personalized main hub that follows the member's saved language
- Typed requests, browser speech recognition, quick starts, OpenAI structured
  intent tags, Google Places/Routes adapters, and ranked fallback options
- A dedicated, resumable planning-session page with visible conductor stages
  and an executable Plan A → contact checkpoint → Plan B → Plan C decision tree
- Data-driven feature definitions so shopping, activities, appointments, social
  plans, errands, and future discovery tools share one orchestration engine
- Live Activity Finder results from Ticketmaster combined with curated Fremont
  Age Well programs, official registration links, cost/date labels,
  accessibility disclosure, route feasibility, and senior-profile ranking
- Source provenance and freshness labels for live and curated activity data
- Owner-only, 24-hour planning sessions that preserve conductor progress,
  results, contact outcomes, and the selected fallback branch
- Public plain-language Privacy Policy and Terms pages with a non-emergency
  warning and disclosures for every current third-party provider
- Explicit trusted-contact confirmation, WhatsApp delivery, signed inbound
  webhook validation, bounded YES/NO waiting, and Uber handoff after a decline
  or timeout
- Clear consent controls and optional fields for sensitive details
- In-browser onboarding draft recovery and a profile-data deletion control
- Safe migration for older/partial profiles and a visible crash-recovery screen
- Owner-only Firestore profile and trusted-contact storage
- Browser-local preview mode when Firebase variables are absent
- A `toPlannerProfile` boundary that removes exact addresses, phone numbers,
  contact names, and emails before OpenAI requests

Voice recognition uses the browser's built-in speech service when available and
sets its locale from the preferred language selected during onboarding. Typing
always remains available as the fallback.

## Repository

```text
apps/web               React + Vite + TypeScript frontend
apps/api               Express + Firebase Functions TypeScript conductor
packages/shared        Shared profile and planner-safe types
firestore.rules        Prototype owner-only Firestore rules
firebase.json          Firestore and Hosting configuration
```

## Run locally

Requirements: Node.js 22 or newer and npm.

```bash
npm install
npm run dev:web
```

Create `apps/web/.env.local` with only the `VITE_FIREBASE_*` values from
`.env.example`. The checked-in example also documents the separate server
variables; place those in `apps/api/.env.local`.

Activity Finder uses `TICKETMASTER_API_KEY` only on the server. The public
Ticketmaster Discovery key is stored as a Firebase function secret in production
and must never be added to frontend variables or committed files.

Set `VITE_UBER_CLIENT_ID` to the public Client ID from an Uber developer app to
turn the Plan B button into a universal link with current-location pickup and
the selected TAP destination prefilled. Never place an Uber Client Secret in a
`VITE_` variable.

Open `http://localhost:5173`.

In a second terminal, start the conductor API:

```bash
npm run dev --workspace apps/api
```

Vite forwards `/api` requests to `http://localhost:3001`. The conductor verifies
Firebase ID tokens, reloads the signed-in user's profile on the server, sends
only the privacy-minimized planner profile to OpenAI, and runs Places, Routes,
trusted-contact preparation, and fallback preparation concurrently. Missing
service credentials use clearly labeled mock adapters rather than stopping the
workflow.

If the `VITE_FIREBASE_*` values are blank, TAP automatically uses preview mode
and stores the sample profile only in that browser. The real project web config
can be retrieved with:

```bash
npx -y firebase-tools@latest apps:list --project congressapp-849ff
npx -y firebase-tools@latest apps:sdkconfig web <app-id> --project congressapp-849ff
```

Firebase web configuration identifies the Firebase project; it is not a server
secret. Private API credentials such as OpenAI, Twilio, or Firebase Admin keys
must never use a `VITE_` prefix or be placed in frontend code.

## Enable registration in Firebase

In the [Firebase console](https://console.firebase.google.com/project/congressapp-849ff/authentication/providers):

1. Open **Authentication → Sign-in method**.
2. Enable **Email/Password**.
3. Enable **Google**, choose the project support email, and save.
4. Under **Authentication → Settings → Authorized domains**, ensure
   `localhost` is present for local development. Add the production hostname
   before launch (hostname only—no protocol or port).

The frontend is already registered as the Firebase web app
`tap-app-challenge`. Do not create a duplicate web app.

## Firestore data model

- `users/{uid}` — private onboarding profile
- `users/{uid}/trustedContacts/{contactId}` — private trusted contacts
- `coordinationRequests/{requestId}` — server-only confirmation state
- `coordinationByContact/{phoneHash}` — server-only current-request lookup
- `users/{uid}/planningSessions/{sessionId}` — server-only 24-hour conductor state

The two user paths require Firebase Authentication and may be read or changed only by
the matching account UID. The rules validate allowed fields, types, sizes,
enumerated values, contact permission, timestamps, and immutable ownership.
The current profile schema is version 2; complete version 1 writes remain
temporarily accepted so already-open clients can finish during rollout.

The coordination collections are denied to browser clients by the catch-all
rule. Only the authenticated conductor function uses them through Firebase
Admin. Phone numbers are hashed in the lookup collection, duplicate replies are
idempotent, and a new request terminates an older pending request for the same
contact.

The current Standard Firestore database has delete protection and point-in-time
recovery disabled. Decide whether to enable those operational recovery features
before a broad launch, since availability and cost depend on the Firebase plan.

Validate rules without changing production:

```bash
npx -y firebase-tools@latest deploy --only firestore:rules --project congressapp-849ff --dry-run
```

Deploy them after review:

```bash
npx -y firebase-tools@latest deploy --only firestore:rules --project congressapp-849ff
```

## Quality checks

```bash
npm run typecheck
npm test
npm run build
npm audit
```

## Privacy boundary for the conductor

The full Firestore profile is not a model prompt. `toPlannerProfile` creates a
minimal planning context containing a first name, approximate age, city/state,
language, mobility, transportation preferences, interests, preferred times,
whether accessibility support was requested, and whether an approved trusted
contact exists. It omits:

- Street address and ZIP code
- User and trusted-contact phone numbers
- User and trusted-contact emails
- Trusted-contact names and relationships
- Free-text accessibility notes

Any future action such as sending a message, sharing location, making a booking,
or spending money should require a separate server-side policy check and clear
user confirmation.

## Environment variables

Copy `.env.example`; never commit `.env` or `.env.local` files. Only Firebase
web values belong in `apps/web/.env.local`. Keep OpenAI, Twilio, and Maps
credentials server-side in `apps/api/.env.local` for local work. The API uses
Application Default Credentials locally and the Firebase Functions service
account after deployment, so a committed service-account file is not required.

For deployed Firebase Functions, store private values in Secret Manager:

```bash
npx firebase-tools functions:secrets:set OPENAI_API_KEY --project congressapp-849ff
npx firebase-tools functions:secrets:set GOOGLE_MAPS_API_KEY --project congressapp-849ff
npx firebase-tools functions:secrets:set TWILIO_ACCOUNT_SID --project congressapp-849ff
npx firebase-tools functions:secrets:set TWILIO_AUTH_TOKEN --project congressapp-849ff
npx firebase-tools deploy --only functions:tap-api,hosting --project congressapp-849ff
```

For the WhatsApp Sandbox, configure the server with:

```env
TWILIO_CHANNEL=whatsapp
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
TWILIO_WEBHOOK_URL=https://congressapp-849ff.web.app/api/twilio/incoming
```

In Twilio Sandbox settings, set **When a message comes in** to the same webhook
URL using `POST`. The trusted contact must join the Sandbox, and should send a
message shortly before a demo so the WhatsApp customer-service window is open.

The Google Maps credential must have **Places API (New)** and **Routes API**
enabled. Restrict it to those APIs and to the backend's server identity or IP
rules where practical. The Firebase web API key already used by the frontend is
a different credential and cannot substitute for the Maps Platform key.

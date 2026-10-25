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
  transportation, interests, schedule, accessibility, and trusted contacts
- A personalized main hub that follows the member's saved language
- Typed requests, browser speech recognition, quick starts, ranked action tags,
  trusted-contact permission checks, and a visible fallback step
- Clear consent controls and optional fields for sensitive details
- In-browser onboarding draft recovery and a profile-data deletion control
- Owner-only Firestore profile and trusted-contact storage
- Browser-local preview mode when Firebase variables are absent
- A `toPlannerProfile` boundary that removes exact addresses, phone numbers,
  contact names, and emails before future OpenAI requests

Voice recognition uses the browser's built-in speech service when available and
sets its locale from the preferred language selected during onboarding. Typing
always remains available as the fallback.

## Repository

```text
apps/web               React + Vite + TypeScript frontend
packages/shared        Shared profile and planner-safe types
firestore.rules        Prototype owner-only Firestore rules
firebase.json          Firestore and Hosting configuration
```

## Run locally

Requirements: Node.js 22 or newer and npm.

```bash
npm install
cp .env.example apps/web/.env.local
npm run dev:web
```

Open `http://localhost:5173`.

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

Both paths require Firebase Authentication and may be read or changed only by
the matching account UID. The rules validate allowed fields, types, sizes,
enumerated values, contact permission, timestamps, and immutable ownership.

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
web values belong in `apps/web/.env.local`. Keep OpenAI, Twilio, Maps, and
Firebase Admin credentials server-side when the API workspace is added.

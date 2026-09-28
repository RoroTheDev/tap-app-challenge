# TAP App Challenge

Voice-first orchestration platform for immigrant seniors.

## Product thesis

Older adults already have access to many powerful services for transportation, local activities, social connection, assistance, learning, and family coordination. The problem is that these services are fragmented and often require strong English and digital literacy.

TAP acts as the **conductor**: the senior states an outcome in plain language, and the system decides which tools and services should be combined to accomplish it.

## MVP flows

1. **I want something to do**
   - understand intent
   - find activities
   - rank against senior preferences
   - check transportation feasibility
   - schedule

2. **I need help**
   - classify the need
   - route to the appropriate service/resource
   - give one simple next action

3. **I want to see people**
   - discover a relevant community opportunity
   - apply language / mobility / time constraints
   - coordinate attendance

## Architecture

```
Senior (voice/text)
        |
        v
Input + language layer
        |
        v
Intent / task parser
        |
        v
Orchestrator
  |       |       |
Activities Routes Assistance
  |       |       |
        Adapters
        |
        v
Constraint + ranking engine
        |
        v
Action plan
  |       |       |
Senior  Family  Calendar
```

## Repository

- `apps/web` — React/Vite senior + family UI
- `apps/api` — Express orchestration backend
- `packages/shared` — shared TypeScript contracts
- `docs` — product and architecture documentation

## Security

Never commit API keys or Firebase service-account credentials. Copy `.env.example` to local environment files and keep secrets server-side.

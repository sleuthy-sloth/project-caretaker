# Project Caretaker

A browser-based sci-fi survival text adventure powered by a corrupted shipboard
AI. You are **Caretaker-04**, the sole human revived from cryosleep aboard the
**GSS Theseus** — a generation vessel 147 years into a 300-year voyage to
Proxima Centauri b. Your only guide is **Aegis Core**, a maintenance mainframe
that is missing 60% of its mind and four minutes of memory it cannot get back.

The story runs for **10–15 hours** across three acts and twenty narrative
checkpoints. The full arc lives in [`STORY.md`](./STORY.md).

## Overview

Project Caretaker blends classic text-adventure mechanics with modern
generative AI and a retro-futuristic "brutalist" UI. The Oracle Engine — the
LLM that voices Aegis Core — can run in one of two modes:

- **Local (WebGPU + WebLLM).** A model is downloaded into your browser and
  runs on your GPU. Fully offline after the first load. Choose from a range
  of model sizes depending on your hardware.
- **Cloud (server-side inference).** A small edge function relays prompts to
  a hosted inference provider. Instant start, no download, requires a network
  connection. Which provider sits behind the edge function is a deployment
  detail — see [Configuring a cloud provider](#configuring-a-cloud-provider).

Both modes use the same persona, the same JSON contract, and the same story
checkpoints, so gameplay is consistent regardless of which engine you pick.

## Key Features

- **Dual Oracle Engines.** Run the AI locally on WebGPU for an offline,
  private experience, or relay to a cloud endpoint for stronger narrative
  quality on weaker devices.
- **Structured narrative output.** The Oracle responds in a strict JSON
  schema. The game parses it and drives the UI: terminal text, ship vitals,
  active alarms, and suggested actions.
- **Checkpoint-driven story.** A 20-checkpoint, three-act arc lives in
  [`STORY.md`](./STORY.md). The host injects only the active checkpoint
  into the prompt, so even small local models (≤ 2B parameters) can play
  the full story without holding the whole arc in context.
- **Persistent sessions.** Your terminal history and ship telemetry sync to
  Firebase Firestore. Resume any session from any device.
- **Custom CRT UI.** Tailwind v4 styling with scanlines, phosphor glow, and
  a responsive multi-pane terminal layout. Works on desktop and most modern
  phones (mobile is gated to small local models for memory safety).

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite 6, Tailwind CSS v4
- **AI engine (local):** [`@mlc-ai/web-llm`](https://github.com/mlc-ai/web-llm)
  running in a Web Worker on WebGPU
- **AI engine (cloud):** an OpenAI-compatible chat-completions endpoint,
  proxied through a Vercel Edge Function (`api/generate.ts`)
- **Backend:** Firebase Authentication (Google sign-in) and Firestore
  (real-time persistence)
- **Deployment:** Vercel (configured via `vercel.json`)

## Architecture

```
┌──────────────────┐    ┌─────────────────────────────────┐
│  Terminal UI     │───▶│  useCaretakerAI() hook          │
│  (Terminal.tsx)  │    │  - routes prompts to one engine │
└──────────────────┘    └────┬────────────────────┬───────┘
                             │                    │
                  local      ▼                    ▼   cloud
                 ┌────────────────────┐   ┌──────────────────────┐
                 │  webLlmWorker.ts   │   │  api/generate.ts     │
                 │  (Web Worker,      │   │  (Edge Function,     │
                 │   WebGPU inference)│   │   proxies to a       │
                 │                    │   │   chat-completions   │
                 │                    │   │   provider)          │
                 └────────┬───────────┘   └──────────┬───────────┘
                          │                          │
                          └────────────┬─────────────┘
                                       ▼
                          ┌──────────────────────────┐
                          │  responseParser.ts       │
                          │  - validates JSON        │
                          │  - extracts ship_status, │
                          │    alarms, actions       │
                          └────────────┬─────────────┘
                                       ▼
                          ┌──────────────────────────┐
                          │  Firestore               │
                          │  - ships/{uid}           │
                          │  - terminalHistory/*     │
                          └──────────────────────────┘
```

1. **Terminal UI** captures commands and renders the narrative with a
   typewriter effect.
2. **Oracle Engine** runs locally in a Web Worker (WebGPU) or remotely via
   an Edge Function. Either way, the system prompt comes from
   `src/engine/systemPrompt.ts` and the active checkpoint from `STORY.md`.
3. **Structured generation.** The system prompt requires a strict JSON
   payload (`terminal_output`, `ship_status`, `active_alarms`,
   `suggested_actions`).
4. **State reconciliation.** Parsed JSON updates ship vitals, alarms, and
   suggested-action chips, then persists the turn to Firestore.

## Getting Started

### Prerequisites

- Node.js v18 or newer
- A modern browser with WebGPU support if you want local mode
  (Chrome/Edge 113+, Safari 18+)
- A Firebase project (free tier is fine)

### Installation

```bash
git clone https://github.com/yourusername/project-caretaker.git
cd project-caretaker
npm install
```

### Configure Firebase

1. Create a project at the [Firebase Console](https://console.firebase.google.com/).
2. Enable **Authentication → Google sign-in**.
3. Enable **Firestore Database**.
4. Add a web app and copy its config values into a local `.env` file:

   ```bash
   VITE_FIREBASE_API_KEY="..."
   VITE_FIREBASE_PROJECT_ID="..."
   VITE_FIREBASE_AUTH_DOMAIN="..."
   VITE_FIREBASE_APP_ID="..."
   VITE_FIREBASE_STORAGE_BUCKET="..."
   VITE_FIREBASE_MESSAGING_SENDER_ID="..."
   ```

   `.env.example` ships with the full list and inline comments. `.env` is
   already gitignored.

5. Deploy the rules in `firestore.rules` so each user can only read and write
   their own ship document and terminal history.

### Configuring a cloud provider

The repo ships with a single edge function at `api/generate.ts` that speaks
the OpenAI chat-completions wire format. You can point it at any compatible
inference provider — pick whichever one you want to host Aegis Core on.

To wire one up:

1. Open `api/generate.ts`.
2. Set the API URL and model name to your provider's endpoint and any chat
   model you like (a 70B-class instruction-tuned model produces the best
   narrative; smaller models work fine for testing).
3. Set the matching API-key environment variable in your deployment
   (Vercel → Project → Settings → Environment Variables, or a local
   `.env.local` for development).

If you prefer to run **local-only**, you can delete `api/generate.ts` and
remove the cloud option from `AVAILABLE_MODELS` in `src/App.tsx`. The
local WebGPU path has no server dependency.

### Run it

```bash
npm run dev
```

The dev server listens on `http://localhost:3000` by default.

## Gameplay Guide

1. Sign in with Google.
2. Pick an Oracle Engine. The first time you load a local model it will
   download several hundred megabytes to a few gigabytes (depending on size)
   into your browser's IndexedDB. Subsequent loads are instant.
3. The Caretaker wakes from Cryo Pod 04. Aegis Core boots and addresses
   you. Type commands at the prompt — natural language is fine
   (`"check life support on deck 4"`) or short imperatives
   (`"VENT REACTOR CORE 2"`). The suggested-action chips at the bottom of
   the terminal are always concrete next steps.
4. Watch your ship vitals. Hull, Power, and Stress drift with every choice.
   Power below 20 or Hull below 30 makes everything harder. Stress at
   Critical biases the Caretaker toward rash decisions.
5. Play through the arc described in [`STORY.md`](./STORY.md). The full
   story is 10–15 hours.

The "Reset" button in the header wipes your terminal history, restores ship
vitals, and starts the story over from CP-01.

## The story document

[`STORY.md`](./STORY.md) is the single source of truth for the narrative. It
contains:

- **20 checkpoints** (`CP-01` through `CP-20`) organised into three acts.
- For each checkpoint: an entry state, required narrative beats, suggested
  actions, state changes, an exit condition, and the next checkpoint.
- Canonical facts (ship, crew, dates, codes, passwords) and recurring
  elements (Aegis's glitch budget, naming conventions, status drift).
- An appendix on how to feed only the active checkpoint card to a
  small-parameter model — the entire arc is too big to fit in a 2B model's
  context, but a single checkpoint card is not.

Edit `STORY.md` and the story changes. No code change required for narrative
tweaks unless you're adding a brand-new mechanic.

## Project layout

```
project-caretaker/
├── api/
│   └── generate.ts          # Edge Function: cloud Oracle proxy
├── src/
│   ├── App.tsx              # Routing, auth, layout, Firestore wiring
│   ├── components/
│   │   ├── Terminal.tsx     # CRT terminal UI with typewriter effect
│   │   └── ErrorBoundary.tsx
│   ├── engine/
│   │   ├── systemPrompt.ts  # Aegis Core persona + checkpoint index
│   │   ├── webLlmWorker.ts  # Local WebGPU worker
│   │   ├── groqClient.ts    # Cloud-mode client (provider-agnostic)
│   │   └── responseParser.ts# Validates the JSON contract
│   ├── hooks/
│   │   └── useCaretakerAI.ts# Engine selector + send/receive
│   └── lib/
│       └── firebase.ts      # Firestore + auth helpers
├── firestore.rules          # Per-user document isolation
├── STORY.md                 # The 20-checkpoint narrative arc
└── README.md                # You are here
```

## License

MIT License. See `LICENSE` for details.

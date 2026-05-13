# Project Caretaker

A browser-based sci-fi survival text adventure powered by local WebGPU AI. You are the sole human awoken from cryosleep on a failing deep-space generation ship. Your only guide is Aegis Core—a corrupted, maintenance-focused AI mainframe.

## Overview

Project Caretaker blends classic text-adventure mechanics with modern generative AI and a distinct retro-futuristic "brutalist" UI. Instead of relying on cloud-based LLM APIs, the game runs the Aegis Core AI entirely locally in your browser using WebGPU and WebLLM.

## Key Features

- **Local AI Inference (WebGPU):** Aegis Core runs directly on your device's GPU using `@mlc-ai/web-llm`. Choose between lightweight models (e.g., Gemma 2B) or heavier, more narrative-rich models (e.g., Llama-3 8B) depending on your hardware.
- **Dynamic State Management:** The AI responds in a strict JSON format, which the game parses to dynamically update the ship's telemetry (Power Matrix, Hull Integrity, Crew Stress).
- **Persistent Gameplay:** Your session, ship vitals, and terminal history are securely synced and saved in real-time using Firebase Firestore.
- **Immersive GUI:** A fully custom Tailwind CSS UI featuring CRT scanlines, phosphor glow effects, and a responsive multi-pane terminal layout.

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4
- **AI Engine:** WebLLM (`@mlc-ai/web-llm`)
- **Backend & Auth:** Firebase (Authentication, Firestore)

## Architecture

1. **Terminal UI:** Captures user commands and displays the narrative with a custom typewriter effect.
2. **Oracle Engine (Web Worker):** Offloads the ML model execution to a background Web Worker so the UI thread remains completely fluid.
3. **Structured Generation:** The system prompt forces the LLM to output a precise JSON structure.
4. **State Reconciliation:** The parsed JSON extracts the `terminal_output` for the user to read, and applies the `ship_status` data to the interactive gauges.

## Getting Started

### Prerequisites

- Node.js (v18+)
- A modern web browser with WebGPU support (Chrome/Edge 113+, Safari 18+).
- A Firebase project.

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/project-caretaker.git
   cd project-caretaker
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Firebase:
   - Create a new project in the [Firebase Console](https://console.firebase.google.com/).
   - Enable **Firestore Database** and **Google Authentication**.
   - Create a web app in your Firebase project to get the configuration object.
   - You will need to replace the `firebase-applet-config.json` (or securely load via `.env`) with your Firebase config parameters.
   
4. Set up Firestore Rules:
   Deploy the security properties listed in `firestore.rules` to your Firebase project to secure user terminal histories.

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Open your browser and navigate to `http://localhost:3000` (or the port specified by Vite).

## Gameplay Guide

Upon launching the game, you will be prompted to log in and select an Oracle Engine (the local LLM). The game will download the model weights (this may take a few minutes on the first run, but is cached in your browser's IndexedDB for future loads).

Once initialized, type natural language commands into the terminal (e.g., "Check life support systems on deck 4" or "Reroute auxiliary power to the structural integrity field"). Aegis Core will evaluate your actions, describe the outcome, and apply consequences to the ship's telemetry.

## License

MIT License. See `LICENSE` for more information.

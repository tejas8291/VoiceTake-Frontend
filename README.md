# VoiceTake Frontend

React and TypeScript web interface for VoiceTake Studio, built with Vite.

The interface includes project drafts, Hindi voice comparison, language and voice selection, compact script cards, line previews, pause controls, narration generation, audio playback, and downloads.

## Setup

Use Node.js 22 or later.

```sh
git clone https://github.com/tejas8291/VoiceTake-Frontend.git
cd VoiceTake-Frontend
npm ci
npm run dev
```

Open http://127.0.0.1:5173/studio on the computer running the app.

Start the companion FastAPI backend on 127.0.0.1:8000. Vite forwards relative /api requests to that server. Backend setup is documented in the companion repository.

## Project structure

```text
src/             Studio, voice picker, profiles, projects and styles
src/assets/      UI image and rendering animation
index.html       Browser entry point
vite.config.ts   Local host, port and API proxy
package.json     Frontend dependencies and commands
```

## Checks

```sh
npm run check
npm run build
```

GitHub Actions runs the production build, including TypeScript checks.

## Security and local data

Keep provider keys in the backend's environment configuration. Browser code and frontend environment values are visible to users. This repository contains an interface and has no provider credentials.

Draft scripts and project selections are stored in browser local storage. Stored takes and voice profiles are managed by the backend. Development URLs bind to loopback on your own computer. A public deployment needs HTTPS, authentication and protected API access.

## Branches

Use main for the baseline and develop for ongoing work. Create feature/<description> or fix/<description> branches for subsequent changes.

The companion backend is available in the VoiceTake-Backend repository.

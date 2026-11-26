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
npm run test:script
npm run build
```

GitHub Actions runs script-import checks and the production build, including TypeScript checks.

## Script import and local voices

During generation, the Studio displays backend-reported completed-line counts,
the current line, and the audio/subtitle assembly stage. This is work progress,
not a time estimate. Retakes count only the regenerated line, while other lines
are reused. Older APIs without progress metadata retain a generic loading label.

The bottom player shows playback activity for both the selected take and previous
take comparison. Sound bars animate only during playback and stop on pause/end;
buffering and errors have separate labels. These bars indicate playback, not
measured loudness. Reduced-motion preferences disable the animation. Native
audio controls and WAV/MP3/SRT exports remain available.

The Studio label is Local voice engine when the backend uses local synthesis.
Kokoro remains the Hindi engine when its assets are installed; this label does
not change providers or narration settings.

Paste a script to see its spoken character count and proposed line count before
replacing the current draft. Long paragraphs split at sentence or whitespace
boundaries, preserving narration/dialogue order. Hindi words are not cut apart.
An oversized word is kept intact and reported for manual correction.

The current API accepts up to 1600 spoken characters, 24 lines, and 500 characters
per line. Over-limit imports are blocked with specific errors. Pasted input is
not silently truncated. The existing draft is preserved until a valid import is
confirmed. The paste field itself is temporary; import valid text to save it as
a project draft, or keep a separate copy before reloading or leaving the page.

## Security and local data

Keep provider keys in the backend's environment configuration. Browser code and frontend environment values are visible to users. This repository contains an interface and has no provider credentials.

Draft scripts and project selections are stored in browser local storage. Stored takes and voice profiles are managed by the backend. Development URLs bind to loopback on your own computer. A public deployment needs HTTPS, authentication and protected API access.

## Branches

Use main for the baseline and develop for ongoing work. Create feature/<description> or fix/<description> branches for subsequent changes.

The companion backend is available in the VoiceTake-Backend repository.

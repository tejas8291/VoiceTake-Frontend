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

Start the companion FastAPI backend on 127.0.0.1:8000. Vite forwards relative /api requests to that server. Backend setup is documented in [VoiceTake-Backend](https://github.com/tejas8291/VoiceTake-Backend).

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

Use `main` for the latest tested stable code. Preserve feature/fix branches as checkpoints; start subsequent work from current `main`. Create feature/<description> or fix/<description> branches for subsequent changes.

The companion backend is available in the VoiceTake-Backend repository.

## Ownership and credits

This is a source-visible portfolio project, not an open-source release. No general reuse license is granted for original VoiceTake code. See [COPYRIGHT.md](COPYRIGHT.md) and [third-party notices](THIRD_PARTY_NOTICES.md). GitHub public-repository viewing/forking rights still apply. Repository visibility is managed separately.

Built with AI assistance from Codex: requirements, integration, testing and iteration are part of this project; Kokoro is an existing third-party model.

## Architecture and limits

Browser React/TypeScript → Vite `/api` development proxy → FastAPI → local synthesis/audio processing → SQLite and local audio files. The frontend and backend are separate repositories and processes. Drafts live in this browser; cloning Git does not transfer drafts, takes, model weights or private recordings.

Hindi uses installed Kokoro voices. Pronunciation dictionaries, per-line speed and silence controls help delivery; presets do not provide true emotion prompting. Naturalness and pronunciation still depend on the model and source text. Voice-profile upload does not mean the local Kokoro engine supports voice cloning. The API currently limits scripts to 1,600 spoken characters and 24 lines.

On Windows PowerShell, use the same frontend commands above. Start the backend in a second terminal using its Windows instructions. Node.js/Python must be available in the terminal PATH. A fresh Windows installation and physical iPhone Safari have not yet been verified.

## Release readiness

The legacy microphone artwork was matched to its original AI-generated project image; see the frontend asset provenance record. Linux and Windows CI cover builds/API regression tests. Physical Windows laptop setup with Kokoro assets and iPhone Safari checks remain pending.

## Playback recovery

The player shows loading feedback from native media events. If a take cannot load, Reload audio retries the same media URL without regenerating narration or changing the draft. Playback stays user initiated. The loading indicator respects reduced-motion preferences. A missing or inaccessible audio file still requires restoring the local file or resolving the API error; reload cannot recreate deleted audio.

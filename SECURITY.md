# Security and private data

Store provider keys only in the backend environment file or a server-side secret store. Commit the backend environment file.example with empty credential values.

Check both the staged changes and commit history before sharing the repository. Git exclusions apply to untracked files. A previously committed secret remains in history until it is removed, and exposed credentials require revocation or rotation.

Local data lives under the backend .voice-take/ directory. It includes SQLite storage, generated narration, uploaded samples, pronunciation entries and model files. Browser local storage holds drafts and project selections. Protect these locations when sharing a computer or making backups.

The supplied development servers bind to 127.0.0.1. Local HTTP URLs are development addresses. A public deployment needs HTTPS, user authentication, per-user access checks, upload restrictions, and protected storage.

Use voice recordings with the speaker's permission. Enabling the hosted provider sends text and voice uploads to that provider. Review its account configuration before using real recordings.

If reporting a vulnerability, contact the repository owner privately. Omit tokens, voice recordings, project databases and personal scripts from public issue reports.

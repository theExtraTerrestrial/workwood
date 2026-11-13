# Workwood

A desktop app for running and overseeing several Claude Code sessions at once,
grouped by Claudius profile.

## Run it

```bash
cd ~/workspace/workwood
npm start         # the Workwood window (Electron, shown on Windows through WSL)
npm run edge      # alternative: the same app in a Microsoft Edge app window
```

Keep the terminal open while you use the app; closing it or pressing Ctrl+C quits.
The terminal prints a few "Failed to connect to the bus" lines at start-up under
WSL; they are harmless.

On a fresh WSL install the Electron window needs GTK once:
`sudo apt install libgtk-3-0`.

## What works in this first version

- The sidebar lists every session in the shared Claude Code history, grouped by
  the Claudius profile that last ran it, with each profile's 5-hour usage.
- Live status: sessions working or waiting in this app, and sessions running in
  any terminal (these carry a terminal badge, and are locked while busy).
- Open a session to read its conversation. Very long ones show the recent part.
- Start a new session: pick a project and a profile, type, send.
- Send follow-up messages, stop a turn, pick a model and effort per message.
- Cards for questions, permissions and plans, and for a turn that stopped on a
  limit, a lost sign-in or an error (with "continue on another profile").
- Open the session's folder in VS Code. Dark and light theme (gear, bottom left).

Not built yet: terminal view, previews, changes view, skills menu and panel,
attachments, voice, session actions (rename, archive, delete), settings dialog,
sign-in from the app, the Windows-side project list, the Mac build.

## Tests

```bash
npm test
```

About 15 seconds, 31 tests. They run the real service and the real `claudius`
inside a throwaway home folder (the same idea as Claudius's own tests), with a
scripted stand-in for `claude` (`tests/fake-claude.mjs`). No real account is
used and nothing is sent to Anthropic. Half of the tests drive the window with
real clicks in a headless Chromium; they are skipped with a note if none is
found (`npx playwright install chromium-headless-shell`, or set `WORKWOOD_CHROME`).
The last test checks that nothing leaked out of the sandbox.

## How it is put together

- `service/` is a small local web server (Node). It reads profiles and sessions
  through `claudius` and `claude agents --json`, and runs turns with the Claude
  Agent SDK. It listens on this machine only, and every request needs the random
  token made at start-up.
- `ui/` is the window's page: plain HTML, CSS and JavaScript, no build step.
- `shell/main.cjs` is the Electron window; `shell/edge.mjs` is the Edge launcher.
- `design/mockup.html` is the interactive mockup the app is built to. The other
  files in `design/` are the comparison pages the design was chosen from.

Permission prompts follow your own Claude Code settings. With
`"defaultMode": "auto"` you will rarely see a permission card.

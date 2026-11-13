# Workwood

A desktop app for running and overseeing several Claude Code sessions at once,
grouped by Claudius profile.

## Run it

```bash
cd ~/workspace/workwood
npm start         # the Workwood window (Electron, shown on Windows through WSL)
npm run edge      # alternative: the same app in a Microsoft Edge app window
```

On Windows, run `npm run shortcut` once. It puts Workwood in the Start menu as
a native Windows window: the window program (Electron for Windows, downloaded
once into `%LOCALAPPDATA%\Workwood`) runs on Windows, and it starts the service
in WSL and stops it again when the window closes. The service's output goes to
`~/.cache/workwood/workwood.log`. Run `npm run shortcut` again after pulling
changes to the window program; `npm run shortcut -- --remove` takes it all away.
`npm start` still opens the Linux window through WSLg.

When started from a terminal: keep the terminal open while you use the app; closing it or pressing Ctrl+C quits.
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
- Send follow-up messages and stop a turn. The model and effort menus show what
  the session last ran on (read from its history, wherever it was run) and the
  next message uses the same unless you pick another; the choice is per session.
  A leading `*` marks your default, taken from your Claude Code settings (the
  project's settings win over the profile's).
  The context meter uses that model's window size.
- Cards for questions, permissions and plans, and for a turn that stopped on a
  limit, a lost sign-in or an error (with "continue on another profile").
- Previews: pages, images, videos and PDFs the agent wrote appear as cards under
  its reply. A card opens the file in a side panel, where you can step through
  everything the session made, go full width, or open it in your browser.
- Session actions, from the "…" on a session or a right-click:
  - Rename: saved in the session's history the way Claude Code's `/rename` does,
    so the name also shows in `claude --resume`.
  - Open in VS Code, and Open in terminal (resumes the session under its own
    profile in a new Windows Terminal tab; set `WORKWOOD_TERMINAL` to a command
    of your own, which is called with the folder and then the command to run).
  - Archive: hides the session in Workwood only (kept in
    `~/.config/workwood/state.json`). Gear, "Archived sessions" shows them again.
  - Delete: after a confirmation, removes the session's transcript and its
    subagents' transcripts from `~/.claude/projects`. This cannot be undone.
    A session that is working, or open in a terminal, cannot be deleted.
- Terminal view: the switch in the header (chat / terminal) shows the session's
  real Claude Code terminal inside the window. It keeps running while you look
  at other sessions. A session has one owner at a time: the terminal waits for
  a chat turn to end (or you stop it), and sending a message in the chat closes
  an idle terminal. Leaving Claude Code (`/exit`) returns you to the chat.
  Ctrl+Shift+C copies the selection.
- Changes view: the "±" button in the header (with the number of changed files)
  opens a read-only list of what differs from the project's last commit, new
  files included, and each file's diff. It shows only for projects that are git
  repositories, and updates as the agent works; the refresh button picks up
  changes made elsewhere.
- Skills: type "/" in the message box for the skills and commands this session
  has, filter by typing, and pick with Enter or Tab. The lightning button in the
  header lists them all by source (project, yours, plugin, built in); a click
  starts a message with one. The list is what Claude Code itself reports for the
  folder and profile; it is read without sending anything or creating a session.
- Attachments: the paperclip, a paste, or a drop onto the window adds files to
  the next message (up to 10, 20 MB each). Pictures are sent to the agent as
  pictures, and very large ones are scaled down first. A file that is already
  on disk is not copied: the message names its own path and the agent reads it
  from there (the Electron window only; Edge cannot tell where a file lives).
  Anything else, such as a pasted picture, is saved under
  `~/.cache/workwood/attachments`; copies are cleared after 30 days.
- Dictation: the mic button records, shows what it has heard so far while you
  speak, and puts the text in the message box after what you typed; nothing is
  sent until you press send. Escape discards the recording. Speech is turned
  into text on this machine by a Whisper model (about 240 MB, downloaded once on
  first use into `~/.cache/workwood/models`); no audio leaves it. English by
  default: pick another language in Settings; `WORKWOOD_STT_MODEL` names another model.
- Settings (gear, "All settings…"): theme, the profile new sessions start on,
  archived sessions, the dictation language, your profiles with their usage,
  the skills list, and versions.
- Sign in again from the app: Settings, Profiles, "Sign in again" runs
  `claudius relogin <profile>` in a terminal inside the dialog. A turn that
  stopped because a sign-in lapsed has the same button on its card.
- Dark and light theme (gear, bottom left).

Not built yet: projects that live on the Windows side, the Mac build.

## Tests

```bash
npm test
```

About 50 seconds, 63 tests. They run the real service and the real `claudius`
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
- Previews are served from a second local address with its own random key, so a
  page an agent made is a different site from the app and cannot reach it. It
  can load files from the session's project folder and from next to any file the
  session wrote; `.git` folders and `.env` files are refused.
- `ui/` is the window's page: plain HTML, CSS and JavaScript, no build step.
- `shell/main.cjs` is the Electron window; `shell/edge.mjs` is the Edge launcher.
- `design/mockup.html` is the interactive mockup the app is built to. The other
  files in `design/` are the comparison pages the design was chosen from.

Permission prompts follow your own Claude Code settings. With
`"defaultMode": "auto"` you will rarely see a permission card.

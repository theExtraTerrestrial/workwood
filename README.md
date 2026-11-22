# Workwood

A desktop app for running and overseeing several Claude Code sessions at once:
an inbox of the work that still needs something, across your Claude accounts.

## Install it

You need Node 22 or newer, git and Claude Code. Workwood is built on your own
machine, so there is no installer to download:

```bash
git clone https://github.com/theExtraTerrestrial/workwood
cd workwood
npm install
npm run install-app
```

- **macOS**: makes `~/Applications/Workwood.app`. Not yet tried on a Mac.
- **Linux**: adds Workwood to the app launcher. `npm install` builds one part
  here, so it also needs `build-essential` and `python3`.
- **Windows**: run it in PowerShell. Workwood goes into the Start menu; sessions
  run on Windows itself. Not yet tried on Windows without WSL.
- **Windows with WSL**: run it inside WSL. Workwood goes into the Start menu and
  sessions run in WSL (the same as `npm run shortcut`, described below).

On macOS and Linux the app runs straight from this folder: keep the folder where
it is. Workwood checks GitHub for updates when it starts and every three hours
(or under Settings, About), and offers a restart that pulls them, runs
`npm install` when the dependencies changed, and starts again. In the Windows
window (with WSL) the restart also makes the Windows copy again. It will not
update over uncommitted changes in this folder. The Windows window from before
this feature has no restart: run `npm run install-app` once more after pulling. `npm run install-app -- --remove`
takes the app away again; your sessions and settings stay.

## Run it

```bash
cd ~/workspace/workwood
npm start         # the Workwood window, without installing anything
npm run edge      # alternative: the same app in a Microsoft Edge app window
```

On Windows, run `npm run shortcut` once (inside WSL). It puts Workwood in the
Start menu as a native Windows window, installed under `%LOCALAPPDATA%\Workwood`
(Electron for Windows, downloaded once, and a Windows copy of the service).
The small word after the "Sessions" title (for example "· WSL") says where sessions run; click it to change:

- **Windows**: the service runs inside the window itself and uses the Windows
  Claude Code (`claude.exe`), your Windows folders and Claude Code's Windows
  history. Nothing goes through WSL. There is one account there: the one
  Claude Code is signed in to.
- **WSL**: the window starts the service in WSL and stops it again when the
  window closes; this is the full set-up, with all your profiles. Its output
  goes to `~/.cache/workwood/workwood.log`.

Agents on the side you are not looking at keep working. A dot next to that
word shows when one there is working (green) or waiting for you (amber).

Each side has its own settings. Under Settings, General, "Project folders"
lists the folders that hold your projects (for example `F:\workspace` on
Windows); the new-session menu offers what is inside them, and new folders are
made in the first one. Left empty, it is `~/workspace`.

For a Windows PC without WSL, run `npm run package` here. It makes
`dist/Workwood-windows-x64.zip` (about 290 MB). On the other PC, unzip it and
double-click "Install Workwood.cmd"; nothing else needs installing except
Claude Code for Windows. Only the Windows side exists there. "Remove
Workwood.cmd" takes it away again.

Run `npm run shortcut` again after pulling changes (the Windows side is a copy);
`npm run shortcut -- --remove` takes it all away. `npm start` still opens the
Linux window through WSLg.

When started from a terminal: keep the terminal open while you use the app; closing it or pressing Ctrl+C quits.
The terminal prints a few "Failed to connect to the bus" lines at start-up under
WSL; they are harmless.

On a fresh WSL install the Electron window needs GTK once:
`sudo apt install libgtk-3-0`.

## What works in this first version

- The sidebar is an inbox, grouped by project: sessions that are working, waiting
  for you, finished but not yet looked at, or still open. A session leaves it
  when you mark it done (the Done button, the tick on its row, or Ctrl+D), or by
  itself after 7 days untouched (Settings, "Clear quiet sessions"). New work in a
  done session brings it back. Sessions started in a terminal appear only while
  they are running or waiting. Ctrl+K, or the Done row, finds any session by its
  name or project.
  While a session is working in the app, a faint second line under its name says
  what it is doing (not in the compact sidebar, and not for sessions in a terminal).
- A session in a git worktree is listed under the project the worktree was made
  from. Under the title, always in the same place, the header names the worktree
  (or the branch when there is none), then the project.
- Home: Workwood opens on it, and the Home button at the top of the sidebar brings it back. The message box
  stays under it, so a new session starts there. "Pick up" shows the last words of the newest sessions (one
  waiting for you first), a card per profile with its 5-hour and 7-day limits (how fast each is being used, from
  the usage log Claudius and Workwood keep, and when that pace would reach the limit), the projects with changes
  not committed, and the pages and pictures the agents made lately. "Projects" has a card per project worked on
  this month. "Time" shows when you worked, per project or per profile: a day or a week as stretches of work you
  can step back through, or the last 30 days as a heatmap of your messages, where a day opens that day. Home opens
  with what it showed last time and updates it in place; only the very first time does it draw placeholders. A
  profile card opens that profile's settings. Behind Home runs a slow background (Aurora, Caustics, Orbits or
  Constellation, or none) in the colours of your projects, livelier while an agent works and warm when the
  profile for the next session is near a limit; the button beside the view switch picks it (Settings, Home).
- Under the message box: the profile the conversation runs on with its 5-hour and
  7-day limits, then model and effort, and how full the context is. Pressing the
  profile continues the conversation on another one from your next message.
- Limits: the profile menu lists every profile with its 5-hour and 7-day limits
  stacked, each bar marked with how far that window has run, and when it resets.
  A dot on the profile's name says that one of them is close to (amber) or at
  (red) a limit. Workwood reads the limits itself from Claude's usage endpoint,
  the one behind `/usage`: nothing is sent to Claude and no usage is spent. It
  reads every 5 minutes, after each turn for that turn's profile, and when you
  press the refresh button in the menu. Profiles are read one at a time, never
  side by side. A profile whose sign-in has lapsed is renewed first (see
  Profiles below); if that cannot be done, it keeps its last reading and the
  menu says why. Each reading is also written to the profile's `.usage` cache,
  where `claudius list` reads it too. On the Windows side the one account gets
  its limits the same way.
- Profiles: Workwood keeps them itself, in `~/.claude-profiles/<name>`, the same
  folders and files Claudius uses, so the two can be used side by side and see
  the same profiles, usage and history. Claudius is not needed to run
  Workwood; keep it for opening a profile in a terminal by hand. Workwood lists the
  profiles, picks the one with the most room (by Claudius's own rules), reads
  the session pool, and before a session runs on a profile wires it to the
  shared history in `~/.claude` (sessions, plans, plugins, prompt history),
  fills in the settings it lacks from the global ones, and copies over which
  projects you trusted. What was already in the profile is merged into the pool
  and kept as `<name>.pre-share.bak`, never deleted.
- Renewing a sign-in: a refresh token works once, so only one program may
  renew an account at a time. Workwood takes the two lock folders Claude Code
  itself uses for this (`<profile>/.oauth_refresh.lock` and `<profile>.lock`),
  and Claudius takes the same two, so Workwood, Claudius and Claude Code never
  renew the same account at once. Whoever gets the lock second reads the
  sign-in again and uses the renewed one instead of renewing it a second time.
  An account signed in to `~/.claude` is only ever renewed there.
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
- The permission mode (Ask, Accept edits, Plan, Auto) has its own picker next to
  the model; Shift+Tab in the message box cycles through them, as in Claude Code.
  A change applies at once, even mid-turn; a permission card already waiting stays
  until you answer it. It shows the session's real mode (from its history, or the
  profile's `permissions.defaultMode` for a new session), and "Make … the default"
  writes that setting into the profile's own Claude Code settings. Bypass is listed
  only once "Offer Bypass mode" is on in Settings → General.
- Cards for questions, permissions and plans, and for a turn that stopped on a
  limit, a lost sign-in or an error (with "continue on another profile").
- Compact sidebar: in a window narrower than about 1000 pixels, or when a side
  panel would squeeze the conversation, the sidebar becomes a strip of project
  tiles; hovering a tile shows the session's name. The button at the top of
  the sidebar, or B, switches between the two at any width.
- Writing while the agent works: a message sent mid-turn waits in a queue on
  top of the message box until the agent finishes the step it is on. Then the
  agent reads it before its next step, or runs it as the next turn. Until then,
  ↑ in an empty box (or the pencil) takes it back to change it, and "Send now"
  cuts the current step short and sends it at once. The send button stops the
  turn only while the message box is empty.
- Long conversations: marks along the right edge, one per turn, jump to that
  turn; the list button in the header opens an outline of the turns that you
  can search.
- Context: the figure under the message box opens what fills the agent's
  context, as Claude Code counts it, and "Compact the conversation now".
- Files a shell command made (a screenshot, a page written by a script) get
  preview cards too, when the command names them.
- New session: the project menu also takes a typed folder or "Browse…".
- "Open at login" (Windows window): in the gear menu and Settings.
- Compare: when the agent asks a question about things it made in the same
  turn, the options become pictures of them, and you pick by clicking one. Each
  option is matched to the file its wording names (or to the text the agent
  attached to the option). Two or three pictures sit in a row and four go two by
  two; with five or more, the options stay rows with a "view" link. An option
  with nothing to show stays a row under the pictures, and in a narrow window
  the pictures shrink into rows. The button in a picture's corner opens it large
  beside the question; there the tabs pick the option, a pick changes the tab,
  and "Side by side" shows up to three at once. If nothing can be matched by
  name, "Look at the files it made" opens the turn's files under their own names.
- Previews: pages, images, videos and PDFs the agent wrote appear as cards under
  its reply. A card opens the file at full width (beside the conversation while
  a question waits there); the header button opens it as a side panel. Either
  way you can step through everything the session made, switch between full
  width and side panel, or open it in your browser. N opens and closes the
  side panel, M switches it to full width and back, ← and → step through the files.
- The window opens where you left it, at the size you left it (and maximized,
  if it was).
- Session actions, from the "…" on a session or a right-click:
  - Rename: saved in the session's history the way Claude Code's `/rename` does,
    so the name also shows in `claude --resume`.
  - Open in VS Code, and Open in terminal (resumes the session under its own
    profile in a new Windows Terminal tab; set `WORKWOOD_TERMINAL` to a command
    of your own, which is called with the folder and then the command to run).
  - Mark done: takes the session out of the sidebar in Workwood only (kept in
    `~/.config/workwood/state.json`). Nothing is deleted.
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
- Dictation: the mic button (or Ctrl+Shift+Space, from anywhere) records, shows what it has heard so far while you
  speak, and puts the text in the message box after what you typed; nothing is
  sent until you press send. Escape discards the recording. Speech is turned
  into text on this machine by a Whisper model (about 240 MB, downloaded once on
  first use into `~/.cache/workwood/models`); no audio leaves it. English by
  default: pick another language in Settings; `WORKWOOD_STT_MODEL` names another model.
  With an NVIDIA graphics card (Linux or WSL), Settings offers "Better dictation":
  Whisper Large v3 Turbo on the card, more accurate and faster. Download gets it
  once (about 2.7 GB: the model, and NVIDIA's CUDA 13 and cuDNN 9 libraries from
  their PyPI packages, pinned and checked by hash, into `~/.cache/workwood/cuda`),
  then turns it on; a switch after that. If the card cannot be used, dictation
  says why and goes on with the standard model.
- Hover notes: every button and path has one, in Workwood's own style rather
  than the browser's: a name, sometimes a line on what it does, and its keys.
  Single keys (B, N, M, and ← → in a preview) work whenever you are not typing in a field or
  the terminal.
- Settings (gear, "All settings…"): theme, the profile new sessions start on,
  when quiet sessions clear themselves, the dictation language, your profiles with their usage,
  the skills list, and versions.
- Managing profiles: Settings, Profiles.
  - "Add a profile" takes a name and runs Claude Code's own sign-in
    (`claude auth login`) for a new folder, in a terminal inside the dialog. The
    profile is listed once the sign-in has landed; if it does not finish,
    nothing is left behind.
  - "Sign in again" does the same for an existing profile. The old sign-in is
    set aside first and put back if the new one does not finish. For the
    profile `~/.claude` is signed in to, the new sign-in goes there too. A turn
    that stopped because a sign-in lapsed has the same button on its card.
  - The pencil renames a profile in place (Enter saves, Escape cancels); the bin
    removes one after asking. Removing deletes the profile's sign-in, settings
    and usage history; sessions and the shared history stay. The profile
    `~/.claude` is signed in to cannot be removed (switch with Claudius first),
    and a profile cannot be renamed or removed while a session is using it.
- Dark and light theme (gear, bottom left).

Not yet tried on a real machine: the macOS app, and installing on a Windows PC without WSL from this folder.

## Tests

```bash
npm test
```

About 100 seconds, 112 tests. They run the real service inside a throwaway
home folder (the same idea as Claudius's own tests), with a scripted stand-in
for `claude` (`tests/fake-claude.mjs`) and local stand-ins for Claude's usage
and sign-in servers. Claudius is not used. No real account is
used and nothing is sent to Anthropic. Half of the tests drive the window with
real clicks in a headless Chromium; they are skipped with a note if none is
found (`npx playwright install chromium-headless-shell`, or set `WORKWOOD_CHROME`).
The last test checks that nothing leaked out of the sandbox.

## How it is put together

- `service/` is a small local web server (Node). It reads profiles
  (`profiles.mjs`), limits (`usage.mjs`) and sessions itself, renews sign-ins
  under the shared lock (`oauth.mjs`), asks `claude agents --json` what is
  running, and runs turns with the Claude
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

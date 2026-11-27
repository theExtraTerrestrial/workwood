# Workwood, in detail

Everything Workwood does, one feature at a time. The [README](../README.md) has the short version and how to install it.

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
- The header's actions: Preview and Running (background work) are always there,
  muted when there is nothing to show, so nothing moves; Serve comes in at their
  left in a project that lists or runs servers. The rest is in ⋮: Changes,
  Outline, the chat / terminal switch, Open in VS Code, Open in a terminal
  window, Done (Ctrl+D), Rename and Delete. A pin beside one keeps it in the
  header; Done is pinned to start with.
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
  turn; Outline (in ⋮, or pinned to the header) opens an outline of the turns that you
  can search.
- Context: the figure under the message box opens what fills the agent's
  context, as Claude Code counts it, with two ways on: "Continue in a new
  session" (a handoff) and "Summarise to make room" (Compact).
- Handoff: a separate model reads the whole history and writes where the work
  is, what was decided, what was tried and failed, and what is open; every
  message you wrote, your answers, the files changed and the failed commands go
  along word for word. A new session starts from it, and the agent can search
  the earlier sessions with a `recall` tool. Auto (in Settings, General) picks
  Haiku for short sessions, Sonnet for most and Opus for long or intricate ones;
  the model under the action changes it for one handoff. From 400k tokens (or ¾
  of a smaller window) a strip above the message box offers it; `/handoff`
  works any time, and words after it become the new session's first message.
- Threads: the sessions of a handoff read as one conversation. The one before
  shows above, dimmed; older ones wait behind a line. The outline groups the
  turns by session and searches all of them; picking an old turn shows its
  session on its own, with "Back to now".
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
- Links in replies open in your browser. A GitHub pull request or issue shows as
  a chip with its number (and its repository when it is not the session's), its
  icon coloured by what it is now: open, draft, merged or closed (asked of `gh`
  when the link appears and when you open the session; without `gh`, a plain
  chip). A port on this PC (`http://localhost:5173`, or `localhost:5173` on its
  own) shows as the tray's chip, green while something answers there and grey
  once nothing does. Any other address is a link. Pointing at one shows where
  it goes (and a pull request's title) with Copy; a right-click offers Open in
  browser and Copy link. The newest pull request the session's answers linked
  sits beside its title; +N beside it lists the others.
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
- Servers: a dev server and its companions (a worker, a queue) running in the
  session's folder show in the tray above the message box, in green, whoever
  started them: Workwood, the agent, or you in a terminal (a worktree is its own
  folder). Their ports are on the tray's line; a click opens the page. A group
  (Foreman, `bin/dev`) shows what it started under it. Stop asks first for one
  Workwood did not start, and stops the whole group. Workwood finds them by the
  ports they listen on and the folder they run in; a process with no port (a
  worker) counts when it runs beside one that listens or matches a Procfile line.
  In the sidebar, a session's background chip shows a network icon when its
  servers (started by its agent, or from it in Workwood) are among what runs, and
  a project's heading shows how many servers run in its folders and worktrees,
  whoever started them; the tooltips name them and their ports.
  - A project lists its servers in a `Procfile.dev` or `Procfile` (one
    `name: command` a line), and may add `.workwood/servers.json`:
    `{ "procfile": "Procfile.dev", "setup": "bin/worktree-setup",
    "teardown": "bin/worktree-teardown", "open": "web" }` (all optional; //
    comments allowed). Then Serve in the header (Start on the tray, the
    session's menu in the sidebar, or `/serve [name…]`)
    runs them, each on a port of its own: a block of ten for each folder, the
    same every time, from 3100, given as `PORT` (use `$PORT` in the Procfile).
    They also get `WORKWOOD_WORKTREE`, `WORKWOOD_BRANCH` and
    `WORKWOOD_CHECKOUT`. The setup runs once per worktree before the first
    start (copy the shared dev database, pick a Redis namespace); when the
    worktree is removed, its servers stop and the teardown runs from the
    checkout it was made from. Workwood holds their output (Output, in the side
    panel) and can restart them. While they run, Serve turns green with the first
    one's port, and opens the tray.
  - The agent in such a project is told to use `workwood serve` instead of
    starting servers itself: `workwood serve [name…]` starts them and waits
    until they are up, printing their addresses; `--status`, `--logs <name>
    [lines]`, `--restart [name…]` and `--stop [name…]` do the rest. Servers
    Workwood started keep running after the session; quitting Workwood asks
    first, then stops them.
- Terminal view: the chat / terminal switch (in ⋮, or pinned to the header) shows the session's
  real Claude Code terminal inside the window. It keeps running while you look
  at other sessions. A session has one owner at a time: the terminal waits for
  a chat turn to end (or you stop it), and sending a message in the chat closes
  an idle terminal. Leaving Claude Code (`/exit`) returns you to the chat.
  Ctrl+Shift+C copies the selection.
- Changes view: Changes in ⋮ (with the number of changed files; pinned, a "±"
  button in the header) opens a read-only list of what differs from the project's last commit, new
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
- Zoom: Ctrl + and Ctrl − (Cmd on macOS), or Ctrl with the mouse wheel, make the whole window bigger or smaller in
  browser steps from 50% to 200%; Ctrl+0 goes back to 100%. The size is kept for next time (Electron window; Edge
  zooms by itself).
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
- Your phone, on your home Wi-Fi (Settings, Phone; off until you turn it on). Scan the code with the
  phone's camera; a setup page walks it through trusting this PC (Workwood makes its own certificate
  authority, limited to home-network addresses) and opening the app. Each phone gets its own key, which
  Settings can revoke. The phone has Home, Sessions, New and its own Settings: it answers cards, starts
  sessions, opens previews, dictates, and switches profile, model, effort and permissions from one pill
  in the message box. Notifications (a session needs you, a turn ends, work stops, a limit clears, and
  three more that start off) go through the phone's push service, encrypted end to end. No account and
  no outside server; it works while this PC is on and Workwood is open. Inside WSL, the Windows window
  opens the port on Windows (Windows asks once) and passes connections through to the service. Set up
  once: pairing, certificates and notifications outlast restarts. Where the phone finds the PC by its
  name (DESKTOP-AX.local), the app opens there and keeps working when the router gives the PC another
  address; a phone that knows only the old address is marked in Settings, and Pair again makes a code
  that pairs it again as itself, keeping its name and notifications.
  A server on this PC that a reply or the tray links to (`localhost:5173`) opens on the phone at the
  PC's address: Workwood passes it through a port of its own (from 47453), and lets in only a paired
  phone's browser, so the server is not open to the rest of the Wi-Fi. Inside WSL the Windows window
  opens those ports too.
- **At the PC or away.** While you are at the PC, a notification waits until a minute passes with no
  input there (so it is not sent while you are typing an answer), and one you handle there meanwhile
  (you answer it, or open its session) is never sent. With no keyboard or mouse input
  anywhere on the PC for 5 minutes (or 2, or 15), or with the PC locked or asleep, you are away and
  notifications go at once. A mark in the sidebar's footer says which: Here, a ring running down to one
  that waits, or Away; click it for Away now or I'm here. Settings, Phone can make it Don't send or Send
  at once while you are at the PC, and the phone's Home says whether the PC has you.

Not yet tried on a real machine: the macOS app.
On Windows, Workwood is installed from WSL only.

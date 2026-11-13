# Plan: launching Workwood from Windows

Status: not built. Today Workwood is started from a WSL terminal with `npm start`.
This is the plan for starting it like any Windows app, including when WSL is not
running yet. It is written now so the current code does not block it.

## What the user should get

1. A Workwood shortcut on Windows (Start menu, taskbar).
2. Clicking it shows the window at once, with the saved session list if there is one.
3. If WSL is stopped, the window says "Starting WSL…" and carries on by itself.
4. If something is wrong (no WSL, distro missing, Node or Claude Code missing
   inside it), the window says what is missing and how to fix it, with a Retry button.

## Shape

Two parts, which the code is already split into:

- **Window (Windows side).** The Electron shell, installed on Windows. It holds no
  session logic. It finds or starts the service and shows its page.
- **Service (WSL side).** `service/server.mjs`, unchanged: reads profiles and
  sessions, runs turns, serves the page on `127.0.0.1` with a token.

## Start-up sequence in the Windows shell

1. Show the window immediately with a local "starting" page (no network needed).
2. Check WSL: `wsl.exe --list --quiet`. No WSL or no distro: show the fix-it page.
3. Start the service: `wsl.exe -d <distro> -- bash -lc "cd ~/workspace/workwood && node service/server.mjs --print-address"`.
   Running any command boots a stopped distro, so this step also starts WSL.
   Starting it this way keeps it alive for as long as the shell holds the process.
4. Read the address and token from the service's first output line.
5. Load that address in the window. WSL forwards `127.0.0.1` to Windows by default
   (confirmed on this machine). If it is unreachable, fall back to the distro's IP
   from `wsl.exe hostname -I`, and say so if both fail.
6. If the service process exits, show "The service stopped" with Restart.

## Changes this needs in the current code

- `service/server.mjs`: a `--print-address` mode that prints one line of JSON
  (`{"address": …}`) and nothing else on standard output. Small.
- If the IP fallback is used, the service must accept that host name as well as
  `127.0.0.1`, and must listen on that address. Keep the token check as it is.
- `shell/main.cjs`: split "start the service" from "show the window", so a
  Windows build can swap in the `wsl.exe` launcher. Add the starting, fix-it and
  stopped pages.
- Packaging: build a Windows installer with electron-builder from the same repo.
  Settings to remember: which distro, and where the Workwood folder is inside it.
- Paths: "Open in VS Code" from the Windows shell should run
  `code --remote wsl+<distro> <path>`.

## Decisions to make when we build it

- Whether the service keeps running when the window closes (sessions continue in
  the background) or stops with it. Suggested: keep running, with a tray icon.
- Whether Windows-side projects (`C:\…`) get their own service or stay out of scope.
- How the Mac build shares this: on a Mac there is no WSL step; the shell starts
  the service directly, as `shell/main.cjs` does today.

## Why it is hard to test now

Development happens inside WSL, so WSL is always running when the app starts. The
boot path can only be tested from a Windows-side build after `wsl --shutdown`.

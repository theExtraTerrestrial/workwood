# Working on Workwood

## Work in a worktree

Several sessions often work on Workwood at once. Unless the user says otherwise, each session makes its changes in its
own git worktree, never in the main checkout:

- Before the first edit, move into a new worktree on a new branch named for the feature (the `EnterWorktree` tool, or
  `git worktree add .claude/worktrees/<name> -b <name>` and work from there). Reading and answering questions need none.
- A new worktree has no `node_modules`. Link the main checkout's instead of installing again:
  `ln -s ../../../node_modules node_modules` from the worktree's top (`.claude/worktrees/<name>`). Tests then run there
  as usual with `npm test`.
- Never run `npm install`, `npm ci` or `npm uninstall` through that link. The folder is shared by the running Workwood
  and every other worktree, and npm makes it match this branch's `package.json`, removing what `main` or another
  branch needs (the running Workwood then fails on a missing package).
- A feature that adds, removes or changes a dependency gets its own `node_modules`: remove the link (`rm node_modules`,
  never with `-r`), then `npm install` in the worktree. After merging it, run `npm install` in the main checkout so the
  running Workwood has the new package.
- The Workwood the user is running comes from the main checkout, so changes show in it only after they are merged.
  Previews of pages in the worktree (design rounds) work as they do in the main folder.
- When the feature is done and its tests pass, say so and offer to merge it into `main` and clean up. Only on a yes:
  commit in the worktree, rebase it on `main` (other sessions may have merged meanwhile; rerun the tests after),
  merge with a fast-forward, push `main` to GitHub (`git push origin main`), then remove the worktree
  (`git worktree remove`) and delete its branch. Never merge or remove a worktree without asking. If the push is
  refused because `origin/main` moved, pull with a rebase (`git pull --rebase origin main`), rerun the tests, and push
  again; never force-push.

## Versions

Workwood follows Semantic Versioning (MAJOR.MINOR.PATCH) in `package.json`; Settings, About shows it. Every merge
into `main` raises it, in its last commit, in both `package.json` and `package-lock.json` (by hand: `npm version`
would run npm through the shared `node_modules` link).

- PATCH (0.2.0 → 0.2.1) is the default: fixes, small changes, docs, tests.
- Weigh the change. A new feature someone would notice, or a clear change in how something works, fits MINOR
  (0.2.1 → 0.3.0); something that breaks how Workwood is installed, set up or used, or drops a feature, fits MAJOR.
  When it seems more than a patch, say which and why when offering to merge, and ask; raise it so only on a yes,
  otherwise raise PATCH. The user may also say up front that a change is MINOR or MAJOR.
- A MINOR or MAJOR release is tagged on the merged commit (`git tag -a v0.3.0 -m "<what is new>"`) and the tag is
  pushed with `main` (`git push origin main v0.3.0`). Patches are not tagged.

## A test that fails now and then

- A failing test in `tests/app.test.mjs` leaves its evidence in `<tmp>/workwood-test-failures/<run>/<test>/` (the fake
  agent's log, the service's events and stderr, and any step of the clock; a window test adds a Playwright trace and a
  screenshot). Read that first.
- This computer's clock steps back up to a second now and then (WSL). Code that decides by how long something took, or
  which of two things came first, uses `performance.now()` or a counter, never two `Date.now()` readings. Dates that are
  shown or saved stay on `Date.now()`.
- Use `npm run test:stress -- "<part of a test's name>" [runs] [--before N]` only when the evidence is missing or does
  not explain the failure, and to confirm a fix. It is never part of `npm test`.

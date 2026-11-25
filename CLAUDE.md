# Working on Workwood

## Work in a worktree

Several sessions often work on Workwood at once. Unless the user says otherwise, each session makes its changes in its
own git worktree, never in the main checkout:

- Before the first edit, move into a new worktree on a new branch named for the feature (the `EnterWorktree` tool, or
  `git worktree add .claude/worktrees/<name> -b <name>` and work from there). Reading and answering questions need none.
- A new worktree has no `node_modules`. Link the main checkout's instead of installing again:
  `ln -s ../../../node_modules node_modules` from the worktree's top (`.claude/worktrees/<name>`). Tests then run there
  as usual with `npm test`.
- The Workwood the user is running comes from the main checkout, so changes show in it only after they are merged.
  Previews of pages in the worktree (design rounds) work as they do in the main folder.
- When the feature is done and its tests pass, say so and offer to merge it into `main` and clean up. Only on a yes:
  commit in the worktree, rebase it on `main` (other sessions may have merged meanwhile; rerun the tests after),
  merge with a fast-forward, then remove the worktree (`git worktree remove`) and delete its branch.
  Never merge or remove a worktree without asking.

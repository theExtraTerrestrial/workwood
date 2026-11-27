// `workwood serve`: the agent's (or your) way to have Workwood run this folder's servers, the ones its
// .workwood/servers.json or Procfile lists. Workwood gives each worktree its own ports, runs the setup once per
// worktree, shows the servers in its window and keeps them running after the session.
//   workwood serve [name…]            start them (all, or the ones named) and wait until they are up
//   workwood serve --status           what runs in this folder, and on which ports
//   workwood serve --logs <name> [n]  the last n lines (100) of what one printed
//   workwood serve --restart [name…]  start them again
//   workwood serve --stop [name…]     stop them
const [cmd, ...rest] = process.argv.slice(2);
const usage = 'Usage: workwood serve [name…] | --status | --logs <name> [lines] | --restart [name…] | --stop [name…]';
if (cmd !== 'serve') { console.error(usage); process.exit(2); }
const url = process.env.WORKWOOD_SERVE, token = process.env.WORKWOOD_SERVE_TOKEN;
if (!url || !token) { console.error('workwood serve works in sessions Workwood runs (it was not given WORKWOOD_SERVE).'); process.exit(2); }
const flag = rest.find(a => a.startsWith('--')), names = rest.filter(a => !a.startsWith('--'));
const op = { '--status': 'status', '--logs': 'logs', '--restart': 'restart', '--stop': 'stop', undefined: 'start' }[flag];
if (!op || (flag && !['--status', '--logs', '--restart', '--stop'].includes(flag))) { console.error(usage); process.exit(2); }
let lines = 100;
if (op === 'logs') { if (/^\d+$/.test(names.at(-1) || '') && names.length > 1) lines = +names.pop(); if (names.length !== 1) { console.error('Usage: workwood serve --logs <name> [lines]'); process.exit(2); } }
try {
  const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', 'x-workwood-serve': token }, body: JSON.stringify({ op, names, lines, cwd: process.cwd() }) });
  const d = await res.json().catch(() => ({ error: 'Workwood answered ' + res.status }));
  if (!res.ok) { console.error(d.error || 'Workwood answered ' + res.status); process.exit(1); }
  process.stdout.write(d.text.endsWith('\n') ? d.text : d.text + '\n');
  process.exit(d.ok === false ? 1 : 0);
} catch (e) { console.error('Workwood is not reachable: ' + e.message); process.exit(1); }

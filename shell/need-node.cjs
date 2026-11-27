// Runs before the scripts that use this computer's own Node, and is written so that any Node can read it: an older
// Node fails on Workwood's newer syntax with a message that names a line, not the version it needs.
var need = 22, have = +process.versions.node.split('.')[0];
if (have < need) {
  console.error('Workwood needs Node ' + need + ' or newer; this is Node ' + process.versions.node + '.\n'
    + 'Install a newer one (https://nodejs.org, or nvm: "nvm install ' + need + '"), then run "npm ci" here again.');
  process.exit(1);
}

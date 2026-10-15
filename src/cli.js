import fs from 'node:fs';
import { Nightvoyage } from './engine.js';
const [directory, action = 'demo', arg] = process.argv.slice(2);
if (!directory) { console.error('Usage: node src/cli.js <external-data-directory> [demo|list|read|status|cancel|resume|withdraw|delete|recall] [id-or-cue]'); process.exitCode = 1; }
else {
  let engine;
  try {
    engine = new Nightvoyage(directory);
    let result;
    if (action === 'demo') {
      const snapshot = JSON.parse(fs.readFileSync(new URL('../fixtures/paper-harbor.json', import.meta.url)));
      const id = engine.start('demo-v1','demo-session-v1',snapshot);
      await engine.execute(id); result = engine.result(id);
    } else if (action === 'list') result = engine.list();
    else if (['read','status','cancel','resume'].includes(action)) result = await engine[action](arg);
    else if (action === 'withdraw') { engine.withdraw(arg); result = { withdrawn: true }; }
    else if (action === 'delete') { engine.deleteEntry(arg); result = { deleted: true }; }
    else if (action === 'recall') result = engine.recall(arg, `cue-${Date.now()}`);
    else throw new Error('unknown_action');
    console.log(JSON.stringify(result, null, 2));
  } catch (e) { console.error(e.message); process.exitCode = 1; }
  finally { engine?.close(); }
}

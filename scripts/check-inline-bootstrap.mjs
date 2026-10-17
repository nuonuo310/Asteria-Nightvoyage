// Standalone fictional history only; never opens the user's trial directory.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {Store} from '../src/store.js';
import {hash} from '../src/contract.js';
import {launchInlineStub} from '../src/inline-stub-launcher.js';
import {prepareAuthorizedHistory} from '../test-support/inline-authorization-fixtures.js';
const cleanups=[];let store;
try{
  const {directory,oldAccounts}=prepareAuthorizedHistory({after:f=>cleanups.push(f)});
  const first=await launchInlineStub('run',directory),replay=await launchInlineStub('run',directory);
  assert.equal(first.status,'completed');assert.equal(first.stubCalls,3);assert.equal(replay.stubCalls,0);
  store=new Store(directory);for(const [id,a]of Object.entries(oldAccounts))assert.equal(hash(store.state.billing.accounts[id]),hash(a));
  const entries=Object.values(store.state.entries),dream=entries.find(e=>e.origin==='dream');assert.ok(dream);assert.equal(dream.isRealityFact,false);
  const bodies=dream.scenes.map(s=>s.event);store.withdraw('q-sparse-memory');store.close();store=new Store(directory);
  for(const name of fs.readdirSync(directory)){const p=path.join(directory,name);if(fs.statSync(p).isFile())for(const b of bodies)assert.ok(!fs.readFileSync(p,'utf8').includes(b));}
  console.log(JSON.stringify({command:'node scripts/check-inline-bootstrap.mjs',node:process.version,platform:process.platform,...first,replayAdditionalCalls:replay.stubCalls,oldAccountsUnchanged:true,withdrawalPurgedAfterReopen:true,userStoreAccessed:false,bootstrapScope:'fixed_simulator_only',paidEntryAvailable:false,sandboxClaimed:false},null,2));
}finally{store?.close();for(const cleanup of cleanups.reverse())cleanup();}

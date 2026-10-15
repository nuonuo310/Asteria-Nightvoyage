import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { freezePrunedCore } from '../test-support/frozen-pruned-project.js';
test('all 13 original entry probes still pass against the exact historical core in an isolated copy',t=>{
  const d=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-frozen-entry-'));t.after(()=>fs.rmSync(d,{recursive:true,force:true}));
  for(const name of ['src','fixtures','test-support'])fs.cpSync(new URL('../'+name,import.meta.url),path.join(d,name),{recursive:true});
  fs.copyFileSync(new URL('../package.json',import.meta.url),path.join(d,'package.json'));freezePrunedCore(d);
  const env={...process.env};delete env.NODE_TEST_CONTEXT;
  const r=spawnSync(process.execPath,['--test','--test-reporter=spec','test-support/pruned-v2-entry-legacy.js'],{cwd:d,encoding:'utf8',env});
  assert.equal(r.status,0,r.stdout+'\n'+r.stderr);assert.match(r.stdout,/tests 13/);assert.match(r.stdout,/pass 13/);t.diagnostic(r.stdout);
});

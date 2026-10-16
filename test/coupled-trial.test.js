import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {freezeCoupledCore} from '../test-support/frozen-coupled-project.js';
test('23 original coupled entry probes pass against exact frozen historical sources, not renewed approvals',t=>{
  const d=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-frozen-coupled-'));t.after(()=>fs.rmSync(d,{recursive:true,force:true}));
  for(const name of ['src','fixtures','test-support'])fs.cpSync(new URL('../'+name,import.meta.url),path.join(d,name),{recursive:true});
  fs.copyFileSync(new URL('../package.json',import.meta.url),path.join(d,'package.json'));freezeCoupledCore(d);
  const env={...process.env};delete env.NODE_TEST_CONTEXT;
  const r=spawnSync(process.execPath,['--test','--test-reporter=spec','test-support/coupled-trial-entry-legacy.js'],{cwd:d,encoding:'utf8',env});
  assert.equal(r.status,0,r.stdout+'\n'+r.stderr);assert.match(r.stdout,/tests 23/);assert.match(r.stdout,/pass 23/);t.diagnostic(r.stdout);
});

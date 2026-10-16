import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {freezeOwnerCore} from '../test-support/frozen-owner-project.js';
test('original single-scene-diagnostic entry probes run against exact frozen pre-owner sources, not renewed approvals',t=>{
 const d=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-frozen-continuity-'));t.after(()=>fs.rmSync(d,{recursive:true,force:true}));
 for(const name of ['src','fixtures','test-support'])fs.cpSync(new URL('../'+name,import.meta.url),path.join(d,name),{recursive:true});
 fs.copyFileSync(new URL('../package.json',import.meta.url),path.join(d,'package.json'));freezeOwnerCore(d);
 const env={...process.env};delete env.NODE_TEST_CONTEXT;
 const r=spawnSync(process.execPath,['--test','--test-reporter=spec','test-support/single-scene-diagnostic-entry-owner-legacy.js'],{cwd:d,encoding:'utf8',env});
 assert.equal(r.status,0,r.stdout+'\n'+r.stderr);assert.match(r.stdout,/fail 0/);t.diagnostic(r.stdout);
});

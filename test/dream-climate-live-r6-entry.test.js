import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {runR6Admission} from '../scripts/nv-dream-climate-offline-01/single-run-r6/check-admission.mjs';
import {r6PackageDirectory} from '../scripts/nv-dream-climate-offline-01/single-run-r6/identity.mjs';
import {r6StoreDirectory} from '../scripts/nv-dream-climate-offline-01/single-run-r6/config.mjs';

const officialPrice=path.join(process.env.USERPROFILE??'','Desktop','deepseek-pricing-r1.html');
const probeScript=[
  "import fs from 'node:fs';",
  "const probe=JSON.parse(fs.readFileSync(new URL('./entry-probe.json',import.meta.url),'utf8'));",
  'process.stdout.write(JSON.stringify(probe.check));'
].join('\n')+'\n';

test('actual secure-input compares the admission digest with New-R6Release output',async t=>{
  const baseline=await runR6Admission(officialPrice);
  const probeRoot=path.join(path.dirname(r6PackageDirectory),
    `.r6-entry-probe-${crypto.randomUUID()}`);
  t.after(()=>fs.rmSync(probeRoot,{recursive:true,force:true}));
  fs.cpSync(r6PackageDirectory,probeRoot,{recursive:true});
  fs.writeFileSync(path.join(probeRoot,'check-admission.mjs'),probeScript,'utf8');
  const probeFile=path.join(probeRoot,'entry-probe.json');
  const releasePath=path.join(probeRoot,'release.json');
  // The approved digest must advance past the comparison and the temporary
  // release write. The probe worker exits without a notice, so the entry stops
  // on its own preflight refusal before any credential prompt.
  fs.writeFileSync(path.join(probeRoot,'worker.mjs'),'process.exit(0);\n','utf8');
  const investigate=check=>{
    fs.writeFileSync(probeFile,JSON.stringify({check},null,2),'utf8');
    return spawnSync('powershell.exe',['-NonInteractive','-NoProfile',
      '-ExecutionPolicy','Bypass','-File',path.join(probeRoot,'secure-input.ps1'),
      '-PriceFile',officialPrice],{encoding:'utf8',timeout:120000});
  };

  const mismatch=investigate({...baseline,executionDigest:'0'.repeat(64)});
  assert.equal(mismatch.status,1,mismatch.stderr);
  assert.match(mismatch.stderr,/execution_pin_mismatch/);
  assert.equal(mismatch.stdout.includes('Admission ready'),false);
  assert.equal(fs.existsSync(releasePath),false);
  assert.equal(fs.existsSync(r6StoreDirectory),false);

  const matched=investigate(baseline);
  assert.equal(matched.status,1,matched.stderr);
  assert.ok(matched.stdout.includes('Admission ready'),matched.stderr);
  assert.equal(matched.stderr.includes('execution_pin_mismatch'),false);
  assert.ok(matched.stderr.includes('r6_worker_preflight_refused'),matched.stderr);
  assert.equal(fs.existsSync(releasePath),false);
  assert.equal(fs.existsSync(r6StoreDirectory),false);
  assert.equal(fs.existsSync(path.join(probeRoot,'receipt.json')),false);
});
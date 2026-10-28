import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {runR6Admission} from '../scripts/nv-dream-climate-offline-01/single-run-r6/check-admission.mjs';
import {r6PackageDirectory} from '../scripts/nv-dream-climate-offline-01/single-run-r6/identity.mjs';

const officialPrice=path.join(process.env.USERPROFILE??'','Desktop','deepseek-pricing-r1.html');

// R7 changed the shared offline scene prompt, so the frozen R6 approval can no
// longer authorize it. The pins are intentionally not refreshed; this checks
// that the old paid entry stops before credential, Store and network instead.
// The R6 Store from the earlier user-run batch is never opened, read or
// asserted on here.
test('old R6 entry refuses before credential, Store and network after the R7 prompt change',async()=>{
  const refusal=await runR6Admission(officialPrice).then(
    ()=>null,error=>error);
  assert.ok(refusal,'R6 admission must refuse');
  assert.match(refusal.message,/dream_climate_r6_offline_identity_changed/);
  assert.equal(fs.existsSync(path.join(r6PackageDirectory,'release.json')),false);

  const result=spawnSync('powershell.exe',['-NonInteractive','-NoProfile',
    '-ExecutionPolicy','Bypass','-File',path.join(r6PackageDirectory,'secure-input.ps1'),
    '-PriceFile',officialPrice],{encoding:'utf8',timeout:120000});
  assert.equal(result.status,1,result.stderr);
  assert.match(result.stderr,/dedicated_store_already_present|admission_failed/);
  assert.equal(result.stdout.includes('Admission ready'),false);
  assert.equal(result.stdout.includes('Worker preflight ready'),false);
  assert.equal(result.stderr.includes('DeepSeek API Key'),false);
  assert.equal(fs.existsSync(path.join(r6PackageDirectory,'release.json')),false);
});
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateGuardInputProjection} from '../test-support/codex-0160-guard-input-projection.mjs';
import {codeModeGuardOverrides,reviewCodeModeGuardConfig} from '../scripts/codex-code-mode-guard-review.mjs';
import {fictionalGuardConfig} from '../test-support/code-mode-guard-rehearsal.mjs';
import {rehearseCodexGuardExec} from '../scripts/codex-code-mode-guard-owner.mjs';
const config=()=>JSON.parse(fictionalGuardConfig()).result.config;
test('release-derived projection excludes internal runtime root and specifies host feature boolean fields',()=>{
 const schema=JSON.parse(fs.readFileSync(new URL('../test-support/codex-0160-guard-input-projection.json',import.meta.url),'utf8'));
 assert.equal(schema.upstreamCommit,'a956835d020762cb2b570053af06f643a11c0ecc');assert.equal(schema.sourceGitBlob,'ac6171c01cf88d729b59609439338d6477f7ce49');
 assert.equal(schema.rootAllowedKeys.includes('code_mode'),false);assert.equal(schema.featureAllowedKeys.includes('code_mode_host'),true);
 assert.deepEqual(Object.keys(schema.hostDefinition.properties).sort(),['disable_in_process_fallback','enabled']);assert.equal(schema.hostDefinition.additionalProperties,false);
 assert.equal(schema.fullRustConfigValidation,false);
});
test('prior literal startup shape is rejected independently; runtime field must not masquerade as accepted input',()=>{
 const old=config();old.features.code_mode_host=false;old.code_mode={disable_in_process_fallback:false};
 assert.throws(()=>validateGuardInputProjection(JSON.stringify(old)),/guard_input_projection_rejected/);
 assert.equal(reviewCodeModeGuardConfig(JSON.stringify({id:2,result:{config:old}})).candidateConfigurationMatched,false);
});
test('corrected emitted dotted flags fit the reviewed input projection rather than a runtime-shaped echo',()=>{
 const c=config();delete c.features.code_mode_host;
 for(const flag of codeModeGuardOverrides()){
  const n=flag.indexOf('='),keys=flag.slice(0,n).split('.');let o=c;for(const k of keys.slice(0,-1))o=o[k]??={};o[keys.at(-1)]=JSON.parse(flag.slice(n+1));
 }
 assert.deepEqual(c.features.code_mode_host,{enabled:false,disable_in_process_fallback:false});assert.equal(Object.hasOwn(c,'code_mode'),false);
 assert.equal(validateGuardInputProjection(JSON.stringify(c)).checked,true);
 assert.equal(reviewCodeModeGuardConfig(JSON.stringify({id:2,result:{config:c}})).candidateConfigurationMatched,true);
});
test('schema-valid shorthand or omitted default does not satisfy explicit two-flag candidate guard',()=>{
 for(const value of [false,{}, {enabled:false}, {disable_in_process_fallback:false}]){
  const c=config();c.features.code_mode_host=value;assert.equal(validateGuardInputProjection(JSON.stringify(c)).checked,true);
  assert.equal(reviewCodeModeGuardConfig(JSON.stringify({id:2,result:{config:c}})).candidateConfigurationMatched,false);
 }
});
test('misnested fields, unknown host fields and wrong boolean types are rejected rather than echoed',()=>{
 for(const edit of [c=>c.code_mode={disable_in_process_fallback:false},c=>c.features.code_mode.disable_in_process_fallback=false,c=>c.features.code_mode_host.extra=false,c=>c.features.code_mode_host.enabled='false',c=>c.features.code_mode_host.disable_in_process_fallback=0,c=>c.features.private_unknown=false]){
  const c=config();edit(c);assert.throws(()=>validateGuardInputProjection(JSON.stringify(c)));
 }
 for(const s of ['{','null','[]','x'.repeat(1048577)])assert.throws(()=>validateGuardInputProjection(s));
});
test('independent peer rejects legacy root before initialize/config/thread/turn and supplies no call or local model POST',async()=>{
 const r=await rehearseCodexGuardExec('legacy_invalid_root');assert.equal(r.status,'blocked');assert.equal(r.reason,'startup_error_observed');
 assert.equal(r.initializeChecked,false);assert.equal(r.configurationChecked,false);assert.equal(r.threadPrepared,false);assert.equal(r.fixtureModelPosts,0);assert.equal(r.appServerTurnsRequested,0);assert.equal(r.scriptedExecCallSupplied,false);
 assert.equal(r.ownedProcessClosed,true);assert.equal(r.temporaryCleanupComplete,true);assert.ok(r.startupDiagnostics.labels.includes('unrecognized_configuration'));assert.equal(r.startupDiagnostics.rawStderrReturned,false);
});

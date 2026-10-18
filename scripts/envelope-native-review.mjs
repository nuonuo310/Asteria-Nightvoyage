// Read-only component inventory. Not a grant, login entry or trial initializer.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {snapshot} from '../src/contract.js';
import {envelopeHttpProtocolVersion} from './envelope-plan-http.mjs';
const digest=text=>createHash('sha256').update(text).digest('hex'),root=new URL('../',import.meta.url);
export function envelopeNativeComponentReview(){
 const pins={},visit=file=>{
  if(Object.hasOwn(pins,file))return;
  if(path.isAbsolute(file)||file.startsWith('../'))throw Error('invalid_component_source');
  const text=fs.readFileSync(new URL(file,root),'utf8').replaceAll('\r\n','\n');pins[file]=digest(text);
  for(const m of text.matchAll(/(?:import|export)\s+(?:[^'";]*?\s+from\s*)?['"](\.[^'"]+)['"]/g))visit(path.posix.normalize(path.posix.join(path.posix.dirname(file),m[1])));
 };
 for(const file of ['scripts/envelope-plan-model-port.mjs','scripts/envelope-plan-model-runtime.mjs','scripts/envelope-plan-content-view.mjs','scripts/envelope-native-review.mjs','package.json'])visit(file);
 const raw=fs.readFileSync(new URL('../examples/gpt-plan-trial.snapshot.json',import.meta.url),'utf8').replaceAll('\r\n','\n'),fixture=snapshot(JSON.parse(raw));
 if(digest(raw)!=='b2481512fe1f4f3d597863eeaf8754cef61ef37ebad2d60ddf76f75e7772378a'||fixture.sources.some(s=>s.grant.modelEgress!==false))throw Error('review_fixture_changed');
 return {reviewVersion:'envelope-native-components-review-v1',status:'components_tested_entry_pending',model_id:'gpt-5.6-sol',protocol_version:envelopeHttpProtocolVersion,decoderVersion:'offline-plan-reasoning-envelope-v1',sourcePins:Object.fromEntries(Object.entries(pins).sort(([a],[b])=>a.localeCompare(b))),fixtureHash:digest(raw),fixtureIsFictional:true,fixtureEgressApproved:false,dispatchEnabled:false,realTrialEntryAvailable:false,userApprovalRecorded:false,requiresFreshUserConsent:true,proposedMaxRuns:1,proposedMaxExternalIntents:3,proposedHeaderPolicy:'explicit-missing-only-complete-sse-v1',proposedReasoningPolicy:'validated_discard_only',proposedServerOutputTokenCap:null,extraCreditsApproved:false,apiFallback:false,failedDreamContinued:false,priorGrantReuse:false,pending:['durable_new_trial_grant_and_predecessor_binding','candidate_specific_closed_diagnostics','terminal_replay_and_expiry_in_trial_owner','native_protocol_generic_reader_admission','complete_trial_cli_synthetic_rehearsal'],realInferenceQualified:false,qualityAssessed:false};
}

// JSON/UTF-8 size audit of predefined fiction. Not a tokenizer or provider cost estimate.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { normalizeAppraisalScene } from '../src/appraisal-rehearsal.js';
import { neutral } from '../src/contract.js';
import { parseDeepSeekResponse } from '../src/deepseek-protocol.js';

const probes=JSON.parse(fs.readFileSync(new URL('../fixtures/appraisal-probes.json',import.meta.url)));
const providerOutputTokenCap=400,responseByteSafetyCeiling=providerOutputTokenCap*3;
const bytes = value => Buffer.byteLength(JSON.stringify(value),'utf8');
function admission(data) {
  try {
    // Synthetic usage exercises parser mechanics only; it is not a token count of data.
    parseDeepSeekResponse({status:200,body:{model:'deepseek-flash',choices:[{finish_reason:'stop',message:{role:'assistant',content:JSON.stringify(data)}}],usage:{prompt_tokens:0,completion_tokens:1,total_tokens:1}}},{model:'deepseek-flash',maxOutputTokens:providerOutputTokenCap});
    return 'accepted';
  } catch(error) {if (error.message==='provider_empty_or_oversized_content') return 'rejected_oversized';throw error;}
}
const results=probes.scenes.map(({id,event,appraisal,delta,basis})=>{
  const core={event,appraisal,delta},candidate={...core,basis};normalizeAppraisalScene(candidate,neutral());
  const result={id,coreJsonBytes:bytes(core),candidateJsonBytes:bytes(candidate),addedEvidenceBytes:bytes(candidate)-bytes(core),byteAdmission:admission(candidate),qualityAssessed:false};
  assert.equal(result.byteAdmission,'accepted');return result;
});
const quote='波'.repeat(160),maximal={event:quote,appraisal:{goalEffect:-1,control:0.2,uncertainty:0.8},delta:{valence:-0.1,arousal:0.1},
  basis:{goal:{goalExcerpt:quote,outcomeExcerpt:quote},controlExcerpt:quote,uncertaintyExcerpt:quote,affectExcerpt:quote}};
normalizeAppraisalScene(maximal,neutral());
const oversizedProbe={kind:'synthetic_bound_probe',individualExcerptCharacters:160,candidateJsonBytes:bytes(maximal),structureAccepted:true,byteAdmission:admission(maximal),semanticSupport:'not_assessed'};
assert.equal(oversizedProbe.byteAdmission,'rejected_oversized');
const boundaries=[responseByteSafetyCeiling-1,responseByteSafetyCeiling,responseByteSafetyCeiling+1].map(size=>{
  const data={padding:'x'.repeat(size-bytes({padding:''}))};assert.equal(bytes(data),size);
  return {jsonBytes:size,byteAdmission:admission(data)};
});
assert.deepEqual(boundaries.map(r=>r.byteAdmission),['accepted','accepted','rejected_oversized']);
console.log(JSON.stringify({command:'node scripts/audit-appraisal-output.mjs',node:process.version,platform:process.platform,
  providerOutputTokenCap,responseByteSafetyCeiling,units:'UTF-8 JSON bytes; not model tokens',actualModelTokenCount:null,
  realModelRequests:0,qualityAssessed:false,limitsChanged:false,results,oversizedProbe,boundaries},null,2));

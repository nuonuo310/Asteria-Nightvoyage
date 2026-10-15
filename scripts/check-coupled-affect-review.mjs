import fs from 'node:fs';
import assert from 'node:assert/strict';
import { reviewCoupledAffect } from '../src/coupled-affect-review.js';
import { prunedV2SourcePinsMatch } from '../src/pruned-v2-trial-config.js';
import { prunedV2ReviewedProposal } from '../src/pruned-v2-reviewed-profile.js';
const fixture=JSON.parse(fs.readFileSync(new URL('../fixtures/coupled-affect-review.json',import.meta.url))),previous=globalThis.fetch;
let networkCalls=0;
globalThis.fetch=()=>{networkCalls++;throw Error('offline only');};
try {
  const results=fixture.cases.map(c=>{
    const r=reviewCoupledAffect({materialKind:'fictional',origin:'dream',isRealityFact:false,before:{valence:0,arousal:0.2},flat:c.flat,coupled:c.coupled});
    assert.equal(r.flat.accepted,c.expected.flatAccepted,c.id);assert.equal(r.coupled.accepted,c.expected.coupledAccepted,c.id);
    assert.equal(r.flat.check,c.expected.flatCheck,c.id);assert.equal(r.coupled.check,c.expected.coupledCheck,c.id);
    if(r.flat.accepted&&r.coupled.accepted)assert.equal(r.normalizedEquivalent,true,c.id);
    return {caseId:c.id,...r};
  });
  assert.equal(networkCalls,0);
  assert.equal(prunedV2ReviewedProposal().protocolVersion,'compact-appraisal-quotes-v2-pruned-unused');
  console.log(JSON.stringify({command:'node scripts/check-coupled-affect-review.mjs',node:process.version,platform:process.platform,
    cases:results.length,realModelRequests:0,transportEnabled:false,persistentWrites:0,reconstructsRejectedResponse:false,
    liveSourcePinsUnchanged:prunedV2SourcePinsMatch(),modelComplianceImproved:'not_assessed',semanticSupport:'not_assessed',qualityAssessed:false,results},null,2));
}finally{globalThis.fetch=previous;}

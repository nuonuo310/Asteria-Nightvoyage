import fs from 'node:fs';
import assert from 'node:assert/strict';
import { reviewCoupledSizes } from '../src/coupled-size-review.js';
import { prunedV2SourcePinsMatch } from '../src/pruned-v2-trial-config.js';
import { prunedV2ReviewedProposal } from '../src/pruned-v2-reviewed-profile.js';
let nativeCalls=0;const previous=globalThis.fetch;
globalThis.fetch=()=>{nativeCalls++;throw Error('offline audit only');};
try {
  const result=reviewCoupledSizes({fixture:JSON.parse(fs.readFileSync(new URL('../fixtures/coupled-affect-review.json',import.meta.url))),seed:JSON.parse(fs.readFileSync(new URL('../fixtures/quality/sparse-context.json',import.meta.url)))});
  const [exact,over,maximal,escaped,astral,astralOver]=result.boundaries;
  assert.equal(exact.jsonBytes,1200);assert.equal(exact.passesBothGuards,true);assert.equal(over.jsonBytes,1201);assert.equal(over.shapeAccepted,true);assert.equal(over.jsonParserAccepted,false);
  for(const x of [maximal,escaped,astralOver]) {assert.equal(x.shapeAccepted,true);assert.equal(x.jsonParserAccepted,false);}
  assert.equal(astral.jsonBytes,1200);assert.equal(astral.passesBothGuards,true);assert.equal(result.requests.syntheticLargeRequiresPreDispatchRejection,true);assert.equal(nativeCalls,0);assert.equal(prunedV2ReviewedProposal().protocolVersion,'compact-appraisal-quotes-v2-pruned-unused');
  console.log(JSON.stringify({command:'node scripts/audit-coupled-affect-size.mjs',node:process.version,platform:process.platform,...result,liveSourcePinsUnchanged:prunedV2SourcePinsMatch()},null,2));
}finally{globalThis.fetch=previous;}

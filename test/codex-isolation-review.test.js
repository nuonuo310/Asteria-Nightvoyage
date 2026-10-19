import test from 'node:test';
import assert from 'node:assert/strict';
import {codexIsolationOverrides,reviewCodexConfigReply} from '../scripts/codex-isolation-review.mjs';
import {fictionalConfigReply} from '../test-support/codex-isolation-fixtures.mjs';
const review=value=>reviewCodexConfigReply(JSON.stringify(value));
test('matching configuration is metadata only and cannot admit inference or prove tool exclusion',()=>{
 const result=review(fictionalConfigReply());
 assert.equal(result.configuredControlsMatched,true);
 for(const key of ['dispatchEnabled','toolExclusionVerified','modelEntitlementVerified','qualityAssessed','rawMetadataReturned'])assert.equal(result[key],false);
});
test('read-only sandbox and never approval do not stand in for explicit feature observations',()=>{
 const reply=fictionalConfigReply();delete reply.result.config.features;
 const result=review(reply);
 assert.equal(result.controls.sandbox_mode,'matched');assert.equal(result.controls.approval_policy,'matched');
 assert.equal(result.controls.shell_tool,'unknown');assert.equal(result.configuredControlsMatched,false);
 reply.result.config.features={shell_tool:'false',apps:0,multi_agent:null};
 const malformed=review(reply);assert.equal(malformed.controls.shell_tool,'different');assert.equal(malformed.controls.apps,'different');
});
test('each enabled configured capability invalidates the matching-control observation',()=>{
 for(const key of ['shell_tool','apps','multi_agent','hooks','memories','goals']){
  const reply=fictionalConfigReply();reply.result.config.features[key]=true;
  assert.equal(review(reply).configuredControlsMatched,false,key);
 }
 const reply=fictionalConfigReply();reply.result.config.features.code_mode.enabled=true;
 assert.equal(review(reply).controls.code_mode,'different');
});
test('per-app overrides and even disabled MCP records are not treated as an empty integration configuration',()=>{
 const reply=fictionalConfigReply();reply.result.config.apps.fictional={enabled:true};
 assert.equal(review(reply).controls.app_overrides,'different');
 delete reply.result.config.apps.fictional;reply.result.config.mcp_servers.fictional={enabled:false};
 assert.equal(review(reply).controls.mcp_servers,'different');
 delete reply.result.config.mcp_servers;assert.equal(review(reply).controls.mcp_servers,'unknown');
});
test('raw config, origins, arbitrary values, identities and authority claims never escape review',()=>{
 const reply=fictionalConfigReply(),sentinel='fictional-private-sentinel';
 reply.result.origins={path:sentinel};reply.result.config.token=sentinel;
 reply.result.config.web_search=sentinel;reply.result.config.model=sentinel;
 reply.dispatchEnabled=true;reply.toolExclusionVerified=true;
 const text=JSON.stringify(review(reply));assert.ok(!text.includes(sentinel));
 assert.equal(review(reply).dispatchEnabled,false);assert.equal(review(reply).controls.web_search,'different');
});
test('malformed envelopes, unexpected IDs, RPC errors and oversized input reject with fixed messages',()=>{
 for(const value of ['not-json','null','[]','{"id":2,"result":null}',JSON.stringify({...fictionalConfigReply(),id:3}),JSON.stringify({...fictionalConfigReply(),error:{message:'fictional-secret'}}),' '.repeat(65537)]){
  assert.throws(()=>reviewCodexConfigReply(value),{message:'codex_config_review_rejected'});
 }
});
test('objects are never coerced, inherited keys never provide missing controls, and results are detached',()=>{
 let invoked=false;assert.throws(()=>reviewCodexConfigReply({toString(){invoked=true;return '{}';}}));assert.equal(invoked,false);
 const reply=fictionalConfigReply();delete reply.result.config.features.shell_tool;reply.result.config.features.__proto__={shell_tool:false};
 assert.equal(review(reply).controls.shell_tool,'unknown');
 const first=review(fictionalConfigReply());first.controls.shell_tool='different';assert.equal(review(fictionalConfigReply()).configuredControlsMatched,true);
});
test('override list is a detached launch candidate without command, endpoint, credentials or authority switches',()=>{
 const overrides=codexIsolationOverrides();assert.ok(overrides.includes('features.shell_tool=false'));assert.ok(overrides.includes('web_search="disabled"'));
 assert.ok(!overrides.some(value=>/token|key|base_url|provider|executable|unified_exec/.test(value)));
 overrides.push('fictional');assert.ok(!codexIsolationOverrides().includes('fictional'));
});

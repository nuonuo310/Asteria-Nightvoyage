import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewCodexLocalRequest as review} from '../scripts/codex-request-tool-review.mjs';
const bytes=value=>Buffer.from(JSON.stringify(value));
const tool=name=>({type:'function',name,parameters:{type:'object'},description:'fictional-private-schema'});
const request=tools=>({model:'gpt-5.6-sol',input:'fictional-private-prompt',tools});
test('explicit empty tool declaration is only per-request metadata and never grants inference',()=>{
 const r=review(bytes(request([])));assert.equal(r.toolCount,0);assert.equal(r.toolExposureStatus,'no_tools_declared');
 assert.equal(r.toolInventoryReviewed,true);assert.equal(r.toolChoice,'unknown');
 for(const key of ['dispatchEnabled','toolExclusionVerified','handlerDenialVerified','modelEntitlementVerified','requestBodyReturned','toolSchemasReturned'])assert.equal(r[key],false);
});
test('known tools and hosted web declarations become fixed classes, not body, schema or names',()=>{
 const r=review(bytes(request([tool('apply_patch'),tool('exec_command'),tool('view_image'),{type:'web_search'}])));
 assert.equal(r.toolCount,4);assert.deepEqual(r.toolClasses,['file_edit','file_read','shell','web']);
 assert.equal(r.toolExposureStatus,'tools_declared');assert.ok(!JSON.stringify(r).includes('fictional-private'));assert.ok(!JSON.stringify(r).includes('apply_patch'));
});
test('missing tools, unknown functions and unknown hosted types cannot impersonate empty inventory',()=>{
 const missing=review(bytes({model:'gpt-5.6-sol'}));assert.equal(missing.toolInventoryReviewed,false);assert.equal(missing.toolExposureStatus,'unknown');
 for(const t of [tool('fictional_private_tool'),{type:'fictional_private_hosted'}]){
  const r=review(bytes(request([t])));assert.equal(r.toolInventoryReviewed,false);assert.equal(r.unknownToolCount,1);assert.ok(!JSON.stringify(r).includes('fictional_private'));
 }
});
test('namespaced tools keep their authority boundary and never trust a familiar leaf under another namespace',()=>{
 const r=review(bytes(request([{type:'namespace',name:'functions',tools:[tool('view_image')]}])));assert.equal(r.namespaceCount,1);assert.equal(r.toolInventoryReviewed,true);
 const empty=review(bytes(request([{type:'namespace',name:'fictional_private_namespace',tools:[]}])));assert.equal(empty.toolInventoryReviewed,false);assert.equal(empty.unknownNamespaceCount,1);
 const unknown=review(bytes(request([{type:'namespace',name:'fictional_private_namespace',tools:[tool('view_image')]}])));assert.equal(unknown.toolInventoryReviewed,false);assert.equal(unknown.unknownToolCount,1);
});
test('malformed JSON, model substitution, byte limits, duplicate identities and invalid tool shapes fail closed',()=>{
 for(const value of [Buffer.from('{'),Buffer.from([0xff]),Buffer.alloc(262145)])assert.throws(()=>review(value),/codex_request_review_rejected/);
 for(const value of [{model:'other',tools:[]},null,request(null),request([tool('view_image'),tool('view_image')]),request([{type:'function',name:'bad',parameters:null}]),request([{type:'namespace',name:'n',tools:null}]),request([{type:'custom',name:'n'}])])assert.throws(()=>review(bytes(value)),/codex_request_review_rejected/);
});
test('tool and namespace ceilings reject nested or excessive inventories',()=>{
 assert.throws(()=>review(bytes(request(Array.from({length:129},(_,i)=>tool('n'+i))))));
 let t=tool('view_image');for(let i=0;i<4;i++)t={type:'namespace',name:'n',tools:[t]};assert.throws(()=>review(bytes(request([t]))));
});

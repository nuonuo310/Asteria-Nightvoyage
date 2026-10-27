import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {EventEmitter} from 'node:events';
import {fileURLToPath} from 'node:url';
import {hash} from '../src/contract.js';
import {buildRichSampleRequest,richSampleFixedSnapshot} from '../scripts/nv-rich-fictional-dream-sample-01/protocol.mjs';
import {readPhaseBRelease,validatePhaseBRelease} from '../scripts/nv-rich-fictional-dream-sample-01/phase-b/release.mjs';
import {verifyPhaseBIdentity} from '../scripts/nv-rich-fictional-dream-sample-01/phase-b/identity.mjs';
import {verifyPhaseBPriceEvidence} from '../scripts/nv-rich-fictional-dream-sample-01/phase-b/price-check.mjs';
import {createDeepSeekTransport} from '../scripts/nv-rich-fictional-dream-sample-01/phase-b/transport.mjs';
import {
  phaseAHead,phaseAIdentityHash,phaseAParent,phaseAPriceSnapshotHash,phaseAPromptHash,
  phaseASourceHash,phaseATree,phaseBAllowanceCapMicroCny,phaseBExpectedReleaseHash,
  phaseBStoreDirectory,phaseBTransportEndpoint
} from '../scripts/nv-rich-fictional-dream-sample-01/phase-b/config.mjs';

const root=fileURLToPath(new URL('..',import.meta.url));
const packageDirectory=path.join(root,'scripts/nv-rich-fictional-dream-sample-01');
const releaseObject=()=>({status:'approved_once',phaseAHead,phaseATree,identityHash:phaseAIdentityHash,
  promptHash:phaseAPromptHash,sourceHash:phaseASourceHash,priceSnapshotHash:phaseAPriceSnapshotHash,
  allowanceCapMicroCny:phaseBAllowanceCapMicroCny,maxRuns:3,maxCalls:12,
  storeDirectory:phaseBStoreDirectory,noRetry:true});
const temporary=()=>fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-rich-sample-phase-b-'));

test('R1 release object is exact and independently hash-pinned',t=>{
  const directory=temporary();t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
  const file=path.join(directory,'release.json'),release=releaseObject();
  assert.equal(hash(release),phaseBExpectedReleaseHash);
  assert.deepEqual(validatePhaseBRelease(release),release);
  fs.writeFileSync(file,JSON.stringify(release));
  assert.deepEqual(readPhaseBRelease(file),release);
  fs.writeFileSync(file,JSON.stringify({...release,maxCalls:13}));
  assert.throws(()=>readPhaseBRelease(file),/rich_sample_phase_b_release_mismatch/);
  assert.throws(()=>readPhaseBRelease(path.join(directory,'missing.json')),/rich_sample_phase_b_release_required/);
});

test('Phase B identity pins new files while preserving Phase A identity',t=>{
  const value=verifyPhaseBIdentity();
  assert.equal(value.phaseAIdentityHash,phaseAIdentityHash);
  assert.equal(value.phaseBIdentityHash,'3be74c80ff49d60a7b72b8057142db1abaeee44f2d838a6b4bc6a79fb4a89927');
  assert.equal(value.executionFiles,9);
  const directory=temporary();t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
  const copy=path.join(directory,'package');fs.cpSync(packageDirectory,copy,{recursive:true});
  fs.writeFileSync(path.join(copy,'phase-b','unlisted.mjs'),'export const hidden=true;\n');
  assert.throws(()=>verifyPhaseBIdentity({packageDirectory:path.join(copy,'phase-b'),repositoryRoot:root}),
    /invalid_rich_sample_phase_b_identity/);
});

test('price evidence accepts only the reviewed flash rates and unexpired window',t=>{
  const directory=temporary();t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
  const file=path.join(directory,'pricing.html');
  const html='<table><tr><td>模型</td><td>deepseek-flash<sup>(1)</sup></td><td>deepseek-v4-pro</td></tr>'
    +'<tr><td>模型版本</td><td>DeepSeek-V4.1-Flash-1017</td><td>DeepSeek-V4-Pro-0813</td></tr>'
    +'<tr><td>百万tokens输入<br>（缓存未命中）</td><td>空闲时段</td><td>1元</td><td>4.5元</td></tr>'
    +'<tr><td>高峰时段</td><td>2元</td><td>9.0元</td></tr>'
    +'<tr><td>百万tokens输出</td><td>空闲时段</td><td>4元</td><td>13.5元</td></tr>'
    +'<tr><td>高峰时段</td><td>8元</td><td>27.0元</td></tr></table>';
  fs.writeFileSync(file,html);
  const value=verifyPhaseBPriceEvidence(file,{now:Date.parse('2026-10-27T12:00:00Z')});
  assert.equal(value.modelAlias,'deepseek-flash');assert.equal(value.peakInputMicroCnyPerMillion,2000000);
  assert.equal(value.peakOutputMicroCnyPerMillion,8000000);
  fs.writeFileSync(file,html.replace('<td>2元</td>','<td>3元</td>'));
  assert.throws(()=>verifyPhaseBPriceEvidence(file,{now:Date.parse('2026-10-27T12:00:00Z')}),
    /rich_sample_price_page_changed/);
  assert.throws(()=>verifyPhaseBPriceEvidence(file,{now:Date.parse('2026-10-28T00:00:00Z')}),
    /rich_sample_price_snapshot_expired/);
});

function fakeRequest({status=200,contentType='application/json; charset=utf-8',body,echo=false}={}){
  const calls=[];
  const requestImpl=(url,options,callback)=>{
    const request=new EventEmitter();
    request.setTimeout=()=>{};
    request.destroy=()=>{};
    request.end=payload=>{
      calls.push({url:url.href,options,payload:Buffer.from(payload).toString('utf8')});
      const response=new EventEmitter();
      response.statusCode=status;response.headers={'content-type':contentType};response.resume=()=>{};
      callback(response);
      queueMicrotask(()=>{
        if(status===200)response.emit('data',Buffer.from(JSON.stringify(echo?{echo:'DUMMY-KEY'}:body)));
        response.emit('end');
      });
    };
    return request;
  };
  return {calls,requestImpl};
}

test('live transport makes one fixed POST without putting the key in the body',async()=>{
  const request=buildRichSampleRequest({snapshot:richSampleFixedSnapshot(),scenes:[],stage:'scene',index:0});
  const fake=fakeRequest({body:{model:'deepseek-flash',choices:[],usage:{}}}),transport=createDeepSeekTransport('DUMMY-KEY',{requestImpl:fake.requestImpl});
  const response=await transport(request,{signal:new AbortController().signal});
  assert.equal(response.status,200);assert.equal(fake.calls.length,1);
  assert.equal(fake.calls[0].url,phaseBTransportEndpoint);
  assert.equal(fake.calls[0].options.method,'POST');
  assert.equal(fake.calls[0].options.headers.Authorization,'Bearer DUMMY-KEY');
  assert.equal(JSON.parse(fake.calls[0].payload).model,'deepseek-flash');
  assert.equal(fake.calls[0].payload.includes('DUMMY-KEY'),false);
});

test('live transport does not read non-200 bodies and rejects key echo',async()=>{
  const request=buildRichSampleRequest({snapshot:richSampleFixedSnapshot(),scenes:[],stage:'scene',index:0});
  const unauthorized=fakeRequest({status:401});
  const response=await createDeepSeekTransport('DUMMY-KEY',{requestImpl:unauthorized.requestImpl})(request,{});
  assert.deepEqual(response,{status:401});
  const echoed=fakeRequest({status:200,echo:true});
  await assert.rejects(()=>createDeepSeekTransport('DUMMY-KEY',{requestImpl:echoed.requestImpl})(request,{}),
    /provider_response_echoed_credential/);
});

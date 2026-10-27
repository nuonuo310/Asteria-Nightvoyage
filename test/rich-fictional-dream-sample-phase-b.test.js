import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {PassThrough} from 'node:stream';
import {EventEmitter} from 'node:events';
import {fileURLToPath} from 'node:url';
import {hash} from '../src/contract.js';
import {buildRichSampleRequest,richSampleFixedSnapshot} from '../scripts/nv-rich-fictional-dream-sample-01/protocol.mjs';
import {readPhaseBRelease,validatePhaseBRelease} from '../scripts/nv-rich-fictional-dream-sample-01/phase-b/release.mjs';
import {verifyPhaseBIdentity} from '../scripts/nv-rich-fictional-dream-sample-01/phase-b/identity.mjs';
import {verifyPhaseBPriceEvidence} from '../scripts/nv-rich-fictional-dream-sample-01/phase-b/price-check.mjs';
import {createDeepSeekTransport} from '../scripts/nv-rich-fictional-dream-sample-01/phase-b/transport.mjs';
import {launchPhaseB} from '../scripts/nv-rich-fictional-dream-sample-01/phase-b/launcher.mjs';
import {runSecureConsole} from '../scripts/nv-rich-fictional-dream-sample-01/phase-b/secure-console.mjs';
import {verifyDedicatedStoreContract} from '../scripts/nv-rich-fictional-dream-sample-01/phase-b/check-admission.mjs';
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
  assert.equal(phaseBExpectedReleaseHash,'b60cd22b14ced7409e07742600b06a544acddff4f79430419b01404a605b9f26');
  assert.equal(hash(release),phaseBExpectedReleaseHash);
  assert.deepEqual(validatePhaseBRelease(release),release);
  fs.writeFileSync(file,JSON.stringify(release));
  assert.deepEqual(readPhaseBRelease(file),release);
  fs.writeFileSync(file,JSON.stringify({...release,maxCalls:13}));
  assert.throws(()=>readPhaseBRelease(file),/rich_sample_phase_b_release_mismatch/);
  assert.throws(()=>readPhaseBRelease(path.join(directory,'missing.json')),/rich_sample_phase_b_release_required/);
});

test('R3 fixed Store matches the frozen dedicated prefix and survives a real temporary Store lifecycle',t=>{
  assert.equal(phaseBStoreDirectory,
    'C:\\Users\\Administrator\\AppData\\Local\\Nightvoyage\\nightvoyage-rich-dream-sample-01');
  assert.equal(path.basename(phaseBStoreDirectory),'nightvoyage-rich-dream-sample-01');
  assert.ok(path.basename(phaseBStoreDirectory).startsWith('nightvoyage-rich-dream-sample-'));
  const temporaryRoot=temporary();t.after(()=>fs.rmSync(temporaryRoot,{recursive:true,force:true}));
  const proof=verifyDedicatedStoreContract({temporaryRoot});
  assert.equal(proof.basename,'nightvoyage-rich-dream-sample-01');
  assert.equal(proof.prefix,'nightvoyage-rich-dream-sample-');
  assert.equal(proof.constructed,true);
  assert.equal(proof.ownerLockObserved,true);
  assert.equal(proof.closed,true);
  assert.equal(proof.deleted,true);
  assert.equal(proof.simulatorCalls,0);
  assert.equal(proof.networkAttempts,0);
  assert.deepEqual(fs.readdirSync(temporaryRoot),[]);
  const wrongRoot=temporary();t.after(()=>fs.rmSync(wrongRoot,{recursive:true,force:true}));
  assert.throws(()=>verifyDedicatedStoreContract({directory:path.join(wrongRoot,'rich-fictional-dream-sample-01')}),
    /rich_sample_dedicated_store_required/);
});

test('Phase B identity pins new files while preserving Phase A identity',t=>{
  const value=verifyPhaseBIdentity();
  assert.equal(value.phaseAIdentityHash,phaseAIdentityHash);
  assert.equal(value.phaseBIdentityHash,'03bac475b3490f40d4e013aa4fdd21242d5d8e9bc86eba955bdd6f6f3c4d6494');
  assert.equal(value.executionFiles,11);
  const manifest=JSON.parse(fs.readFileSync(path.join(packageDirectory,'phase-b','identity.json'),'utf8'));
  assert.equal(typeof manifest.executionFiles['secure-console.mjs'],'string');
  assert.equal(typeof manifest.executionFiles['secure-input.ps1'],'string');
  const directory=temporary();t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
  const copy=path.join(directory,'package');fs.cpSync(packageDirectory,copy,{recursive:true});
  fs.writeFileSync(path.join(copy,'phase-b','unlisted.ps1'),'Write-Host hidden\n');
  assert.throws(()=>verifyPhaseBIdentity({packageDirectory:path.join(copy,'phase-b'),repositoryRoot:root}),
    /invalid_rich_sample_phase_b_identity/);
});

test('core launcher refuses run without explicit supplier and has no environment fallback',async()=>{
  const source=fs.readFileSync(path.join(packageDirectory,'phase-b','launcher.mjs'),'utf8');
  assert.equal(source.includes('process.env'),false);
  assert.equal(source.includes('NIGHTVOYAGE_DEEPSEEK_KEY'),false);
  const previous=process.env.NIGHTVOYAGE_DEEPSEEK_KEY;
  process.env.NIGHTVOYAGE_DEEPSEEK_KEY='DUMMY-ENV-ONLY-SENTINEL';
  try{
    const result=await launchPhaseB('run',{priceFile:'C:\\dummy\\pricing.html'});
    assert.equal(result.status,'blocked');
    assert.equal(result.reason,'rich_sample_credential_source_unavailable');
    assert.equal(result.credentialSupplierCalls,0);
    assert.equal(result.networkAttempts,0);
    assert.equal(result.storeCreated,false);
    assert.equal(JSON.stringify(result).includes('DUMMY-ENV-ONLY-SENTINEL'),false);
  }finally{
    if(previous===undefined)delete process.env.NIGHTVOYAGE_DEEPSEEK_KEY;
    else process.env.NIGHTVOYAGE_DEEPSEEK_KEY=previous;
  }
});

test('secure console reads one dummy frame only after the explicit supplier call',async()=>{
  const input=new PassThrough();let key;
  const result=await runSecureConsole({priceFile:path.join(root,'package.json'),input,launch:async(action,{credentialSupplier})=>{
    assert.equal(action,'run');
    assert.equal(typeof credentialSupplier,'function');
    assert.equal(input.listenerCount('data'),0);
    const pending=credentialSupplier();
    assert.equal(input.listenerCount('data'),1);
    input.end(JSON.stringify({credential:'DUMMY-FRAME-ONLY'}));
    key=await pending;
    assert.throws(()=>credentialSupplier(),/rich_sample_credential_frame_repeated/);
    return {status:'dummy_completed',credentialSupplierCalls:1};
  }});
  assert.equal(key,'DUMMY-FRAME-ONLY');
  assert.equal(JSON.stringify(result).includes('DUMMY-FRAME-ONLY'),false);
});

test('PowerShell secure entry prompts once only after admission and keeps the key out of env argv files and output',()=>{
  const ps=fs.readFileSync(path.join(packageDirectory,'phase-b','secure-input.ps1'),'utf8');
  const launcher=fs.readFileSync(path.join(packageDirectory,'phase-b','launcher.mjs'),'utf8');
  const prompts=ps.match(/Read-Host\s+'DeepSeek API Key'\s+-AsSecureString/g)??[];
  assert.equal(prompts.length,1);
  assert.equal(ps.includes('NIGHTVOYAGE_DEEPSEEK_KEY'),false);
  assert.equal(ps.includes('Get-Clipboard'),false);
  assert.equal(ps.includes('Set-Content'),false);
  assert.equal(ps.includes('$env:'),false);
  assert.equal(ps.includes('Write-Output $plain'),false);
  assert.equal(ps.includes('Write-Host $plain'),false);
  const admission=ps.indexOf('check-admission.mjs'),ready=ps.indexOf('READY_FOR_ONE_LIVE_BATCH'),prompt=ps.indexOf('Read-Host');
  assert.ok(admission>=0&&admission<prompt);
  assert.ok(ready>=0&&ready<prompt);
  assert.ok(ps.includes('SecureStringToBSTR'));
  assert.ok(ps.includes('ZeroFreeBSTR'));
  assert.ok(ps.includes('nightvoyage-rich-dream-sample-01'));
  assert.ok(ps.includes('$check.storeContract.constructed'));
  assert.ok(ps.includes('$check.storeContract.closed'));
  assert.ok(ps.includes('$check.storeContract.deleted'));
  const proofCheck=ps.indexOf('$check.storeContract.constructed');
  assert.ok(proofCheck>=0&&proofCheck<prompt);
  assert.equal(ps.includes('Nightvoyage\\rich-fictional-dream-sample-01'),false);
  assert.equal(ps.includes('Nightvoyage\\\\rich-fictional-dream-sample-01'),false);
  assert.ok(ps.includes('RedirectStandardInput = $true'));
  assert.ok(ps.includes('StandardInput.BaseStream.Write'));
  assert.ok(ps.includes('if ($releasePrepared)'));
  assert.ok(ps.includes('Remove-Item -LiteralPath $releasePath'));
  assert.ok(launcher.includes("if(action==='run')revokePhaseBRelease(phaseBReleasePath);"));
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

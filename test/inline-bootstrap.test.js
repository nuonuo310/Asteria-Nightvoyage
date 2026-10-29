import {runLegacySuite as runLegacySuiteR1} from '../test-support/legacy-source-view.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {hash} from '../src/contract.js';
import {Store} from '../src/store.js';
import {inlineChildEnvironment} from '../src/inline-stub-launcher.js';
import {prepareAuthorizedHistory} from '../test-support/inline-authorization-fixtures.js';
const legacyDelegatedR1=runLegacySuiteR1(import.meta.url);
if(!legacyDelegatedR1){
const root=fileURLToPath(new URL('..',import.meta.url));
const cli=fileURLToPath(new URL('../src/inline-stub-launcher.js',import.meta.url));
function run(directory,command='run',project=root,environment={}){
  return spawnSync(process.execPath,[path.join(project,'src/inline-stub-launcher.js'),command,'--data-dir',directory],{encoding:'utf8',timeout:20000,env:{...process.env,...environment}});
}
function project(t){const d=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-bootstrap-project-'));t.after(()=>fs.rmSync(d,{recursive:true,force:true}));for(const p of ['src','fixtures','package.json'])fs.cpSync(path.join(root,p),path.join(d,p),{recursive:true});return d;}
test('child environment drops keys, Node flags, proxy, module lookup and arbitrary app configuration',()=>{
  const input={SystemRoot:'C:\\Windows',TEMP:'C:\\Temp',LANG:'en_US.UTF-8',NODE_OPTIONS:'--import=private',NODE_PATH:'private',NIGHTVOYAGE_DEEPSEEK_KEY:'DUMMY-SENTINEL',HTTPS_PROXY:'private',HOME:'private',TMP:'bad\0path'};
  const portable={SystemRoot:'C:\\Windows',TEMP:'C:\\Temp',LANG:'en_US.UTF-8'};
  // Literal policy expectations: do not derive the expected result from the implementation.
  const windows={...portable,HOMEDRIVE:'',HOMEPATH:'',LOGONSERVER:'',PATH:'',USERDOMAIN:'',USERNAME:'',USERPROFILE:'',SYSTEMDRIVE:'',WINDIR:''};
  assert.deepEqual(inlineChildEnvironment(input,{platform:'linux'}),portable);
  assert.deepEqual(inlineChildEnvironment(input,{platform:'win32'}),windows);
  assert.deepEqual(inlineChildEnvironment(input),process.platform==='win32'?windows:portable);
});
test('clean child loads constrained runtime, persists three synthetic stages and replays with zero new calls',t=>{
  const {directory,oldAccounts}=prepareAuthorizedHistory(t);const first=run(directory);assert.equal(first.status,0,first.stderr);const value=JSON.parse(first.stdout);assert.equal(value.status,'completed');assert.equal(value.stubCalls,3);assert.equal(value.settledRows,3);assert.equal(value.nativeRequests,0);assert.equal(value.credentialReads,0);assert.equal(value.environmentAllowlisted,true);assert.equal(value.isRealityFact,false);assert.equal(value.qualityAssessed,false);
  const second=run(directory);assert.equal(second.status,0,second.stderr);assert.equal(JSON.parse(second.stdout).stubCalls,0);
  const s=new Store(directory);try{for(const [id,a]of Object.entries(oldAccounts))assert.deepEqual(s.state.billing.accounts[id],a);assert.ok(Object.values(s.state.entries).some(e=>e.origin==='dream'));}finally{s.close();}
});
test('launch ignores inherited execArgv and strips hostile preload configuration before spawning runtime',t=>{
  const {directory}=prepareAuthorizedHistory(t),sentinel=path.join(directory,'must-not-exist');
  const preload=path.join(directory,'preload.cjs');fs.writeFileSync(preload,`require('node:fs').writeFileSync(${JSON.stringify(sentinel)},'executed');`);
  const code=`import {launchInlineStub} from ${JSON.stringify(new URL('../src/inline-stub-launcher.js',import.meta.url).href)};process.env.NODE_OPTIONS=${JSON.stringify('--require='+preload)};process.env.NIGHTVOYAGE_DEEPSEEK_KEY='DUMMY-PRIVATE-KEY-SENTINEL';process.env.HTTPS_PROXY='DUMMY-PRIVATE-PROXY-SENTINEL';process.execArgv.push('--require='+${JSON.stringify(preload)});console.log(JSON.stringify(await launchInlineStub('run',${JSON.stringify(directory)})));`;
  const r=spawnSync(process.execPath,['--input-type=module','-e',code],{encoding:'utf8',timeout:20000});assert.equal(r.status,0,r.stderr);assert.equal(fs.existsSync(sentinel),false);assert.ok(!r.stdout.includes('SENTINEL'));assert.equal(JSON.parse(r.stdout).stubCalls,3);
});
test('missing path or authorization cannot create Store files or expose parser details',t=>{
  const d=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-bootstrap-empty-'));t.after(()=>fs.rmSync(d,{recursive:true,force:true}));const absent=path.join(d,'absent');assert.equal(run(absent).status,1);assert.equal(fs.existsSync(absent),false);fs.writeFileSync(path.join(d,'state.json'),'PRIVATE-MALFORMED-SENTINEL');const before=fs.readFileSync(path.join(d,'state.json'));const r=run(d);assert.equal(r.status,1);assert.equal(r.stderr.trim(),'stub_bootstrap_refused');assert.equal(r.stdout,'');assert.deepEqual(fs.readFileSync(path.join(d,'state.json')),before);assert.equal(fs.existsSync(path.join(d,'owner.lock')),false);
});
for(const change of ['source','extra-source','graph','review-flags','symlink'])test(`bootstrap rejects ${change} before opening existing authorized Store`,t=>{
  const p=project(t),{directory}=prepareAuthorizedHistory(t),before=fs.readFileSync(path.join(directory,'state.json'));
  if(change==='source')fs.appendFileSync(path.join(p,'src/inline-stub-session.js'),'\nglobalThis.UNREVIEWED=true;');
  if(change==='extra-source')fs.writeFileSync(path.join(p,'src/unreviewed.js'),'throw Error("PRIVATE-SENTINEL")');
  if(change==='graph')fs.writeFileSync(path.join(p,'src/inline-bootstrap-graph.json'),'{}');
  if(change==='review-flags'){const f=path.join(p,'src/inline-entry-review.json'),v=JSON.parse(fs.readFileSync(f));v.paidEvaluationApproved=true;fs.writeFileSync(f,JSON.stringify(v));}
  if(change==='symlink'){const f=path.join(p,'src/inline-stub-session.js');fs.renameSync(f,f+'.original');fs.symlinkSync(f+'.original',f);}
  const r=run(directory,'run',p);assert.equal(r.status,1);assert.equal(r.stdout,'');assert.equal(r.stderr.trim(),'stub_bootstrap_refused');assert.deepEqual(fs.readFileSync(path.join(directory,'state.json')),before);assert.equal(fs.existsSync(path.join(directory,'owner.lock')),false);
});
test('direct worker with inherited credential environment refuses before opening Store',t=>{
  const {directory}=prepareAuthorizedHistory(t),before=fs.readFileSync(path.join(directory,'state.json'));const r=spawnSync(process.execPath,['--experimental-vm-modules',path.join(root,'src/inline-stub-worker.js'),'run',directory],{encoding:'utf8',timeout:15000,env:{NIGHTVOYAGE_DEEPSEEK_KEY:'PRIVATE-SENTINEL'}});assert.equal(r.status,1);assert.equal(r.stderr.trim(),'stub_bootstrap_refused');assert.deepEqual(fs.readFileSync(path.join(directory,'state.json')),before);
});
test('resume never implicitly starts a run and live/init/arbitrary transport options are absent',t=>{
  const {directory}=prepareAuthorizedHistory(t);assert.equal(run(directory,'resume').status,1);let s=new Store(directory);try{assert.equal(Object.keys(s.state.requests).includes('inline-controlled-stub-authorization'),false);}finally{s.close();}
  for(const args of [['init'],['run','--live'],['run','--data-dir',directory,'--transport','arbitrary'],['run','--data-dir','relative']]){const r=spawnSync(process.execPath,[cli,...args],{encoding:'utf8',timeout:15000});assert.equal(r.status,1);assert.ok(!r.stderr.includes('PRIVATE'));}
});
for(const point of ['scene_saved','dispatched'])test(`fresh-process ${point} death is recovered only within the saved authorization`,t=>{
  const {directory}=prepareAuthorizedHistory(t);
  const code=`import {InlineAuthorizedStubRuntime} from ${JSON.stringify(new URL('../src/inline-authorized-runtime.js',import.meta.url).href)};import {authorizedTransport} from ${JSON.stringify(new URL('../test-support/inline-authorization-fixtures.js',import.meta.url).href)};const e=new InlineAuthorizedStubRuntime(${JSON.stringify(directory)},{enabled:true,fetchImpl:authorizedTransport,fault:p=>{if(p===${JSON.stringify(point)})process.exit(8);}});await e.execute(e.start());`;
  const dead=spawnSync(process.execPath,['--input-type=module','-e',code],{encoding:'utf8',timeout:15000});assert.equal(dead.status,8,dead.stderr);
  const r=run(directory,'resume');
  if(point==='scene_saved'){assert.equal(r.status,0,r.stderr);const v=JSON.parse(r.stdout);assert.equal(v.status,'completed');assert.equal(v.stubCalls,2);assert.equal(v.settledRows,3);assert.equal(JSON.parse(run(directory).stdout).stubCalls,0);}
  else{assert.equal(r.status,1);const s=new Store(directory);try{const rows=Object.values(s.state.billing.accounts['inline-evidence-dream-trial-candidate'].attempts);assert.equal(rows.length,1);assert.equal(rows[0].status,'unknown');assert.equal(rows[0].chargedMicroCny,'2203200');}finally{s.close();}}
});
for(const kind of ['revoked','expired','withdrawn','busy','old-history'])test(`bootstrap cannot dispatch through ${kind} authorization/history`,t=>{
  const {directory}=prepareAuthorizedHistory(t);const s=new Store(directory);try{
    if(kind==='revoked'){s.state.inlineEntryAuthorization.status='revoked';s.save();}
    if(kind==='expired'){const r=s.state.inlineEntryAuthorization;r.terms.createdAt=1;r.terms.expiresAt=1001;r.terms.allowance.expiresAt=1001;r.termsHash=hash(r.terms);const a=s.state.billing.accounts['inline-evidence-dream-trial-candidate'];a.allowance=structuredClone(r.terms.allowance);a.fingerprint=hash(a.allowance);s.save();}
    if(kind==='withdrawn')s.withdraw('q-sparse-memory');
    if(kind==='old-history'){s.state.billing.accounts['quality-screen-20261015'].fingerprint='a'.repeat(64);s.save();}
    if(kind==='busy'){assert.equal(run(directory).status,1);return;}
  }finally{s.close();}
  assert.equal(run(directory).status,1);const after=new Store(directory);try{assert.equal(Object.keys(after.state.billing.accounts['inline-evidence-dream-trial-candidate'].attempts).length,0);}finally{after.close();}
});
}

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {inlineChildEnvironment,assertInlineChildEnvironment} from '../src/inline-child-environment.js';
const windowsEmpty=['HOMEDRIVE','HOMEPATH','LOGONSERVER','PATH','USERDOMAIN','USERNAME','USERPROFILE'];
test('Windows launcher fills every libuv-required name without reading private profile, PATH or key',()=>{
  const raw={SystemRoot:'C:\\Windows',WINDIR:'C:\\Windows',TEMP:'C:\\Temp',TMP:'C:\\Temp',SYSTEMDRIVE:'C:'};
  for(const k of [...windowsEmpty,'NODE_OPTIONS','NODE_PATH','NIGHTVOYAGE_DEEPSEEK_KEY','HTTPS_PROXY'])Object.defineProperty(raw,k,{enumerable:true,get(){throw Error('PRIVATE-GETTER');}});
  const value=inlineChildEnvironment(raw,{platform:'win32'});for(const k of windowsEmpty)assert.equal(value[k],'');assert.equal(value.SYSTEMDRIVE,'C:');assert.equal(value.SystemRoot,'C:\\Windows');assert.equal(value.NIGHTVOYAGE_DEEPSEEK_KEY,undefined);
  for(const k of ['HOMEDRIVE','HOMEPATH','LOGONSERVER','PATH','SYSTEMDRIVE','SYSTEMROOT','TEMP','USERDOMAIN','USERNAME','USERPROFILE','WINDIR'])assert.ok(Object.keys(value).some(n=>n.toUpperCase()===k));
});
test('Windows worker accepts only empty unwanted placeholders and clears them before loading core',()=>{
  const env=inlineChildEnvironment({SystemRoot:'C:\\Windows',SystemDrive:'D:'},{platform:'win32'});assert.equal(assertInlineChildEnvironment(env,{platform:'win32'}).environmentAllowlisted,true);for(const k of windowsEmpty)assert.equal(Object.hasOwn(env,k),false);assert.equal(env.SYSTEMDRIVE,'D:');
});
test('Windows OS-name case differences do not expand the policy',()=>{
  const env={systemroot:'C:\\Windows',SystemDrive:'C:',Path:'',UserProfile:'',windir:'C:\\Windows'};assert.doesNotThrow(()=>assertInlineChildEnvironment(env,{platform:'win32'}));assert.equal(Object.hasOwn(env,'Path'),false);assert.equal(Object.hasOwn(env,'UserProfile'),false);assert.equal(env.systemroot,'C:\\Windows');
});
for(const name of windowsEmpty)test(`nonempty Windows ${name} remains refused without echo or blanket stripping`,()=>{
  const env=inlineChildEnvironment({}, {platform:'win32'});env[name]='PRIVATE-SENTINEL';assert.throws(()=>assertInlineChildEnvironment(env,{platform:'win32'}),/^Error: inline_child_environment_refused$/);assert.equal(env[name],'PRIVATE-SENTINEL');
});
for(const name of ['NIGHTVOYAGE_DEEPSEEK_KEY','NODE_OPTIONS','NODE_PATH','HTTPS_PROXY','UNREVIEWED_SETTING'])test(`Windows normalization never admits ${name}, even empty, and never reads its value`,()=>{
  const env=inlineChildEnvironment({}, {platform:'win32'});let reads=0;Object.defineProperty(env,name,{enumerable:true,get(){reads++;throw Error('PRIVATE');}});assert.throws(()=>assertInlineChildEnvironment(env,{platform:'win32'}),/inline_child_environment_refused/);assert.equal(reads,0);assert.ok(Object.hasOwn(env,'PATH'));
});
test('invalid system drive, oversized values and NUL values are refused',()=>{
  for(const env of [{SYSTEMDRIVE:'C:\\private'},{SystemRoot:'x'.repeat(4097)},{TEMP:'bad\0path'}])assert.throws(()=>assertInlineChildEnvironment(env,{platform:'win32'}),/inline_child_environment_refused/);
});
test('Linux remains strict and does not admit Windows placeholders or normalize arbitrary names',()=>{
  const env=inlineChildEnvironment({SystemRoot:'C:\\Windows',TEMP:'/tmp',PATH:'PRIVATE',USERPROFILE:'PRIVATE',NIGHTVOYAGE_DEEPSEEK_KEY:'PRIVATE'},{platform:'linux'});assert.deepEqual(env,{SystemRoot:'C:\\Windows',TEMP:'/tmp'});assert.doesNotThrow(()=>assertInlineChildEnvironment(env,{platform:'linux'}));for(const name of ['PATH','USERPROFILE','SYSTEMDRIVE','systemroot'])assert.throws(()=>assertInlineChildEnvironment({[name]:''},{platform:'linux'}),/inline_child_environment_refused/);
});
test('same environment policy executes in a clean actual child with no inherited credential',()=>{
  const env=inlineChildEnvironment({SystemRoot:process.env.SystemRoot,SYSTEMROOT:process.env.SYSTEMROOT,WINDIR:process.env.WINDIR,TEMP:process.env.TEMP,TMP:process.env.TMP,SYSTEMDRIVE:process.env.SYSTEMDRIVE});
  const code=`import {assertInlineChildEnvironment} from ${JSON.stringify(new URL('../src/inline-child-environment.js',import.meta.url).href)};const r=assertInlineChildEnvironment();console.log(JSON.stringify({...r,keyPresent:Object.hasOwn(process.env,'NIGHTVOYAGE_DEEPSEEK_KEY'),pathPresent:Object.hasOwn(process.env,'PATH')}));`;
  const r=spawnSync(process.execPath,['--input-type=module','-e',code],{env,encoding:'utf8',timeout:15000});assert.equal(r.status,0,r.stderr);const v=JSON.parse(r.stdout);assert.equal(v.environmentAllowlisted,true);assert.equal(v.keyPresent,false);assert.equal(v.pathPresent,false);
});

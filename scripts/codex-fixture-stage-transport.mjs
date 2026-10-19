// Fresh local fixture server per stage; never account login or a real inference provider.
import fs from 'node:fs';
import path from 'node:path';
import {runCodexFixtureStage} from './codex-fixture-stage-owner.mjs';
const issued=new WeakSet();
export const isCodexFixtureStageTransport=value=>issued.has(value);
function fields(value,keys){if(!value||Object.getPrototypeOf(value)!==Object.prototype||Reflect.ownKeys(value).some(k=>!keys.includes(k)||!Object.hasOwn(Object.getOwnPropertyDescriptor(value,k),'value')))throw Error('fixture_transport_options_invalid');}
export function createNativeCodexFixtureStageTransport(options){
 fields(options,['executable','timeoutMs']);const {executable,timeoutMs=10000}=options;
 if(typeof executable!=='string'||!path.isAbsolute(executable)||!/^codex(?:\.exe)?$/i.test(path.basename(executable)))throw Error('metadata_executable_invalid');
 const binary=fs.realpathSync(executable);if(!fs.statSync(binary).isFile()||!/^codex(?:\.exe)?$/i.test(path.basename(binary)))throw Error('metadata_executable_invalid');
 return create({kind:'native',binary},timeoutMs);
}
export function createPeerCodexFixtureStageTransport(options={}){
 fields(options,['timeoutMs','scenario']);const {timeoutMs=10000,scenario='stage_success'}=options;
 if(!['stage_success','stage_wrong_text','stage_wrong_input','stage_failed','stage_tool','stage_stall','stage_exit','second_stage_exit'].includes(scenario))throw Error('fixture_transport_options_invalid');
 return create({kind:'independent_node_peer',scenario},timeoutMs);
}
function create(launch,timeoutMs){
 if(!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>30000)throw Error('fixture_transport_options_invalid');
 let active=null,closed=false,started=0,settled=0;const reports=[];
 const transport=Object.freeze({model_id:'gpt-5.6-sol',protocolVersion:launch.kind==='native'?'codex-native-fixture-stage-v1':'codex-peer-fixture-stage-v1',ready:()=>!closed,
  status:()=>({kind:launch.kind,closed,inFlight:!!active,exchangesStarted:started,exchangesSettled:settled,maxStageExchanges:3,externalCallsStarted:0,realModelRequests:0,credentialReads:0,reports:structuredClone(reports)}),
  async exchange(draft,options={}){
   fields(options,['signal']);const {signal}=options;if(signal!==undefined&&!(signal instanceof AbortSignal))throw Error('fixture_transport_options_invalid');
   if(closed||active)throw Error('adapter_unavailable');if(started>=3)throw Error('budget_exhausted');if(signal?.aborted)throw Error('cancelled');
   const controller=new AbortController(),abort=()=>controller.abort();signal?.addEventListener('abort',abort,{once:true});
   const token={controller,done:null};active=token;started++;
   const selected=launch.scenario==='second_stage_exit'?{kind:'independent_node_peer',scenario:started===2?'stage_exit':'stage_success'}:{...launch};
   token.done=(async()=>{try{
    const result=await runCodexFixtureStage(selected,draft,{signal:controller.signal,timeoutMs});reports.push(result.report);
    if(closed||signal?.aborted||controller.signal.aborted||result.report.status==='cancelled')throw Error('cancelled');
    if(result.report.status!=='fixed_stage_completion_observed'||!result.reply)throw Error(result.report.reason==='preparation_timeout'?'timeout':'invalid_model_response');
    return result.reply;
   }finally{signal?.removeEventListener('abort',abort);settled++;if(active===token)active=null;}})();
   return token.done;
  },
  async close(){closed=true;const token=active;if(token){token.controller.abort();try{await token.done;}catch{}}}
 });issued.add(transport);return transport;
}

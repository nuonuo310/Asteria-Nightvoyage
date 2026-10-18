// Independent synthetic RPC peer. No real Codex, transport, account or consent.
import {CodexRpcRehearsal} from '../scripts/codex-rpc-rehearsal.mjs';
import {codexTranscript} from './model-port-protocol-fixtures.js';
export const rpcPush=(session,frame)=>session.push(Buffer.from(JSON.stringify(frame)+'\r\n'));
export function rpcReady(draft){
 const session=new CodexRpcRehearsal(draft),requests=[];
 requests.push(...session.drain());rpcPush(session,{id:1,result:{userAgent:'independent-fixture'}});
 requests.push(...session.drain());rpcPush(session,{id:2,result:{thread:{id:'fiction-thread'},model:draft.model}});
 requests.push(...session.drain());return {session,requests};
}
export function rpcTranscript(draft,{early=false,value,requests=[]}={}){
 const r=rpcReady(draft);requests.push(...r.requests);
 rpcPush(r.session,{method:'thread/started',params:{thread:{id:'fiction-thread'}}});
 const source=codexTranscript(draft,value),response={id:3,result:{turn:{id:'fiction-turn',status:'inProgress',items:[],error:null}}};
 if(!early)rpcPush(r.session,response);
 for(const c of source.chunks)r.session.push(c);
 if(early)rpcPush(r.session,response);
 return r.session.finish();
}

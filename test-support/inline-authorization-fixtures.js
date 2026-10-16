import {prepareInlineAdmissionHistory} from './inline-admission-fixtures.js';
import {Store} from '../src/store.js';
import {initInlineStubAuthorization} from '../src/inline-entry-authorization.js';
import {inlineCandidateAllowanceId} from '../src/inline-entry-admission.js';
import {inlineProtocolVersion} from '../src/inline-evidence-protocol.js';
import {inlineStubAllowance,inlineResponse} from './inline-budget-fixtures.js';
export const authorizationAllowance=()=>inlineStubAllowance({id:inlineCandidateAllowanceId,protocolVersion:inlineProtocolVersion});
export const authorize=(store,allowance=authorizationAllowance(),options={})=>initInlineStubAuthorization(store,{allowance,approveStub:true,acknowledgePreservedHolds:true,...options});
export const authorizedTransport=(_url,r)=>Promise.resolve(new Response(JSON.stringify(inlineResponse({body:JSON.parse(r.body)}).body)));
export function prepareAuthorizedHistory(t){const directory=prepareInlineAdmissionHistory(t),s=new Store(directory);try{const oldAccounts=structuredClone(s.state.billing.accounts),record=authorize(s);return {directory,record,oldAccounts};}finally{s.close();}}

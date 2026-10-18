// Identity mapping only. No access, refresh or ID token is ever written here.
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {Store,copy} from '../src/store.js';
import {issuedClient,authFail} from './chatgpt-plan-auth.mjs';
const exact=(o,keys)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).length===keys.length&&keys.every(k=>Object.hasOwn(o,k));
export class PlanConnections {
  #store;
  constructor(directory){
    if(typeof directory!=='string'||!path.isAbsolute(directory))authFail('plan_absolute_connection_directory_required');
    this.#store=new Store(directory);
    try{
      const state=this.#store.state;
      if(Object.keys(state).some(k=>!['version','runs','requests','sessions','entries','recalls','planConnection'].includes(k))||['runs','requests','sessions','entries','recalls'].some(k=>!state[k]||Object.keys(state[k]).length)||this.#store.withdrawn.length||this.#store.deletions.length)authFail('plan_connection_store_required');
      const c=state.planConnection;
      if(c){
        if(!exact(c,['version','hostId','clientId','subject'])||c.version!==1||!/^urn:uuid:[0-9a-f-]{36}$/.test(c.hostId)||(c.clientId!==null&&!issuedClient(c.clientId))||(c.subject!==null&&(typeof c.subject!=='string'||!c.subject||c.subject.length>2048||!c.clientId)))authFail('plan_connection_invalid');
      }else{state.planConnection={version:1,hostId:`urn:uuid:${randomUUID()}`,clientId:null,subject:null};this.#store.save();}
    }catch(error){this.#store.close();throw error;}
  }
  read(){this.#store.assert();return copy(this.#store.state.planConnection);}
  retainIssuedClient(clientId){
    const c=this.read();if(!issuedClient(clientId)||(c.clientId&&c.clientId!==clientId))authFail('plan_registration_mismatch');
    this.#store.state.planConnection.clientId=clientId;this.#store.save();
  }
  bindIdentity(clientId,subject){
    const c=this.read();if(c.clientId!==clientId||typeof subject!=='string'||!subject||subject.length>2048||(c.subject!==null&&c.subject!==subject))authFail('plan_registration_mismatch');
    this.#store.state.planConnection.subject=subject;this.#store.save();
  }
  close(){this.#store.close();}
}

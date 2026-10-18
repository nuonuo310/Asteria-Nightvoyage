// Fixed plain-fake local facade. No Asteria endpoints, provider injection or paid authority.
import path from 'node:path';
import {Nightvoyage} from '../src/engine.js';
import {FileSnapshotAdapter} from '../src/adapters.js';
import {safeId,snapshot} from '../src/contract.js';
import {assertAppraisalReviewJsonData} from '../src/appraisal-review-memory.js';
export const localDreamPortsVersion='local-dream-ports-v1';
const fail=code=>{throw Error(code);};
function fields(value,required,optional=[]){
  assertAppraisalReviewJsonData(value);
  if(!value||Array.isArray(value)||typeof value!=='object'||required.some(k=>!Object.hasOwn(value,k))||Object.keys(value).some(k=>![...required,...optional].includes(k)))fail('invalid_local_port_input');
  return value;
}
const identifier=id=>{if(!safeId(id))fail('invalid_local_port_id');return id;};
const packet=data=>({contractVersion:localDreamPortsVersion,...data});
export class LocalDreamPorts {
  #engine;
  constructor(directory){
    if(arguments.length!==1||typeof directory!=='string'||!path.isAbsolute(directory))fail('absolute_plain_fake_store_required');
    const engine=new Nightvoyage(directory);
    try{for(const run of Object.values(engine.store.state.runs))engine.assertExecutionOwner(run);}
    catch(error){engine.close();throw error;}
    this.#engine=engine;
  }
  #run(id){identifier(id);const r=this.#engine.run(id);this.#engine.assertExecutionOwner(r);return r;}
  capabilities(){return packet({adapter:'local_file',executionFamily:'plain-fake-v1',materialKinds:['fictional'],asteriaAdapter:'pending',realModelRequests:false,automaticDelivery:false,remoteAuthentication:false,deliveryAcknowledgement:false,methods:['readSnapshot','start','execute','status','cancel','resume','result','readEntry','listEntries','append','setPolicy','recall','residue','withdraw','deleteEntry','close']});}
  readSnapshot(input){
    const {file}=fields(input,['file']);this.#engine.store.assert();
    if(typeof file!=='string'||!path.isAbsolute(file))fail('absolute_snapshot_file_required');
    const value=new FileSnapshotAdapter().read(file);assertAppraisalReviewJsonData(value);
    return packet({snapshot:value});
  }
  start(input){
    const v=fields(input,['requestId','sessionId','snapshot'],['config']);identifier(v.requestId);identifier(v.sessionId);
    return packet({runId:this.#engine.start(v.requestId,v.sessionId,snapshot(v.snapshot),v.config)});
  }
  status(input){const {runId}=fields(input,['runId']);this.#run(runId);return packet({receipt:this.#engine.status(runId)});}
  async execute(input){const {runId}=fields(input,['runId']);this.#run(runId);await this.#engine.execute(runId);return this.result({runId});}
  cancel(input){const {runId}=fields(input,['runId']);this.#run(runId);return packet({receipt:this.#engine.cancel(runId)});}
  async resume(input){const {runId}=fields(input,['runId']);this.#run(runId);await this.#engine.resume(runId);return this.result({runId});}
  result(input){const {runId}=fields(input,['runId']);this.#run(runId);return packet(this.#engine.result(runId));}
  readEntry(input){const {entryId}=fields(input,['entryId']);identifier(entryId);return packet({entry:this.#engine.read(entryId)});}
  listEntries(input){fields(input,[]);return packet({entries:this.#engine.list()});}
  append(input){const {entryId,kind,text}=fields(input,['entryId','kind','text']);identifier(entryId);return packet({entryId:this.#engine.append(entryId,kind,text)});}
  setPolicy(input){const {entryId,patch}=fields(input,['entryId','patch']);identifier(entryId);fields(patch,[],['cherished','recallAccess']);this.#engine.setPolicy(entryId,patch);return packet({entryId});}
  recall(input){const {cue,requestId,now}=fields(input,['cue','requestId','now']);identifier(requestId);return packet({candidates:this.#engine.recall(cue,requestId,now),automaticDelivery:false});}
  residue(input){const {entryId,now}=fields(input,['entryId','now']);identifier(entryId);return packet({residue:this.#engine.residue(entryId,now)});}
  withdraw(input){const {sourceId}=fields(input,['sourceId']);this.#engine.withdraw(sourceId);return packet({sourceId,status:'withdrawn'});}
  deleteEntry(input){const {entryId}=fields(input,['entryId']);identifier(entryId);this.#engine.deleteEntry(entryId);return packet({entryId,status:'deleted_or_unavailable'});}
  close(){this.#engine.close();}
}

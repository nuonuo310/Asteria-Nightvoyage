import {continuityBudgetVersion} from './scene-continuity-protocol.js';
// Managed record layer: same Store entries and deletion/withdrawal journals, no sidecar.
import {Store,copy,fail} from './store.js';
import {hash,own,safeId,neutral} from './contract.js';
import {readAppraisalView} from './appraisal-view.js';
import {coupledBudgetVersion} from './coupled-affect-protocol.js';
import {buildAppraisalReviewDraft,projectAppraisalReviewDraft,assertAppraisalReviewJsonData} from './appraisal-review-memory.js';
const indexName='appraisalReviewIndex';
const activeCreates=new WeakSet();
const exact=(v,names)=>{if(!v||Array.isArray(v)||Object.keys(v).length!==names.length||names.some(k=>!Object.hasOwn(v,k)))fail('invalid_review_record');};
const checkId=id=>{if(!safeId(id))fail('invalid_review_id');};
export class AppraisalReviewStore {
  #reviewer;
  constructor(store,reviewer,{fault=()=>{}}={}) {
    if(!(store instanceof Store))fail('managed_store_required');
    store.assert();assertAppraisalReviewJsonData(reviewer);exact(reviewer,['actorId','kind']);checkId(reviewer.actorId);
    if(!['person','assistant'].includes(reviewer.kind)||typeof fault!=='function')fail('invalid_review_actor');
    this.store=store;this.#reviewer=copy(reviewer);this.fault=fault;
  }
  index() {
    this.store.assert();
    const index=own(this.store.state,indexName);
    if(index===undefined)return {version:1,requests:{}};
    assertAppraisalReviewJsonData(index);exact(index,['version','requests']);
    if(index.version!==1||!index.requests||Array.isArray(index.requests)||Object.keys(index.requests).length>100)fail('invalid_review_index');
    for(const [key,row] of Object.entries(index.requests)) {
      checkId(key);exact(row,['fingerprint','recordHash','entryId','parentDreamId','runId']);
      for(const id of [row.entryId,row.parentDreamId,row.runId])checkId(id);
      for(const h of [row.fingerprint,row.recordHash])if(typeof h!=='string'||!/^[a-f0-9]{64}$/.test(h))fail('invalid_review_index');
    }
    return index;
  }
  context(dreamId) {
    this.store.assert();checkId(dreamId);
    const e=own(this.store.state.entries,dreamId);
    if(!e)return null;
    const view=readAppraisalView(this.store,dreamId);
    if(!view)return null;
    if(view.status!=='available'||![coupledBudgetVersion,continuityBudgetVersion].includes(view.protocolVersion))fail('unsupported_review_parent');
    const run=own(this.store.state.runs,e.runId);
    if(e.id!==dreamId||run.entryId!==dreamId||run.id!==e.runId||run.status!=='completed'||e.sourceRefs.some(s=>!run.sourceIds.includes(s.id))||run.sourceIds.length!==e.sourceRefs.length)fail('invalid_review_parent');
    // Journal check even if an interrupted purge left bodies in memory.
    if(this.store.deletions.some(d=>d.entryId===dreamId||(d.wholeRun&&d.runId===e.runId)))return null;
    return {kind:'fictional_appraisal_review_context',parent:{dreamId:e.id,runId:e.runId,status:run.status,protocolVersion:view.protocolVersion,origin:e.origin,materialKind:e.materialKind,isRealityFact:e.isRealityFact,
      sourceRefs:copy(e.sourceRefs),initialAffect:copy(run.snapshot.channels.affect.value??neutral()),scenes:copy(e.scenes)},reviewer:copy(this.#reviewer),withdrawnSourceIds:[],deletedDreamIds:[]};
  }
  read(id) {
    this.store.assert();checkId(id);
    const index=this.index(),entry=own(this.store.state.entries,id);
    const pairs=Object.entries(index.requests).filter(([,v])=>v.entryId===id);
    if(!pairs.length)return null;
    if(pairs.length!==1)fail('invalid_review_index');
    const [requestId,receipt]=pairs[0];
    if(!entry)return null;
    if(this.store.deletions.some(d=>d.entryId===id||(d.wholeRun&&d.runId===receipt.runId)))return null;
    if(!entry.parent||entry.origin!=='dream_appraisal_review'||entry.runId!==receipt.runId||entry.parent.dreamId!==receipt.parentDreamId||entry.requestId!==requestId||hash(entry)!==receipt.recordHash)fail('invalid_review_record');
    const context=this.context(receipt.parentDreamId);if(!context)return null;
    // Review identity belongs to the stored local actor, not the current reader.
    if(entry.runId!==context.parent.runId)fail('invalid_review_record');
    context.reviewer=copy(entry.reviewer);
    assertAppraisalReviewJsonData(entry);
    const {runId,...recordDraft}=entry;
    const supersedes=recordDraft.supersedesReviewId;
    if(supersedes!==null){checkId(supersedes);if(supersedes===id)fail('invalid_review_record');}
    recordDraft.supersedesReviewId=null;
    projectAppraisalReviewDraft(context,{illustrativeOnly:true,runtimeSupported:false,recordDraft});
    return copy(entry);
  }
  list(dreamId) {
    if(!this.context(dreamId))return [];
    return Object.values(this.index().requests).filter(r=>r.parentDreamId===dreamId).map(r=>this.read(r.entryId)).filter(Boolean);
  }
  create(dreamId,request) {
    this.store.assert();
    if(activeCreates.has(this.store))fail('review_write_busy');
    activeCreates.add(this.store);
    try{return this.#create(dreamId,request);}finally{activeCreates.delete(this.store);}
  }
  #create(dreamId,request) {
    this.store.assert();assertAppraisalReviewJsonData(request);
    exact(request,['id','requestId','sceneIndex','assessment','supersedesReviewId']);
    checkId(request.id);checkId(request.requestId);
    const context=this.context(dreamId);if(!context)fail('review_parent_unavailable');
    const draft=buildAppraisalReviewDraft(context,{...request,supersedesReviewId:null});
    if(request.supersedesReviewId!==null)checkId(request.supersedesReviewId);
    const entry={...draft.recordDraft,runId:context.parent.runId,supersedesReviewId:request.supersedesReviewId};
    const fingerprint=hash(entry),index=this.index(),old=own(index.requests,request.requestId);
    if(old){if(old.fingerprint!==fingerprint)fail('review_request_conflict');return this.read(old.entryId);}
    if(own(this.store.state.entries,entry.id)||Object.values(index.requests).some(r=>r.entryId===entry.id))fail('review_id_conflict');
    if(Object.keys(index.requests).length>=100)fail('review_capacity_reached');
    if(entry.supersedesReviewId!==null){
      const prior=this.read(entry.supersedesReviewId);
      if(!prior||hash(prior.parent)!==hash(entry.parent)||hash(prior.reviewer)!==hash(entry.reviewer))fail('review_revision_conflict');
    }
    this.fault('before_review_commit');
    const fresh=this.context(dreamId);
    if(!fresh)fail('review_parent_unavailable');
    if(hash(fresh.parent)!==hash(context.parent))fail('review_parent_changed');
    if(entry.supersedesReviewId!==null){
      const prior=this.read(entry.supersedesReviewId);
      if(!prior||hash(prior.parent)!==hash(entry.parent)||hash(prior.reviewer)!==hash(entry.reviewer))fail('review_revision_conflict');
    }
    const hadIndex=Object.hasOwn(this.store.state,indexName),previousIndex=this.store.state[indexName];
    const next=copy(index);next.requests[request.requestId]={fingerprint,recordHash:hash(entry),entryId:entry.id,parentDreamId:dreamId,runId:entry.runId};
    this.store.state[indexName]=next;this.store.state.entries[entry.id]=entry;
    try{this.store.save();}catch{
      delete this.store.state.entries[entry.id];if(hadIndex)this.store.state[indexName]=previousIndex;else delete this.store.state[indexName];
      this.store.poisoned=true;fail('storage_io_failure');
    }
    this.fault('after_review_commit');
    return this.read(entry.id);
  }
}

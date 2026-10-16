// Explicit local-file adapter. Caller owns Store lifetime; no automatic judgment/generation.
import {copy,fail} from './store.js';
import {own,safeId} from './contract.js';
import {readAppraisalView} from './appraisal-view.js';
import {AppraisalReviewStore} from './appraisal-review-store.js';
import {assertAppraisalReviewJsonData} from './appraisal-review-memory.js';
export const appraisalReviewAdapterVersion='dream-appraisal-review-adapter-v1';
function shape(value,names){assertAppraisalReviewJsonData(value);if(!value||Array.isArray(value)||Object.keys(value).length!==names.length||names.some(k=>!Object.hasOwn(value,k)))fail('invalid_review_adapter_request');}
function identifier(value){if(!safeId(value))fail('invalid_review_id');}
export class LocalFileAppraisalReviewAdapter {
  #store;#reviews;
  constructor(store,reviewer){this.#reviews=new AppraisalReviewStore(store,reviewer);this.#store=store;}
  capabilities(){return {contractVersion:appraisalReviewAdapterVersion,adapter:'local_file',asteriaAdapter:'pending',actorIdentity:'trusted_local_assertion',operations:['createReview','readReview','listReviews','readDreamReviewBundle','deleteReview'],automaticReview:false,modelCalls:false};}
  createReview(input){
    shape(input,['dreamId','request']);identifier(input.dreamId);
    return {contractVersion:appraisalReviewAdapterVersion,review:this.#reviews.create(input.dreamId,input.request)};
  }
  readReview(input){
    shape(input,['reviewId']);identifier(input.reviewId);
    return {contractVersion:appraisalReviewAdapterVersion,review:this.#reviews.read(input.reviewId)};
  }
  listReviews(input){
    shape(input,['dreamId']);identifier(input.dreamId);
    return {contractVersion:appraisalReviewAdapterVersion,reviews:this.#reviews.list(input.dreamId)};
  }
  readDreamReviewBundle(input){
    shape(input,['dreamId']);identifier(input.dreamId);
    const context=this.#reviews.context(input.dreamId);
    if(!context)return null;
    const entry=own(this.#store.state.entries,input.dreamId),dream=copy(entry);
    // Wake/residue remain independently available from the existing engine result API.
    delete dream.wake;delete dream.residue;
    const appraisalView=readAppraisalView(this.#store,input.dreamId),reviews=this.#reviews.list(input.dreamId);
    return {schemaVersion:1,contractVersion:appraisalReviewAdapterVersion,origin:'dream_review_bundle',materialKind:entry.materialKind,isRealityFact:false,sourceRefs:copy(entry.sourceRefs),derivedFrom:[entry.id],dream,appraisalView,reviews};
  }
  deleteReview(input){
    shape(input,['reviewId']);identifier(input.reviewId);
    const record=this.#reviews.read(input.reviewId);
    // Narrow operation: an arbitrary dream id cannot delete the original.
    if(record)this.#store.deleteEntry(record);
    return {contractVersion:appraisalReviewAdapterVersion,reviewId:input.reviewId,status:record?'deleted':'unavailable'};
  }
}

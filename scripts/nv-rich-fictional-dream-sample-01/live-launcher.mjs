// Phase A live entry. The refusal is decided from the static authorization
// module before inspecting a Store, credential supplier, environment or fetch.
import {phaseBRelease,phaseBAuthorizationState} from './authorization.mjs';

export const richSampleLiveLauncherVersion='nv-rich-fictional-dream-sample-live-launcher-v1';

function refusal(reason){
  return Object.freeze({
    status:'refused',ready:false,reason,launcherVersion:richSampleLiveLauncherVersion,
    releaseAvailable:phaseBRelease!==null,credentialSupplierCalls:0,credentialRequested:false,
    storeOpened:false,ownerLockCreated:false,networkAttempts:0,realModelRequests:0,
    authorization:phaseBAuthorizationState()
  });
}

export function launchRichSampleLive(){
  if(phaseBRelease===null)return refusal('rich_sample_phase_b_release_required');
  return refusal('rich_sample_phase_b_release_not_reviewed');
}

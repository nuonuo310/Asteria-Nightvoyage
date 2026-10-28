// R3 is an offline review candidate. This gate cannot be disabled by CLI or
// environment input; synthetic tests use dedicated runtime injections instead.
export const liveOfflineReviewReason='OFFLINE_REVIEW_REQUIRED_R3';
export const liveOfflineGateVersion='nv-dream-climate-live-r3-offline-gate-v1';

export function offlineReviewReceipt(extra={}){
  return {status:'blocked',ready:false,reason:liveOfflineReviewReason,
    offlineReview:true,liveEntryClosed:true,gateVersion:liveOfflineGateVersion,
    credentialRequested:false,credentialSupplierCalls:0,
    networkAttempts:0,realModelRequests:0,requestOutcomeKnown:true,
    storeCreated:false,releaseRevoked:false,executed:false,automaticRetry:false,
    ...extra};
}

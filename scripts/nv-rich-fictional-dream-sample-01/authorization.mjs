// Phase A contains no live release and no dedicated live Store path.
// A later authority R1 must replace both exact values before any live entry can pass.
export const richSampleAuthorizationVersion='nv-rich-fictional-dream-sample-authorization-v1';
export const phaseBRelease=null;
export const dedicatedStoreDirectory=null;
export const requiredPhaseBReleaseKeys=Object.freeze([
  'status','phaseAHead','phaseATree','identityHash','promptHash','sourceHash','priceSnapshotHash',
  'allowanceCapMicroCny','maxRuns','maxCalls','storeDirectory','noRetry'
]);

export function phaseBAuthorizationState(){
  return {
    version:richSampleAuthorizationVersion,
    status:phaseBRelease===null?'locked_pending_exact_r1':'release_object_present_but_unreviewed',
    releaseAvailable:phaseBRelease!==null,
    liveDispatchAvailable:false,
    credentialRead:false,
    storeOpened:false,
    networkAttempts:0,
    requiredReleaseKeys:[...requiredPhaseBReleaseKeys]
  };
}

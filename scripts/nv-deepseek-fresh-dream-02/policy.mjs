// Independent identities for the new dream. None of these names overlaps the old grant.
export const oneDreamAllowanceId='nv-deepseek-fresh-dream-02-20261025';
export const oneDreamAuthorizationVersion='nv-deepseek-fresh-dream-02-authorization-v1';
export const oneDreamAuthorizationField='nvDeepSeekFreshDream02Authorization';
export const oneDreamLoopbackKind='nv-fresh-dream-02-loopback-v1';
export const oneDreamLocalCredential='LOCAL-FRESH-DREAM-02-FIXTURE-ONLY';
export const freshDreamInputTokenBound=65536;
export const oneDreamRequestId=oneDreamAllowanceId;
export const oneDreamSessionId=oneDreamAllowanceId;
const reviewedNativeCodeGroups=Object.freeze([
  /^(?:ENOTFOUND|EAI_AGAIN|EAI_FAIL)$/,
  /^(?:ECONNREFUSED|ECONNRESET|EHOSTUNREACH|ENETUNREACH|EADDRNOTAVAIL|ECONNABORTED)$/,
  /^EPIPE$/,
  /^(?:ERR_TLS_[A-Z0-9_]+|ERR_SSL_[A-Z0-9_]+|CERT_[A-Z0-9_]+|SELF_SIGNED_CERT_IN_CHAIN|UNABLE_TO_VERIFY_LEAF_SIGNATURE|UNABLE_TO_GET_ISSUER_CERT_LOCALLY|DEPTH_ZERO_SELF_SIGNED_CERT)$/
]);
export function reviewedNativeTransportCode(value){
  return typeof value==='string'&&reviewedNativeCodeGroups.some(pattern=>pattern.test(value))?value:undefined;
}

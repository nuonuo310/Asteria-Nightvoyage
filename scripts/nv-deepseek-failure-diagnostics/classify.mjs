import {diagnosticClasses,diagnosticPhases,httpStatusClassValues,transportObservationValues} from './policy.mjs';

const permitted=(values,value)=>values.includes(value);
const preDispatchCodes=new Set([
  'transport_disabled','credential_required','invalid_transport_ids','allowance_mode_mismatch',
  'allowance_protocol_mismatch','allowance_expired','request_too_large','unreviewed_transport_protocol',
  'invalid_transport_config','stub_transport_required','live_transport_override_forbidden',
  'one_dream_fresh_explicit_approval_required','one_dream_contract_expired','one_dream_authorization_revoked',
  'one_dream_ambiguous_attempt','one_dream_allowance_exhausted','one_dream_stage_reservation_mismatch',
  'one_dream_runtime_authorization_required','one_dream_dispatch_kind_mismatch','one_dream_mode_mismatch',
  'one_dream_source_withdrawn','source_withdrawn','budget_exhausted'
]);
const dispatchCodes=new Set([
  'source_egress_denied_or_withdrawn','one_dream_transport_contract_mismatch','one_dream_authorized_stage_mismatch'
]);
const storageCodes=new Set(['storage_io_failure','store_unavailable','one_dream_storage_io_failure']);
const protocolCodes=new Set([
  'provider_incomplete_response','provider_tools_forbidden','provider_empty_or_oversized_content',
  'one_dream_provider_secret_echo'
]);
const stageCodes=new Set([
  'compact_appraisal_invalid','wake_fragment_not_grounded','invalid_scene','invalid_affect',
  'invalid_appraisal','invalid_wake','invalid_inline_shape','invalid_inline_excerpt','invalid_inline_goal',
  'invalid_inline_affect','invalid_inline_json_data','invalid_inline_before','inline_output_too_large'
]);
const settlementCodes=new Set([
  'usage_exceeds_reviewed_bounds','one_dream_usage_exceeds_reviewed_bounds',
  'one_dream_cost_exceeds_reservation','one_dream_attempt_not_settleable'
]);

export function classifyHttpStatus(status){
  if(!Number.isInteger(status)||status<100||status>599)return 'not_observed';
  if(status===401||status===403)return 'unauthorized';
  if(status===429)return 'rate_limited';
  if(status>=400&&status<500)return 'client_error';
  if(status>=500&&status<600)return 'server_error';
  return status===200?'not_observed':'other_non_200';
}
export function classifyNativeTransport(error){
  const code=typeof error?.code==='string'?error.code:typeof error?.cause?.code==='string'?error.cause.code:'';
  if(/^(?:ENOTFOUND|EAI_AGAIN|EAI_FAIL)$/.test(code))return 'dns';
  if(/^(?:ECONNREFUSED|ECONNRESET|EHOSTUNREACH|ENETUNREACH|EADDRNOTAVAIL|ECONNABORTED)$/.test(code))return 'connect';
  if(code==='EPIPE')return 'write';
  if(/^(?:ERR_TLS_[A-Z0-9_]+|ERR_SSL_[A-Z0-9_]+|CERT_[A-Z0-9_]+|SELF_SIGNED_CERT_IN_CHAIN|UNABLE_TO_VERIFY_LEAF_SIGNATURE|UNABLE_TO_GET_ISSUER_CERT_LOCALLY|DEPTH_ZERO_SELF_SIGNED_CERT)$/.test(code))return 'tls';
  if(code)return 'unknown_native';
  return 'not_classified';
}
function transportClass(value){
  return value==='dns'?'transport_dns_failure':value==='connect'?'transport_connect_failure':value==='tls'?'transport_tls_failure':value==='write'?'transport_write_failure':value==='unknown_native'?'transport_native_failure':'unclassified';
}
function httpClass(value){
  return value==='unauthorized'?'http_unauthorized':value==='rate_limited'?'http_rate_limited':value==='client_error'?'http_client_error':value==='server_error'?'http_server_error':value==='other_non_200'?'http_other_non_200':'unclassified';
}
export function classifyFailure({errorMessage,trace={}}={}){
  const code=typeof errorMessage==='string'?errorMessage:'';
  const transport=permitted(transportObservationValues,trace.transportObservation)?trace.transportObservation:'not_attempted';
  const http=permitted(httpStatusClassValues,trace.httpStatusClass)?trace.httpStatusClass:'not_observed';
  if(trace.timedOut||code==='timeout')return {phase:'cancellation',diagnosticClass:'local_timeout',transportObservation:transport,httpStatusClass:http};
  if(code==='cancelled')return {phase:'cancellation',diagnosticClass:'cancelled_locally',transportObservation:transport,httpStatusClass:http};
  if(storageCodes.has(code)||storageCodes.has(trace.settlementError))return {phase:trace.dispatchIntentPersisted?'internal':'pre_dispatch',diagnosticClass:'local_storage_failure',transportObservation:transport,httpStatusClass:http};
  if(trace.publicationError||code==='one_dream_publication_failed')return {phase:'publication',diagnosticClass:'publication_failure',transportObservation:transport,httpStatusClass:http};
  if(trace.settlementError||settlementCodes.has(code)||settlementCodes.has(trace.settlementError))return {phase:'settlement',diagnosticClass:'settlement_failure',transportObservation:transport,httpStatusClass:http};
  if(http!=='not_observed')return {phase:'http_response',diagnosticClass:httpClass(http),transportObservation:transport,httpStatusClass:http};
  if(transport!=='not_attempted'&&transport!=='not_classified')return {phase:'transport',diagnosticClass:transportClass(transport),transportObservation:transport,httpStatusClass:http};
  if(trace.responseAborted)return {phase:'response_read',diagnosticClass:'response_aborted',transportObservation:transport,httpStatusClass:http};
  if(trace.responseReadError)return {phase:'response_read',diagnosticClass:'response_read_failure',transportObservation:transport,httpStatusClass:http};
  if(code==='invalid_http_body'||code==='provider_response_read_failed')return {phase:'response_read',diagnosticClass:'response_read_failure',transportObservation:transport,httpStatusClass:http};
  if(code==='provider_response_too_large')return {phase:'response_read',diagnosticClass:'response_too_large',transportObservation:transport,httpStatusClass:http};
  if(code==='provider_invalid_json')return {phase:'response_protocol',diagnosticClass:'response_invalid_json',transportObservation:transport,httpStatusClass:http};
  if(code==='provider_invalid_usage')return {phase:'response_protocol',diagnosticClass:'response_usage_rejected',transportObservation:transport,httpStatusClass:http};
  if(protocolCodes.has(code)||trace.protocolError)return {phase:'response_protocol',diagnosticClass:'response_protocol_rejected',transportObservation:transport,httpStatusClass:http};
  if(stageCodes.has(code)&&trace.transportInvoked)return {phase:'response_protocol',diagnosticClass:'response_stage_rejected',transportObservation:transport,httpStatusClass:http};
  if(trace.dispatchContractRejected||dispatchCodes.has(code))return {phase:'dispatch_intent',diagnosticClass:'dispatch_contract_rejected',transportObservation:transport,httpStatusClass:http};
  if(preDispatchCodes.has(code))return {phase:'pre_dispatch',diagnosticClass:'pre_dispatch_refused',transportObservation:transport,httpStatusClass:http};
  return {phase:'internal',diagnosticClass:'unclassified',transportObservation:transport,httpStatusClass:http};
}
export const reviewedDiagnosticPhase=value=>permitted(diagnosticPhases,value);
export const reviewedDiagnosticClass=value=>permitted(diagnosticClasses,value);

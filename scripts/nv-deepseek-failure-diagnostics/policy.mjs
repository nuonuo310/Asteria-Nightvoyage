export const diagnosticsVersion='nv-deepseek-failure-diagnostics-v1';
export const diagnosticsSchemaVersion=1;
export const diagnosticsJournalKind='nv_deepseek_failure_diagnostic_journal';
export const diagnosticsReceiptKind='nv_deepseek_failure_receipt';
export const diagnosticsJournalFilename='nv-deepseek-failure-diagnostics.json';
export const diagnosticsMaximumReceipts=32;

export const diagnosticPhases=Object.freeze([
  'pre_dispatch',
  'dispatch_intent',
  'transport',
  'http_response',
  'response_read',
  'response_protocol',
  'cancellation',
  'settlement',
  'publication',
  'internal'
]);

export const diagnosticClasses=Object.freeze([
  'pre_dispatch_refused',
  'dispatch_contract_rejected',
  'transport_dns_failure',
  'transport_connect_failure',
  'transport_tls_failure',
  'transport_write_failure',
  'transport_native_failure',
  'http_unauthorized',
  'http_rate_limited',
  'http_client_error',
  'http_server_error',
  'http_other_non_200',
  'response_aborted',
  'response_too_large',
  'response_read_failure',
  'response_invalid_json',
  'response_protocol_rejected',
  'response_usage_rejected',
  'response_stage_rejected',
  'cancelled_locally',
  'local_timeout',
  'settlement_failure',
  'publication_failure',
  'local_storage_failure',
  'unclassified'
]);

export const dispatchIntentValues=Object.freeze(['none','persisted']);
export const transportObservationValues=Object.freeze([
  'not_attempted',
  'dns',
  'connect',
  'tls',
  'write',
  'unknown_native',
  'not_classified'
]);
export const httpStatusClassValues=Object.freeze([
  'not_observed',
  'unauthorized',
  'rate_limited',
  'client_error',
  'server_error',
  'other_non_200'
]);

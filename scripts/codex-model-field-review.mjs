// Offline shape classification only. Never used by a live adapter or approval owner.
export const modelFieldReviewVersion = 'offline-codex-0160-field-review-v1';
const shell = new Map([
  ['unified_exec', 'unified_exec'], ['disabled', 'disabled'],
  ['default', 'unified_exec'], ['local', 'unified_exec'], ['shell_command', 'unified_exec'],
]);
const modes = new Set(['direct', 'code_mode', 'code_mode_only']);
function field(input, key) {
  const descriptor = Object.getOwnPropertyDescriptor(input, key);
  if (!descriptor) return { status: 'missing', value: null };
  if (!Object.hasOwn(descriptor, 'value')) throw Error('offline_model_field_accessor');
  const value = descriptor.value;
  if (value === null) return { status: 'null', value: null };
  if (typeof value !== 'string') return { status: 'invalid_type', value: null };
  const canonical = key === 'shell_type' ? shell.get(value) : modes.has(value) ? value : undefined;
  if (canonical === undefined) return { status: 'unreviewed', value: null };
  return { status: canonical === value ? 'recognized' : 'recognized_alias', value: canonical };
}
export function reviewOfflineModelFields(input) {
  if (!input || typeof input !== 'object' ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(input))) {
    throw Error('offline_model_field_input');
  }
  return {
    reviewVersion: modelFieldReviewVersion,
    shell: field(input, 'shell_type'), toolMode: field(input, 'tool_mode'),
    rustDeserializationTested: false, nativeCompatibilityVerified: false,
    inferenceEntitlementVerified: false, productionAdmission: false, dispatchEnabled: false,
  };
}

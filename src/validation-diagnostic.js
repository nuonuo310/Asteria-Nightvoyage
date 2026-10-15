// Body-free, fixed vocabulary only. Never persist provider text or exception details.
const compactChecks = new Set([
  'invalid_compact_evidence', 'invalid_compact_reference', 'unused_compact_evidence',
  'invalid_scene', 'invalid_appraisal', 'invalid_affect', 'invalid_appraisal_evidence',
  'neutral_goal_evidence_must_be_null', 'nonzero_goal_requires_evidence',
  'appraisal_excerpt_not_grounded', 'unbased_appraisal_requires_placeholder',
  'affect_change_requires_evidence', 'unclassified_validation_failure'
]);
export function compactValidationDiagnostic(check) {
  return {schemaVersion:1, protocolVersion:'compact-appraisal-quotes-v1', stage:'scene',
    check:typeof check==='string'&&compactChecks.has(check)?check:'unclassified_validation_failure'};
}
export function reviewedValidationDiagnostic(value) {
  if (!value || value.schemaVersion!==1 || value.protocolVersion!=='compact-appraisal-quotes-v1' ||
      value.stage!=='scene' || typeof value.check!=='string' || !compactChecks.has(value.check)) return null;
  // Rebuild the entire object: caller extras, usage, text and stack never survive.
  return compactValidationDiagnostic(value.check);
}

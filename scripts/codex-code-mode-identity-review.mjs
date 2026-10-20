// Closed public-name witness only. It does not identify a handler or grant tool execution.
import { reviewCodexLocalRequest } from './codex-request-tool-review.mjs';
export function reviewCodeModeToolIdentity(bytes) {
  const legacy = reviewCodexLocalRequest(bytes);
  const body = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  const publicCodes = [];
  let unreviewedIdentities = 0;
  function walk(tools, namespace = '') {
    for (const tool of tools) {
      if (tool.type === 'namespace') { walk(tool.tools, namespace + tool.name + '.'); continue; }
      let code;
      if (!namespace || namespace === 'functions.') {
        if (tool.type === 'custom' && tool.name === 'exec') code = 'public_exec_custom';
        if (tool.type === 'function' && tool.name === 'wait') code = 'shared_wait_function';
      }
      if (code) publicCodes.push(code); else unreviewedIdentities++;
    }
  }
  if (legacy.toolsFieldPresent) walk(body.tools);
  return {
    witnessVersion: 'codex-code-mode-public-identity-v1',
    catalogueVersion: 'codex-0160-exec-wait-public-names-v1',
    toolsFieldPresent: legacy.toolsFieldPresent, toolCount: legacy.toolCount,
    publicCodes, unreviewedIdentities,
    waitHandlerRole: publicCodes.includes('shared_wait_function') ? 'not_established_by_name' : 'not_observed',
    legacyAcceptanceUnchanged: true, rawToolNamesReturned: false, toolSchemasReturned: false,
    nativeSchemaValidated: false, nativeHandlerDenialVerified: false,
    dispatchEnabled: false, productionAdmission: false,
  };
}

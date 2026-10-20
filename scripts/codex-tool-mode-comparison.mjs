// Independent fictional comparison data; never an authenticated model catalogue.
import { fictionalCodexCatalog } from './codex-fictional-catalog.mjs';
export const codexToolModeComparisonVersion = 'independent-codex-tool-mode-comparison-v1';
export const codexToolModeCaseIds = Object.freeze(['direct_empty', 'code_only_empty']);
export function codexToolModeCase(caseId) {
  if (!codexToolModeCaseIds.includes(caseId)) throw Error('tool_mode_case_invalid');
  const catalog = fictionalCodexCatalog();
  const toolMode = caseId === 'direct_empty' ? 'direct' : 'code_mode_only';
  catalog.models[0].tool_mode = toolMode;
  return { caseId, catalog, environmentless: true, inputModalities: 'text_and_image', toolMode };
}

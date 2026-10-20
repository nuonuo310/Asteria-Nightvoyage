// Independently authored representative metadata only, never a live model catalogue.
import {fictionalCodexCatalog} from './codex-fictional-catalog.mjs';
export const codexCatalogComparisonVersion='independent-codex-catalog-comparison-v1';
export const codexCatalogCaseIds=Object.freeze(['image_default','text_default','image_empty','text_empty']);
export function codexCatalogCase(caseId){
 if(!codexCatalogCaseIds.includes(caseId))throw Error('catalog_comparison_case_invalid');
 const catalog=fictionalCodexCatalog(),image=caseId.startsWith('image_');
 catalog.models[0].input_modalities=image?['text','image']:['text'];
 return {caseId,catalog,environmentless:caseId.endsWith('_empty'),inputModalities:image?'text_and_image':'text_only'};
}

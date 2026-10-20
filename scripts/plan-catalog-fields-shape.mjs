import { reviewPlanCatalogShape, validPlanCatalogShape } from './plan-catalog-shape.mjs';
import { reviewOfflineModelFields, modelFieldReviewVersion } from './codex-model-field-review.mjs';
const version = 'selected-plan-catalog-fields-v2';
const plain = v => v && typeof v === 'object' && [Object.prototype, null].includes(Object.getPrototypeOf(v));
function own(v, key) {
  if (!plain(v)) throw Error('catalog_shape_invalid');
  const d = Object.getOwnPropertyDescriptor(v, key);
  if (!d || !Object.hasOwn(d, 'value')) throw Error('catalog_shape_invalid');
  return d.value;
}
export function reviewPlanCatalogFields(catalog) {
  // The old pure reader validates the bounded catalogue and uniquely selected model first.
  const base = reviewPlanCatalogShape(catalog);
  const models = own(catalog, 'models');
  let selected;
  for (let i = 0; i < models.length; i++) {
    const model = Object.getOwnPropertyDescriptor(models, String(i)).value;
    if (own(model, 'slug') === 'gpt-5.6-sol') selected = model;
  }
  const fields = reviewOfflineModelFields(selected);
  const { shellType, toolMode, ...rest } = base;
  return { ...rest, reviewVersion: version, fieldContractVersion: modelFieldReviewVersion,
    shell: fields.shell, toolMode: fields.toolMode };
}
function validField(v, kind) {
  if (!plain(v) || Reflect.ownKeys(v).length !== 2) return false;
  const status = own(v, 'status'), value = own(v, 'value');
  if (['missing', 'null', 'invalid_type', 'unreviewed'].includes(status)) return value === null;
  if (status === 'recognized_alias') return kind === 'shell' && value === 'unified_exec';
  return status === 'recognized' && (kind === 'shell' ? ['unified_exec', 'disabled'] : ['direct', 'code_mode', 'code_mode_only']).includes(value);
}
export function validPlanCatalogFields(v) {
  try {
    if (!plain(v) || Reflect.ownKeys(v).length !== 15) return false;
    // Read descriptors before object spread; validators must not execute getters.
    const data = Object.fromEntries(Reflect.ownKeys(v).map(k => [k, own(v, k)]));
    if (data.reviewVersion !== version || data.fieldContractVersion !== modelFieldReviewVersion ||
        !validField(data.shell, 'shell') || !validField(data.toolMode, 'mode')) return false;
    const { shell, fieldContractVersion, ...base } = data;
    return validPlanCatalogShape({ ...base, reviewVersion: 'selected-plan-catalog-shape-v1',
      shellType: 'unreviewed', toolMode: 'unreviewed' });
  } catch { return false; }
}

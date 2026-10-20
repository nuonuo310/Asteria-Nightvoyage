// Offline candidate policy. It neither launches Codex nor grants inference authority.
import {codexIsolationOverrides,reviewCodexConfigReply} from './codex-isolation-review.mjs';
export const codeModeGuardVersion='offline-code-mode-guard-review-v1';
const disabledWarning='Code Mode is unavailable because code-mode host is disabled. Code mode will fail closed; enable `features.code_mode_host` and install `codex-code-mode-host`.';
export function codeModeGuardOverrides(){
 return [...codexIsolationOverrides(),'features.code_mode_host=false','code_mode.disable_in_process_fallback=false'];
}
export function reviewCodeModeGuardConfig(text){
 const base=reviewCodexConfigReply(text),config=JSON.parse(text).result.config;
 const host=Object.hasOwn(config.features??{},'code_mode_host')&&config.features.code_mode_host===false;
 const fallback=Object.hasOwn(config.code_mode??{},'disable_in_process_fallback')&&config.code_mode.disable_in_process_fallback===false;
 return {reviewVersion:codeModeGuardVersion,baseControlsMatched:base.configuredControlsMatched,
  hostExplicitlyDisabled:host,fallbackFlagExplicitlyFalse:fallback,
  candidateConfigurationMatched:base.configuredControlsMatched&&host&&fallback,
  localTransportVerified:false,providerOverrideExcluded:false,nativeHandlerDenialVerified:false,dispatchEnabled:false};
}
// Inputs are serialized, bounded metadata. No arbitrary warning text is returned.
export function reviewCodeModeGuardWarning(configText,warningText,expectedThread){
 const config=reviewCodeModeGuardConfig(configText);
 if(typeof warningText!=='string'||Buffer.byteLength(warningText)>4096||typeof expectedThread!=='string'||!/^fictional-guard-thread-[12]$/.test(expectedThread))throw Error('guard_warning_rejected');
 let event;try{event=JSON.parse(warningText);}catch{throw Error('guard_warning_rejected');}
 const p=event?.params;
 const matched=event?.method==='warning'&&p?.threadId===expectedThread&&p?.message===disabledWarning&&
  Object.keys(event).sort().join(',')==='method,params'&&Object.keys(p).sort().join(',')==='message,threadId';
 return {reviewVersion:codeModeGuardVersion,expectedWarningMatched:matched,
  fixtureContinuationAllowed:config.candidateConfigurationMatched&&matched,
  nativeWarningValidated:false,rawMessageReturned:false,dispatchEnabled:false,productionAdmission:false};
}

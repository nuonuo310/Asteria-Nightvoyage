// Bounded offline/live journal adapter for the fresh one-dream transport.
import {OneDreamClient} from './client.mjs';
import {readOneDreamAuthorization} from './authorization.mjs';
import {OneDreamRuntime} from './runtime.mjs';
import {fail} from '../../src/store.js';
import {classifyFailure,classifyHttpStatus,classifyNativeTransport} from '../nv-deepseek-failure-diagnostics/classify.mjs';
import {FailureReceiptJournal} from '../nv-deepseek-failure-diagnostics/journal.mjs';

const dispatchContractCodes=new Set(['one_dream_transport_contract_mismatch','one_dream_loopback_required','one_dream_runtime_mode_mismatch','one_dream_authorized_stage_mismatch']);
const safeId=value=>typeof value==='string'&&/^[\w-]{1,100}$/.test(value)&&!['__proto__','constructor','prototype'].includes(value);
function boundedReadError(code){const error=Error(code);error.code=code;return error;}
function trackedResponse(response,trace){
  if(!response||typeof response!=='object')return response;
  const body=response.body;
  if(!body||typeof body.getReader!=='function')return response;
  return {status:response.status,body:{getReader(){const reader=body.getReader();return {read:async()=>{try{return await reader.read();}catch(error){const aborted=error?.name==='AbortError'||error?.code==='ABORT_ERR';trace.responseAborted=aborted;trace.responseReadError=!aborted;throw boundedReadError(aborted?'provider_response_aborted':'provider_response_read_failed');}},cancel:(...args)=>reader.cancel(...args),releaseLock:()=>reader.releaseLock()};}}};
}
function authorizationIdentity(store){
  try{const record=readOneDreamAuthorization(store,{allowExpired:true,allowRevoked:true});return {contractHash:record.terms.contractHash,termsHash:record.termsHash};}
  catch{return {contractHash:null,termsHash:null};}
}
export class DiagnosticOneDreamClient extends OneDreamClient{
  constructor(store,options={}){
    if(!['stub','live'].includes(options.mode))fail('diagnostic_mode_invalid');
    super(store,options);
    this.diagnosticJournal=new FailureReceiptJournal(store.directory);
    this.diagnosticIdentity=authorizationIdentity(store);
    this.diagnosticTraces=new Map();
    this.diagnosticActiveTrace=undefined;
    const ledger=this.ledger,reserve=ledger.reserve.bind(ledger),dispatch=ledger.dispatch.bind(ledger),settle=ledger.settle.bind(ledger);
    ledger.reserve=(...args)=>{const result=reserve(...args),trace=this.diagnosticTraces.get(args[1]?.requestId);if(trace){trace.reservationPersisted=!result.replayed;trace.replayed=result.replayed;}return result;};
    ledger.dispatch=(...args)=>{const result=dispatch(...args),trace=this.diagnosticTraces.get(args[1]);if(trace)trace.dispatchIntentPersisted=true;return result;};
    ledger.settle=(...args)=>{
      const trace=this.diagnosticTraces.get(args[1]);
      try{return settle(...args);}
      catch(error){if(trace){if(error?.message==='one_dream_publication_failed')trace.publicationError=true;else trace.settlementError=error?.message;}throw error;}
    };
  }
  checkProviderBody(body,credential){
    try{return super.checkProviderBody(body,credential);}
    catch(error){if(this.diagnosticActiveTrace)this.diagnosticActiveTrace.protocolError=error?.message;throw error;}
  }
  async dispatchTransport(endpoint,request,context){
    const trace=this.diagnosticTraces.get(context?.requestId);
    if(!trace)return super.dispatchTransport(endpoint,request,context);
    trace.transportInvoked=true;
    try{
      const response=await super.dispatchTransport(endpoint,request,context);
      if(Number.isInteger(response?.status)){trace.httpStatus=response.status;trace.httpStatusClass=classifyHttpStatus(response.status);}
      return response.status===200?trackedResponse(response,trace):response;
    }catch(error){
      if(error?.code==='provider_response_aborted')trace.responseAborted=true;
      else if(error?.code==='provider_response_read_failed')trace.responseReadError=true;
      else if(error?.code==='provider_response_too_large')trace.responseTooLarge=true;
      const typed=/^provider_response_(?:aborted|read_failed|too_large)$/.test(error?.code);
      trace.transportObservation=typed?'not_classified':classifyNativeTransport(error);
      trace.dispatchContractRejected=dispatchContractCodes.has(error?.message);
      throw error;
    }
  }
  async send(args={}){
    const trace={requestId:args.requestId,runId:args.runId,stage:args.payload?.stage,stageIndex:args.payload?.index,reservationPersisted:false,dispatchIntentPersisted:false,transportInvoked:false,transportObservation:'not_attempted',httpStatusClass:'not_observed',replayed:false,timedOut:false};
    this.diagnosticTraces.set(args.requestId,trace);this.diagnosticActiveTrace=trace;
    try{return await super.send(args);}
    catch(error){
      if(error?.message==='timeout')trace.timedOut=true;
      const classified=classifyFailure({errorMessage:error?.message,trace});
      if(safeId(args.runId)&&safeId(args.requestId)&&['scene','wake'].includes(args.payload?.stage)&&Number.isSafeInteger(args.payload?.index)&&args.payload.index>=0&&args.payload.index<=2){
        try{
          this.diagnosticJournal.append({runId:args.runId,requestId:args.requestId,stage:args.payload.stage,stageIndex:args.payload.index,phase:classified.phase,diagnosticClass:classified.diagnosticClass,dispatchIntent:trace.dispatchIntentPersisted?'persisted':'none',transportObservation:classified.transportObservation,httpStatusClass:classified.httpStatusClass,identity:this.diagnosticIdentity});
        }catch{fail('diagnostic_receipt_storage_failed');}
      }
      throw error;
    }finally{this.diagnosticTraces.delete(args.requestId);if(this.diagnosticActiveTrace===trace)this.diagnosticActiveTrace=undefined;}
  }
}
export class DiagnosticOneDreamRuntime extends OneDreamRuntime{
  createBudgetClient(options){return new DiagnosticOneDreamClient(this.store,options);}
}

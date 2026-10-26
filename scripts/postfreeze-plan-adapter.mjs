// Post-freeze direct ChatGPT Plan adapter. The reviewed decoder is reused unchanged.
import {MissingTypePlanAdapter,stageRequest,stageResponse} from './missing-type-model-port.mjs';
import {ValidatedEnvelopeStream,offlineEnvelopeVersion} from './validated-envelope-stream.mjs';
import {envelopeDiagnostic} from './envelope-diagnostic.mjs';
import {markPlanResponseFailure} from './plan-response-diagnostic.mjs';
const fail=code=>{throw Error(code);};
export const postfreezeDecoderVersion=offlineEnvelopeVersion;

function reviewedFailure(error){
  const diagnostic=envelopeDiagnostic(error);
  if(diagnostic?.layer!=='responses_envelope')return markPlanResponseFailure(error);
  const check=diagnostic.check;
  let code='plan_output_shape';
  if(['stream_byte_limit','event_limit'].includes(check))code='plan_stream_limit';
  else if(['invalid_utf8','invalid_event_json','event_shape','event_sequence'].includes(check))code='plan_invalid_stream';
  else if(['trailing_or_incomplete_stream','response_not_completed'].includes(check))code='plan_incomplete_response';
  return markPlanResponseFailure(Error(code));
}

export class PostfreezePlanAdapter extends MissingTypePlanAdapter {
  #transport;
  constructor({model_id,httpTransport}){
    super({model_id,httpTransport});
    this.#transport=httpTransport;
  }
  async generate(input,{signal}={}){
    if(!this.preflight().ready)fail('authorization_required');
    const request=stageRequest(input);if(signal?.aborted)fail('cancelled');
    try{
      const draft=this.prepare(request),chunks=this.#transport.stream(draft,request,{signal});
      const stream=new ValidatedEnvelopeStream(this.identity.model_id);
      for await(const chunk of chunks){if(signal?.aborted)fail('cancelled');stream.push(chunk);}
      if(signal?.aborted)fail('cancelled');const {data,usage}=stream.finish();
      return stageResponse({value:data,usage:{input_tokens:usage.inputTokens,output_tokens:usage.outputTokens,total_tokens:usage.totalTokens}},request);
    }catch(error){throw reviewedFailure(error);}
  }
}

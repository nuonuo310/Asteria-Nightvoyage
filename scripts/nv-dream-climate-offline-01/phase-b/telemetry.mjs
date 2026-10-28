import {fail} from '../../../src/store.js';

const counter=value=>Number.isSafeInteger(value)&&value>=0;

export function createLiveDispatchTelemetry(){
  let networkAttempts=0,realModelRequests=0;
  return Object.freeze({
    recordNetworkAttempt(){
      if(!counter(networkAttempts))fail('invalid_dream_climate_live_network_attempt_count');
      networkAttempts++;
    },
    recordRealModelRequest(){
      if(!counter(realModelRequests))fail('invalid_dream_climate_live_model_request_count');
      realModelRequests++;
    },
    snapshot(){
      return {networkAttempts,realModelRequests,requestOutcomeKnown:true};
    }
  });
}

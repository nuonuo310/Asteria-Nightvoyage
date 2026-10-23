// Offline HTTP-shaped byte boundary. It has no fetch, credential or provider path.
import {chatgptPlanLimits} from './chatgpt-plan-protocol.mjs';
import {markPlanHttpFailure} from './plan-response-diagnostic.mjs';
export const offlineAggregateIntegrationHttpVersion='offline-aggregate-integration-http-v1';
const fail=check=>markPlanHttpFailure(Error('invalid_model_response'),check);
export async function* boundedOfflineAggregateChunks(source){
  let bytes=0;
  for await(const value of source){
    if(!(value instanceof Uint8Array))throw fail('http_stream_chunk_invalid');
    bytes+=value.byteLength;
    if(bytes>chatgptPlanLimits.streamBytes)throw fail('http_stream_limit');
    yield value;
  }
}

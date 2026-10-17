import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PassThrough} from 'node:stream';
import {readInlineCredentialFrame} from '../src/inline-credential-pipe.js';
test('private credential frame accepts bounded split input and returns only its value',async()=>{
  const stream=new PassThrough(),pending=readInlineCredentialFrame(stream);stream.write('{"creden');stream.end('tial":"DUMMY-PIPE-ONLY"}');assert.equal(await pending,'DUMMY-PIPE-ONLY');
});
for(const body of ['', '{}','null','[]','{"credential":1}','{"credential":""}','{"credential":"bad key"}','{"credential":"x","extra":"PRIVATE-SENTINEL"}','{"credential":"x"}{}',JSON.stringify({credential:'x'.repeat(2001)}),'x'.repeat(8193)])test(`credential pipe rejects malformed shape/size ${body.length} without echo`,async()=>{
  const stream=new PassThrough(),pending=readInlineCredentialFrame(stream);stream.end(body);await assert.rejects(pending,error=>error.message==='credential_pipe_refused');
});
test('stalled, aborted and stream-error credential input all close with fixed errors',async()=>{
  for(const kind of ['stalled','aborted','already-aborted','error']){const stream=new PassThrough(),controller=new AbortController();if(kind==='already-aborted')controller.abort();const pending=readInlineCredentialFrame(stream,{signal:controller.signal,timeoutMs:5});if(kind==='aborted')controller.abort();if(kind==='error')stream.emit('error',Error('PRIVATE-SENTINEL'));await assert.rejects(pending,/^Error: credential_pipe_refused$/);assert.equal(stream.listenerCount('data'),0);stream.destroy();}
});

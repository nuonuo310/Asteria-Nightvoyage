import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {planEnvelopePrefixReview as review} from '../scripts/plan-envelope-prefix-review.mjs';
test('bounded prefixes label synthetic SSE, HTML and JSON without accepting inference or exposing content',()=>{
 for(const [prefix,shape]of [['event: response.created\ndata: PRIVATE','sse_like_prefix'],['data: PRIVATE','sse_like_prefix'],[': PRIVATE','sse_like_prefix'],['<!doctype html><html>PRIVATE','html_like_prefix'],['<html lang="x">PRIVATE','html_like_prefix'],['{"PRIVATE":','json_like_prefix'],['["PRIVATE"','json_like_prefix'],['PRIVATE','unrecognized_prefix']]){
  const out=review(Buffer.from(prefix+'x'.repeat(9000)));assert.equal(out.prefixShape,shape);assert.equal(out.inferenceAccepted,false);assert.equal(out.completeBodyValidated,false);assert.equal(out.dispatchEnabled,false);assert.equal(out.bodyReturned,false);assert.equal(out.usage,'unknown');assert.equal(out.qualityAssessed,false);assert.equal(JSON.stringify(out).includes('PRIVATE'),false);
 }
});
test('prefix boundary never validates trailing data, incomplete JSON, SSE completion or exact billing',()=>{
 const prefix=Buffer.alloc(8192,32),body=Buffer.concat([prefix,Buffer.from('event: response.completed\ndata: PRIVATE')]);assert.equal(review(body).prefixShape,'empty_prefix');
 for(const value of ['{','[','event: response.completed\ndata: {"usage":999999}\n\n','data: [DONE]\n\n'])assert.equal(review(Buffer.from(value)).completeBodyValidated,false);
 assert.equal(review(Buffer.from('eventual: PRIVATE')).prefixShape,'unrecognized_prefix');assert.equal(review(Buffer.from('<htmlish>PRIVATE')).prefixShape,'unrecognized_prefix');
});
test('UTF8 split at inspection ceiling is not corruption, malformed inspected bytes remain invalid',()=>{
 const body=Buffer.concat([Buffer.from('data: '),Buffer.alloc(8185,32),Buffer.from('梦PRIVATE')]);assert.equal(review(body).prefixShape,'sse_like_prefix');
 assert.equal(review(new Uint8Array([255])).prefixShape,'invalid_utf8');assert.equal(review(Buffer.concat([Buffer.alloc(8192,32),new Uint8Array([255])])).prefixShape,'empty_prefix');assert.equal(review('PRIVATE').prefixShape,'invalid_input');
});
test('offline prefix output is detached and has no network, file, authorization or production dependency',()=>{
 const bytes=Buffer.from('data: PRIVATE'),out=review(bytes);out.prefixShape='PRIVATE';assert.equal(review(bytes).prefixShape,'sse_like_prefix');assert.equal(bytes.toString(),'data: PRIVATE');
 const source=fs.readFileSync(new URL('../scripts/plan-envelope-prefix-review.mjs',import.meta.url),'utf8');assert.equal(/^import\s/m.test(source),false);assert.equal(/\bfetch\s*\(|child_process|planSessionCredential|createPlanHttpTransport|readFile|writeFile/.test(source),false);
});

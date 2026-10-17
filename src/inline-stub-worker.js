// Trusted prelude: only Node builtins and the parse/load helper before constraints.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {inlineDependencyGraph,constrainInlineModules} from './inline-entry-dependencies.js';
const root=fileURLToPath(new URL('..',import.meta.url));
const stop=()=>{throw Error('stub_bootstrap_source_rejected');};
function text(relative){
  const filename=path.join(root,relative);let p=filename;
  for(;;){if(fs.lstatSync(p).isSymbolicLink())stop();const parent=path.dirname(p);if(parent===p)break;p=parent;}
  const stat=fs.statSync(filename);if(!stat.isFile()||stat.size>2097152)stop();const bytes=fs.readFileSync(filename),value=bytes.toString('utf8');if(!Buffer.from(value).equals(bytes))stop();return value.replaceAll('\r\n','\n');
}
export function verifyInlineBootstrap({entry='src/inline-stub-session.js',graphPath='src/inline-bootstrap-graph.json'}={}){
  if(![['src/inline-stub-session.js','src/inline-bootstrap-graph.json'],['src/inline-paid-session.js','src/inline-paid-graph.json']].some(pair=>pair[0]===entry&&pair[1]===graphPath))stop();
  const review=JSON.parse(text('src/inline-entry-review.json'));
  if(review.schemaVersion!==1||review.reviewVersion!=='inline-entry-readiness-v1'||review.protocolVersion!=='inline-evidence-quotes-v1'||review.paidEvaluationApproved!==false||review.fixtureEgressApproved!==false||review.liveEntryAvailable!==false||review.pricing!==null||review.budgetCny!==null||review.inventoryScope!=='all-src-and-fixtures-plus-package-excluding-self'||review.fixturePath!=='fixtures/quality/sparse-context.json')stop();
  const actual={};const add=p=>{actual[p]=createHash('sha256').update(text(p)).digest('hex');};
  const walk=p=>{for(const entry of fs.readdirSync(path.join(root,p),{withFileTypes:true})){const name=p+'/'+entry.name;if(name==='src/inline-entry-review.json')continue;if(entry.isSymbolicLink())stop();if(entry.isDirectory())walk(name);else if(entry.isFile())add(name);else stop();}};
  walk('src');walk('fixtures');add('package.json');
  if(!review.files||Object.keys(actual).length!==Object.keys(review.files).length||Object.entries(actual).some(([p,h])=>review.files[p]!==h))stop();
  const pkg=JSON.parse(text('package.json'));if(Object.keys(pkg.dependencies??{}).length||Object.keys(pkg.optionalDependencies??{}).length)stop();
  const expected=JSON.parse(text(graphPath)),graph=inlineDependencyGraph(root,entry);
  if(JSON.stringify(graph)!==JSON.stringify(expected))stop();return graph;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    const [command,directory,...extra]=process.argv.slice(2);
    if(extra.length||!['run','resume'].includes(command)||!directory||!path.isAbsolute(directory)||Object.keys(process.env).some(k=>!['SystemRoot','SYSTEMROOT','WINDIR','TEMP','TMP','TMPDIR','LANG','LC_ALL'].includes(k)))stop();
    let requests=0,keys=0;
    Object.defineProperty(globalThis,'fetch',{value:()=>{requests++;throw Error('native_network_forbidden');},writable:false,configurable:false});
    process.env=new Proxy(process.env,{get(target,key){if(key==='NIGHTVOYAGE_DEEPSEEK_KEY'){keys++;throw Error('credential_forbidden');}return Reflect.get(target,key);}});
    const graph=verifyInlineBootstrap();
    // Keep hooks installed for the entire session, including response/publication.
    constrainInlineModules(graph,root);
    const {runInlineStubSession}=await import('./inline-stub-session.js');
    const result=await runInlineStubSession(command,directory);
    if(requests||keys)stop();
    console.log(JSON.stringify({...result,bootstrapVersion:'inline-clean-stub-bootstrap-v1',constrainedModules:Object.keys(graph.files).length,environmentAllowlisted:true,nativeRequests:requests,credentialReads:keys,liveEntryAvailable:false,qualityAssessed:false,semanticSupport:'not_assessed'}));
    if(result.status!=='completed')process.exitCode=1;
  }catch{console.error('stub_bootstrap_refused');process.exitCode=1;}
}

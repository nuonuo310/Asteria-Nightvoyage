// No-argument, read-only admission check for the reviewed offline source inventory.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {verifyInventory,hashText,inventoryVersion} from './codex-accounted-source-inventory.mjs';

const expectedManifestHash='684a3e24c568fe28d95eb91a1ed1ab6385c2fa307bdd58cfb60bb120b5733172';
const contractVersion='codex-accounted-source-admission-check-v1';
const manifestPath='docs/proposals/codex-accounted-source-admission-v1.json';
const repoRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const result={contractVersion,inventoryContractVersion:inventoryVersion,status:'blocked',generationEnabled:false,productionAdmission:false,
 credentialsRead:false,realModelRequests:0,nativeChildProcessesStarted:0,authOperationsStarted:0,userStateDirectoriesCreated:0,
 realProviderStatus:'unverified',externalBinaryStatus:'unverified',entitlementStatus:'unverified',manifest:{path:manifestPath,sha256:null},
 counts:null,closureHash:null,edgesHash:null,files:[],diagnostics:[],unresolved:{unknownEdges:0,computedCodeLoads:0,unverifiedRuntimeInputs:null}};
try{
 if(process.argv.length!==2)throw Error('entry_arguments_invalid');
 const absolute=path.join(repoRoot,manifestPath),bytes=fs.readFileSync(absolute),manifestHash=hashText(bytes.toString('utf8'));
 const manifest=JSON.parse(bytes.toString('utf8'));
 const verified=verifyInventory({repoRoot,manifest,manifestHash,expectedManifestHash});
 const unverifiedRuntimeInputs=manifest.runtimeInputs.filter(item=>item.status==='unverified'||item.verifiedByInventory===false).length;
 const status=verified.status==='verified'?'repository_source_inventory_verified':'blocked';
 Object.assign(result,{status,manifest:{path:manifestPath,sha256:manifestHash},counts:verified.counts??null,
  closureHash:verified.closureHash??null,edgesHash:verified.edgesHash??null,files:(verified.files??[]).map(({path:value,sha256,kind})=>({path:value,sha256,kind})),
  diagnostics:(verified.diagnostics??[]).map(({code,path:value,line})=>({code,path:value,line})),unresolved:{unknownEdges:0,computedCodeLoads:0,unverifiedRuntimeInputs}});
}catch(error){
 const known=['entry_arguments_invalid','manifest_invalid'];
 result.diagnostics=[{code:known.includes(error.message)?error.message:'checker_internal_failure',path:null,line:null}];
}
if(result.status!=='repository_source_inventory_verified')process.exitCode=1;
console.log(JSON.stringify(result,null,2));

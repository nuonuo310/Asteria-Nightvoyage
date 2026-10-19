// Independent fixed Node peer. Not Codex, OAuth, or a real provider.
const scenario=process.argv[2];
const marker='nightvoyage-independent-oauth-sentinel-not-a-credential';
const allowed=['ACCESS_TOKEN','PATH','SystemRoot','WINDIR'];
const ok=process.env.ACCESS_TOKEN===marker&&Object.keys(process.env).every(k=>allowed.includes(k))&&
 !process.argv.some(a=>a.includes(marker))&&process.argv[3]==='Asteria-Nightvoyage';
if(!ok)process.exit(2);
if(scenario==='timeout'||scenario==='cancel'||scenario==='late_response'){
 setTimeout(()=>{process.stdout.write(JSON.stringify({kind:'lease_checked',tokenPresent:true,argvClean:true,attributionMatched:true})+'\n');},2000);
}else if(scenario==='secret_output'){
 process.stdout.write(marker+'\n');
}else if(scenario==='failed_child'){
 process.stderr.write('untrusted child detail '+marker+'\n');process.exitCode=7;
}else{
 process.stdout.write(JSON.stringify({kind:'lease_checked',tokenPresent:true,argvClean:true,attributionMatched:true})+'\n');
}

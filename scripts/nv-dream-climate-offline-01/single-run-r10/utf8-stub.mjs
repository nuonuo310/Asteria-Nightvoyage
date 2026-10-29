// Read-only UTF-8 fake worker for capture tests. It consumes one synthetic
// stdin frame and never reads a credential, environment secret, Store or net.
import fs from 'node:fs';
import path from 'node:path';

const args=process.argv.slice(2);
const mode=args.includes('--mode')?args[args.indexOf('--mode')+1]:'ok';
const outIndex=args.indexOf('--out');
const out=outIndex>=0?args[outIndex+1]:null;

for await (const chunk of process.stdin) { void chunk; }

const quote=String.fromCharCode(34);
const payload='中文'+quote+'引号'+quote+'与反斜杠\\和换行\n第二行\r\n第三行😀🌙𠀋';

if(mode==='error'){
  process.stderr.write('stderr:'+payload+'\n');
  process.exitCode=3;
}else if(mode==='empty'){
  process.exitCode=0;
}else if(mode==='garbage'){
  process.stdout.write(Buffer.from([0x7B,0xC3,0x28,0x7D,0x0A]));
  process.exitCode=0;
}else if(mode==='ok'){
  if(out){
    const file=path.join(out,'receipt.json');
    const document={schemaVersion:1,receiptFileVersion:'nv-dream-climate-single-run-r10-receipt-file-v1',
      encoding:'UTF-8',materialKind:'fictional',isRealityFact:false,
      receipt:{status:'completed',payload}};
    fs.writeFileSync(file,`${JSON.stringify(document,null,2)}\n`,{encoding:'utf8',flag:'wx'});
  }
  process.stdout.write(JSON.stringify({type:'result',value:{status:'completed',payload,
    unicodeCount:[...payload].length}})+'\n');
  process.exitCode=0;
}else{
  process.stderr.write('unknown_mode\n');
  process.exitCode=4;
}

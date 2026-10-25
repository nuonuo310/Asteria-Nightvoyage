// Independent fictional loopback HTTP stand-in. No provider, proxy, key or retry.
import http from 'node:http';
import {oneDreamLocalCredential, oneDreamLoopbackKind} from './policy.mjs';

const host='127.0.0.1';
const pathName='/fictional-stage';
export const oneDreamLoopbackScenes=Object.freeze([
  '虚构的玻璃果园在无风的清晨出现，枝条里悬着没有重量的橙色果实。',
  '果园深处的木门自行打开，门后是一段铺着细白砂石的小路，路面一直伸进低矮的天空。'
]);
export const oneDreamLoopbackWakeFragment='铺着细白砂石的小路';
function fictionalData(material){
  if(material?.stage==='scene'){
    if(material.sceneIndex!==0&&material.sceneIndex!==1)return null;
    return {event:oneDreamLoopbackScenes[material.sceneIndex],appraisal:{goalEffect:0,control:.5,uncertainty:.5},basis:{goal:null,control:null,uncertainty:null},affect:{kind:'unchanged'}};
  }
  if(material?.stage==='wake'&&Array.isArray(material.previousScenes)&&material.previousScenes.length===2){
    const fragment=oneDreamLoopbackWakeFragment;
    if(!material.previousScenes.some(scene=>scene.event.includes(fragment)))return null;
    return {fragment,residue:.12,associations:[]};
  }
  return null;
}
function fictionalEnvelope(data){return {model:'deepseek-flash',choices:[{finish_reason:'stop',message:{role:'assistant',content:JSON.stringify(data)}}],usage:{prompt_tokens:180,completion_tokens:90,total_tokens:270}};}
export async function createOneDreamLoopback({handler}={}){
  if(handler!==undefined&&typeof handler!=='function')throw Error('one_dream_loopback_handler_invalid');
  const sockets=new Set(),requests=[];
  const respond=(response,status,body)=>{
    if(response.headersSent)return;
    if(status===200){const bytes=Buffer.from(JSON.stringify(body));response.writeHead(200,{'Content-Type':'application/json','Content-Length':bytes.length,'Cache-Control':'no-store'});response.end(bytes);}
    else{response.writeHead(status,{'Content-Type':'text/plain','Content-Length':0,'Cache-Control':'no-store'});response.end();}
  };
  const server=http.createServer({maxHeaderSize:8192},(request,response)=>{
    if(request.method!=='POST'||request.url!==pathName){respond(response,404);return;}
    const address=server.address();
    if(!address||request.headers.host!==`${host}:${address.port}`||request.headers.authorization!==`Bearer ${oneDreamLocalCredential}`||request.headers['content-type']!=='application/json'){respond(response,403);return;}
    let size=0;const chunks=[];
    request.on('data',chunk=>{size+=chunk.length;if(size>65536){request.destroy();return;}chunks.push(Buffer.from(chunk));});
    request.on('end',async()=>{
      const raw=Buffer.concat(chunks).toString('utf8');let body,material,data;
      try{body=JSON.parse(raw);material=JSON.parse(body.messages[1].content);data=fictionalData(material);}catch{respond(response,400);return;}
      if(!data){respond(response,422);return;}
      const entry={index:requests.length,body,material,raw};requests.push(entry);
      try{
        if(handler)await handler({index:entry.index,body,material,raw,request,response,respond:(status,payload)=>respond(response,status,payload??fictionalEnvelope(fictionalData(material)))});
        else respond(response,200,fictionalEnvelope(data));
      }catch{respond(response,500);}
    });
    request.on('error',()=>{});
  });
  server.on('connection',socket=>{sockets.add(socket);socket.on('close',()=>sockets.delete(socket));});
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,host,()=>{server.off('error',reject);resolve();});});
  const address=server.address(),origin=`http://${host}:${address.port}`,localUrl=origin+pathName;
  const transport=(_endpoint,request)=>new Promise((resolve,reject)=>{
    let settled=false,client;
    const stop=()=>{if(settled)return;settled=true;try{client?.destroy();}catch{}reject(Error('one_dream_loopback_transport_failed'));};
    try{
      client=http.request({host,port:address.port,path:pathName,method:'POST',headers:request.headers,agent:false,signal:request.signal},response=>{
        const chunks=[];let bytes=0;response.on('error',stop);response.on('aborted',stop);
        response.on('data',chunk=>{if(settled)return;bytes+=chunk.length;if(bytes>65536){try{response.destroy();}catch{}stop();}else chunks.push(Buffer.from(chunk));});
        response.on('end',()=>{if(settled)return;settled=true;resolve(new Response(Buffer.concat(chunks),{status:response.statusCode}));});
      });
      client.on('error',stop);client.end(request.body);
    }catch{stop();}
  });
  let closed=false;
  return Object.freeze({
    kind:oneDreamLoopbackKind,origin,url:localUrl,host,transport,requests,
    get posts(){return requests.length;},
    async close(){if(closed)return;closed=true;for(const socket of sockets)try{socket.destroy();}catch{}await new Promise(resolve=>server.close(()=>resolve()));}
  });
}

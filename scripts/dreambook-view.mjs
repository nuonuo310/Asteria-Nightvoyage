// Loopback-only, read-only browser view over the existing Dreambook projection.
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {Store} from '../src/store.js';
import {safeId} from '../src/contract.js';
import {dreambookCatalog} from './dreambook.mjs';
import {readDreambookLaterRecords,readDreambookView} from './dreambook-view-records.mjs';
import {renderDreambookViewHtml} from './dreambook-view-html.mjs';
import {prepareDreambookViewDemo} from './dreambook-view-demo.mjs';
export const dreambookViewVersion='local-dreambook-view-v1';
export const dreambookViewCloseFailure='store_close_failed';
const bootstrapUsername='nightvoyage';
const fail=code=>{throw Error(code);};
const host='127.0.0.1';
const securityHeaders=Object.freeze({
  'Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; script-src 'none'; connect-src 'none'; img-src 'none'; font-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; object-src 'none'",
  'Cross-Origin-Opener-Policy':'same-origin',
  'Cross-Origin-Resource-Policy':'same-origin',
  'Referrer-Policy':'no-referrer',
  'X-Content-Type-Options':'nosniff',
  'Cache-Control':'no-store, max-age=0',
  Pragma:'no-cache',
  'Permissions-Policy':'camera=(), microphone=(), geolocation=(), payment=(), usb=()'
});
function send(res,status,body,{head=false,contentType='text/plain; charset=utf-8'}={}){
  const bytes=Buffer.from(body,'utf8');
  res.writeHead(status,{...securityHeaders,'Content-Type':contentType,'Content-Length':bytes.byteLength});
  res.end(head?undefined:bytes);
}
function equalText(left,right){
  if(typeof left!=='string'||typeof right!=='string')return false;
  const a=Buffer.from(left),b=Buffer.from(right);
  return a.byteLength===b.byteLength&&crypto.timingSafeEqual(a,b);
}
function closeFailure({serverError=false,storeError=false}={}){
  const error=Error(storeError?dreambookViewCloseFailure:'dreambook_view_close_failed');
  error.cleanup=Object.freeze({httpListenerClosed:!serverError,storeReleaseConfirmed:!storeError});
  return error;
}
export async function startDreambookViewServer({store,dreamId,demo=false,port=0}={}){
  if(!(store instanceof Store))fail('managed_store_required');
  if(!safeId(dreamId))fail('invalid_dreambook_entry');
  if(!Number.isSafeInteger(port)||port<0||port>65535)fail('invalid_dreambook_view_arguments');
  if(!readDreambookView(store,dreamId))fail('dream_not_visible');
  readDreambookLaterRecords(store,dreamId);
  const bootstrapPassword=crypto.randomBytes(32).toString('base64url');
  const expectedAuthorization=`Basic ${Buffer.from(`${bootstrapUsername}:${bootstrapPassword}`).toString('base64')}`;
  const realm=`Nightvoyage local Dreambook ${crypto.randomBytes(6).toString('hex')}`;
  const requireAuthorization=(res,head=false)=>{
    res.setHeader('WWW-Authenticate',`Basic realm=\x22${realm}\x22, charset=\x22UTF-8\x22`);
    send(res,401,'需要本地只读解锁：请输入终端显示的 bootstrap 用户名和令牌。',{head});
  };
  let expectedOrigin=null,closed=false,closePromise=null;
  const server=http.createServer((req,res)=>{
    try{
      if(closed){send(res,503,'本地梦簿已经关闭。');return;}
      if(!['GET','HEAD'].includes(req.method)){res.setHeader('Allow','GET, HEAD');send(res,405,'Method not allowed.');return;}
      if(typeof req.url!=='string'||req.url.length>2048||!['/','/favicon.ico'].includes(req.url)){send(res,404,'Not found.');return;}
      if(req.headers.host!==`${host}:${new URL(expectedOrigin).port}`){send(res,403,'Local view request rejected.');return;}
      const remote=req.socket.remoteAddress;
      if(remote!==host&&remote!==`::ffff:${host}`){send(res,403,'Local view request rejected.');return;}
      const origin=req.headers.origin;
      if(origin!==undefined&&origin!==expectedOrigin){send(res,403,'Local view request rejected.');return;}
      const referer=req.headers.referer;
      if(referer!==undefined&&!referer.startsWith(`${expectedOrigin}/`)){send(res,403,'Local view request rejected.');return;}
      const site=req.headers['sec-fetch-site'];
      if(site!==undefined&&!['none','same-origin'].includes(site)){send(res,403,'Local view request rejected.');return;}
      if(!equalText(req.headers.authorization,expectedAuthorization)){requireAuthorization(res,req.method==='HEAD');return;}
      if(req.url==='/favicon.ico'){res.writeHead(204,{...securityHeaders,'Cache-Control':'no-store'});res.end();return;}
      const view=readDreambookView(store,dreamId);
      if(!view){send(res,410,'梦境当前不可访问。');return;}
      const html=renderDreambookViewHtml(view,{demo,laterRecords:readDreambookLaterRecords(store,dreamId)});
      send(res,200,html,{head:req.method==='HEAD',contentType:'text/html; charset=utf-8'});
    }catch{
      send(res,503,'本地梦簿暂时不可读取。');
    }
  });
  server.maxHeadersCount=32;
  server.requestTimeout=5000;
  server.headersTimeout=5000;
  server.on('clientError',(_error,socket)=>{if(socket.writable)socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n');});
  await new Promise((resolve,reject)=>{
    const onError=error=>reject(error);
    server.once('error',onError);
    server.listen(port,host,()=>{
      server.off('error',onError);
      const bound=server.address();
      if(!bound||bound.address!==host){server.close(()=>reject(Error('invalid_dreambook_view_binding')));return;}
      expectedOrigin=`http://${host}:${bound.port}`;
      resolve();
    });
  });
  const address=server.address();
  const close=()=>{
    if(closePromise)return closePromise;
    closed=true;
    closePromise=new Promise((resolve,reject)=>{
      server.closeAllConnections?.();
      server.close(error=>{
        let storeError=false;
        try{store.close();}catch{storeError=true;}
        if(error||storeError)reject(closeFailure({serverError:Boolean(error),storeError}));else resolve();
      });
    });
    return closePromise;
  };
  return Object.freeze({version:dreambookViewVersion,url:`${expectedOrigin}/`,port:address.port,host,close,server,bootstrap:Object.freeze({username:bootstrapUsername,password:bootstrapPassword})});
}
function parseArgs(args){
  const options={demo:false,dataDir:null,latest:false,dreamId:null,port:0,portSet:false,open:false,openSet:false,help:false};
  for(let index=0;index<args.length;index++){
    const key=args[index];
    if(key==='--help'){if(args.length!==1)fail('invalid_dreambook_view_arguments');options.help=true;continue;}
    if(key==='--demo'){if(options.demo)fail('invalid_dreambook_view_arguments');options.demo=true;continue;}
    if(key==='--latest'){if(options.latest)fail('invalid_dreambook_view_arguments');options.latest=true;continue;}
    if(key==='--no-open'){if(options.openSet)fail('invalid_dreambook_view_arguments');options.openSet=true;options.open=false;continue;}
    if(key==='--open'){if(options.openSet)fail('invalid_dreambook_view_arguments');options.openSet=true;options.open=true;continue;}
    if(key==='--data-dir'){
      if(options.dataDir!==null)fail('invalid_dreambook_view_arguments');
      const value=args[++index];if(!value||value.startsWith('--')||!path.isAbsolute(value))fail('absolute_dreambook_store_required');options.dataDir=value;continue;
    }
    if(key==='--dream-id'){
      if(options.dreamId!==null)fail('invalid_dreambook_view_arguments');
      const value=args[++index];if(!safeId(value))fail('invalid_dreambook_view_arguments');options.dreamId=value;continue;
    }
    if(key==='--port'){
      if(options.portSet)fail('invalid_dreambook_view_arguments');
      const value=args[++index];if(!/^\d{1,5}$/.test(value??''))fail('invalid_dreambook_view_arguments');
      options.port=Number(value);options.portSet=true;if(options.port>65535)fail('invalid_dreambook_view_arguments');continue;
    }
    fail('invalid_dreambook_view_arguments');
  }
  if(options.help)return options;
  if(options.demo&&(options.dataDir!==null||options.latest||options.dreamId!==null))fail('invalid_dreambook_view_arguments');
  if(!options.demo&&(options.dataDir===null||Number(options.latest)+Number(options.dreamId!==null)!==1))fail('dreambook_view_store_required');
  return options;
}
function openBrowser(url){
  const [command,args]=process.platform==='win32'?['cmd.exe',['/d','/s','/c','start','',url]]:process.platform==='darwin'?['open',[url]]:['xdg-open',[url]];
  try{const child=spawn(command,args,{detached:true,stdio:'ignore',windowsHide:true});child.unref();}catch{}
}
export function dreambookViewHelp(){
  return 'Nightvoyage local browser view: node scripts/dreambook-view.mjs --demo [--open] [--port <0-65535>] | node scripts/dreambook-view.mjs --data-dir <absolute existing Store> (--latest | --dream-id <id>) [--open] [--port <0-65535>]. The server binds 127.0.0.1 only and is read-only. Enter the one-time HTTP Basic username and password printed at startup in the browser prompt; the secret is not placed in the URL. Demo creates a temporary fictional Store; an existing Store is opened only when explicitly selected. No login, model call, generation, review write, deletion or remote asset.';
}
export async function runDreambookView(args,{stdout=line=>console.log(line),stderr=line=>console.error(line)}={}){
  const options=parseArgs(args);
  if(options.help){stdout(dreambookViewHelp());return null;}
  let root=null,store=null,server=null;
  try{
    let dreamId,sourceId=null,syntheticStageCalls=0;
    if(options.demo){
      root=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-dreambook-view-demo-'));
      const prepared=await prepareDreambookViewDemo(path.join(root,'book'));
      dreamId=prepared.dreamId;sourceId=prepared.sourceId;syntheticStageCalls=prepared.syntheticStageCalls;
      store=new Store(path.join(root,'book'));
    }else{
      if(!fs.existsSync(path.join(options.dataDir,'state.json')))fail('existing_dreambook_store_required');
      store=new Store(options.dataDir);
      const catalog=dreambookCatalog(store);
      dreamId=options.latest?catalog.dreams.at(-1)?.id:options.dreamId;
      if(!dreamId||!catalog.dreams.some(item=>item.id===dreamId))fail('no_visible_dreambook_dream');
      sourceId=catalog.dreams.find(item=>item.id===dreamId).sourceRefs[0]?.id??null;
    }
    if(!readDreambookView(store,dreamId))fail('dream_not_visible');
    server=await startDreambookViewServer({store,dreamId,demo:options.demo,port:options.port});
    store=null;
    stdout(`Nightvoyage local view: ${server.url}\nBootstrap username: ${server.bootstrap.username}\nBootstrap password: ${server.bootstrap.password}\nBound to 127.0.0.1 only. Enter these in the browser prompt. Press Ctrl+C to close.`);
    if(options.open)openBrowser(server.url);
    return Object.freeze({...server,demo:options.demo,root,sourceId,syntheticStageCalls});
  }catch(error){
    let cleanupError=null;
    try{server?await server.close():store?.close();}catch(error){cleanupError=error;}
    if(!cleanupError&&root)fs.rmSync(root,{recursive:true,force:true});
    if(cleanupError)throw cleanupError;
    throw error;
  }
}
export async function stopDreambookView(running,{stderr=line=>console.error(line)}={}){
  try{
    await running.close();
    if(running.root)fs.rmSync(running.root,{recursive:true,force:true});
    return 0;
  }catch(error){
    const reason=error?.message===dreambookViewCloseFailure?dreambookViewCloseFailure:'dreambook_view_close_failed';
    stderr(`Nightvoyage local view stopped: ${reason}.`);
    return 1;
  }
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
  try{
    const running=await runDreambookView(process.argv.slice(2));
    if(running){
      const stop=async()=>{process.exitCode=await stopDreambookView(running);};
      process.once('SIGINT',stop);process.once('SIGTERM',stop);
    }
  }catch(error){
    const known=['invalid_dreambook_view_arguments','absolute_dreambook_store_required','existing_dreambook_store_required','no_visible_dreambook_dream','invalid_dreambook_entry','unsupported_review_parent','data_inside_checkout','symlink_data','store_busy','store_unavailable','storage_io_failure','dreambook_view_store_required','dream_not_visible',dreambookViewCloseFailure,'dreambook_view_close_failed'];
    console.error(`Nightvoyage local view stopped: ${known.includes(error?.message)?error.message:'dreambook_view_failed'}.`);
    process.exitCode=1;
  }
}

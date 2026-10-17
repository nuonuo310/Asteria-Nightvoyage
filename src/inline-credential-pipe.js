// A bounded one-frame stream. No environment, argv, filesystem or exception echo.
export function readInlineCredentialFrame(input,{signal,timeoutMs=30000}={}){
  return new Promise((resolve,reject)=>{
    const chunks=[];let size=0,done=false;
    const cleanup=()=>{clearTimeout(timer);input.off('data',data);input.off('end',end);input.off('error',stop);signal?.removeEventListener('abort',stop);};
    const stop=()=>{if(done)return;done=true;cleanup();for(const chunk of chunks)chunk.fill(0);reject(Error('credential_pipe_refused'));};
    const data=chunk=>{size+=chunk.length;if(size>8192){stop();input.pause();return;}chunks.push(Buffer.from(chunk));};
    const end=()=>{
      if(done)return;let bytes;
      try{bytes=Buffer.concat(chunks);const value=JSON.parse(bytes.toString('utf8'));if(!value||Object.keys(value).length!==1||!Object.hasOwn(value,'credential')||typeof value.credential!=='string'||!/^[\x21-\x7e]{1,2000}$/.test(value.credential))throw Error();done=true;cleanup();resolve(value.credential);}
      catch{stop();}finally{bytes?.fill(0);for(const chunk of chunks)chunk.fill(0);}
    };
    const timer=setTimeout(stop,timeoutMs);input.on('data',data);input.once('end',end);input.once('error',stop);signal?.addEventListener('abort',stop,{once:true});if(signal?.aborted)stop();
  });
}

// Independent outbound-dispatch rehearsal; NOT connected to app-server or a real provider.
const version='independent-local-dispatch-journal-v1';
const valid=new Map([['ready',0],['first_in_flight',1],['continuation_ready',1],['second_in_flight',2],['completed',2]]);
function parse(text){
 if(typeof text!=='string'||Buffer.byteLength(text)>1024)throw Error('dispatch_snapshot_invalid');
 let s;try{s=JSON.parse(text);}catch{throw Error('dispatch_snapshot_invalid');}
 if(!s||Object.keys(s).sort().join(',')!=='calls,phase,version'||s.version!==version||
  !Number.isSafeInteger(s.calls)||s.calls<0||s.calls>2||
  !(valid.get(s.phase)===s.calls||s.phase==='cancelled'))throw Error('dispatch_snapshot_invalid');
 return s;
}
export class LocalDispatchJournal {
 #state;#save;#closed=false;#busy=false;#restoredPending=false;
 constructor(snapshot,persist){
  if(typeof persist!=='function')throw Error('dispatch_persistence_required');
  this.#state=parse(snapshot);this.#save=persist;
  this.#restoredPending=['first_in_flight','second_in_flight'].includes(this.#state.phase);
 }
 static initialSnapshot(){return JSON.stringify({version,phase:'ready',calls:0});}
 view(){return {...this.#state,ambiguousDispatch:['first_in_flight','second_in_flight'].includes(this.#state.phase),persistenceFailed:this.#closed,realProviderAccountingIntegrated:false};}
 #commit(next){
  if(this.#closed||this.#busy)throw Error('dispatch_closed');
  this.#busy=true;
  try{const result=this.#save(JSON.stringify(next));if(result!==undefined)throw Error('dispatch_persistence_must_be_synchronous');this.#state=next;}
  catch{this.#closed=true;throw Error('dispatch_persistence_failed');}
  finally{this.#busy=false;}
 }
 reserve(){
  if(this.#closed||this.#busy)throw Error('dispatch_closed');
  const s=this.#state;
  if(!['ready','continuation_ready'].includes(s.phase))throw Error('dispatch_not_permitted');
  const next={...s,calls:s.calls+1,phase:s.calls===0?'first_in_flight':'second_in_flight'};
  this.#commit(next);return next.calls;
 }
 complete(){
  if(this.#closed||this.#busy)throw Error('dispatch_closed');
  const s=this.#state;
  if(this.#restoredPending||!['first_in_flight','second_in_flight'].includes(s.phase))throw Error('dispatch_completion_not_permitted');
  this.#commit({...s,phase:s.calls===1?'continuation_ready':'completed'});
 }
 cancel(){
  if(this.#closed||this.#busy)throw Error('dispatch_closed');
  if(['completed','cancelled'].includes(this.#state.phase))return;
  this.#commit({...this.#state,phase:'cancelled'});
 }
}

import {fail} from '../../src/store.js';
import {OneDreamRuntime} from '../nv-deepseek-one-dream/runtime.mjs';
import {DiagnosticOneDreamClient} from './client.mjs';

export class DiagnosticOneDreamRuntime extends OneDreamRuntime{
  constructor(directory,options={}){
    if(options.mode!=='offline')fail('diagnostic_offline_only');
    super(directory,options);
  }
  createBudgetClient(options){return new DiagnosticOneDreamClient(this.store,options);}
}

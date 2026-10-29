import {ManagedDreamClimateRuntime} from '../phase-b/runtime.mjs';
import {r8Profile} from './profile.mjs';

export class DreamClimateR8Runtime extends ManagedDreamClimateRuntime {
  constructor(directory,options={}){
    super(directory,options,r8Profile);
  }
}

export {r8Profile};

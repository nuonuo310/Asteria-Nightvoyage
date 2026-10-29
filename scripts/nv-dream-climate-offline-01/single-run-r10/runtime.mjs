import {ManagedDreamClimateRuntime} from '../phase-b/runtime.mjs';
import {r10Profile} from './profile.mjs';

export class DreamClimateR10Runtime extends ManagedDreamClimateRuntime {
  constructor(directory,options={}){
    super(directory,options,r10Profile);
  }
}

export {r10Profile};

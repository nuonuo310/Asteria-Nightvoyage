import {ManagedDreamClimateRuntime} from '../phase-b/runtime.mjs';
import {r6Profile} from './profile.mjs';

export class DreamClimateR6Runtime extends ManagedDreamClimateRuntime {
  constructor(directory,options={}){
    super(directory,options,r6Profile);
  }
}

export {r6Profile};

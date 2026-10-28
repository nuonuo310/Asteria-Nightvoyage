import {ManagedDreamClimateRuntime} from '../phase-b/runtime.mjs';
import {r4Profile} from './profile.mjs';

export class DreamClimateSingleRunRuntime extends ManagedDreamClimateRuntime {
  constructor(directory,options={}){
    super(directory,options,r4Profile);
  }
}

export {r4Profile};

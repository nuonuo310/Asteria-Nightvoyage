import {
  extractManagedReceipt,prepareManagedPublication
} from '../phase-b/records.mjs';
import {r6Profile} from './profile.mjs';

export function prepareR6Publication(store,input){
  return prepareManagedPublication(store,input,r6Profile);
}

export function extractR6Receipt(store,{now=Date.now()}={}){
  return extractManagedReceipt(store,{now,profile:r6Profile});
}

import {
  extractManagedReceipt,prepareManagedPublication
} from '../phase-b/records.mjs';
import {r4Profile} from './profile.mjs';

export function prepareR4Publication(store,input){
  return prepareManagedPublication(store,input,r4Profile);
}

export function extractR4Receipt(store,{now=Date.now()}={}){
  return extractManagedReceipt(store,{now,profile:r4Profile});
}

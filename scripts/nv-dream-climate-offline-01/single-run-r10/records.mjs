import {
  extractManagedReceipt,prepareManagedPublication
} from '../phase-b/records.mjs';
import {r10Profile} from './profile.mjs';

export function prepareR10Publication(store,input){
  return prepareManagedPublication(store,input,r10Profile);
}

export function extractR10Receipt(store,{now=Date.now()}={}){
  return extractManagedReceipt(store,{now,profile:r10Profile});
}

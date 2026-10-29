import {
  extractManagedReceipt,prepareManagedPublication
} from '../phase-b/records.mjs';
import {r8Profile} from './profile.mjs';

export function prepareR8Publication(store,input){
  return prepareManagedPublication(store,input,r8Profile);
}

export function extractR8Receipt(store,{now=Date.now()}={}){
  return extractManagedReceipt(store,{now,profile:r8Profile});
}

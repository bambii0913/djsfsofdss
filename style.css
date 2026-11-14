import {createWorld,applyAction,clientState} from './rules.js?v=rewards-gps-5';
const key='routine-mate-demo-v2';
// Explicit personal demo. No password collection and no simulated other people.
export async function localRequest(body) {
  const perform=()=>{
    const world=JSON.parse(localStorage.getItem(key)||'null')||createWorld();
    applyAction(world,'demo-user',body,Date.now(),true);
    localStorage.setItem(key,JSON.stringify(world));
    return clientState(world,'demo-user',Date.now(),true);
  };
  if(navigator.locks)return navigator.locks.request(key,perform);
  return perform();
}

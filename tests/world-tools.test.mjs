import { test } from 'node:test';
import assert from 'node:assert/strict';
import { transferStack, validateBackup } from '../world-tools.mjs';
const rules = { width:192, depth:192, height:48, blocks:{1:{},55:{}}, items:{100:{tool:'pick',uses:40}}, storageId:55 };
test('transfer merges partially full stacks without losing items', () => {
  const from=[{id:1,count:10}], to=[{id:1,count:60},null];
  transferStack(from,0,to,()=>64);
  assert.equal(from[0],null); assert.deepEqual(to.map(it=>it.count),[64,6]);
});
test('full chest retains remainder; tools retain durability', () => {
  const from=[{id:1,count:10}], to=[{id:1,count:60}];
  transferStack(from,0,to,()=>64); assert.equal(from[0].count,6);
  const tool=[{id:100,count:1,dur:13}], target=[null];
  transferStack(tool,0,target,()=>1); assert.deepEqual(target[0],{id:100,count:1,dur:13});
});
test('backup round-trip retains storage and home', () => {
  const world={seed:17,size:2,edits:[0,55],storage:{0:[[100,1,13],[1,64],0]},home:[48,20,48]};
  assert.deepEqual(validateBackup(JSON.parse(JSON.stringify({format:'pinkcraft-backup',version:1,world})),rules),world);
});
test('malformed worlds, inventory and detached storage are rejected', () => {
  for (const world of [null,{seed:1,edits:[0]}, {seed:1,edits:[0,255]}, {seed:1,edits:[-1,1]}, {seed:1,edits:[],inv:[[100,2,13]]}, {seed:1,edits:[],storage:{0:[[1,1]]}}, {seed:1,edits:[],home:[999,0,0]}]) assert.throws(()=>validateBackup(world,rules));
});
test('expanded inventory accepts 36 slots and preserves the last slot', () => {
  const inv=Array(36).fill(0); inv[35]=[1,64];
  assert.equal(validateBackup({seed:1,edits:[],inv},rules).inv[35][1],64);
  assert.throws(()=>validateBackup({seed:1,edits:[],inv:[...inv,0]},rules));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {createStorage, fetchAlbum, createAudioController} from '../src/resilience.mjs';

class FakeAudio extends EventTarget {
  dataset = {}; src = ''; error = null; paused = true; ended = false;
  implementation = () => { this.paused = false; this.dispatchEvent(new Event('playing')); return Promise.resolve(); };
  play() { return this.implementation(); }
  pause() { this.paused = true; this.dispatchEvent(new Event('pause')); }
  load() { this.error = null; this.ended = false; }
}
function fixture(timeoutMs = 1000) {
  const audio = new FakeAudio(), states = [], errors = [];
  const control = createAudioController(audio, {onState: (s,w)=>states.push([s,w]), onError: e=>errors.push(e), timeoutMs});
  return {audio, control, states, errors};
}
test('blocked storage never interrupts the app', () => {
  const storage = createStorage(()=>{throw Error('SecurityError');});
  assert.equal(storage.get('language','zh'),'zh');
  assert.doesNotThrow(()=>storage.set('playback','{}'));
});
test('content success survives another album failure', async () => {
  const fetcher = async url => url.includes('good') ? {ok:true,json:async()=>({id:'good',story:[]})} : {ok:false,status:503};
  const results = await Promise.allSettled(['good','bad'].map(id=>fetchAlbum(id,{fetcher})));
  assert.equal(results[0].status,'fulfilled');
  assert.equal(results[1].status,'rejected');
});
test('stalled content is aborted within its deadline', async () => {
  const fetcher = (_, {signal}) => new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(Error('aborted'))));
  await assert.rejects(fetchAlbum('slow',{fetcher,timeoutMs:15}),/aborted/);
});
test('incorrect content is rejected', async () => {
  await assert.rejects(fetchAlbum('a',{fetcher:async()=>({ok:true,json:async()=>({id:'b',story:[]})})}),/Invalid/);
});
test('play reports loading then playing, pause clears intent', async () => {
  const {control,states} = fixture();
  control.setSource('track-one'); await control.play();
  assert.deepEqual(states.at(-1),['playing',true]); control.pause();
  assert.deepEqual(states.at(-1),['paused',false]);
});
test('old rejected play cannot overwrite a new successful track', async () => {
  const {audio,control,states,errors} = fixture();
  let rejectOld;
  audio.implementation=()=>new Promise((_,reject)=>{rejectOld=reject;});
  control.setSource('old'); const old=control.play();
  control.setSource('new');
  audio.implementation=()=>{audio.dispatchEvent(new Event('playing'));return Promise.resolve();};
  await control.play(); rejectOld(Error('old failure')); await old;
  assert.equal(errors.length,0); assert.deepEqual(states.at(-1),['playing',true]); control.pause();
});
test('pending play can be cancelled without showing a spurious error', async () => {
  const {audio,control,errors} = fixture(); let reject;
  audio.implementation=()=>new Promise((_,r)=>{reject=r;});
  const pending=control.play(); control.pause(); reject(Error('aborted')); await pending;
  assert.equal(control.wanted,false); assert.deepEqual(errors,[]);
});
test('buffer timeout stops playback and retries can recover', async () => {
  const {audio,control,states,errors} = fixture(15);
  await control.play(); audio.dispatchEvent(new Event('waiting'));
  await new Promise(resolve=>setTimeout(resolve,30));
  assert.equal(audio.paused,true); assert.deepEqual(errors,['timeout']);
  assert.deepEqual(states.at(-1),['error',false]);
  await control.play(); assert.deepEqual(states.at(-1),['playing',true]); control.pause();
});
test('source failures settle error state once', async () => {
  const {audio,control,errors,states} = fixture();
  audio.implementation=()=>{audio.dispatchEvent(new Event('error'));return Promise.reject(Error('source'));};
  await control.play(); assert.deepEqual(errors,['source']); assert.deepEqual(states.at(-1),['error',false]);
});
test('stale playing after pause cannot restart sound', () => {
  const {audio,control}=fixture();control.pause();audio.dispatchEvent(new Event('playing'));assert.equal(audio.paused,true);
});

test('switching tracks releases the active resource before starting the new song', async () => {
  const {audio,control}=fixture();
  let activeSource = '', pendingReject;
  audio.load = () => {
    assert.equal(audio.paused, true);
    activeSource = '';
    pendingReject?.(Object.assign(Error('replaced'), {name:'AbortError'}));
    pendingReject = null;
  };
  audio.implementation = () => {
    activeSource = audio.src;
    audio.paused = false;
    return new Promise((_, reject) => { pendingReject = reject; });
  };
  control.setSource('first'); const first = control.play();
  assert.equal(activeSource, 'first');
  control.setSource('second');
  assert.equal(activeSource, '');
  const second = control.play();
  control.setSource('third');
  await Promise.all([first, second]);
  assert.equal(activeSource, '');
  assert.equal(audio.src, 'third');
  control.pause();
});

test('only the current naturally ended track advances the playlist', async () => {
  const audio = new FakeAudio(); let advances = 0;
  const control = createAudioController(audio, {onState(){},onError(){},onEnded(){advances++;}});
  control.setSource('first'); await control.play();
  control.setSource('second'); await control.play();
  audio.dispatchEvent(new Event('ended'));
  assert.equal(advances, 0);
  assert.equal(control.wanted, true);
  audio.ended = true; audio.dispatchEvent(new Event('ended'));
  audio.dispatchEvent(new Event('ended'));
  assert.equal(advances, 1);
  assert.equal(control.wanted, false);
});

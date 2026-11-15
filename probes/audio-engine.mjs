// Journey probe for the audio engine, in real headless Chromium.
//
//   pnpm build && node probes/audio-engine.mjs
//
// 1. build: serves `dist/` with `vite preview` and runs the emitted
//    scheduler worker chunk as a module worker: it must tick every 25 ms and
//    go quiet on stop.
// 2. dev: serves the app with `vite`, takes the app's own `engine` from
//    `src/main.ts`, starts it (real AudioContext, real Worker), drains the
//    beat queue for 2 s and stops it.
//
// Needs TRINITY_CHROMIUM_PATH (or CHROMIUM_PATH) and PORT. Drives Chromium
// over the DevTools pipe, so no debugging port is opened.

/* global clearTimeout, console, fetch, setTimeout */

import { spawn } from 'node:child_process';
import process from 'node:process';

const chromium = process.env.TRINITY_CHROMIUM_PATH ?? process.env.CHROMIUM_PATH;
const port = Number(process.env.PORT ?? 8077);
const origin = `http://127.0.0.1:${port}`;
const appUrl = `${origin}/metronome/`;

if (!chromium) {
  console.error('Set TRINITY_CHROMIUM_PATH to a Chromium binary.');
  process.exit(2);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Everything this probe spawns is stopped on exit, and a hard deadline ends a
// probe that hangs instead of letting it run on.
const cleanups = new Set();
const cleanUp = () => {
  for (const fn of cleanups) fn();
  cleanups.clear();
};
const deadline = setTimeout(() => {
  console.error('FAIL probe timed out after 90 s');
  cleanUp();
  process.exit(124);
}, 90_000);

async function startServer(args) {
  const child = spawn(
    'pnpm',
    [
      'exec',
      'vite',
      ...args,
      '--host',
      '127.0.0.1',
      '--port',
      String(port),
      '--strictPort',
    ],
    { stdio: ['ignore', 'pipe', 'pipe'], detached: true },
  );
  let log = '';
  child.stdout.on('data', (d) => (log += d));
  child.stderr.on('data', (d) => (log += d));
  const stop = () => {
    cleanups.delete(stop);
    if (child.exitCode === null) process.kill(-child.pid, 'SIGTERM');
  };
  cleanups.add(stop);
  for (let i = 0; i < 100; i++) {
    // A refused connection means it is not listening yet: poll again.
    const res = await fetch(appUrl).catch(() => null);
    if (res?.ok) return { stop };
    if (child.exitCode !== null) break;
    await sleep(200);
  }
  stop();
  throw new Error(`server did not come up on ${appUrl}\n${log}`);
}

function launchBrowser() {
  const proc = spawn(
    chromium,
    [
      '--headless',
      '--remote-debugging-pipe',
      '--no-first-run',
      // Chromium's own process sandbox cannot start inside an OS sandbox.
      '--no-sandbox',
      '--disable-gpu',
      '--autoplay-policy=no-user-gesture-required',
      'about:blank',
    ],
    { stdio: ['ignore', 'ignore', 'ignore', 'pipe', 'pipe'] },
  );
  const close = () => {
    cleanups.delete(close);
    if (proc.exitCode === null) proc.kill('SIGTERM');
  };
  cleanups.add(close);
  const toBrowser = proc.stdio[3];
  const fromBrowser = proc.stdio[4];
  let nextId = 1;
  const waiting = new Map();
  let buffer = '';
  fromBrowser.on('data', (chunk) => {
    buffer += chunk.toString('utf8');
    let end;
    while ((end = buffer.indexOf('\0')) !== -1) {
      const msg = JSON.parse(buffer.slice(0, end));
      buffer = buffer.slice(end + 1);
      const entry = waiting.get(msg.id);
      if (!entry) continue;
      waiting.delete(msg.id);
      if (msg.error) entry.reject(new Error(JSON.stringify(msg.error)));
      else entry.resolve(msg.result);
    }
  });
  const send = (method, params = {}, sessionId) =>
    new Promise((resolve, reject) => {
      const id = nextId++;
      const timer = setTimeout(() => {
        waiting.delete(id);
        reject(new Error(`${method}: no answer from Chromium in 15 s`));
      }, 15_000);
      const settle = (fn) => (value) => {
        clearTimeout(timer);
        fn(value);
      };
      waiting.set(id, { resolve: settle(resolve), reject: settle(reject) });
      toBrowser.write(JSON.stringify({ id, method, params, sessionId }) + '\0');
    });
  return { send, close };
}

async function openPage(browser, url) {
  const { targetId } = await browser.send('Target.createTarget', {
    url: 'about:blank',
  });
  const { sessionId } = await browser.send('Target.attachToTarget', {
    targetId,
    flatten: true,
  });
  await browser.send('Page.enable', {}, sessionId);
  await browser.send('Page.navigate', { url }, sessionId);
  const evaluate = async (expression) => {
    const { result, exceptionDetails } = await browser.send(
      'Runtime.evaluate',
      { expression, awaitPromise: true, returnByValue: true },
      sessionId,
    );
    if (exceptionDetails) {
      throw new Error(exceptionDetails.exception?.description ?? 'error');
    }
    return result.value;
  };
  for (let i = 0; i < 50; i++) {
    if ((await evaluate('document.readyState')) === 'complete') break;
    await sleep(100);
  }
  return evaluate;
}

// Runs in the page: the built worker chunk ticks at 25 ms and stops.
const WORKER_CHECK = `(async () => {
  const entry = [...document.scripts].find((s) => s.type === 'module').src;
  const code = await (await fetch(entry)).text();
  const path = code.match(/assets\\/scheduler\\.worker-[\\w-]+\\.js/)[0];
  const url = new URL('/metronome/' + path, location.href).href;
  const worker = new Worker(url, { type: 'module' });
  let ticks = 0;
  worker.onmessage = (e) => { if (e.data.type === 'tick') ticks++; };
  worker.postMessage({ type: 'start', intervalMs: 25 });
  await new Promise((r) => setTimeout(r, 1000));
  worker.postMessage({ type: 'stop' });
  const atStop = ticks;
  await new Promise((r) => setTimeout(r, 300));
  worker.terminate();
  return { url, ticksIn1s: atStop, ticksAfterStop: ticks - atStop };
})()`;

// Runs in the page: the app's engine plays and stops on the real audio clock.
const ENGINE_JOURNEY = `(async () => {
  const { engine } = await import('/metronome/src/main.ts');
  const { store } = await import('/metronome/src/state/store.ts');
  store.setState({ bpm: 120, timeSignature: '4/4' });
  const before = { currentTime: engine.currentTime(), running: store.getState().running };
  // Record every Worker the engine constructs, with its options.
  const workers = [];
  const NativeWorker = window.Worker;
  window.Worker = class extends NativeWorker {
    constructor(url, options) {
      workers.push([String(url), options]);
      super(url, options);
    }
  };
  await engine.start();
  await engine.start(); // a second start while running is a no-op
  const events = [];
  for (let i = 0; i < 10; i++) {
    await new Promise((r) => setTimeout(r, 210));
    events.push(...engine.beatQueue.takeDue(engine.currentTime()));
  }
  const runningWhilePlaying = store.getState().running;
  engine.stop();
  const t = engine.currentTime();
  await new Promise((r) => setTimeout(r, 300));
  return {
    before, runningWhilePlaying, workers,
    beats: events.map((e) => [e.beat, e.level, +e.audioTime.toFixed(4)]),
    gaps: events.slice(1).map((e, i) => +(e.audioTime - events[i].audioTime).toFixed(4)),
    runningAfterStop: store.getState().running,
    queuedAfterStop: engine.beatQueue.takeDue(Infinity).length,
    clockAdvancing: engine.currentTime() > t,
  };
})()`;

const failures = [];
const check = (ok, what) => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${what}`);
  if (!ok) failures.push(what);
};

const browser = launchBrowser();
try {
  let server = await startServer(['preview']);
  try {
    const evaluate = await openPage(browser, appUrl);
    const w = await evaluate(WORKER_CHECK);
    console.log('build worker:', JSON.stringify(w));
    check(
      w.ticksIn1s >= 30 && w.ticksIn1s <= 42,
      'built worker ticks ~40 times in 1 s',
    );
    check(w.ticksAfterStop === 0, 'built worker is quiet after stop');
  } finally {
    server.stop();
  }
  await sleep(500);

  server = await startServer([]);
  try {
    const evaluate = await openPage(browser, appUrl);
    const j = await evaluate(ENGINE_JOURNEY);
    console.log('dev engine:', JSON.stringify(j));
    check(
      j.before.currentTime === 0 && !j.before.running,
      'nothing runs before start()',
    );
    check(j.runningWhilePlaying, 'start() sets running: true');
    check(
      j.workers.length === 1 &&
        /scheduler\.worker\.ts/.test(j.workers[0][0]) &&
        j.workers[0][1]?.type === 'module',
      'start() creates the scheduler module worker once',
    );
    check(j.beats.length >= 4, 'beats are produced on the audio clock');
    check(
      j.gaps.every((g) => Math.abs(g - 0.5) < 1e-3),
      'beats are 0.5 s apart at 120 BPM',
    );
    check(
      j.beats.every(([beat, level]) => (beat === 0) === (level === 'strong')),
      'the first beat of each 4/4 bar is strong',
    );
    check(
      !j.runningAfterStop && j.queuedAfterStop === 0,
      'stop() clears running and the queue',
    );
  } finally {
    server.stop();
  }
} finally {
  browser.close();
  cleanUp();
  clearTimeout(deadline);
}

console.log(failures.length ? `FAILED: ${failures.length}` : 'ALL PASS');
process.exit(failures.length ? 1 : 0);

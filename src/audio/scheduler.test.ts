import { describe, expect, it, vi } from 'vitest';
import { getMeter, type TimeSignature } from '../state/meter';
import { createStore, type MetronomeState } from '../state/store';
import { createBeatQueue, type BeatEvent } from './beatQueue';
import { CLICK_VOICES } from './click';
import {
  createScheduler,
  QUEUE_RETENTION_S,
  SCHEDULE_AHEAD_S,
  START_DELAY_S,
  TICK_MS,
} from './scheduler';
import { FakeAudioContext, ManualTickSource, runFor } from './testing';

function setup(initial: Partial<MetronomeState> = {}) {
  const store = createStore();
  store.setState(initial);
  const ctx = new FakeAudioContext('running');
  ctx.currentTime = 10;
  const ticks = new ManualTickSource();
  const queue = createBeatQueue();
  const scheduler = createScheduler({
    ctx: ctx.asAudioContext(),
    store,
    tickSource: ticks,
    queue,
  });
  const events: BeatEvent[] = [];
  const drain = () => events.push(...queue.takeDue(Infinity));
  return { store, ctx, ticks, queue, scheduler, events, drain };
}

const diffs = (times: number[]) => times.slice(1).map((t, i) => t - times[i]!);

describe('scheduler', () => {
  it.each([40, 120, 240])(
    'at %i BPM schedules every beat below currentTime + 0.1 exactly once, 60/bpm apart',
    (bpm) => {
      const { ctx, ticks, scheduler } = setup({ bpm });
      const checkTick = () => {
        const times = ctx.startTimes();
        const horizon = ctx.currentTime + SCHEDULE_AHEAD_S;
        expect(new Set(times).size).toBe(times.length);
        expect(Math.max(...times)).toBeLessThan(horizon);
        // The next beat is beyond the window, so none inside it was skipped.
        expect(times.at(-1)! + 60 / bpm).toBeGreaterThanOrEqual(horizon);
      };

      scheduler.start();
      expect(ticks.startCalls).toBe(1);
      expect(ticks.intervalMs).toBe(TICK_MS);
      checkTick();
      runFor(ctx, ticks, 6, checkTick);

      const times = ctx.startTimes();
      expect(times.length).toBeGreaterThanOrEqual(4);
      for (const d of diffs(times)) expect(d).toBeCloseTo(60 / bpm, 9);
    },
  );

  it('schedules the first beat at currentTime + 0.05 as the start of a bar', () => {
    const { ctx, scheduler, events, drain } = setup();
    scheduler.start();
    drain();
    expect(START_DELAY_S).toBe(0.05);
    expect(ctx.startTimes()[0]).toBeCloseTo(10.05, 9);
    expect(events[0]).toMatchObject({ beat: 0, level: 'strong' });
  });

  it.each<[TimeSignature, string[]]>([
    ['2/4', ['strong', 'normal']],
    ['3/4', ['strong', 'normal', 'normal']],
    ['4/4', ['strong', 'normal', 'normal', 'normal']],
    ['6/8', ['strong', 'normal', 'normal', 'medium', 'normal', 'normal']],
  ])('in %s plays the accents of getMeter, bar after bar', (ts, accents) => {
    const { ctx, ticks, scheduler, events, drain } = setup({
      bpm: 240,
      timeSignature: ts,
    });
    const { beatsPerBar } = getMeter(ts);
    expect(getMeter(ts).accents).toEqual(accents);

    scheduler.start();
    drain();
    runFor(ctx, ticks, beatsPerBar * 0.25 * 2 + 0.2, drain);

    const twoBars = events.slice(0, beatsPerBar * 2);
    expect(twoBars.map((e) => e.level)).toEqual([...accents, ...accents]);
    expect(twoBars.map((e) => e.beat)).toEqual([
      ...accents.keys(),
      ...accents.keys(),
    ]);
    expect(twoBars.every((e) => e.beatsPerBar === beatsPerBar)).toBe(true);
    // Each click sounds at its event's time with its level's voice.
    twoBars.forEach((e, i) => {
      const osc = ctx.oscillators[i]!;
      expect(osc.startTime).toBe(e.audioTime);
      expect(osc.pitch).toBe(CLICK_VOICES[e.level].frequency);
    });
  });

  it('applies a bpm change from the next unscheduled beat without restarting', () => {
    const { store, ctx, ticks, scheduler, events, drain } = setup({ bpm: 120 });
    scheduler.start();
    runFor(ctx, ticks, 1, drain);
    const before = ctx.startTimes();
    expect(before).toHaveLength(3);

    store.setState({ bpm: 240 });
    runFor(ctx, ticks, 1.5, drain);

    const after = ctx.startTimes();
    expect(after.slice(0, before.length)).toEqual(before);
    expect(diffs(before).every((d) => Math.abs(d - 0.5) < 1e-9)).toBe(true);
    const fromChange = after.slice(before.length - 1);
    expect(fromChange.length).toBeGreaterThan(3);
    for (const d of diffs(fromChange)) expect(d).toBeCloseTo(0.25, 9);
    // Same run: the source was not restarted and the bar count carried on.
    expect(ticks.startCalls).toBe(1);
    expect(events[before.length]?.beat).toBe(before.length % 4);
  });

  it('starts a new bar in the new meter when the time signature changes', () => {
    const { store, ctx, ticks, scheduler, events, drain } = setup({
      bpm: 120,
      timeSignature: '4/4',
    });
    scheduler.start();
    runFor(ctx, ticks, 1, drain);
    const seen = events.length;
    expect(events.map((e) => e.beat)).toEqual([0, 1, 2]);

    store.setState({ timeSignature: '3/4' });
    runFor(ctx, ticks, 2, drain);

    const next = events.slice(seen);
    expect(next[0]).toMatchObject({ beat: 0, level: 'strong', beatsPerBar: 3 });
    expect(next.slice(0, 4).map((e) => e.level)).toEqual([
      'strong',
      'normal',
      'normal',
      'strong',
    ]);
    for (const d of diffs(ctx.startTimes())) expect(d).toBeCloseTo(0.5, 9);
  });

  it('re-anchors to currentTime + 0.05 after a late tick and schedules nothing in the past', () => {
    const { ctx, ticks, scheduler } = setup({ bpm: 120 });
    scheduler.start();
    runFor(ctx, ticks, 0.1);
    const count = ctx.oscillators.length;

    ctx.currentTime = 13; // the tab stalled for ~3 s
    ticks.fire();

    const fresh = ctx.startTimes().slice(count);
    expect(fresh).toHaveLength(1);
    expect(fresh[0]).toBeCloseTo(13.05, 9);
    expect(fresh.every((t) => t >= 13)).toBe(true);
  });

  it('prunes queue entries older than currentTime - 1 on each tick', () => {
    const { ctx, ticks, queue, scheduler } = setup({ bpm: 240 });
    const takeDue = vi.spyOn(queue, 'takeDue');
    scheduler.start();
    runFor(ctx, ticks, 5);

    expect(takeDue).toHaveBeenCalledTimes(1 + 200);
    expect(takeDue).toHaveBeenLastCalledWith(
      ctx.currentTime - QUEUE_RETENTION_S,
    );
    const left = queue.takeDue(Infinity);
    expect(left.length).toBeGreaterThan(0);
    expect(left.length).toBeLessThanOrEqual(5);
    expect(left.every((e) => e.audioTime > ctx.currentTime - 1)).toBe(true);
  });

  it('stop() halts ticking and cuts only the clicks that have not sounded', () => {
    const { ctx, ticks, scheduler } = setup({ bpm: 120 });
    scheduler.start();
    runFor(ctx, ticks, 1); // beats at 10.05, 10.55, 11.05; now 11.0
    const [first, second, future] = ctx.oscillators;

    scheduler.stop();

    expect(ticks.running).toBe(false);
    expect(ticks.stopCalls).toBe(1);
    expect(future?.startTime).toBeGreaterThan(ctx.currentTime);
    expect(future?.stopCalls.at(-1)).toBeUndefined();
    expect(future?.stopCalls).toHaveLength(2);
    expect(first?.stopCalls).toHaveLength(1);
    expect(second?.stopCalls).toHaveLength(1);

    runFor(ctx, ticks, 1);
    expect(ctx.oscillators).toHaveLength(3);
  });

  it('a start() whose tick source throws leaves the scheduler stopped and restartable', () => {
    const { ctx, ticks, scheduler } = setup({ bpm: 120 });
    const startTicks = ticks.start.bind(ticks);
    ticks.start = () => {
      throw new Error('worker blocked');
    };
    expect(() => scheduler.start()).toThrow('worker blocked');
    expect(ticks.stopCalls).toBe(1);
    ticks.fire();
    expect(ctx.oscillators).toHaveLength(0);

    ticks.start = startTicks;
    scheduler.start();
    expect(ticks.running).toBe(true);
    expect(ctx.oscillators).toHaveLength(1);
  });

  it('a restart after stop begins a fresh bar at currentTime + 0.05', () => {
    const { ctx, ticks, scheduler, events, drain } = setup({ bpm: 120 });
    scheduler.start();
    runFor(ctx, ticks, 0.6, drain);
    scheduler.stop();
    ctx.currentTime = 20;
    events.length = 0;

    scheduler.start();
    drain();
    expect(events[0]).toMatchObject({ beat: 0, level: 'strong' });
    expect(events[0]?.audioTime).toBeCloseTo(20.05, 9);
    expect(ticks.onTickCalls).toBe(1);
  });
});

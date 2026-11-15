import { describe, expect, it } from 'vitest';
import { scheduleClick } from './click';
import { FakeAudioContext } from './testing';

function click(level: 'strong' | 'medium' | 'normal', time = 2) {
  const ctx = new FakeAudioContext('running');
  const node = scheduleClick(ctx.asAudioContext(), time, level);
  return { ctx, node };
}

describe('scheduleClick', () => {
  it('builds one oscillator into one gain into the destination', () => {
    const { ctx, node } = click('normal');
    expect(ctx.oscillators).toHaveLength(1);
    expect(ctx.gains).toHaveLength(1);
    const [osc] = ctx.oscillators;
    const [gain] = ctx.gains;
    expect(node).toBe(osc);
    expect(osc?.connections).toEqual([gain]);
    expect(gain?.connections).toEqual([ctx.destination]);
  });

  it('starts at `time` and stops the oscillator within 0.1 s', () => {
    const { ctx } = click('strong', 2);
    const osc = ctx.oscillators[0]!;
    expect(osc.startCalls).toEqual([2]);
    expect(osc.stopCalls).toHaveLength(1);
    const stopAt = osc.stopCalls[0]!;
    expect(stopAt).toBeGreaterThan(2);
    expect(stopAt - 2).toBeLessThanOrEqual(0.1);
  });

  it('shapes a fast attack and an exponential decay to near silence by ~50 ms', () => {
    const { ctx } = click('medium', 2);
    const calls = ctx.gains[0]!.gain.calls;
    expect(calls[0]).toEqual(['set', expect.any(Number), 2]);
    expect(calls[0]![1]).toBeLessThan(0.001);
    const decay = calls.find((c) => c[0] === 'exponential')!;
    expect(decay[1]).toBeLessThan(0.001);
    expect(decay[2] - 2).toBeCloseTo(0.05);
  });

  it('gives strong, medium and normal distinct pitch and loudness, strongest first', () => {
    const voices = (['strong', 'medium', 'normal'] as const).map((level) => {
      const { ctx } = click(level);
      return {
        pitch: ctx.oscillators[0]!.pitch,
        peak: ctx.gains[0]!.gain.peak(),
      };
    });
    const [strong, medium, normal] = voices;
    expect(strong!.pitch).toBeGreaterThan(medium!.pitch);
    expect(medium!.pitch).toBeGreaterThan(normal!.pitch);
    expect(strong!.peak).toBeGreaterThan(medium!.peak);
    expect(medium!.peak).toBeGreaterThan(normal!.peak);
  });
});

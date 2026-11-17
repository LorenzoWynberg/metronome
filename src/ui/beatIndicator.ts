import type { BeatEvent } from '../audio/beatQueue';
import type { BeatFeed } from '../audio/beatFeed';
import { getMeter, TIME_SIGNATURES, type AccentLevel } from '../state/meter';
import type { Store } from '../state/store';

type Deps = {
  store: Store;
  feed: BeatFeed;
};

/** Accent levels for a bar of `beatsPerBar` beats, when a known meter has it. */
function levelsFor(beatsPerBar: number): AccentLevel[] | null {
  const candidates = TIME_SIGNATURES.map(getMeter);
  const match = candidates.find((m) => m.beatsPerBar === beatsPerBar);
  return match ? [...match.accents] : null;
}

/**
 * Renders one cell per beat and lights the beat that is sounding now. Lighting
 * is driven by the shared beat feed, which delivers only the latest due beat
 * (and `null` on stop), so a hidden tab never replays a backlog.
 */
export function mountBeatIndicator(
  el: HTMLElement,
  { store, feed }: Deps,
): () => void {
  const doc = el.ownerDocument;
  el.setAttribute('aria-hidden', 'true');

  let cells: HTMLElement[] = [];
  let lit = -1;

  const render = (levels: AccentLevel[]): void => {
    cells = levels.map((level) => {
      const cell = doc.createElement('span');
      cell.className = `beat-cell level-${level}`;
      cell.dataset.level = level;
      return cell;
    });
    lit = -1;
    el.replaceChildren(...cells);
  };

  const clearLit = (): void => {
    if (lit >= 0) {
      cells[lit]?.classList.remove('is-lit');
      cells[lit]?.removeAttribute('data-lit');
    }
    lit = -1;
    delete el.dataset.flash;
  };

  const renderIdle = (): void => {
    render([...getMeter(store.getState().timeSignature).accents]);
  };

  const light = (event: BeatEvent): void => {
    if (event.beatsPerBar !== cells.length) {
      const levels =
        levelsFor(event.beatsPerBar) ??
        Array.from({ length: event.beatsPerBar }, (): AccentLevel => 'normal');
      levels[event.beat] = event.level;
      render(levels);
    }
    clearLit();
    const cell = cells[event.beat];
    if (!cell) return;
    cell.classList.add('is-lit');
    cell.dataset.lit = 'true';
    lit = event.beat;
    if (event.level === 'strong') el.dataset.flash = 'on';
  };

  let signature = store.getState().timeSignature;
  renderIdle();

  const offFeed = feed.subscribe((event) => {
    if (event) light(event);
    else {
      clearLit();
      renderIdle();
    }
  });

  const off = store.subscribe(() => {
    const state = store.getState();
    if (!state.running && state.timeSignature !== signature) {
      clearLit();
      renderIdle();
    }
    signature = state.timeSignature;
  });

  return () => {
    off();
    offFeed();
    clearLit();
  };
}

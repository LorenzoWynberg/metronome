import { getMeter } from '../state/meter';
import type { Store } from '../state/store';

export function mountHero(el: HTMLElement, store: Store): () => void {
  const value = el.ownerDocument.createElement('p');
  value.className = 'hero-value';
  const unit = el.ownerDocument.createElement('p');
  unit.className = 'hero-unit';
  el.replaceChildren(value, unit);

  const paint = (): void => {
    const { bpm, timeSignature } = store.getState();
    value.textContent = String(bpm);
    unit.textContent = `BPM · ${getMeter(timeSignature).beatUnit} note`;
  };
  paint();
  return store.subscribe(paint);
}

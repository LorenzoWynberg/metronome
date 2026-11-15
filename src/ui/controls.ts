import type { Engine } from '../audio/engine';
import { TIME_SIGNATURES } from '../state/meter';
import type { Store } from '../state/store';
import { createTapTempo, type TapTempo } from '../state/tapTempo';
import { MAX_BPM, MIN_BPM } from '../state/tempo';

export interface ControlsDeps {
  store: Store;
  engine: Pick<Engine, 'start' | 'stop'>;
  tapTempo?: TapTempo;
  doc?: Document;
}

export function mountControls(el: HTMLElement, deps: ControlsDeps): () => void {
  const { store, engine } = deps;
  const doc = deps.doc ?? document;
  const tapTempo = deps.tapTempo ?? createTapTempo();

  const make = <K extends keyof HTMLElementTagNameMap>(
    tag: K,
    props: Partial<HTMLElementTagNameMap[K]> = {},
  ): HTMLElementTagNameMap[K] =>
    Object.assign(doc.createElement(tag), props) as HTMLElementTagNameMap[K];
  const hint = (key: string): HTMLElement => make('kbd', { textContent: key });

  // Tempo
  const slider = make('input', {
    type: 'range',
    id: 'bpm-slider',
    min: String(MIN_BPM),
    max: String(MAX_BPM),
    step: '1',
  });
  const number = make('input', {
    type: 'number',
    id: 'bpm-number',
    min: String(MIN_BPM),
    max: String(MAX_BPM),
    step: '1',
  });
  number.inputMode = 'numeric';
  const sliderLabel = make('label', {
    htmlFor: slider.id,
    textContent: 'Tempo',
  });
  const numberLabel = make('label', {
    htmlFor: number.id,
    textContent: 'Tempo in BPM',
  });
  numberLabel.className = 'visually-hidden';
  const minus = make('button', { type: 'button', textContent: '−' });
  minus.setAttribute('aria-label', 'Decrease tempo by 1 BPM');
  const plus = make('button', { type: 'button', textContent: '+' });
  plus.setAttribute('aria-label', 'Increase tempo by 1 BPM');
  const tempoRow = make('div');
  tempoRow.className = 'tempo-row';
  tempoRow.append(minus, number, plus);
  const tempo = make('div');
  tempo.className = 'control-group';
  tempo.append(sliderLabel, slider, numberLabel, tempoRow);

  // Start / Stop
  const toggle = make('button', { type: 'button' });
  toggle.className = 'primary-button';
  const transport = make('div');
  transport.className = 'control-group transport';
  transport.append(toggle, hint('Space'));

  // Time signature
  const fieldset = make('fieldset');
  fieldset.className = 'control-group';
  fieldset.append(make('legend', { textContent: 'Time signature' }));
  const radios = TIME_SIGNATURES.map((ts) => {
    const radio = make('input', {
      type: 'radio',
      name: 'time-signature',
      value: ts,
    });
    const label = make('label');
    label.className = 'radio-label';
    label.append(radio, ts);
    fieldset.append(label);
    return radio;
  });

  // Tap
  const tapButton = make('button', { type: 'button', textContent: 'Tap' });
  const tapGroup = make('div');
  tapGroup.className = 'control-group transport';
  tapGroup.append(tapButton, hint('T'));

  const status = make('p');
  status.className = 'visually-hidden';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');

  el.replaceChildren(tempo, transport, fieldset, tapGroup, status);

  const announce = (bpm: number): void => {
    status.textContent = `Tempo ${bpm} BPM`;
  };

  const paint = (): void => {
    const { bpm, timeSignature, running } = store.getState();
    slider.value = String(bpm);
    if (doc.activeElement !== number) number.value = String(bpm);
    toggle.textContent = running ? 'Stop' : 'Start';
    toggle.setAttribute('aria-pressed', String(running));
    for (const r of radios) r.checked = r.value === timeSignature;
  };

  const commitNumber = (): void => {
    const n = number.valueAsNumber;
    if (number.value.trim() === '' || Number.isNaN(n)) {
      number.value = String(store.getState().bpm);
      return;
    }
    store.setState({ bpm: n });
    const bpm = store.getState().bpm;
    number.value = String(bpm);
    announce(bpm);
  };

  const toggleRunning = (): void => {
    if (store.getState().running) engine.stop();
    else engine.start().catch(() => undefined);
  };

  const doTap = (): void => {
    const bpm = tapTempo.tap();
    if (bpm === null) return;
    store.setState({ bpm });
    announce(store.getState().bpm);
  };

  const step = (delta: number): void =>
    store.setState({ bpm: store.getState().bpm + delta });

  slider.addEventListener('input', () =>
    store.setState({ bpm: slider.valueAsNumber }),
  );
  number.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') commitNumber();
  });
  number.addEventListener('blur', commitNumber);
  minus.addEventListener('click', () => step(-1));
  plus.addEventListener('click', () => step(1));
  toggle.addEventListener('click', toggleRunning);
  tapButton.addEventListener('click', doTap);
  for (const r of radios) {
    r.addEventListener('change', () => {
      if (r.checked) {
        store.setState({
          timeSignature: r.value as (typeof TIME_SIGNATURES)[number],
        });
      }
    });
  }

  const ignore = (e: KeyboardEvent): boolean =>
    e.ctrlKey || e.metaKey || e.altKey || doc.activeElement === number;
  const onKeydown = (e: KeyboardEvent): void => {
    if (ignore(e)) return;
    if (e.key === ' ') {
      e.preventDefault();
      if (!e.repeat) toggleRunning();
    } else if ((e.key === 't' || e.key === 'T') && !e.repeat) {
      doTap();
    }
  };
  // A focused button or radio would otherwise activate again on Space keyup.
  const onKeyup = (e: KeyboardEvent): void => {
    if (e.key === ' ' && !ignore(e)) e.preventDefault();
  };
  doc.addEventListener('keydown', onKeydown);
  doc.addEventListener('keyup', onKeyup);

  paint();
  const off = store.subscribe(paint);
  return () => {
    off();
    doc.removeEventListener('keydown', onKeydown);
    doc.removeEventListener('keyup', onKeyup);
  };
}

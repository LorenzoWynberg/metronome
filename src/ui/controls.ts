import type { Engine } from '../audio/engine';
import { TIME_SIGNATURES } from '../state/meter';
import { activePreset, TEMPO_PRESETS } from '../state/presets';
import type { Store } from '../state/store';
import { createTapTempo, type TapTempo } from '../state/tapTempo';
import { MAX_BPM, MIN_BPM } from '../state/tempo';

export interface ControlsDeps {
  store: Store;
  engine: Pick<Engine, 'start' | 'stop' | 'onError'>;
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
  const hint = (key: string, name?: string): HTMLElement => {
    if (name === undefined) return make('kbd', { textContent: key });
    const kbd = make('kbd');
    const glyph = make('span', { textContent: key });
    glyph.setAttribute('aria-hidden', 'true');
    const text = make('span', { textContent: name });
    text.className = 'visually-hidden';
    kbd.append(glyph, text);
    return kbd;
  };

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
  tempo.append(
    sliderLabel,
    slider,
    numberLabel,
    tempoRow,
    hint('↑', 'Up arrow'),
    hint('↓', 'Down arrow'),
  );

  // Tempo presets
  const presetRow = make('div');
  presetRow.className = 'control-group preset-row';
  presetRow.setAttribute('role', 'group');
  presetRow.setAttribute('aria-label', 'Tempo presets');
  const presetButtons = TEMPO_PRESETS.map((preset) => {
    const btn = make('button', { type: 'button' });
    btn.setAttribute('aria-label', `${preset.name} ${preset.bpm} BPM`);
    btn.append(
      make('span', { className: 'preset-name', textContent: preset.name }),
      make('span', {
        className: 'preset-bpm',
        textContent: String(preset.bpm),
      }),
    );
    presetRow.append(btn);
    return { preset, btn };
  });

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

  // Shown when audio fails; never stored. Hidden again once playback runs.
  const errorMessage = make('p');
  errorMessage.className = 'error-message';
  errorMessage.setAttribute('role', 'alert');
  errorMessage.hidden = true;
  const showError = (text: string): void => {
    errorMessage.textContent = text;
    errorMessage.hidden = false;
  };
  const clearError = (): void => {
    errorMessage.textContent = '';
    errorMessage.hidden = true;
  };

  el.replaceChildren(
    tempo,
    presetRow,
    transport,
    fieldset,
    tapGroup,
    status,
    errorMessage,
  );

  let announced: number | undefined;
  const announce = (bpm: number): void => {
    announced = bpm;
    status.textContent = `Tempo ${bpm} BPM`;
  };

  const paint = (): void => {
    const { bpm, timeSignature, running } = store.getState();
    slider.value = String(bpm);
    if (doc.activeElement !== number) number.value = String(bpm);
    toggle.textContent = running ? 'Stop' : 'Start';
    toggle.setAttribute('aria-pressed', String(running));
    if (running) clearError();
    for (const r of radios) r.checked = r.value === timeSignature;
    const current = activePreset(bpm);
    for (const { preset, btn } of presetButtons) {
      btn.setAttribute('aria-pressed', String(preset === current));
    }
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
    // Enter then blur commits twice; announce the tempo once.
    if (bpm !== announced) announce(bpm);
  };

  const toggleRunning = (): void => {
    if (store.getState().running) engine.stop();
    else {
      engine.start().catch(() => {
        // The store stays at running:false, so the button stays on Start.
        showError('Could not start audio. Press Start to try again.');
      });
    }
  };

  const doTap = (): void => {
    const bpm = tapTempo.tap();
    if (bpm === null) return;
    store.setState({ bpm });
    announce(store.getState().bpm);
  };

  const step = (delta: number): void => {
    store.setState({ bpm: store.getState().bpm + delta });
    announce(store.getState().bpm);
  };

  slider.addEventListener('input', () => {
    // The tempo moved without an announcement, so the next commit is news.
    announced = undefined;
    store.setState({ bpm: slider.valueAsNumber });
  });
  // Spinner clicks and ArrowUp/Down fire `change`; typed digits fire only
  // `input`, so a half-typed tempo is not clamped under the cursor.
  number.addEventListener('change', commitNumber);
  number.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') commitNumber();
  });
  number.addEventListener('blur', commitNumber);
  minus.addEventListener('click', () => step(-1));
  plus.addEventListener('click', () => step(1));
  toggle.addEventListener('click', toggleRunning);
  tapButton.addEventListener('click', doTap);
  for (const { preset, btn } of presetButtons) {
    btn.addEventListener('click', () => {
      store.setState({ bpm: preset.bpm });
      announce(store.getState().bpm);
    });
  }
  for (const r of radios) {
    r.addEventListener('change', () => {
      if (r.checked) {
        store.setState({
          timeSignature: r.value as (typeof TIME_SIGNATURES)[number],
        });
      }
    });
  }

  const NON_TEXT_INPUTS = new Set([
    'range',
    'radio',
    'checkbox',
    'button',
    'submit',
    'reset',
    'image',
    'color',
    'file',
    'hidden',
  ]);
  const isEditable = (node: Element | null): boolean => {
    if (!node) return false;
    const tag = node.tagName.toLowerCase();
    if (tag === 'textarea' || tag === 'select') return true;
    if (tag === 'input') {
      return !NON_TEXT_INPUTS.has((node as HTMLInputElement).type);
    }
    if ((node as HTMLElement).isContentEditable) return true;
    const ce = node.getAttribute('contenteditable');
    return ce === '' || ce === 'true' || ce === 'plaintext-only';
  };
  const ignore = (e: KeyboardEvent): boolean =>
    e.ctrlKey || e.metaKey || e.altKey || isEditable(doc.activeElement);
  // Slider and radios use the arrow keys themselves.
  const ownsArrows = (): boolean => {
    const a = doc.activeElement;
    return (
      a === slider || (a !== null && a.matches('input[name="time-signature"]'))
    );
  };
  const arrowDelta = (e: KeyboardEvent): number => {
    const size = e.shiftKey ? 5 : 1;
    return e.key === 'ArrowUp' ? size : -size;
  };
  let arrowStartBpm: number | undefined;
  const onKeydown = (e: KeyboardEvent): void => {
    if (ignore(e)) return;
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      if (ownsArrows()) return;
      e.preventDefault();
      const current = store.getState().bpm;
      if (!e.repeat || arrowStartBpm === undefined) arrowStartBpm = current;
      store.setState({ bpm: current + arrowDelta(e) });
    } else if (e.key === ' ') {
      e.preventDefault();
      if (!e.repeat) toggleRunning();
    } else if ((e.key === 't' || e.key === 'T') && !e.repeat) {
      doTap();
    }
  };
  // A focused button or radio would otherwise activate again on Space keyup.
  // Arrow releases end a burst: announce the tempo once.
  const onKeyup = (e: KeyboardEvent): void => {
    if (ignore(e)) return;
    if (e.key === ' ') e.preventDefault();
    else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      if (ownsArrows() || arrowStartBpm === undefined) return;
      const bpm = store.getState().bpm;
      if (bpm !== arrowStartBpm) announce(bpm);
      arrowStartBpm = undefined;
    }
  };
  doc.addEventListener('keydown', onKeydown);
  doc.addEventListener('keyup', onKeyup);

  paint();
  const off = store.subscribe(paint);
  const offError = engine.onError(() => {
    showError('Playback stopped after an audio error.');
  });
  return () => {
    off();
    offError();
    doc.removeEventListener('keydown', onKeydown);
    doc.removeEventListener('keyup', onKeyup);
  };
}

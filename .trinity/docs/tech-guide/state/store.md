# State contracts

Pure, DOM-free modules in `src/state/`. They import only from each other, never from UI or audio code.

## Meter (`meter.ts`)

`TimeSignature` is `'2/4' | '3/4' | '4/4' | '6/8'`. `getMeter(ts)` returns `{ beatsPerBar, accents, beatUnit }`, where accents are `strong`, `medium` or `normal` per beat. 6/8 accents beats 1 and 4 (`strong`, `medium`) with an eighth-note unit. The engine plays one click per BPM beat, so seconds per click is `60 / bpm` in every signature. `isTimeSignature(v)` is the type guard.

## Tempo (`tempo.ts`)

`MIN_BPM` 40, `MAX_BPM` 240, `DEFAULT_BPM` 120, default signature `4/4`. `clampBpm(n)` rounds and clamps; a non-finite value becomes `DEFAULT_BPM`.

## Persistence (`persistence.ts`)

Settings (`bpm`, `timeSignature`) live under the key `metronome:settings` through `StorageLike` (`getItem`/`setItem`). `loadSettings` falls back to defaults for missing, malformed or non-object data and sanitises each field. `saveSettings` swallows storage errors, so persistence is best-effort.

## Store (`store.ts`)

`createStore({ storage? })` returns `getState`, `setState(patch)` and `subscribe(listener)` (which returns an unsubscribe function). State is `{ bpm, timeSignature, running }`; `running` starts `false` and is never persisted.

- `setState` clamps `bpm`, ignores invalid time signatures and non-boolean `running`.
- A patch that changes nothing notifies nobody.
- Only a `bpm` or `timeSignature` change writes to storage.
- Listeners run over a snapshot, so unsubscribing during notification is safe. A throwing listener stops the later ones; that is not isolated.

The exported `store` singleton uses `localStorage` through a guarded `defaultStorage()`, which yields no storage when reading the global throws.

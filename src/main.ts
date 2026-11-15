import '@fontsource-variable/inter';
import '@fontsource-variable/jetbrains-mono';
import './styles/tokens.css';
import './styles/base.css';
import './styles/layout.css';
import { createEngine } from './audio/engine';
import { store } from './state/store';

// No AudioContext or Worker exists until `engine.start()` runs from a user
// gesture. Later stories mount the BPM readout, beat indicator and controls
// here and drive them from `store` and `engine.beatQueue`.
export const engine = createEngine(store);

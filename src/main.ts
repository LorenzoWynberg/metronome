import '@fontsource-variable/inter';
import '@fontsource-variable/jetbrains-mono';
import './styles/tokens.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/controls.css';
import './styles/beatIndicator.css';
import { createBeatFeed } from './audio/beatFeed';
import { createEngine } from './audio/engine';
import { store } from './state/store';
import { mountBeatIndicator } from './ui/beatIndicator';
import { mountControls } from './ui/controls';
import { mountHero } from './ui/hero';

// No AudioContext or Worker exists until `engine.start()` runs from a user
// gesture. The BPM readout, beat indicator and controls mount here and are
// driven from `store` and `engine.beatQueue`.
export const engine = createEngine(store);
const feed = createBeatFeed(store, engine);

const hero = document.getElementById('bpm-hero');
const indicator = document.getElementById('beat-indicator');
const controls = document.getElementById('controls');
if (hero) mountHero(hero, store);
if (indicator) mountBeatIndicator(indicator, { store, feed });
if (controls) mountControls(controls, { store, engine, beatFeed: feed });

# Changelog

## 0.5.0 - 2026-11-18

### New: click volume control

The metronome click no longer plays at one fixed level. A **Volume** slider now sits in the controls alongside tempo, tap tempo and time signature. It runs from 0% to 100% in 1% steps, shows the current level next to it (for example "80%"), and starts at **80%**. At 0% the click is silent, and at 100% it plays at full level. The slider responds evenly across its range, so each step sounds like a similar change.

You can change the volume while the metronome is playing and hear the difference straight away. The level glides to the new setting instead of jumping, so you don't hear crackle as you drag. Changing the volume doesn't affect the timing: beats stay where they are. If you change it while stopped, the new level applies the next time you press Start.

Your volume is saved with your tempo and time signature, so it's where you left it on your next visit.

### Keyboard and screen readers

When the volume slider has focus, the arrow keys move the slider and leave the tempo alone. Screen readers read the level as a percentage, such as "80%".

## 0.4.0 - 2026-11-17

### New

#### Beat counter in the controls

The controls now include a **Beat counter** that shows which beat of the bar is playing, from 1 up to the number of beats in your time signature. Beat 1, the downbeat, is shown in bold with an accent-coloured border, so you can find the top of the bar at a glance. The number changes when you hear each click, not when the click is scheduled. It sits next to Start/Stop, so you can follow the count without looking away from the controls you're already using.

When the metronome is stopped, the counter shows a dash (–). It goes back to the dash each time you stop or restart, so a new run always begins counting from the first beat you hear. If you change the time signature, the count never goes past the last beat of the new bar.

The counter is only shown on screen, and screen readers don't announce it. Every beat is already audible as a click, so reading the number aloud as well would only add noise.

### Improved

#### Beat indicator and counter stay in step

The beat indicator and the new counter now read beats from the same source, so the lit cell and the number always agree on which beat is sounding. As before, if you come back to a tab that was in the background, both show the current beat straight away and don't replay the beats you missed.

## 0.3.0 - 2026-11-16

### New: tempo shortcuts on the keyboard

You can now change the tempo without touching the slider. Press **Up** or **Down** to move it by 1 BPM, or hold **Shift** to move it by 5 BPM. Hold the key down and the tempo keeps changing until you let go, so large changes take one press.

| Keys                      | Change                   |
| ------------------------- | ------------------------ |
| Up / Down                 | ±1 BPM                   |
| Shift + Up / Shift + Down | ±5 BPM                   |
| Hold any of the above     | Keeps changing the tempo |

### Improved: shortcuts no longer get in the way

The tempo shortcuts turn off while you type in any text field, so arrow keys move the cursor there as usual. The tempo slider and the time-signature options also keep their normal arrow-key behaviour: when one of them has focus, the arrow keys control that control and not the global shortcut. Keyboard and screen-reader users keep everything that already worked and gain a quicker way to set the tempo.

## 0.2.0 - 2026-11-15

### New: Tempo presets

A new row of six preset buttons sits right below the tempo slider: **Largo 50**, **Adagio 70**, **Andante 90**, **Moderato 110**, **Allegro 130** and **Presto 170**. Click one to jump straight to that tempo instead of dragging the slider or typing a number. If the metronome is already playing, it keeps playing at the new tempo. If it's stopped, it stays stopped.

The button for the current tempo stays highlighted, so you can see which marking you're on. The highlight follows the tempo however you set it: with the slider, the number field, the + and − steppers, tap tempo or a preset button. When the tempo doesn't exactly match a marking, such as 120 BPM, no button is highlighted. Your tempo is already saved between sessions, so after a reload the correct button lights up again.

The presets also work with assistive technology. They form a labelled "Tempo presets" group, each button's name includes both the marking and its BPM, and screen readers announce the new tempo when you pick one. On narrow screens the row wraps onto more lines instead of making the page scroll sideways, and every button stays large enough to tap easily.

## 0.1.0 - 2026-11-15

### New

#### A metronome you can set up in seconds

Metronome is deployed to GitHub Pages on every push to `main`. The tempo appears in large type at the top of the screen, so you can read it from across the room. Set it anywhere from **40 to 240 BPM** with the slider or the number field, or tap the beat yourself with the tap-tempo button or the **T** key. Press **Space** to start and stop from the keyboard, or click or tap the transport button.

#### Time signatures with an accented downbeat

Choose **2/4, 3/4, 4/4 or 6/8**. The first beat of every bar plays a stronger click so you always know where the bar starts. In 6/8, beat four gets a lighter accent, which gives you the natural two-pulse feel. Your tempo and time signature are saved and come back the next time you open the page.

#### Timing you can trust

Clicks are scheduled ahead of time on the browser's audio clock, and the scheduling timer runs in a background worker, so the pulse is designed to stay steady while the page is busy or in a background tab. Change the tempo or meter while it plays and the change lands cleanly on the next beat, with no stutter or skipped click.

#### See the beat as you hear it

The beat indicator runs off the same audio clock as the sound, so each flash lines up with its click. A distinct flash on the downbeat shows where you are in the bar at a glance.

### Fixed

- If audio fails after you press Start, the app now tells you and returns to the stopped state, instead of looking like it's playing with no sound.
- The BPM number field now updates the tempo when you use its spinner arrows or the arrow keys, not only when you type a value and press Enter.
- Recovering from a closed audio session no longer leaves background timers running, so long practice sessions stay light on resources.

### Improved

Links to Metronome shared in chat apps, social posts and search results now show a proper title and description.

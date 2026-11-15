# Changelog

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

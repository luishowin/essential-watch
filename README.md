# essential-watch

The Essential Watch: a calm, repairable wrist instrument that sits between the
Casio F-91W and the Apple Watch Ultra. A personal product project by
[Beben Design](https://beben.design). Accessible enough for everyday wear,
tough enough for the trail.

This repository holds the whole project: the hardware specification, the watch
OS emulator, and the project website used to track decisions and progress.

## The website

A static, dependency-free site for following the project day to day:

- `index.html`: project overview
- `philosophy.html`: the calm-tech thesis behind the watch
- `hardware.html`: the current hardware specification digest
- `emulator.html`: the live watch OS emulator
- `journal.html`: dated entries and the roadmap

Open `index.html` directly in a browser, or serve the folder:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## The emulator

`docs/emulator1.0.html` is the baseline: a single-file watch OS emulator built
on vanilla JavaScript and HTML5 Canvas. No frameworks, because a firmware
simulation wants to stay close to the metal, or in this case close to the
pixel buffer. The single-file architecture mimics a microcontroller's `loop()`
structure and stays modular so logic can be torn apart and reinjected easily.

The current production emulator lives at `js/emulator.js` and runs on the
emulator page of the website. Earlier concepts (`docs/emulator2.0.html`,
`docs/emulator3.0.html`) are kept as an archive of the thinking.

### Controls

| Input | Keyboard | Touch |
| --- | --- | --- |
| Crown rotate up | Arrow Up | Tap crown, upper half |
| Crown rotate down | Arrow Down | Tap crown, lower half |
| Crown press | Enter | Tap crown center |
| Btn 1 (select / light) | Z | Tap upper pill button |
| Btn 2 (back / cancel) | X | Tap lower pill button |

Click or tap the device first so it takes focus. On desktop, arrow keys are
only captured while the device is focused, so the page keeps scrolling
normally.

### Architecture notes

- `WatchOS` is the kernel. It holds the drivers (audio, graphics, simulated
  sensors) and manages the active mode.
- `Mode` is the abstract base class. Every screen (home, menu, stopwatch)
  inherits from it. To add a new mode, copy `StopwatchMode`, rename it, and
  register it in the `os.modes` registry.
- `SimulatedSensors` mocks data. On real hardware these values become actual
  I2C sensor readings.

## The specification

`watch-hardware-spec-v1.md` is the living hardware specification, currently at
draft v6: monochrome OLED display, CNC aluminum case, contactless Hall-effect
buttons with a rotary crown, 10 ATM water resistance, and a 30 day battery
target.

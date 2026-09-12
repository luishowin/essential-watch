# essential-watch

The Essential Watch: a calm, repairable wrist instrument that sits between the
Casio F-91W and the Apple Watch Ultra. A personal product project by
[Beben Design](https://beben.design). Accessible enough for everyday wear,
tough enough for the trail.

This repository holds the whole project: the hardware specification, the watch
OS emulator, and the project website used to track decisions and progress.

## The website

A static, dependency-free site for following the project day to day. It lives in
`docs/`, which is also what GitHub Pages publishes:

**https://luishowin.github.io/essential-watch/**

- `docs/index.html`: project overview
- `docs/philosophy.html`: the calm-tech thesis behind the watch
- `docs/hardware.html`: the current hardware specification digest
- `docs/spec.html`: the full specification, rendered live from the markdown
- `docs/emulator.html`: the live watch OS emulator
- `docs/journal.html`: dated entries and the roadmap

Pages builds from the `main` branch, `/docs` folder, so anything merged to `main`
under `docs/` is published. `docs/.nojekyll` keeps the build byte-for-byte.

Serve the folder:

```bash
python3 -m http.server 8000 --directory docs
```

Then visit `http://localhost:8000`.

Every page except `spec.html` also opens straight from disk. `spec.html` reads the
markdown at runtime, and browsers block `fetch` on `file://` URLs, so that one page
needs the server above. It says so itself if you open it the other way.

### Theme

Light and dark, toggled by the button in the nav bar. The site follows the system
preference until you click it; after that your choice is remembered in
`localStorage` under `ew-theme`. A small inline script in each page head applies the
stored theme before first paint, so a dark reload never flashes white.

## The emulator

`docs/emulator1.0.html` is the baseline: a single-file watch OS emulator built
on vanilla JavaScript and HTML5 Canvas. No frameworks, because a firmware
simulation wants to stay close to the metal, or in this case close to the
pixel buffer. The single-file architecture mimics a microcontroller's `loop()`
structure and stays modular so logic can be torn apart and reinjected easily.

The current production emulator lives at `docs/js/emulator.js` and runs on the
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

`docs/hardware-spec.md` is the living hardware specification, currently at draft v6:
monochrome OLED display, CNC aluminum case, contactless Hall-effect buttons with a
rotary crown, 10 ATM water resistance, and a 30 day battery target.

It is the single source of truth. `docs/spec.html` renders it in the browser with
`docs/js/markdown.js`, a small hand-written parser, so the page cannot drift from the
source. Section headings and the numbered open items get stable anchors, which means a
specific pending decision is directly linkable: `spec.html#oi-12` is the OLED panel
selection that gates the power model.

Edit the markdown. The site follows.

# Essential Watch — Hardware Specification (Draft v6)
*Updated September 6, 2026 — supersedes v5. Primary change in v6: display technology moved from e-paper to a monochrome OLED panel, with knock-on updates to illumination, stopwatch rendering, power budgeting, and open items.*

**Design thesis:** Repairable, craft-built "instrument" watch positioned against Pebble's mass-market nostalgia play and Garmin/Apple's feature-maximalism — calm by default, with select rugged-utility features borrowed deliberately where they earn their place.

**Closest direct prior art:** Ollee Watch (olleewatch.com) — a Casio F-91W/A158W movement mod with a comparable calm-tech-plus-smart-features software layer and an active community. Their long battery-life figures (10 months–3+ years) come from driving the F-91W's original *segment LCD*, not a pixel-addressable panel — not a directly comparable number to this watch's e-paper display.

---

## Chassis & Mechanical
- **Target size:** 42 × 36 × 9mm, ≤30g
  - Reference point: Casio F-91W is 37.5×34.5×8.5mm at 21g — but in resin (~1.2g/cm³) with a tiny CR2016 cell and a bare segment-LCD module, no radio/sensors/haptics. This build is larger, in aluminum (2.7g/cm³) with glass, monochrome OLED, BLE, IMU, optical HR/SpO2, LRA, and piezo. Rough mass rollup lands ~25–29g — plausible but tight, with wall-thickness (needed for 10 ATM rigidity) as the main lever that could blow the budget. Treat as provisional until real CAD mass properties exist.
- **Material:** CNC-machined aluminum alloy housing
- **Front:** Tempered glass, optically bonded to display carrier (see Display Assembly below) — with AR/anti-glare coating + oleophobic coating + matte diffusion treatment, sequenced as one coordinated optical stack
- **Back cover:** Removable, secured by 4× Torx screws, gasket-sealed — repairable by design; also the access point for the internal recovery interface
- **Water resistance target:** 10 ATM (100m)
- **Operating temperature:** -20°C to 50°C — requires explicit sourcing of an OLED panel and battery cell both rated to -20°C (many off-the-shelf panels are room-temp only; OLED emission and response degrade at the cold end); expect derated battery life and optical HR/SpO2 accuracy at the cold end
- **Strap:** Quick-release, swappable; default = metal link bracelet
  - **Strap width:** quick-release standard — 20mm proposed as default, confirm against final case dimensions
- **Charging interface:** Magnetic, spring-loaded pogo-pin contact integrated into one bracelet link (no in-case port), power-only. Mates with a charging puck ending in a **female USB-C receptacle**.
- **Finish:** Two colorways — natural grey via standard/hardcoat anodizing; jet black via hardcoat black anodize (better long-term UV/wear stability than dye black) or PVD (deepest black, higher cost). Anodizing dimensional buildup must be accounted for in O-ring grooves, screw bosses, crown guard fit, and pogo contact flatness.
- **Crown guard:** Protrudes to dial height, minimal profile to avoid interfering with normal finger access. Protects the external magnet/cap assembly's alignment from shear impact — a lighter structural job than a traditional dive-watch guard, since there's no pressurized mechanical stem seal to protect.

## Display Assembly
- **Type:** ~1" rectangular monochrome OLED panel (single-emitter-color, dark-background UI)
- **Assembly method:** Panel mounted on a rigid internal carrier/subframe (protects against unsupported-glass crack risk); that subassembly soft/gasket-mounted within the case to isolate it from case-flex stress. **Needs drop-test prototyping to validate** — a real trade-off between impact isolation and structural performance, not a settled decision.
- **Refresh strategy:** Frame-addressable with no ghosting or full-refresh cycles (the e-paper constraint is gone). Update policy is now a power decision, not a panel limitation: static watchfaces redraw on state change; timing modes may animate at low rate.
- **Burn-in mitigation:** Dark-default UI; dim always-on state with a brighter raise state; occasional pixel-shift or element shuffle for long-lived static elements (status icons, separators)
- **Daylight readability:** Known trade-off vs the reflective e-paper plan — an emissive panel washes out in direct sun. Mitigations: high-contrast 1-bit UI, peak-brightness burst on wrist-raise, matte AR stack on the glass (kept from v5)

## Compute
- **MCU:** Nordic nRF52840
- **Storage:** Onboard flash (1MB); real single-image budget ~400–470KB after dual-bank OTA overhead

## Sensors
- **IMU:** 6-axis accelerometer + gyroscope — also candidate for tilt-to-wake / raise-to-bright gesture (needs gesture-threshold tuning to avoid false triggers from normal arm movement)
- **HR / SpO₂:** Optical sensor, tap-to-measure or dedicated logging mode. Exposed over BLE via standard GATT services (Heart Rate Service, Pulse Oximeter Service) for third-party fitness app compatibility.
- **Barometer/altimeter, magnetometer:** Excluded

## Input Interface
- **Layout:** Two pill-shaped buttons + one rotary encoder/crown between them, all contactless (Hall-effect proximity sensing for buttons, magnetic rotary sensing for the encoder) — no shaft or actuator penetrates the waterproof cavity
  - Open question: simple single-actuation pill vs. two-way rocker (changes sensor count/layout)
  - Total case z-height (9mm) is the real constraint on magnet travel/sensitivity, independent of button footprint
  - CNC requirement: locally thinned wall boss under each sensor location
  - Test requirement: confirm charging puck magnet doesn't false-trigger nearby buttons
- **Mode cycle:** Date & Time → Stopwatch (lap/interval) → Countdown/Interval Timer (presets) → Alarms (×3–5) → HR/SpO₂ → back to Date & Time
  - **Set Time is NOT in this loop** — long-press from Date & Time mode only
  - **WorldTime, Databank, Tally Counter** — candidate additions, pure firmware, no hardware impact
- **Gesture vocabulary:** single/double/hold press per button; rotate/click/hold on the encoder. Each paired with an LRA tap or a chime.

## Haptics & Audio
- **LRA:** Silent/gentle notification haptics — feel target benchmarked against Apple Watch's Taptic Engine; closed-loop driver IC (e.g. TI DRV2605L-class)
- **Piezo buzzer:** Circular form factor. **Placement under review** — back-panel mounting against the wrist conflicts with (a) the high clamping force needed for the 10 ATM back-cover seal, which acoustically deadens the panel as a diaphragm, and (b) skin-coupling, which muffles sound versus open-air radiation. Recommend relocating to a side-mounted acoustic vent (sealed waterproof mesh port) or an internal boss near the front/bezel. Needs a real prototype listening test.
- **Chime system:** Tone-sequencer (frequency/duration pairs) suited to the piezo's narrowband resonant behavior — not literal 8/12-bit PCM sample playback, which costs far more flash for a worse result on this hardware
- Global silent/haptic-only mode under consideration

## Illumination
- The OLED is self-emissive, so the v5 lamp-as-backlight rationale is retired. The dim always-on state and the raise-to-bright state are now the primary "illumination" story (see Display Assembly)
- **Optional LED lamp:** retained as a utility flashlight only, not a display light — single press (3–5s fill light), double-click (brightness cycle / flashlight), extended (flashing/breathing beacon)
- Tilt-to-wake via IMU as the secondary trigger (see Sensors)

## Timing Precision (Stopwatch)
- **Internal timing:** true 1/100s resolution via hardware timer — lap/split values accurate to the centisecond
- **Visual display:** panel limitation lifted in v6 — a monochrome OLED can animate a live centisecond digit if wanted. Choice is now taste and power, not hardware: either a live running display at low frame cost, or the v5 pattern (running seconds, precise x/100 revealed on lap/stop) for minimum power
- **Input timing:** edge-triggered interrupts latching a free-running hardware counter, not polling — microsecond-level capture, no debounce needed (Hall-effect, no mechanical bounce)

## Firmware & Watchface Customization
- Custom watchface UI compiled directly into a single firmware image (not a Pebble-style installed app library)
- Documentation, SDK/templates, and a web-based build tool provided; open decision on server-side/in-browser compile (broad audience) vs. docs-only local toolchain (maker-only audience)
- Distribution via BLE Secure DFU (Web Bluetooth, OS-agnostic); internal SWD recovery pads as a physical failsafe

## Power
- **Target:** 30 days battery life including active notification serving (room-temp baseline; expect derating at the cold end of the -20°C to 50°C range). **v6 caveat:** the budget must be re-derived for an emissive panel — runtime now hinges on the always-on dim state's brightness/duty cycle and the frequency of raise-to-bright events, versus e-paper's near-zero static draw. Re-run the power model once a panel and dim-state brightness are chosen.
- **Prototype cell:** CR2032 — bench/bring-up only. **Non-rechargeable** — cannot sit on the pogo-pin charge circuit (fire/venting risk). Production requires a rechargeable thin LiPo pouch cell shaped to the case cavity; both chemistries share the same buck/boost regulation requirement, so that design work carries over.

---

## Open Items / Pending Decisions
1. Flash budget ceiling for watchface assets (fonts/bitmaps) within the ~400–470KB single-image limit
2. Compile toolchain accessibility (server-side/in-browser vs. docs-only)
3. Charging contact placement — strap-only vs. also-on-case-lug
4. Strap width final confirmation against case CAD
5. Magnetic pogo-pin connector — contact count, spacing, pull strength (bench-test)
6. Piezo relocation off the back panel — acoustic prototype/listening test
7. Piezo acoustic tuning (tone-sequencer design)
8. Haptic driver + LRA part sourcing — hands-on feel testing
9. Hall-effect button/encoder magnetic interference testing
10. Interaction state diagram — full gesture-to-action map across all modes
11. Stopwatch visual refresh behavior — live subsecond digits (now possible on OLED) vs. reveal-on-lap, decided on taste and power cost
12. **OLED panel selection — ~1" rectangular monochrome module, interface (SPI vs. RGB), driver IC, and long-term availability. Gates the re-run of the power model and the daylight-readability mitigation.**
13. Mass budget validation once real CAD/component footprints exist
14. Monochrome OLED panel and battery cell sourcing explicitly confirmed for -20°C operation
15. Pill button: single-actuation vs. two-way rocker
16. Anodizing/PVD sample swatches for grey and jet black finishes
17. Games (Blackjack/Poker/Ping-style) — deliberate include/exclude call against the calm-tech thesis
18. NFC tag — conflicts with aluminum CNC case (RF shielding); needs a non-metal window if pursued
19. OLED brightness strategy — always-on dim level, raise-to-bright peak, and measured current draw at each
20. OLED burn-in mitigation details — pixel-shift cadence, element shuffle, and what static UI elements are exempt

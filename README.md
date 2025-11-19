# trek_watch_f91
A custom watch emulation 

Built on Vanilla JavaScript and HTML5 Canvas.

Why? Because React or Angular adds too much abstraction layer "fluff" for a firmware simulation. You want to be close to the metal (or the pixel buffer, in this case). This single-file architecture mimics a microcontroller's loop() structure. It's modular, so you can tear it apart and inject your own logic easily.

It meets all my specs: the monochrome OLED aesthetic, the simulated sensor data, the file system exports, and the state machine architecture.

The "Trek Watch F91" OS Emulator
Controls (Keyboard Mapped):

Crown Rotate CW: Arrow Up
Crown Rotate CCW: Arrow Down
Crown Press: Enter
BTN 1 (Action/Light): Z key
BTN 2 (Back/Cancel): X key

trek_watchr.html
20 Nov, 02:12


How to use and hack this emulator
Running it: Save the code above as an .html file and open it in any modern browser. No server needed.

Interacting: Click inside the window to focus.
Z / X keys are your top and bottom buttons.
Arrow Keys are your crown rotation.
Enter is the crown press.

File Export: Go to the "Workout" mode, start a run (Z), wait a few seconds, stop it (Z), and save (X). It will actually download a .csv file to your computer.

Architecture Notes for Expansion
I built this using a classic Game Loop pattern which is how embedded GUIs actually work (rendering frame-by-frame).

WatchOS Class: This is the kernel. It holds the drivers (Audio, Graphics, FileSystem) and manages the active "Mode".

Mode Class: Abstract base class. Every screen (Home, Menu, Stopwatch) inherits from this. This keeps your code modular. If you want to add the "Countdown Timer", copy the StopwatchMode class, rename it, flip the math to subtract time, and add it to the os.modes registry.

Simulated Hardware: The SimulatedSensors class mocks data. In a real build (like using a Raspberry Pi Zero or ESP32), you would replace these variables with actual I2C sensor readings.

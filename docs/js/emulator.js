/* Essential Watch OS emulator, built on the emulator1.0 baseline.
   Vanilla JS + canvas. Game-loop architecture: a WatchOS kernel drives Mode
   objects, mirroring how an embedded GUI actually runs frame by frame.

   Input model:
   - Keyboard, scoped to the focused device frame so the page keeps scrolling.
   - Pointer / touch: the on-device buttons and crown are press targets.
     Crown tap zones: top third rotates up, bottom third rotates down,
     middle presses.
*/

(function () {
  "use strict";

  var device = document.getElementById("device");
  var canvas = document.getElementById("display");
  if (!device || !canvas) return;

  var SCREEN_W = 128;
  var SCREEN_H = 64;
  var FPS = 30;
  var COLOR_ON = "#33E5FF";
  var COLOR_OFF = "#000000";
  var COLOR_DIM = "#114c55";

  /* ---------- Audio ---------- */

  class AudioController {
    constructor() {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.volume = 0.15;
    }
    playTone(freq, type, duration) {
      if (this.ctx.state === "suspended") this.ctx.resume();
      var osc = this.ctx.createOscillator();
      var gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    }
    beep() { this.playTone(1500, "square", 0.05); }
    chime() {
      this.playTone(1800, "sine", 0.1);
      setTimeout(function (self) { self.playTone(2200, "sine", 0.2); }, 100, this);
    }
    alarm() {
      this.playTone(1500, "sawtooth", 0.2);
      setTimeout(function (self) { self.playTone(1500, "sawtooth", 0.2); }, 300, this);
    }
  }

  /* ---------- Simulated hardware ---------- */

  class SimulatedSensors {
    constructor() {
      this.heartRate = 142;
      this.battery = 84;
      this.gpsLocked = true;
      this.heading = 0;
      setInterval(function (self) {
        self.heartRate = 138 + Math.floor(Math.random() * 8);
        self.heading = (self.heading + 5) % 360;
      }, 1000, this);
    }
  }

  class Graphics {
    constructor(canvasEl) {
      this.canvas = canvasEl;
      this.ctx = canvasEl.getContext("2d");
      /* Full-res backing store: modes still address a 128x64 logical grid,
         but everything rasterizes at 3x so text renders sharp, not pixelated. */
      var s = canvasEl.width / SCREEN_W;
      this.ctx.scale(s, s);
      this.ctx.imageSmoothingEnabled = false;
    }
    clear() {
      this.ctx.fillStyle = COLOR_OFF;
      this.ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    }
    text(str, x, y, size, align, color) {
      size = size || 12;
      align = align || "left";
      color = color || COLOR_ON;
      this.ctx.font = "500 " + size + "px Handjet, monospace";
      this.ctx.fillStyle = color;
      this.ctx.textAlign = align;
      this.ctx.fillText(str, x, y);
    }
    rect(x, y, w, h, filled) {
      this.ctx.strokeStyle = COLOR_ON;
      this.ctx.fillStyle = COLOR_ON;
      if (filled) this.ctx.fillRect(x, y, w, h);
      else this.ctx.strokeRect(x, y, w, h);
    }
    circle(x, y, r, color, width) {
      color = color || COLOR_ON;
      width = width || 1;
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = width;
      this.ctx.beginPath();
      this.ctx.arc(x, y, r, 0, Math.PI * 2);
      this.ctx.stroke();
    }
    line(x1, y1, x2, y2, color, width) {
      color = color || COLOR_ON;
      width = width || 1;
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = width;
      this.ctx.beginPath();
      this.ctx.moveTo(x1, y1);
      this.ctx.lineTo(x2, y2);
      this.ctx.stroke();
    }
  }

  /* ---------- Input feedback icons ---------- */

  class InputFeedback {
    constructor() {
      this.timers = {};
    }
    setState(id, visible) {
      var el = document.getElementById(id);
      if (!el) return;
      el.classList.toggle("fb-visible", visible);
    }
    flash(id) {
      var self = this;
      this.setState(id, true);
      if (this.timers[id]) clearTimeout(this.timers[id]);
      this.timers[id] = setTimeout(function () { self.setState(id, false); }, 200);
    }
  }

  /* ---------- Mode base + implementations ---------- */

  class Mode {
    constructor(os) { this.os = os; }
    enter() {}
    exit() {}
    update(dt) {}
    draw(gfx) {}
    onInput(event, type) {}
  }

  class HomeMode extends Mode {
    draw(gfx) {
      var d = new Date();
      var days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
      var months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

      var h = d.getHours() % 12 || 12;
      var timeStr = h + ":" + String(d.getMinutes()).padStart(2, "0");
      var ampm = d.getHours() < 12 ? "AM" : "PM";
      var dayStr = days[d.getDay()];
      var restStr = d.getDate() + " " + months[d.getMonth()];

      /* Center the time + meridiem as one group on both axes. */
      gfx.ctx.font = "500 39px Handjet, monospace";
      var wTime = gfx.ctx.measureText(timeStr).width;
      gfx.ctx.font = "500 10px Handjet, monospace";
      var wAmpm = gfx.ctx.measureText(ampm).width;
      var gap = 4;
      var x = SCREEN_W / 2 - (wTime + gap + wAmpm) / 2;
      var right = x + wTime + gap + wAmpm;
      /* Day opens where the time digits start; date + month close where the M ends. */
      gfx.text(dayStr, x, 12, 10, "left", COLOR_ON);
      gfx.text(restStr, right, 12, 10, "right", COLOR_ON);
      var baseline = 52;
      gfx.text(timeStr, x, baseline, 39, "left", COLOR_ON);
      gfx.text(ampm, x + wTime + gap, baseline, 10, "left", COLOR_ON);
    }
    onInput(e, type) {
      if (type === "long_press" && e === "ENTER") this.os.switchMode("menu");
    }
  }

  class MenuMode extends Mode {
    constructor(os) {
      super(os);
      this.items = ["Stopwatch", "Timer", "Alarms", "Workout", "Compass", "Info", "Exit"];
      this.selected = 0;
    }
    draw(gfx) {
      var startY = 22;
      var h = 16;
      var windowSize = 3;
      var startIdx = 0;
      if (this.selected >= windowSize) startIdx = this.selected - windowSize + 1;
      for (var i = 0; i < windowSize; i++) {
        var itemIdx = startIdx + i;
        if (itemIdx >= this.items.length) break;
        var item = this.items[itemIdx];
        var y = startY + i * h;
        var isSel = itemIdx === this.selected;
        if (isSel) gfx.text(">", 8, y, 14, "left", COLOR_ON);
        gfx.text(item, 20, y, 14, "left", isSel ? COLOR_ON : COLOR_DIM);
      }
    }
    onInput(e, type) {
      if (type === "rotate") {
        if (e === "DOWN") this.selected = (this.selected + 1) % this.items.length;
        if (e === "UP") this.selected = (this.selected - 1 + this.items.length) % this.items.length;
      }
      if (type === "click" && e === "ENTER") {
        var map = {
          "Exit": "home", "Stopwatch": "stopwatch", "Workout": "workout",
          "Compass": "compass", "Info": "info", "Timer": "timer", "Alarms": "alarms"
        };
        if (map[this.items[this.selected]]) this.os.switchMode(map[this.items[this.selected]]);
      }
      if (e === "BTN2") this.os.switchMode("home");
    }
  }

  class TimerMode extends Mode {
    constructor(os) {
      super(os);
      this.state = "SET";
      this.editField = 0;
      this.h = 0; this.m = 5; this.s = 0;
      this.timeLeft = 0;
    }
    enter() {
      this.state = "SET";
      this.editField = 1;
    }
    update(dt) {
      if (this.state === "RUNNING") {
        this.timeLeft -= dt;
        if (this.timeLeft <= 0) {
          this.timeLeft = 0;
          this.state = "DONE";
          this.os.audio.chime();
        }
      }
    }
    draw(gfx) {
      if (this.state === "SET") {
        gfx.text("SET TIMER", SCREEN_W / 2, 14, 12, "center", COLOR_DIM);
        var timeStr = this.h + ":" + pad2(this.m) + ":" + pad2(this.s);
        var xOffset = 30;
        if (this.editField === 0) gfx.rect(xOffset - 2, 28, 14, 2, true);
        if (this.editField === 1) gfx.rect(xOffset + 20, 28, 20, 2, true);
        if (this.editField === 2) gfx.rect(xOffset + 50, 28, 20, 2, true);
        gfx.text(timeStr, SCREEN_W / 2, 40, 20, "center", COLOR_ON);
        gfx.text("[^] Change  [Ent] Next", SCREEN_W / 2, 60, 10, "center", COLOR_DIM);
      } else {
        var totalS = Math.ceil(this.timeLeft / 1000);
        var str = Math.floor(totalS / 3600) + ":" + pad2(Math.floor((totalS % 3600) / 60)) + ":" + pad2(totalS % 60);
        gfx.text(this.state, SCREEN_W / 2, 14, 12, "center", this.state === "DONE" ? "#fff" : COLOR_DIM);
        gfx.text(str, SCREEN_W / 2, 40, 24, "center", COLOR_ON);
        if (this.state !== "DONE") gfx.text("[Z] Start/Stop", SCREEN_W / 2, 60, 10, "center", COLOR_DIM);
      }
    }
    onInput(e, type) {
      if (this.state === "SET") {
        if (type === "rotate") {
          var dir = e === "UP" ? 1 : -1;
          if (this.editField === 0) this.h = Math.max(0, Math.min(23, this.h + dir));
          if (this.editField === 1) this.m = Math.max(0, Math.min(59, this.m + dir));
          if (this.editField === 2) this.s = Math.max(0, Math.min(59, this.s + dir));
        }
        if (type === "click" && e === "ENTER") {
          this.editField++;
          if (this.editField > 2) {
            this.timeLeft = (this.h * 3600 + this.m * 60 + this.s) * 1000;
            this.state = "PAUSED";
          }
        }
      } else {
        if (e === "BTN1" && type === "click") {
          if (this.state === "PAUSED") this.state = "RUNNING";
          else if (this.state === "RUNNING") this.state = "PAUSED";
        }
        if (e === "BTN2" && type === "click") {
          this.state = "SET";
          this.editField = 0;
        }
      }
      if (e === "BTN2" && this.state === "SET") this.os.switchMode("menu");
    }
  }

  function pad2(n) { return n.toString().padStart(2, "0"); }

  class AlarmMode extends Mode {
    constructor(os) {
      super(os);
      this.alarms = [
        { h: 7, m: 0, on: false },
        { h: 8, m: 30, on: false },
        { h: 18, m: 0, on: true }
      ];
      this.state = "LIST";
      this.selIdx = 0;
    }
    draw(gfx) {
      if (this.state === "LIST") {
        gfx.text("ALARMS", SCREEN_W / 2, 12, 12, "center", COLOR_DIM);
        var self = this;
        this.alarms.forEach(function (a, i) {
          var y = 28 + i * 12;
          var prefix = i === self.selIdx ? ">" : " ";
          var status = a.on ? "ON" : "--";
          gfx.text(prefix + " " + pad2(a.h) + ":" + pad2(a.m) + " " + status, 10, y, 12, "left", COLOR_ON);
        });
      } else {
        gfx.text("EDIT ALARM " + (this.selIdx + 1), SCREEN_W / 2, 14, 12, "center", COLOR_DIM);
        var a = this.alarms[this.selIdx];
        var str = pad2(a.h) + ":" + pad2(a.m);
        if (this.state === "EDIT_H") gfx.rect(35, 30, 20, 2, true);
        else gfx.rect(65, 30, 20, 2, true);
        gfx.text(str, SCREEN_W / 2, 45, 24, "center", COLOR_ON);
      }
    }
    onInput(e, type) {
      if (this.state === "LIST") {
        if (type === "rotate") {
          if (e === "DOWN") this.selIdx = (this.selIdx + 1) % 3;
          if (e === "UP") this.selIdx = (this.selIdx - 1 + 3) % 3;
        }
        if (e === "BTN1") this.alarms[this.selIdx].on = !this.alarms[this.selIdx].on;
        if (e === "ENTER" && type === "click") this.state = "EDIT_H";
        if (e === "BTN2") this.os.switchMode("menu");
      } else {
        var a = this.alarms[this.selIdx];
        if (type === "rotate") {
          var dir = e === "UP" ? 1 : -1;
          if (this.state === "EDIT_H") a.h = (a.h + dir + 24) % 24;
          if (this.state === "EDIT_M") a.m = (a.m + dir + 60) % 60;
        }
        if (type === "click" && e === "ENTER") {
          if (this.state === "EDIT_H") this.state = "EDIT_M";
          else this.state = "LIST";
        }
        if (e === "BTN2") this.state = "LIST";
      }
    }
  }

  class WorkoutMode extends Mode {
    constructor(os) { super(os); this.t = 0; this.spin = ["-", "\\", "|", "/"]; }
    enter() { this.t = 0; }
    update(dt) { this.t += dt; }
    fmt(ms) {
      var s = Math.floor(ms / 1000);
      return Math.floor(s / 60) + ":" + pad2(s % 60);
    }
    draw(gfx) {
      gfx.text("TIME  " + this.fmt(this.t), 5, 20, 14, "left", COLOR_ON);
      var now = new Date();
      var clock = (now.getHours() % 12 || 12) + ":" + pad2(now.getMinutes()) + " " + (now.getHours() < 12 ? "AM" : "PM");
      gfx.text(clock, SCREEN_W - 5, 20, 10, "right", COLOR_DIM);
      var paceStr = "PACE  " + this.fmt(this.t);
      gfx.text(paceStr, 5, 38, 14, "left", COLOR_ON);
      gfx.ctx.font = "500 14px Handjet, monospace";
      gfx.text("min/km", 5 + gfx.ctx.measureText(paceStr).width + 4, 38, 10, "left", COLOR_DIM);
      /* HR searches for ~3s with a spinning slash, then locks to the sensor. */
      var hr = this.t < 3000
        ? "-- " + this.spin[Math.floor(this.t / 150) % 4]
        : this.os.sensors.heartRate;
      gfx.text("HR    " + hr, 5, 56, 14, "left", COLOR_ON);
    }
    onInput(e) { if (e === "BTN2") this.os.switchMode("home"); }
  }

  class StopwatchMode extends Mode {
    constructor(os) { super(os); this.t = 0; this.run = false; this.laps = []; }
    enter() { this.t = 0; this.run = false; this.laps = []; }
    update(dt) { if (this.run) this.t += dt; }
    fmt(ms) {
      var s = ms / 1000;
      return Math.floor(s / 60) + ":" + (s % 60).toFixed(2).padStart(5, "0");
    }
    draw(gfx) {
      gfx.text("STOPWATCH", SCREEN_W / 2, 14, 12, "center", COLOR_DIM);
      /* Counter stands as tall as the side labels are wide, clamped to fit. */
      gfx.ctx.font = "500 8px Handjet, monospace";
      var labelW = gfx.ctx.measureText("START/PAUSE").width;
      var tStr = this.fmt(this.t);
      var size = Math.min(labelW, 110 / (gfx.ctx.measureText(tStr).width / 8));
      gfx.text("START/PAUSE", SCREEN_W - 5, 20, 8, "right", COLOR_DIM);
      gfx.text("LAP/RESET", SCREEN_W - 5, 54, 8, "right", COLOR_DIM);
      gfx.text(tStr, 5, 46, size, "left", COLOR_ON);
      if (this.laps.length) {
        gfx.text("L" + this.laps.length + " " + this.fmt(this.laps[this.laps.length - 1]), 5, 60, 10, "left", COLOR_DIM);
      }
    }
    onInput(e, type) {
      if (type === "long_press" && e === "BTN2") {
        this.os.switchMode("home");
        return;
      }
      if (type === "click") {
        if (e === "BTN1") this.run = !this.run;
        /* Bottom button splits by state: lap while running, reset while paused. */
        if (e === "BTN2") {
          if (this.run) this.laps.push(this.t);
          else { this.run = false; this.t = 0; this.laps = []; }
        }
      }
    }
  }

  class InfoMode extends Mode {
    draw(gfx) {
      gfx.text("ESS WATCH OS 1.0", SCREEN_W / 2, 20, 12, "center", COLOR_ON);
      gfx.text("BAT: 84%", SCREEN_W / 2, 35, 14, "center", COLOR_ON);
      gfx.text("MEM: 64KB", SCREEN_W / 2, 50, 14, "center", COLOR_ON);
    }
    onInput(e) { if (e === "BTN2") this.os.switchMode("home"); }
  }

  class CompassMode extends Mode {
    constructor(os) {
      super(os);
      this.display = null;
      this.dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
    }
    enter() { this.display = null; }
    update(dt) {
      /* Ease the needle toward the sensor: slow, gentle, shortest way round. */
      var target = this.os.sensors.heading;
      if (this.display === null) { this.display = target; return; }
      var diff = ((target - this.display + 540) % 360) - 180;
      this.display = (this.display + diff * Math.min(1, dt / 600) + 360) % 360;
    }
    draw(gfx) {
      /* Stack is centered as a group: ring at cy 25, captions to baseline 62. */
      var cx = SCREEN_W / 2, cy = 25, r = 19;
      /* Tick ring, rotating. Cardinals run long + bright. */
      gfx.circle(cx, cy, r, COLOR_ON, 0.5);
      for (var i = 0; i < 12; i++) {
        var a = (i * 30 - this.display) * Math.PI / 180;
        var major = i % 3 === 0;
        var len = major ? 4 : 2;
        gfx.line(cx + Math.sin(a) * (r - len), cy - Math.cos(a) * (r - len),
                 cx + Math.sin(a) * r, cy - Math.cos(a) * r,
                 major ? COLOR_ON : COLOR_DIM, 0.5);
      }
      /* The ^ lives on the card at north: it rides the ring, pointing outward. */
      var na = -this.display * Math.PI / 180;
      var dx = Math.sin(na), dy = -Math.cos(na);
      var px = Math.cos(na), py = Math.sin(na);
      var ax = cx + dx * (r + 5), ay = cy + dy * (r + 5);
      var fx = cx + dx * (r + 1), fy = cy + dy * (r + 1);
      gfx.line(ax, ay, fx + px * 3, fy + py * 3, COLOR_ON, 1);
      gfx.line(ax, ay, fx - px * 3, fy - py * 3, COLOR_ON, 1);
      var h = Math.floor(this.display);
      gfx.text(h + "°", cx, 26, 12, "center", COLOR_ON);
      gfx.text(this.dirs[Math.round(h / 22.5) % 16], cx, 37, 10, "center", COLOR_ON);
      gfx.text("BARO 1ATM 0m", cx, 53, 8, "center", COLOR_DIM);
    }
    onInput(e) { if (e === "BTN2") this.os.switchMode("home"); }
  }

  /* ---------- Kernel ---------- */

  class WatchOS {
    constructor() {
      this.gfx = new Graphics(canvas);
      this.audio = new AudioController();
      this.sensors = new SimulatedSensors();
      this.feedback = new InputFeedback();

      this.modes = {
        home: new HomeMode(this),
        menu: new MenuMode(this),
        stopwatch: new StopwatchMode(this),
        workout: new WorkoutMode(this),
        info: new InfoMode(this),
        compass: new CompassMode(this),
        timer: new TimerMode(this),
        alarms: new AlarmMode(this)
      };
      this.currentMode = this.modes.home;
      this.inputState = { pressedKey: null, lastPressTime: 0 };
      this.crownHeld = false;

      this.initKeyboard();
      this.initPointer();

      var self = this;
      this.loop = function () {
        self.currentMode.update(1000 / FPS);
        self.gfx.clear();
        self.currentMode.draw(self.gfx);
        requestAnimationFrame(self.loop);
      };
      this.loop();
    }

    switchMode(name) {
      if (this.modes[name]) {
        this.currentMode.exit();
        this.currentMode = this.modes[name];
        this.currentMode.enter();
        this.audio.beep();
      }
    }

    handleInput(key, action) {
      this.triggerAnim(key);

      var fbMap = {
        BTN1: "fb-btn-upper", BTN2: "fb-btn-lower", ENTER: "fb-crown-press",
        UP: "fb-rotate-up", DOWN: "fb-rotate-down"
      };

      if (action === "down" && fbMap[key]) {
        this.feedback.setState(fbMap[key], true);
      } else if (action === "up" && fbMap[key]) {
        this.feedback.setState(fbMap[key], false);
      } else if (action === "rotate") {
        this.feedback.flash(fbMap[key]);
      }

      var now = Date.now();

      if (action === "down") {
        this.inputState.pressedKey = key;
        this.inputState.lastPressTime = now;
        var self = this;
        this.holdTimer = setTimeout(function () {
          self.currentMode.onInput(key, "long_press");
          self.inputState.pressedKey = null;
        }, 500);
      } else if (action === "up") {
        clearTimeout(this.holdTimer);
        if (this.inputState.pressedKey === key) {
          this.currentMode.onInput(key, "click");
        }
        this.inputState.pressedKey = null;
      } else if (action === "rotate") {
        this.currentMode.onInput(key, "rotate");
      }
    }

    triggerAnim(key) {
      var map = { BTN1: "btn-upper", BTN2: "btn-lower", UP: "crown", DOWN: "crown", ENTER: "crown" };
      var el = device.querySelector("." + map[key]);
      if (el) {
        el.classList.add("active-btn");
        setTimeout(function () { el.classList.remove("active-btn"); }, 100);
      }
    }

    initKeyboard() {
      var keyMap = { ArrowUp: "UP", ArrowDown: "DOWN", Enter: "ENTER", z: "BTN1", Z: "BTN1", x: "BTN2", X: "BTN2" };

      device.addEventListener("keydown", function (e) {
        if (e.repeat) return;
        var key = keyMap[e.key];
        if (!key) return;
        e.preventDefault();
        if (key === "UP" || key === "DOWN") this.handleInput(key, "rotate");
        else this.handleInput(key, "down");
      }.bind(this));

      device.addEventListener("keyup", function (e) {
        var key = keyMap[e.key];
        if (!key || key === "UP" || key === "DOWN") return;
        this.handleInput(key, "up");
      }.bind(this));
    }

    initPointer() {
      var os = this;

      function bindButton(el, key) {
        el.addEventListener("pointerdown", function (e) {
          e.preventDefault();
          if (el.setPointerCapture) {
            try { el.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
          }
          device.focus({ preventScroll: true });
          os.handleInput(key, "down");
        });
        el.addEventListener("pointerup", function () { os.handleInput(key, "up"); });
        el.addEventListener("pointercancel", function () { os.handleInput(key, "up"); });
      }

      bindButton(device.querySelector(".btn-upper"), "BTN1");
      bindButton(device.querySelector(".btn-lower"), "BTN2");

      var crown = device.querySelector(".crown");

      crown.addEventListener("pointerdown", function (e) {
        e.preventDefault();
        var rect = crown.getBoundingClientRect();
        var rel = (e.clientY - rect.top) / rect.height;
        device.focus({ preventScroll: true });
        if (rel < 0.35) {
          os.handleInput("UP", "rotate");
        } else if (rel > 0.65) {
          os.handleInput("DOWN", "rotate");
        } else {
          os.crownHeld = true;
          os.handleInput("ENTER", "down");
        }
      });

      crown.addEventListener("pointerup", function () {
        if (os.crownHeld) {
          os.crownHeld = false;
          os.handleInput("ENTER", "up");
        }
      });

      crown.addEventListener("pointercancel", function () {
        if (os.crownHeld) {
          os.crownHeld = false;
          os.handleInput("ENTER", "up");
        }
      });

      device.addEventListener("pointerdown", function () {
        device.focus({ preventScroll: true });
      });
    }
  }

  new WatchOS();
})();

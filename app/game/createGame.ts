import Phaser from "phaser";
import { ROOMS } from "./content";
import type {
  AccessibilitySettings,
  Cell,
  GameCommand,
  GameEvent,
  GameHandle,
  InputMethod,
  PuzzleState,
  RoomDefinition,
  SaveGameV1,
  TutorialStep,
} from "./contracts";
import {
  advanceDirectionRepeat,
  createDirectionRepeatState,
  readGamepadFrame,
} from "./input";
import { mothPose } from "./motion";
import { interactionTargetAt, isBlockedCell } from "./navigation";
import {
  createInitialPuzzleState,
  ringBell,
  rotateCrystal,
  sameCell,
  toggleTide,
  traceBeam,
} from "./puzzle";

const WIDTH = 960;
const HEIGHT = 540;
const CELL = 48;
const GRID_LEFT = 120;
const GRID_TOP = 54;
const GLYPHS = ["○", "△", "◇"];

interface MountOptions {
  parent: HTMLElement;
  save: SaveGameV1;
  onEvent(event: GameEvent): void;
}

function cellToWorld(cell: Cell): Cell {
  return {
    x: GRID_LEFT + cell.x * CELL + CELL / 2,
    y: GRID_TOP + cell.y * CELL + CELL / 2,
  };
}

function distance(a: Cell, b: Cell): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function cssHex(color: number): string {
  return `#${color.toString(16).padStart(6, "0")}`;
}

function seededRandom(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let output = value;
    output = Math.imul(output ^ (output >>> 15), output | 1);
    output ^= output + Math.imul(output ^ (output >>> 7), output | 61);
    return ((output ^ (output >>> 14)) >>> 0) / 4294967296;
  };
}

class AudioGarden {
  private context?: AudioContext;
  private master?: GainNode;
  private droneGain?: GainNode;
  private drones: OscillatorNode[] = [];
  private settings: AccessibilitySettings;

  constructor(settings: AccessibilitySettings) {
    this.settings = settings;
  }

  updateSettings(settings: AccessibilitySettings): void {
    this.settings = settings;
    if (this.droneGain) {
      this.droneGain.gain.setTargetAtTime(
        settings.musicVolume * 0.025,
        this.context?.currentTime ?? 0,
        0.15,
      );
    }
  }

  wake(): void {
    if (!this.context) {
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.gain.value = 0.55;
      this.master.connect(this.context.destination);
      this.startDrone();
    }
    if (this.context.state === "suspended") {
      void this.context.resume();
    }
  }

  private startDrone(): void {
    if (!this.context || !this.master || this.drones.length > 0) return;
    this.droneGain = this.context.createGain();
    this.droneGain.gain.value = this.settings.musicVolume * 0.025;
    this.droneGain.connect(this.master);
    [73.42, 110].forEach((frequency, index) => {
      const oscillator = this.context!.createOscillator();
      const gain = this.context!.createGain();
      oscillator.type = index === 0 ? "sine" : "triangle";
      oscillator.frequency.value = frequency;
      gain.gain.value = index === 0 ? 0.75 : 0.22;
      oscillator.connect(gain);
      gain.connect(this.droneGain!);
      oscillator.start();
      this.drones.push(oscillator);
    });
  }

  note(frequency: number, duration = 0.45, strength = 1): void {
    this.wake();
    if (!this.context || !this.master || this.settings.effectsVolume <= 0) return;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    const now = this.context.currentTime;
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.04, now + duration);
    gain.gain.setValueAtTime(
      Math.max(0.0001, this.settings.effectsVolume * 0.08 * strength),
      now,
    );
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain);
    gain.connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.05);
  }

  rotate(): void {
    this.note(330, 0.22, 0.7);
  }

  collect(): void {
    this.note(660, 0.35, 0.9);
    window.setTimeout(() => this.note(880, 0.45, 0.65), 90);
  }

  solve(): void {
    [523.25, 659.25, 783.99, 1046.5].forEach((tone, index) => {
      window.setTimeout(() => this.note(tone, 0.75, 0.9), index * 120);
    });
  }

  bump(): void {
    this.note(145, 0.12, 0.35);
  }

  destroy(): void {
    this.drones.forEach((drone) => drone.stop());
    this.drones = [];
    void this.context?.close();
  }
}

class GlimmerScene extends Phaser.Scene {
  private readonly onEvent: (event: GameEvent) => void;
  private readonly completedRooms: Set<string>;
  private readonly collectedSeeds: Set<string>;
  private readonly audio: AudioGarden;
  private settings: AccessibilitySettings;
  private roomIndex: number;
  private room!: RoomDefinition;
  private puzzle!: PuzzleState;
  private playerCell!: Cell;
  private facing: Cell = { x: 0, y: -1 };
  private player?: Phaser.GameObjects.Container;
  private moth?: Phaser.GameObjects.Container;
  private carrying = false;
  private moteAvailable = true;
  private moving = false;
  private solved = false;
  private focusMode = false;
  private startedAt = 0;
  private gamepadRepeat = createDirectionRepeatState();
  private gamepadButtons = { action: false, focus: false, hint: false };
  private hintIndex = 0;
  private tutorialStep: TutorialStep | null = null;

  constructor(options: {
    roomIndex: number;
    completedRooms: string[];
    collectedSeeds: string[];
    settings: AccessibilitySettings;
    onEvent(event: GameEvent): void;
  }) {
    super({ key: "GlimmerGrotto" });
    this.roomIndex = options.roomIndex;
    this.completedRooms = new Set(options.completedRooms);
    this.collectedSeeds = new Set(options.collectedSeeds);
    this.settings = options.settings;
    this.onEvent = options.onEvent;
    this.audio = new AudioGarden(options.settings);
  }

  create(): void {
    this.startedAt = Date.now();
    this.input.keyboard?.on("keydown", this.onKeyDown, this);
    this.input.on("pointerdown", this.onPointerDown, this);
    this.loadRoom(this.roomIndex);
    this.onEvent({ type: "ready", totalRooms: ROOMS.length });
  }

  update(time: number): void {
    if (this.moth && this.player) {
      const pose = mothPose(time, this.settings.reducedMotion);
      this.moth.setPosition(
        this.player.x + pose.x,
        this.player.y + pose.y,
      );
      this.moth.setRotation(pose.rotation);
    }
    this.pollGamepad(time);
  }

  dispatch(command: GameCommand): void {
    this.audio.wake();
    switch (command.type) {
      case "move":
        this.move(command.dx, command.dy);
        break;
      case "interact":
        this.interact();
        break;
      case "hint":
        this.requestHint();
        break;
      case "reset":
        this.resetRoom();
        break;
      case "focus":
        this.focusMode = !this.focusMode;
        this.drawRoom();
        this.pulseAt(this.playerCell);
        this.announce(
          this.focusMode
            ? "Focus glow on. Nearby objects are outlined."
            : "Focus glow off.",
        );
        break;
      case "pause":
        if (this.input.keyboard) this.input.keyboard.enabled = false;
        this.scene.pause();
        break;
      case "resume":
        if (this.input.keyboard) this.input.keyboard.enabled = true;
        this.scene.resume();
        break;
      case "settings":
        this.settings = command.settings;
        this.audio.updateSettings(command.settings);
        this.drawRoom();
        break;
    }
  }

  shutdown(): void {
    this.input.keyboard?.off("keydown", this.onKeyDown, this);
    this.input.off("pointerdown", this.onPointerDown, this);
    this.audio.destroy();
  }

  private loadRoom(index: number): void {
    this.roomIndex = Phaser.Math.Clamp(index, 0, ROOMS.length - 1);
    this.room = ROOMS[this.roomIndex];
    this.puzzle = createInitialPuzzleState(this.room);
    this.playerCell = { ...this.room.start };
    this.facing = { x: 0, y: -1 };
    this.carrying = false;
    this.moteAvailable = Boolean(this.room.mote);
    this.moving = false;
    this.solved = false;
    this.focusMode = false;
    this.hintIndex = 0;
    this.tutorialStep =
      this.roomIndex === 0 && !this.completedRooms.has(this.room.id)
        ? "move"
        : null;
    this.drawRoom();
    this.onEvent({
      type: "room",
      index: this.roomIndex,
      id: this.room.id,
      biomeName: this.room.biomeName,
      name: this.room.name,
      subtitle: this.room.subtitle,
      story: this.room.story,
      hints: this.room.hints,
    });
    this.onEvent({ type: "tutorial", step: this.tutorialStep });
    if (!this.settings.reducedMotion) {
      this.cameras.main.fadeIn(240, 4, 19, 19);
    }
    this.announce(`${this.room.name}. ${this.room.subtitle}`);
  }

  private drawRoom(): void {
    this.tweens.killAll();
    this.children.removeAll(true);
    const palette = this.room.palette;
    const trace = traceBeam(this.room, this.puzzle);
    if (trace.solved && !this.solved) {
      this.solved = true;
      this.completedRooms.add(this.room.id);
      this.setTutorialStep(null);
      this.emitProgress(Math.min(this.roomIndex + 1, ROOMS.length - 1));
      this.audio.solve();
      this.announce("The room is restored. Press action to continue deeper.");
    }

    this.cameras.main.setBackgroundColor(cssHex(palette.background));
    const background = this.add.graphics();
    background.fillStyle(palette.background, 1);
    background.fillRect(0, 0, WIDTH, HEIGHT);
    this.drawCaveTexture(background);
    this.drawFloor(background);
    this.drawBeam(trace.cells, trace.solved);
    this.drawWalls();
    this.drawWater();
    this.drawSource();
    this.drawBloom(trace.solved);
    this.drawCrystals();
    this.drawBells();
    this.drawTideSwitch();
    this.drawMote();
    this.drawSeed();
    this.drawPlayer();
    this.drawRoomLabel();
    if (this.solved) this.drawSolvedVeil();
  }

  private drawCaveTexture(graphics: Phaser.GameObjects.Graphics): void {
    const random = seededRandom(this.roomIndex * 971 + 41);
    const palette = this.room.palette;
    for (let index = 0; index < 48; index += 1) {
      const x = random() * WIDTH;
      const y = random() * HEIGHT;
      const radius = 2 + random() * 13;
      graphics.fillStyle(
        index % 3 === 0 ? palette.accentSoft : palette.stone,
        0.05 + random() * 0.09,
      );
      graphics.fillCircle(x, y, radius);
    }
  }

  private drawFloor(graphics: Phaser.GameObjects.Graphics): void {
    const palette = this.room.palette;
    graphics.fillStyle(palette.floor, 0.96);
    graphics.fillRoundedRect(
      GRID_LEFT + CELL,
      GRID_TOP + CELL,
      CELL * 13,
      CELL * 7,
      30,
    );
    for (let y = 1; y <= 7; y += 1) {
      for (let x = 1; x <= 13; x += 1) {
        const world = cellToWorld({ x, y });
        graphics.fillStyle(
          (x + y) % 2 === 0 ? palette.floorAlt : palette.floor,
          0.35,
        );
        graphics.fillRoundedRect(
          world.x - CELL / 2 + 2,
          world.y - CELL / 2 + 2,
          CELL - 4,
          CELL - 4,
          11,
        );
      }
    }
  }

  private drawBeam(cells: Cell[], solved: boolean): void {
    if (cells.length < 2) return;
    const palette = this.room.palette;
    const beam = this.add.graphics();
    const points = cells.map(cellToWorld);
    [18, 9, 3].forEach((width, index) => {
      beam.lineStyle(
        width,
        index === 2 ? palette.beam : palette.accentSoft,
        index === 0 ? 0.1 : index === 1 ? 0.26 : solved ? 0.95 : 0.72,
      );
      beam.beginPath();
      beam.moveTo(points[0].x, points[0].y);
      points.slice(1).forEach((point) => beam.lineTo(point.x, point.y));
      beam.strokePath();
    });
  }

  private drawWalls(): void {
    this.room.walls.forEach((wall, index) => {
      const world = cellToWorld(wall);
      const stone = this.add.rectangle(
        world.x,
        world.y,
        CELL - 10,
        CELL - 10,
        this.room.palette.stone,
        1,
      );
      stone.setStrokeStyle(2, this.room.palette.floorAlt, 0.8);
      stone.setRotation(index % 2 === 0 ? 0.05 : -0.05);
      this.add.circle(
        world.x - 8,
        world.y - 7,
        3,
        this.room.palette.accentSoft,
        0.2,
      );
    });
  }

  private drawWater(): void {
    if (!this.room.tideSwitch) return;
    const water = this.add.graphics();
    const alpha = this.puzzle.tide === "high" ? 0.2 : 0.1;
    water.fillStyle(this.room.palette.accentSoft, alpha);
    water.fillRoundedRect(
      GRID_LEFT + CELL * 1.2,
      GRID_TOP + CELL * (this.puzzle.tide === "high" ? 5.6 : 6.45),
      CELL * 12.6,
      CELL * (this.puzzle.tide === "high" ? 1.25 : 0.4),
      18,
    );
  }

  private drawSource(): void {
    const world = cellToWorld(this.room.source);
    const active =
      this.puzzle.charged &&
      (!this.room.bellSequence ||
        this.puzzle.bellProgress >= this.room.bellSequence.length) &&
      (!this.room.requiredTide || this.puzzle.tide === this.room.requiredTide);
    this.add.circle(
      world.x,
      world.y,
      20,
      active ? this.room.palette.accent : this.room.palette.stone,
      0.22,
    );
    this.add.circle(
      world.x,
      world.y,
      11,
      active ? this.room.palette.beam : this.room.palette.stone,
      active ? 0.9 : 0.75,
    );
    const ring = this.add.circle(world.x, world.y, 25, 0x000000, 0);
    ring.setStrokeStyle(
      this.focusMode ? 4 : 2,
      this.room.palette.accent,
      this.focusMode ? 0.9 : 0.45,
    );
  }

  private drawBloom(lit: boolean): void {
    const world = cellToWorld(this.room.bloom);
    for (let index = 0; index < 6; index += 1) {
      const angle = (Math.PI * 2 * index) / 6;
      const petal = this.add.ellipse(
        world.x + Math.cos(angle) * 13,
        world.y + Math.sin(angle) * 13,
        lit ? 18 : 13,
        lit ? 28 : 21,
        lit ? this.room.palette.accent : this.room.palette.stone,
        lit ? 0.95 : 0.75,
      );
      petal.setRotation(angle + Math.PI / 2);
    }
    this.add.circle(
      world.x,
      world.y,
      lit ? 11 : 8,
      lit ? this.room.palette.beam : this.room.palette.floorAlt,
      1,
    );
  }

  private drawCrystals(): void {
    this.room.crystals.forEach((crystal) => {
      const world = cellToWorld(crystal);
      const orientation = this.puzzle.rotations[crystal.id] ?? crystal.initial;
      this.add.circle(
        world.x,
        world.y,
        this.focusMode ? 24 : 19,
        this.room.palette.accentSoft,
        this.focusMode ? 0.18 : 0.08,
      );
      const mirror = this.add.rectangle(
        world.x,
        world.y,
        7,
        38,
        this.room.palette.beam,
        0.95,
      );
      mirror.setRotation(orientation === 0 ? Math.PI / 4 : -Math.PI / 4);
      mirror.setStrokeStyle(2, this.room.palette.accent, 0.9);
      this.add.circle(world.x, world.y, 5, this.room.palette.accent, 1);
    });
  }

  private drawBells(): void {
    this.room.bells?.forEach((bell) => {
      const world = cellToWorld(bell);
      const activeIndex = this.puzzle.bellProgress;
      const expected = this.room.bellSequence?.[activeIndex] === bell.id;
      this.add.circle(
        world.x,
        world.y,
        this.focusMode || expected ? 23 : 19,
        this.room.palette.accentSoft,
        this.focusMode || expected ? 0.24 : 0.11,
      );
      this.add.circle(world.x, world.y, 14, this.room.palette.stone, 0.95);
      this.add
        .text(world.x, world.y - 1, GLYPHS[bell.tone] ?? "•", {
          color: cssHex(this.room.palette.accent),
          fontFamily: "system-ui, sans-serif",
          fontSize: "21px",
          fontStyle: "bold",
        })
        .setOrigin(0.5);
    });
  }

  private drawTideSwitch(): void {
    if (!this.room.tideSwitch) return;
    const world = cellToWorld(this.room.tideSwitch);
    const control = this.add.rectangle(
      world.x,
      world.y,
      38,
      30,
      this.room.palette.stone,
      1,
    );
    control.setStrokeStyle(
      this.focusMode ? 4 : 2,
      this.room.palette.accent,
      this.focusMode ? 1 : 0.65,
    );
    this.add
      .text(world.x, world.y, this.puzzle.tide === "high" ? "≈" : "⌄", {
        color: cssHex(this.room.palette.accent),
        fontFamily: "system-ui, sans-serif",
        fontSize: "22px",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
  }

  private drawMote(): void {
    if (!this.room.mote || !this.moteAvailable || this.carrying || this.puzzle.charged) {
      return;
    }
    const world = cellToWorld(this.room.mote);
    this.add.circle(world.x, world.y, 17, this.room.palette.accent, 0.12);
    this.add.circle(world.x, world.y, 8, this.room.palette.beam, 0.95);
    this.add.circle(world.x - 3, world.y - 3, 2, 0xffffff, 0.85);
  }

  private drawSeed(): void {
    if (!this.room.seed || this.collectedSeeds.has(this.room.seed.id)) return;
    const world = cellToWorld(this.room.seed);
    const seed = this.add.ellipse(
      world.x,
      world.y,
      13,
      22,
      this.room.palette.accent,
      0.95,
    );
    seed.setRotation(-0.45);
    seed.setStrokeStyle(2, this.room.palette.beam, 0.75);
  }

  private drawPlayer(): void {
    const world = cellToWorld(this.playerCell);
    const glow = this.add.circle(0, 7, 25, this.room.palette.accent, 0.13);
    const cloak = this.add.ellipse(0, 5, 27, 34, 0x14222a, 1);
    cloak.setStrokeStyle(2, this.room.palette.accentSoft, 0.6);
    const face = this.add.circle(0, -6, 11, 0xf0dfc3, 1);
    const lantern = this.add.circle(11, 5, 6, this.room.palette.beam, 1);
    const eyeLeft = this.add.circle(-4, -7, 1.6, 0x17232c, 1);
    const eyeRight = this.add.circle(4, -7, 1.6, 0x17232c, 1);
    const carried = this.carrying
      ? this.add.circle(-12, -15, 5, this.room.palette.beam, 1)
      : undefined;
    const parts = [glow, cloak, face, lantern, eyeLeft, eyeRight];
    if (carried) parts.push(carried);
    this.player = this.add.container(world.x, world.y, parts);

    const wingLeft = this.add.ellipse(-5, 0, 8, 13, this.room.palette.accent, 0.82);
    wingLeft.setRotation(-0.55);
    const wingRight = this.add.ellipse(5, 0, 8, 13, this.room.palette.accent, 0.82);
    wingRight.setRotation(0.55);
    const mothBody = this.add.circle(0, 1, 2.5, this.room.palette.beam, 1);
    this.moth = this.add.container(world.x + 25, world.y - 28, [wingLeft, wingRight, mothBody]);
  }

  private drawRoomLabel(): void {
    this.add.text(34, 26, this.room.biomeName.toUpperCase(), {
      color: cssHex(this.room.palette.accent),
      fontFamily: "system-ui, sans-serif",
      fontSize: "13px",
      fontStyle: "bold",
      letterSpacing: 2,
    });
    this.add
      .text(WIDTH - 34, 26, `${this.roomIndex + 1} / ${ROOMS.length}`, {
        color: "#d9ece7",
        fontFamily: "system-ui, sans-serif",
        fontSize: "13px",
      })
      .setOrigin(1, 0);
  }

  private drawSolvedVeil(): void {
    const veil = this.add.rectangle(
      WIDTH / 2,
      HEIGHT / 2,
      WIDTH,
      HEIGHT,
      this.room.palette.background,
      0.16,
    );
    veil.setBlendMode(Phaser.BlendModes.MULTIPLY);
    const panel = this.add.rectangle(
      WIDTH / 2,
      HEIGHT / 2,
      390,
      120,
      this.room.palette.background,
      0.92,
    );
    panel.setStrokeStyle(2, this.room.palette.accent, 0.72);
    const title = this.add
      .text(WIDTH / 2, HEIGHT / 2 - 22, "ROOM RESTORED", {
        color: cssHex(this.room.palette.accent),
        fontFamily: "Georgia, serif",
        fontSize: "27px",
        fontStyle: "bold",
        letterSpacing: 2,
      })
      .setOrigin(0.5);
    const instruction = this.add
      .text(
        WIDTH / 2,
        HEIGHT / 2 + 24,
        this.roomIndex === ROOMS.length - 1
          ? "Press action to wake the Heartbloom"
          : "Press action to continue deeper",
        {
          color: "#e9f3ef",
          fontFamily: "system-ui, sans-serif",
          fontSize: "16px",
        },
      )
      .setOrigin(0.5);

    if (!this.settings.reducedMotion) {
      veil.setAlpha(0);
      panel.setAlpha(0).setScale(0.94);
      title.setAlpha(0);
      instruction.setAlpha(0);
      this.tweens.add({ targets: veil, alpha: 1, duration: 180 });
      this.tweens.add({
        targets: [panel, title, instruction],
        alpha: 1,
        duration: 240,
        delay: 70,
        ease: "Sine.Out",
      });
      this.tweens.add({
        targets: panel,
        scaleX: 1,
        scaleY: 1,
        duration: 260,
        delay: 70,
        ease: "Back.Out",
      });
    }
  }

  private pulseAt(cell: Cell, color = this.room.palette.accent): void {
    if (this.settings.reducedMotion) return;
    const world = cellToWorld(cell);
    const ring = this.add.circle(world.x, world.y, 14, color, 0);
    ring.setStrokeStyle(3, color, 0.82).setDepth(30);
    this.tweens.add({
      targets: ring,
      scaleX: 2.35,
      scaleY: 2.35,
      alpha: 0,
      duration: 360,
      ease: "Sine.Out",
      onComplete: () => ring.destroy(),
    });
  }

  private bumpPlayer(dx: number, dy: number): void {
    if (this.settings.reducedMotion || !this.player || this.moving) return;
    const origin = { x: this.player.x, y: this.player.y };
    this.tweens.add({
      targets: this.player,
      x: origin.x + dx * 6,
      y: origin.y + dy * 6,
      duration: 48,
      yoyo: true,
      ease: "Sine.Out",
      onComplete: () => this.player?.setPosition(origin.x, origin.y),
    });
  }

  private move(dx: number, dy: number): void {
    if (this.solved || this.moving) return;
    this.facing = { x: Math.sign(dx), y: Math.sign(dy) };
    const next = { x: this.playerCell.x + dx, y: this.playerCell.y + dy };
    if (isBlockedCell(this.room, next)) {
      this.audio.bump();
      this.bumpPlayer(dx, dy);
      return;
    }
    this.playerCell = next;
    this.updateTutorialForPosition();
    const world = cellToWorld(next);
    if (!this.player || this.settings.reducedMotion) {
      this.drawRoom();
      this.handleLanding();
      return;
    }
    this.moving = true;
    this.tweens.add({
      targets: this.player,
      x: world.x,
      y: world.y,
      duration: 115,
      ease: "Sine.Out",
      onComplete: () => {
        this.moving = false;
        this.handleLanding();
      },
    });
  }

  private handleLanding(): void {
    if (
      this.room.mote &&
      sameCell(this.playerCell, this.room.mote) &&
      this.moteAvailable &&
      !this.carrying &&
      !this.puzzle.charged
    ) {
      this.carrying = true;
      this.moteAvailable = false;
      this.audio.collect();
      this.announce("Mica carries a loose glimmer. Bring it to the dark source.");
      this.drawRoom();
      this.pulseAt(this.playerCell, this.room.palette.beam);
      return;
    }
    if (
      this.room.seed &&
      sameCell(this.playerCell, this.room.seed) &&
      !this.collectedSeeds.has(this.room.seed.id)
    ) {
      this.collectedSeeds.add(this.room.seed.id);
      this.audio.collect();
      this.announce("Echo seed found. Its memory joins the lantern.");
      this.emitProgress(this.roomIndex);
      this.drawRoom();
      this.pulseAt(this.playerCell, this.room.palette.beam);
    }
  }

  private interact(preferredCell?: Cell): void {
    if (this.solved) {
      if (this.roomIndex >= ROOMS.length - 1) {
        this.onEvent({ type: "journeyComplete" });
        return;
      }
      this.loadRoom(this.roomIndex + 1);
      this.emitProgress(this.roomIndex);
      return;
    }

    const facingCell = preferredCell ?? {
      x: this.playerCell.x + this.facing.x,
      y: this.playerCell.y + this.facing.y,
    };
    const target = interactionTargetAt(this.room, this.playerCell, facingCell);

    if (target?.kind === "source") {
      if (this.carrying) {
        this.puzzle = { ...this.puzzle, charged: true };
        this.carrying = false;
        this.audio.collect();
        this.announce("The source accepts the glimmer and wakes.");
      } else if (this.puzzle.charged) {
        this.puzzle = { ...this.puzzle, charged: false };
        this.carrying = true;
        this.announce("Mica gently lifts the glimmer free again.");
      } else {
        this.announce("This source needs a loose glimmer.");
      }
      this.drawRoom();
      this.pulseAt(this.room.source);
      return;
    }

    const nearbyBell = target?.kind === "bell"
      ? this.room.bells?.find((item) => item.id === target.id)
      : undefined;
    if (nearbyBell) {
      const result = ringBell(this.room, this.puzzle, nearbyBell.id);
      this.puzzle = result.state;
      this.audio.note(392 * 2 ** (nearbyBell.tone / 5), 0.55, 0.9);
      this.announce(
        result.complete
          ? "The rootsong is complete. The source begins to glow."
          : result.correct
            ? `A true note. ${this.puzzle.bellProgress} of ${this.room.bellSequence?.length ?? 0}.`
            : "The roots fall quiet. The sequence begins again.",
      );
      this.drawRoom();
      this.pulseAt(nearbyBell);
      return;
    }

    if (target?.kind === "tide" && this.room.tideSwitch) {
      this.puzzle = toggleTide(this.puzzle);
      this.audio.note(this.puzzle.tide === "high" ? 294 : 196, 0.6, 0.75);
      this.announce(`The tide is now ${this.puzzle.tide}.`);
      this.drawRoom();
      this.pulseAt(this.room.tideSwitch);
      return;
    }

    const nearbyCrystal = target?.kind === "crystal"
      ? this.room.crystals.find((item) => item.id === target.id)
      : undefined;
    if (nearbyCrystal) {
      this.puzzle = rotateCrystal(this.puzzle, nearbyCrystal.id);
      this.audio.rotate();
      if (this.tutorialStep) this.setTutorialStep("follow");
      this.drawRoom();
      this.pulseAt(nearbyCrystal);
      if (!this.solved) {
        this.announce("Crystal turned. Follow the beam to its next stopping place.");
      }
      return;
    }

    this.audio.bump();
    this.pulseAt(this.playerCell, this.room.palette.stone);
    this.announce("Nothing nearby needs the lantern just now.");
  }

  private resetRoom(): void {
    this.puzzle = createInitialPuzzleState(this.room);
    this.playerCell = { ...this.room.start };
    this.facing = { x: 0, y: -1 };
    this.carrying = false;
    this.moteAvailable = Boolean(this.room.mote);
    this.solved = false;
    this.hintIndex = 0;
    this.setTutorialStep(
      this.roomIndex === 0 && !this.completedRooms.has(this.room.id)
        ? "move"
        : null,
    );
    this.drawRoom();
    if (!this.settings.reducedMotion) {
      this.cameras.main.fadeIn(160, 4, 19, 19);
    }
    this.announce("The room settles back to its starting pattern.");
  }

  private requestHint(): void {
    const index = Math.min(this.hintIndex + 1, 3) as 1 | 2 | 3;
    const hint = this.room.hints[index - 1];
    this.hintIndex = index;
    this.onEvent({ type: "hint", index, hint });
  }

  private setInputMethod(method: InputMethod): void {
    this.onEvent({ type: "inputMethod", method });
  }

  private setTutorialStep(step: TutorialStep | null): void {
    const next =
      this.roomIndex === 0 && !this.completedRooms.has(this.room.id)
        ? step
        : null;
    if (next === this.tutorialStep) return;
    this.tutorialStep = next;
    this.onEvent({ type: "tutorial", step: next });
  }

  private updateTutorialForPosition(): void {
    if (
      this.tutorialStep === "move" &&
      this.room.crystals.some((crystal) => distance(this.playerCell, crystal) <= 1)
    ) {
      this.setTutorialStep("interact");
      this.announce("You are beside a crystal. Use action to turn it.");
    }
  }

  private emitProgress(currentRoom: number): void {
    this.onEvent({
      type: "progress",
      currentRoom,
      completedRooms: [...this.completedRooms],
      collectedSeeds: [...this.collectedSeeds],
    });
  }

  private announce(message: string): void {
    this.onEvent({ type: "announce", message });
  }

  private onKeyDown(event: KeyboardEvent): void {
    const target = event.target;
    if (
      target instanceof Element &&
      target.closest("button, input, select, textarea, dialog")
    ) {
      return;
    }
    const code = event.code;
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(code)) {
      event.preventDefault();
    }
    this.setInputMethod("keyboard");
    if (code === "ArrowUp" || code === "KeyW") this.dispatch({ type: "move", dx: 0, dy: -1 });
    else if (code === "ArrowDown" || code === "KeyS") this.dispatch({ type: "move", dx: 0, dy: 1 });
    else if (code === "ArrowLeft" || code === "KeyA") this.dispatch({ type: "move", dx: -1, dy: 0 });
    else if (code === "ArrowRight" || code === "KeyD") this.dispatch({ type: "move", dx: 1, dy: 0 });
    else if (code === "Space" || code === "Enter" || code === "KeyE") this.dispatch({ type: "interact" });
    else if (code === "KeyR") this.dispatch({ type: "reset" });
    else if (code === "KeyF") this.dispatch({ type: "focus" });
    else if (code === "KeyH") this.dispatch({ type: "hint" });
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    this.setInputMethod("pointer");
    this.audio.wake();
    if (this.solved) {
      this.interact();
      return;
    }
    const gridX = Math.floor((pointer.worldX - GRID_LEFT) / CELL);
    const gridY = Math.floor((pointer.worldY - GRID_TOP) / CELL);
    const target = { x: gridX, y: gridY };
    const deltaX = target.x - this.playerCell.x;
    const deltaY = target.y - this.playerCell.y;
    if (Math.abs(deltaX) + Math.abs(deltaY) === 1) {
      if (isBlockedCell(this.room, target)) this.interact(target);
      else this.move(Math.sign(deltaX), Math.sign(deltaY));
    }
  }

  private pollGamepad(time: number): void {
    const gamepad = navigator
      .getGamepads?.()
      .find((candidate): candidate is Gamepad => Boolean(candidate));
    if (!gamepad) {
      this.gamepadRepeat = createDirectionRepeatState();
      this.gamepadButtons = { action: false, focus: false, hint: false };
      return;
    }

    const frame = readGamepadFrame(gamepad);
    if (frame.direction || frame.action || frame.focus || frame.hint) {
      this.setInputMethod("gamepad");
    }
    if (frame.action && !this.gamepadButtons.action) {
      this.dispatch({ type: "interact" });
    }
    if (frame.focus && !this.gamepadButtons.focus) {
      this.dispatch({ type: "focus" });
    }
    if (frame.hint && !this.gamepadButtons.hint) {
      this.dispatch({ type: "hint" });
    }
    this.gamepadButtons = {
      action: frame.action,
      focus: frame.focus,
      hint: frame.hint,
    };

    const repeat = advanceDirectionRepeat(frame.direction, time, this.gamepadRepeat);
    this.gamepadRepeat = repeat.state;
    if (repeat.move === "left") this.dispatch({ type: "move", dx: -1, dy: 0 });
    else if (repeat.move === "right") this.dispatch({ type: "move", dx: 1, dy: 0 });
    else if (repeat.move === "up") this.dispatch({ type: "move", dx: 0, dy: -1 });
    else if (repeat.move === "down") this.dispatch({ type: "move", dx: 0, dy: 1 });
  }
}

export function mountGame(options: MountOptions): GameHandle {
  let initialRoom = Phaser.Math.Clamp(options.save.currentRoom, 0, ROOMS.length - 1);
  while (
    initialRoom < ROOMS.length - 1 &&
    options.save.completedRooms.includes(ROOMS[initialRoom].id)
  ) {
    initialRoom += 1;
  }

  const scene = new GlimmerScene({
    roomIndex: initialRoom,
    completedRooms: options.save.completedRooms,
    collectedSeeds: options.save.collectedSeeds,
    settings: options.save.settings,
    onEvent: options.onEvent,
  });

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    width: WIDTH,
    height: HEIGHT,
    parent: options.parent,
    backgroundColor: "#071a1a",
    scene: [scene],
    render: {
      antialias: true,
      roundPixels: true,
      powerPreference: "low-power",
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: WIDTH,
      height: HEIGHT,
    },
    input: {
      keyboard: true,
      mouse: true,
      touch: true,
      gamepad: true,
    },
    fps: {
      target: 60,
      smoothStep: true,
    },
  });

  return {
    dispatch(command) {
      if (scene.sys?.isActive()) scene.dispatch(command);
    },
    pause() {
      if (scene.sys?.isActive()) scene.dispatch({ type: "pause" });
    },
    resume() {
      scene.dispatch({ type: "resume" });
    },
    destroy() {
      scene.shutdown();
      game.destroy(true);
    },
  };
}

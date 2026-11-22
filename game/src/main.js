// main.js — the game loop: alarm, win/lose, phases, coin tosses, the grab.
// Wires the modules together: input moves the thief, guards and cameras
// watch, the alarm rises while the thief is seen and falls while hidden,
// the gem takes a few exposed seconds to steal, and the exit pays off.

import { VIEW, THIEF, ALARM, GUARD, COIN } from './config.js';
import { buildWorld, moveCircle } from './world.js';
import { makeGuards, updateGuards, guardSees, guardCaught, distractGuards } from './guards.js';
import { makeCameras, updateCameras, cameraSees } from './cameras.js';
import { makeInput, moveDirection, isSneaking, consumePress, consumeClick, endFrame } from './input.js';
import { makeAudio } from './audio.js';
import { render } from './render.js';
import { stagedState } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

function fitCanvas() {
  const scale = Math.min(window.innerWidth / VIEW.width, window.innerHeight / VIEW.height);
  canvas.width = Math.round(VIEW.width * scale * window.devicePixelRatio);
  canvas.height = Math.round(VIEW.height * scale * window.devicePixelRatio);
  canvas.style.width = `${Math.round(VIEW.width * scale)}px`;
  canvas.style.height = `${Math.round(VIEW.height * scale)}px`;
  ctx.setTransform(canvas.width / VIEW.width, 0, 0, canvas.height / VIEW.height, 0, 0);
}
window.addEventListener('resize', fitCanvas);
fitCanvas();

const input = makeInput(canvas);
const audio = makeAudio();

export function newGame() {
  const world = buildWorld();
  return {
    phase: 'title',
    world,
    thief: { x: 360, y: 640, grabProgress: 0 },
    guards: makeGuards(),
    cameras: makeCameras(),
    coins: [],
    coinsLeft: THIEF.maxCoins,
    alarm: 0,
    alarmPeak: 0,
    elapsed: 0,
    timeSeconds: 0,
    sneaking: false,
    seenBy: new Set(),
    bustedReason: '',
    wasSeen: false,
  };
}

let game = newGame();

// A staged ?shot= scene replaces the live state with a fixed tableau.
const shot = new URLSearchParams(window.location.search).get('shot');
if (shot) {
  game = stagedState(shot, newGame());
}

function throwCoin(game, x, y) {
  if (game.coinsLeft <= 0) return;
  game.coinsLeft -= 1;
  game.coins.push({ x, y, thrown: true });
  distractGuards(game.guards, x, y);
  audio.coin();
}

function update(dt) {
  // Staged ?shot= scenes are frozen tableaux: render only, never simulate.
  if (game.frozen) return;
  game.timeSeconds += dt;
  updateCameras(game.cameras, game.timeSeconds);

  if (game.phase !== 'play') {
    if (game.phase === 'title') updateGuards(game.guards, game.thief, game.world, dt, false);
    return;
  }

  game.elapsed += dt;
  game.sneaking = isSneaking(input);

  // Move the thief.
  const dir = moveDirection(input);
  const speed = game.sneaking ? THIEF.sneakSpeed : THIEF.walkSpeed;
  moveCircle(game.world, game.thief, dir.x * speed * dt, dir.y * speed * dt, THIEF.radius);

  // Mouse click: toss a coin at that spot.
  const click = consumeClick(input);
  if (click) throwCoin(game, click.x, click.y);

  // Guards and cameras watch.
  updateGuards(game.guards, game.thief, game.world, dt, game.sneaking);
  game.seenBy.clear();
  let seen = false;
  let closest = Infinity;
  for (const g of game.guards) {
    if (guardSees(g, game.thief, game.world, game.sneaking)) {
      game.seenBy.add(g);
      seen = true;
      closest = Math.min(closest, Math.hypot(g.x - game.thief.x, g.y - game.thief.y));
    }
  }
  for (const c of game.cameras) {
    if (cameraSees(c, game.thief, game.world, game.sneaking)) {
      game.seenBy.add(c);
      seen = true;
      closest = Math.min(closest, Math.hypot(c.x - game.thief.x, c.y - game.thief.y));
    }
  }

  // Alarm rises while seen, faster up close; falls while hidden.
  if (seen) {
    const closeBonus = closest < 120 ? ALARM.riseCloseBonus : 0;
    game.alarm += (ALARM.risePerSecond + closeBonus) * dt;
    if (!game.wasSeen) audio.spotted();
    if (game.alarm >= ALARM.warnAt) audio.startHum();
  } else {
    game.alarm -= ALARM.fallPerSecond * dt;
    if (game.alarm < ALARM.warnAt) audio.stopHum();
  }
  game.wasSeen = seen;
  game.alarm = Math.max(0, Math.min(100, game.alarm));
  game.alarmPeak = Math.max(game.alarmPeak, game.alarm);

  // Grab the loot: hold E close to the gem.
  const loot = game.world.loot;
  const nearLoot = !loot.taken && Math.hypot(loot.x - game.thief.x, loot.y - game.thief.y) < 70;
  if (nearLoot && input.keys.has('KeyE')) {
    game.thief.grabProgress += dt / THIEF.grabSeconds;
    if (Math.random() < dt * 6) audio.grabTick();
    if (game.thief.grabProgress >= 1) {
      loot.taken = true;
      game.thief.grabProgress = 0;
      audio.loot();
    }
  } else {
    game.thief.grabProgress = 0;
  }

  // Busted: alarm full, or a guard grabs the thief.
  const catcher = guardCaught(game.guards, game.thief);
  if (game.alarm >= 100) {
    game.phase = 'busted';
    game.bustedReason = 'The alarm hit 100% — the museum locked down around you.';
    audio.busted();
    audio.stopHum();
  } else if (catcher) {
    game.phase = 'busted';
    game.bustedReason = `Guard ${catcher.name} caught you red-handed.`;
    audio.busted();
    audio.stopHum();
  }

  // Win: loot in hand and standing in the exit doorway.
  if (game.phase === 'play' && loot.taken) {
    const e = game.world.exit;
    if (game.thief.x > e.x - 10 && game.thief.x < e.x + e.w + 10
      && game.thief.y > e.y - 40 && game.thief.y < e.y + e.h + 10) {
      game.phase = 'win';
      audio.win();
      audio.stopHum();
    }
  }
}

function handleKeys() {
  if (consumePress(input, 'KeyM')) {
    const muted = audio.toggleMute();
    document.title = muted ? 'The Velvet Vault (muted)' : 'The Velvet Vault';
  }
  if (consumePress(input, 'KeyR')) {
    game = newGame();
    game.phase = 'play';
  }
  if (consumePress(input, 'KeyP') || consumePress(input, 'Escape')) {
    if (game.phase === 'play') game.phase = 'paused';
    else if (game.phase === 'paused') game.phase = 'play';
  }
  if (game.phase === 'title' && (consumePress(input, 'Enter') || consumePress(input, 'Space'))) {
    audio.unlock();
    game.phase = 'play';
  }
  if ((game.phase === 'busted' || game.phase === 'win') && consumePress(input, 'Enter')) {
    game = newGame();
    game.phase = 'play';
  }
  // Clicking on the title / end screens starts (or restarts) the run.
  if (game.phase === 'title' || game.phase === 'busted' || game.phase === 'win') {
    const click = consumeClick(input);
    if (click) {
      audio.unlock();
      if (game.phase === 'title') game.phase = 'play';
      else {
        game = newGame();
        game.phase = 'play';
      }
    }
  }
}

let last = performance.now();
// Read-only handle for automated play-testing (never used by the game).
window.__velvet = { get game() { return game; } };
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  handleKeys();
  update(dt);
  render(ctx, game);
  endFrame(input);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

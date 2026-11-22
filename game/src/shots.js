// shots.js — deterministic screenshot scenes via ?shot=.
// Each scene is a frozen tableau rendered by the game's own code, with the
// same seed every time: the cover shows the thief mid-room, guards with
// vision cones, cameras, the loot and the alarm meter all in one frame.

import { GUARD } from './config.js';

function freezeGuard(guard, x, y, angle, state) {
  guard.x = x;
  guard.y = y;
  guard.angle = angle;
  guard.state = state || 'patrol';
  guard.waitLeft = 999;
  guard.loseLeft = 0;
  guard.investigateLeft = 0;
  guard.target = null;
  return guard;
}

export function stagedState(shot, game) {
  game.frozen = true;
  const [g1, g2, g3] = game.guards;
  const [c1, c2, c3] = game.cameras;

  if (shot === 'cover') {
    // The money frame: thief crossing gallery B, two guards and two
    // cameras in view, the gem glowing in the vault, alarm at 55%.
    game.phase = 'play';
    game.thief.x = 760;
    game.thief.y = 430;
    game.sneaking = true;
    game.alarm = 55;
    game.alarmPeak = 55;
    game.elapsed = 47;
    game.timeSeconds = 12.4;
    game.coinsLeft = 3;
    game.coins.push({ x: 620, y: 500, thrown: true });
    freezeGuard(g1, 480, 300, 0.5, 'patrol'); // Mara, gallery A
    freezeGuard(g2, 700, 200, Math.PI / 2, 'patrol'); // Dario, above thief
    freezeGuard(g3, 920, 330, Math.PI, 'investigate'); // Sable, by the vault
    g3.target = { x: 620, y: 500 };
    c1.angle = Math.PI / 2 + 0.5;
    c2.angle = Math.PI / 2 - 0.4;
    c3.angle = Math.PI / 2 + 0.7;
    game.seenBy = new Set([g2, c2]); // thief is half-caught: red cones
    return game;
  }

  if (shot === 'play') {
    // Mid-heist action: thief sneaking along the vault approach, a guard
    // closing in, alarm climbing, coins almost spent.
    game.phase = 'play';
    game.thief.x = 985;
    game.thief.y = 480;
    game.sneaking = true;
    game.alarm = 32;
    game.alarmPeak = 41;
    game.elapsed = 96;
    game.timeSeconds = 21.7;
    game.coinsLeft = 1;
    game.coins.push({ x: 880, y: 560, thrown: true });
    freezeGuard(g1, 480, 560, -Math.PI / 2, 'patrol');
    freezeGuard(g2, 600, 420, Math.PI, 'patrol');
    freezeGuard(g3, 1010, 400, Math.PI / 2, 'chase'); // Sable spots the thief
    c1.angle = Math.PI / 2 - 0.6;
    c2.angle = Math.PI / 2 + 0.3;
    c3.angle = Math.PI / 2 + 0.9;
    game.seenBy = new Set([g3]);
    return game;
  }

  if (shot === 'end') {
    // The getaway: loot stolen, thief at the exit, win screen up.
    game.phase = 'win';
    game.world.loot.taken = true;
    game.thief.x = 1065;
    game.thief.y = 665;
    game.alarm = 18;
    game.alarmPeak = 78;
    game.elapsed = 145;
    game.timeSeconds = 33.1;
    game.coinsLeft = 2;
    freezeGuard(g1, 480, 300, 0, 'patrol');
    freezeGuard(g2, 700, 620, -Math.PI / 2, 'patrol');
    freezeGuard(g3, 880, 300, Math.PI / 2, 'patrol');
    c1.angle = Math.PI / 2;
    c2.angle = Math.PI / 2 - 0.5;
    c3.angle = Math.PI / 2 + 0.4;
    game.seenBy = new Set();
    return game;
  }

  // Unknown ?shot value: play the game normally, unfrozen.
  game.frozen = false;
  return game;
}

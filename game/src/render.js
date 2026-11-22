// render.js — every pixel the game draws, on one 2D canvas.
// The museum is drawn dark at night with warm loot light; danger reads
// red, cameras read amber, cover reads green, so safe vs danger is clear
// at a glance. The HUD always shows the alarm meter, loot, coins and time.

import { COLORS, VIEW, GUARD, CAMERA, ALARM } from './config.js';

function drawCone(ctx, x, y, angle, range, halfAngle, fill, edge) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, angle - halfAngle, angle + halfAngle);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawWalls(ctx, world) {
  for (const w of world.walls) {
    ctx.fillStyle = COLORS.wall;
    ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.fillStyle = COLORS.wallTop;
    ctx.fillRect(w.x, w.y, w.w, 4);
  }
}

function drawCover(ctx, world) {
  for (const c of world.cover) {
    ctx.fillStyle = COLORS.cover;
    ctx.fillRect(c.x, c.y, c.w, c.h);
    ctx.strokeStyle = COLORS.coverEdge;
    ctx.lineWidth = 2;
    ctx.strokeRect(c.x + 1, c.y + 1, c.w - 2, c.h - 2);
    if (c.kind === 'case') {
      ctx.fillStyle = 'rgba(242, 193, 78, 0.25)';
      ctx.fillRect(c.x + 6, c.y + 6, c.w - 12, c.h - 12);
      if (c.label) {
        ctx.fillStyle = '#cbb98a';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(c.label, c.x + c.w / 2, c.y + c.h / 2 + 4);
      }
    } else {
      ctx.fillStyle = COLORS.coverEdge;
      ctx.beginPath();
      ctx.arc(c.x + c.w / 2, c.y + c.h / 2, 10, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawLoot(ctx, world, timeSeconds) {
  const loot = world.loot;
  if (loot.taken) return;
  const pulse = 1 + Math.sin(timeSeconds * 3) * 0.12;
  const glow = ctx.createRadialGradient(loot.x, loot.y, 4, loot.x, loot.y, 90 * pulse);
  glow.addColorStop(0, 'rgba(242, 193, 78, 0.5)');
  glow.addColorStop(1, 'rgba(242, 193, 78, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(loot.x - 95, loot.y - 95, 190, 190);
  // Pedestal.
  ctx.fillStyle = '#4a3b2c';
  ctx.fillRect(loot.x - 22, loot.y - 8, 44, 30);
  // The gem, a cut diamond.
  ctx.save();
  ctx.translate(loot.x, loot.y - 14);
  ctx.scale(pulse, pulse);
  ctx.fillStyle = COLORS.gem;
  ctx.beginPath();
  ctx.moveTo(0, -14);
  ctx.lineTo(12, -2);
  ctx.lineTo(0, 12);
  ctx.lineTo(-12, -2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath();
  ctx.moveTo(0, -14);
  ctx.lineTo(6, -2);
  ctx.lineTo(0, -2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 13px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('STAR OF VELVARA', loot.x, loot.y + 52);
}

function drawExit(ctx, world, lootTaken) {
  const e = world.exit;
  ctx.fillStyle = lootTaken ? '#2f7d4f' : '#274a33';
  ctx.fillRect(e.x - 10, e.y - 16, e.w + 20, 30);
  ctx.fillStyle = lootTaken ? '#7dff9e' : '#9fc7a8';
  ctx.font = 'bold 15px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(lootTaken ? 'ESCAPE!' : 'EXIT', e.x + e.w / 2, e.y + 6);
  const en = world.entry;
  ctx.fillStyle = '#5a6b7d';
  ctx.font = 'bold 13px monospace';
  ctx.fillText('ENTRY', en.x + en.w / 2, en.y - 8);
}

function drawThief(ctx, thief, sneaking) {
  ctx.save();
  ctx.translate(thief.x, thief.y);
  // Soft shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath();
  ctx.ellipse(0, 9, 13, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  // Cloaked body: a hooded figure.
  ctx.fillStyle = sneaking ? COLORS.thiefSneak : COLORS.thief;
  ctx.beginPath();
  ctx.arc(0, 0, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1c1712';
  ctx.beginPath();
  ctx.arc(0, -2, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = sneaking ? COLORS.thiefSneak : COLORS.thief;
  ctx.beginPath();
  ctx.moveTo(-6, -12);
  ctx.lineTo(0, -19);
  ctx.lineTo(6, -12);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  if (thief.grabProgress > 0) {
    const r = 24;
    ctx.strokeStyle = COLORS.gold;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(thief.x, thief.y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * thief.grabProgress);
    ctx.stroke();
  }
}

function drawGuard(ctx, guard, seen) {
  drawCone(ctx, guard.x, guard.y, guard.angle, GUARD.viewRange,
    GUARD.viewHalfAngle, seen ? 'rgba(255, 64, 64, 0.45)' : COLORS.danger, COLORS.dangerEdge);
  ctx.save();
  ctx.translate(guard.x, guard.y);
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath();
  ctx.ellipse(0, 10, 14, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.guard;
  ctx.beginPath();
  ctx.arc(0, 0, 14, 0, Math.PI * 2);
  ctx.fill();
  // Cap brim points along the facing angle.
  ctx.fillStyle = '#7d2e2e';
  ctx.beginPath();
  ctx.arc(Math.cos(guard.angle) * 8, Math.sin(guard.angle) * 8, 6, 0, Math.PI * 2);
  ctx.fill();
  // Flashlight dot.
  ctx.fillStyle = '#ffe9a8';
  ctx.beginPath();
  ctx.arc(Math.cos(guard.angle) * 16, Math.sin(guard.angle) * 16, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  if (guard.state === 'chase') {
    ctx.fillStyle = '#ff5a5a';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('!', guard.x, guard.y - 24);
  } else if (guard.state === 'investigate') {
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('?', guard.x, guard.y - 24);
  }
}

function drawCamera(ctx, camera, seen) {
  drawCone(ctx, camera.x, camera.y, camera.angle, CAMERA.viewRange,
    CAMERA.viewHalfAngle, seen ? 'rgba(255, 64, 64, 0.4)' : COLORS.cameraCone, COLORS.cameraEdge);
  ctx.save();
  ctx.translate(camera.x, camera.y);
  ctx.rotate(camera.angle);
  ctx.fillStyle = '#3d3d3d';
  ctx.fillRect(-4, -6, 18, 12);
  ctx.fillStyle = seen ? '#ff4040' : '#ff4040';
  ctx.beginPath();
  ctx.arc(14, 0, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = seen ? '#ff8080' : '#c03030';
  ctx.beginPath();
  ctx.arc(14, 0, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Wall mount.
  ctx.fillStyle = '#555';
  ctx.fillRect(camera.x - 8, camera.y - 10, 16, 6);
}

function drawCoins(ctx, coins) {
  for (const c of coins) {
    ctx.fillStyle = COLORS.gold;
    ctx.beginPath();
    ctx.arc(c.x, c.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#8a6d1f';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function drawHud(ctx, game) {
  const pad = 16;
  // Top bar.
  ctx.fillStyle = 'rgba(10, 8, 6, 0.72)';
  ctx.fillRect(0, 0, VIEW.width, 52);
  ctx.fillStyle = COLORS.hud;
  ctx.font = 'bold 15px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('THE VELVET VAULT', pad, 22);
  ctx.font = '13px monospace';
  ctx.fillStyle = '#b9ac8f';
  ctx.fillText('WASD move · Shift sneak · E grab · Click: toss coin · R restart · P pause', pad, 42);

  // Alarm meter, centre-top.
  const ax = VIEW.width / 2 - 130;
  const ay = 12;
  const aw = 260;
  const ah = 16;
  ctx.fillStyle = '#000';
  ctx.fillRect(ax - 2, ay - 2, aw + 4, ah + 4);
  ctx.fillStyle = '#33241f';
  ctx.fillRect(ax, ay, aw, ah);
  const frac = game.alarm / 100;
  const alarmColor = frac < 0.4 ? '#e8b23a' : frac < ALARM.warnAt / 100 ? '#e07b2e' : '#ff4040';
  ctx.fillStyle = alarmColor;
  ctx.fillRect(ax, ay, aw * frac, ah);
  ctx.strokeStyle = '#f5efe0';
  ctx.lineWidth = 1;
  ctx.strokeRect(ax, ay, aw, ah);
  ctx.fillStyle = COLORS.hud;
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('ALARM', VIEW.width / 2, ay + ah + 15);
  if (game.alarm >= ALARM.warnAt) {
    ctx.fillStyle = '#ff6060';
    ctx.font = 'bold 13px monospace';
    ctx.fillText('SPOTTED!', VIEW.width / 2, ay + ah + 31);
  }

  // Right side: loot, coins, timer.
  ctx.textAlign = 'right';
  ctx.fillStyle = COLORS.hud;
  ctx.font = 'bold 15px monospace';
  const lootText = game.world.loot.taken ? 'LOOT: ★ STAR OF VELVARA' : 'LOOT: —';
  ctx.fillText(lootText, VIEW.width - pad, 22);
  ctx.font = '13px monospace';
  ctx.fillStyle = '#d8c98f';
  ctx.fillText(`COINS: ${game.coinsLeft}   TIME: ${formatTime(game.elapsed)}`, VIEW.width - pad, 42);

  // Objective hint along the bottom.
  ctx.textAlign = 'center';
  ctx.fillStyle = '#b9ac8f';
  ctx.font = '13px monospace';
  const hint = game.world.loot.taken
    ? 'Loot secured — reach the green EXIT at the bottom right!'
    : 'Sneak past the guards and cameras — hold E at the gem to steal it.';
  ctx.fillText(hint, VIEW.width / 2, VIEW.height - 12);
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function overlay(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(8, 6, 4, 0.78)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = accent;
  ctx.font = 'bold 44px monospace';
  ctx.fillText(title, VIEW.width / 2, 250);
  ctx.fillStyle = COLORS.hud;
  ctx.font = '17px monospace';
  lines.forEach((line, i) => ctx.fillText(line, VIEW.width / 2, 300 + i * 30));
}

export function render(ctx, game) {
  const { world, thief, guards, cameras, coins } = game;
  const timeSeconds = game.timeSeconds;

  // Floor with a checker of dark tiles.
  ctx.fillStyle = COLORS.floor;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.fillStyle = COLORS.floorTile;
  const tile = 64;
  for (let y = 0; y < VIEW.height; y += tile) {
    for (let x = 0; x < VIEW.width; x += tile) {
      if (((x + y) / tile) % 2 === 0) ctx.fillRect(x, y, tile, tile);
    }
  }
  for (const c of world.carpets) {
    ctx.fillStyle = COLORS.carpet;
    ctx.fillRect(c.x, c.y, c.w, c.h);
    ctx.strokeStyle = 'rgba(242, 193, 78, 0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(c.x + 4, c.y + 4, c.w - 8, c.h - 8);
  }

  drawWalls(ctx, world);
  drawCover(ctx, world);
  drawLoot(ctx, world, timeSeconds);
  drawExit(ctx, world, world.loot.taken);
  drawCoins(ctx, coins);

  // Watchers: cameras first (under guards), then guards.
  for (const cam of cameras) drawCamera(ctx, cam, game.seenBy.has(cam));
  for (const g of guards) drawGuard(ctx, g, game.seenBy.has(g));

  drawThief(ctx, thief, game.sneaking);
  drawHud(ctx, game);

  if (game.phase === 'title') {
    overlay(ctx, 'THE VELVET VAULT', [
      'A midnight museum. One gem. Three guards. Three cameras.',
      'Sneak, steal the Star of Velvara, and slip out the exit.',
      '',
      'WASD / arrows — move      Shift — sneak (slower, harder to spot)',
      'Hold E at the gem — steal it      Click — toss a coin to distract',
      'R — restart      P — pause      M — mute',
      '',
      'Click or press Enter to begin the heist.',
    ], COLORS.gold);
  } else if (game.phase === 'paused') {
    overlay(ctx, 'PAUSED', ['Press P or Escape to keep sneaking.', ''], '#e8e4d8');
  } else if (game.phase === 'busted') {
    overlay(ctx, 'BUSTED!', [
      game.bustedReason,
      '',
      `Time in the museum: ${formatTime(game.elapsed)}`,
      'Press R or click to try again.',
    ], '#ff5a5a');
  } else if (game.phase === 'win') {
    overlay(ctx, 'CLEAN GETAWAY!', [
      `You slipped out with the Star of Velvara in ${formatTime(game.elapsed)}.`,
      `Coins left: ${game.coinsLeft} · Alarm peaked at ${Math.round(game.alarmPeak)}%`,
      '',
      'Press R or click to run it again.',
    ], COLORS.gold);
  }
}

// world.js — the museum floor: rooms, walls, cover, loot and exit.
// Everything is plain rectangles in a 1280x720 logical space. Walls block
// movement and block sight; cover (display cases, pillars, plants) blocks
// movement and sight too, so the thief can hide behind it.

import { VIEW } from './config.js';

// A wall is { x, y, w, h }. Cover pieces are the same shape.
export function buildWorld() {
  const W = VIEW.width;
  const H = VIEW.height;
  const t = 22; // outer wall thickness

  const walls = [
    // Outer shell (with gaps for entry bottom-left and exit bottom-right).
    { x: 0, y: 0, w: W, h: t }, // top
    { x: 0, y: 0, w: t, h: H }, // left
    { x: W - t, y: 0, w: t, h: H }, // right
    { x: 0, y: H - t, w: 300, h: t }, // bottom left of entry gap
    { x: 420, y: H - t, w: 560, h: t }, // bottom middle
    { x: 1100, y: H - t, w: 180, h: t }, // bottom right of exit gap
    // Room dividers: entry hall | gallery A | gallery B | vault.
    { x: 330, y: t, w: 16, h: 330 }, // divider 1, gap below (door)
    { x: 330, y: 470, w: 16, h: 228 }, // divider 1 lower half
    { x: 640, y: t, w: 16, h: 260 }, // divider 2, gap below
    { x: 640, y: 400, w: 16, h: 298 }, // divider 2 lower half
    { x: 950, y: t, w: 16, h: 300 }, // vault wall, gap below
    { x: 950, y: 440, w: 16, h: 258 }, // vault wall lower half
    // Vault inner cage around the gem (open at the bottom).
    { x: 1010, y: 120, w: 16, h: 170 },
    { x: 1010, y: 120, w: 200, h: 16 },
    { x: 1194, y: 120, w: 16, h: 170 },
  ];

  // Cover: display cases, pillars and planters the thief hides behind.
  const cover = [
    { x: 90, y: 120, w: 120, h: 44, kind: 'case', label: 'VASES' },
    { x: 90, y: 300, w: 120, h: 44, kind: 'case', label: 'COINS' },
    { x: 90, y: 500, w: 120, h: 44, kind: 'case', label: 'MASKS' },
    { x: 400, y: 120, w: 130, h: 46, kind: 'case', label: 'ARMOUR' },
    { x: 400, y: 330, w: 130, h: 46, kind: 'case', label: 'SCROLLS' },
    { x: 400, y: 540, w: 130, h: 46, kind: 'case', label: 'POTTERY' },
    { x: 700, y: 130, w: 130, h: 46, kind: 'case', label: 'JEWELS' },
    { x: 700, y: 340, w: 130, h: 46, kind: 'case', label: 'CROWNS' },
    { x: 700, y: 540, w: 130, h: 46, kind: 'case', label: 'RELICS' },
    { x: 250, y: 210, w: 34, h: 34, kind: 'pillar' },
    { x: 560, y: 210, w: 34, h: 34, kind: 'pillar' },
    { x: 870, y: 210, w: 34, h: 34, kind: 'pillar' },
    { x: 250, y: 480, w: 34, h: 34, kind: 'pillar' },
    { x: 560, y: 480, w: 34, h: 34, kind: 'pillar' },
    { x: 870, y: 480, w: 34, h: 34, kind: 'pillar' },
  ];

  // The loot: the Star of Velvara gem, inside the vault cage.
  const loot = { x: 1110, y: 205, radius: 18, name: 'Star of Velvara', taken: false };

  // Entry door (bottom-left gap) and exit door (bottom-right gap).
  const entry = { x: 360, y: 690, w: 60, h: 30 };
  const exit = { x: 1030, y: 690, w: 70, h: 30 };

  // Carpet runners down each gallery, purely visual.
  const carpets = [
    { x: 40, y: 380, w: 270, h: 90 },
    { x: 360, y: 380, w: 260, h: 90 },
    { x: 670, y: 380, w: 260, h: 90 },
  ];

  return { walls, cover, loot, entry, exit, carpets };
}

// Point inside any solid rectangle (wall or cover)?
export function hitsSolid(world, x, y, radius) {
  const solids = world.walls.concat(world.cover);
  for (const s of solids) {
    const cx = Math.max(s.x, Math.min(x, s.x + s.w));
    const cy = Math.max(s.y, Math.min(y, s.y + s.h));
    const dx = x - cx;
    const dy = y - cy;
    if (dx * dx + dy * dy < radius * radius) return true;
  }
  return false;
}

// Is the straight line from (x1,y1) to (x2,y2) blocked by a wall or cover?
// Sampled along the ray; cheap and good enough for cone checks.
export function lineBlocked(world, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / 7));
  for (let i = 1; i < steps; i++) {
    const px = x1 + (dx * i) / steps;
    const py = y1 + (dy * i) / steps;
    if (pointInSolids(world, px, py)) return true;
  }
  return false;
}

function pointInSolids(world, x, y) {
  for (const s of world.walls) {
    if (x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) return true;
  }
  for (const s of world.cover) {
    if (x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) return true;
  }
  return false;
}

// Clamp a moving circle out of solids by trying x-only then y-only moves.
export function moveCircle(world, pos, dx, dy, radius) {
  if (!hitsSolid(world, pos.x + dx, pos.y, radius)) pos.x += dx;
  if (!hitsSolid(world, pos.x, pos.y + dy, radius)) pos.y += dy;
  pos.x = Math.max(24 + radius, Math.min(VIEW.width - 24 - radius, pos.x));
  pos.y = Math.max(24 + radius, Math.min(VIEW.height - 24 - radius, pos.y));
}

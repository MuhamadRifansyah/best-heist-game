// cameras.js — wall-mounted security cameras with sweeping cones.
// A camera sits on a wall and sweeps its cone back and forth. It never
// moves or chases, but being seen by one raises the alarm just like a guard.

import { CAMERA } from './config.js';
import { lineBlocked } from './world.js';

export function makeCameras() {
  return [
    // Top wall of gallery A, sweeping the entry hall and gallery A.
    { x: 300, y: 34, baseAngle: Math.PI / 2, phase: 0, angle: Math.PI / 2 },
    // Top wall of gallery B, sweeping the middle galleries.
    { x: 800, y: 34, baseAngle: Math.PI / 2, phase: 2.1, angle: Math.PI / 2 },
    // Vault wall, sweeping the vault approach.
    { x: 1000, y: 34, baseAngle: Math.PI / 2, phase: 4.2, angle: Math.PI / 2 },
  ];
}

export function updateCameras(cameras, timeSeconds) {
  for (const c of cameras) {
    c.angle = c.baseAngle + Math.sin(timeSeconds * CAMERA.sweepSpeed + c.phase) * CAMERA.sweepArc;
  }
}

// Does this camera see the thief right now?
export function cameraSees(camera, thief, world, sneaking) {
  const range = sneaking ? CAMERA.viewRange * 0.7 : CAMERA.viewRange;
  const dx = thief.x - camera.x;
  const dy = thief.y - camera.y;
  const dist = Math.hypot(dx, dy);
  if (dist > range) return false;
  const toThief = Math.atan2(dy, dx);
  let diff = toThief - camera.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  if (Math.abs(diff) > CAMERA.viewHalfAngle) return false;
  if (lineBlocked(world, camera.x, camera.y, thief.x, thief.y)) return false;
  return true;
}

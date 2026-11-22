// guards.js — patrol guards with vision cones.
// A guard walks a waypoint loop, pauses at each point, and watches a cone
// ahead of it. When it sees the thief it chases; when a coin lands nearby
// it walks over to investigate. All vision checks respect walls and cover.

import { GUARD, COIN } from './config.js';
import { lineBlocked, moveCircle } from './world.js';

export function makeGuards() {
  return [
    {
      name: 'Mara',
      x: 180, y: 240, angle: 0, state: 'patrol', waypointIndex: 0,
      waypoints: [
        { x: 180, y: 240 }, { x: 180, y: 620 }, { x: 290, y: 620 }, { x: 290, y: 240 },
      ],
      waitLeft: 0, loseLeft: 0, investigateLeft: 0, target: null,
    },
    {
      name: 'Dario',
      x: 480, y: 180, angle: Math.PI / 2, state: 'patrol', waypointIndex: 0,
      waypoints: [
        { x: 480, y: 180 }, { x: 600, y: 180 }, { x: 600, y: 620 }, { x: 480, y: 620 },
      ],
      waitLeft: 0, loseLeft: 0, investigateLeft: 0, target: null,
    },
    {
      name: 'Sable',
      x: 780, y: 300, angle: -Math.PI / 2, state: 'patrol', waypointIndex: 0,
      waypoints: [
        { x: 780, y: 300 }, { x: 900, y: 300 }, { x: 900, y: 620 }, { x: 780, y: 620 },
      ],
      waitLeft: 0, loseLeft: 0, investigateLeft: 0, target: null,
    },
  ];
}

// Does this guard see the thief right now?
export function guardSees(guard, thief, world, sneaking) {
  const range = sneaking ? GUARD.sneakViewRange : GUARD.viewRange;
  const dx = thief.x - guard.x;
  const dy = thief.y - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist > range) return false;
  const toThief = Math.atan2(dy, dx);
  let diff = toThief - guard.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  if (Math.abs(diff) > GUARD.viewHalfAngle) return false;
  if (lineBlocked(world, guard.x, guard.y, thief.x, thief.y)) return false;
  return true;
}

// A thrown coin distracts guards near its landing spot.
export function distractGuards(guards, coinX, coinY) {
  for (const g of guards) {
    if (g.state === 'chase') continue;
    if (Math.hypot(g.x - coinX, g.y - coinY) <= COIN.noiseRadius) {
      g.state = 'investigate';
      g.target = { x: coinX, y: coinY };
      g.investigateLeft = COIN.investigateSeconds;
    }
  }
}

function angleToward(fromX, fromY, toX, toY) {
  return Math.atan2(toY - fromY, toX - fromX);
}

function stepToward(guard, world, tx, ty, speed, dt) {
  const dx = tx - guard.x;
  const dy = ty - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 2) return true;
  const vx = (dx / dist) * speed * dt;
  const vy = (dy / dist) * speed * dt;
  guard.angle = angleToward(guard.x, guard.y, tx, ty);
  moveCircle(world, guard, vx, vy, GUARD.radius);
  return Math.hypot(tx - guard.x, ty - guard.y) < 6;
}

export function updateGuards(guards, thief, world, dt, sneaking) {
  for (const g of guards) {
    const sees = guardSees(g, thief, world, sneaking);
    if (sees && g.state !== 'chase') {
      g.state = 'chase';
      g.loseLeft = GUARD.loseSightSeconds;
    }
    if (g.state === 'chase') {
      if (sees) {
        g.loseLeft = GUARD.loseSightSeconds;
      } else {
        g.loseLeft -= dt;
        if (g.loseLeft <= 0) {
          g.state = 'patrol';
          g.target = null;
        }
      }
      stepToward(g, world, thief.x, thief.y, GUARD.chaseSpeed, dt);
      continue;
    }
    if (g.state === 'investigate' && g.target) {
      g.investigateLeft -= dt;
      const arrived = stepToward(g, world, g.target.x, g.target.y, GUARD.investigateSpeed, dt);
      if (arrived || g.investigateLeft <= 0) {
        g.state = 'patrol';
        g.target = null;
        g.waitLeft = 1.2;
      }
      continue;
    }
    // Patrol: walk to the next waypoint, pause, move on.
    if (g.waitLeft > 0) {
      g.waitLeft -= dt;
      continue;
    }
    const wp = g.waypoints[g.waypointIndex];
    const arrived = stepToward(g, world, wp.x, wp.y, GUARD.patrolSpeed, dt);
    if (arrived) {
      g.waypointIndex = (g.waypointIndex + 1) % g.waypoints.length;
      g.waitLeft = GUARD.waitAtWaypoint;
    }
  }
}

// A guard close enough to grab the thief ends the run.
export function guardCaught(guards, thief) {
  for (const g of guards) {
    if (Math.hypot(g.x - thief.x, g.y - thief.y) < GUARD.catchDistance) return g;
  }
  return null;
}

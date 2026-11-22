// config.js — tuning constants for The Velvet Vault.
// One place for every number the rest of the game reads, so balance
// changes never need hunting through the other modules.

export const VIEW = { width: 1280, height: 720 };

export const THIEF = {
  radius: 13,
  walkSpeed: 205, // px per second
  sneakSpeed: 105,
  grabSeconds: 3, // seconds holding E at the loot to steal it
  maxCoins: 5,
};

export const ALARM = {
  risePerSecond: 46, // while any eye sees the thief
  riseCloseBonus: 34, // extra when the thief is close to the watcher
  fallPerSecond: 16, // while nobody sees the thief
  warnAt: 55, // HUD turns red above this
};

export const GUARD = {
  radius: 14,
  patrolSpeed: 78,
  chaseSpeed: 150,
  investigateSpeed: 105,
  viewRange: 235,
  viewHalfAngle: 0.62, // radians, about 35 degrees each side
  sneakViewRange: 165, // sneaking shrinks how far a guard can spot you
  waitAtWaypoint: 1.6, // seconds paused at each patrol point
  catchDistance: 26, // guard touches the thief: busted
  loseSightSeconds: 1.2, // after losing sight, give up the chase
};

export const CAMERA = {
  viewRange: 250,
  viewHalfAngle: 0.5,
  sweepSpeed: 0.55, // radians per second of the sweeping cone
  sweepArc: 1.15, // radians either side of the camera's facing
};

export const COIN = {
  throwSpeed: 520,
  noiseRadius: 130, // guards inside this ring walk to the landing spot
  investigateSeconds: 4,
};

export const COLORS = {
  floor: '#1c1712',
  floorTile: '#241d16',
  wall: '#3a2f26',
  wallTop: '#57463a',
  cover: '#2e4034', // display cases and pillars: safe cover
  coverEdge: '#4d6b52',
  carpet: '#4a1f2b',
  gold: '#f2c14e',
  gem: '#7fe7ff',
  danger: 'rgba(255, 64, 64, 0.28)',
  dangerEdge: 'rgba(255, 90, 90, 0.85)',
  cameraCone: 'rgba(255, 170, 60, 0.20)',
  cameraEdge: 'rgba(255, 190, 90, 0.8)',
  thief: '#e8e4d8',
  thiefSneak: '#9fb7d8',
  guard: '#c94f4f',
  hud: '#f5efe0',
};

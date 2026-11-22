// input.js — keyboard and mouse, read by the game loop.
// WASD / arrows move, Shift sneaks, E grabs loot, R restarts, M mutes,
// P or Escape pauses. A mouse click throws a coin at that spot (or taps
// a button on the title / end screens).

export function makeInput(canvas) {
  const keys = new Set();
  const state = {
    keys,
    mouse: { x: 0, y: 0, clicked: false, clickX: 0, clickY: 0 },
    // Edge-triggered actions, consumed once by the loop.
    pressed: new Set(),
  };

  window.addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
    if (!event.repeat) state.pressed.add(event.code);
    keys.add(event.code);
  });
  window.addEventListener('keyup', (event) => keys.delete(event.code));
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    state.mouse.x = ((event.clientX - rect.left) / rect.width) * 1280;
    state.mouse.y = ((event.clientY - rect.top) / rect.height) * 720;
  });
  canvas.addEventListener('mousedown', (event) => {
    const rect = canvas.getBoundingClientRect();
    state.mouse.clicked = true;
    state.mouse.clickX = ((event.clientX - rect.left) / rect.width) * 1280;
    state.mouse.clickY = ((event.clientY - rect.top) / rect.height) * 720;
  });

  return state;
}

export function moveDirection(input) {
  let x = 0;
  let y = 0;
  const k = input.keys;
  if (k.has('KeyA') || k.has('ArrowLeft')) x -= 1;
  if (k.has('KeyD') || k.has('ArrowRight')) x += 1;
  if (k.has('KeyW') || k.has('ArrowUp')) y -= 1;
  if (k.has('KeyS') || k.has('ArrowDown')) y += 1;
  if (x !== 0 && y !== 0) {
    x *= Math.SQRT1_2;
    y *= Math.SQRT1_2;
  }
  return { x, y };
}

export function isSneaking(input) {
  return input.keys.has('ShiftLeft') || input.keys.has('ShiftRight');
}

export function consumePress(input, code) {
  if (input.pressed.has(code)) {
    input.pressed.delete(code);
    return true;
  }
  return false;
}

export function consumeClick(input) {
  if (input.mouse.clicked) {
    input.mouse.clicked = false;
    return { x: input.mouse.clickX, y: input.mouse.clickY };
  }
  return null;
}

// Called at the end of each frame so one press never fires twice.
export function endFrame(input) {
  input.pressed.clear();
  input.mouse.clicked = false;
}

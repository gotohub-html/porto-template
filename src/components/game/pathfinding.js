// Grid pathfinding + line-of-sight for the entity AI.
// Salvaged from the old BackroomsWorkspace, parameterized so maze.js owns the constants.

import { COLS, ROWS, CELL } from "./maze";

// A* on a 4-connected grid. grid[row][col] === 1 means wall/blocked.
// Returns an array of [col,row] cells from start to target, or null if unreachable.
export const findPath = (startCol, startRow, targetCol, targetRow, grid) => {
  const openSet = [];
  const closedSet = new Set();

  const h = (c, r) => Math.abs(c - targetCol) + Math.abs(r - targetRow);
  const startKey = `${startCol},${startRow}`;
  const nodes = {};
  nodes[startKey] = {
    col: startCol,
    row: startRow,
    g: 0,
    h: h(startCol, startRow),
    f: h(startCol, startRow),
    parent: null,
  };
  openSet.push(nodes[startKey]);

  while (openSet.length > 0) {
    openSet.sort((a, b) => a.f - b.f);
    const current = openSet.shift();
    const currentKey = `${current.col},${current.row}`;

    if (current.col === targetCol && current.row === targetRow) {
      const path = [];
      let curr = current;
      while (curr !== null) {
        path.push([curr.col, curr.row]);
        curr = curr.parent;
      }
      path.reverse();
      return path;
    }

    closedSet.add(currentKey);

    const dirs = [
      [0, -1],
      [0, 1],
      [-1, 0],
      [1, 0],
    ];
    for (const [dc, dr] of dirs) {
      const nc = current.col + dc;
      const nr = current.row + dr;
      if (nc < 0 || nr < 0 || nc >= COLS || nr >= ROWS || grid[nr][nc] === 1) {
        continue;
      }
      const nKey = `${nc},${nr}`;
      if (closedSet.has(nKey)) continue;

      const tentG = current.g + 1;
      let neighbor = nodes[nKey];
      if (!neighbor) {
        neighbor = {
          col: nc,
          row: nr,
          g: Infinity,
          h: h(nc, nr),
          f: Infinity,
          parent: null,
        };
        nodes[nKey] = neighbor;
      }
      if (tentG < neighbor.g) {
        neighbor.g = tentG;
        neighbor.f = neighbor.g + neighbor.h;
        neighbor.parent = current;
        if (!openSet.includes(neighbor)) openSet.push(neighbor);
      }
    }
  }
  return null;
};

// Raycast: is there a clear straight line of floor between two world points?
export const hasLineOfSight = (x1, z1, x2, z2, grid) => {
  const dx = x2 - x1;
  const dz = z2 - z1;
  const dist = Math.hypot(dx, dz);
  if (dist < 0.1) return true;
  const steps = Math.ceil(dist / 0.5);
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const px = x1 + dx * t;
    const pz = z1 + dz * t;
    const col = Math.floor(px / CELL);
    const row = Math.floor(pz / CELL);
    if (row < 0 || col < 0 || row >= ROWS || col >= COLS || grid[row][col] === 1) {
      return false;
    }
  }
  return true;
};

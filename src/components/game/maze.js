// Hand-designed fixed maze for BACK2ROOM.
//
// Authored as a grid of equal-length rows. Legend:
//   #  wall            .  floor
//   S  player spawn    X  exit door (locked until all 4 packets uploaded)
//   1  ABOUT packet    2  SKILLS packet
//   3  PROJECTS packet 4  CONTACT packet
//   T  upload terminal B  battery pickup
//   E  entity spawn
//
// Packets sit in far corners; terminals are placed so the carry-to-upload walk is
// genuinely exposed; batteries reward detours. Reachability is asserted by
// scripts/validate-maze.mjs (run in CI-style before trusting edits).

export const MAP = [
  "#####################",
  "#S....#....B...#...3#",
  "#.###.#.###.##.#.##.#",
  "#.#1#.#...#..T.#..#.#",
  "#.#.#.###.#####.#.#.#",
  "#.#.....#.....#.#.#.#",
  "#.#####.#.###.#.#.#.#",
  "#.....#.#.#.#...#.#.#",
  "#.###.#.#.#.#####.#.#",
  "#.#.#.#.#.#......B#.#",
  "#.#.#.#.#.#######.#.#",
  "#.#.#.T.#......#..#.#",
  "#.#.#.###.####.#.##.#",
  "#.#.#...#.2..#.#.#..#",
  "#.#.###.####.#.#.#.##",
  "#.#...#....#.#.#.#..#",
  "#.###.####.#.#.#.##.#",
  "#4..B.#..T...#...#..#",
  "#.#####.#######.###.#",
  "#......E........#..X#",
  "#####################",
];

// Two-marker cells (a packet/terminal/etc. that also marks the entity spawn) are
// not needed — every marker maps to exactly one object below.

export const CELL = 4; // world units per grid cell
export const COLS = MAP[0].length;
export const ROWS = MAP.length;
export const WALL_H = 3.2;
export const EYE = 1.65;

// Packet metadata (the four portfolio sections that get "uploaded").
export const PACKET_META = {
  1: {
    id: "about",
    label: "ABOUT",
    docTitle: "PERSONNEL_FILE // SUBJECT: DANI",
    lines: [
      "Self-taught web developer & UI/UX",
      "designer operating out of Purwakarta,",
      "Indonesia. Builds immersive, editorial",
      "web experiences — visual design fused",
      "with clean, performant engineering.",
    ],
  },
  2: {
    id: "skills",
    label: "SKILLS",
    docTitle: "CAPABILITY_MANIFEST // STACK",
    lines: [
      "React 19 · frontend architecture",
      "GSAP · scroll storytelling",
      "Three.js / WebGL · shaders",
      "Web Audio · procedural sound",
      "Tailwind · TypeScript · Vite",
    ],
  },
  3: {
    id: "projects",
    label: "PROJECTS",
    docTitle: "ARCHIVE_INDEX // SHIPPED WORK",
    lines: [
      "Full-stack apps with real-time",
      "dashboards, AI-integrated tooling,",
      "and multi-language support.",
      "React frontends, Express/SQLite",
      "backends that actually ship.",
    ],
  },
  4: {
    id: "contact",
    label: "CONTACT",
    docTitle: "SIGNAL_BROADCAST // REACH OUT",
    lines: [
      "github.com/danixbo",
      "Open to freelance & collaboration.",
      "Drop a signal — let's build",
      "something that shouldn't exist yet.",
    ],
  },
};

// Parse MAP into a numeric collision grid (1 = wall, 0 = floor) plus typed object
// records carrying their grid cell and world-space center.
export const parseMaze = () => {
  const grid = Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
  const packets = [];
  const terminals = [];
  const batteries = [];
  let spawn = null;
  let entitySpawn = null;
  let exit = null;

  const center = (col, row) => ({
    x: col * CELL + CELL / 2,
    z: row * CELL + CELL / 2,
  });

  for (let row = 0; row < ROWS; row++) {
    if (MAP[row].length !== COLS) {
      throw new Error(
        `maze row ${row} has length ${MAP[row].length}, expected ${COLS}`
      );
    }
    for (let col = 0; col < COLS; col++) {
      const ch = MAP[row][col];
      if (ch === "#") {
        grid[row][col] = 1;
        continue;
      }
      // everything below is floor
      const c = center(col, row);
      if (ch === "S") spawn = { col, row, ...c };
      else if (ch === "E") entitySpawn = { col, row, ...c };
      else if (ch === "X") exit = { col, row, ...c };
      else if (ch === "T") terminals.push({ col, row, ...c });
      else if (ch === "B") batteries.push({ id: `bat-${col}-${row}`, col, row, ...c });
      else if (ch >= "1" && ch <= "4") {
        const meta = PACKET_META[ch];
        packets.push({ key: ch, ...meta, col, row, ...c, collected: false, uploaded: false });
      }
    }
  }

  if (!spawn) throw new Error("maze has no spawn (S)");
  if (!exit) throw new Error("maze has no exit (X)");
  if (packets.length !== 4) throw new Error(`expected 4 packets, found ${packets.length}`);

  return { grid, packets, terminals, batteries, spawn, entitySpawn, exit };
};

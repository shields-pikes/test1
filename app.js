const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const COLORS = {
  I: "#39c5ff",
  J: "#516cff",
  L: "#ffa94d",
  O: "#ffe066",
  S: "#62e36f",
  T: "#cf72ff",
  Z: "#ff6b6b",
};

const SHAPES = {
  I: [[1, 1, 1, 1]],
  J: [
    [1, 0, 0],
    [1, 1, 1],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
  ],
  O: [
    [1, 1],
    [1, 1],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
  ],
};

const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");
ctx.scale(BLOCK, BLOCK);

const scoreEl = document.getElementById("score");
const levelEl = document.getElementById("level");
const linesEl = document.getElementById("lines");
const startButton = document.getElementById("start-button");

let board = createBoard();
let current = null;
let dropCounter = 0;
let dropInterval = 700;
let lastTime = 0;
let score = 0;
let lines = 0;
let level = 1;
let running = false;

function createBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

function randomPiece() {
  const keys = Object.keys(SHAPES);
  const type = keys[Math.floor(Math.random() * keys.length)];
  return {
    type,
    shape: SHAPES[type].map((row) => [...row]),
    x: Math.floor(COLS / 2) - 2,
    y: 0,
  };
}

function collide(piece) {
  return piece.shape.some((row, y) =>
    row.some((value, x) => {
      if (!value) return false;
      const newY = piece.y + y;
      const newX = piece.x + x;
      return (
        newX < 0 ||
        newX >= COLS ||
        newY >= ROWS ||
        (newY >= 0 && board[newY][newX])
      );
    })
  );
}

function merge(piece) {
  piece.shape.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) {
        const targetY = piece.y + y;
        if (targetY >= 0) {
          board[targetY][piece.x + x] = piece.type;
        }
      }
    });
  });
}

function rotate(matrix, direction = 1) {
  const transposed = matrix[0].map((_, i) => matrix.map((row) => row[i]));
  if (direction === 1) {
    return transposed.map((row) => row.reverse());
  }
  return transposed.reverse();
}

function rotateCurrent(direction = 1) {
  if (!current) return;
  const rotated = rotate(current.shape, direction);
  const oldX = current.x;
  current.shape = rotated;
  let offset = 1;
  while (collide(current)) {
    current.x += offset;
    offset = -(offset + (offset > 0 ? 1 : -1));
    if (Math.abs(offset) > current.shape[0].length) {
      current.shape = rotate(current.shape, -direction);
      current.x = oldX;
      return;
    }
  }
}

function clearLines() {
  let cleared = 0;
  outer: for (let y = ROWS - 1; y >= 0; y--) {
    for (let x = 0; x < COLS; x++) {
      if (!board[y][x]) continue outer;
    }
    const row = board.splice(y, 1)[0].fill(0);
    board.unshift(row);
    cleared++;
    y++;
  }

  if (cleared > 0) {
    const points = [0, 100, 300, 500, 800];
    score += points[cleared] * level;
    lines += cleared;
    level = Math.floor(lines / 10) + 1;
    dropInterval = Math.max(120, 700 - (level - 1) * 60);
    updatePanel();
  }
}

function spawn() {
  current = randomPiece();
  if (collide(current)) {
    running = false;
    draw();
    drawGameOver();
  }
}

function move(dx) {
  if (!running || !current) return;
  current.x += dx;
  if (collide(current)) current.x -= dx;
}

function drop() {
  if (!running || !current) return;
  current.y += 1;
  if (collide(current)) {
    current.y -= 1;
    merge(current);
    clearLines();
    spawn();
  }
  dropCounter = 0;
}

function hardDrop() {
  if (!running || !current) return;
  while (!collide(current)) {
    current.y += 1;
  }
  current.y -= 1;
  merge(current);
  clearLines();
  spawn();
  dropCounter = 0;
}

function drawCell(x, y, color, alpha = 1) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(x, y, 1, 1);
  ctx.strokeStyle = "#101010";
  ctx.lineWidth = 0.06;
  ctx.strokeRect(x, y, 1, 1);
  ctx.globalAlpha = 1;
}

function drawBoard() {
  ctx.fillStyle = "#050505";
  ctx.fillRect(0, 0, COLS, ROWS);

  board.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) {
        drawCell(x, y, COLORS[value]);
      }
    });
  });
}

function drawGhost() {
  if (!current) return;
  const ghost = {
    ...current,
    shape: current.shape,
    x: current.x,
    y: current.y,
  };
  while (!collide(ghost)) {
    ghost.y += 1;
  }
  ghost.y -= 1;

  ghost.shape.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) {
        drawCell(ghost.x + x, ghost.y + y, COLORS[ghost.type], 0.2);
      }
    });
  });
}

function drawPiece(piece) {
  piece.shape.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) {
        drawCell(piece.x + x, piece.y + y, COLORS[piece.type]);
      }
    });
  });
}

function drawGameOver() {
  ctx.fillStyle = "rgba(0,0,0,0.7)";
  ctx.fillRect(0, 7, COLS, 6);
  ctx.fillStyle = "#fff";
  ctx.font = "1px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("GAME OVER", COLS / 2, 9.2);
  ctx.fillText("再スタートで続行", COLS / 2, 10.7);
}

function draw() {
  drawBoard();
  if (current) {
    drawGhost();
    drawPiece(current);
  }
}

function updatePanel() {
  scoreEl.textContent = String(score);
  levelEl.textContent = String(level);
  linesEl.textContent = String(lines);
}

function resetGame() {
  board = createBoard();
  score = 0;
  lines = 0;
  level = 1;
  dropInterval = 700;
  dropCounter = 0;
  lastTime = 0;
  running = true;
  updatePanel();
  spawn();
  requestAnimationFrame(update);
}

function update(time = 0) {
  if (!running) return;
  const delta = time - lastTime;
  lastTime = time;
  dropCounter += delta;

  if (dropCounter > dropInterval) {
    drop();
  }

  draw();
  requestAnimationFrame(update);
}

document.addEventListener("keydown", (event) => {
  if (!running) return;

  switch (event.key) {
    case "ArrowLeft":
      move(-1);
      break;
    case "ArrowRight":
      move(1);
      break;
    case "ArrowDown":
      drop();
      break;
    case "ArrowUp":
    case "x":
    case "X":
      rotateCurrent(1);
      break;
    case "z":
    case "Z":
      rotateCurrent(-1);
      break;
    case " ":
      hardDrop();
      break;
    default:
      return;
  }

  event.preventDefault();
  draw();
});

startButton.addEventListener("click", resetGame);

updatePanel();
draw();

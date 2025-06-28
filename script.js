// Char Par - Nine Men's Morris Logic (With Smart AI)
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const statusP = document.getElementById("status");
const restartBtn = document.getElementById("restartBtn");
const startBtn = document.getElementById("startBtn");
const homePage = document.getElementById("homePage");
const gamePage = document.getElementById("gamePage");
const gameModeSelect = document.getElementById("gameMode");
const playerColorSelect = document.getElementById("player1Color"); // First Player
const player2ColorContainer = document.getElementById("player2ColorContainer");
const player2ColorSelect = document.getElementById("player2Color"); // Second Player

let blackReserve = document.getElementById("blackReserve");
let whiteReserve = document.getElementById("whiteReserve");
let blackCaptured = document.getElementById("blackCaptured");
let whiteCaptured = document.getElementById("whiteCaptured");

const maxTokens = 9;
const radius = 15;

const layout = [
  [50, 50], [300, 50], [550, 50],
  [100, 100], [300, 100], [500, 100],
  [150, 150], [300, 150], [450, 150],
  [50, 300], [100, 300], [150, 300], [450, 300], [500, 300], [550, 300],
  [150, 450], [300, 450], [450, 450],
  [100, 500], [300, 500], [500, 500],
  [50, 550], [300, 550], [550, 550]
];

const mills = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [15, 16, 17], [18, 19, 20], [21, 22, 23],
  [0, 9, 21], [3, 10, 18], [6, 11, 15],
  [2, 14, 23], [5, 13, 20], [8, 12, 17],
  [1, 4, 7], [16, 19, 22], [9, 10, 11], [12, 13, 14]
];

const adjacency = {
  0:[1,9],1:[0,2,4],2:[1,14],3:[4,10],4:[1,3,5,7],5:[4,13],
  6:[7,11],7:[4,6,8],8:[7,12],9:[0,10,21],10:[3,9,11,18],11:[6,10,15],
  12:[8,13,17],13:[5,12,14,20],14:[2,13,23],15:[11,16],16:[15,17,19],
  17:[12,16],18:[10,19],19:[16,18,20,22],20:[13,19],21:[9,22],
  22:[19,21,23],23:[14,22]
};

let currentPlayer = "black";
let phase = "placement";
let board = Array(24).fill(null);
let selectedIndex = null;
let placedTokens = { black: 0, white: 0 };
let capturedTokens = { black: 0, white: 0 };
let muted = false;
let highlighted = [];
let gameMode = "2p";
let aiColor = "white";
let history = [];


function playSound(id) {
  if (!muted) {
    const el = document.getElementById(id);
    if (el) el.cloneNode(true).play();
  }
}

function drawBoard() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 3;

  [0, 50, 100].forEach(offset => {
    ctx.strokeRect(50 + offset, 50 + offset, 500 - 2 * offset, 500 - 2 * offset);
  });

  ctx.strokeStyle = "#ccc";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(300, 50); ctx.lineTo(300, 550); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(50, 300); ctx.lineTo(550, 300); ctx.stroke();

  layout.forEach(([x, y], index) => {
  // Base green filled circle with bold white border
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = "#0a4424"; // dark green fill
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#ffffff"; // bold white border
  ctx.stroke();

  if (board[index]) {
    ctx.fillStyle = board[index]; // black or white token
    ctx.beginPath();
    ctx.arc(x, y, radius - 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Outline for white token to make it visible
    if (board[index] === "white") {
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  // Red highlight ring (for capturing phase)
  if (highlighted.includes(index)) {
    ctx.beginPath();
    ctx.arc(x, y, radius + 4, 0, Math.PI * 2);
    ctx.strokeStyle = "red";
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  // Yellow ring for selected token
if (selectedIndex === index) {
  ctx.beginPath();
  ctx.arc(x, y, radius + 6, 0, Math.PI * 2);
  ctx.strokeStyle = "yellow";
  ctx.lineWidth = 4;
  ctx.stroke();
}
});
}

function updateReserves() {
  blackReserve.innerHTML = "";
  whiteReserve.innerHTML = "";

  for (let i = 0; i < maxTokens - placedTokens.black; i++) {
    const d = document.createElement("div");
    d.className = "black";
    blackReserve.appendChild(d);
  }
  for (let i = 0; i < maxTokens - placedTokens.white; i++) {
    const d = document.createElement("div");
    d.className = "white";
    whiteReserve.appendChild(d);
  }
}

function updateCaptured() {
  blackCaptured.innerHTML = "";
  whiteCaptured.innerHTML = "";
  for (let i = 0; i < capturedTokens.white; i++) {
    const d = document.createElement("div");
    d.className = "white";
    blackCaptured.appendChild(d);
  }
  for (let i = 0; i < capturedTokens.black; i++) {
    const d = document.createElement("div");
    d.className = "black";
    whiteCaptured.appendChild(d);
  }
}

function switchPlayer() {
  currentPlayer = currentPlayer === "black" ? "white" : "black";
  statusP.textContent = `Turn: ${currentPlayer.charAt(0).toUpperCase() + currentPlayer.slice(1)}`;
}

function checkMill(pos, color) {
  return mills.some(m => m.includes(pos) && m.every(i => board[i] === color));
}
function isPartOfMill(pos, color) {
  return mills.some(m => m.includes(pos) && m.every(i => board[i] === color));
}
function getCapturableTokens(opponent) {
  const opponentTokens = board.map((val, idx) => val === opponent ? idx : -1).filter(i => i !== -1);
  const capturable = opponentTokens.filter(i => !isPartOfMill(i, opponent));
  return capturable.length > 0 ? capturable : opponentTokens;
}
function getClickedPosition(x, y) {
  return layout.findIndex(([lx, ly]) => Math.hypot(x - lx, y - ly) < radius);
}

function enterCapturePhase() {
  const opponent = currentPlayer === "black" ? "white" : "black";
  highlighted = getCapturableTokens(opponent);
  drawBoard();

  canvas.onclick = e => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const index = getClickedPosition(x, y);
    if (index === -1 || !highlighted.includes(index)) return playSound("sndInvalid");

    board[index] = null;
    capturedTokens[opponent]++;
    updateCaptured();
    playSound("sndRemove");

   const remainingTokens = placedTokens[opponent] - capturedTokens[opponent];

// Only end the game if:
// 1. Movement phase has started
// 2. Opponent had all tokens placed
// 3. Opponent now has < 3
if (
  phase === "movement" &&
  placedTokens[opponent] === maxTokens &&
  remainingTokens < 3
) {
  // Delay win display to let board update first
  drawBoard(); // show the removed piece now
  setTimeout(() => {
    statusP.textContent = `${currentPlayer.toUpperCase()} WINS!`;
    canvas.onclick = null;
    playSound("sndWin");
  }, 500); // Wait a bit before declaring win
  return;
}
    highlighted = [];
    switchPlayer();
    selectedIndex = null;
    canvas.onclick = handleClick;
    drawBoard();
    maybeAIMove();
  };
}

function handleClick(e) {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const index = getClickedPosition(x, y);
  if (index === -1) return;

  if (gameMode === "1p" && currentPlayer !== playerColorSelect.value) return;

  if (phase === "placement") {
  if (placedTokens[currentPlayer] >= maxTokens) {
    playSound("sndInvalid");
    return;
  }

  if (board[index]) return playSound("sndInvalid");

  saveHistory();
  board[index] = currentPlayer;
  placedTokens[currentPlayer]++;
  playSound("sndPlace");
  updateReserves();

  if (checkMill(index, currentPlayer)) {
    playSound("sndMill");
    enterCapturePhase();
    return;
  }

  if (placedTokens.black === maxTokens && placedTokens.white === maxTokens) {
    phase = "movement";
    selectedIndex = null;
    drawBoard();
    switchPlayer();
    if (gameMode === "1p") maybeAIMove();
    return;
  }

  switchPlayer();
  drawBoard();
  maybeAIMove();
  return;
}

  if (phase === "movement") {
    if (board[index] === currentPlayer) {
      selectedIndex = index;
      playSound("sndSelect");
      drawBoard();
    } else if (selectedIndex !== null && !board[index]) {
      const playerTokens = board.filter(p => p === currentPlayer).length;
      const isFlying = playerTokens <= 3;
      const legalMove = isFlying || adjacency[selectedIndex].includes(index);
      if (!legalMove) return playSound("sndInvalid");

      saveHistory(); 
      board[selectedIndex] = null;
      board[index] = currentPlayer;
      selectedIndex = null;
      playSound("sndMove");

      if (checkMill(index, currentPlayer)) {
        playSound("sndMill");
        enterCapturePhase();
        return;
      }

      switchPlayer();
      drawBoard();
      maybeAIMove();
    } else {
      playSound("sndInvalid");
    }
  }
}

// ✅ AI Logic
function aiPlaceToken() {
  const opponent = aiColor === "black" ? "white" : "black";
  for (let i = 0; i < board.length; i++) {
    if (!board[i]) {
      board[i] = aiColor;
      if (checkMill(i, aiColor)) { board[i] = null; return i; }
      board[i] = null;
    }
  }
  for (let i = 0; i < board.length; i++) {
    if (!board[i]) {
      board[i] = opponent;
      if (checkMill(i, opponent)) { board[i] = null; return i; }
      board[i] = null;
    }
  }
  const priorities = [0, 2, 6, 8, 14, 23, 21, 15, 17, 3, 5, 1, 4, 7, 19, 10, 13, 20];
  for (let i of priorities) if (!board[i]) return i;
  return board.findIndex(p => !p);
}

function aiSmartMove() {
  const positions = board.map((val, idx) => val === aiColor ? idx : -1).filter(i => i !== -1);
  const isFlying = positions.length <= 3;
  const opponent = aiColor === "black" ? "white" : "black";
  for (let from of positions) {
    const targets = isFlying ? board.map((_, idx) => idx) : adjacency[from];
    for (let to of targets) {
      if (!board[to]) {
        board[from] = null; board[to] = aiColor;
        if (checkMill(to, aiColor)) { board[to] = null; board[from] = aiColor; return { from, to }; }
        board[to] = null; board[from] = aiColor;
      }
    }
  }
  for (let from of positions) {
    const targets = isFlying ? board.map((_, idx) => idx) : adjacency[from];
    for (let to of targets) {
      if (!board[to]) {
        board[to] = opponent;
        if (checkMill(to, opponent)) return { from, to };
        board[to] = null;
      }
    }
  }
  for (let from of positions) {
    const targets = isFlying ? board.map((_, idx) => idx) : adjacency[from];
    const valid = targets.filter(i => !board[i]);
    if (valid.length) return { from, to: valid[0] };
  }
  return null;
}

function aiSmartCapture() {
  const opponent = aiColor === "black" ? "white" : "black";
  const capturable = getCapturableTokens(opponent);
  capturable.sort((a, b) => (adjacency[a]?.length || 0) - (adjacency[b]?.length || 0));
  return capturable[0];
}

function aiMove() {
  if (phase === "placement") {
    const index = aiPlaceToken();
    board[index] = aiColor;
    placedTokens[aiColor]++;
    playSound("sndPlace");
    updateReserves();

    if (checkMill(index, aiColor)) {
      playSound("sndMill");
      setTimeout(() => {
        const chosen = aiSmartCapture();
        board[chosen] = null;
        capturedTokens[playerColorSelect.value]++;
        updateCaptured();
        playSound("sndRemove");

        const opponent = playerColorSelect.value;
        const remaining = placedTokens[opponent] - capturedTokens[opponent];
        if (phase === "movement" && placedTokens[opponent] === maxTokens && remaining < 3) {
          setTimeout(() => {
            statusP.textContent = `${aiColor.toUpperCase()} WINS!`;
            playSound("sndWin");
          }, 300);
          return;
        }

        switchPlayer();
        drawBoard();
      }, 400);
      return;
    }

    if (placedTokens.black === maxTokens && placedTokens.white === maxTokens) {
  phase = "movement";
  selectedIndex = null;
    }

    switchPlayer();
    drawBoard();
  }

  else if (phase === "movement") {
    const move = aiSmartMove();
    if (!move) {
      statusP.textContent = `${playerColorSelect.value.toUpperCase()} WINS!`;
      playSound("sndWin");
      return;
    }

    const { from, to } = move;
    board[from] = null;
    board[to] = aiColor;
    playSound("sndMove");

    if (checkMill(to, aiColor)) {
  playSound("sndMill");

  setTimeout(() => {
    drawBoard(); // show AI's mill-forming move
  }, 100); // brief delay to allow movement to be visible

  setTimeout(() => {
    const chosen = aiSmartCapture();
    board[chosen] = null;
    capturedTokens[playerColorSelect.value]++;
    updateCaptured();
    playSound("sndRemove");

    drawBoard(); // show the removed token visually

    const opponent = playerColorSelect.value;
    const remaining = placedTokens[opponent] - capturedTokens[opponent];
    if (placedTokens[opponent] === maxTokens && remaining < 3) {
      setTimeout(() => {
        statusP.textContent = `${aiColor.toUpperCase()} WINS!`;
        playSound("sndWin");
      }, 400); // delay win so that removal animation is visible
      return;
    }

    switchPlayer();
    drawBoard();
  }, 600); // gives time to show move + removal before win check
  return;
}

    switchPlayer();
    drawBoard();
  }
}

function maybeAIMove() {
  if (gameMode === "1p" && currentPlayer === aiColor) {
    setTimeout(aiMove, 500);
  }
}

startBtn.onclick = () => {
  const colorError = document.getElementById("colorError");
  colorError.textContent = "";
  colorError.style.display = "none";

   gameMode = gameModeSelect.value;
  currentPlayer = playerColorSelect.value;

  // Validate 2 Player mode color conflict
  if (gameMode === "2p") {
    const p1Color = playerColorSelect.value;
    const p2Color = player2ColorSelect.value;

    if (p1Color === p2Color) {
     const colorError = document.getElementById("colorError");
    colorError.textContent = "Both players cannot have the same color. Please choose different colors.";
     colorError.style.display = "block";
     return;
    }
  }

  // Set AI color if in 1 Player mode
  if (gameMode === "1p") {
    aiColor = currentPlayer === "black" ? "white" : "black";
  } else {
    aiColor = null;
  }

  // Reset game state
  board = Array(24).fill(null);
  selectedIndex = null;
  placedTokens = { black: 0, white: 0 };
  capturedTokens = { black: 0, white: 0 };
  phase = "placement";
  highlighted = [];
  history = [];

  // Show game page
  homePage.style.display = "none";
  gamePage.style.display = "block";
  void gamePage.offsetWidth;
  gamePage.classList.add("show");

  // Setup layout
  const gameLayout = document.getElementById("gameLayout");
  const canvas = document.getElementById("gameCanvas");

  // Clone templates
  const blackPanel = document.getElementById("blackPanel").content.cloneNode(true);
  const whitePanel = document.getElementById("whitePanel").content.cloneNode(true);

  // Clear previous layout
  while (gameLayout.firstChild) {
    gameLayout.removeChild(gameLayout.firstChild);
  }

  // Append based on player color
  if (currentPlayer === "black") {
    gameLayout.appendChild(blackPanel);
    gameLayout.appendChild(canvas);
    gameLayout.appendChild(whitePanel);
  } else {
    gameLayout.appendChild(whitePanel);
    gameLayout.appendChild(canvas);
    gameLayout.appendChild(blackPanel);
  }

  // Re-link reserves and captured (because they are now re-created)
  blackReserve = document.getElementById("blackReserve");
  whiteReserve = document.getElementById("whiteReserve");
  blackCaptured = document.getElementById("blackCaptured");
  whiteCaptured = document.getElementById("whiteCaptured");

  // Update game status
  statusP.textContent = `Turn: ${currentPlayer.charAt(0).toUpperCase() + currentPlayer.slice(1)}`;
  updateReserves();
  updateCaptured();
  drawBoard();
  canvas.classList.add("loaded");

  // Sounds and possible AI move
  playSound("sndSlideBoard");
  setTimeout(() => playSound("sndSlidePiece"), 300);
  maybeAIMove();
};

function saveHistory() {
  history.push({
    board: [...board],
    currentPlayer,
    selectedIndex,
    placedTokens: { ...placedTokens },
    capturedTokens: { ...capturedTokens },
    phase,
    highlighted: [...highlighted],
  });
}

restartBtn.onclick = () => window.location.reload();

if (undoBtn) {
  undoBtn.onclick = () => {
    if (history.length === 0) return;

    const last = history.pop();
    board = [...last.board];
    currentPlayer = last.currentPlayer;
    selectedIndex = last.selectedIndex;
    placedTokens = { ...last.placedTokens };
    capturedTokens = { ...last.capturedTokens };
    phase = last.phase;
    highlighted = [...last.highlighted];

    updateReserves();
    updateCaptured();
    drawBoard();
    statusP.textContent = `Turn: ${currentPlayer.charAt(0).toUpperCase() + currentPlayer.slice(1)}`;
  };
}

canvas.onclick = handleClick;

// Show/hide second player color when game mode is changed
const player1ColorLabel = document.getElementById("player1ColorLabel");

gameModeSelect.addEventListener("change", () => {
  if (gameModeSelect.value === "2p") {
    player2ColorContainer.style.display = "block";
    player1ColorLabel.textContent = "Choose 1st Player Color:";
  } else {
    player2ColorContainer.style.display = "none";
    player1ColorLabel.textContent = "Choose Your Color:";
  }
});

// Apply the correct state when the page loads
gameModeSelect.dispatchEvent(new Event('change'));

function toggleRules() {
  const panel = document.getElementById("rulesPanel");
  panel.classList.toggle("hidden");
}

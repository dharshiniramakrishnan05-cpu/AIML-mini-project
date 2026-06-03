// Constants & State
const ROWS = 21;
const COLS = 51;
let START_NODE_ROW = 10;
let START_NODE_COL = 10;
let TARGET_NODE_ROW = 10;
let TARGET_NODE_COL = 40;

let grid = [];
let gridElements = []; // Cached DOM elements
let isDrawing = false;
let draggingNode = null; // 'start' or 'target'
let isVisualizing = false;
let isPaused = false;
let isStopped = false;

// Stats elements
let statNodes, statPath, statTime;
let gridContainer, algorithmSelect, visualizeBtn, clearBoardBtn, clearPathBtn, mazeBtn, speedSlider, modeSelect, gridWrapper;
let vizControls, pauseBtn, stopBtn;

let nodesVisitedCount = 0;
let startTime = 0;

// Audio Context for procedural sounds
let audioCtx = null;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playStartSound() {
    initAudio();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(220, audioCtx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.1);

    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 0.05);
    gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.3);

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.3);
}

function playSuccessSound() {
    initAudio();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.2);

    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 0.1);
    gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.5);

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.5);
}

let VISUALIZATION_SPEED = 20; // Default base delay

// Initialize Grid on Load
window.onload = () => {
    // Initialize DOM references
    statNodes = document.getElementById('stat-nodes');
    statPath = document.getElementById('stat-path');
    statTime = document.getElementById('stat-time');
    gridContainer = document.getElementById('grid');
    algorithmSelect = document.getElementById('algorithm-select');
    visualizeBtn = document.getElementById('visualize-btn');
    clearBoardBtn = document.getElementById('clear-board-btn');
    clearPathBtn = document.getElementById('clear-path-btn');
    mazeBtn = document.getElementById('maze-btn');
    speedSlider = document.getElementById('speed-slider');
    modeSelect = document.getElementById('mode-select');
    gridWrapper = document.querySelector('.grid-container');
    vizControls = document.getElementById('viz-controls');
    pauseBtn = document.getElementById('pause-btn');
    stopBtn = document.getElementById('stop-btn');

    initializeGrid();
    setupEventListeners();
    updateVisualizeButtonText();
};

function initializeGrid() {
    gridContainer.style.gridTemplateColumns = `repeat(${COLS}, var(--node-size))`;
    gridContainer.innerHTML = '';
    grid = [];
    gridElements = [];

    for (let row = 0; row < ROWS; row++) {
        const currentRow = [];
        const currentElementRow = [];
        for (let col = 0; col < COLS; col++) {
            const node = createNode(row, col);
            currentRow.push(node);
            const nodeElement = document.createElement('div');
            nodeElement.id = `node-${row}-${col}`;
            nodeElement.className = 'node';
            nodeElement.setAttribute('data-coords', `${row},${col}`);
            if (node.isStart) nodeElement.classList.add('node-start');
            if (node.isTarget) nodeElement.classList.add('node-target');

            // Mouse events
            nodeElement.addEventListener('mousedown', () => handleMouseDown(row, col));
            nodeElement.addEventListener('mouseenter', () => handleMouseEnter(row, col));
            nodeElement.addEventListener('mouseup', () => handleMouseUp());

            gridContainer.appendChild(nodeElement);
            currentElementRow.push(nodeElement);
        }
        grid.push(currentRow);
        gridElements.push(currentElementRow);
    }
}

function createNode(row, col) {
    return {
        row,
        col,
        isStart: row === START_NODE_ROW && col === START_NODE_COL,
        isTarget: row === TARGET_NODE_ROW && col === TARGET_NODE_COL,
        distance: Infinity,
        heuristic: Infinity,
        isVisited: false,
        isWall: false,
        previousNode: null,
    };
}

// Interaction Logic
function handleMouseDown(row, col) {
    if (isVisualizing) return;

    const node = grid[row][col];
    if (node.isStart) {
        draggingNode = 'start';
    } else if (node.isTarget) {
        draggingNode = 'target';
    } else {
        isDrawing = true;
        toggleWall(row, col);
    }
}

function handleMouseEnter(row, col) {
    if (isVisualizing) return;

    if (draggingNode === 'start') {
        moveNode('start', row, col);
    } else if (draggingNode === 'target') {
        moveNode('target', row, col);
    } else if (isDrawing) {
        toggleWall(row, col);
    }
}

function handleMouseUp() {
    isDrawing = false;
    draggingNode = null;
}

function toggleWall(row, col) {
    const node = grid[row][col];
    if (node.isStart || node.isTarget) return;

    const mode = modeSelect.value;
    const element = gridElements[row][col];

    if (mode === 'wall') {
        node.isWall = true;
        element.classList.add('node-wall');
    } else {
        node.isWall = false;
        element.classList.remove('node-wall');
    }
}

function moveNode(type, newRow, newCol) {
    const newNode = grid[newRow][newCol];
    if (newNode.isWall || (type === 'start' && newNode.isTarget) || (type === 'target' && newNode.isStart)) {
        triggerShake();
        return;
    }

    // Clear old node
    const oldRow = type === 'start' ? START_NODE_ROW : TARGET_NODE_ROW;
    const oldCol = type === 'start' ? START_NODE_COL : TARGET_NODE_COL;
    grid[oldRow][oldCol][type === 'start' ? 'isStart' : 'isTarget'] = false;
    gridElements[oldRow][oldCol].classList.remove(`node-${type}`);

    // Set new node
    if (type === 'start') {
        START_NODE_ROW = newRow;
        START_NODE_COL = newCol;
    } else {
        TARGET_NODE_ROW = newRow;
        TARGET_NODE_COL = newCol;
    }

    newNode[type === 'start' ? 'isStart' : 'isTarget'] = true;
    gridElements[newRow][newCol].classList.add(`node-${type}`);
}

// UI Controls
function setupEventListeners() {
    algorithmSelect.addEventListener('change', updateVisualizeButtonText);

    visualizeBtn.addEventListener('click', () => {
        if (isVisualizing) return;
        playStartSound();
        clearPath();
        const algorithm = algorithmSelect.value;
        visualizeAlgorithm(algorithm);
    });

    clearBoardBtn.addEventListener('click', () => {
        if (isVisualizing) {
            stopBtn.click();
        }
        initializeGrid();
    });

    clearPathBtn.addEventListener('click', () => {
        if (isVisualizing) {
            stopBtn.click();
        }
        clearPath();
    });

    mazeBtn.addEventListener('click', () => {
        if (isVisualizing) {
            stopBtn.click();
        }
        generateRandomMaze();
    });

    const speedValue = document.getElementById('speed-value');
    speedSlider.addEventListener('input', () => {
        VISUALIZATION_SPEED = 101 - speedSlider.value;
        if (speedValue) speedValue.textContent = speedSlider.value;
    });

    // Playback listeners
    pauseBtn.addEventListener('click', () => {
        isPaused = !isPaused;
        const span = pauseBtn.querySelector('span');
        if (isPaused) {
            span.textContent = 'Resume';
        } else {
            span.textContent = 'Pause';
        }
    });

    stopBtn.addEventListener('click', () => {
        isStopped = true;
        isVisualizing = false;
        isPaused = false;
        toggleVizUI(false);
        // Reset stats if stopped abruptly
        if (nodesVisitedCount > 0) {
            statNodes.classList.add('fade-out');
            setTimeout(() => statNodes.classList.remove('fade-out'), 500);
        }
    });
}

function toggleVizUI(active) {
    if (active) {
        visualizeBtn.style.display = 'none';
        vizControls.style.display = 'flex';
    } else {
        visualizeBtn.style.display = 'flex';
        vizControls.style.display = 'none';
        isPaused = false;
        const span = pauseBtn.querySelector('span');
        if (span) span.textContent = 'Pause';
    }
}

function updateVisualizeButtonText() {
    const selectedText = algorithmSelect.options[algorithmSelect.selectedIndex].text;
    const span = visualizeBtn.querySelector('span');
    let shortAlgo = selectedText.replace(' Search', '').replace(' Best-First', '');
    if (shortAlgo === 'Breadth-First') shortAlgo = 'BFS';
    if (shortAlgo === 'Depth-First') shortAlgo = 'DFS';
    if (span) {
        span.textContent = `Visualize ${shortAlgo}`;
    } else {
        visualizeBtn.textContent = `Visualize ${shortAlgo}`;
    }
}

function clearPath() {
    nodesVisitedCount = 0;
    statNodes.textContent = '0';
    statPath.textContent = '0';
    statTime.textContent = '0ms';

    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            const node = grid[row][col];
            node.isVisited = false;
            node.previousNode = null;
            node.distance = Infinity;
            node.heuristic = Infinity;

            const element = gridElements[row][col];
            element.classList.remove('node-visited', 'node-shortest-path');
        }
    }
}

function triggerShake() {
    gridWrapper.classList.add('shake');
    setTimeout(() => {
        gridWrapper.classList.remove('shake');
    }, 400);
}

// Visualization Engine
function visualizeAlgorithm(algorithm) {
    isVisualizing = true;
    isStopped = false;
    isPaused = false;
    toggleVizUI(true);

    const startNode = grid[START_NODE_ROW][START_NODE_COL];
    const targetNode = grid[TARGET_NODE_ROW][TARGET_NODE_COL];

    startTime = performance.now();
    let visitedNodesInOrder = [];

    switch (algorithm) {
        case 'bfs': visitedNodesInOrder = bfs(grid, startNode, targetNode); break;
        case 'dfs': visitedNodesInOrder = dfs(grid, startNode, targetNode); break;
        case 'astar': visitedNodesInOrder = astar(grid, startNode, targetNode); break;
        case 'greedy': visitedNodesInOrder = greedy(grid, startNode, targetNode); break;
    }

    const shortestPath = getNodesInShortestPathOrder(targetNode);
    animateAlgorithm(visitedNodesInOrder, shortestPath, algorithm);
}

function animateAlgorithm(visitedNodesInOrder, shortestPath, algorithm) {
    let i = 0;
    const animate = () => {
        if (isStopped) return;
        if (isPaused) { requestAnimationFrame(animate); return; }

        if (i >= visitedNodesInOrder.length) {
            animateShortestPath(shortestPath);
            return;
        }

        const nodesToProcess = Math.ceil(100 / VISUALIZATION_SPEED) * 2; // Increased batch size for smoother feel
        for (let j = 0; j < nodesToProcess && i < visitedNodesInOrder.length; j++) {
            const node = visitedNodesInOrder[i];
            if (!node.isStart && !node.isTarget) {
                const element = gridElements[node.row][node.col];
                element.classList.add('node-visited');
                nodesVisitedCount++;
                statNodes.textContent = nodesVisitedCount.toLocaleString();
                statTime.textContent = `${Math.round(performance.now() - startTime)}ms`;
            }
            i++;
        }

        if (i < visitedNodesInOrder.length) {
            setTimeout(() => requestAnimationFrame(animate), VISUALIZATION_SPEED / 2);
        } else {
            animateShortestPath(shortestPath);
        }
    };
    requestAnimationFrame(animate);
}

function animateShortestPath(shortestPath) {
    if (shortestPath.length === 1) {
        isVisualizing = false;
        toggleVizUI(false);
        return;
    }

    let i = 0;
    const animate = () => {
        if (isStopped) return;
        if (isPaused) { requestAnimationFrame(animate); return; }

        if (i >= shortestPath.length) {
            isVisualizing = false;
            toggleVizUI(false);
            playSuccessSound();
            return;
        }

        const node = shortestPath[i];
        if (!node.isStart && !node.isTarget) {
            gridElements[node.row][node.col].classList.add('node-shortest-path');
        }
        statPath.textContent = i + 1;
        statTime.textContent = `${Math.round(performance.now() - startTime)}ms`;

        i++;
        if (i < shortestPath.length) {
            setTimeout(() => requestAnimationFrame(animate), 30);
        } else {
            isVisualizing = false;
            toggleVizUI(false);
            playSuccessSound();
        }
    };
    requestAnimationFrame(animate);
}

// Algorithms Helpers
function getUnvisitedNeighbors(node, grid) {
    const neighbors = [];
    const { row, col } = node;
    if (row > 0) neighbors.push(grid[row - 1][col]);
    if (row < ROWS - 1) neighbors.push(grid[row + 1][col]);
    if (col > 0) neighbors.push(grid[row][col - 1]);
    if (col < COLS - 1) neighbors.push(grid[row][col + 1]);
    return neighbors.filter(neighbor => !neighbor.isVisited && !neighbor.isWall);
}

function getNodesInShortestPathOrder(targetNode) {
    const nodesInShortestPathOrder = [];
    let currentNode = targetNode;
    while (currentNode !== null) {
        nodesInShortestPathOrder.unshift(currentNode);
        currentNode = currentNode.previousNode;
    }
    return nodesInShortestPathOrder;
}

// BFS
function bfs(grid, startNode, targetNode) {
    const visitedNodesInOrder = [];
    const queue = [startNode];
    startNode.isVisited = true;
    while (queue.length) {
        const currentNode = queue.shift();
        visitedNodesInOrder.push(currentNode);
        if (currentNode === targetNode) return visitedNodesInOrder;
        const neighbors = getUnvisitedNeighbors(currentNode, grid);
        for (const neighbor of neighbors) {
            neighbor.isVisited = true;
            neighbor.previousNode = currentNode;
            queue.push(neighbor);
        }
    }
    return visitedNodesInOrder;
}

// DFS
function dfs(grid, startNode, targetNode) {
    const visitedNodesInOrder = [];
    const stack = [startNode];
    while (stack.length) {
        const currentNode = stack.pop();
        if (!currentNode.isVisited) {
            currentNode.isVisited = true;
            visitedNodesInOrder.push(currentNode);
            if (currentNode === targetNode) return visitedNodesInOrder;
            const neighbors = getUnvisitedNeighbors(currentNode, grid);
            for (let i = neighbors.length - 1; i >= 0; i--) {
                const neighbor = neighbors[i];
                if (!neighbor.isVisited) {
                    neighbor.previousNode = currentNode;
                    stack.push(neighbor);
                }
            }
        }
    }
    return visitedNodesInOrder;
}

// A*
function manhattanDistance(nodeA, nodeB) {
    return Math.abs(nodeA.row - nodeB.row) + Math.abs(nodeA.col - nodeB.col);
}

function astar(grid, startNode, targetNode) {
    const visitedNodesInOrder = [];
    startNode.distance = 0;
    startNode.heuristic = manhattanDistance(startNode, targetNode);
    const openSet = [startNode];
    while (openSet.length) {
        openSet.sort((a, b) => (a.distance + a.heuristic) - (b.distance + b.heuristic));
        const currentNode = openSet.shift();
        if (currentNode.isWall || currentNode.isVisited) continue;
        currentNode.isVisited = true;
        visitedNodesInOrder.push(currentNode);
        if (currentNode === targetNode) return visitedNodesInOrder;
        const neighbors = getUnvisitedNeighbors(currentNode, grid);
        for (const neighbor of neighbors) {
            const tentativeDistance = currentNode.distance + 1;
            if (tentativeDistance < neighbor.distance) {
                neighbor.previousNode = currentNode;
                neighbor.distance = tentativeDistance;
                neighbor.heuristic = manhattanDistance(neighbor, targetNode);
                if (!openSet.includes(neighbor)) openSet.push(neighbor);
            }
        }
    }
    return visitedNodesInOrder;
}

// Greedy
function greedy(grid, startNode, targetNode) {
    const visitedNodesInOrder = [];
    startNode.heuristic = manhattanDistance(startNode, targetNode);
    const openSet = [startNode];
    while (openSet.length) {
        openSet.sort((a, b) => a.heuristic - b.heuristic);
        const currentNode = openSet.shift();
        if (currentNode.isWall || currentNode.isVisited) continue;
        currentNode.isVisited = true;
        visitedNodesInOrder.push(currentNode);
        if (currentNode === targetNode) return visitedNodesInOrder;
        const neighbors = getUnvisitedNeighbors(currentNode, grid);
        for (const neighbor of neighbors) {
            if (!openSet.includes(neighbor) && !neighbor.isVisited) {
                neighbor.previousNode = currentNode;
                neighbor.heuristic = manhattanDistance(neighbor, targetNode);
                openSet.push(neighbor);
            }
        }
    }
    return visitedNodesInOrder;
}

// Maze
function generateRandomMaze() {
    clearBoardBtn.click();
    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            const node = grid[row][col];
            if (!node.isStart && !node.isTarget && Math.random() < 0.3) {
                toggleWall(row, col);
            }
        }
    }
}

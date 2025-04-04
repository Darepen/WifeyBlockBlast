document.addEventListener('DOMContentLoaded', () => {
    // --- Get DOM Elements ---
    const gridBoard = document.getElementById('grid-board');
    const scoreDisplay = document.getElementById('score');
    const highscoreDisplay = document.getElementById('highscore');
    const piecesContainer = document.getElementById('pieces');
    const gameOverDisplay = document.getElementById('game-over');
    const restartButton = document.getElementById('restart-button');
    const musicButton = document.getElementById('play-music-button');
    const refreshButton = document.getElementById('refresh-pieces-button'); // Get Refresh Button
    // Audio elements...
    const bgMusic = document.getElementById('bg-music');
    const sfxPlace = document.getElementById('sfx-place');
    const sfxClear = document.getElementById('sfx-clear');
    const sfxGameOver = document.getElementById('sfx-gameover');

    // --- Game Settings ---
    const GRID_WIDTH = 9; // Slightly wider grid? Example: 9x9
    const GRID_HEIGHT = 9;
    // Calculate CELL_SIZE based on available space (more robust)
    const gameContainer = document.getElementById('game-container');
    const baseCellSize = 40; // Target cell size
    // Rough calculation: Try to fit grid width within ~60% of container width
    let availableGridWidth = gameContainer.offsetWidth * 0.6;
    if (window.innerWidth < 768) {
        availableGridWidth = gameContainer.offsetWidth * 0.95; // Use more width on mobile
    }
    const calculatedCellSize = Math.floor(availableGridWidth / GRID_WIDTH);
    const CELL_SIZE = Math.min(baseCellSize, Math.max(25, calculatedCellSize)); // Clamp size between 25 and baseCellSize

    const PREVIEW_CELL_SIZE = Math.max(12, Math.floor(CELL_SIZE * 0.4)); // Smaller preview cells relative to main grid
    const NUM_PIECE_SLOTS = 3;
    const LINE_CLEAR_SCORE = GRID_WIDTH * 10; // Adjust score based on grid size
    const MULTI_LINE_BONUS_MULTIPLIER = 1.5;

    // --- Game State ---
    let gridState = [];
    let score = 0;
    let highScore = 0;
    let currentPieces = [];
    let selectedPieceIndex = -1;
    let isGameOver = false;

    // --- Piece Definitions (Keep as before, or add more!) ---
    const PIECE_DEFINITIONS = [
        { shape: [[0, 0]], color: 'pink' }, // 1x1
        { shape: [[0, 0], [1, 0]], color: 'purple' }, // 2x1 vert
        { shape: [[0, 0], [0, 1]], color: 'pink' }, // 1x2 horiz
        { shape: [[0, 0], [1, 0], [0, 1]], color: 'purple' }, // L 1
        { shape: [[0, 0], [1, 0], [1, 1]], color: 'pink' }, // L 2
        { shape: [[1, 0], [1, 1], [0, 1]], color: 'purple' }, // L 3
        { shape: [[0, 0], [0, 1], [1, 1]], color: 'pink' }, // L 4
        { shape: [[0, 0], [0, 1], [0, 2]], color: 'purple' }, // 1x3 horiz
        { shape: [[0, 0], [1, 0], [2, 0]], color: 'pink' }, // 3x1 vert
        { shape: [[0, 0], [0, 1], [1, 0], [1, 1]], color: 'purple' }, // 2x2 Square
        { shape: [[0, 0], [1, 0], [1, 1], [2, 1]], color: 'pink' }, // S
        { shape: [[0, 1], [1, 1], [1, 0], [2, 0]], color: 'purple' }, // Z
        { shape: [[0, 1], [1, 0], [1, 1], [1, 2]], color: 'purple'}, // T 1
        { shape: [[1, 0], [0, 1], [1, 1], [2, 1]], color: 'pink' }, // T 2 (inverted T)
        { shape: [[0, 0], [0, 1], [0, 2], [0, 3]], color: 'pink'}, // 1x4
        { shape: [[0, 0], [1, 0], [2, 0], [3, 0]], color: 'purple'}, // 4x1
        { shape: [[0,0],[1,0],[2,0],[0,1],[1,1],[2,1],[0,2],[1,2],[2,2]], color: 'pink'}, // 3x3 square! Rare?
    ];


    // --- Sound Utility --- (Keep as before)
    function playSound(soundElement) { /* ... */
        if (soundElement && soundElement.readyState >= 2) {
            soundElement.currentTime = 0;
            soundElement.play().catch(e => console.warn("Sound play failed:", e));
        }
    }
    // --- High Score Functions --- (Keep as before)
    function loadHighScore() { /* ... */
         const savedScore = localStorage.getItem('pastelPopHighScore');
        highScore = savedScore ? parseInt(savedScore, 10) : 0;
        highscoreDisplay.textContent = highScore;
    }
    function saveHighScore() { /* ... */
         if (score > highScore) {
            highScore = score;
            highscoreDisplay.textContent = highScore;
            localStorage.setItem('pastelPopHighScore', highScore.toString());
        }
    }

    // --- Initialization Functions ---
    function createGrid() { // Uses calculated CELL_SIZE
        gridBoard.innerHTML = '';
        gridBoard.style.gridTemplateColumns = `repeat(${GRID_WIDTH}, ${CELL_SIZE}px)`;
        gridBoard.style.gridTemplateRows = `repeat(${GRID_HEIGHT}, ${CELL_SIZE}px)`;
        const boardWidth = GRID_WIDTH * CELL_SIZE + (GRID_WIDTH > 0 ? 6 : 0) ; // account for slightly thicker border
        gridBoard.style.width = `${boardWidth}px`;
        gridState = Array(GRID_HEIGHT).fill(null).map(() => Array(GRID_WIDTH).fill(null));

        for (let r = 0; r < GRID_HEIGHT; r++) {
            for (let c = 0; c < GRID_WIDTH; c++) {
                const cell = document.createElement('div');
                cell.classList.add('cell');
                cell.dataset.row = r;
                cell.dataset.col = c;
                cell.style.width = `${CELL_SIZE}px`; // Set size explicitly
                cell.style.height = `${CELL_SIZE}px`; // Set size explicitly
                gridBoard.appendChild(cell);
            }
        }
        // Add event listeners (no changes needed here)
        gridBoard.addEventListener('mouseover', handleGridMouseOver);
        gridBoard.addEventListener('mouseout', handleGridMouseOut);
        gridBoard.addEventListener('click', handleGridClick);
    }

    function getRandomPiece() { /* Keep as before */
        const randomIndex = Math.floor(Math.random() * PIECE_DEFINITIONS.length);
        return JSON.parse(JSON.stringify(PIECE_DEFINITIONS[randomIndex]));
    }

    // Generates NUM_PIECE_SLOTS new pieces, replacing the entire current set
    function generateNewPieces(replaceExisting = true) {
        if (replaceExisting) {
             currentPieces = []; // Clear the existing array
             for (let i = 0; i < NUM_PIECE_SLOTS; i++) {
                 currentPieces.push(getRandomPiece());
                 currentPieces[i].id = Date.now() + Math.random() + i; // Unique ID
             }
        } else {
            // Original logic: only fill null slots (not used by refresh)
            for (let i = 0; i < NUM_PIECE_SLOTS; i++) {
                if (!currentPieces[i]) { // Check if slot is empty/null/undefined
                     currentPieces[i] = getRandomPiece();
                     currentPieces[i].id = Date.now() + Math.random() + i;
                }
            }
            // Ensure the array doesn't exceed the desired number of slots
             currentPieces = currentPieces.slice(0, NUM_PIECE_SLOTS);
        }
        renderPiecePreviews();
        // Game over must be checked *after* getting new pieces (done in refresh/placement logic)
    }


    // --- Rendering Functions ---
    function renderGrid() { /* Keep as before, relies on CSS for looks */
       /* ... identical to previous version ... */
       const cells = gridBoard.querySelectorAll('.cell');
        cells.forEach(cell => {
            const r = parseInt(cell.dataset.row);
            const c = parseInt(cell.dataset.col);
            // Reset classes, keep 'cell'
            cell.className = 'cell';
            // Re-apply size might be redundant if fixed, but safe
            cell.style.width = `${CELL_SIZE}px`;
            cell.style.height = `${CELL_SIZE}px`;
            if (gridState[r]?.[c]) { // Check row exists before accessing column
                cell.classList.add(`filled-${gridState[r][c]}`);
            }
        });
    }

    function renderPiecePreviews() { // Uses PREVIEW_CELL_SIZE
        piecesContainer.innerHTML = '';
        currentPieces.forEach((piece, index) => {
            const pieceContainer = document.createElement('div');
            pieceContainer.classList.add('piece-container');
            if (piece === null) { // Should not happen with refresh logic, but keep for safety
                pieceContainer.classList.add('occupied');
                pieceContainer.textContent = '✓';
                // CSS handles the occupied styling
            } else {
                pieceContainer.dataset.index = index;
                pieceContainer.addEventListener('click', handlePieceSelection);

                let maxR = 0, maxC = 0;
                piece.shape.forEach(([dr, dc]) => {
                    maxR = Math.max(maxR, dr);
                    maxC = Math.max(maxC, dc);
                });

                // Min size based on preview cell size
                 const minPreviewSize = PREVIEW_CELL_SIZE * 2.5;
                 pieceContainer.style.minWidth = `${minPreviewSize}px`;
                 pieceContainer.style.minHeight = `${minPreviewSize}px`;


                pieceContainer.style.gridTemplateRows = `repeat(${maxR + 1}, ${PREVIEW_CELL_SIZE}px)`;
                pieceContainer.style.gridTemplateColumns = `repeat(${maxC + 1}, ${PREVIEW_CELL_SIZE}px)`;

                const previewGrid = {};
                piece.shape.forEach(([dr, dc]) => {
                    if (!previewGrid[dr]) previewGrid[dr] = {};
                    previewGrid[dr][dc] = true;
                });

                for (let r = 0; r <= maxR; r++) {
                    for (let c = 0; c <= maxC; c++) {
                        const cell = document.createElement('div');
                        cell.classList.add('piece-cell');
                        cell.style.width = `${PREVIEW_CELL_SIZE}px`; // Explicit size
                        cell.style.height = `${PREVIEW_CELL_SIZE}px`; // Explicit size
                        if (previewGrid[r]?.[c]) { // Check row exists
                             cell.classList.add(`filled-${piece.color}`);
                        }
                        pieceContainer.appendChild(cell);
                    }
                }

                if (index === selectedPieceIndex) {
                    pieceContainer.classList.add('selected'); // CSS handles prominent selection
                }
            }
            piecesContainer.appendChild(pieceContainer);
        });
    }

    function updateScore(points) { /* Keep as before */
       /* ... */
        score += points;
        scoreDisplay.textContent = score;
        saveHighScore();
    }

    // --- Game Logic Functions ---
    function isValidPlacement(piece, startRow, startCol) { /* Keep as before */
       /* ... identical logic ... */
         if (!piece) return false;
        for (const [dr, dc] of piece.shape) {
            const r = startRow + dr;
            const c = startCol + dc;
            if (r < 0 || r >= GRID_HEIGHT || c < 0 || c >= GRID_WIDTH || gridState[r]?.[c] !== null) { // Added safer gridstate access
                return false;
            }
        }
        return true;
    }

    function placePiece(piece, startRow, startCol) { /* Keep as before */
       /* ... identical logic ... */
        if (!isValidPlacement(piece, startRow, startCol)) return false;
        let cellsFilled = 0;
        piece.shape.forEach(([dr, dc]) => {
            const r = startRow + dr;
            const c = startCol + dc;
             if (gridState[r] !== undefined) { // Ensure row exists
                 gridState[r][c] = piece.color;
                cellsFilled++;
             }
        });
        if (cellsFilled > 0) updateScore(cellsFilled); // Score only if blocks were actually placed
        playSound(sfxPlace);
        return cellsFilled > 0;
    }

     function clearLines() { /* Keep as before - with improved scoring & animation */
        let rowsToClear = [];
        let colsToClear = [];
        let clearedCells = new Set();

        for (let r = 0; r < GRID_HEIGHT; r++) {
            if (gridState[r]?.every(cell => cell !== null)) { // Safe check
                rowsToClear.push(r);
                for(let c=0; c<GRID_WIDTH; c++) clearedCells.add(`${r}-${c}`);
            }
        }
        for (let c = 0; c < GRID_WIDTH; c++) {
            let colFull = true;
            for (let r = 0; r < GRID_HEIGHT; r++) {
                if (gridState[r]?.[c] === null) { // Safe check
                    colFull = false;
                    break;
                }
            }
            if (colFull) {
                colsToClear.push(c);
                 for(let r=0; r<GRID_HEIGHT; r++) clearedCells.add(`${r}-${c}`);
            }
        }

        const totalLinesCleared = rowsToClear.length + colsToClear.length;

        if (totalLinesCleared > 0) {
            playSound(sfxClear);

            clearedCells.forEach(coord => {
                const [r, c] = coord.split('-').map(Number);
                const cellElement = gridBoard.querySelector(`.cell[data-row='${r}'][data-col='${c}']`);
                if (cellElement) {
                    cellElement.classList.add('clearing');
                     setTimeout(() => {
                         cellElement.classList.remove('clearing'); // Remove class after animation
                         // Important: Reset the actual state *after* starting animation
                         if (gridState[r] !== undefined) gridState[r][c] = null;
                     }, 400); // Match animation duration in CSS
                } else {
                    // Clear state immediately if element not found (shouldn't happen often)
                    if (gridState[r] !== undefined) gridState[r][c] = null;
                }
            });

            let lineScore = totalLinesCleared * LINE_CLEAR_SCORE;
            let bonusScore = (totalLinesCleared > 1) ? Math.pow(totalLinesCleared, 2) * LINE_CLEAR_SCORE * MULTI_LINE_BONUS_MULTIPLIER : 0;
            console.log(`Cleared ${totalLinesCleared} lines. Score: +${lineScore}, Bonus: +${bonusScore.toFixed(0)}`);
            updateScore(lineScore + Math.round(bonusScore));

            // Re-render grid *after* animation timeout completes to show cleared state properly
             setTimeout(() => {
                  renderGrid();
             }, 450); // Delay slightly longer than animation

        }
        return totalLinesCleared > 0; // Return whether lines were cleared
    }


     function checkGameOver() { /* Keep as before, play sound */
       /* ... identical logic ... */
        for (const piece of currentPieces) {
             if (piece === null) continue; // Should not happen if refresh replaces all
            // Check if this piece can be placed anywhere
            let canPlacePiece = false;
             for (let r = 0; r < GRID_HEIGHT; r++) {
                for (let c = 0; c < GRID_WIDTH; c++) {
                    if (isValidPlacement(piece, r, c)) {
                        canPlacePiece = true; // Found a spot for this piece
                        break; // Stop checking cells for this piece
                    }
                }
                 if (canPlacePiece) break; // Stop checking rows for this piece
            }
             if (canPlacePiece) {
                 // If at least one available piece has a valid spot, game is not over
                 return false;
             }
         }

         // If we looped through all available pieces and none could be placed...
        isGameOver = true;
        gameOverDisplay.classList.remove('hidden');
        playSound(sfxGameOver);
        if (!bgMusic.paused) bgMusic.pause();
        console.log("Game Over!");
        saveHighScore();
        return true;
    }


    // --- Event Handlers ---
     function handlePieceSelection(event) { /* Enhanced visual selection done via CSS */
        if (isGameOver) return;
        const targetContainer = event.currentTarget;
        const index = parseInt(targetContainer.dataset.index);

        // Deselect previous visual state first
        const previouslySelected = piecesContainer.querySelector('.selected');
        if (previouslySelected) {
            previouslySelected.classList.remove('selected');
        }
        clearPlacementPreview(); // Clear grid preview when selection changes

        // Select new piece or toggle off
        if (selectedPieceIndex === index) {
            selectedPieceIndex = -1; // Deselected
        } else {
            selectedPieceIndex = index;
            targetContainer.classList.add('selected'); // Apply new selected style
        }
        // Note: No need to call renderPiecePreviews unless piece data changes
    }

    function handleGridMouseOver(event) { /* Use CSS transitions for smoothness */
        if (isGameOver || selectedPieceIndex === -1 || 'ontouchstart' in window) return; // No hover on touch

        const cell = event.target.closest('.cell');
        if (!cell) return;
        const r = parseInt(cell.dataset.row);
        const c = parseInt(cell.dataset.col);
        const piece = currentPieces[selectedPieceIndex];

        clearPlacementPreview(); // Clear previous first (fast)
        showPlacementPreview(piece, r, c); // Show new (will transition)
    }

    function handleGridMouseOut(event) { /* Keep as before */
        if (isGameOver || 'ontouchstart' in window) return;
         if (!event.relatedTarget || !event.relatedTarget.closest('#grid-board')) { // Check if leaving grid entirely
             clearPlacementPreview();
         }
    }

     function handleGridClick(event) { /* Core logic largely same, ensure checkGameOver is called */
        if (isGameOver || selectedPieceIndex === -1) return;
        const cell = event.target.closest('.cell');
        if (!cell) return;

        const r = parseInt(cell.dataset.row);
        const c = parseInt(cell.dataset.col);
        const piece = currentPieces[selectedPieceIndex];

        clearPlacementPreview(); // Clear preview just before placing

        if (isValidPlacement(piece, r, c)) {
            if (placePiece(piece, r, c)) {

                const linesWereCleared = clearLines(); // Clear lines and get status

                // Only re-render immediately if lines were NOT cleared
                 // If lines *were* cleared, renderGrid is called after animation timeout in clearLines()
                if (!linesWereCleared) {
                    renderGrid();
                 }

                // Mark piece as used (logic changes slightly - refresh replaces all)
                 // Find the actual piece object reference to remove it
                 const pieceToRemove = currentPieces[selectedPieceIndex];
                 currentPieces = currentPieces.map((p, idx) => idx === selectedPieceIndex ? null : p); // Set slot to null temporarily
                 selectedPieceIndex = -1; // Deselect


                 renderPiecePreviews(); // Update previews immediately to show null slot

                // Check if all slots are now null, then generate new full set
                if (currentPieces.every(p => p === null)) {
                    console.log("All pieces used, generating new set.");
                    generateNewPieces(true); // Force replace all
                }

                 // Check game over AFTER placing and potentially getting new pieces
                 // Important: Only check if the game isn't already over
                 if (!isGameOver) {
                     checkGameOver();
                 }

            } // end if placePiece successful
        } else {
             console.log("Placement invalid at:", r, c);
             // Optional: Add feedback for invalid click (e.g., slight screen shake?)
        }
    }

    function showPlacementPreview(piece, startRow, startCol) { // Adds invalid class
        if (!piece) return;
        const isValid = isValidPlacement(piece, startRow, startCol); // Check validity once

        piece.shape.forEach(([dr, dc]) => {
            const r = startRow + dr;
            const c = startCol + dc;
            if (r >= 0 && r < GRID_HEIGHT && c >= 0 && c < GRID_WIDTH) {
                const targetCell = gridBoard.querySelector(`.cell[data-row='${r}'][data-col='${c}']`);
                if (targetCell && targetCell.className.includes('filled') === false ) { // Preview only on empty cells
                    targetCell.classList.add('preview');
                     if (!isValid) {
                         targetCell.classList.add('invalid'); // Add invalid class for specific styling
                     }
                     // background color is handled by CSS based on .preview and .invalid
                }
            }
        });
    }


    function clearPlacementPreview() { // Removes both preview and invalid classes
        gridBoard.querySelectorAll('.cell.preview').forEach(cell => {
            cell.classList.remove('preview', 'invalid'); // Remove both classes
            // Reset background color if it was manually set (it shouldn't be with class approach)
            // cell.style.backgroundColor = '';
        });
    }

     // --- New Handler for Refresh Button ---
     function handleRefreshPieces() {
         if (isGameOver) return;
         console.log("Refreshing pieces...");

          // Optional: Add a small score penalty for refreshing?
          // updateScore(-5); // Example penalty

         // Deselect any currently selected piece visually and logically
         if (selectedPieceIndex !== -1) {
             const selectedContainer = piecesContainer.querySelector('.piece-container.selected');
             if (selectedContainer) {
                 selectedContainer.classList.remove('selected');
             }
             selectedPieceIndex = -1;
             clearPlacementPreview(); // Clear grid preview if any
         }

         // Generate a completely new set of pieces
         generateNewPieces(true); // `true` forces replacement

         // IMPORTANT: Check if the new set leads to game over immediately
         checkGameOver();
     }


    function startGame() { /* Add refresh button event listener here */
        console.log("Starting new game...");
        isGameOver = false; // Reset game over flag first
        gridState = [];
        score = 0;
        loadHighScore(); // Load high score
        currentPieces = []; // Start with empty array before generating
        selectedPieceIndex = -1;

        gameOverDisplay.classList.add('hidden');
        updateScore(0);
        createGrid(); // Recalculates grid size if needed
        generateNewPieces(true); // Get initial pieces (force replace)
        renderGrid();

        // Add Refresh Button Listener only once on start (or ensure it's not duplicated)
         refreshButton.removeEventListener('click', handleRefreshPieces); // Remove previous if any
         refreshButton.addEventListener('click', handleRefreshPieces); // Add the handler

        // Music button text reset (keep as before)
        musicButton.textContent = bgMusic.paused ? "Play Music" : "Pause Music";

         // Initial game over check - necessary if the first set of pieces has no moves
         checkGameOver();
    }

    // --- Music Controls (Keep as before) ---
    musicButton.addEventListener('click', () => { /* ... */
       if (bgMusic.paused) {
            bgMusic.play().catch(e => console.error("Audio play failed:", e));
            musicButton.textContent = "Pause Music";
        } else {
            bgMusic.pause();
            musicButton.textContent = "Play Music";
        }
    });

    // --- Restart Button (Keep as before - calls startGame) ---
    restartButton.addEventListener('click', startGame);

    // --- Initial Game Setup ---
    startGame(); // Call startGame to initialize everything

}); // End DOMContentLoaded
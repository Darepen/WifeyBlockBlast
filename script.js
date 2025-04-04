document.addEventListener('DOMContentLoaded', () => {
    // --- Get DOM Elements ---
    const gridBoard = document.getElementById('grid-board');
    const scoreDisplay = document.getElementById('score');
    const highscoreDisplay = document.getElementById('highscore');
    const piecesContainer = document.getElementById('pieces');
    const gameOverDisplay = document.getElementById('game-over');
    const finalScoreDisplay = document.getElementById('final-score');
    const restartButton = document.getElementById('restart-button');
    const refreshButton = document.getElementById('refresh-pieces-button');
    const secondChancePrompt = document.getElementById('second-chance-prompt');
    const secondChanceYesButton = document.getElementById('second-chance-yes-button');
    const secondChanceNoButton = document.getElementById('second-chance-no-button');

    // Audio Elements & Controls
    const bgMusic = document.getElementById('bg-music');
    const sfxPlace = document.getElementById('sfx-place');
    const sfxClear = document.getElementById('sfx-clear');
    const sfxGameOver = document.getElementById('sfx-gameover');
    const muteMusicButton = document.getElementById('mute-music-button');
    const musicVolumeSlider = document.getElementById('music-volume-slider');
    const muteSfxButton = document.getElementById('mute-sfx-button');
    const sfxVolumeSlider = document.getElementById('sfx-volume-slider');

    // --- Game Settings ---
    const GRID_WIDTH = 9;
    const GRID_HEIGHT = 9;
    let CELL_SIZE = 40; // Default, will be recalculated
    let PREVIEW_CELL_SIZE = 15; // Default, will be recalculated
    const NUM_PIECE_SLOTS = 3;
    const LINE_CLEAR_SCORE = GRID_WIDTH * 10;
    const MULTI_LINE_BONUS_MULTIPLIER = 1.5;
    const REFRESH_PENALTY = 0; // Set a score penalty for manual refresh if desired (e.g., 50)

    // --- Piece Definitions (Keep as before) ---
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
        { shape: [[0,0],[1,0],[2,0],[0,1],[1,1],[2,1],[0,2],[1,2],[2,2]], color: 'pink'}, // 3x3 square!
    ];

    // --- Game State ---
    let gridState = [];
    let score = 0;
    let highScore = 0;
    let currentPieces = []; // Array to hold the 3 available pieces (or null)
    let draggedPieceIndex = null; // Index of the piece being dragged
    let draggedPieceData = null; // Actual piece data being dragged
    let isGameOver = false;
    let hasUsedSecondChance = false;

    // Audio State
    let isMusicMuted = localStorage.getItem('pastelPopMusicMuted') === 'true';
    let musicVolume = parseFloat(localStorage.getItem('pastelPopMusicVolume') || '0.5');
    let isSfxMuted = localStorage.getItem('pastelPopSfxMuted') === 'true';
    let sfxVolume = parseFloat(localStorage.getItem('pastelPopSfxVolume') || '0.7');

    // --- Sound Utility ---
    function playSound(soundElement) {
        if (!soundElement || isSfxMuted || soundElement.readyState < 2) return;
        soundElement.volume = sfxVolume; // Set volume before playing
        soundElement.currentTime = 0;
        soundElement.play().catch(e => console.warn("SFX play failed:", e));
    }

    // --- Audio Controls Logic ---
    function updateAudioSettings() {
        // Music Mute
        bgMusic.muted = isMusicMuted;
        muteMusicButton.textContent = isMusicMuted ? "Unmute Music" : "Mute Music";
        localStorage.setItem('pastelPopMusicMuted', isMusicMuted);
        if (!isMusicMuted && bgMusic.paused) { // Try to play if unmuted and paused
           attemptMusicPlay();
        } else if (isMusicMuted && !bgMusic.paused) {
            bgMusic.pause();
        }

        // Music Volume
        bgMusic.volume = musicVolume;
        musicVolumeSlider.value = musicVolume;
        localStorage.setItem('pastelPopMusicVolume', musicVolume);

        // SFX Mute
        muteSfxButton.textContent = isSfxMuted ? "Unmute SFX" : "Mute SFX";
        localStorage.setItem('pastelPopSfxMuted', isSfxMuted);

        // SFX Volume
        sfxVolumeSlider.value = sfxVolume;
        localStorage.setItem('pastelPopSfxVolume', sfxVolume);
        // Test sound with new volume (optional)
        // playSound(sfxPlace);
    }

    function attemptMusicPlay() {
        if (isMusicMuted) return; // Don't play if muted
        bgMusic.volume = musicVolume; // Ensure volume is set
        const playPromise = bgMusic.play();
        if (playPromise !== undefined) {
            playPromise.then(_ => {
                // Autoplay started!
                console.log("Music playing.");
                updateAudioSettings(); // Update button text
            }).catch(error => {
                // Autoplay was prevented.
                console.warn("Music autoplay failed:", error);
                // We can't force it, user needs to interact (e.g., click mute/unmute later)
                updateAudioSettings(); // Ensure button reflects paused state potentially
            });
        }
    }


    muteMusicButton.addEventListener('click', () => {
        isMusicMuted = !isMusicMuted;
        updateAudioSettings();
    });
    musicVolumeSlider.addEventListener('input', (e) => {
        musicVolume = parseFloat(e.target.value);
        updateAudioSettings();
    });
     muteSfxButton.addEventListener('click', () => {
        isSfxMuted = !isSfxMuted;
        updateAudioSettings();
    });
    sfxVolumeSlider.addEventListener('input', (e) => {
        sfxVolume = parseFloat(e.target.value);
        updateAudioSettings();
        playSound(sfxPlace); // Play a sound for feedback
    });

    // --- High Score Functions ---
    function loadHighScore() {
        const savedScore = localStorage.getItem('pastelPopHighScore');
        highScore = savedScore ? parseInt(savedScore, 10) : 0;
        highscoreDisplay.textContent = highScore;
    }

    function saveHighScore() {
        if (score > highScore) {
            highScore = score;
            highscoreDisplay.textContent = highScore;
            localStorage.setItem('pastelPopHighScore', highScore.toString());
        }
    }

    // --- Grid/Piece Size Calculation ---
    function calculateSizes() {
        const gameContainer = document.getElementById('game-container');
        const availableWidth = gameContainer.offsetWidth;
        const availableHeight = window.innerHeight * 0.8; // Use 80% of viewport height as rough guide

        // Estimate grid size vs piece area size
        // Let grid take ~60% of width on desktop, maybe 95% on mobile
        let gridTargetWidth = availableWidth * 0.6;
        if (window.innerWidth < 768) {
            gridTargetWidth = availableWidth * 0.95;
        }

        // Calculate cell size based on width, limiting by height too
        const sizeFromWidth = Math.floor(gridTargetWidth / GRID_WIDTH);
        const sizeFromHeight = Math.floor(availableHeight / (GRID_HEIGHT + 2)); // Add buffer for score/etc.

        CELL_SIZE = Math.max(20, Math.min(sizeFromWidth, sizeFromHeight, 50)); // Min 20px, Max 50px

        // Calculate preview size relative to cell size
        PREVIEW_CELL_SIZE = Math.max(10, Math.floor(CELL_SIZE * 0.4));
    }

    // --- Initialization Functions ---
    function createGrid() {
        calculateSizes(); // Recalculate sizes based on current screen
        gridBoard.innerHTML = '';
        gridBoard.style.gridTemplateColumns = `repeat(${GRID_WIDTH}, ${CELL_SIZE}px)`;
        gridBoard.style.gridTemplateRows = `repeat(${GRID_HEIGHT}, ${CELL_SIZE}px)`;
        const boardSize = GRID_WIDTH * CELL_SIZE + 6; // Account for border
        gridBoard.style.width = `${boardSize}px`;
        gridBoard.style.height = `${boardSize}px`; // Make it square based on width

        gridState = Array(GRID_HEIGHT).fill(null).map(() => Array(GRID_WIDTH).fill(null));

        for (let r = 0; r < GRID_HEIGHT; r++) {
            for (let c = 0; c < GRID_WIDTH; c++) {
                const cell = document.createElement('div');
                cell.classList.add('cell');
                cell.dataset.row = r;
                cell.dataset.col = c;
                cell.style.width = `${CELL_SIZE}px`;
                cell.style.height = `${CELL_SIZE}px`;

                // --- DRAG AND DROP (GRID CELL LISTENERS) ---
                cell.addEventListener('dragover', handleDragOver);
                cell.addEventListener('dragleave', handleDragLeave);
                cell.addEventListener('drop', handleDrop);
                // --- END DRAG AND DROP ---

                gridBoard.appendChild(cell);
            }
        }
    }

    function getRandomPiece() {
        const randomIndex = Math.floor(Math.random() * PIECE_DEFINITIONS.length);
        // Deep clone to avoid modifying the original definitions
        return JSON.parse(JSON.stringify(PIECE_DEFINITIONS[randomIndex]));
    }

    function generateNewPieces(forceReplaceAll = true) {
        if (forceReplaceAll) {
            currentPieces = [];
            for (let i = 0; i < NUM_PIECE_SLOTS; i++) {
                currentPieces.push(getRandomPiece());
            }
        } else {
            // Only fill empty slots (original logic, less used now)
            for (let i = 0; i < NUM_PIECE_SLOTS; i++) {
                if (!currentPieces[i]) {
                    currentPieces[i] = getRandomPiece();
                }
            }
        }
        renderPiecePreviews();
        // Check game over *after* getting pieces (is done after placement or refresh)
    }

    // --- Rendering Functions ---
    function renderGrid() {
        const cells = gridBoard.querySelectorAll('.cell');
        cells.forEach(cell => {
            const r = parseInt(cell.dataset.row);
            const c = parseInt(cell.dataset.col);
            cell.className = 'cell'; // Reset classes
             cell.style.width = `${CELL_SIZE}px`; // Ensure size consistency
             cell.style.height = `${CELL_SIZE}px`;
            if (gridState[r]?.[c]) {
                cell.classList.add(`filled-${gridState[r][c]}`);
            }
        });
    }

    function renderPiecePreviews() {
        piecesContainer.innerHTML = '';
        currentPieces.forEach((piece, index) => {
            const pieceContainer = document.createElement('div');
            pieceContainer.classList.add('piece-container');

            if (piece === null) {
                pieceContainer.classList.add('occupied');
                pieceContainer.innerHTML = '✓'; // Simple checkmark
                // Make non-draggable
                pieceContainer.setAttribute('draggable', 'false');
            } else {
                pieceContainer.dataset.index = index;
                // --- DRAG AND DROP (PIECE LISTENERS) ---
                pieceContainer.setAttribute('draggable', 'true');
                pieceContainer.addEventListener('dragstart', handleDragStart);
                pieceContainer.addEventListener('dragend', handleDragEnd);
                // --- END DRAG AND DROP ---

                let maxR = 0, maxC = 0;
                piece.shape.forEach(([dr, dc]) => {
                    maxR = Math.max(maxR, dr);
                    maxC = Math.max(maxC, dc);
                });

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
                         cell.style.width = `${PREVIEW_CELL_SIZE}px`;
                         cell.style.height = `${PREVIEW_CELL_SIZE}px`;
                        if (previewGrid[r]?.[c]) {
                            cell.classList.add(`filled-${piece.color}`);
                        }
                        pieceContainer.appendChild(cell);
                    }
                }
            }
            piecesContainer.appendChild(pieceContainer);
        });
    }

    function updateScore(points) {
        score += points;
        // Ensure score doesn't go below 0 (e.g., from penalty)
        if (score < 0) score = 0;
        scoreDisplay.textContent = score;
        saveHighScore(); // Check and save if it's a new high score
    }

    // --- Game Logic Functions ---
    function isValidPlacement(piece, startRow, startCol) {
         if (!piece) return false; // No piece selected/dragged
        for (const [dr, dc] of piece.shape) {
            const r = startRow + dr;
            const c = startCol + dc;
            // Check bounds and if cell is already filled
            if (r < 0 || r >= GRID_HEIGHT || c < 0 || c >= GRID_WIDTH || gridState[r]?.[c] !== null) {
                return false;
            }
        }
        return true;
    }

    function placePiece(piece, startRow, startCol) {
        if (!isValidPlacement(piece, startRow, startCol)) return false;
        let cellsFilled = 0;
        piece.shape.forEach(([dr, dc]) => {
            const r = startRow + dr;
            const c = startCol + dc;
             if (gridState[r] !== undefined) {
                 gridState[r][c] = piece.color;
                 cellsFilled++;
             }
        });
         if (cellsFilled > 0) updateScore(cellsFilled); // Score per block placed
        playSound(sfxPlace);
        return cellsFilled > 0; // Return true if placement happened
    }

    function clearLines() {
        let rowsToClear = [];
        let colsToClear = [];
        let clearedCells = new Set(); // Use Set for unique coords

        // Check rows
        for (let r = 0; r < GRID_HEIGHT; r++) {
            if (gridState[r]?.every(cell => cell !== null)) {
                rowsToClear.push(r);
                 for(let c = 0; c < GRID_WIDTH; c++) clearedCells.add(`${r}-${c}`);
            }
        }
        // Check columns
        for (let c = 0; c < GRID_WIDTH; c++) {
            let colFull = true;
            for (let r = 0; r < GRID_HEIGHT; r++) {
                if (gridState[r]?.[c] === null) {
                    colFull = false;
                    break;
                }
            }
            if (colFull) {
                colsToClear.push(c);
                 for(let r = 0; r < GRID_HEIGHT; r++) clearedCells.add(`${r}-${c}`); // Ensure row exists (should)
            }
        }

        const totalLinesCleared = rowsToClear.length + colsToClear.length;

        if (totalLinesCleared > 0) {
            playSound(sfxClear);

             // --- Visual Flash ---
            clearedCells.forEach(coord => {
                const [r, c] = coord.split('-').map(Number);
                const cellElement = gridBoard.querySelector(`.cell[data-row='${r}'][data-col='${c}']`);
                if (cellElement) {
                    cellElement.classList.add('clearing');
                }
            });

            // Calculate Score
            let lineScore = totalLinesCleared * LINE_CLEAR_SCORE;
            let bonusScore = (totalLinesCleared > 1)
                ? Math.round(Math.pow(MULTI_LINE_BONUS_MULTIPLIER, totalLinesCleared -1) * lineScore) // Exponential bonus
                : 0;
            console.log(`Cleared ${totalLinesCleared} lines. Score: +${lineScore}, Bonus: +${bonusScore}`);
            updateScore(lineScore + bonusScore);


            // --- Clear State and Remove Animation (after delay) ---
            setTimeout(() => {
                clearedCells.forEach(coord => {
                    const [r, c] = coord.split('-').map(Number);
                     if (gridState[r] !== undefined) gridState[r][c] = null; // Clear actual game state
                    const cellElement = gridBoard.querySelector(`.cell[data-row='${r}'][data-col='${c}']`);
                     if (cellElement) {
                        cellElement.classList.remove('clearing'); // Remove animation class
                        // cellElement.className = 'cell'; // Force re-render look (if needed)
                     }
                 });
                 renderGrid(); // Re-render the grid AFTER clearing state and removing flash
            }, 300); // Match animation duration in CSS roughly

             return true; // Lines were cleared
        }
        return false; // No lines cleared
    }


    function canAnyPieceBePlaced() {
        for (const piece of currentPieces) {
            if (piece === null) continue; // Skip used slots
            // Check if this piece can be placed anywhere
            for (let r = 0; r < GRID_HEIGHT; r++) {
                for (let c = 0; c < GRID_WIDTH; c++) {
                    if (isValidPlacement(piece, r, c)) {
                        return true; // Found a place for at least one piece
                    }
                }
            }
        }
        // If we looped through all available pieces and none could be placed...
        return false;
    }

    function triggerGameOverSequence() {
        // Check if any piece can be placed
        if (canAnyPieceBePlaced()) {
            // False alarm, should not happen if called correctly, but good safeguard
            console.log("Game over check called, but moves are available.");
            isGameOver = false; // Ensure flag is correct
            return;
        }

        // --- Actual Game Over Condition ---
        if (!hasUsedSecondChance) {
            // Offer Second Chance
            console.log("No moves left. Offering second chance.");
            secondChancePrompt.classList.remove('hidden');
            if (!bgMusic.paused) bgMusic.pause(); // Pause music for prompt
            // Disable interaction with board/pieces while prompt is up
             gridBoard.style.pointerEvents = 'none';
             piecesContainer.style.pointerEvents = 'none';
        } else {
            // Final Game Over (already used second chance or declined)
            console.log("Game Over! No more chances.");
            isGameOver = true;
            finalScoreDisplay.textContent = score;
            gameOverDisplay.classList.remove('hidden');
            playSound(sfxGameOver);
            if (!bgMusic.paused) bgMusic.pause();
            saveHighScore(); // Save high score at the very end
             gridBoard.style.pointerEvents = 'none'; // Disable board
             piecesContainer.style.pointerEvents = 'none';
        }
    }

    // --- Event Handlers ---

    // DRAG AND DROP HANDLERS
    function handleDragStart(event) {
        const target = event.target.closest('.piece-container');
        if (!target || target.classList.contains('occupied')) {
            event.preventDefault();
            return;
        }
        draggedPieceIndex = parseInt(target.dataset.index);
        draggedPieceData = currentPieces[draggedPieceIndex]; // Store the actual piece object

        // Optional: Add a class for visual feedback while dragging
        target.classList.add('dragging');

        // Set data (can be simple like the index)
        event.dataTransfer.setData('text/plain', draggedPieceIndex);
        event.dataTransfer.effectAllowed = 'move';

        // Optional: Customize drag image (can be complex)
        // event.dataTransfer.setDragImage(customImage, 0, 0);
    }

    function handleDragEnd(event) {
        // Remove dragging class from original piece preview
        const target = event.target.closest('.piece-container');
        if(target) target.classList.remove('dragging');

        // Clear preview on the grid board regardless of drop success
        clearPlacementPreview();
        draggedPieceIndex = null; // Reset dragged index state
        draggedPieceData = null;  // Reset dragged data state
    }

    function handleDragOver(event) {
        event.preventDefault(); // Necessary to allow dropping
        event.dataTransfer.dropEffect = 'move';

        const cell = event.target.closest('.cell');
        if (!cell || !draggedPieceData) return; // Need target cell and dragged piece info

        const r = parseInt(cell.dataset.row);
        const c = parseInt(cell.dataset.col);

        clearPlacementPreview(); // Clear previous preview
        showPlacementPreview(draggedPieceData, r, c); // Show preview at current drag location
    }

    function handleDragLeave(event) {
        // Clear preview ONLY if leaving the grid entirely or moving to a non-cell element
         const cell = event.target.closest('.cell');
         const relatedTarget = event.relatedTarget;
         if (cell && (!relatedTarget || !relatedTarget.closest('.cell'))) {
            // If the mouse leaves a cell and doesn't enter another cell immediately
            // (Could also check if leaving the bounds of #grid-board)
            clearPlacementPreview();
         }
    }

    function handleDrop(event) {
        event.preventDefault(); // Prevent default browser action (like opening link)
        clearPlacementPreview(); // Clear preview visual

        const cell = event.target.closest('.cell');
        if (!cell || draggedPieceIndex === null || !draggedPieceData) {
             console.log("Drop failed: No cell or dragged piece info.");
             return; // Invalid drop target or no piece being dragged
        }

        const r = parseInt(cell.dataset.row);
        const c = parseInt(cell.dataset.col);
        const piece = draggedPieceData; // Get the piece data stored during dragStart

        console.log(`Attempting drop of piece ${draggedPieceIndex} at ${r}, ${c}`);

        if (isValidPlacement(piece, r, c)) {
            console.log("Placement valid. Placing piece.");
            if (placePiece(piece, r, c)) { // placePiece handles scoring and sound

                // Mark piece as used (set to null in the array)
                currentPieces[draggedPieceIndex] = null;
                renderPiecePreviews(); // Update previews to show the empty slot

                // Clear lines after placing
                const linesWereCleared = clearLines();

                // Re-render grid immediately ONLY if lines were NOT cleared
                // (If lines *were* cleared, renderGrid is called by clearLines after animation)
                if (!linesWereCleared) {
                    renderGrid();
                }

                // Check if all pieces are used
                if (currentPieces.every(p => p === null)) {
                    console.log("All pieces used, generating new set.");
                     // Delay slightly to allow clear animation finish if any
                     setTimeout(() => {
                         generateNewPieces(true); // Force replace all
                         // After getting new pieces, check if game is over *now*
                         triggerGameOverSequence();
                     }, linesWereCleared ? 350 : 50); // Longer delay if lines cleared
                } else {
                    // If some pieces remain, check if any *remaining* piece can be placed
                    triggerGameOverSequence();
                }
            }
        } else {
            console.log("Placement invalid at:", r, c);
            // Optional: Add brief visual feedback for invalid drop (e.g., shake board)
            gridBoard.classList.add('shake');
            setTimeout(() => gridBoard.classList.remove('shake'), 300);
        }

        // Reset drag state variables (redundant with dragEnd but safe)
        draggedPieceIndex = null;
        draggedPieceData = null;
    }
    // END DRAG AND DROP HANDLERS

    function showPlacementPreview(piece, startRow, startCol) {
        if (!piece) return;
        const isValid = isValidPlacement(piece, startRow, startCol);

        piece.shape.forEach(([dr, dc]) => {
            const r = startRow + dr;
            const c = startCol + dc;
            if (r >= 0 && r < GRID_HEIGHT && c >= 0 && c < GRID_WIDTH) {
                const targetCell = gridBoard.querySelector(`.cell[data-row='${r}'][data-col='${c}']`);
                if (targetCell && !targetCell.className.includes('filled')) { // Preview only on empty cells
                    targetCell.classList.add('preview');
                    if (!isValid) {
                        targetCell.classList.add('invalid');
                    }
                } else if (targetCell) {
                     // Cell is filled, mark preview as invalid implicitly?
                     // Or add a specific class if needed. For now, rely on isValid.
                     // If the anchor cell itself is invalid, show the invalid preview
                     if (!isValid && dr === 0 && dc === 0) {
                         targetCell.classList.add('preview', 'invalid');
                     }
                }
            }
        });
    }

    function clearPlacementPreview() {
        gridBoard.querySelectorAll('.cell.preview').forEach(cell => {
            cell.classList.remove('preview', 'invalid');
        });
    }

    // --- Refresh Button / Second Chance Logic ---
    function handleRefreshPieces(isSecondChance = false) {
         if (isGameOver) return; // Cannot refresh if already game over final

         // Don't refresh if there are still moves unless it's the forced second chance
         if (!isSecondChance && canAnyPieceBePlaced()) {
             console.log("Manual refresh attempted, but moves are available.");
             // Optionally add feedback: "Moves still available!"
             return;
         }

         // Apply penalty only for manual refresh, not the second chance
         if (!isSecondChance && REFRESH_PENALTY > 0) {
             console.log(`Applying refresh penalty: -${REFRESH_PENALTY}`);
             updateScore(-REFRESH_PENALTY);
         }

         console.log("Refreshing pieces...");
         if (isSecondChance) {
             hasUsedSecondChance = true; // Mark second chance as used
             secondChancePrompt.classList.add('hidden'); // Hide prompt
             // Re-enable board/pieces interaction
             gridBoard.style.pointerEvents = 'auto';
             piecesContainer.style.pointerEvents = 'auto';
             if (!isMusicMuted) attemptMusicPlay(); // Resume music maybe
         }


         // Generate a completely new set of pieces
         generateNewPieces(true);

         // Check if the NEW set leads to game over immediately
         // Need a slight delay to allow DOM update before check? Maybe not.
         triggerGameOverSequence(); // This will handle final game over if needed
    }

    // --- Button Event Listeners ---
    refreshButton.addEventListener('click', () => handleRefreshPieces(false)); // Manual refresh
    secondChanceYesButton.addEventListener('click', () => handleRefreshPieces(true)); // Use second chance
    secondChanceNoButton.addEventListener('click', () => {
        // User declined second chance
        console.log("Second chance declined.");
        secondChancePrompt.classList.add('hidden');
        hasUsedSecondChance = true; // Mark as used (or declined counts as used)
        triggerGameOverSequence(); // Proceed to final game over
    });
    restartButton.addEventListener('click', startGame); // Restart the game

    // --- Initialization Function ---
    function startGame() {
        console.log("Starting new game...");
        isGameOver = false;
        hasUsedSecondChance = false; // Reset second chance flag
        gridState = [];
        score = 0;
        loadHighScore(); // Load high score from storage
        currentPieces = []; // Ensure pieces are cleared
        draggedPieceIndex = null; // Reset drag state
        draggedPieceData = null;

        // Hide modals, update score display
        gameOverDisplay.classList.add('hidden');
        secondChancePrompt.classList.add('hidden');
        updateScore(0); // Resets display to 0 and updates high score display if needed

        createGrid(); // Create grid (recalculates size)
        generateNewPieces(true); // Get initial pieces
        renderGrid(); // Render the initial empty grid state

        // Enable interactions
        gridBoard.style.pointerEvents = 'auto';
        piecesContainer.style.pointerEvents = 'auto';

        updateAudioSettings(); // Apply loaded audio settings
        attemptMusicPlay(); // Try to play music (respects mute state)

        // Initial check: Is it game over immediately? (Unlikely but possible)
        triggerGameOverSequence();
    }

    // --- Initial Setup ---
    startGame(); // Start the game when the DOM is ready

    // Re-calculate sizes on window resize (optional, but good for responsiveness)
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            console.log("Resizing, recalculating grid...");
             // Re-create grid and render (preserves state)
             createGrid(); // This recalculates sizes
             renderGrid(); // Re-render existing state
             renderPiecePreviews(); // Re-render previews with new size
        }, 250); // Debounce resize event
    });

}); // End DOMContentLoaded
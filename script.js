document.addEventListener('DOMContentLoaded', () => {
    // --- Get DOM Elements ---
    const gridBoard = document.getElementById('grid-board');
    const scoreDisplay = document.getElementById('score');
    const highscoreDisplay = document.getElementById('highscore');
    const piecesContainer = document.getElementById('pieces'); // Container for piece previews
    const gameOverDisplay = document.getElementById('game-over');
    const finalScoreDisplay = document.getElementById('final-score');
    const restartButton = document.getElementById('restart-button');
    const refreshButton = document.getElementById('refresh-pieces-button');
    const secondChancePrompt = document.getElementById('second-chance-prompt');
    const secondChanceYesButton = document.getElementById('second-chance-yes-button');
    const secondChanceNoButton = document.getElementById('second-chance-no-button');
    const settingsPanel = document.getElementById('settings-panel'); // Get settings panel
    const settingsToggleButton = document.getElementById('settings-toggle-button'); // Get toggle button
    const closeSettingsButton = document.getElementById('close-settings-button'); // Get close button

    // Audio Elements & Controls (inside settings panel now)
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
    let CELL_SIZE = 40;
    let PREVIEW_CELL_SIZE = 15;
    const NUM_PIECE_SLOTS = 3;
    const LINE_CLEAR_SCORE = GRID_WIDTH * 10;
    const MULTI_LINE_BONUS_MULTIPLIER = 1.5;
    const REFRESH_PENALTY = 0;

    // --- Piece Definitions (Complete) ---
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
        { shape: [[0,0],[1,0],[2,0],[0,1],[1,1],[2,1],[0,2],[1,2],[2,2]], color: 'pink'} // 3x3 square!
    ];

    // --- Game State ---
    let gridState = [];
    let score = 0;
    let highScore = 0;
    let currentPieces = [];
    let draggedPieceIndex = null;
    let draggedPieceData = null;
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
        soundElement.volume = sfxVolume;
        soundElement.currentTime = 0;
        soundElement.play().catch(e => console.warn("SFX play failed:", e));
    }

    // --- Audio Controls Logic ---
    function updateAudioSettings() {
        bgMusic.muted = isMusicMuted;
        muteMusicButton.textContent = isMusicMuted ? "Unmute" : "Mute"; // Shorter text
        localStorage.setItem('pastelPopMusicMuted', isMusicMuted);
        if (!isMusicMuted && bgMusic.paused && !isGameOver && !secondChancePrompt.classList.contains('hidden') ) { // Only attempt play if not paused for game over/prompt
            attemptMusicPlay();
        } else if (isMusicMuted && !bgMusic.paused) {
            bgMusic.pause();
        }

        bgMusic.volume = musicVolume;
        musicVolumeSlider.value = musicVolume;
        localStorage.setItem('pastelPopMusicVolume', musicVolume);

        muteSfxButton.textContent = isSfxMuted ? "Unmute" : "Mute"; // Shorter text
        localStorage.setItem('pastelPopSfxMuted', isSfxMuted);

        sfxVolumeSlider.value = sfxVolume;
        localStorage.setItem('pastelPopSfxVolume', sfxVolume);
    }

    function attemptMusicPlay() {
        if (isMusicMuted || isGameOver || !secondChancePrompt.classList.contains('hidden')) return; // Don't play if muted or game ended/paused
        bgMusic.volume = musicVolume;
        const playPromise = bgMusic.play();
        if (playPromise !== undefined) {
            playPromise.then(_ => {
                console.log("Music playing.");
                updateAudioSettings(); // Update button text state
            })
            .catch(error => {
                console.warn("Music autoplay/play failed:", error);
                updateAudioSettings(); // Update button text state
            });
        }
    }

    // Add listeners within the settings panel
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


    // --- Settings Panel Toggle Logic ---
    function toggleSettingsPanel(show) {
        const isHidden = settingsPanel.classList.contains('hidden');
        if (show === undefined) { // Toggle
            settingsPanel.classList.toggle('hidden');
        } else if (show && isHidden) { // Show only if hidden
            settingsPanel.classList.remove('hidden');
        } else if (!show && !isHidden) { // Hide only if shown
            settingsPanel.classList.add('hidden');
        }
    }
    settingsToggleButton.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent click from closing immediately if using document listener
        toggleSettingsPanel();
    });
    closeSettingsButton.addEventListener('click', () => toggleSettingsPanel(false));
    // Optional: Close panel if clicking outside of it
    document.addEventListener('click', (event) => {
         // Check if the click is outside the panel and not on the toggle button
        if (!settingsPanel.classList.contains('hidden') &&
            !settingsPanel.contains(event.target) &&
            event.target !== settingsToggleButton) {
            toggleSettingsPanel(false);
        }
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
        const appContainer = document.getElementById('app-container');
        const topBar = document.getElementById('top-bar');
        const bottomBar = document.getElementById('bottom-bar');
        const gridContainer = document.getElementById('grid-container');

        // Use gridContainer's available space, which flex-grow manages
        const availableHeight = gridContainer.clientHeight - 20; // Subtract vertical padding
        const availableWidth = gridContainer.clientWidth - 20; // Subtract horizontal padding (if any)

        // Calculate cell size based on the smaller dimension available for the grid
        const sizeFromWidth = Math.floor(availableWidth / GRID_WIDTH);
        const sizeFromHeight = Math.floor(availableHeight / GRID_HEIGHT);

        CELL_SIZE = Math.max(15, Math.min(sizeFromWidth, sizeFromHeight, 50)); // Min 15px, Max 50px

        // Calculate preview size relative to cell size
        PREVIEW_CELL_SIZE = Math.max(8, Math.floor(CELL_SIZE * 0.4));

        console.log(`Calculated CELL_SIZE: ${CELL_SIZE}, PREVIEW_CELL_SIZE: ${PREVIEW_CELL_SIZE}`);
    }

    // --- Initialization Functions ---
    function createGrid() {
        // calculateSizes(); // Called before createGrid in startGame/resize
        gridBoard.innerHTML = '';
        gridBoard.style.gridTemplateColumns = `repeat(${GRID_WIDTH}, ${CELL_SIZE}px)`;
        gridBoard.style.gridTemplateRows = `repeat(${GRID_HEIGHT}, ${CELL_SIZE}px)`;
        const boardBorderSize = 6; // 2 * 3px border
        gridBoard.style.width = `${GRID_WIDTH * CELL_SIZE + boardBorderSize}px`;
        gridBoard.style.height = `${GRID_HEIGHT * CELL_SIZE + boardBorderSize}px`;

        gridState = Array(GRID_HEIGHT).fill(null).map(() => Array(GRID_WIDTH).fill(null));

        for (let r = 0; r < GRID_HEIGHT; r++) {
            for (let c = 0; c < GRID_WIDTH; c++) {
                const cell = document.createElement('div');
                cell.classList.add('cell');
                cell.dataset.row = r;
                cell.dataset.col = c;
                cell.style.width = `${CELL_SIZE}px`;
                cell.style.height = `${CELL_SIZE}px`;
                // Add DnD listeners
                cell.addEventListener('dragover', handleDragOver);
                cell.addEventListener('dragleave', handleDragLeave);
                cell.addEventListener('drop', handleDrop);
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
            // Only fill empty slots (less common now)
            for (let i = 0; i < NUM_PIECE_SLOTS; i++) {
                if (!currentPieces[i]) {
                    currentPieces[i] = getRandomPiece();
                }
            }
        }
        renderPiecePreviews();
        // Check game over *after* getting pieces (done in placement/refresh logic)
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
                pieceContainer.setAttribute('draggable', 'false');
            } else {
                pieceContainer.dataset.index = index;
                pieceContainer.setAttribute('draggable', 'true');
                pieceContainer.addEventListener('dragstart', handleDragStart);
                pieceContainer.addEventListener('dragend', handleDragEnd);

                let maxR = 0, maxC = 0;
                piece.shape.forEach(([dr, dc]) => {
                    maxR = Math.max(maxR, dr);
                    maxC = Math.max(maxC, dc);
                });

                 const minPreviewSize = PREVIEW_CELL_SIZE * 2; // Adjust min size based on smaller preview cells
                 pieceContainer.style.minWidth = `${minPreviewSize}px`;
                 pieceContainer.style.minHeight = `${minPreviewSize}px`;

                pieceContainer.style.gridTemplateRows = `repeat(${maxR + 1}, ${PREVIEW_CELL_SIZE}px)`;
                pieceContainer.style.gridTemplateColumns = `repeat(${maxC + 1}, ${PREVIEW_CELL_SIZE}px)`;

                // Create a temporary grid for placing preview cells
                const previewGrid = {};
                piece.shape.forEach(([dr, dc]) => {
                    if (!previewGrid[dr]) previewGrid[dr] = {};
                    previewGrid[dr][dc] = true;
                });

                // Fill the piece container grid
                for (let r = 0; r <= maxR; r++) {
                    for (let c = 0; c <= maxC; c++) {
                        const cell = document.createElement('div');
                        cell.classList.add('piece-cell');
                         cell.style.width = `${PREVIEW_CELL_SIZE}px`;
                         cell.style.height = `${PREVIEW_CELL_SIZE}px`;
                        if (previewGrid[r]?.[c]) { // Check if this cell should be filled
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
        if (score < 0) score = 0; // Ensure score doesn't go below 0
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
             if (gridState[r] !== undefined) { // Ensure row exists
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
            if (gridState[r]?.every(cell => cell !== null)) { // Safe optional chaining
                rowsToClear.push(r);
                 for(let c = 0; c < GRID_WIDTH; c++) clearedCells.add(`${r}-${c}`);
            }
        }
        // Check columns
        for (let c = 0; c < GRID_WIDTH; c++) {
            let colFull = true;
            for (let r = 0; r < GRID_HEIGHT; r++) {
                if (gridState[r]?.[c] === null) { // Safe optional chaining
                    colFull = false;
                    break;
                }
            }
            if (colFull) {
                colsToClear.push(c);
                 for(let r = 0; r < GRID_HEIGHT; r++) {
                     // Only add if row exists (it should, but safe check)
                     if(gridState[r] !== undefined) clearedCells.add(`${r}-${c}`);
                 }
            }
        }

        const totalLinesCleared = rowsToClear.length + colsToClear.length;

        if (totalLinesCleared > 0) {
            playSound(sfxClear);

             // Visual Flash
            clearedCells.forEach(coord => {
                const [r, c] = coord.split('-').map(Number);
                const cellElement = gridBoard.querySelector(`.cell[data-row='${r}'][data-col='${c}']`);
                if (cellElement) {
                    cellElement.classList.add('clearing');
                }
            });

            // Calculate Score
            let lineScore = totalLinesCleared * LINE_CLEAR_SCORE;
            // More rewarding bonus for multi-line clears
            let bonusScore = (totalLinesCleared > 1)
                ? Math.round(Math.pow(MULTI_LINE_BONUS_MULTIPLIER, totalLinesCleared -1) * lineScore)
                : 0;
            console.log(`Cleared ${totalLinesCleared} lines. Score: +${lineScore}, Bonus: +${bonusScore}`);
            updateScore(lineScore + bonusScore);


            // Clear State and Remove Animation (after delay)
            setTimeout(() => {
                clearedCells.forEach(coord => {
                    const [r, c] = coord.split('-').map(Number);
                     if (gridState[r] !== undefined) gridState[r][c] = null; // Clear actual game state
                    const cellElement = gridBoard.querySelector(`.cell[data-row='${r}'][data-col='${c}']`);
                     if (cellElement) {
                        cellElement.classList.remove('clearing'); // Remove animation class
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
        // If moves are still possible, exit
        if (canAnyPieceBePlaced()) {
            isGameOver = false; // Ensure flag is correct
             // Make sure interaction is enabled if we got here erroneously
            gridBoard.style.pointerEvents = 'auto';
            document.getElementById('bottom-bar').style.pointerEvents = 'auto';
            return;
        }

        // --- No Moves Left ---
        console.log("No valid moves detected.");

        // Disable interaction with grid/pieces/refresh
        gridBoard.style.pointerEvents = 'none';
        document.getElementById('bottom-bar').style.pointerEvents = 'none'; // Disable whole bottom bar

        if (!hasUsedSecondChance) {
            // Offer Second Chance
            console.log("Offering second chance.");
            secondChancePrompt.classList.remove('hidden'); // Show prompt
            if (!bgMusic.paused) bgMusic.pause(); // Pause music for prompt
        } else {
            // Final Game Over (already used second chance or declined)
            console.log("Game Over! No more chances.");
            isGameOver = true;
            finalScoreDisplay.textContent = score;
            gameOverDisplay.classList.remove('hidden'); // Show final game over
            playSound(sfxGameOver);
            if (!bgMusic.paused) bgMusic.pause(); // Ensure music is paused
            saveHighScore(); // Save high score at the very end
        }
    }

    // --- Event Handlers ---

    // DRAG AND DROP HANDLERS
    function handleDragStart(event) {
        const target = event.target.closest('.piece-container');
        if (!target || target.classList.contains('occupied') || isGameOver) {
            event.preventDefault();
            return;
        }
        // Ensure settings panel is closed when starting drag
        toggleSettingsPanel(false);

        draggedPieceIndex = parseInt(target.dataset.index);
        draggedPieceData = currentPieces[draggedPieceIndex]; // Store the actual piece object

        // Add visual feedback class slightly delayed to ensure rendering
        setTimeout(() => target.classList.add('dragging'), 0);

        event.dataTransfer.setData('text/plain', draggedPieceIndex);
        event.dataTransfer.effectAllowed = 'move';
    }

    function handleDragEnd(event) {
        // This event fires even if the drop was unsuccessful or outside a valid target

        // Remove dragging class from original piece preview
         // Use event.target which should be the element dragstart originated from
        const target = event.target.closest('.piece-container');
        if(target) {
            target.classList.remove('dragging');
        } else {
             // Fallback if target isn't found directly (might happen in some edge cases)
             const draggingElement = piecesContainer.querySelector('.dragging');
             if (draggingElement) draggingElement.classList.remove('dragging');
        }


        // Clear preview on the grid board if drag ended without a successful drop
        // Check if dropEffect was 'none', indicating unsuccessful drop
        if(event.dataTransfer.dropEffect === 'none'){
            clearPlacementPreview();
        }

        // Reset dragged state variables AFTER potential drop handler has used them
        draggedPieceIndex = null;
        draggedPieceData = null;
    }

    function handleDragOver(event) {
        event.preventDefault(); // Necessary to allow dropping
        if (!draggedPieceData || isGameOver) return; // Need dragged piece info and game not over

        event.dataTransfer.dropEffect = 'move';

        const cell = event.target.closest('.cell');
        if (!cell) {
             clearPlacementPreview(); // Clear preview if not over a cell
             return;
        };

        const r = parseInt(cell.dataset.row);
        const c = parseInt(cell.dataset.col);

        // Avoid clearing and re-showing if over the same cell (potential optimization)
        // if(cell === lastHoveredCell) return;
        // lastHoveredCell = cell; // Need to declare lastHoveredCell globally

        clearPlacementPreview(); // Clear previous preview first
        showPlacementPreview(draggedPieceData, r, c); // Show preview at current drag location
    }

    function handleDragLeave(event) {
        // Clear preview ONLY if leaving the grid board entirely
         const gridContainer = document.getElementById('grid-container');
         const relatedTarget = event.relatedTarget;

         // Check if the relatedTarget (where the mouse entered) is outside the grid-board
         if (!relatedTarget || !gridContainer.contains(relatedTarget)) {
            clearPlacementPreview();
            // lastHoveredCell = null; // Reset if using optimization
         }
    }

    function handleDrop(event) {
        event.preventDefault(); // Prevent default browser action
        clearPlacementPreview(); // Clear preview visual on drop

        const cell = event.target.closest('.cell');
        // Check if drop is valid (on cell, piece was dragged, game not over)
        if (!cell || draggedPieceIndex === null || !draggedPieceData || isGameOver) {
             console.log("Drop failed: Invalid target or state.");
             return;
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
                     // Needs a slight delay to allow render after line clear?
                    setTimeout(() => {
                         triggerGameOverSequence();
                    }, linesWereCleared ? 350 : 50);
                }
            } else {
                 // placePiece returned false, shouldn't happen if isValidPlacement passed, but log just in case
                 console.error("placePiece failed after isValidPlacement passed.");
            }
        } else {
            console.log("Placement invalid at:", r, c);
            // Add brief visual feedback for invalid drop
            gridBoard.classList.add('shake');
            setTimeout(() => gridBoard.classList.remove('shake'), 300);
        }

        // Reset drag state variables - handled by dragEnd now
        // draggedPieceIndex = null;
        // draggedPieceData = null;
    }
    // END DRAG AND DROP HANDLERS

    function showPlacementPreview(piece, startRow, startCol) {
        if (!piece) return;
        const isValid = isValidPlacement(piece, startRow, startCol);

        piece.shape.forEach(([dr, dc]) => {
            const r = startRow + dr;
            const c = startCol + dc;
            // Check bounds only here, validity class handles filled cells
            if (r >= 0 && r < GRID_HEIGHT && c >= 0 && c < GRID_WIDTH) {
                const targetCell = gridBoard.querySelector(`.cell[data-row='${r}'][data-col='${c}']`);
                if (targetCell) {
                     // Add preview class regardless
                     targetCell.classList.add('preview');
                     // Add invalid class ONLY if the placement is generally invalid
                     // OR if this specific target cell is already filled
                     if (!isValid || gridState[r]?.[c] !== null) {
                         targetCell.classList.add('invalid');
                     }
                }
            }
        });
    }


    function clearPlacementPreview() {
        gridBoard.querySelectorAll('.cell.preview').forEach(cell => {
            cell.classList.remove('preview', 'invalid');
        });
        // lastHoveredCell = null; // Reset if using optimization
    }

    // --- Refresh Button / Second Chance Logic ---
    function handleRefreshPieces(isSecondChance = false) {
         if (isGameOver) return; // Cannot refresh if already game over final

         // Hide modals if they are open (e.g., second chance prompt)
        secondChancePrompt.classList.add('hidden');

         // Don't allow manual refresh if moves are available
         if (!isSecondChance && canAnyPieceBePlaced()) {
             console.log("Manual refresh attempted, but moves are available.");
             // Optionally add feedback: "Moves still available!" - maybe flash refresh button red?
             refreshButton.classList.add('shake'); // Re-use shake animation
             setTimeout(() => refreshButton.classList.remove('shake'), 300);
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
             // Re-enable interactions that were disabled by triggerGameOverSequence
             gridBoard.style.pointerEvents = 'auto';
             document.getElementById('bottom-bar').style.pointerEvents = 'auto';
             if (!isMusicMuted) attemptMusicPlay(); // Resume music maybe
         }


         // Generate a completely new set of pieces
         generateNewPieces(true);

         // Check if the NEW set leads to game over immediately
         triggerGameOverSequence(); // This will handle final game over if needed
    }

    // --- Button Event Listeners ---
    refreshButton.addEventListener('click', () => handleRefreshPieces(false)); // Manual refresh
    secondChanceYesButton.addEventListener('click', () => handleRefreshPieces(true)); // Use second chance
    secondChanceNoButton.addEventListener('click', () => {
        // User declined second chance
        console.log("Second chance declined.");
        secondChancePrompt.classList.add('hidden'); // Hide prompt
        hasUsedSecondChance = true; // Mark as used (or declined counts as used)
        triggerGameOverSequence(); // Proceed immediately to final game over check/display
    });
    restartButton.addEventListener('click', startGame); // Restart the game

    // --- Initialization Function ---
    function startGame() {
        console.log("Starting new game...");
        isGameOver = false;
        hasUsedSecondChance = false; // Reset second chance flag
        gridState = []; // Clear grid state
        score = 0;
        loadHighScore(); // Load high score from storage
        currentPieces = []; // Ensure pieces are cleared
        draggedPieceIndex = null; // Reset drag state
        draggedPieceData = null;

        // Hide modals, update score display
        gameOverDisplay.classList.add('hidden');
        secondChancePrompt.classList.add('hidden');
        toggleSettingsPanel(false); // Ensure settings panel is closed
        updateScore(0); // Resets display to 0 and updates high score display if needed

        calculateSizes(); // Calculate sizes based on current viewport FIRST
        createGrid(); // Create grid structure
        generateNewPieces(true); // Get initial pieces (calls renderPiecePreviews)
        renderGrid(); // Render the initial empty grid state

        // Enable interactions
        gridBoard.style.pointerEvents = 'auto';
        document.getElementById('bottom-bar').style.pointerEvents = 'auto';

        updateAudioSettings(); // Apply loaded audio settings
        attemptMusicPlay(); // Try to play music (respects mute state)

        // Initial check: Is it game over immediately? (Unlikely but possible)
        triggerGameOverSequence();
    }

    // --- Resize Handling ---
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            console.log("Resizing, recalculating layout...");
            calculateSizes(); // Recalculate cell sizes
            createGrid(); // Recreate grid with new sizes
            renderGrid(); // Render current state onto new grid
            renderPiecePreviews(); // Render previews with new sizes
        }, 250); // Debounce resize event
    });

    // --- Initial Setup ---
    startGame(); // Start the game when the DOM is ready

}); // End DOMContentLoaded
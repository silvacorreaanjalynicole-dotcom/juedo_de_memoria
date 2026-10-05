/**
 * Card Memory Game - Core Script
 * Features: Grid levels, timer, move counter, Web Audio FX, particle confetti, high scores.
 */

// Icon and Emoji themes definition
const THEMES = {
    emojis: ['🎮', '🚀', '🔮', '💎', '🌈', '🔥', '🦄', '⚡', '🐱', '🍕', '🎨', '🎸', '🌟', '🍩', '🏆', '🎯', '🥑', '👾'],
    tech: ['💻', '⚙️', '🔒', '🌐', '📱', '🔋', '💾', '🤖', '🛰️', '📡', '⚡', '🧠', '☁️', '🕹️', '🛡️', '📊', '📷', '💡'],
    nature: ['🌿', '🌻', '🦁', '🦊', '🦋', '🌊', '🏔️', '🌋', '🌴', '🐬', '🦉', '🍄', '🌸', '🐝', '🍁', '🐘', '🐾', '🌾'],
    space: ['🚀', '🪐', '🌌', '👽', '🛸', '☄️', '🌙', '⭐', '🛰️', '👨‍🚀', '🌍', '🔭', '💥', '✨', '🪐', '☀️', '🌀', '🌠']
};

// Difficulty Configurations
const CONFIGS = {
    easy: { gridClass: 'grid-easy', totalCards: 16, pairsNeeded: 8 },
    medium: { gridClass: 'grid-medium', totalCards: 24, pairsNeeded: 12 },
    hard: { gridClass: 'grid-hard', totalCards: 36, pairsNeeded: 18 }
};

// Game State
let currentDifficulty = 'easy';
let currentTheme = 'emojis';
let cards = [];
let flippedCards = [];
let matchedPairs = 0;
let moves = 0;
let timerInterval = null;
let secondsElapsed = 0;
let isGameRunning = false;
let isBoardLocked = false;
let soundEnabled = true;

// Web Audio API Synthesizer Sound Engine
class SoundEngine {
    constructor() {
        this.ctx = null;
    }

    init() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioCtx();
        }
    }

    playFlip() {
        if (!soundEnabled) return;
        this.init();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.08);
    }

    playMatch() {
        if (!soundEnabled) return;
        this.init();
        const now = this.ctx.currentTime;
        [523.25, 659.25, 783.99].forEach((freq, i) => { // C5, E5, G5 chord
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + i * 0.06);
            gain.gain.setValueAtTime(0.2, now + i * 0.06);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.06 + 0.25);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now + i * 0.06);
            osc.stop(now + i * 0.06 + 0.25);
        });
    }

    playMismatch() {
        if (!soundEnabled) return;
        this.init();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.linearRampToValueAtTime(160, now + 0.15);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.15);
    }

    playVictory() {
        if (!soundEnabled) return;
        this.init();
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        const now = this.ctx.currentTime;
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.12);
            gain.gain.setValueAtTime(0.25, now + idx * 0.12);
            gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.12 + 0.4);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now + idx * 0.12);
            osc.stop(now + idx * 0.12 + 0.4);
        });
    }
}

const sounds = new SoundEngine();

// DOM Elements
const gameGrid = document.getElementById('game-grid');
const startOverlay = document.getElementById('start-overlay');
const startBtn = document.getElementById('start-btn');
const overlayStartBtn = document.getElementById('overlay-start-btn');
const restartBtn = document.getElementById('restart-btn');
const soundToggleBtn = document.getElementById('sound-toggle');
const themeSelect = document.getElementById('theme-select');
const segBtns = document.querySelectorAll('.seg-btn');

const timerDisplay = document.getElementById('timer-display');
const movesDisplay = document.getElementById('moves-display');
const pairsDisplay = document.getElementById('pairs-display');
const bestTimeDisplay = document.getElementById('best-time-display');

const victoryModal = document.getElementById('victory-modal');
const modalTime = document.getElementById('modal-time');
const modalMoves = document.getElementById('modal-moves');
const modalScore = document.getElementById('modal-score');
const playAgainBtn = document.getElementById('play-again-btn');

// Initialize Lucide Icons
if (window.lucide) {
    lucide.createIcons();
}

// Event Listeners Initialization
document.addEventListener('DOMContentLoaded', () => {
    loadBestTime();
    setupEventListeners();
    buildBoard();
});

function setupEventListeners() {
    // Difficulty selectors
    segBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            segBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentDifficulty = e.target.dataset.level;
            resetGame();
        });
    });

    // Theme selector
    themeSelect.addEventListener('change', (e) => {
        currentTheme = e.target.value;
        resetGame();
    });

    // Start Buttons
    startBtn.addEventListener('click', toggleStartPause);
    overlayStartBtn.addEventListener('click', startGame);

    // Restart Button
    restartBtn.addEventListener('click', resetGame);

    // Play Again Modal Button
    playAgainBtn.addEventListener('click', () => {
        victoryModal.classList.remove('active');
        resetGame();
        startGame();
    });

    // Sound toggle
    soundToggleBtn.addEventListener('click', () => {
        soundEnabled = !soundEnabled;
        soundToggleBtn.innerHTML = soundEnabled 
            ? '<i data-lucide="volume-2"></i>' 
            : '<i data-lucide="volume-x"></i>';
        if (window.lucide) lucide.createIcons();
    });
}

// Timer Functions
function startTimer() {
    stopTimer();
    secondsElapsed = 0;
    updateTimerDisplay();
    timerInterval = setInterval(() => {
        secondsElapsed++;
        updateTimerDisplay();
    }, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function updateTimerDisplay() {
    const mins = Math.floor(secondsElapsed / 60).toString().padStart(2, '0');
    const secs = (secondsElapsed % 60).toString().padStart(2, '0');
    timerDisplay.textContent = `${mins}:${secs}`;
}

// Game Flow Functions
function startGame() {
    if (isGameRunning) return;
    isGameRunning = true;
    startOverlay.classList.add('hidden');
    startBtn.querySelector('span').textContent = 'Pausar';
    startBtn.querySelector('i').setAttribute('data-lucide', 'pause');
    if (window.lucide) lucide.createIcons();
    startTimer();
}

function toggleStartPause() {
    if (!isGameRunning) {
        startGame();
    } else {
        // Pause logic
        stopTimer();
        isGameRunning = false;
        startOverlay.classList.remove('hidden');
        document.querySelector('.overlay-content h2').textContent = 'Juego En Pausa';
        document.querySelector('.overlay-content p').textContent = 'Presiona el botón para reanudar la partida.';
        startBtn.querySelector('span').textContent = 'Reanudar';
        startBtn.querySelector('i').setAttribute('data-lucide', 'play');
        if (window.lucide) lucide.createIcons();
    }
}

function resetGame() {
    stopTimer();
    isGameRunning = false;
    isBoardLocked = false;
    flippedCards = [];
    matchedPairs = 0;
    moves = 0;
    secondsElapsed = 0;

    movesDisplay.textContent = '0';
    updateTimerDisplay();
    
    const config = CONFIGS[currentDifficulty];
    pairsDisplay.textContent = `0 / ${config.pairsNeeded}`;
    
    startOverlay.classList.remove('hidden');
    document.querySelector('.overlay-content h2').textContent = '¿Listo para jugar?';
    document.querySelector('.overlay-content p').textContent = 'Selecciona tu nivel de dificultad y presiona "Iniciar Juego" para comenzar.';
    
    startBtn.querySelector('span').textContent = 'Iniciar Juego';
    startBtn.querySelector('i').setAttribute('data-lucide', 'play');
    if (window.lucide) lucide.createIcons();

    loadBestTime();
    buildBoard();
}

// Build and Shuffle Card Grid
function buildBoard() {
    gameGrid.innerHTML = '';
    const config = CONFIGS[currentDifficulty];
    
    // Set grid class
    gameGrid.className = `game-grid ${config.gridClass}`;
    
    // Pick pairs from theme
    const themeItems = THEMES[currentTheme];
    const selectedSymbols = themeItems.slice(0, config.pairsNeeded);
    
    // Duplicate symbols for pairs and shuffle
    const deck = shuffle([...selectedSymbols, ...selectedSymbols]);
    
    cards = deck.map((symbol, index) => {
        const cardEl = document.createElement('div');
        cardEl.className = 'card';
        cardEl.dataset.symbol = symbol;
        cardEl.dataset.index = index;

        cardEl.innerHTML = `
            <div class="card-inner">
                <div class="card-face card-back">
                    <span class="card-back-icon">❓</span>
                </div>
                <div class="card-face card-front">
                    ${symbol}
                </div>
            </div>
        `;

        cardEl.addEventListener('click', () => handleCardClick(cardEl));
        gameGrid.appendChild(cardEl);
        return cardEl;
    });
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Card Interaction Logic
function handleCardClick(cardEl) {
    if (!isGameRunning) {
        startGame();
    }

    if (isBoardLocked) return;
    if (cardEl.classList.contains('flipped') || cardEl.classList.contains('matched')) return;
    if (flippedCards.length >= 2) return;

    // Flip card
    cardEl.classList.add('flipped');
    sounds.playFlip();
    flippedCards.push(cardEl);

    if (flippedCards.length === 2) {
        incrementMoves();
        checkMatch();
    }
}

function incrementMoves() {
    moves++;
    movesDisplay.textContent = moves;
}

function checkMatch() {
    isBoardLocked = true;
    const [card1, card2] = flippedCards;
    const isMatch = card1.dataset.symbol === card2.dataset.symbol;

    if (isMatch) {
        sounds.playMatch();
        card1.classList.add('matched');
        card2.classList.add('matched');
        matchedPairs++;
        
        const config = CONFIGS[currentDifficulty];
        pairsDisplay.textContent = `${matchedPairs} / ${config.pairsNeeded}`;
        
        flippedCards = [];
        isBoardLocked = false;

        if (matchedPairs === config.pairsNeeded) {
            handleVictory();
        }
    } else {
        sounds.playMismatch();
        setTimeout(() => {
            card1.classList.remove('flipped');
            card2.classList.remove('flipped');
            flippedCards = [];
            isBoardLocked = false;
        }, 900);
    }
}

// Victory Condition & Modal
function handleVictory() {
    stopTimer();
    sounds.playVictory();
    
    // Save Best Time
    checkAndSaveBestTime();

    // Calculate score
    const config = CONFIGS[currentDifficulty];
    const baseScore = config.pairsNeeded * 500;
    const timePenalty = secondsElapsed * 10;
    const movePenalty = moves * 20;
    const finalScore = Math.max(100, baseScore - timePenalty - movePenalty);

    // Calculate Star Rating
    const minPossibleMoves = config.pairsNeeded;
    const starsContainer = document.getElementById('stars-container');
    let starCount = 1;
    if (moves <= minPossibleMoves * 1.4) {
        starCount = 3;
    } else if (moves <= minPossibleMoves * 2) {
        starCount = 2;
    }
    
    starsContainer.innerHTML = '';
    for (let i = 1; i <= 3; i++) {
        const star = document.createElement('i');
        star.setAttribute('data-lucide', 'star');
        star.className = `star ${i <= starCount ? 'active' : ''}`;
        starsContainer.appendChild(star);
    }
    if (window.lucide) lucide.createIcons();

    // Set modal stats
    const mins = Math.floor(secondsElapsed / 60).toString().padStart(2, '0');
    const secs = (secondsElapsed % 60).toString().padStart(2, '0');
    modalTime.textContent = `${mins}:${secs}`;
    modalMoves.textContent = moves;
    modalScore.textContent = `${finalScore.toLocaleString()} pts`;

    // Show modal & confetti
    setTimeout(() => {
        victoryModal.classList.add('active');
        triggerConfetti();
    }, 400);
}

// High Scores LocalStorage
function checkAndSaveBestTime() {
    const key = `memory_best_time_${currentDifficulty}`;
    const best = localStorage.getItem(key);
    if (!best || secondsElapsed < parseInt(best, 10)) {
        localStorage.setItem(key, secondsElapsed);
        loadBestTime();
    }
}

function loadBestTime() {
    const key = `memory_best_time_${currentDifficulty}`;
    const best = localStorage.getItem(key);
    if (best) {
        const secsVal = parseInt(best, 10);
        const mins = Math.floor(secsVal / 60).toString().padStart(2, '0');
        const secs = (secsVal % 60).toString().padStart(2, '0');
        bestTimeDisplay.textContent = `${mins}:${secs}`;
    } else {
        bestTimeDisplay.textContent = '--:--';
    }
}

// Canvas Particle Confetti System
function triggerConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    const colors = ['#6366f1', '#06b6d4', '#ec4899', '#10b981', '#f59e0b'];

    for (let i = 0; i < 120; i++) {
        particles.push({
            x: canvas.width / 2,
            y: canvas.height / 2,
            vx: (Math.random() - 0.5) * 16,
            vy: (Math.random() - 0.7) * 16,
            size: Math.random() * 8 + 4,
            color: colors[Math.floor(Math.random() * colors.length)],
            rotation: Math.random() * 360,
            rotSpeed: (Math.random() - 0.5) * 10,
            opacity: 1
        });
    }

    let animationFrame;
    function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let activeParticles = 0;

        particles.forEach(p => {
            if (p.opacity <= 0) return;
            activeParticles++;

            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.3; // Gravity
            p.opacity -= 0.012;
            p.rotation += p.rotSpeed;

            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate((p.rotation * Math.PI) / 180);
            ctx.globalAlpha = Math.max(0, p.opacity);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
            ctx.restore();
        });

        if (activeParticles > 0) {
            animationFrame = requestAnimationFrame(render);
        } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }

    render();
}

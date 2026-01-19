// Update initial state
let currentQuestion = {};
let cellsVisible = true;  // Keep true for initial state
let timerInterval;
let startTime;
let gameActive = false;
let lastSoundTime = 0;
const SOUND_COOLDOWN = 200;
let isPracticeMode = false;

// Add to initial state declarations
let totalProblems = 0;
let solvedProblems = 0;

// Add new state variables
let correctAnswers = 0;

// Remove correctAnswers array since it's not being used

// Add audio pool
const audioPool = new Map();

// Add after the initial state declarations
const STATS_KEY = 'multiplicationTableStats';
let activeStatsView = 'best';

// Add to initial state declarations
const STREAK_KEY = 'multiplicationTableStreak';

function showBestTimeBanner(time) {
    const banner = document.createElement('div');
    banner.className = 'best-time-banner';
    banner.innerHTML = `
        <h3>🏆 Ny Personlig Rekord! 🏆</h3>
        <div class="time">${formatTimeFromMs(time)}</div>
    `;
    document.body.appendChild(banner);

    // Add show class after a small delay for animation
    setTimeout(() => banner.classList.add('show'), 100);

    // Extra firework effect for best time
    fireConfetti();

    // Remove banner after animation
    setTimeout(() => {
        banner.classList.remove('show');
        setTimeout(() => banner.remove(), 500);
    }, 4000);
}

function saveStats(time) {
    const stats = getStats();
    const selectedTables = Array.from(document.querySelectorAll('.table-checkbox:checked'))
        .map(cb => cb.value)
        .sort((a, b) => a - b);
    const tablesKey = selectedTables.join(',');
    
    const newStat = {
        time,
        tables: selectedTables,
        date: new Date().toISOString(),
    };

    // Check if this is a new best time
    const isNewBest = !stats.best[tablesKey] || time < stats.best[tablesKey].time;

    // Add to recent times
    if (!stats.recent[tablesKey]) {
        stats.recent[tablesKey] = [];
    }
    stats.recent[tablesKey].unshift(newStat);
    stats.recent[tablesKey] = stats.recent[tablesKey].slice(0, 5);

    // Update best time
    if (isNewBest) {
        stats.best[tablesKey] = newStat;
        // Show best time banner after a small delay to not conflict with completion banner
        setTimeout(() => showBestTimeBanner(time), 1500);
    }

    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
    updateStatsDisplay();
}

function getStats() {
    const defaultStats = { best: {}, recent: {} };
    try {
        return JSON.parse(localStorage.getItem(STATS_KEY)) || defaultStats;
    } catch {
        return defaultStats;
    }
}

function formatTimeFromMs(ms) {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const milliseconds = Math.floor((ms % 1000) / 10);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
}

function updateStatsDisplay() {
    const stats = getStats();
    const content = document.getElementById('statisticsContent');
    const data = activeStatsView === 'best' ? stats.best : stats.recent;
    
    if (Object.keys(data).length === 0) {
        content.innerHTML = '<p class="no-stats">Ingen tider registreret endnu</p>';
        return;
    }

    const entries = Object.entries(data)
        .map(([tables, stat]) => {
            if (Array.isArray(stat)) {
                // Recent times
                return stat.map(entry => ({
                    tables: entry.tables,
                    time: entry.time,
                    date: new Date(entry.date)
                }));
            } else {
                // Best time
                return [{
                    tables: stat.tables,
                    time: stat.time,
                    date: new Date(stat.date)
                }];
            }
        })
        .flat()
        .sort((a, b) => {
            if (activeStatsView === 'recent') {
                return b.date - a.date; // Latest first for recent view
            }
            return a.time - b.time; // Fastest first for best times
        });

    content.innerHTML = entries.map(stat => `
        <div class="stat-entry">
            <div class="stat-info">
                <span class="stat-time">${formatTimeFromMs(stat.time)}</span>
                <span class="stat-date">${stat.date.toLocaleDateString()}</span>
            </div>
            <span class="stat-tables">Tabel ${stat.tables.join(', ')}</span>
        </div>
    `).join('');
}

function togglePractice() {
    isPracticeMode = true;
    if (gameActive) {
        stopGame();
        document.getElementById('practiceToggle').textContent = 'Start Træning';
        document.querySelector('.game-buttons').classList.remove('practice-mode');
    } else {
        startGame();
        document.getElementById('practiceToggle').textContent = 'Stop Træning';
        document.querySelector('.game-buttons').classList.add('practice-mode');
    }
}

// Modify toggleGame function
function toggleGame() {
    isPracticeMode = false;
    if (gameActive) {
        stopGame();
        document.getElementById('gameToggle').textContent = 'Start Tidsløb';
        document.getElementById('practiceToggle').classList.remove('hidden');
    } else {
        startGame();
        document.getElementById('gameToggle').textContent = 'Stop Tidsløb';
        document.getElementById('practiceToggle').classList.add('hidden');
    }
}

function resetGame() {
    const cells = document.querySelectorAll('.cell');
    cells.forEach(cell => {
        cell.textContent = cell.getAttribute('data-value');
        cell.classList.remove('hidden-value', 'correct', 'incorrect', 'solved');
    });
    document.getElementById('feedback').textContent = '';
    document.getElementById('question').textContent = '';
    document.getElementById('answer').value = '';
    document.getElementById('timer').textContent = '00:00.00';
    document.getElementById('timer').classList.remove('active');
    document.getElementById('gameInputGroup').classList.remove('active');
    document.getElementById('gameToggle').textContent = 'Start Tidsløb';
    gameActive = false;
    cellsVisible = true;
    document.body.classList.remove('hide-cells'); // Add this line
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    document.querySelector('.progress-container').classList.remove('active');
    solvedProblems = 0;
    totalProblems = 0;
    updateProgress();
}

// Modify startGame function
function startGame() {
    // Check if any tables are selected
    const selectedTables = document.querySelectorAll('.table-checkbox:checked');
    if (selectedTables.length === 0) {
        document.getElementById('feedback').textContent = 'Vælg mindst én tabel for at starte spillet';
        return;
    }

    resetGame(); // Only reset when explicitly starting
    gameActive = true;
    
    if (!isPracticeMode) {
        startTime = Date.now();
        timerInterval = setInterval(updateTimer, 10);
        document.getElementById('timer').classList.add('active');
    }
    
    // Calculate total problems based on selected checkboxes
    totalProblems = selectedTables.length * 10;
    solvedProblems = 0;
    correctAnswers = 0;  // Reset correct answers counter
    updateProgress();
    
    // Show progress bar
    document.querySelector('.progress-container').classList.add('active');
    
    const cells = document.querySelectorAll('.cell');
    cells.forEach(cell => {
        cell.textContent = '?';
        cell.classList.add('hidden-value');
    });
    cellsVisible = false;
    document.body.classList.add('hide-cells'); // Add this line
    
    if (isPracticeMode) {
        document.getElementById('practiceToggle').textContent = 'Stop Træning';
        document.getElementById('gameToggle').disabled = true;
    } else {
        document.getElementById('gameToggle').textContent = 'Stop Tidsløb';
        document.getElementById('practiceToggle').disabled = true;
    }
    
    document.getElementById('gameInputGroup').classList.add('active');
    document.getElementById('answer').disabled = false;
    document.getElementById('feedback').textContent = '';  // Clear any previous feedback
    generateQuestion();
}

// Update stopGame function to only save stats when explicitly stopping
function stopGame() {
    if (!gameActive) return;
    
    gameActive = false;
    clearInterval(timerInterval);
    
    const cells = document.querySelectorAll('.cell');
    cells.forEach(cell => {
        // Reset all cells to their original state
        cell.textContent = cell.getAttribute('data-value');
        cell.classList.remove('hidden-value', 'solved', 'correct', 'incorrect');
    });
    
    document.getElementById('gameInputGroup').classList.remove('active');
    document.getElementById('timer').classList.remove('active');
    document.getElementById('question').textContent = '';
    document.getElementById('answer').value = '';
    document.getElementById('answer').disabled = true;
    document.getElementById('feedback').textContent = 'Spillet er stoppet';
    
    // Reset visibility state
    cellsVisible = true;
    document.body.classList.remove('hide-cells');
    document.querySelector('.progress-container').classList.remove('active');
    
    document.getElementById('gameToggle').disabled = false;
    document.getElementById('practiceToggle').disabled = false;
    
    // Reset button visibility
    document.getElementById('practiceToggle').classList.remove('hidden');
    document.querySelector('.game-buttons').classList.remove('practice-mode');
    
    if (isPracticeMode) {
        document.getElementById('feedback').textContent = 'Øvelse afsluttet';
    }
}

function updateTimer() {
    const elapsed = Date.now() - startTime;
    const minutes = Math.floor(elapsed / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    const milliseconds = Math.floor((elapsed % 1000) / 10);
    document.getElementById('timer').textContent = 
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
}

function toggleCells(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    const cells = document.querySelectorAll('.cell');
    cellsVisible = !cellsVisible;
    document.body.classList.toggle('hide-cells', !cellsVisible);
    
    requestAnimationFrame(() => {
        cells.forEach(cell => {
            if (gameActive && cell.classList.contains('solved')) {
                // Keep solved cells visible and green
                cell.classList.remove('hidden-value');
                return;
            }
            
            // Toggle other cells
            if (cellsVisible) {
                cell.textContent = cell.getAttribute('data-value');
                cell.classList.remove('hidden-value');
            } else {
                cell.textContent = '?';
                cell.classList.add('hidden-value');
            }
        });
    });
}

// ...existing code...

// Modify generateQuestion function
function generateQuestion() {
    if (!gameActive) return;
    const selectedValues = Array.from(document.querySelectorAll('.table-checkbox:checked')).map(cb => parseInt(cb.value, 10));
    const unsolvedCells = [];
    
    selectedValues.forEach(num1 => {
        for (let col = 1; col <= 10; col++) {
            const cell = document.querySelector(`#multiplicationTable tbody tr:nth-child(${num1}) td:nth-child(${col + 1})`);
            if (cell && !cell.classList.contains('solved')) {
                unsolvedCells.push({ 
                    row: num1,
                    col: col + 1,
                    num1: col,
                    num2: num1
                });
            }
        }
    });

    if (unsolvedCells.length === 0) {
        if (!isPracticeMode) {
            const endTime = Date.now();
            const totalTime = endTime - startTime;
            saveStats(totalTime);

            const finalTime = formatTimeFromMs(totalTime);
            document.getElementById('completionSound').play();
            showAchievementBanner(`Fantastisk! Du klarede det på ${finalTime}!`);
            fireConfetti();
            document.getElementById('feedback').textContent = `Alle opgaver er løst! Din tid: ${finalTime}`;
        } else {
            document.getElementById('completionSound').play();
            const score = Math.round((correctAnswers / totalProblems) * 100);
            showAchievementBanner(`Øvelse færdig! Du fik ${correctAnswers} ud af ${totalProblems} rigtige (${score}%)`);
            fireConfetti();
            document.getElementById('feedback').textContent = 
                `Øvelse afsluttet! Du fik ${correctAnswers} rigtige ud af ${totalProblems} spørgsmål (${score}%)`;
        }
        
        document.getElementById('gameInputGroup').classList.remove('active');
        document.getElementById('answer').value = '';
        document.getElementById('answer').disabled = true;
        
        // Reset game mode buttons
        document.getElementById('gameToggle').disabled = false;
        document.getElementById('practiceToggle').disabled = false;
        document.getElementById('practiceToggle').classList.remove('hidden');
        document.querySelector('.game-buttons').classList.remove('practice-mode');
        
        if (isPracticeMode) {
            document.getElementById('practiceToggle').textContent = 'Start Træning';
        } else {
            document.getElementById('gameToggle').textContent = 'Start Tidsløb';
        }
        
        gameActive = false;
        clearInterval(timerInterval);
        return;
    }

    const randomIndex = Math.floor(Math.random() * unsolvedCells.length);
    currentQuestion = unsolvedCells[randomIndex];
    currentQuestion.answer = currentQuestion.num1 * currentQuestion.num2;
    document.getElementById('question').textContent = `${currentQuestion.num1} x ${currentQuestion.num2} = `;
    document.getElementById('answer').value = '';
    document.getElementById('answer').disabled = false;
    document.getElementById('feedback').textContent = '';
    document.getElementById('answer').focus();
}

// Remove the audio pool related code and update the playSound function
function playSound(soundId) {
    const now = Date.now();
    if (now - lastSoundTime < SOUND_COOLDOWN) return;
    lastSoundTime = now;

    // Get or create audio pool for this sound
    if (!audioPool.has(soundId)) {
        audioPool.set(soundId, []);
    }
    const pool = audioPool.get(soundId);

    // Find available audio element or create new one
    let sound = pool.find(audio => audio.ended || audio.paused);
    if (!sound) {
        const originalAudio = document.getElementById(soundId);
        if (!originalAudio) return;
        
        sound = new Audio(originalAudio.querySelector('source').src);
        sound.volume = 0.3;
        pool.push(sound);
        
        // Limit pool size
        if (pool.length > 3) {
            pool.shift();
        }
    }

    sound.currentTime = 0;
    sound.play().catch(() => {});
}

// Modify checkAnswer function
function checkAnswer() {
    if (!gameActive) return;
    
    const answer = document.getElementById('answer');
    const feedback = document.getElementById('feedback');
    
    // Check for empty input
    if (!answer.value.trim()) {
        feedback.textContent = 'Indtast et tal';
        feedback.classList.add('error');
        answer.classList.add('error');
        answer.focus();
        
        setTimeout(() => {
            feedback.classList.remove('error');
            answer.classList.remove('error');
        }, 600);
        return;
    }
    
    const userAnswer = parseInt(answer.value, 10);
    const cell = document.querySelector(`#multiplicationTable tbody tr:nth-child(${currentQuestion.row}) td:nth-child(${currentQuestion.col})`);
    const checkButton = document.querySelector('.game-input-group button');
    
    if (userAnswer === currentQuestion.answer) {
        cell.textContent = currentQuestion.answer;
        cell.classList.remove('hidden-value', 'incorrect');
        cell.classList.add('correct', 'solved');
        
        // Add success indication
        answer.classList.add('success');
        setTimeout(() => {
            answer.classList.remove('success');
        }, 600);

        document.getElementById('answer').value = '';
        playSound('correctSound');
        if (isPracticeMode) correctAnswers++;
        
        solvedProblems++;
        updateProgress();
        
        // Update streak on first correct answer
        updateStreak();
        
        generateQuestion();
    } else {
        cell.classList.add('incorrect');
        answer.classList.add('error');
        playSound('incorrectSound');
        
        // Add visual feedback for both modes
        checkButton.classList.add('shake');
        feedback.textContent = 'Forkert svar - prøv igen!';
        feedback.classList.add('error');
        
        setTimeout(() => {
            cell.classList.remove('incorrect');
            checkButton.classList.remove('shake');
            feedback.classList.remove('error');
            answer.classList.remove('error');
        }, 600);
        
        if (isPracticeMode) {
            // In practice mode, wait for the feedback animation to complete before showing answer
            setTimeout(() => {
                cell.textContent = currentQuestion.answer;
                cell.classList.remove('hidden-value', 'correct');
                cell.classList.add('incorrect', 'solved');
                document.getElementById('answer').value = '';
                
                solvedProblems++;
                updateProgress();
                
                generateQuestion();
            }, 800);
        } else {
            document.getElementById('answer').select();
        }
    }
}

function updateProgress() {
    const progressFill = document.querySelector('.progress-fill');
    const progressText = document.querySelector('#progressText');
    const percentage = (solvedProblems / totalProblems) * 100;
    
    progressFill.style.width = `${percentage}%`;
    progressText.textContent = `${solvedProblems}/${totalProblems}`;
}

function handleKeyDown(event) {
    if (event.key === 'Enter') {
        checkAnswer();
    }
}

// This creates the confetti explosion when completing the game
function fireConfetti() {
    function createFirework() {
        const colors = ['#6C63FF', '#FF6B6B', '#4CAF50', '#FDD835'];
        const startX = 0.1 + Math.random() * 0.8;
        
        confetti({
            particleCount: 1,
            startVelocity: 60,
            gravity: 1,
            spread: 0,
            origin: { x: startX, y: 1 },
            colors: [colors[Math.floor(Math.random() * colors.length)]],
            ticks: 200,
            scalar: 1
        });

        setTimeout(() => {
            confetti({
                particleCount: 100,
                startVelocity: 30,
                gravity: 0.5,
                spread: 360,
                origin: { x: startX, y: 0.5 },
                colors: colors,
                ticks: 200,
                scalar: 1.2,
                shapes: ['circle']
            });
        }, 1000);
    }

    let fireworkCount = 5;
    for(let i = 0; i < fireworkCount; i++) {
        setTimeout(createFirework, i * 600);
    }
}

function showAchievementBanner(message) {
    const banner = document.createElement('div');
    banner.className = 'achievement-banner';
    banner.textContent = message;
    document.body.appendChild(banner);
    
    setTimeout(() => banner.classList.add('show'), 100);
    setTimeout(() => {
        banner.classList.remove('show');
        setTimeout(() => banner.remove(), 500);
    }, 3000);
}

function initializeCellClicks() {
    const cells = document.querySelectorAll('.cell');
    cells.forEach(cell => {
        cell.addEventListener('click', () => {
            if (!gameActive && !cell.classList.contains('solved')) {
                if (cell.textContent === '?') {
                    cell.textContent = cell.getAttribute('data-value');
                    cell.classList.remove('hidden-value');
                } else {
                    cell.textContent = '?';
                    cell.classList.add('hidden-value');
                }
            }
        });
    });
}

function initializeTable() {
    const cells = document.querySelectorAll('.cell');
    cells.forEach(cell => {
        cell.textContent = cell.getAttribute('data-value');
        cell.classList.remove('hidden-value');
    });
    cellsVisible = true;
    document.body.classList.remove('hide-cells'); // Add this line
}

// ...existing code...

function resetStats() {
    if (confirm('Er du sikker på at du vil nulstille alle statistikker? Dette kan ikke fortrydes.')) {
        localStorage.removeItem(STATS_KEY);
        updateStatsDisplay();
        showAchievementBanner('Statistik er blevet nulstillet');
    }
}

function updateStreak() {
    const today = new Date().toLocaleDateString();
    const streakData = getStreakData();
    
    if (streakData.lastPlayed !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayString = yesterday.toLocaleDateString();
        
        if (streakData.lastPlayed !== yesterdayString) {
            // Reset streak if last play wasn't yesterday
            streakData.currentStreak = 1;
        } else {
            // Increment streak
            streakData.currentStreak++;
        }
        streakData.lastPlayed = today;
        localStorage.setItem(STREAK_KEY, JSON.stringify(streakData));
    }
    
    updateStreakDisplay(streakData.currentStreak);
}

function getStreakData() {
    const defaultData = { currentStreak: 0, lastPlayed: null };
    try {
        return JSON.parse(localStorage.getItem(STREAK_KEY)) || defaultData;
    } catch {
        return defaultData;
    }
}

function updateStreakDisplay(streak) {
    const starsContainer = document.querySelector('.streak-stars');
    const streakInfo = document.querySelector('.streak-info');
    
    // Clear existing stars
    starsContainer.innerHTML = '';
    
    // Add stars (max 7 stars shown)
    const starsToShow = Math.min(streak, 7);
    for (let i = 0; i < starsToShow; i++) {
        const star = document.createElement('div');
        star.innerHTML = '⭐';
        star.className = 'star';
        star.style.animationDelay = `${i * 100}ms`;
        starsContainer.appendChild(star);
    }
    
    // Update streak text
    streakInfo.textContent = `${streak} ${streak === 1 ? 'dags' : 'dages'} streak`;
}

document.addEventListener('DOMContentLoaded', () => {
    const answerInput = document.getElementById('answer');
    
    // Handle input changes
    answerInput.addEventListener('input', function(e) {
        // Remove non-numeric characters
        this.value = this.value.replace(/[^0-9]/g, '');
        
        const userAnswer = parseInt(this.value, 10);
        // Only check if we have a valid number and the game is active
        if (!isNaN(userAnswer) && gameActive && userAnswer === currentQuestion.answer) {
            setTimeout(() => checkAnswer(), 200); // Small delay for better UX
        }
    });

    // Handle focus events for iOS
    answerInput.addEventListener('focus', function() {
        // Scroll the input into view on iOS
        setTimeout(() => {
            this.scrollIntoViewIfNeeded();
        }, 300);
    });

    initializeTable();
    initializeCellClicks();
    
    // Prevent default touch behavior on the toggle button
    const toggleButton = document.querySelector('.visibility-toggle');
    ['click', 'touchend'].forEach(eventType => {
        toggleButton.addEventListener(eventType, (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleCells(e);
        }, { passive: false });
    });

    // Add tab handling
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            activeStatsView = button.dataset.view;
            updateStatsDisplay();
        });
    });

    // Add reset stats handler
    document.getElementById('resetStats').addEventListener('click', resetStats);
    
    // Initial stats display
    updateStatsDisplay();
    
    // Initial streak display
    const streakData = getStreakData();
    updateStreakDisplay(streakData.currentStreak);
});

// Register Service Worker for PWA functionality
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js');
}

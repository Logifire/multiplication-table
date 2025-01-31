// Update initial state
let currentQuestion = {};
let cellsVisible = true;  // Keep true for initial state
let timerInterval;
let startTime;
let gameActive = false;
let lastSoundTime = 0;
const SOUND_COOLDOWN = 200;

// Add to initial state declarations
let totalProblems = 0;
let solvedProblems = 0;

// Add this after the initial state declarations
const correctAnswers = [];
for (let i = 1; i <= 10; i++) {
    for (let j = 1; j <= 10; j++) {
        correctAnswers.push(i * j);
    }
}

// Add after the initial state declarations
const STATS_KEY = 'multiplicationTableStats';
let activeStatsView = 'best';

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

    // Add to recent times
    if (!stats.recent[tablesKey]) {
        stats.recent[tablesKey] = [];
    }
    stats.recent[tablesKey].unshift(newStat);
    stats.recent[tablesKey] = stats.recent[tablesKey].slice(0, 5); // Keep only last 5

    // Update best time
    if (!stats.best[tablesKey] || time < stats.best[tablesKey].time) {
        stats.best[tablesKey] = newStat;
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
        .sort((a, b) => a.time - b.time);

    content.innerHTML = entries.map(stat => `
        <div class="stat-entry">
            <div class="stat-info">
                <span class="stat-time">${formatTimeFromMs(stat.time)}</span>
                <span class="stat-date">${stat.date.toLocaleDateString()}</span>
            </div>
            <span class="stat-tables">Tabeller: ${stat.tables.join(', ')}</span>
        </div>
    `).join('');
}

function toggleGame() {
    if (gameActive) {
        stopGame();
        document.getElementById('gameToggle').textContent = 'Start Spillet';
    } else {
        startGame();
        document.getElementById('gameToggle').textContent = 'Stop Spillet';
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
    document.getElementById('gameToggle').textContent = 'Start Spillet';
    gameActive = false;
    cellsVisible = true;
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    document.querySelector('.progress-container').classList.remove('active');
    solvedProblems = 0;
    totalProblems = 0;
    updateProgress();
}

function startGame() {
    resetGame(); // Only reset when explicitly starting
    gameActive = true;
    startTime = Date.now();
    timerInterval = setInterval(updateTimer, 10);
    
    // Calculate total problems based on selected checkboxes
    const selectedValues = Array.from(document.querySelectorAll('.table-checkbox:checked')).length;
    totalProblems = selectedValues * 10;
    solvedProblems = 0;
    updateProgress();
    
    // Show progress bar
    document.querySelector('.progress-container').classList.add('active');
    
    const cells = document.querySelectorAll('.cell');
    cells.forEach(cell => {
        cell.textContent = '?';
        cell.classList.add('hidden-value');
    });
    
    document.getElementById('gameToggle').textContent = 'Stop Spillet';
    document.getElementById('gameInputGroup').classList.add('active');
    document.getElementById('timer').classList.add('active');
    document.getElementById('answer').disabled = false;
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
        const endTime = Date.now();
        const totalTime = endTime - startTime;
        saveStats(totalTime); // Save stats when game is completed

        const finalTime = formatTimeFromMs(totalTime);
        document.getElementById('completionSound').play();
        showAchievementBanner(`Fantastisk! Du klarede det på ${finalTime}!`);
        fireConfetti();
        
        document.getElementById('gameInputGroup').classList.remove('active');
        document.getElementById('answer').value = '';
        document.getElementById('answer').disabled = true;
        document.getElementById('gameToggle').textContent = 'Start Nyt Spil';
        document.getElementById('feedback').textContent = `Alle opgaver er løst! Din tid: ${finalTime}`;
        
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
    // Create new audio element each time for iOS
    const originalAudio = document.getElementById(soundId);
    if (!originalAudio) return;

    const sound = new Audio(originalAudio.querySelector('source').src);
    sound.volume = 0.3;
    
    // Play immediately and remove when done
    sound.play()
        .then(() => {
            sound.addEventListener('ended', () => {
                sound.remove();
            });
        })
        .catch(() => {
            sound.remove();
        });
}

function checkAnswer() {
    if (!gameActive) return;
    const userAnswer = parseInt(document.getElementById('answer').value, 10);
    const cell = document.querySelector(`#multiplicationTable tbody tr:nth-child(${currentQuestion.row}) td:nth-child(${currentQuestion.col})`);
    
    if (userAnswer === currentQuestion.answer) {
        cell.textContent = currentQuestion.answer;
        cell.classList.remove('hidden-value', 'incorrect');
        cell.classList.add('correct', 'solved');
        document.getElementById('answer').value = '';

        playSound('correctSound');

        solvedProblems++;
        updateProgress();

        generateQuestion();
    } else {
        cell.classList.add('incorrect');
        playSound('incorrectSound');
        setTimeout(() => cell.classList.remove('incorrect'), 500);
        document.getElementById('answer').select();
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
}

// Initialize cell clicks when page loads
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

    // Initial stats display
    updateStatsDisplay();
});

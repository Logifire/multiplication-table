// Update initial state
let currentQuestion = {};
let cellsVisible = true;  // Keep true for initial state
let timerInterval;
let startTime;
let gameActive = false;
let lastSoundTime = 0;
const SOUND_COOLDOWN = 200;

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
}

function startGame() {
    resetGame(); // Only reset when explicitly starting
    gameActive = true;
    startTime = Date.now();
    timerInterval = setInterval(updateTimer, 10);
    
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

function generateQuestion() {
    if (!gameActive) return;
    const selectedValues = Array.from(document.querySelectorAll('.table-checkbox:checked')).map(cb => parseInt(cb.value, 10));
    const unsolvedCells = [];
    
    selectedValues.forEach(num1 => {
        for (let col = 1; col <= 10; col++) {
            const cell = document.querySelector(`#multiplicationTable tbody tr:nth-child(${num1}) td:nth-child(${col + 1})`);
            if (cell && !cell.classList.contains('solved')) {
                unsolvedCells.push({ 
                    row: num1,     // Rækken er den valgte talrække
                    col: col + 1,  // Kolonnen (+1 for at kompensere for th)
                    num1: col,     // Første faktor (fra kolonnen)
                    num2: num1     // Anden faktor (fra rækken)
                });
            }
        }
    });

    if (unsolvedCells.length === 0) {
        const finalTime = document.getElementById('timer').textContent;
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

function playSound(soundId) {
    const sound = document.getElementById(soundId);
    if (sound) {
        sound.currentTime = 0;
        sound.volume = 0.3;
        const playPromise = sound.play();
        if (playPromise) {
            playPromise.catch(() => {});
        }
    }
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

        requestAnimationFrame(() => {
            const rect = cell.getBoundingClientRect();
            for (let i = 0; i < 5; i++) {
                createNumberParticle(
                    rect.left + rect.width / 2,
                    rect.top + rect.height / 2,
                    userAnswer
                );
            }
        });

        generateQuestion();
    } else {
        cell.classList.add('incorrect');
        playSound('incorrectSound');
        setTimeout(() => cell.classList.remove('incorrect'), 500);
        document.getElementById('answer').select();
    }
}

function handleKeyDown(event) {
    if (event.key === 'Enter') {
        checkAnswer();
    }
}

function createNumberParticle(x, y, number) {
    const particle = document.createElement('div');
    particle.textContent = number;
    particle.style.cssText = `
        position: fixed;
        left: ${x}px;
        top: ${y}px;
        font-size: 24px;
        color: var(--success-color);
        pointer-events: none;
        z-index: 1000;
    `;
    document.body.appendChild(particle);

    const angle = Math.random() * Math.PI * 2;
    const velocity = 2 + Math.random() * 2;
    let opacity = 1;

    function animate() {
        const dx = Math.cos(angle) * velocity;
        const dy = Math.sin(angle) * velocity - 2;
        x += dx;
        y += dy;
        opacity -= 0.02;

        particle.style.transform = `translate(${x}px, ${y}px)`;
        particle.style.opacity = opacity;

        if (opacity > 0) {
            requestAnimationFrame(animate);
        } else {
            particle.remove();
        }
    }
    animate();
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

// Initialize cell clicks when page loads
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('answer').addEventListener('input', function(e) {
        if (this.value.length >= 3) { // Changed from 2 to 3 to allow for 100
            checkAnswer();
        }
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
});

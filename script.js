
// ==================== КОНФИГУРАЦИЯ УРОВНЕЙ ====================
// Здесь настраивается логика каждого уровня
const LEVELS_CONFIG = [
    {
        id: 1,
        title: "Зеленая Долина",
        type: "coins", // Сбор монет
        target: 20,
        speedMod: 1.0,
        desc: "Собери 20 золотых монет, чтобы открыть портал.",
        icon: "🪙",
        diff: "Новичок"
    },
    {
        id: 2,
        title: "Испытание Временем",
        type: "time", // Выживание по времени
        target: 60, // Секунды
        speedMod: 1.2,
        desc: "Продержись 60 секунд в этом опасном мире.",
        icon: "⏱️",
        diff: "Любитель"
    },
    {
        id: 3,
        title: "Скоростной Забег",
        type: "jumps", // Количество прыжков
        target: 50,
        speedMod: 1.8, // Быстрее
        desc: "Прыгни на 50 платформ. Осторожно, скорость увеличена!",
        icon: "🟩",
        diff: "Эксперт"
    }
    // Можно добавить еще уровни здесь...
];

const TOTAL_LEVELS = 20; // Всего слотов в сетке
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score-hud');
const mainMenu = document.getElementById('mainMenu');
const levelSelectScreen = document.getElementById('levelSelect');
const levelPreviewScreen = document.getElementById('levelPreview');
const gameOverScreen = document.getElementById('gameOverScreen');
const levelsGrid = document.getElementById('levels-grid');

// Элементы превью
const prevTitle = document.getElementById('prevTitle');
const prevIcon = document.getElementById('prevIcon');
const prevDesc = document.getElementById('prevDesc');
const prevDiff = document.getElementById('prevDiff');

// Элементы конца игры
const finalScoreValue = document.getElementById('finalScoreValue');
const endStatus = document.getElementById('endStatus');

// Состояние
let maxUnlockedLevel = parseInt(localStorage.getItem('jumpSkok_maxLevel')) || 1;
let selectedLevelId = null;
let currentLevelConfig = null;

// Аудио
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playTone(type) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    const now = audioCtx.currentTime;

    if (type === 'jump') {
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
        gainNode.gain.setValueAtTime(0.2, now);
        gainNode.gain.linearRampToValueAtTime(0, now + 0.1);
        osc.start(now); osc.stop(now + 0.1);
    } else if (type === 'coin') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.setValueAtTime(1800, now + 0.05);
        gainNode.gain.setValueAtTime(0.1, now);
        gainNode.gain.linearRampToValueAtTime(0, now + 0.1);
        osc.start(now); osc.stop(now + 0.1);
    } else if (type === 'die') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.3);
        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.linearRampToValueAtTime(0, now + 0.3);
        osc.start(now); osc.stop(now + 0.3);
    } else if (type === 'win') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.linearRampToValueAtTime(800, now + 0.2);
        gainNode.gain.setValueAtTime(0.2, now);
        gainNode.gain.linearRampToValueAtTime(0, now + 0.4);
        osc.start(now); osc.stop(now + 0.4);
    }
}

// Игровая логика
const GRAVITY = 0.6;
const JUMP_FORCE = -13;
let player = { x: 180, y: 400, width: 30, height: 40, vy: 0, jumping: false };
let platforms = [];
let coins = [];
let score = 0; // Основной счетчик (монеты или прыжки)
let gameTime = 0; // Для уровня на время
let gameRunning = false;
let lastTime = 0;
let animationId;
let touchX = player.x;
let isTouching = false;

// ==================== ИНТЕРФЕЙС ====================

function showLevelSelect() {
    mainMenu.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    levelPreviewScreen.classList.add('hidden');
    levelSelectScreen.classList.remove('hidden');
    renderLevels();
}

function renderLevels() {
    levelsGrid.innerHTML = '';
    for (let i = 1; i <= TOTAL_LEVELS; i++) {
        const btn = document.createElement('div');
        btn.className = 'level-node';

        // Проверяем, есть ли конфиг для этого уровня (для отображения звезды)
        const config = LEVELS_CONFIG.find(l => l.id === i);
        const isConfigured = !!config;

        if (i > maxUnlockedLevel) {
            btn.classList.add('locked');
        } else {
            btn.textContent = i;
            if (i < maxUnlockedLevel || (isConfigured && i === maxUnlockedLevel && false)) {
                // Звездочка только если строго меньше (пройден ранее)
                // Или можно хранить массив пройденных, но пока упростим:
                // Если уровень открыт, значит мы его хотя бы начали.
                // Для простоты: звезда если < maxUnlocked
                btn.classList.add('completed');
            }
            btn.onclick = () => openPreview(i);
        }
        levelsGrid.appendChild(btn);
    }
}

function openPreview(id) {
    selectedLevelId = id;
    // Находим конфиг или создаем дефолтный для будущих уровней
    const config = LEVELS_CONFIG.find(l => l.id === id) || {
        title: `Уровень ${id}`,
        desc: "Стандартный уровень. Прыгай как можно выше!",
        icon: "❓",
        diff: "Нормально",
        type: "score",
        target: 100
    };
    currentLevelConfig = config;

    prevTitle.textContent = config.title;
    prevIcon.textContent = config.icon;
    prevDesc.textContent = config.desc;
    prevDiff.textContent = config.diff;

    levelSelectScreen.classList.add('hidden');
    levelPreviewScreen.classList.remove('hidden');
}

function backToGrid() {
    levelPreviewScreen.classList.add('hidden');
    levelSelectScreen.classList.remove('hidden');
}

function confirmStartLevel() {
    levelPreviewScreen.classList.add('hidden');
    startGame(currentLevelConfig);
}

function startGame(config) {
    currentLevelConfig = config;
    scoreElement.style.display = 'block';

    resetGameVariables();
    gameRunning = true;
    lastTime = performance.now();
    gameLoop(lastTime);
}

function restartLevel() {
    gameOverScreen.classList.add('hidden');
    startGame(currentLevelConfig);
}

function toMainMenu() {
    levelSelectScreen.classList.add('hidden');
    levelPreviewScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    mainMenu.classList.remove('hidden');
    scoreElement.style.display = 'none';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawClouds();
}

function checkWinCondition() {
    if (!currentLevelConfig) return false;

    let won = false;
    if (currentLevelConfig.type === 'coins' && score >= currentLevelConfig.target) won = true;
    if (currentLevelConfig.type === 'jumps' && score >= currentLevelConfig.target) won = true;
    if (currentLevelConfig.type === 'time' && gameTime >= currentLevelConfig.target) won = true;

    if (won) {
        finishLevel(true);
    }
}

function finishLevel(success) {
    gameRunning = false;
    cancelAnimationFrame(animationId);

    if (success) {
        playTone('win');
        endStatus.textContent = "УРОВЕНЬ ПРОЙДЕН!";
        endStatus.className = "status-msg status-success";
        finalScoreValue.textContent = currentLevelConfig.icon; // Показываем иконку вместо очков

        // Открываем следующий уровень
        if (selectedLevelId === maxUnlockedLevel && maxUnlockedLevel < TOTAL_LEVELS) {
            maxUnlockedLevel++;
            localStorage.setItem('jumpSkok_maxLevel', maxUnlockedLevel);
        }
    } else {
        playTone('die');
        endStatus.textContent = "НЕУДАЧА";
        endStatus.className = "status-msg status-fail";
        // Показываем прогресс
        if (currentLevelConfig.type === 'time') {
             finalScoreValue.textContent = Math.floor(gameTime) + " сек";
        } else {
             finalScoreValue.textContent = score + " / " + currentLevelConfig.target;
        }
    }

    setTimeout(() => {
        gameOverScreen.classList.remove('hidden');
    }, 500);
}

function resetGameVariables() {
    player.x = canvas.width / 2 - 15;
    player.y = 400;
    player.vy = 0;
    score = 0;
    gameTime = 0;
    generatePlatforms();
    updateHUD();
}

function updateHUD() {
    if (!currentLevelConfig) return;

    let text = "";
    if (currentLevelConfig.type === 'coins') {
        text = `🪙 ${score} / ${currentLevelConfig.target}`;
    } else if (currentLevelConfig.type === 'jumps') {
        text = `🟩 Прыжки: ${score} / ${currentLevelConfig.target}`;
    } else if (currentLevelConfig.type === 'time') {
        text = `⏱️ ${Math.floor(gameTime)} / ${currentLevelConfig.target} сек`;
    } else {
        text = `Счёт: ${score}`;
    }
    scoreElement.textContent = text;
}

// ==================== ДВИЖОК ИГРЫ ====================

function generatePlatforms() {
    platforms = [];
    coins = [];
    platforms.push({ x: 150, y: 500, width: 100, height: 15 });
    for (let i = 1; i < 8; i++) createPlatform(i * 90);
}

function createPlatform(yPos) {
    let p = { x: Math.random() * (canvas.width - 90), y: yPos, width: 80 + Math.random() * 30, height: 15 };
    platforms.push(p);
    if (Math.random() < 0.6) {
        coins.push({ x: p.x + p.width/2 - 10, y: p.y - 30, width: 20, height: 20, collected: false });
    }
}

// Доработка логики прыжков для уровня 3
let lastJumpState = false;

function gameLoop(timestamp) {
    if (!gameRunning) return;

    const dt = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawClouds();

    // Обновление времени для уровня на время
    if (currentLevelConfig.type === 'time') {
        gameTime += dt;
        updateHUD();
        checkWinCondition();
        if (!gameRunning) return;
    }

    // Управление
    if (isTouching) {
        const dx = touchX - (player.x + player.width / 2);
        player.x += dx * 0.15;
    }

    // Физика
    player.vy += GRAVITY;
    player.y += player.vy;
    if (player.x + player.width < 0) player.x = canvas.width;
    if (player.x > canvas.width) player.x = -player.width;

    // Платформы
    const speedMultiplier = currentLevelConfig ? currentLevelConfig.speedMod : 1.0;
    const moveSpeed = 2.0 * speedMultiplier;

    let onGround = false;

    for (let p of platforms) {
        p.y += moveSpeed;

        // Столкновение
        if (player.vy > 0 &&
            player.x + player.width > p.x &&
            player.x < p.x + p.width &&
            player.y + player.height > p.y &&
            player.y + player.height - player.vy <= p.y + 10) {

            player.y = p.y - player.height;
            player.vy = 0;
            player.jumping = false;
            onGround = true;
        }

        // Респаун
        if (p.y > canvas.height) {
            p.y = -20;
            p.x = Math.random() * (canvas.width - p.width);
            p.width = 80 + Math.random() * 30;

            if (Math.random() < 0.5) {
                coins.push({ x: p.x + p.width/2 - 10, y: p.y - 30, width: 20, height: 20, collected: false });
            }
        }
    }

    // Подсчет прыжков для уровня 3 (тип "jumps")
    // Считаем +1 за каждое приземление на платформу
    if (currentLevelConfig.type === 'jumps') {
        if (onGround && !lastJumpState) {
            score++;
            updateHUD();
            checkWinCondition();
        }
    }
    lastJumpState = onGround;

    // Монетки
    for (let i = coins.length - 1; i >= 0; i--) {
        let c = coins[i];
        if (!c.collected &&
            player.x < c.x + c.width && player.x + player.width > c.x &&
            player.y < c.y + c.height && player.y + player.height > c.y) {

            c.collected = true;
            if (currentLevelConfig.type === 'coins') {
                score++;
                updateHUD();
                checkWinCondition();
            }
            playTone('coin');
        }
        if (c.collected) coins.splice(i, 1);
        else {
            c.y += moveSpeed;
            if (c.y > canvas.height) coins.splice(i, 1);
        }
    }

    // Проверка смерти
    if (player.y > canvas.height) {
        finishLevel(false);
    }

    drawGameObjects();

    if (gameRunning) {
        animationId = requestAnimationFrame(gameLoop);
    }
}


function drawClouds() {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.beginPath(); ctx.arc(50, 100, 30, 0, Math.PI*2); ctx.arc(90, 100, 40, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(250, 250, 25, 0, Math.PI*2); ctx.arc(290, 250, 35, 0, Math.PI*2); ctx.fill();
}

function drawGameObjects() {
    ctx.fillStyle = '#66BB6A';
    for (let p of platforms) {
        const radius = Math.min(8, p.height / 2);
        ctx.beginPath();
        ctx.roundRect(p.x, p.y, p.width, p.height, radius);
        ctx.fill();
    }
    ctx.fillStyle = '#FFD700';
    for (let c of coins) {
        if(!c.collected) { ctx.beginPath(); ctx.arc(c.x+10, c.y+10, 8, 0, Math.PI*2); ctx.fill(); }
    }
    // Герой
    ctx.fillStyle = '#FF5722';
    ctx.fillRect(player.x, player.y, player.width, player.height);
    ctx.fillStyle = 'white';
    ctx.beginPath(); ctx.arc(player.x+10, player.y+12, 5, 0, Math.PI*2); ctx.arc(player.x+20, player.y+12, 5, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = 'black';
    ctx.beginPath(); ctx.arc(player.x+10, player.y+12, 2, 0, Math.PI*2); ctx.arc(player.x+20, player.y+12, 2, 0, Math.PI*2); ctx.fill();
}

function jump() {
    if (gameRunning) {
        player.vy = JUMP_FORCE;
        playTone('jump');
    }
}

// Обработчики ввода
canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    if (!gameRunning) return;
    isTouching = true;
    touchX = e.touches[0].clientX - canvas.getBoundingClientRect().left;
    jump();
}, {passive: false});

canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    if (!gameRunning) return;
    touchX = e.touches[0].clientX - canvas.getBoundingClientRect().left;
}, {passive: false});

canvas.addEventListener('touchend', () => isTouching = false);

canvas.addEventListener('mousedown', e => {
    if (!gameRunning) return;
    isTouching = true;
    touchX = e.offsetX;
    jump();
});
canvas.addEventListener('mousemove', e => { if(isTouching) touchX = e.offsetX; });
canvas.addEventListener('mouseup', () => isTouching = false);

drawClouds();

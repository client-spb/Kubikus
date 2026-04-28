
// ==================== ТИПЫ ПЛАТФОРМ ====================
const PLATFORM_TYPES = {
    GRASS: { 
        id: 'grass', 
        name: 'Трава', 
        color: '#66BB6A', 
        friction: 1.0, 
        damage: false,
        icon: '🌿'
    },
    ICE: { 
        id: 'ice', 
        name: 'Лёд', 
        color: '#A5D8FF', 
        friction: 0.3, 
        damage: false,
        icon: '🧊'
    },
    SNOW: { 
        id: 'snow', 
        name: 'Снег', 
        color: '#E8F4F8', 
        friction: 0.6, 
        damage: false,
        icon: '❄️'
    },
    SPIKES: { 
        id: 'spikes', 
        name: 'Шипы', 
        color: '#E74C3C', 
        friction: 0.8, 
        damage: true,
        icon: '🔺'
    },
    STONE: { 
        id: 'stone', 
        name: 'Камень', 
        color: '#7F8C8D', 
        friction: 0.9, 
        damage: false,
        icon: '🪨'
    }
};

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
        diff: "Новичок",
        platforms: [
            { type: 'grass', chance: 5 },
            { type: 'stone', chance: 2 }
        ]
    },
    {
        id: 2,
        title: "Испытание Временем",
        type: "time", // Выживание по времени
        target: 60, // Секунды
        speedMod: 1.2,
        desc: "Продержись 60 секунд в этом опасном мире.",
        icon: "⏱️",
        diff: "Любитель",
        platforms: [
            { type: 'snow', chance: 4 },
            { type: 'ice', chance: 3 },
            { type: 'grass', chance: 2 }
        ]
    },
    {
        id: 3,
        title: "Скоростной Забег",
        type: "jumps", // Количество прыжков
        target: 50,
        speedMod: 1.8, // Быстрее
        desc: "Прыгни на 50 платформ. Осторожно, скорость увеличена!",
        icon: "🟩",
        diff: "Эксперт",
        platforms: [
            { type: 'stone', chance: 5 },
            { type: 'spikes', chance: 2 },
            { type: 'ice', chance: 3 }
        ]
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
    landedPlatforms.clear(); // Очищаем набор приземлившихся платформ
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

// Функция выбора типа платформы на основе настроек уровня
function getRandomPlatformType() {
    if (!currentLevelConfig || !currentLevelConfig.platforms) {
        return PLATFORM_TYPES.GRASS;
    }
    
    // Собираем все шансы
    let totalChance = 0;
    const platformChances = currentLevelConfig.platforms.map(p => {
        totalChance += p.chance;
        return { type: p.type, chance: p.chance };
    });
    
    // Генерируем случайное число
    let random = Math.random() * totalChance;
    
    // Выбираем тип платформы
    for (let pc of platformChances) {
        if (random < pc.chance) {
            return Object.values(PLATFORM_TYPES).find(pt => pt.id === pc.type) || PLATFORM_TYPES.GRASS;
        }
        random -= pc.chance;
    }
    
    return PLATFORM_TYPES.GRASS;
}

function generatePlatforms() {
    platforms = [];
    coins = [];
    // Стартовая платформа всегда безопасная (трава)
    platforms.push({ 
        x: 150, 
        y: 500, 
        width: 100, 
        height: 15,
        type: PLATFORM_TYPES.GRASS
    });
    for (let i = 1; i < 8; i++) {
        createPlatform(i * 90);
    }
}

function createPlatform(yPos) {
    const platformType = getRandomPlatformType();
    let p = { 
        x: Math.random() * (canvas.width - 90), 
        y: yPos, 
        width: 80 + Math.random() * 30, 
        height: 15,
        type: platformType
    };
    platforms.push(p);
    if (Math.random() < 0.6 && !platformType.damage) {
        coins.push({ x: p.x + p.width/2 - 10, y: p.y - 30, width: 20, height: 20, collected: false });
    }
}

// Доработка логики прыжков для уровня 3
let lastJumpState = false;
let landedPlatforms = new Set(); // Для отслеживания уникальных платформ

// Загрузка фонового изображения
const backgroundImage = new Image();
backgroundImage.src = 'assets/background.svg';
let backgroundLoaded = false;
let castleOffsetY = 0; // Смещение замка для эффекта подъема

backgroundImage.onload = () => {
    backgroundLoaded = true;
};

function drawBackground() {
    if (backgroundLoaded) {
        // Рисуем небо (статичное)
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#87CEEB');
        gradient.addColorStop(1, '#E0F7FA');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Рисуем замок с эффектом параллакса (движется медленно вниз при подъеме игрока)
        ctx.save();
        ctx.translate(0, castleOffsetY % 400); // Зацикливаем движение
        
        // Рисуем замок из SVG вручную (так как мы не можем двигать части SVG отдельно)
        // Основной корпус
        ctx.fillStyle = '#D3D3D3';
        ctx.strokeStyle = '#A9A9A9';
        ctx.lineWidth = 2;
        ctx.fillRect(100, 200, 200, 400);
        ctx.strokeRect(100, 200, 200, 400);
        
        // Башни
        ctx.fillStyle = '#C0C0C0';
        ctx.fillRect(80, 250, 60, 350);
        ctx.strokeRect(80, 250, 60, 350);
        ctx.fillRect(260, 250, 60, 350);
        ctx.strokeRect(260, 250, 60, 350);
        ctx.fillStyle = '#D3D3D3';
        ctx.fillRect(170, 150, 60, 450);
        ctx.strokeRect(170, 150, 60, 450);
        
        // Крыши башен
        ctx.fillStyle = '#FF6B6B';
        ctx.strokeStyle = '#C92A2A';
        ctx.beginPath();
        ctx.moveTo(70, 250);
        ctx.lineTo(110, 200);
        ctx.lineTo(150, 250);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(250, 250);
        ctx.lineTo(290, 200);
        ctx.lineTo(330, 250);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(160, 150);
        ctx.lineTo(200, 100);
        ctx.lineTo(240, 150);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // Флаги
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(110, 200);
        ctx.lineTo(110, 170);
        ctx.stroke();
        
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.moveTo(110, 170);
        ctx.lineTo(140, 185);
        ctx.lineTo(110, 200);
        ctx.closePath();
        ctx.fill();
        
        ctx.strokeStyle = '#555';
        ctx.beginPath();
        ctx.moveTo(290, 200);
        ctx.lineTo(290, 170);
        ctx.stroke();
        
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.moveTo(290, 170);
        ctx.lineTo(320, 185);
        ctx.lineTo(290, 200);
        ctx.closePath();
        ctx.fill();
        
        ctx.strokeStyle = '#555';
        ctx.beginPath();
        ctx.moveTo(200, 100);
        ctx.lineTo(200, 60);
        ctx.stroke();
        
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.moveTo(200, 60);
        ctx.lineTo(230, 75);
        ctx.lineTo(200, 90);
        ctx.closePath();
        ctx.fill();
        
        // Окна
        ctx.fillStyle = '#87CEEB';
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 1;
        ctx.fillRect(110, 300, 20, 30);
        ctx.strokeRect(110, 300, 20, 30);
        ctx.fillRect(270, 300, 20, 30);
        ctx.strokeRect(270, 300, 20, 30);
        ctx.fillRect(185, 250, 30, 40);
        ctx.strokeRect(185, 250, 30, 40);
        ctx.fillRect(110, 400, 20, 30);
        ctx.strokeRect(110, 400, 20, 30);
        ctx.fillRect(270, 400, 20, 30);
        ctx.strokeRect(270, 400, 20, 30);
        ctx.fillRect(185, 350, 30, 40);
        ctx.strokeRect(185, 350, 30, 40);
        
        // Ворота
        ctx.fillStyle = '#5D4037';
        ctx.strokeStyle = '#3E2723';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(170, 600);
        ctx.lineTo(170, 500);
        ctx.quadraticCurveTo(200, 480, 230, 500);
        ctx.lineTo(230, 600);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        ctx.restore();
        
        // Рисуем холмы (передний план, движется быстрее замка но медленнее платформ)
        const hillOffset = (castleOffsetY * 0.5) % 200;
        ctx.fillStyle = 'rgba(144, 238, 144, 0.8)';
        ctx.beginPath();
        ctx.moveTo(0, 500 + hillOffset);
        ctx.quadraticCurveTo(100, 450 + hillOffset, 200, 500 + hillOffset);
        ctx.quadraticCurveTo(300, 550 + hillOffset, 400, 500 + hillOffset);
        ctx.lineTo(400, 600);
        ctx.lineTo(0, 600);
        ctx.closePath();
        ctx.fill();
        
        ctx.fillStyle = 'rgba(50, 205, 50, 0.6)';
        ctx.beginPath();
        ctx.moveTo(0, 520 + hillOffset * 0.8);
        ctx.quadraticCurveTo(150, 480 + hillOffset * 0.8, 300, 520 + hillOffset * 0.8);
        ctx.quadraticCurveTo(350, 540 + hillOffset * 0.8, 400, 510 + hillOffset * 0.8);
        ctx.lineTo(400, 600);
        ctx.lineTo(0, 600);
        ctx.closePath();
        ctx.fill();
        
        // Солнце
        const sunPulse = Math.sin(Date.now() / 500) * 2;
        ctx.filter = 'blur(2.5px)';
        ctx.fillStyle = 'rgba(255, 215, 0, 0.9)';
        ctx.beginPath();
        ctx.arc(320, 80, 40 + sunPulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.filter = 'none';
        
        // Облака
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        // Облако 1
        ctx.beginPath();
        ctx.arc(50, 100, 20, 0, Math.PI * 2);
        ctx.arc(70, 90, 25, 0, Math.PI * 2);
        ctx.arc(90, 100, 20, 0, Math.PI * 2);
        ctx.rect(50, 100, 60, 20);
        ctx.fill();
        
        // Облако 2
        ctx.beginPath();
        ctx.arc(250, 150, 15, 0, Math.PI * 2);
        ctx.arc(270, 140, 20, 0, Math.PI * 2);
        ctx.arc(290, 150, 15, 0, Math.PI * 2);
        ctx.rect(250, 150, 50, 15);
        ctx.fill();
    } else {
        // Резервный градиент, если картинка еще не загрузилась
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#4FC3F7');
        gradient.addColorStop(0.5, '#B3E5FC');
        gradient.addColorStop(1, '#E1F5FE');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
}

function gameLoop(timestamp) {
    if (!gameRunning) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground();

    if (currentLevelConfig.type === 'time') {
        gameTime += (timestamp - lastTime) / 1000;
        updateHUD();
        checkWinCondition();
        if(!gameRunning) return;
    }
    lastTime = timestamp;

    if (isTouching) {
        const dx = touchX - (player.x + player.width / 2);
        player.x += dx * 0.15;
    }

    player.vy += GRAVITY;
    player.y += player.vy;
    if (player.x + player.width < 0) player.x = canvas.width;
    if (player.x > canvas.width) player.x = -player.width;

    const speedMultiplier = currentLevelConfig ? currentLevelConfig.speedMod : 1.0;
    const moveSpeed = 2.0 * speedMultiplier;
    
    // Обновляем смещение замка для эффекта подъема (замок движется медленнее платформ)
    castleOffsetY += moveSpeed * 0.3;

    let onGround = false;

    for (let p of platforms) {
        p.y += moveSpeed;
        
        // Создаем уникальный ID для платформы
        if (!p.id) {
            p.id = Math.random().toString(36).substr(2, 9);
        }
        
        if (player.vy > 0 &&
            player.x + player.width > p.x &&
            player.x < p.x + p.width &&
            player.y + player.height > p.y &&
            player.y + player.height - player.vy <= p.y + 10) {

            // Проверка на шипы - мгновенная смерть
            if (p.type && p.type.damage) {
                finishLevel(false);
                return;
            }

            player.y = p.y - player.height;
            player.vy = 0;
            onGround = true;

            // Логика для уровня "Прыжки" (Тип 3)
            // Считаем только новые платформы
            if (currentLevelConfig.type === 'jumps' && !landedPlatforms.has(p.id)) {
                landedPlatforms.add(p.id);
                score++;
                updateHUD();
                checkWinCondition();
            }
        }
        if (p.y > canvas.height) {
            p.y = -20;
            p.x = Math.random() * (canvas.width - p.width);
            p.width = 80 + Math.random() * 30;
            // При респауне выбираем новый тип платформы
            const newPlatformType = getRandomPlatformType();
            p.type = newPlatformType;
            p.id = Math.random().toString(36).substr(2, 9); // Новый ID
            
            if (Math.random() < 0.5 && !newPlatformType.damage) {
                coins.push({ x: p.x + p.width/2 - 10, y: p.y - 30, width: 20, height: 20, collected: false });
            }
        }
    }

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

    if (player.y > canvas.height) finishLevel(false);

    drawGameObjects();
    if (gameRunning) animationId = requestAnimationFrame(gameLoop);
}


function drawClouds() {
    // Облака теперь нарисованы на фоновом изображении, но добавим еще для глубины
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.beginPath(); ctx.arc(50, 100, 30, 0, Math.PI*2); ctx.arc(90, 100, 40, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(250, 250, 25, 0, Math.PI*2); ctx.arc(290, 250, 35, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(500, 150, 35, 0, Math.PI*2); ctx.arc(545, 150, 45, 0, Math.PI*2); ctx.fill();
}

function drawGameObjects() {
    // Отрисовка платформ с учетом их типа
    for (let p of platforms) {
        const platformType = p.type || PLATFORM_TYPES.GRASS;
        
        // Основной цвет платформы
        ctx.fillStyle = platformType.color;
        ctx.fillRect(p.x, p.y, p.width, p.height);
        
        // Декоративная обводка
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineWidth = 2;
        ctx.strokeRect(p.x, p.y, p.width, p.height);
        
        // Если это шипы - рисуем треугольники сверху
        if (platformType.id === 'spikes') {
            ctx.fillStyle = '#C0392B';
            const spikeCount = Math.floor(p.width / 15);
            for (let i = 0; i < spikeCount; i++) {
                ctx.beginPath();
                ctx.moveTo(p.x + i * 15, p.y);
                ctx.lineTo(p.x + i * 15 + 7.5, p.y - 12);
                ctx.lineTo(p.x + i * 15 + 15, p.y);
                ctx.fill();
            }
        }
        
        // Если это снег или лёд - добавляем блеск
        if (platformType.id === 'snow' || platformType.id === 'ice') {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.fillRect(p.x + 5, p.y + 3, p.width - 10, 3);
        }
        
        // Если это камень - добавляем текстуру
        if (platformType.id === 'stone') {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
            for (let i = 0; i < 3; i++) {
                const rx = p.x + Math.random() * p.width;
                const ry = p.y + Math.random() * p.height;
                ctx.fillRect(rx, ry, 4, 3);
            }
        }
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


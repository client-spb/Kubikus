
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
            { type: 'grass', chance: 10 }
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

// ==================== АУДИО СИСТЕМА ====================
// Используем Web Audio API для качественных синтезированных звуков
// и фоновой музыки из файла

let audioCtx = null;
let bgmAudio = null;
let isBgmPlaying = false;

// Инициализация аудио контекста
function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

// Состояние звука (включен/выключен) - единое для всех звуков
let allSoundEnabled = localStorage.getItem('jumpSkok_allSoundEnabled') !== 'false';

// Функция переключения всех звуков (эффекты + музыка)
function toggleAllSound() {
    allSoundEnabled = !allSoundEnabled;
    localStorage.setItem('jumpSkok_allSoundEnabled', allSoundEnabled);
    updateAllSoundIcon();
    
    // Управление фоновой музыкой
    if (allSoundEnabled && gameRunning) {
        startBGM();
    } else {
        stopBGM();
    }
}

// Обновление иконки звука
function updateAllSoundIcon() {
    const soundIcon = document.getElementById('soundIcon');
    const soundBtn = document.getElementById('soundToggleBtn');
    
    if (allSoundEnabled) {
        soundIcon.textContent = '🔊';
        soundBtn.classList.remove('muted');
        soundBtn.title = 'Выключить все звуки';
    } else {
        soundIcon.textContent = '🔇';
        soundBtn.classList.add('muted');
        soundBtn.title = 'Включить все звуки';
    }
}

// Обратная совместимость - старые функции теперь используют единый флаг
function toggleSound() {
    toggleAllSound();
}

function toggleBGM() {
    toggleAllSound();
}

// Проверка включения звука для эффектов
function isSoundEnabled() {
    return allSoundEnabled;
}

// ==================== СИНТЕЗИРОВАННЫЕ ЗВУКИ ====================

// Звук прыжка - короткий восходящий тон
function playJumpSound() {
    if (!allSoundEnabled || !audioCtx) return;
    
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    oscillator.frequency.setValueAtTime(300, audioCtx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
    
    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.1);
}

// Звук сбора монеты - приятный звонкий звук
function playCoinSound() {
    if (!allSoundEnabled || !audioCtx) return;
    
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(1760, audioCtx.currentTime + 0.15);
    
    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
    
    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.3);
    
    // Добавляем второй тон для гармонии
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1100, audioCtx.currentTime);
    gain2.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
    osc2.start(audioCtx.currentTime);
    osc2.stop(audioCtx.currentTime + 0.2);
}

// Звук проигрыша - нисходящий неприятный аккорд
function playDeathSound() {
    if (!allSoundEnabled || !audioCtx) return;
    
    // Базовый тон
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(200, audioCtx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.5);
    
    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
    
    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.5);
    
    // Второй тон для диссонанса
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(180, audioCtx.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(45, audioCtx.currentTime + 0.5);
    gain2.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
    osc2.start(audioCtx.currentTime);
    osc2.stop(audioCtx.currentTime + 0.5);
}

// Звук победы - мажорный аккорд
function playWinSound() {
    if (!allSoundEnabled || !audioCtx) return;
    
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C major arpeggio
    
    notes.forEach((freq, i) => {
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        oscillator.type = 'sine';
        oscillator.frequency.value = freq;
        
        const startTime = audioCtx.currentTime + i * 0.1;
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.25, startTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.4);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + 0.5);
    });
}

// Звук приземления на платформу (тихий)
function playLandSound() {
    if (!allSoundEnabled || !audioCtx) return;
    
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    oscillator.frequency.setValueAtTime(150, audioCtx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.05);
    
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);
    
    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.05);
}

// ==================== ФОНОВАЯ МУЗЫКА ====================
// Используем аудиофайл background.mp3 из папки assets/audio/

function startBGM() {
    if (!allSoundEnabled || isBgmPlaying) return;
    
    // Создаем HTML5 Audio элемент для фоновой музыки
    bgmAudio = new Audio('assets/audio/background.mp3');
    bgmAudio.loop = true;
    bgmAudio.volume = 0.3; // Тихая громкость для фона (30%)
    
    // Запускаем музыку
    bgmAudio.play().then(() => {
        isBgmPlaying = true;
    }).catch(error => {
        console.log('Не удалось воспроизвести фоновую музыку:', error);
        isBgmPlaying = false;
    });
}

function stopBGM() {
    isBgmPlaying = false;
    if (bgmAudio) {
        bgmAudio.pause();
        bgmAudio.currentTime = 0;
        bgmAudio = null;
    }
}

// Универсальная функция воспроизведения звука (для обратной совместимости)
function playSound(type) {
    initAudio();
    
    switch(type) {
        case 'jump':
            playJumpSound();
            break;
        case 'coin':
            playCoinSound();
            break;
        case 'die':
            playDeathSound();
            break;
        case 'win':
            playWinSound();
            break;
        case 'land':
            playLandSound();
            break;
    }
}

// Старая функция для совместимости
function playTone(type) {
    playSound(type);
}

// Игровая логика
const GRAVITY = 0.6;
const JUMP_FORCE = -13;
let player = { x: 180, y: 400, width: 30, height: 40, vy: 0, jumping: false };
let platforms = [];
let coins = [];
let animatedCoins = []; // Монеты для анимации полета к счетчику
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
    
    // Инициализируем аудио контекст при старте игры
    initAudio();
    
    // Инициализируем элементы фона при старте игры
    initBackgroundElements();

    resetGameVariables();
    landedPlatforms.clear(); // Очищаем набор приземлившихся платформ
    gameRunning = true;
    lastTime = performance.now();
    
    // Запускаем фоновую музыку если включена
    if (allSoundEnabled) {
        startBGM();
    }
    
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
    
    // Останавливаем фоновую музыку при выходе в меню
    stopBGM();
    
    drawBackground();
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
    
    // Останавливаем музыку при завершении уровня (победа или поражение)
    stopBGM();

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
    // Герой появляется в самом верху экрана
    player.y = 50;
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
    const startY = 500;
    platforms.push({ 
        x: 150, 
        y: startY, 
        width: 100, 
        height: 15,
        type: PLATFORM_TYPES.GRASS
    });
    // Для первого уровня создаём меньше платформ
    const platformCount = currentLevelConfig && currentLevelConfig.id === 1 ? 5 : 7;
    let lastY = startY;
    for (let i = 1; i <= platformCount; i++) {
        const yPos = lastY - 90; // Фиксированный шаг вниз
        createPlatform(yPos, lastY);
        lastY = platforms[platforms.length - 1].y; // Обновляем lastY с учетом корректировки
    }
}

function createPlatform(yPos, previousY) {
    // Для первого уровня - только зеленые платформы
    let platformType;
    if (currentLevelConfig && currentLevelConfig.id === 1) {
        platformType = PLATFORM_TYPES.GRASS;
    } else {
        platformType = getRandomPlatformType();
    }
    
    // Ограничиваем максимальное вертикальное расстояние
    // Максимальная высота прыжка: (13^2) / (2 * 0.6) ≈ 141 пиксель
    // Делаем с запасом - не более 100 пикселей между платформами
    const maxVerticalGap = 100;
    let actualY = yPos;
    if (previousY !== undefined && (previousY - yPos) > maxVerticalGap) {
        actualY = previousY - maxVerticalGap;
    }
    
    let p = { 
        x: Math.random() * (canvas.width - 90), 
        y: actualY, 
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

// Анимационные параметры для фона
let bgOffset = 0;
let bgParallaxSpeed = 0; // Глобальная переменная для параллакс-эффекта
let cloudPositions = [];
let planetPositions = [];
let dandelionPositions = [];

// Инициализация позиций для анимации
function initBackgroundElements() {
    // Позиции облаков для уровня 1
    cloudPositions = [];
    for (let i = 0; i < 6; i++) {
        cloudPositions.push({
            x: Math.random() * canvas.width,
            y: Math.random() * 200 + 50,
            size: Math.random() * 40 + 30,
            speed: Math.random() * 0.3 + 0.2
        });
    }
    
    // Позиции планет для уровня 2+
    planetPositions = [];
    for (let i = 0; i < 5; i++) {
        planetPositions.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 30 + 15,
            speed: Math.random() * 0.2 + 0.1,
            color: `hsl(${Math.random() * 360}, 70%, 60%)`
        });
    }
    
    // Позиции одуванчиков для уровня 1
    dandelionPositions = [];
    for (let i = 0; i < 8; i++) {
        dandelionPositions.push({
            x: Math.random() * canvas.width,
            y: Math.random() * 100 + 500,
            size: Math.random() * 8 + 6,
            sway: Math.random() * Math.PI * 2
        });
    }
}

function drawBackground() {
    const levelId = currentLevelConfig ? currentLevelConfig.id : 1;
    const time = Date.now() * 0.001;
    
    // Обновляем смещение для параллакса (теперь зависит от скорости движения платформ)
    bgOffset += bgParallaxSpeed;
    
    if (levelId === 1) {
        // ===== УРОВЕНЬ 1: ЗЕЛЕНАЯ ПОЛЯНА =====
        
        // Небо (градиент)
        const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        skyGradient.addColorStop(0, '#87CEEB');
        skyGradient.addColorStop(0.5, '#B0E0E6');
        skyGradient.addColorStop(1, '#98FB98');
        ctx.fillStyle = skyGradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Солнце
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(canvas.width - 60, 60, 40, 0, Math.PI * 2);
        ctx.fill();
        
        // Солнечные лучи
        for (let i = 0; i < 8; i++) {
            const angle = (time * 0.5) + (i * Math.PI / 4);
            const rayLength = 60 + Math.sin(time * 2 + i) * 10;
            ctx.strokeStyle = `rgba(255, 215, 0, 0.3)`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(canvas.width - 60 + Math.cos(angle) * 40, 60 + Math.sin(angle) * 40);
            ctx.lineTo(canvas.width - 60 + Math.cos(angle) * rayLength, 60 + Math.sin(angle) * rayLength);
            ctx.stroke();
        }
        
        // Горы на заднем плане (параллакс - движутся медленно вниз)
        ctx.fillStyle = '#6B8E6B';
        ctx.beginPath();
        const bgMountainOffset = bgOffset * 0.3;
        ctx.moveTo(0, canvas.height - 150 + bgMountainOffset);
        for (let i = 0; i <= canvas.width; i += 50) {
            const mountainHeight = 80 + Math.sin((i + bgOffset * 0.3) * 0.05) * 40 + Math.sin((i + bgOffset * 0.3) * 0.1) * 20;
            ctx.lineTo(i, canvas.height - 150 + bgMountainOffset - mountainHeight);
        }
        ctx.lineTo(canvas.width, canvas.height);
        ctx.lineTo(0, canvas.height);
        ctx.closePath();
        ctx.fill();
        
        // Горы на переднем плане (параллакс - движутся быстрее вниз)
        ctx.fillStyle = '#4A6B4A';
        ctx.beginPath();
        const fgMountainOffset = bgOffset * 0.5;
        ctx.moveTo(0, canvas.height - 100 + fgMountainOffset);
        for (let i = 0; i <= canvas.width; i += 40) {
            const mountainHeight = 50 + Math.sin((i - bgOffset * 0.5) * 0.08) * 25;
            ctx.lineTo(i, canvas.height - 100 + fgMountainOffset - mountainHeight);
        }
        ctx.lineTo(canvas.width, canvas.height);
        ctx.lineTo(0, canvas.height);
        ctx.closePath();
        ctx.fill();
        
        // Зеленая поляна (трава)
        const grassGradient = ctx.createLinearGradient(0, canvas.height - 80, 0, canvas.height);
        grassGradient.addColorStop(0, '#7CFC00');
        grassGradient.addColorStop(1, '#228B22');
        ctx.fillStyle = grassGradient;
        ctx.fillRect(0, canvas.height - 80, canvas.width, 80);
        
        // Одуванчики (движутся с учетом параллакса)
        for (let i = 0; i < dandelionPositions.length; i++) {
            const d = dandelionPositions[i];
            const swayOffset = Math.sin(time * 2 + d.sway) * 5;
            d.y += bgParallaxSpeed * 0.8; // Одуванчики движутся вниз
            if (d.y > canvas.height + 100) {
                d.y = -100;
                d.x = Math.random() * canvas.width;
            }
            
            // Стебель
            ctx.strokeStyle = '#228B22';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(d.x, d.y);
            ctx.quadraticCurveTo(d.x + swayOffset, d.y - 20, d.x + swayOffset * 0.5, d.y - 40);
            ctx.stroke();
            
            // Головка одуванчика
            ctx.fillStyle = '#FFFACD';
            ctx.beginPath();
            ctx.arc(d.x + swayOffset * 0.5, d.y - 45, d.size, 0, Math.PI * 2);
            ctx.fill();
            
            // Семена (пушинки)
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            for (let j = 0; j < 8; j++) {
                const seedAngle = (j / 8) * Math.PI * 2;
                const seedDist = d.size * 0.7;
                ctx.beginPath();
                ctx.arc(
                    d.x + swayOffset * 0.5 + Math.cos(seedAngle) * seedDist,
                    d.y - 45 + Math.sin(seedAngle) * seedDist,
                    2, 0, Math.PI * 2
                );
                ctx.fill();
            }
        }
        
        // Облака (движутся с учетом параллакса)
        for (let i = 0; i < cloudPositions.length; i++) {
            const c = cloudPositions[i];
            c.x += c.speed;
            c.y += bgParallaxSpeed * 0.5; // Облака движутся вниз медленнее платформ
            if (c.x > canvas.width + c.size * 2) {
                c.x = -c.size * 2;
            }
            if (c.y > canvas.height + c.size * 2) {
                c.y = -c.size * 2;
            }
            
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.beginPath();
            ctx.arc(c.x, c.y, c.size, 0, Math.PI * 2);
            ctx.arc(c.x + c.size * 0.8, c.y - c.size * 0.2, c.size * 0.7, 0, Math.PI * 2);
            ctx.arc(c.x + c.size * 1.5, c.y, c.size * 0.9, 0, Math.PI * 2);
            ctx.arc(c.x + c.size * 0.5, c.y + c.size * 0.3, c.size * 0.6, 0, Math.PI * 2);
            ctx.fill();
        }
        
    } else {
        // ===== УРОВЕНЬ 2+: КОСМОС =====
        
        // Космический градиент
        const spaceGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        spaceGradient.addColorStop(0, '#0B0014');
        spaceGradient.addColorStop(0.3, '#1A0033');
        spaceGradient.addColorStop(0.7, '#2D004D');
        spaceGradient.addColorStop(1, '#4B0082');
        ctx.fillStyle = spaceGradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Звезды (мерцающие)
        for (let i = 0; i < 100; i++) {
            const starX = (i * 37) % canvas.width;
            const starY = (i * 53) % canvas.height;
            const twinkle = Math.sin(time * 3 + i) * 0.5 + 0.5;
            const starSize = 1 + twinkle * 1.5;
            
            ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + twinkle * 0.7})`;
            ctx.beginPath();
            ctx.arc(starX, starY, starSize, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Млечный путь (размытая полоса)
        const milkyWayGradient = ctx.createRadialGradient(
            canvas.width * 0.3, canvas.height * 0.4, 0,
            canvas.width * 0.3, canvas.height * 0.4, canvas.width * 0.5
        );
        milkyWayGradient.addColorStop(0, 'rgba(150, 100, 200, 0.15)');
        milkyWayGradient.addColorStop(0.5, 'rgba(100, 50, 150, 0.08)');
        milkyWayGradient.addColorStop(1, 'transparent');
        ctx.fillStyle = milkyWayGradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Планеты (движутся с учетом параллакса)
        for (let i = 0; i < planetPositions.length; i++) {
            const p = planetPositions[i];
            p.y += p.speed + bgParallaxSpeed * 0.3; // Планеты движутся вниз медленнее платформ
            if (p.y > canvas.height + p.size * 2) {
                p.y = -p.size * 2;
                p.x = Math.random() * canvas.width;
            }
            
            // Тело планеты
            const planetGradient = ctx.createRadialGradient(
                p.x - p.size * 0.3, p.y - p.size * 0.3, 0,
                p.x, p.y, p.size
            );
            planetGradient.addColorStop(0, p.color);
            planetGradient.addColorStop(0.7, p.color);
            planetGradient.addColorStop(1, 'rgba(0, 0, 0, 0.5)');
            
            ctx.fillStyle = planetGradient;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            
            // Кольца у некоторых планет
            if (i % 2 === 0 && p.size > 20) {
                ctx.strokeStyle = 'rgba(200, 180, 150, 0.6)';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.ellipse(p.x, p.y, p.size * 1.8, p.size * 0.5, Math.PI * 0.1, 0, Math.PI * 2);
                ctx.stroke();
            }
        }
        
        // Падающие звезды (периодически)
        if (Math.sin(time * 0.5) > 0.8) {
            const meteorX = ((time * 50) % canvas.width);
            const meteorY = ((time * 80) % (canvas.height / 2));
            
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(meteorX, meteorY);
            ctx.lineTo(meteorX - 30, meteorY + 30);
            ctx.stroke();
        }
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
    const moveSpeed = 1.5 * speedMultiplier; // Скорость движения платформ вниз
    
    // Для параллакс-эффекта фон движется медленнее
    bgParallaxSpeed = moveSpeed * 0.3;

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

            // Воспроизводим звук приземления (тихий)
            playSound('land');

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
            // Создаем анимированную монету для полета к счетчику
            const scoreHudRect = scoreElement.getBoundingClientRect();
            const canvasRect = canvas.getBoundingClientRect();
            animatedCoins.push({
                x: c.x,
                y: c.y,
                targetX: scoreHudRect.left + scoreHudRect.width / 2 - canvasRect.left,
                targetY: scoreHudRect.top + scoreHudRect.height / 2 - canvasRect.top,
                progress: 0,
                speed: 0.08
            });
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

    // Обновляем анимированные монеты
    for (let i = animatedCoins.length - 1; i >= 0; i--) {
        let ac = animatedCoins[i];
        ac.progress += ac.speed;
        if (ac.progress >= 1) {
            animatedCoins.splice(i, 1);
        } else {
            // Плавное движение с ускорением к концу
            const easeProgress = 1 - Math.pow(1 - ac.progress, 3);
            ac.x = ac.x + (ac.targetX - ac.x) * ac.speed * (1 - ac.progress);
            ac.y = ac.y + (ac.targetY - ac.y) * ac.speed * (1 - ac.progress);
        }
    }

    if (player.y > canvas.height) finishLevel(false);

    drawGameObjects();
    if (gameRunning) animationId = requestAnimationFrame(gameLoop);
}

function drawGameObjects() {
    // Отрисовка платформ с учетом их типа
    for (let p of platforms) {
        const platformType = p.type || PLATFORM_TYPES.GRASS;
        
        // Основной цвет платформы с полукруглыми краями
        ctx.fillStyle = platformType.color;
        const radius = p.height / 2; // Радиус скругления равен половине высоты
        ctx.beginPath();
        ctx.roundRect(p.x, p.y, p.width, p.height, [radius, radius, radius, radius]);
        ctx.fill();
        
        // Декоративная обводка
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineWidth = 2;
        ctx.stroke();
        
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
    
    // Рисуем анимированные монеты, летящие к счетчику
    for (let ac of animatedCoins) {
        ctx.save();
        ctx.translate(ac.x + 10, ac.y + 10);
        // Вращение монеты
        const rotation = Date.now() * 0.01;
        const scaleX = Math.abs(Math.cos(rotation));
        ctx.scale(scaleX, 1);
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fill();
        // Блеск на монете
        ctx.fillStyle = '#FFF';
        ctx.beginPath();
        ctx.arc(-2, -2, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.fillStyle = '#FFD700';
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
    if (gameRunning && onGround) {
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




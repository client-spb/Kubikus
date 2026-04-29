
// ==================== ТИПЫ ПЛАТФОРМ ====================
// Определение визуальных и физических свойств различных типов платформ
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
// Здесь настраивается логика каждого уровня: цели, скорость, типы платформ
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
        ],
        minGap: 80,  // Минимальный интервал между платформами (по умолчанию 80)
        maxGap: 120  // Максимальный интервал между платформами (по умолчанию 120)
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
        ],
        minGap: 70,
        maxGap: 110
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
        ],
        minGap: 60,
        maxGap: 100
    }
    // Можно добавить еще уровни здесь...
];

const TOTAL_LEVELS = 20; // Всего слотов в сетке
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// Элементы HUD
const topLeftHud = document.getElementById('top-left-hud');
const scorePointsDisplay = document.getElementById('score-points-display');
const coinsDisplay = document.getElementById('coins-display');
const topCenterHud = document.getElementById('top-center-hud');
const levelGoalText = document.getElementById('level-goal-text');
const pauseBtn = document.getElementById('pause-btn');
const fruitsCollectedHud = document.getElementById('fruits-collected-hud');
const fruitsList = document.getElementById('fruits-list');
const coinsCountElement = document.getElementById('coins-count');
const currencyDisplay = document.getElementById('currency-display');

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
// Звуки: прыжки, сбор монет, смерть, победа, приземление

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
// Генерация звуковых эффектов с помощью осцилляторов Web Audio API

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
// Музыка играет циклично с низкой громкостью (30%)

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

// ==================== ИГРОВЫЕ КОНСТАНТЫ И ПЕРЕМЕННЫЕ ====================
// Физические параметры игрока и настройки коллизий

const GRAVITY = 0.6;
const JUMP_FORCE = -13;

// НАСТРОЙКИ ДЛЯ СТАБИЛЬНЫХ ПРЫЖКОВ (виртуальные коллайдеры)
// VIRTUAL_MARGIN - расширение хитбоксов для более надёжного обнаружения столкновений
// SNAP_THRESHOLD - дистанция "примагничивания" игрока к платформе
const VIRTUAL_MARGIN = 6; // Расширение коллайдеров (в пикселях)
const SNAP_THRESHOLD = 8; // Дистанция "примагничивания" к платформе

// Игровые объекты и состояние
let player = { x: 180, y: 400, width: 30, height: 40, vy: 0, onGround: false };
let platforms = [];
let coins = [];          // Золотые монеты (дают монеты + очки)
let fruits = [];         // Фрукты (дают только очки + комбо)
let animatedCoins = [];  // Монеты для анимации полета к счетчику
let animatedFruits = []; // Фрукты для анимации конвертации в монеты

// === РАЗДЕЛЕНИЕ ВАЛЮТЫ ===
// coinsCount - валюта для магазина (монеты) - основная касса
// scorePoints - очки для таблицы лидеров (рейтинг)
// fruitScore - дополнительные очки за фрукты (идут в рейтинг)
// levelCoins - монеты, собранные в текущем уровне (для проверки условия победы)
let coinsCount = 0;      // Основная касса (сохраняется между уровнями)
let scorePoints = 0;     // Очки рейтинга
let fruitScore = 0;      // Очки за фрукты
let levelCoins = 0;      // Монеты текущего уровня (сбрасываются при старте уровня)

let gameTime = 0;        // Для уровня на время
let gameRunning = false;
let lastTime = 0;
let animationId;
let touchX = player.x;
let isTouching = false;
let prevPlayerY = 400;   // Для отслеживания предыдущей позиции по Y

// Система комбо для фруктов
let fruitCombo = 0;              // Текущий множитель комбо
let lastFruitTime = 0;           // Время сбора последнего фрукта
const COMBO_WINDOW = 2000;       // Окно комбо: 2 секунды между сборами
const MAX_COMBO = 5;             // Максимальный множитель комбо (x5)
let comboTimer = null;           // Таймер для сброса комбо
let comboDisplay = { active: false, timer: 0, value: 0 };  // Для отображения комбо

// Система конвертации фруктов
const FRUIT_CONVERSION_THRESHOLD = 10; // Количество фруктов для авто-конвертации
let collectedFruitsCount = 0;          // Счётчик собранных фруктов
let isConvertingFruits = false;        // Флаг активной конвертации
let collectedFruitsArray = [];         // Массив собранных фруктов для отображения в HUD
let persistentCollectedFruits = [];    // Фрукты, сохраняемые между уровнями

// ==================== ТИПЫ ФРУКТОВ ====================
// Разные фрукты дают разное количество очков и имеют разные визуальные эффекты
// Также каждый фрукт конвертируется в определённое количество монет при авто-конвертации
const FRUIT_TYPES = {
    APPLE: { id: 'apple', name: 'Яблоко', icon: '🍎', points: 10, color: '#FF4444', coinValue: 2 },
    ORANGE: { id: 'orange', name: 'Апельсин', icon: '🍊', points: 15, color: '#FFA500', coinValue: 3 },
    BANANA: { id: 'banana', name: 'Банан', icon: '🍌', points: 20, color: '#FFE135', coinValue: 4 },
    STRAWBERRY: { id: 'strawberry', name: 'Клубника', icon: '🍓', points: 25, color: '#DC143C', coinValue: 5 },
    CHERRY: { id: 'cherry', name: 'Вишня', icon: '🍒', points: 30, color: '#8B0000', coinValue: 6 },
    GRAPES: { id: 'grapes', name: 'Виноград', icon: '🍇', points: 35, color: '#9370DB', coinValue: 7 },
    WATERMELON: { id: 'watermelon', name: 'Арбуз', icon: '🍉', points: 40, color: '#FF6B6B', coinValue: 8 },
    PINEAPPLE: { id: 'pineapple', name: 'Ананас', icon: '🍍', points: 50, color: '#FFD700', coinValue: 10 }
};

// Получить случайный тип фрукта
function getRandomFruitType() {
    const fruitKeys = Object.keys(FRUIT_TYPES);
    const randomKey = fruitKeys[Math.floor(Math.random() * fruitKeys.length)];
    return FRUIT_TYPES[randomKey];
}

// ==================== КОНВЕРТАЦИЯ ФРУКТОВ В МОНЕТЫ ====================
// Когда собрано определённое количество фруктов, они автоматически
// конвертируются в монеты с красивой анимацией
function convertFruitsToCoins() {
    if (isConvertingFruits) return;
    
    isConvertingFruits = true;
    
    // Звук начала конвертации
    if (audioCtx && allSoundEnabled) {
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(400, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.5);
        gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 0.5);
    }
    
    // Создаём анимированные фрукты для каждого собранного типа
    // Для простоты берём среднее значение монет за фрукты
    const avgCoinValue = 5; // Среднее значение монет за фрукт
    const totalCoins = collectedFruitsCount * avgCoinValue;
    
    // Показываем визуальный эффект - несколько фруктов летят в центр
    for (let i = 0; i < Math.min(collectedFruitsCount, 8); i++) {
        const fruitType = getRandomFruitType();
        animatedFruits.push({
            x: player.x + Math.random() * 40 - 20,
            y: player.y + Math.random() * 40 - 20,
            width: 24,
            height: 24,
            type: fruitType,
            points: fruitType.points,
            coinValue: fruitType.coinValue,
            progress: 0,
            speed: 0.05,
            rotation: 0
        });
    }
    
    // Сбрасываем счётчик после небольшой задержки (когда анимация завершится)
    setTimeout(() => {
        collectedFruitsCount = 0;
        // Сохраняем фрукты в постоянный массив перед очисткой временного
        persistentCollectedFruits = [...collectedFruitsArray];
        collectedFruitsArray = []; // Очищаем массив собранных фруктов
        isConvertingFruits = false;
        updateHUD();
        updateFruitsDisplay(); // Обновляем отображение фруктов
    }, 2000);
}

// ==================== ФИЗИКА И КОЛЛИЗИИ ====================
function updatePhysics() {
    if (!gameRunning) return;

    // Управление движением влево/вправо
    if (isTouching) {
        const dx = touchX - (player.x + player.width / 2);
        player.x += dx * 0.15;
    }

    // Применяем гравитацию
    player.vy += GRAVITY;
    
    // Сохраняем предыдущую позицию перед движением по Y
    const prevY = player.y;
    const prevBottom = prevY + player.height;
    
    // Флаг: был ли игрок на земле в предыдущем кадре
    const wasOnGround = player.onGround;
    
    // Движение по оси Y
    player.y += player.vy;
    
    // Wrap-around по горизонтали
    if (player.x + player.width < 0) player.x = canvas.width;
    if (player.x > canvas.width) player.x = -player.width;

    const speedMultiplier = currentLevelConfig ? currentLevelConfig.speedMod : 1.0;
    const moveSpeed = 1.5 * speedMultiplier;
    
    // Для параллакс-эффекта фон движется медленнее
    bgParallaxSpeed = moveSpeed * 0.3;

    // Сбрасываем флаг приземления перед проверкой коллизий
    player.onGround = false;
    
    // Отладочные логи для диагностики прыжков
    const debugLogs = [];

    for (let p of platforms) {
        p.y += moveSpeed;
        
        // Создаем уникальный ID для платформы
        if (!p.id) {
            p.id = Math.random().toString(36).substr(2, 9);
        }
        
        // Проверка столкновения с платформой
        const platformTop = p.y;
        
        // === ВИРТУАЛЬНЫЕ КОЛЛАЙДЕРЫ ===
        // Считаем низ игрока ниже реального, а верх платформы выше реального
        const virtualPlayerBottom = player.y + player.height + VIRTUAL_MARGIN;
        const virtualPlatformTop = platformTop - VIRTUAL_MARGIN;
        
        // Текущий и предыдущий низ игрока (реальные значения)
        const currentBottom = player.y + player.height;
        
        // Проверка перекрытия по горизонтали (с небольшими отступами для надежности)
        const horizontalOverlap = (player.x + player.width > p.x + 5) && (player.x < p.x + p.width - 5);
        
        if (horizontalOverlap) {
            // УСЛОВИЕ ПРИЗЕМЛЕНИЯ:
            // 1. Мы были выше платформы в прошлом кадре (или на ней)
            // 2. Сейчас мы пересекли виртуальную границу платформы
            // 3. Мы не провалились глубоко под платформу
            
            const wasAboveOrOn = prevBottom <= platformTop + 5;
            const isTouchingVirtual = virtualPlayerBottom >= virtualPlatformTop;
            const notClippingDeep = currentBottom < platformTop + p.height;
            
            // Проверяем, что падали вниз или имели нулевую скорость
            const fallingOrStill = player.vy >= 0;
            
            // Дополнительная проверка: игрок действительно только что приземлился (переход из воздуха на землю)
            const justLanded = fallingOrStill && wasAboveOrOn && isTouchingVirtual && notClippingDeep;
            
            if (justLanded) {
                debugLogs.push(`COLLISION: vy=${player.vy.toFixed(2)}, prevBottom=${prevBottom.toFixed(1)}, platformTop=${platformTop.toFixed(1)}`);

                // Проверка на шипы - мгновенная смерть
                if (p.type && p.type.damage) {
                    finishLevel(false);
                    return;
                }

                // === КОРРЕКЦИЯ ПОЗИЦИИ (ПРИМАГНИЧИВАНИЕ) ===
                // Вычисляем дистанцию до платформы
                const distanceToPlatform = platformTop - currentBottom;
                
                // Если очень близко (в пределах порога), жестко ставим на платформу
                if (distanceToPlatform > -SNAP_THRESHOLD && distanceToPlatform < SNAP_THRESHOLD) {
                    player.y = platformTop - player.height; // Точное выравнивание
                    player.vy = 0; // Полностью гасим скорость
                    player.onGround = true;
                } else if (player.vy >= 0) {
                    // Если провалились глубже порога, но все еще падали - тоже приземляем
                    player.y = platformTop - player.height;
                    player.vy = 0;
                    player.onGround = true;
                }
                
                if (player.onGround && !wasOnGround) {
                    // Воспроизводим звук приземления только если игрок только что приземлился
                    // (не был на земле в предыдущем кадре)
                    playSound('land');
                    debugLogs.push(`LANDED on platform ${p.id}`);

                    // Логика для уровня "Прыжки" (Тип 3)
                    // Считаем только новые платформы
                    if (currentLevelConfig.type === 'jumps' && !landedPlatforms.has(p.id)) {
                        landedPlatforms.add(p.id);
                        scorePoints++;
                        updateHUD();
                        checkWinCondition();
                    }
                } else if (player.onGround && wasOnGround) {
                    // Игрок уже стоит на платформе - просто продолжаем стоять
                    debugLogs.push(`STANDING on platform ${p.id}`);
                    
                    // Логика для уровня "Прыжки" (Тип 3) - считаем пребывание на платформе
                    if (currentLevelConfig.type === 'jumps' && !landedPlatforms.has(p.id)) {
                        landedPlatforms.add(p.id);
                        scorePoints++;
                        updateHUD();
                        checkWinCondition();
                    }
                }
            }
        }
        
        // Респаун платформ, ушедших за экран
        if (p.y > canvas.height) {
            // Находим самую верхнюю платформу (с минимальным y) среди ВСЕХ платформ
            let highestY = Infinity;
            platforms.forEach(plat => {
                if (plat.y < highestY) {
                    highestY = plat.y;
                }
            });
            
            // Если это первый респаун и highestY ещё не установлен, используем верх экрана
            if (highestY === Infinity || highestY > canvas.height) {
                highestY = 0;
            }
            
            // Новая платформа появляется выше самой верхней с фиксированным шагом
            const verticalGap = 90; // Фиксированный шаг как при генерации
            p.y = highestY - verticalGap;
            p.x = Math.random() * (canvas.width - p.width);
            p.width = 80 + Math.random() * 30;
            // При респауне выбираем новый тип платформы
            const newPlatformType = getRandomPlatformType();
            p.type = newPlatformType;
            p.id = Math.random().toString(36).substr(2, 9); // Новый ID
            
            // С шансом 50% создаём монету на платформе
            if (Math.random() < 0.5 && !newPlatformType.damage) {
                coins.push({ x: p.x + p.width/2 - 10, y: p.y - 30, width: 20, height: 20, collected: false });
            }
            
            // С шансом 35% создаём фрукт рядом с платформой (только если платформа не шипы) - увеличено количество
            if (Math.random() < 0.35 && !newPlatformType.damage) {
                const fruitType = getRandomFruitType();
                fruits.push({ 
                    x: p.x + p.width/2 - 12, 
                    y: p.y - 40 - Math.random() * 30, 
                    width: 24, 
                    height: 24, 
                    collected: false,
                    type: fruitType,
                    floatOffset: Math.random() * Math.PI * 2  // Для анимации парения
                });
            }
        }
    }
    
    // Обновление таймера комбо
    const currentTime = Date.now();
    if (fruitCombo > 0 && currentTime - lastFruitTime > COMBO_WINDOW) {
        fruitCombo = 0;
        comboDisplay.active = false;
    }
    
    // Обновление отображения комбо
    if (comboDisplay.active) {
        comboDisplay.timer -= 16; // Примерно 60 FPS
        if (comboDisplay.timer <= 0) {
            comboDisplay.active = false;
        }
    }
    
    // Вывод отладочных логов в консоль
    if (debugLogs.length > 0) {
        console.log(`[Frame ${performance.now().toFixed(0)}] onGround=${player.onGround}, vy=${player.vy.toFixed(2)}`);
        debugLogs.forEach(log => console.log(`  ${log}`));
    }
}

// ==================== ИНТЕРФЕЙС ====================

function showLevelSelect() {
    mainMenu.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    levelPreviewScreen.classList.add('hidden');
    levelSelectScreen.classList.remove('hidden');
    
    // При выходе на карту уровней очищаем фрукты (только если не победа)
    // Фрукты уже сохранены в persistentCollectedFruits при победе или очищены при проигрыше
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
    
    // Показываем все элементы HUD
    if (topLeftHud) topLeftHud.style.display = 'block';
    if (topCenterHud) topCenterHud.style.display = 'block';
    if (pauseBtn) pauseBtn.style.display = 'block';
    if (fruitsCollectedHud) fruitsCollectedHud.style.display = 'block';
    
    // Инициализируем аудио контекст при старте игры
    initAudio();
    
    // Инициализируем элементы фона при старте игры
    initBackgroundElements();
    
    // Подгоняем размер canvas под контейнер
    resizeCanvas();

    // При старте уровня передаём false, чтобы сохранить фрукты с предыдущего уровня (если была победа)
    resetGameVariables(false);
    landedPlatforms = new Set(); // Очищаем набор приземлившихся платформ
    gameRunning = true;
    lastTime = performance.now();
    
    // Запускаем фоновую музыку если включена
    if (allSoundEnabled) {
        startBGM();
    }
    
    updateHUD();
    updateFruitsDisplay();
    
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
    
    // Скрываем все элементы HUD
    if (topLeftHud) topLeftHud.style.display = 'none';
    if (topCenterHud) topCenterHud.style.display = 'none';
    if (pauseBtn) pauseBtn.style.display = 'none';
    if (fruitsCollectedHud) fruitsCollectedHud.style.display = 'none';
    if (currencyDisplay) currencyDisplay.style.display = 'none';
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Останавливаем фоновую музыку при выходе в меню
    stopBGM();
    
    drawBackground();
}

function checkWinCondition() {
    if (!currentLevelConfig) return false;

    let won = false;
    if (currentLevelConfig.type === 'coins' && levelCoins >= currentLevelConfig.target) won = true;  // Проверяем монеты уровня, а не общую кассу
    if (currentLevelConfig.type === 'jumps' && scorePoints >= currentLevelConfig.target) won = true;
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
        
        // Сохраняем очки и монеты в localStorage
        // coinsCount уже содержит накопленные монеты + монеты, собранные в этом уровне
        localStorage.setItem('jumpSkok_coins', coinsCount);
        localStorage.setItem('jumpSkok_score', scorePoints + fruitScore);
        
        // Сохраняем собранные фрукты для следующего уровня
        persistentCollectedFruits = [...collectedFruitsArray];
    } else {
        playTone('die');
        endStatus.textContent = "НЕУДАЧА";
        endStatus.className = "status-msg status-fail";
        // Показываем прогресс
        if (currentLevelConfig.type === 'time') {
             finalScoreValue.textContent = Math.floor(gameTime) + " сек";
        } else if (currentLevelConfig.type === 'coins') {
             finalScoreValue.textContent = levelCoins + " / " + currentLevelConfig.target;  // Показываем монеты уровня
        } else if (currentLevelConfig.type === 'jumps') {
             finalScoreValue.textContent = scorePoints + " / " + currentLevelConfig.target;
        } else {
             finalScoreValue.textContent = (scorePoints + fruitScore) + " очков";
        }
        
        // При проигрыше НЕ сохраняем монеты и очки, полученные в этом уровне
        // Восстанавливаем значения из localStorage
        coinsCount = parseInt(localStorage.getItem('jumpSkok_coins')) || 0;
        scorePoints = parseInt(localStorage.getItem('jumpSkok_score')) || 0;
        
        // При проигрыше очищаем все фрукты
        persistentCollectedFruits = [];
        collectedFruitsArray = [];
    }

    setTimeout(() => {
        gameOverScreen.classList.remove('hidden');
    }, 500);
}

// Глобальная переменная уже объявлена выше (строка 443)

function resetGameVariables(clearFruits = true) {
    player.x = canvas.width / 2 - 15;
    // Герой появляется выше всех платформ - будет падать вниз на первую платформу
    player.y = -200;
    player.vy = 0;
    prevPlayerY = -200;
    
    // Загружаем сохранённые очки и монеты из localStorage
    coinsCount = parseInt(localStorage.getItem('jumpSkok_coins')) || 0;
    scorePoints = parseInt(localStorage.getItem('jumpSkok_score')) || 0;
    fruitScore = 0;
    levelCoins = 0;  // Сбрасываем монеты уровня при старте
    gameTime = 0;
    fruits = [];
    animatedFruits = [];
    fruitCombo = 0;
    lastFruitTime = 0;
    collectedFruitsCount = 0;
    isConvertingFruits = false;
    comboDisplay = { active: false, timer: 0, value: 0 };
    
    // Очищаем или сохраняем фрукты в зависимости от параметра
    if (clearFruits) {
        collectedFruitsArray = []; // Очищаем массив собранных фруктов для отображения
        persistentCollectedFruits = []; // Очищаем сохранённые фрукты (при проигрыше)
    } else {
        // При переходе на следующий уровень сохраняем фрукты
        collectedFruitsArray = [...persistentCollectedFruits];
    }
    
    generatePlatforms();
    updateHUD();
    updateFruitsDisplay();
}

function updateHUD() {
    if (!currentLevelConfig) return;

    const totalScorePoints = scorePoints + fruitScore;
    
    // Обновляем верхнюю левую панель: очки и монеты
    if (scorePointsDisplay) {
        scorePointsDisplay.textContent = `⭐ ${totalScorePoints}`;
    }
    if (coinsDisplay) {
        coinsDisplay.textContent = `🪙 ${coinsCount}`;
    }
    
    // Обновляем центральную панель с целью уровня
    if (levelGoalText) {
        let goalText = "";
        if (currentLevelConfig.type === 'coins') {
            goalText = `🪙 ${levelCoins} / ${currentLevelConfig.target}`;  // Показываем монеты уровня, а не общую кассу
        } else if (currentLevelConfig.type === 'jumps') {
            goalText = `🟩 ${scorePoints} / ${currentLevelConfig.target}`;
        } else if (currentLevelConfig.type === 'time') {
            goalText = `⏱️ ${Math.floor(gameTime)} / ${currentLevelConfig.target} сек`;
        } else {
            goalText = `⭐ Счёт: ${totalScorePoints}`;
        }
        
        // Добавляем индикатор комбо если оно активно
        if (comboDisplay.active && fruitCombo > 1) {
            goalText += ` 🔥 x${fruitCombo}!`;
        }
        
        levelGoalText.textContent = goalText;
    }
    
    // Обновляем отдельный дисплей монет для магазина
 
}

// Функция добавления собранного фрукта в массив для отображения
function addCollectedFruit(fruitType) {
    collectedFruitsArray.push(fruitType);
    updateFruitsDisplay();
}

// Функция обновления отображения собранных фруктов внизу слева
function updateFruitsDisplay() {
    if (!fruitsList) return;
    
    // Очищаем текущий список
    fruitsList.innerHTML = '';
    
    // Подсчитываем количество каждого типа фруктов
    const fruitCounts = {};
    collectedFruitsArray.forEach(fruit => {
        if (!fruitCounts[fruit.icon]) {
            fruitCounts[fruit.icon] = 0;
        }
        fruitCounts[fruit.icon]++;
    });
    
    // Отображаем каждый тип фрукта с количеством в столбик
    for (const [icon, count] of Object.entries(fruitCounts)) {
        const fruitItem = document.createElement('div');
        fruitItem.className = 'fruit-item';
        fruitItem.textContent = `${icon} ${count}`;
        fruitsList.appendChild(fruitItem);
    }
}

// ==================== ДВИЖОК ИГРЫ ====================
// Основной игровой цикл: обновление физики, отрисовка, обработка событий

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
    
    // Получаем настройки интервалов для текущего уровня с дефолтными значениями
    const minGap = currentLevelConfig?.minGap ?? 80;  // По умолчанию 80
    const maxGap = currentLevelConfig?.maxGap ?? 120; // По умолчанию 120
    
    // Стартовая платформа всегда безопасная (трава)
    // Позиционируем платформу чуть ниже игрока, чтобы он мог на неё приземлиться
    // Игрок появляется на y = -200, поэтому платформа должна быть примерно на y = -100
    const startY = -100;
    platforms.push({ 
        x: 150, 
        y: startY, 
        width: 100, 
        height: 15,
        type: PLATFORM_TYPES.GRASS
    });
    // Генерируем сразу 15 платформ, чтобы заполнить экран и область выше
    const platformCount = 15;
    let lastY = startY;
    for (let i = 1; i <= platformCount; i++) {
        // Случайный интервал между платформами в заданном диапазоне
        const gap = Math.floor(Math.random() * (maxGap - minGap + 1)) + minGap;
        const yPos = lastY - gap;
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

    // Вызываем функцию физики и коллизий
    updatePhysics();

    // Скорость движения для монет и других объектов
    const speedMultiplier = currentLevelConfig ? currentLevelConfig.speedMod : 1.0;
    const moveSpeed = 1.5 * speedMultiplier;

    // Монетки - дают монеты для магазина и очки для лидеров
    for (let i = coins.length - 1; i >= 0; i--) {
        let c = coins[i];
        if (!c.collected &&
            player.x < c.x + c.width && player.x + player.width > c.x &&
            player.y < c.y + c.height && player.y + player.height > c.y) {
            c.collected = true;
            // Создаем анимированную монету для полета к счетчику
            const scoreHudRect = scorePointsDisplay.getBoundingClientRect();
            const canvasRect = canvas.getBoundingClientRect();
            animatedCoins.push({
                x: c.x,
                y: c.y,
                targetX: scoreHudRect.left + scoreHudRect.width / 2 - canvasRect.left,
                targetY: scoreHudRect.top + scoreHudRect.height / 2 - canvasRect.top,
                progress: 0,
                speed: 0.08
            });
            // Монета даёт +1 к цели уровня и +1 монету для магазина
            if (currentLevelConfig.type === 'coins') {
                levelCoins++;      // Увеличиваем счётчик монет уровня (для проверки победы)
                coinsCount++;      // Также добавляем в основную кассу
                scorePoints++;     // Также даём очко для лидеров
                updateHUD();
                checkWinCondition();
            } else {
                coinsCount++;      // В других типах уровней тоже даём монеты (только в кассу)
                scorePoints++;
                updateHUD();
            }
            playTone('coin');
        }
        if (c.collected) coins.splice(i, 1);
        else {
            c.y += moveSpeed;
            if (c.y > canvas.height) coins.splice(i, 1);
        }
    }

    // Фрукты - сбор с комбо-системой, дают только очки для лидеров
    const currentTime = Date.now();
    for (let i = fruits.length - 1; i >= 0; i--) {
        let f = fruits[i];
        
        // Анимация парения фрукта
        f.floatOffset += 0.05;
        const floatY = Math.sin(f.floatOffset) * 3;
        
        // Проверка столкновения с игроком
        if (!f.collected &&
            player.x < f.x + f.width && player.x + player.width > f.x &&
            player.y < f.y + floatY + f.height && player.y + player.height > f.y + floatY) {
            
            f.collected = true;
            collectedFruitsCount++; // Увеличиваем счётчик собранных фруктов
            
            // Добавляем фрукт в список собранных для отображения внизу слева
            addCollectedFruit(f.type);
            
            // Расчёт комбо
            const timeSinceLastFruit = currentTime - lastFruitTime;
            if (timeSinceLastFruit < COMBO_WINDOW) {
                // Игрок собрал фрукт быстро - увеличиваем комбо
                fruitCombo = Math.min(fruitCombo + 1, MAX_COMBO);
            } else {
                // Прошло много времени - сбрасываем комбо до 1
                fruitCombo = 1;
            }
            
            lastFruitTime = currentTime;
            
            // Расчёт очков с учётом комбо
            const basePoints = f.type.points;
            const comboBonus = basePoints * (fruitCombo - 1); // Бонус за комбо
            const totalPoints = basePoints + comboBonus;
            
            fruitScore += totalPoints;
            updateHUD();
            
            // Показываем индикатор комбо
            comboDisplay.active = true;
            comboDisplay.timer = 1500; // Показывать 1.5 секунды
            comboDisplay.value = fruitCombo;
            
            // Звук сбора фрукта (более высокий тон чем у монеты)
            if (audioCtx && allSoundEnabled) {
                const oscillator = audioCtx.createOscillator();
                const gainNode = audioCtx.createGain();
                oscillator.connect(gainNode);
                gainNode.connect(audioCtx.destination);
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(1200 + fruitCombo * 100, audioCtx.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(1800, audioCtx.currentTime + 0.1);
                gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
                oscillator.start(audioCtx.currentTime);
                oscillator.stop(audioCtx.currentTime + 0.2);
            }
            
            // Проверяем, достигли ли порога для авто-конвертации фруктов в монеты
            if (collectedFruitsCount >= FRUIT_CONVERSION_THRESHOLD && !isConvertingFruits) {
                convertFruitsToCoins();
            }
            
            fruits.splice(i, 1);
        } else if (!f.collected) {
            // Фрукт движется вниз вместе с платформами
            f.y += moveSpeed;
            if (f.y > canvas.height) {
                fruits.splice(i, 1);
            }
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

    // Обновляем анимированные фрукты (для конвертации в монеты)
    for (let i = animatedFruits.length - 1; i >= 0; i--) {
        let af = animatedFruits[i];
        af.progress += af.speed;
        if (af.progress >= 1) {
            // Анимация завершена - добавляем монеты
            coinsCount += af.coinValue;
            scorePoints += af.points; // Очки тоже добавляем
            updateHUD();
            animatedFruits.splice(i, 1);
        } else {
            // Плавное движение к центру для конвертации
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            af.x = af.x + (centerX - af.x) * af.speed;
            af.y = af.y + (centerY - af.y) * af.speed;
            // Вращение для эффекта
            af.rotation += 0.2;
        }
    }

    if (player.y > canvas.height) finishLevel(false);

    drawGameObjects();
    if (gameRunning) animationId = requestAnimationFrame(gameLoop);
}

// ==================== ОТРИСОВКА ИГРОВЫХ ОБЪЕКТОВ ====================
// Рендеринг всех игровых объектов: платформы, монеты, фрукты, игрок, эффекты

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
    
    // Рисуем фрукты с анимацией парения и разными цветами
    const time = Date.now() * 0.001;
    for (let f of fruits) {
        if (!f.collected) {
            const floatY = Math.sin(f.floatOffset) * 3;
            const centerX = f.x + f.width / 2;
            const centerY = f.y + floatY + f.height / 2;
            
            // Свечение вокруг фрукта
            const gradient = ctx.createRadialGradient(centerX, centerY, 5, centerX, centerY, 20);
            gradient.addColorStop(0, f.type.color + '60'); // 60 - прозрачность в hex
            gradient.addColorStop(1, 'transparent');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(centerX, centerY, 20, 0, Math.PI * 2);
            ctx.fill();
            
            // Основной цвет фрукта
            ctx.fillStyle = f.type.color;
            ctx.beginPath();
            ctx.arc(centerX, centerY, 10, 0, Math.PI * 2);
            ctx.fill();
            
            // Блик на фрукте
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.beginPath();
            ctx.arc(centerX - 3, centerY - 3, 3, 0, Math.PI * 2);
            ctx.fill();
            
            // Листик сверху
            ctx.fillStyle = '#4CAF50';
            ctx.beginPath();
            ctx.ellipse(centerX, centerY - 12, 4, 2, Math.PI / 4, 0, Math.PI * 2);
            ctx.fill();
        }
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
    
    // Рисуем анимированные фрукты (конвертация в монеты)
    for (let af of animatedFruits) {
        ctx.save();
        ctx.translate(af.x + af.width / 2, af.y + af.height / 2);
        ctx.rotate(af.rotation);
        
        // Свечение вокруг фрукта
        const gradient = ctx.createRadialGradient(0, 0, 5, 0, 0, 25);
        gradient.addColorStop(0, af.type.color + '80');
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, 25, 0, Math.PI * 2);
        ctx.fill();
        
        // Основной фрукт
        ctx.fillStyle = af.type.color;
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, Math.PI * 2);
        ctx.fill();
        
        // Блик
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.beginPath();
        ctx.arc(-4, -4, 4, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
    
    // Герой
    ctx.fillStyle = '#FF5722';
    ctx.fillRect(player.x, player.y, player.width, player.height);
    ctx.fillStyle = 'white';
    ctx.beginPath(); ctx.arc(player.x+10, player.y+12, 5, 0, Math.PI*2); ctx.arc(player.x+20, player.y+12, 5, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = 'black';
    ctx.beginPath(); ctx.arc(player.x+10, player.y+12, 2, 0, Math.PI*2); ctx.arc(player.x+20, player.y+12, 2, 0, Math.PI*2); ctx.fill();
    
    // Отрисовка индикатора комбо (визуальный эффект поверх игры)
    if (comboDisplay.active && fruitCombo > 1) {
        ctx.save();
        ctx.font = 'bold 36px Arial';
        ctx.textAlign = 'center';
        
        // Пульсирующий текст комбо
        const pulse = 1 + Math.sin(Date.now() * 0.01) * 0.2;
        ctx.translate(canvas.width / 2, 100);
        ctx.scale(pulse, pulse);
        
        // Тень текста
        ctx.fillStyle = 'rgba(255, 100, 0, 0.5)';
        ctx.fillText(`🔥 x${fruitCombo} COMBO!`, 4, 4);
        
        // Основной текст с градиентом
        const comboGradient = ctx.createLinearGradient(-60, -20, 60, 20);
        comboGradient.addColorStop(0, '#FFD700');
        comboGradient.addColorStop(0.5, '#FF6B35');
        comboGradient.addColorStop(1, '#FF4500');
        ctx.fillStyle = comboGradient;
        ctx.fillText(`🔥 x${fruitCombo} COMBO!`, 0, 0);
        
        ctx.restore();
    }
    
    // Индикатор конвертации фруктов (когда достигнут порог)
    if (isConvertingFruits) {
        ctx.save();
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#FFD700';
        ctx.shadowColor = '#FFA500';
        ctx.shadowBlur = 10;
        ctx.fillText('🍎→🪙 КОНВЕРТАЦИЯ!', canvas.width / 2, canvas.height / 2 - 50);
        ctx.restore();
    }
}

// ==================== УПРАВЛЕНИЕ ИГРОКОМ ====================
// Обработка ввода: касания, мышь, клавиатура

function jump() {
    if (gameRunning && player.onGround) {
        player.vy = JUMP_FORCE;
        playTone('jump');
    }
}

// Обработчики ввода
function handleInput(x, y) {
    if (!gameRunning) return;
    
    // Прыгаем только если игрок на земле (стоит на платформе)
    isTouching = true;
    const rect = canvas.getBoundingClientRect();
    touchX = x - rect.left;
    jump();
}

canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    handleInput(e.touches[0].clientX, e.touches[0].clientY);
}, {passive: false});

canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    if (!gameRunning) return;
    touchX = e.touches[0].clientX - canvas.getBoundingClientRect().left;
}, {passive: false});

canvas.addEventListener('touchend', () => isTouching = false);

canvas.addEventListener('mousedown', e => {
    handleInput(e.clientX, e.clientY);
});
canvas.addEventListener('mousemove', e => { if(isTouching) touchX = e.offsetX; });
canvas.addEventListener('mouseup', () => isTouching = false);

// Добавляем поддержку клавиатуры (пробел для прыжка)
document.addEventListener('keydown', e => {
    if (e.code === 'Space' && gameRunning) {
        e.preventDefault();
        jump();
    }
});

// ==================== АДАПТАЦИЯ ПОД МОБИЛЬНЫЕ УСТРОЙСТВА ====================
// Функция изменения размера canvas под размер экрана
function resizeCanvas() {
    const container = document.getElementById('game-container');
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    
    // Пересчитываем позицию игрока при изменении размера
    if (player) {
        player.x = Math.min(player.x, canvas.width - player.width);
        player.y = Math.min(player.y, canvas.height - player.height);
    }
}

// Вызываем при загрузке страницы
window.addEventListener('load', resizeCanvas);

// Вызываем при изменении размера окна
window.addEventListener('resize', resizeCanvas);

// Вызываем при изменении ориентации устройства
window.addEventListener('orientationchange', resizeCanvas);



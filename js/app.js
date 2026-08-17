// ================================================================
// АРХИТЕКТОР ВРЕМЕНИ - ПОЛНАЯ ВЕРСИЯ
// ================================================================

// ================================================================
// КОНСТАНТЫ И КОНФИГУРАЦИИ
// ================================================================

const APP_VERSION = '2.0.3';

// Конфигурация для рендеринга задач
const TASK_RENDER_CONFIG = {
    urgent: {
        containerId: 'urgentTasksList',
        badgeId: 'urgentCount',
        panelId: 'urgentPanel',
        emptyText: 'Нет срочных',
        itemClass: 'urgent-item',
        getData: () => getUrgentTasks(),
        renderItem: (task) => {
            const timeLeft = getTimeLeft(task.date, task.time);
            const urgency = getUrgency(timeLeft);
            
            let timeText = '';
            if (timeLeft.overdue) {
                timeText = '⏰ ПРОСРОЧЕНО!';
            } else {
                const parts = [];
                if (timeLeft.days > 0) parts.push(timeLeft.days + 'д');
                if (timeLeft.hours > 0) parts.push(timeLeft.hours + 'ч');
                if (timeLeft.minutes > 0) parts.push(timeLeft.minutes + 'м');
                if (timeLeft.days === 0 && timeLeft.hours === 0 && timeLeft.minutes === 0) {
                    parts.push(timeLeft.seconds + 'с');
                }
                timeText = '⏳ ' + parts.join(' ');
            }
            
            return `
                <div class="urgent-item urgent-${urgency}">
                    <div class="top-row">
                        <span class="task-name" title="${escapeHtml(task.text)}">${escapeHtml(task.text)}</span>
                        <span class="time-left ${timeLeft.overdue ? 'overdue' : ''}">${timeText}</span>
                    </div>
                    <div class="bottom-row">
                        <span class="date-info">${new Date(task.date + 'T' + (task.time || '00:00')).toLocaleString('ru-RU', {day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'})}</span>
                        ${task.time ? `<span class="time-label">⏰ ${task.time}</span>` : ''}
                    </div>
                </div>
            `;
        }
    },
    today: {
        containerId: 'todayTasksList',
        badgeId: 'todayTaskCount',
        panelId: 'todayPanel',
        emptyText: 'Нет задач',
        itemClass: 'task-item-compact',
        getData: () => {
            const key = formatDate(new Date());
            return [...getTasks(key)].sort((a, b) => {
                if (a.completed !== b.completed) return a.completed ? 1 : -1;
                if (a.time && b.time) return a.time.localeCompare(b.time);
                if (a.time) return -1;
                if (b.time) return 1;
                return 0;
            });
        },
        renderItem: (task) => `
            <div class="task-item-compact" data-id="${task.id}">
                <div class="task-check ${task.completed ? 'done' : ''}" data-action="toggle-today" data-id="${task.id}">${task.completed ? '✓' : ''}</div>
                <div class="task-text ${task.completed ? 'done' : ''}">${escapeHtml(task.text)}</div>
                ${task.time ? `<span class="task-time">${task.time}</span>` : ''}
                <span class="task-priority">${getPriorityIcon(task.priority)}</span>
                <button class="task-edit" data-action="edit-today" data-id="${task.id}" title="Редактировать">✏️</button>
                <button class="task-del" data-action="delete-today" data-id="${task.id}">✕</button>
            </div>
        `
    },
    calendar: {
        containerId: 'calendarTaskList',
        badgeId: null,
        panelId: null,
        emptyText: (date) => `Создайте задачу на ${displayDate(date)}`,
        itemClass: 'calendar-task-item',
        getData: () => {
            const key = formatDate(selectedDate);
            return [...getTasks(key)].sort((a, b) => {
                if (a.completed !== b.completed) return a.completed ? 1 : -1;
                if (a.time && b.time) return a.time.localeCompare(b.time);
                if (a.time) return -1;
                if (b.time) return 1;
                return 0;
            });
        },
        renderItem: (task) => `
            <div class="calendar-task-item" data-id="${task.id}">
                <div class="task-check ${task.completed ? 'done' : ''}" data-action="toggle-cal" data-id="${task.id}">${task.completed ? '✓' : ''}</div>
                <div class="task-text ${task.completed ? 'done' : ''}">${escapeHtml(task.text)}</div>
                ${task.time ? `<span class="task-time">${task.time}</span>` : ''}
                <span class="task-tag">${getCategoryLabel(task.category)}</span>
                <span class="task-priority">${getPriorityIcon(task.priority)}</span>
                <button class="task-edit" data-action="edit-cal" data-id="${task.id}" title="Редактировать">✏️</button>
                <button class="task-del" data-action="delete-cal" data-id="${task.id}">✕</button>
            </div>
        `
    }
};

// Конфигурация праздников
const HOLIDAYS = {
    ru: [
        { date: '01-01', name: 'Новый год' },
        { date: '01-07', name: 'Рождество' },
        { date: '02-23', name: 'День защитника' },
        { date: '03-08', name: 'Женский день' },
        { date: '05-01', name: 'Праздник весны' },
        { date: '05-09', name: 'День Победы' },
        { date: '06-12', name: 'День России' },
        { date: '11-04', name: 'День народного единства' }
    ],
    us: [
        { date: '01-01', name: 'New Year' },
        { date: '07-04', name: 'Independence' },
        { date: '11-27', name: 'Thanksgiving' },
        { date: '12-25', name: 'Christmas' }
    ],
    eu: [
        { date: '01-01', name: 'New Year' },
        { date: '05-01', name: 'Labour Day' },
        { date: '12-25', name: 'Christmas' },
        { date: '12-26', name: 'Boxing Day' }
    ],
    custom: []
};

// Графики работы
const WORK_SCHEDULES = {
    '5_2': [0, 1, 1, 1, 1, 1, 0],
    '2_2': [1, 1, 1, 1, 0, 0, 0],
    '3_3': [1, 1, 1, 0, 0, 0, 0],
    '6_1': [0, 1, 1, 1, 1, 1, 1]
};

// Карта погоды
const WEATHER_MAP = {
    0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️',
    45: '🌫️', 51: '🌧️', 61: '🌧️', 71: '❄️',
    80: '🌧️', 95: '⛈️'
};

// Карта приоритетов
const PRIORITY_ICONS = {
    high: '🔥',
    medium: '⚡',
    low: '💤'
};

const CATEGORY_ICONS = {
    work: '💼',
    personal: '❤️',
    study: '📚',
    other: '📌'
};

// ================================================================
// УТИЛИТЫ
// ================================================================

/** Получить элемент по ID */
const getEl = (id) => document.getElementById(id);

/** Получить элементы по селектору */
const getEls = (selector) => document.querySelectorAll(selector);

/** Форматировать дату в YYYY-MM-DD */
const formatDate = (date) => {
    return date.getFullYear() + '-' + 
           String(date.getMonth() + 1).padStart(2, '0') + '-' + 
           String(date.getDate()).padStart(2, '0');
};

/** Проверить, является ли дата сегодняшней */
const isToday = (date) => {
    const now = new Date();
    return date.getDate() === now.getDate() && 
           date.getMonth() === now.getMonth() && 
           date.getFullYear() === now.getFullYear();
};

/** Сгенерировать уникальный ID */
const generateId = () => {
    return Date.now() + '-' + Math.random().toString(36).substr(2, 6);
};

/** Получить название дня недели */
const getDayName = (date) => {
    const days = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 
                  'Четверг', 'Пятница', 'Суббота'];
    return days[date.getDay()];
};

/** Отобразить дату в читаемом формате */
const displayDate = (date) => {
    return date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
};

/** Получить иконку категории */
const getCategoryLabel = (category) => {
    return CATEGORY_ICONS[category] || category;
};

/** Получить иконку приоритета */
const getPriorityIcon = (priority) => {
    return PRIORITY_ICONS[priority] || '⚡';
};

/** Экранировать HTML */
const escapeHtml = (text) => {
    const element = document.createElement('div');
    element.textContent = text;
    return element.innerHTML;
};

/** Показать уведомление */
function showToast(message, type = '') {
    const toast = getEl('toast');
    if (!toast) return;
    
    toast.textContent = message;
    toast.className = 'toast show' + (type ? ' ' + type : '');
    
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('show'), 2500);
}

/** Показать системное уведомление */
function showNotification(title, body) {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body: body, icon: '/icon-192.png' });
    } else {
        showToast('🔔 ' + title + ': ' + body);
    }
}

// ================================================================
// ДАННЫЕ
// ================================================================

let tasks = [];
let selectedDate = new Date();
let currentDate = new Date();
let multiDays = new Set();
let isMultiSelect = false;
let allTasksOverlay = null;
let editingTaskId = null;

// ================================================================
// РАБОТА С ЗАДАЧАМИ
// ================================================================

/**
 * Загрузить задачи из localStorage
 */
function loadTasks() {
    try {
        const data = localStorage.getItem('tasks');
        if (data) {
            const parsed = JSON.parse(data);
            if (Array.isArray(parsed)) tasks = parsed;
        }
    } catch (error) {
        tasks = [];
    }
}

/**
 * Сохранить задачи в localStorage
 */
function saveTasks() {
    try {
        localStorage.setItem('tasks', JSON.stringify(tasks));
    } catch (error) {
        console.warn('Ошибка сохранения задач:', error);
    }
}

/**
 * Получить задачи на определенную дату
 * @param {string} date - Дата в формате YYYY-MM-DD
 * @returns {Array} Массив задач
 */
function getTasks(date) {
    return tasks.filter(task => task.date === date);
}

/**
 * Получить сегодняшние задачи
 * @returns {Array} Массив задач
 */
function getTodayTasks() {
    return getTasks(formatDate(new Date()));
}

/**
 * Получить срочные задачи (высокий приоритет и не выполнены)
 * @returns {Array} Массив срочных задач
 */
function getUrgentTasks() {
    const now = new Date();
    return tasks.filter(task => 
        !task.completed && 
        task.priority === 'high' && 
        new Date(task.date + 'T' + (task.time || '00:00')).getTime() >= now.getTime() - 86400000
    ).sort((a, b) => 
        new Date(a.date + 'T' + (a.time || '00:00')) - new Date(b.date + 'T' + (b.time || '00:00'))
    );
}

/**
 * Получить просроченные задачи
 * @returns {Array} Массив просроченных задач
 */
function getOverdueTasks() {
    const now = new Date();
    return tasks.filter(task => 
        !task.completed && 
        new Date(task.date + 'T' + (task.time || '23:59')) < now
    );
}

/**
 * Добавить новую задачу
 * @param {string} text - Текст задачи
 * @param {string} category - Категория (work/personal/study/other)
 * @param {string} priority - Приоритет (high/medium/low)
 * @param {string} date - Дата в формате YYYY-MM-DD
 * @param {string} time - Время в формате HH:MM
 * @param {string|null} repeat - Период повторения
 * @param {number} reminderOffset - Напоминание за X минут (0 = выключено)
 * @returns {boolean} - Успешно ли добавлена задача
 */
function addTask(text, category, priority, date, time, repeat, reminderOffset = 0) {
    const trimmedText = text.trim();
    if (!trimmedText) return false;

    const task = {
        id: generateId(),
        text: trimmedText,
        completed: false,
        date: date || formatDate(new Date()),
        category: category || 'work',
        priority: priority || 'medium',
        time: time || '',
        createdAt: Date.now(),
        repeat: repeat || null,
        reminderOffset: reminderOffset || 0
    };

    tasks.push(task);
    saveTasks();
    
    if (reminderOffset > 0) {
        scheduleTaskReminder(task);
    }
    
    renderAll();
    return true;
}

/**
 * Редактировать задачу
 */
function editTask(id, text, category, priority, date, time, repeat, reminderOffset) {
    const task = tasks.find(t => t.id === id);
    if (!task) return false;
    
    task.text = text.trim();
    task.category = category;
    task.priority = priority;
    task.date = date;
    task.time = time || '';
    task.repeat = repeat || null;
    task.reminderOffset = reminderOffset || 0;
    
    saveTasks();
    renderAll();
    return true;
}

/**
 * Удалить задачу по ID
 * @param {string} id - ID задачи
 */
function deleteTask(id) {
    if (!confirm('Удалить задачу?')) return;
    tasks = tasks.filter(task => task.id !== id);
    saveTasks();
    renderAll();
}

/**
 * Переключить статус выполнения задачи
 * @param {string} id - ID задачи
 * @returns {boolean} - Успешно ли переключено
 */
function toggleTask(id) {
    const task = tasks.find(task => task.id === id);
    if (task) {
        task.completed = !task.completed;
        saveTasks();
        renderAll();
        return true;
    }
    return false;
}

/**
 * Подсчитать оставшееся время до дедлайна
 * @param {string} date - Дата в формате YYYY-MM-DD
 * @param {string} time - Время в формате HH:MM
 * @returns {Object} - Объект с днями, часами, минутами, секундами
 */
function getTimeLeft(date, time) {
    try {
        const target = new Date(date + 'T' + (time || '00:00'));
        const diff = target - new Date();
        
        if (diff < 0) {
            return { days: 0, hours: 0, minutes: 0, seconds: 0, overdue: true };
        }
        
        return {
            days: Math.floor(diff / 86400000),
            hours: Math.floor((diff % 86400000) / 3600000),
            minutes: Math.floor((diff % 3600000) / 60000),
            seconds: Math.floor((diff % 60000) / 1000),
            overdue: false
        };
    } catch (error) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0, overdue: true };
    }
}

/**
 * Определить уровень срочности задачи
 * @param {Object} timeLeft - Объект с временем
 * @returns {string} - Уровень срочности (overdue/critical/danger/warning/safe)
 */
function getUrgency(timeLeft) {
    if (timeLeft.overdue) return 'overdue';
    
    const hoursLeft = timeLeft.days * 24 + timeLeft.hours;
    if (hoursLeft > 168) return 'safe';
    if (hoursLeft > 72) return 'warning';
    if (hoursLeft > 24) return 'danger';
    return 'critical';
}

/**
 * Запланировать напоминание о задаче
 */
function scheduleTaskReminder(task) {
    try {
        const target = new Date(task.date + 'T' + (task.time || '09:00'));
        target.setMinutes(target.getMinutes() - task.reminderOffset);
        
        const now = new Date();
        const diff = target - now;
        
        if (diff > 0 && diff < 86400000) {
            setTimeout(() => {
                showNotification(
                    '🔔 Напоминание о задаче',
                    `${task.text} (через ${task.reminderOffset} мин)`
                );
            }, diff);
        }
    } catch (error) {
        console.warn('Ошибка планирования напоминания:', error);
    }
}

/**
 * Создать демо-задачи при первом запуске
 */
function createDemoTasks() {
    const isFirstLaunch = localStorage.getItem('first_launch') !== 'false';
    if (!isFirstLaunch) return;

    const today = formatDate(new Date());
    const tomorrow = formatDate(new Date(Date.now() + 86400000));

    const demoTasks = [
        { text: '📝 Настроить профиль', category: 'work', priority: 'medium', date: today, time: '10:00' },
        { text: '💡 Добавить первую задачу', category: 'personal', priority: 'high', date: today, time: '12:00' },
        { text: '☕️ Перерыв на кофе', category: 'personal', priority: 'low', date: today, time: '15:30' },
        { text: '📊 Подготовить отчёт', category: 'work', priority: 'high', date: tomorrow, time: '09:00' },
        { text: '📅 Запланировать встречу', category: 'work', priority: 'medium', date: tomorrow, time: '14:00' }
    ];

    demoTasks.forEach(taskData => {
        tasks.push({
            id: generateId(),
            ...taskData,
            completed: false,
            createdAt: Date.now(),
            repeat: null,
            reminderOffset: 0
        });
    });

    localStorage.setItem('first_launch', 'false');
    saveTasks();
    showToast('👋 Добро пожаловать! Вот несколько примеров задач');
    
    setTimeout(() => {
        showToast('💡 Нажмите на заголовок панели, чтобы свернуть её');
    }, 3000);
}

// ================================================================
// СТАТИСТИКА И АНАЛИТИКА
// ================================================================

/**
 * Получить статистику выполнения задач
 */
function getTaskStats() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const overdue = getOverdueTasks().length;
    const high = tasks.filter(t => t.priority === 'high').length;
    const urgent = getUrgentTasks().length;
    
    const weekStats = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const key = formatDate(date);
        const dayTasks = tasks.filter(t => t.date === key);
        weekStats.push({
            date: key,
            dayName: getDayName(date),
            total: dayTasks.length,
            completed: dayTasks.filter(t => t.completed).length
        });
    }
    
    return {
        total,
        completed,
        overdue,
        high,
        urgent,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
        weekStats
    };
}

/**
 * Показать модалку со статистикой
 */
function showStatsModal() {
    const stats = getTaskStats();
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.id = 'statsModal';
    modal.innerHTML = `
        <div class="modal-box stats-modal">
            <button class="close-btn" id="statsCloseBtn">✕</button>
            <h3>📊 Статистика</h3>
            
            <div class="stats-grid">
                <div class="stat-card">
                    <span class="stat-icon">📋</span>
                    <span class="stat-value">${stats.total}</span>
                    <span class="stat-label">Всего задач</span>
                </div>
                <div class="stat-card">
                    <span class="stat-icon">✅</span>
                    <span class="stat-value">${stats.completed}</span>
                    <span class="stat-label">Выполнено</span>
                </div>
                <div class="stat-card">
                    <span class="stat-icon">📊</span>
                    <span class="stat-value">${stats.completionRate}%</span>
                    <span class="stat-label">Прогресс</span>
                </div>
                <div class="stat-card">
                    <span class="stat-icon">⏰</span>
                    <span class="stat-value">${stats.overdue}</span>
                    <span class="stat-label">Просрочено</span>
                </div>
                <div class="stat-card">
                    <span class="stat-icon">🔥</span>
                    <span class="stat-value">${stats.urgent}/${stats.high}</span>
                    <span class="stat-label">Срочные</span>
                </div>
            </div>
            
            <div class="stats-week">
                <h4>📅 Выполнение за неделю</h4>
                <div class="week-chart">
                    ${stats.weekStats.map(day => `
                        <div class="week-bar">
                            <div class="bar-label">${day.dayName.slice(0, 2)}</div>
                            <div class="bar-container">
                                <div class="bar-fill ${day.completed === day.total && day.total > 0 ? 'done' : ''}" 
                                     style="height: ${day.total > 0 ? (day.completed / day.total) * 100 : 0}%">
                                </div>
                            </div>
                            <div class="bar-count">${day.completed}/${day.total}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            ${stats.overdue > 0 ? `
                <div class="stats-overdue">
                    <h4>⏰ Просроченные задачи</h4>
                    ${getOverdueTasks().slice(0, 5).map(t => `
                        <div class="overdue-item">${escapeHtml(t.text)}</div>
                    `).join('')}
                    ${stats.overdue > 5 ? `<div class="overdue-more">+ еще ${stats.overdue - 5}</div>` : ''}
                </div>
            ` : ''}
        </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.querySelector('#statsCloseBtn').addEventListener('click', () => {
        modal.remove();
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

// ================================================================
// НАСТРОЙКИ
// ================================================================

let schedule = {
    type: 'standard',
    template: '5_2',
    custom: [0, 1, 1, 1, 1, 1, 0],
    exceptions: {}
};

let showHolidays = localStorage.getItem('show_holidays') !== 'false';
let holidayCountry = localStorage.getItem('holiday_country') || 'ru';

/**
 * Загрузить настройки расписания
 */
function loadSchedule() {
    try {
        const data = localStorage.getItem('schedule');
        if (data) schedule = { ...schedule, ...JSON.parse(data) };
    } catch (error) {
        console.warn('Ошибка загрузки расписания:', error);
    }
}

/**
 * Сохранить настройки расписания
 */
function saveSchedule() {
    try {
        localStorage.setItem('schedule', JSON.stringify(schedule));
    } catch (error) {
        console.warn('Ошибка сохранения расписания:', error);
    }
}

/**
 * Проверить, является ли день рабочим
 * @param {Date} date - Дата для проверки
 * @returns {boolean} - Рабочий ли день
 */
function isWorkDay(date) {
    try {
        const dateKey = formatDate(date);
        if (schedule.exceptions[dateKey] !== undefined) {
            return schedule.exceptions[dateKey] === 1;
        }

        const dayOfWeek = date.getDay();
        
        if (schedule.type === 'standard') {
            return WORK_SCHEDULES[schedule.template]?.[dayOfWeek] === 1;
        }
        
        if (schedule.type === 'custom') {
            return schedule.custom[dayOfWeek] === 1;
        }
        
        return dayOfWeek >= 1 && dayOfWeek <= 5;
    } catch (error) {
        return true;
    }
}

/**
 * Получить праздник для даты
 * @param {Date} date - Дата
 * @returns {string|null} - Название праздника или null
 */
function getHoliday(date) {
    if (!showHolidays) return null;
    
    const key = String(date.getMonth() + 1).padStart(2, '0') + '-' + 
                String(date.getDate()).padStart(2, '0');
    
    const holidays = HOLIDAYS[holidayCountry] || HOLIDAYS.ru;
    const holiday = holidays.find(h => h.date === key);
    return holiday ? holiday.name : null;
}

/**
 * Применить тему оформления
 * @param {string} themeName - Название темы
 */
function applyTheme(themeName) {
    try {
        const body = document.body;
        const themes = ['default', 'dark', 'light', 'winter', 'spring', 
                       'summer', 'autumn', 'minimal', 'tender', 'forest'];
        
        themes.forEach(theme => body.classList.remove(theme));
        if (themeName) body.classList.add(themeName);
        
        localStorage.setItem('theme', themeName || 'default');
        
        getEls('.settings-opt').forEach(element => {
            element.classList.toggle('active', element.dataset.bg === themeName);
        });
    } catch (error) {
        console.warn('Ошибка применения темы:', error);
    }
}

/**
 * Применить размер шрифта
 * @param {number} size - Размер шрифта в px
 */
function applyFontSize(size) {
    document.documentElement.style.setProperty('--fs', size + 'px');
    localStorage.setItem('font_size', size);
    
    const slider = getEl('fontSizeSlider');
    if (slider) slider.value = size;
}

// ================================================================
// УНИВЕРСАЛЬНЫЙ РЕНДЕРИНГ ЗАДАЧ
// ================================================================

/**
 * Универсальная функция рендеринга задач
 * @param {Object} config - Конфигурация рендеринга
 */
function renderTasks(config) {
    try {
        const container = getEl(config.containerId);
        if (!container) return;

        const tasksData = config.getData();
        const panel = config.panelId ? getEl(config.panelId) : null;
        
        if (config.badgeId) {
            const badge = getEl(config.badgeId);
            if (badge) badge.textContent = tasksData.length;
        }

        if (panel) {
            if (tasksData.length === 0) {
                panel.classList.add('collapsed');
            } else {
                panel.classList.remove('collapsed');
            }
        }

        if (tasksData.length === 0) {
            const emptyText = typeof config.emptyText === 'function' 
                ? config.emptyText(selectedDate) 
                : config.emptyText;
            container.innerHTML = `<div class="panel-empty">${emptyText}</div>`;
            return;
        }

        container.innerHTML = tasksData.map(config.renderItem).join('');

        // =============================================
        // ОБРАБОТЧИКИ СОБЫТИЙ
        // =============================================
        
        // Переключение задачи
        container.querySelectorAll('[data-action^="toggle-"]').forEach(element => {
            const newElement = element.cloneNode(true);
            element.parentNode.replaceChild(newElement, element);
            
            newElement.addEventListener('click', function(e) {
                e.stopPropagation();
                const id = this.dataset.id;
                if (id) {
                    toggleTask(id);
                }
            });
        });

        // Удаление задачи
        container.querySelectorAll('[data-action^="delete-"]').forEach(element => {
            const newElement = element.cloneNode(true);
            element.parentNode.replaceChild(newElement, element);
            
            newElement.addEventListener('click', function(e) {
                e.stopPropagation();
                const id = this.dataset.id;
                if (id) {
                    deleteTask(id);
                }
            });
        });
        
        // Редактирование задачи
        container.querySelectorAll('[data-action^="edit-"]').forEach(element => {
            const newElement = element.cloneNode(true);
            element.parentNode.replaceChild(newElement, element);
            
            newElement.addEventListener('click', function(e) {
                e.stopPropagation();
                const id = this.dataset.id;
                if (id) {
                    showEditTaskModal(id);
                }
            });
        });

    } catch (error) {
        console.warn(`Ошибка рендеринга ${config.containerId}:`, error);
    }
}

// ================================================================
// СТАТИСТИКА
// ================================================================

/**
 * Обновить статистику задач
 */
function updateStats() {
    try {
        const stats = getTaskStats();
        
        const totalEl = getEl('totalCount');
        if (totalEl) totalEl.textContent = stats.total;
        
        const doneEl = getEl('statDone');
        if (doneEl) {
            if (stats.total > 0) {
                doneEl.textContent = `${stats.completed}/${stats.total} (${stats.completionRate}%)`;
            } else {
                doneEl.textContent = '0/0 (0%)';
            }
        }
        
        const highEl = getEl('statHigh');
        if (highEl) {
            if (stats.high > 0) {
                highEl.textContent = `${stats.urgent}/${stats.high}`;
            } else {
                highEl.textContent = '0';
            }
        }
        
    } catch (error) {
        console.warn('Ошибка обновления статистики:', error);
    }
}

// ================================================================
// РЕДАКТИРОВАНИЕ ЗАДАЧИ
// ================================================================

function showEditTaskModal(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) {
        showToast('❌ Задача не найдена', 'error');
        return;
    }
    
    editingTaskId = taskId;
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.id = 'editTaskModal';
    modal.innerHTML = `
        <div class="modal-box edit-modal">
            <button class="close-btn" id="editCloseBtn">✕</button>
            <h3>✏️ Редактировать задачу</h3>
            
            <div class="edit-form">
                <div class="edit-field">
                    <label>Текст задачи</label>
                    <input type="text" id="editText" value="${escapeHtml(task.text)}">
                </div>
                
                <div class="edit-field">
                    <label>Дата</label>
                    <input type="date" id="editDate" value="${task.date}">
                </div>
                
                <div class="edit-field">
                    <label>Время</label>
                    <input type="time" id="editTime" value="${task.time || ''}">
                </div>
                
                <div class="edit-field">
                    <label>Категория</label>
                    <select id="editCategory">
                        <option value="work" ${task.category === 'work' ? 'selected' : ''}>💼 Работа</option>
                        <option value="personal" ${task.category === 'personal' ? 'selected' : ''}>❤️ Личное</option>
                        <option value="study" ${task.category === 'study' ? 'selected' : ''}>📚 Учёба</option>
                        <option value="other" ${task.category === 'other' ? 'selected' : ''}>📌 Другое</option>
                    </select>
                </div>
                
                <div class="edit-field">
                    <label>Приоритет</label>
                    <select id="editPriority">
                        <option value="low" ${task.priority === 'low' ? 'selected' : ''}>💤 Низкая</option>
                        <option value="medium" ${task.priority === 'medium' ? 'selected' : ''}>⚡ Средняя</option>
                        <option value="high" ${task.priority === 'high' ? 'selected' : ''}>🔥 Высокая</option>
                    </select>
                </div>
                
                <div class="edit-field">
                    <label>Напоминание</label>
                    <select id="editReminder">
                        <option value="0" ${task.reminderOffset === 0 ? 'selected' : ''}>Выключено</option>
                        <option value="5" ${task.reminderOffset === 5 ? 'selected' : ''}>За 5 минут</option>
                        <option value="15" ${task.reminderOffset === 15 ? 'selected' : ''}>За 15 минут</option>
                        <option value="30" ${task.reminderOffset === 30 ? 'selected' : ''}>За 30 минут</option>
                        <option value="60" ${task.reminderOffset === 60 ? 'selected' : ''}>За 1 час</option>
                    </select>
                </div>
                
                <div class="edit-field">
                    <label>Повтор</label>
                    <select id="editRepeat">
                        <option value="" ${!task.repeat ? 'selected' : ''}>Нет</option>
                        <option value="daily" ${task.repeat === 'daily' ? 'selected' : ''}>Каждый день</option>
                        <option value="weekly" ${task.repeat === 'weekly' ? 'selected' : ''}>Каждую неделю</option>
                        <option value="workdays" ${task.repeat === 'workdays' ? 'selected' : ''}>По будням</option>
                    </select>
                </div>
                
                <button class="edit-save" id="editSaveBtn">💾 Сохранить</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    const closeBtn = modal.querySelector('#editCloseBtn');
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            modal.remove();
            editingTaskId = null;
        });
    }
    
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.remove();
            editingTaskId = null;
        }
    });
    
    const saveBtn = modal.querySelector('#editSaveBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', function() {
            const textEl = document.getElementById('editText');
            const dateEl = document.getElementById('editDate');
            const timeEl = document.getElementById('editTime');
            const categoryEl = document.getElementById('editCategory');
            const priorityEl = document.getElementById('editPriority');
            const reminderEl = document.getElementById('editReminder');
            const repeatEl = document.getElementById('editRepeat');
            
            if (!textEl || !dateEl) {
                showToast('❌ Ошибка формы', 'error');
                return;
            }
            
            const text = textEl.value.trim();
            if (!text) {
                showToast('❌ Введите текст задачи', 'error');
                textEl.focus();
                textEl.style.borderColor = '#ff6b6b';
                setTimeout(() => textEl.style.borderColor = '', 1000);
                return;
            }
            
            const date = dateEl.value;
            const time = timeEl ? timeEl.value : '';
            const category = categoryEl ? categoryEl.value : 'work';
            const priority = priorityEl ? priorityEl.value : 'medium';
            const repeat = repeatEl ? (repeatEl.value || null) : null;
            const reminderOffset = reminderEl ? parseInt(reminderEl.value) : 0;
            
            if (editTask(editingTaskId, text, category, priority, date, time, repeat, reminderOffset)) {
                modal.remove();
                editingTaskId = null;
                showToast('✅ Задача обновлена');
            }
        });
    }
    
    const textInput = modal.querySelector('#editText');
    if (textInput) {
        textInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                const saveBtn = modal.querySelector('#editSaveBtn');
                if (saveBtn) saveBtn.click();
            }
        });
    }
}

// ================================================================
// ЭКСПОРТ В PDF/ТЕКСТ
// ================================================================

function exportTasksToText() {
    if (tasks.length === 0) {
        showToast('❌ Нет задач для экспорта', 'error');
        return null;
    }
    
    let text = '📋 Мои задачи\n';
    text += '='.repeat(40) + '\n';
    text += `📅 ${formatDate(new Date())}\n\n`;
    
    const sorted = [...tasks].sort((a, b) => a.date.localeCompare(b.date));
    let currentDate = '';
    
    sorted.forEach(task => {
        if (task.date !== currentDate) {
            currentDate = task.date;
            text += `\n📆 ${currentDate}:\n`;
        }
        const status = task.completed ? '✅' : '⬜';
        const priority = getPriorityIcon(task.priority);
        const time = task.time ? ` (${task.time})` : '';
        const category = getCategoryLabel(task.category);
        text += `  ${status} ${priority} ${task.text}${time} ${category}\n`;
    });
    
    text += '\n' + '='.repeat(40) + '\n';
    text += `📊 Всего: ${tasks.length}, Выполнено: ${tasks.filter(t => t.completed).length}`;
    
    return text;
}

function exportTasksToPDF() {
    const text = exportTasksToText();
    if (!text) return;
    
    const printWindow = window.open('', '_blank', 'width=600,height=400');
    if (!printWindow) {
        showToast('❌ Блокировщик всплывающих окон', 'error');
        return;
    }
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Мои задачи</title>
            <style>
                body { font-family: 'Courier New', monospace; padding: 20px; max-width: 800px; margin: 0 auto; }
                .header { text-align: center; margin-bottom: 20px; }
                .footer { margin-top: 20px; border-top: 1px solid #ccc; padding-top: 10px; text-align: center; }
                pre { white-space: pre-wrap; font-family: 'Courier New', monospace; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>📋 Мои задачи</h1>
                <p>${formatDate(new Date())}</p>
            </div>
            <pre>${text}</pre>
            <div class="footer">
                <p>Создано в "Архитектор времени" v${APP_VERSION}</p>
            </div>
            <script>
                window.onload = function() {
                    window.print();
                }
            <\/script>
        </body>
        </html>
    `);
    printWindow.document.close();
}

// ================================================================
// ПОДЗАДАЧИ
// ================================================================

function addSubtask(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) {
        showToast('❌ Задача не найдена', 'error');
        return;
    }
    
    const subtaskText = prompt('Введите текст подзадачи:');
    if (!subtaskText || !subtaskText.trim()) return;
    
    const subtask = {
        id: generateId(),
        text: '↳ ' + subtaskText.trim(),
        completed: false,
        date: task.date,
        category: task.category,
        priority: 'medium',
        time: task.time || '',
        createdAt: Date.now(),
        repeat: null,
        reminderOffset: 0,
        parentId: taskId
    };
    
    tasks.push(subtask);
    saveTasks();
    renderAll();
    showToast('✅ Подзадача добавлена');
}

// ================================================================
// ПОДПИСКА НА СИСТЕМНУЮ ТЕМУ
// ================================================================

function setupSystemTheme() {
    const autoTheme = localStorage.getItem('auto_theme') !== 'false';
    
    if (autoTheme && window.matchMedia) {
        const darkModeMedia = window.matchMedia('(prefers-color-scheme: dark)');
        const lightModeMedia = window.matchMedia('(prefers-color-scheme: light)');
        
        function applySystemTheme() {
            if (darkModeMedia.matches) {
                applyTheme('dark');
            } else if (lightModeMedia.matches) {
                applyTheme('light');
            } else {
                applyTheme('default');
            }
        }
        
        applySystemTheme();
        
        try {
            darkModeMedia.addEventListener('change', applySystemTheme);
            lightModeMedia.addEventListener('change', applySystemTheme);
        } catch (e) {
            darkModeMedia.addListener(applySystemTheme);
            lightModeMedia.addListener(applySystemTheme);
        }
    }
}

// ================================================================
// РЕНДЕРИНГ
// ================================================================

/**
 * Обновить заголовок
 */
function updateHeader() {
    try {
        const now = new Date();
        
        const timeEl = getEl('todayTime');
        if (timeEl) {
            timeEl.textContent = now.toLocaleTimeString('ru-RU', {
                hour: '2-digit',
                minute: '2-digit'
            });
        }
        
        const dayNameEl = getEl('todayDayName');
        if (dayNameEl) dayNameEl.textContent = getDayName(now);
        
        const dateEl = getEl('todayDate');
        if (dateEl) {
            dateEl.textContent = now.getDate() + ' ' + 
                now.toLocaleString('ru-RU', { month: 'long' });
        }
        
        const isWork = isWorkDay(now);
        const holiday = getHoliday(now);
        const dayTypeEl = getEl('dayType');
        
        if (dayTypeEl) {
            if (holiday) {
                dayTypeEl.textContent = '🎉 ' + holiday;
                dayTypeEl.className = 'day-type holiday';
            } else if (isWork) {
                dayTypeEl.textContent = '🟢 Рабочий день';
                dayTypeEl.className = 'day-type work';
            } else {
                dayTypeEl.textContent = '🔴 Выходной';
                dayTypeEl.className = 'day-type weekend';
            }
        }
    } catch (error) {
        console.warn('Ошибка обновления заголовка:', error);
    }
}

/**
 * Рендеринг календаря
 */
function renderCalendar() {
    try {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        
        const monthLabel = getEl('monthLabel');
        if (monthLabel) {
            monthLabel.textContent = new Date(year, month)
                .toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
        }
        
        const firstDay = new Date(year, month, 1);
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        let offset = firstDay.getDay() - 1;
        if (offset < 0) offset = 6;
        
        const selectedKey = formatDate(selectedDate);
        const grid = getEl('calendarGrid');
        if (!grid) return;
        
        const weekdays = grid.querySelectorAll('.weekday');
        grid.innerHTML = '';
        weekdays.forEach(day => grid.appendChild(day));
        
        for (let i = 0; i < offset; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.className = 'day other';
            emptyCell.style.visibility = 'hidden';
            grid.appendChild(emptyCell);
        }
        
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dateKey = formatDate(date);
            const cell = document.createElement('button');
            cell.className = 'day';
            
            if (isToday(date)) cell.classList.add('today');
            if (dateKey === selectedKey && !isMultiSelect) cell.classList.add('selected');
            if (multiDays.has(dateKey) && isMultiSelect) cell.classList.add('multi-selected');
            
            const holiday = getHoliday(date);
            if (holiday) {
                cell.classList.add('holiday');
                const icon = document.createElement('span');
                icon.className = 'holiday-icon';
                icon.textContent = '🎉';
                cell.appendChild(icon);
            }
            
            if (isWorkDay(date)) cell.classList.add('workday');
            else cell.classList.add('weekend');
            
            cell.textContent = day;
            cell.dataset.date = dateKey;
            
            if (getTasks(dateKey).length > 0) {
                const dot = document.createElement('div');
                dot.className = 'dot';
                cell.appendChild(dot);
            }
            
            cell.addEventListener('click', function() {
                const dateKey = this.dataset.date;
                const parts = dateKey.split('-').map(Number);
                const clickedDate = new Date(parts[0], parts[1] - 1, parts[2]);
                clickedDate.setHours(0, 0, 0, 0);
                
                if (isMultiSelect) {
                    if (multiDays.has(dateKey)) multiDays.delete(dateKey);
                    else multiDays.add(dateKey);
                    renderCalendar();
                    updateMultiPanel();
                    return;
                }
                
                selectedDate = clickedDate;
                renderCalendar();
                renderTasks(TASK_RENDER_CONFIG.calendar);
                updateHeader();
            });
            
            grid.appendChild(cell);
        }
    } catch (error) {
        console.warn('Ошибка рендеринга календаря:', error);
    }
}

/**
 * Обновить панель мульти-выбора
 */
function updateMultiPanel() {
    try {
        const count = multiDays.size;
        const countEl = getEl('multiCount');
        const panel = getEl('multiSelectPanel');
        
        if (countEl) countEl.textContent = count;
        if (panel) panel.classList.toggle('active', count > 0);
    } catch (error) {
        console.warn('Ошибка обновления мульти-панели:', error);
    }
}

/**
 * Переключить режим мульти-выбора
 */
function toggleMultiSelect() {
    try {
        isMultiSelect = !isMultiSelect;
        const button = getEl('selectModeBtn');
        
        if (isMultiSelect) {
            if (button) {
                button.classList.add('active');
                button.textContent = '✕';
            }
            multiDays.clear();
            multiDays.add(formatDate(selectedDate));
        } else {
            if (button) {
                button.classList.remove('active');
                button.textContent = '✏️';
            }
            multiDays.clear();
            const panel = getEl('multiSelectPanel');
            if (panel) panel.classList.remove('active');
        }
        
        renderCalendar();
        updateMultiPanel();
    } catch (error) {
        console.warn('Ошибка переключения мульти-выбора:', error);
    }
}

/**
 * Рендеринг всех задач (оверлей)
 */
function renderAllTasks() {
    try {
        const list = allTasksOverlay?.querySelector('#allTasksList');
        if (!list) return;
        
        const search = allTasksOverlay.querySelector('#filterSearch')?.value?.toLowerCase().trim() || '';
        const date = allTasksOverlay.querySelector('#filterDate')?.value || '';
        const category = allTasksOverlay.querySelector('#filterCategory')?.value || 'all';
        const priority = allTasksOverlay.querySelector('#filterPriority')?.value || 'all';
        const showOverdue = allTasksOverlay.querySelector('#filterOverdue')?.checked || false;
        
        let filtered = tasks.filter(task => {
            if (search && !task.text.toLowerCase().includes(search)) return false;
            if (date && task.date !== date) return false;
            if (category !== 'all' && task.category !== category) return false;
            if (priority !== 'all' && task.priority !== priority) return false;
            if (showOverdue && !task.completed && !isTaskOverdue(task)) return false;
            return true;
        }).sort((a, b) => {
            if (a.completed !== b.completed) return a.completed ? 1 : -1;
            if (a.time && b.time) return a.time.localeCompare(b.time);
            if (a.time) return -1;
            if (b.time) return 1;
            return a.date.localeCompare(b.date);
        });
        
        if (!filtered.length) {
            list.innerHTML = '<div class="empty"><span>🔍</span><div class="text">Воспользуйтесь фильтром</div></div>';
            return;
        }
        
        list.innerHTML = filtered.map(task => `
            <div class="task-item ${isTaskOverdue(task) && !task.completed ? 'overdue' : ''}" data-id="${task.id}">
                <div class="task-check ${task.completed ? 'done' : ''}" data-action="toggle-all" data-id="${task.id}">${task.completed ? '✓' : ''}</div>
                <div class="task-text ${task.completed ? 'done' : ''}">${escapeHtml(task.text)}</div>
                ${task.time ? `<span class="task-time">${task.time}</span>` : ''}
                <span class="task-tag">${getCategoryLabel(task.category)}</span>
                <span class="task-priority">${getPriorityIcon(task.priority)}</span>
                ${isTaskOverdue(task) && !task.completed ? `<span class="task-overdue-badge">⏰</span>` : ''}
                <button class="task-del" data-action="delete-all" data-id="${task.id}">✕</button>
            </div>
        `).join('');
        
        list.querySelectorAll('[data-action="toggle-all"]').forEach(element => {
            const newElement = element.cloneNode(true);
            element.parentNode.replaceChild(newElement, element);
            
            newElement.addEventListener('click', function(e) {
                e.stopPropagation();
                toggleTask(this.dataset.id);
            });
        });
        
        list.querySelectorAll('[data-action="delete-all"]').forEach(element => {
            const newElement = element.cloneNode(true);
            element.parentNode.replaceChild(newElement, element);
            
            newElement.addEventListener('click', function(e) {
                e.stopPropagation();
                deleteTask(this.dataset.id);
            });
        });
        
        updateStats();
    } catch (error) {
        console.warn('Ошибка рендеринга всех задач:', error);
    }
}

function isTaskOverdue(task) {
    const target = new Date(task.date + 'T' + (task.time || '23:59'));
    return target < new Date();
}

/**
 * Главная функция рендеринга
 */
function renderAll() {
    renderTasks(TASK_RENDER_CONFIG.urgent);
    renderTasks(TASK_RENDER_CONFIG.today);
    renderTasks(TASK_RENDER_CONFIG.calendar);
    renderAllTasks();
    updateStats();
    renderCalendar();
}

// ================================================================
// ПОГОДА
// ================================================================

/**
 * Получить погоду по геолокации
 */
function getWeather() {
    if (!navigator.geolocation) {
        updateWeather('☀️');
        return;
    }
    
    navigator.geolocation.getCurrentPosition(
        async (position) => {
            try {
                const { latitude, longitude } = position.coords;
                const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&timezone=auto`;
                
                const response = await fetch(url);
                const data = await response.json();
                
                if (data.current_weather) {
                    const temp = Math.round(data.current_weather.temperature);
                    const weatherIcon = WEATHER_MAP[data.current_weather.weathercode] || '☀️';
                    updateWeather(weatherIcon + ' ' + temp + '°');
                }
            } catch (error) {
                updateWeather('☀️');
            }
        },
        () => updateWeather('☀️'),
        { timeout: 8000 }
    );
}

/**
 * Обновить отображение погоды
 * @param {string} text - Текст погоды
 */
function updateWeather(text) {
    const weatherEl = getEl('weatherIcon');
    if (weatherEl) weatherEl.textContent = text;
}

// ================================================================
// НАСТРОЙКИ UI
// ================================================================

/**
 * Настроить панель настроек
 */
function setupSettingsPanel() {
    const panel = getEl('settingsPanel');
    const button = getEl('settingsBtn');
    
    console.log('🔧 Настройка панели настроек...');
    
    if (!button || !panel) {
        console.warn('⚠️ Панель настроек не найдена');
        return;
    }
    
    button.addEventListener('click', function(event) {
        event.stopPropagation();
        panel.classList.toggle('active');
        console.log('📂 Панель настроек:', panel.classList.contains('active') ? 'открыта' : 'закрыта');
    });
    
    const closeButton = getEl('settingsClose');
    if (closeButton) {
        closeButton.addEventListener('click', function() {
            panel.classList.remove('active');
        });
    }
    
    document.addEventListener('click', function(event) {
        if (panel && !panel.contains(event.target) && event.target !== button) {
            panel.classList.remove('active');
        }
    });
    
    // =============================================
    // НАСТРОЙКА СЕКЦИЙ
    // =============================================
    
    const sectionHeaders = getEls('.settings-section-header');
    console.log(`📋 Найдено секций: ${sectionHeaders.length}`);
    
    sectionHeaders.forEach((header, index) => {
        const newHeader = header.cloneNode(true);
        header.parentNode.replaceChild(newHeader, header);
        
        newHeader.addEventListener('click', function(event) {
            event.stopPropagation();
            
            const body = this.nextElementSibling;
            if (!body || !body.classList.contains('settings-section-body')) {
                console.warn('⚠️ Нет body для секции');
                return;
            }
            
            const isOpen = body.classList.contains('open');
            body.classList.toggle('open');
            this.classList.toggle('open');
            
            const sectionName = this.dataset.section;
            if (sectionName) {
                try {
                    localStorage.setItem('section_' + sectionName, !isOpen);
                } catch (e) {
                    console.warn('Ошибка сохранения состояния секции:', e);
                }
            }
            
            console.log(`📂 Секция ${sectionName || index}: ${!isOpen ? 'открыта' : 'закрыта'}`);
        });
        
        try {
            const sectionName = newHeader.dataset.section;
            if (sectionName && localStorage.getItem('section_' + sectionName) === 'true') {
                newHeader.classList.add('open');
                const body = newHeader.nextElementSibling;
                if (body && body.classList.contains('settings-section-body')) {
                    body.classList.add('open');
                }
            }
        } catch (e) {
            console.warn('Ошибка восстановления состояния секции:', e);
        }
    });
    
    // =============================================
    // НАСТРОЙКА ОСТАЛЬНЫХ ЭЛЕМЕНТОВ
    // =============================================
    
    // Тема
    getEls('.settings-opt').forEach(element => {
        element.addEventListener('click', function() {
            const theme = this.dataset.bg;
            applyTheme(theme);
            showToast('🎨 ' + theme);
            panel.classList.remove('active');
        });
    });
    
    // Автоматическая тема
    const autoThemeRow = document.createElement('div');
    autoThemeRow.className = 'settings-row';
    autoThemeRow.style.marginTop = '4px';
    autoThemeRow.innerHTML = `
        <label class="settings-toggle" style="width:100%;">
            <input type="checkbox" id="autoThemeToggle" ${localStorage.getItem('auto_theme') !== 'false' ? 'checked' : ''}>
            <span>Автоматическая тема (по системе)</span>
        </label>
    `;
    
    const appearanceSection = getEl('sectionAppearance');
    if (appearanceSection) {
        const lastChild = appearanceSection.lastElementChild;
        if (lastChild) {
            appearanceSection.insertBefore(autoThemeRow, lastChild);
        } else {
            appearanceSection.appendChild(autoThemeRow);
        }
        
        const autoThemeToggle = getEl('autoThemeToggle');
        if (autoThemeToggle) {
            autoThemeToggle.addEventListener('change', function() {
                localStorage.setItem('auto_theme', this.checked);
                if (this.checked) {
                    setupSystemTheme();
                } else {
                    applyTheme(localStorage.getItem('theme') || 'default');
                }
            });
        }
    }
    
    // Шрифт
    const fontSizeSlider = getEl('fontSizeSlider');
    if (fontSizeSlider) {
        fontSizeSlider.addEventListener('input', function() {
            applyFontSize(parseInt(this.value));
        });
    }
    
    const resetFontSize = getEl('resetFontSize');
    if (resetFontSize) {
        resetFontSize.addEventListener('click', () => applyFontSize(16));
    }
    
    // График работы
    const scheduleTemplate = getEl('scheduleTemplate');
    if (scheduleTemplate) {
        scheduleTemplate.addEventListener('change', function() {
            const customSchedule = getEl('customSchedule');
            if (customSchedule) {
                customSchedule.style.display = this.value === 'custom' ? 'block' : 'none';
            }
            
            if (this.value === 'custom') {
                schedule.type = 'custom';
                getEls('.day-toggle').forEach(checkbox => {
                    const day = parseInt(checkbox.dataset.day);
                    schedule.custom[day] = checkbox.checked ? 1 : 0;
                });
            } else {
                schedule.type = 'standard';
                schedule.template = this.value;
            }
            
            saveSchedule();
            renderAll();
            updateHeader();
        });
    }
    
    getEls('.day-toggle').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const day = parseInt(this.dataset.day);
            schedule.custom[day] = this.checked ? 1 : 0;
            if (schedule.type === 'custom') {
                saveSchedule();
                renderAll();
                updateHeader();
            }
        });
    });
    
    // Праздники
    const showHolidaysToggle = getEl('showHolidaysToggle');
    if (showHolidaysToggle) {
        showHolidaysToggle.checked = showHolidays;
        showHolidaysToggle.addEventListener('change', function() {
            showHolidays = this.checked;
            localStorage.setItem('show_holidays', showHolidays);
            renderCalendar();
        });
    }
    
    const holidayCountrySelect = getEl('holidayCountry');
    if (holidayCountrySelect) {
        holidayCountrySelect.value = holidayCountry;
        holidayCountrySelect.addEventListener('change', function() {
            holidayCountry = this.value;
            localStorage.setItem('holiday_country', holidayCountry);
            renderCalendar();
        });
    }
    
    // Фон с ограничением размера
    const uploadBgButton = getEl('uploadBg');
    if (uploadBgButton) {
        uploadBgButton.addEventListener('click', () => {
            const fileInput = getEl('fileInputBg');
            if (fileInput) fileInput.click();
        });
    }
    
    const fileInputBg = getEl('fileInputBg');
    if (fileInputBg) {
        fileInputBg.addEventListener('change', function(event) {
            const file = this.files[0];
            if (!file) return;
            
            if (file.size > 1024 * 1024) {
                showToast('❌ Файл слишком большой! Максимум 1 МБ', 'error');
                this.value = '';
                return;
            }
            
            const reader = new FileReader();
            reader.onload = function(loadEvent) {
                const url = loadEvent.target.result;
                document.body.style.backgroundImage = 'url("' + url + '")';
                document.body.style.backgroundSize = 'cover';
                document.body.style.backgroundPosition = 'center';
                document.body.style.backgroundRepeat = 'no-repeat';
                localStorage.setItem('bg_custom', url);
                
                const preview = getEl('bgPreview');
                if (preview) {
                    preview.style.backgroundImage = 'url("' + url + '")';
                    preview.style.backgroundSize = 'cover';
                    preview.style.backgroundPosition = 'center';
                    preview.classList.add('active');
                }
                
                const resetBgButton = getEl('resetBg');
                if (resetBgButton) resetBgButton.style.display = 'block';
                
                panel.classList.remove('active');
                showToast('✅ Фон загружен');
            };
            reader.readAsDataURL(file);
            this.value = '';
        });
    }
    
    const resetBgButton = getEl('resetBg');
    if (resetBgButton) {
        resetBgButton.addEventListener('click', function() {
            document.body.style.backgroundImage = 'none';
            document.body.style.backgroundSize = '';
            document.body.style.backgroundPosition = '';
            document.body.style.backgroundRepeat = '';
            localStorage.removeItem('bg_custom');
            
            const preview = getEl('bgPreview');
            if (preview) {
                preview.classList.remove('active');
                preview.style.backgroundImage = 'none';
            }
            
            this.style.display = 'none';
            applyTheme(localStorage.getItem('theme') || 'default');
            panel.classList.remove('active');
            showToast('🔄 Фон сброшен');
        });
    }
    
    const customBg = localStorage.getItem('bg_custom');
    if (customBg) {
        document.body.style.backgroundImage = 'url("' + customBg + '")';
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundPosition = 'center';
        document.body.style.backgroundRepeat = 'no-repeat';
        
        const preview = getEl('bgPreview');
        if (preview) {
            preview.style.backgroundImage = 'url("' + customBg + '")';
            preview.style.backgroundSize = 'cover';
            preview.style.backgroundPosition = 'center';
            preview.classList.add('active');
        }
        
        if (resetBgButton) resetBgButton.style.display = 'block';
    }
    
    // Кнопка статистики
    const statsBtn = document.createElement('button');
    statsBtn.className = 'settings-btn-sm primary';
    statsBtn.textContent = '📊 Статистика';
    statsBtn.style.marginTop = '4px';
    statsBtn.addEventListener('click', function() {
        showStatsModal();
        panel.classList.remove('active');
    });
    
    const aboutSection = getEl('sectionAbout');
    if (aboutSection) {
        const feedbackBtn = aboutSection.querySelector('#feedbackBtn');
        if (feedbackBtn) {
            feedbackBtn.parentNode.insertBefore(statsBtn, feedbackBtn);
        }
    }
    
    console.log('✅ Настройки панели настроек завершены');
}

// ================================================================
// ФОРМА ДОБАВЛЕНИЯ
// ================================================================

/**
 * Настроить форму добавления задачи на сегодня
 */
function setupTodayForm() {
    const form = getEl('todayForm');
    const input = getEl('todayInput');
    const submitButton = getEl('todaySubmitBtn');
    
    if (!form || !input) {
        console.warn('⚠️ Форма не найдена');
        return;
    }
    
    function addTaskFromForm() {
        const text = input.value.trim();
        if (!text) {
            showToast('❌ Введите название задачи', 'error');
            input.style.borderColor = '#ff6b6b';
            setTimeout(() => input.style.borderColor = '', 1000);
            input.focus();
            return;
        }
        
        let category = 'work';
        const activeTag = form.querySelector('#todayTagSelector .tag-btn.active');
        if (activeTag) {
            category = activeTag.dataset.tag;
            if (category === 'custom') {
                const customInput = getEl('todayCustomInput');
                category = customInput?.value?.trim() || 'other';
                category = category.toLowerCase().replace(/\s+/g, '_');
            }
        }
        
        let priority = 'medium';
        const activePriority = form.querySelector('#todayPrioritySelector .tag-btn.active');
        if (activePriority) priority = activePriority.dataset.priority;
        
        const time = getEl('todayTimeInput')?.value || '';
        
        if (addTask(text, category, priority, formatDate(new Date()), time, null, 0)) {
            input.value = '';
            localStorage.removeItem('task_draft');
            
            const timeInput = getEl('todayTimeInput');
            if (timeInput) timeInput.value = '';
            
            input.focus();
            showToast('✅ Добавлено');
        }
    }
    
    if (submitButton) {
        submitButton.addEventListener('click', function(event) {
            event.preventDefault();
            addTaskFromForm();
        });
    }
    
    let enterTimeout = null;
    input.addEventListener('keydown', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            clearTimeout(enterTimeout);
            enterTimeout = setTimeout(() => {
                addTaskFromForm();
            }, 50);
        }
    });
    
    input.addEventListener('input', function() {
        const draft = input.value.trim();
        if (draft) localStorage.setItem('task_draft', draft);
        else localStorage.removeItem('task_draft');
    });
    
    const tagSelector = getEl('todayTagSelector');
    if (tagSelector) {
        tagSelector.querySelectorAll('.tag-btn').forEach(button => {
            button.addEventListener('click', function() {
                tagSelector.querySelectorAll('.tag-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                
                const customCat = getEl('todayCustomCat');
                if (customCat) {
                    customCat.style.display = this.dataset.tag === 'custom' ? 'block' : 'none';
                }
            });
        });
    }
    
    const prioritySelector = getEl('todayPrioritySelector');
    if (prioritySelector) {
        prioritySelector.querySelectorAll('.tag-btn').forEach(button => {
            button.addEventListener('click', function() {
                prioritySelector.querySelectorAll('.tag-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
            });
        });
    }
    
    form.addEventListener('submit', function(event) {
        event.preventDefault();
        return false;
    });
}

/**
 * Загрузить черновик задачи
 */
function loadDraft() {
    try {
        const draft = localStorage.getItem('task_draft');
        if (draft) {
            const input = getEl('todayInput');
            if (input) {
                input.value = draft;
                setTimeout(() => input.focus(), 300);
                input.setSelectionRange(draft.length, draft.length);
            }
        }
    } catch (error) {
        console.warn('Ошибка загрузки черновика:', error);
    }
}

// ================================================================
// БЫСТРОЕ ДОБАВЛЕНИЕ
// ================================================================

/**
 * Настроить панель быстрого добавления
 */
function setupQuickAdd() {
    const overlay = getEl('quickAddOverlay');
    const fabAdd = getEl('fabAdd');
    
    if (!fabAdd || !overlay) return;
    
    fabAdd.addEventListener('click', function() {
        overlay.classList.add('active');
        
        const input = getEl('qaInput');
        if (input) {
            input.value = '';
            setTimeout(() => input.focus(), 100);
        }
        
        const dateInput = getEl('qaDate');
        if (dateInput) dateInput.value = formatDate(new Date());
        
        const buttons = overlay.querySelectorAll('.qa-date-wrap button');
        buttons.forEach(button => {
            button.classList.toggle('active', button.dataset.offset === '0');
        });
        
        const repeatCheckbox = getEl('qaRepeat');
        if (repeatCheckbox) repeatCheckbox.checked = false;
        
        const repeatSelect = getEl('qaRepeatPeriod');
        if (repeatSelect) repeatSelect.classList.remove('active');
    });
    
    const closeButton = getEl('qaClose');
    if (closeButton) {
        closeButton.addEventListener('click', function() {
            overlay.classList.remove('active');
        });
    }
    
    overlay.addEventListener('click', function(event) {
        if (event.target === overlay) overlay.classList.remove('active');
    });
    
    overlay.querySelectorAll('.qa-date-wrap button').forEach(button => {
        button.addEventListener('click', function() {
            overlay.querySelectorAll('.qa-date-wrap button').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            const offset = parseInt(this.dataset.offset);
            const date = new Date();
            date.setDate(date.getDate() + offset);
            
            const dateInput = getEl('qaDate');
            if (dateInput) dateInput.value = formatDate(date);
        });
    });
    
    const dateInput = getEl('qaDate');
    if (dateInput) {
        dateInput.addEventListener('change', function() {
            overlay.querySelectorAll('.qa-date-wrap button').forEach(b => b.classList.remove('active'));
        });
    }
    
    const newCategoryButton = getEl('qaNewCat');
    if (newCategoryButton) {
        newCategoryButton.addEventListener('click', function() {
            try {
                const categoryName = prompt('Введите название новой категории:');
                if (categoryName && categoryName.trim()) {
                    const value = categoryName.trim().toLowerCase().replace(/\s+/g, '_');
                    const select = getEl('qaCategory');
                    if (select) {
                        const option = document.createElement('option');
                        option.value = value;
                        option.textContent = '📁 ' + categoryName.trim();
                        select.appendChild(option);
                        select.value = value;
                        showToast('✅ Категория добавлена');
                    }
                }
            } catch (error) {
                console.warn('Ошибка добавления категории:', error);
            }
        });
    }
    
    const repeatCheckbox = getEl('qaRepeat');
    if (repeatCheckbox) {
        repeatCheckbox.addEventListener('change', function() {
            const repeatSelect = getEl('qaRepeatPeriod');
            if (repeatSelect) repeatSelect.classList.toggle('active', this.checked);
        });
    }
    
    const submitButton = getEl('qaSubmit');
    if (submitButton) {
        submitButton.addEventListener('click', function() {
            try {
                const input = getEl('qaInput');
                if (!input) return;
                
                const text = input.value.trim();
                if (!text) {
                    input.className = 'qa-input required';
                    input.focus();
                    showToast('❌ Введите название задачи', 'error');
                    return;
                }
                
                input.className = 'qa-input';
                
                const date = getEl('qaDate')?.value || formatDate(new Date());
                const time = getEl('qaTime')?.value || '';
                const category = getEl('qaCategory')?.value || 'work';
                const priority = getEl('qaPriority')?.value || 'medium';
                const repeat = getEl('qaRepeat')?.checked ? getEl('qaRepeatPeriod')?.value : null;
                const reminder = parseInt(getEl('qaReminder')?.value || 0);
                
                if (addTask(text, category, priority, date, time, repeat, reminder)) {
                    input.value = '';
                    overlay.classList.remove('active');
                    showToast('✅ Добавлено' + (repeat ? ' (с повтором)' : ''));
                }
            } catch (error) {
                console.warn('Ошибка быстрого добавления:', error);
            }
        });
    }
    
    const quickInput = getEl('qaInput');
    if (quickInput) {
        quickInput.addEventListener('keydown', function(event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                const submit = getEl('qaSubmit');
                if (submit) submit.click();
            }
        });
    }
}

// ================================================================
// ГОЛОСОВОЙ ВВОД
// ================================================================

let voiceRecognition = null;
let isVoiceRecording = false;

/**
 * Настроить голосовой ввод
 */
function setupVoiceInput() {
    const voiceButton = getEl('fabVoice');
    if (!voiceButton) return;
    
    voiceButton.addEventListener('click', function() {
        if (isVoiceRecording) {
            if (voiceRecognition) {
                voiceRecognition.abort();
                voiceRecognition = null;
            }
            isVoiceRecording = false;
            this.classList.remove('active');
            this.textContent = '🎤';
            showToast('❌ Запись отменена');
            return;
        }
        
        try {
            if (!('webkitSpeechRecognition' in window)) {
                showToast('❌ Голосовой ввод не поддерживается', 'error');
                return;
            }
            
            voiceRecognition = new webkitSpeechRecognition();
            voiceRecognition.lang = 'ru-RU';
            voiceRecognition.interimResults = false;
            voiceRecognition.continuous = false;
            
            voiceRecognition.onstart = () => {
                this.classList.add('active');
                this.textContent = '⏹';
                isVoiceRecording = true;
                showToast('🎤 Слушаю... (нажмите ещё раз для отмены)');
            };
            
            voiceRecognition.onresult = (event) => {
                try {
                    const text = event.results[0][0].transcript;
                    this.classList.remove('active');
                    this.textContent = '🎤';
                    isVoiceRecording = false;
                    
                    const result = parseVoiceCommand(text);
                    
                    if (result) {
                        showToast('✅ Добавлено: "' + result.text + '"');
                        if (addTask(result.text, result.category, result.priority, 
                                    result.date, result.time, result.repeat, result.reminder)) {
                            renderAll();
                        }
                    } else {
                        showToast('❌ Не удалось распознать команду', 'error');
                    }
                } catch (error) {
                    console.warn('Ошибка обработки голоса:', error);
                    showToast('❌ Ошибка распознавания', 'error');
                }
            };
            
            voiceRecognition.onerror = function() {
                this.classList.remove('active');
                this.textContent = '🎤';
                isVoiceRecording = false;
                showToast('❌ Ошибка распознавания', 'error');
            };
            
            voiceRecognition.onend = function() {
                this.classList.remove('active');
                this.textContent = '🎤';
                isVoiceRecording = false;
            };
            
            voiceRecognition.start();
        } catch (error) {
            console.warn('Ошибка голосового ввода:', error);
            showToast('❌ Ошибка', 'error');
        }
    });
}

/**
 * Парсинг голосовой команды
 */
function parseVoiceCommand(text) {
    const words = text.toLowerCase().split(' ');
    let date = new Date();
    let time = '';
    let repeat = null;
    let reminder = 0;
    let priority = 'medium';
    let category = 'work';
    
    // Определяем дату
    if (words.includes('завтра')) {
        date = new Date();
        date.setDate(date.getDate() + 1);
    } else if (words.includes('послезавтра')) {
        date = new Date();
        date.setDate(date.getDate() + 2);
    } else if (words.includes('через')) {
        const match = text.match(/через\s+(\d+)\s+дн/);
        if (match) {
            const days = parseInt(match[1]);
            date = new Date();
            date.setDate(date.getDate() + days);
        }
    } else {
        const weekdays = ['понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота', 'воскресенье'];
        const today = new Date();
        const todayIndex = today.getDay();
        
        for (let i = 0; i < weekdays.length; i++) {
            if (words.includes(weekdays[i])) {
                let offset = (i + 1 - todayIndex + 7) % 7;
                if (offset === 0) offset = 7;
                date = new Date(today);
                date.setDate(today.getDate() + offset);
                break;
            }
        }
    }
    
    // Определяем время
    const timeMatch = text.match(/(\d{1,2}):(\d{2})/);
    if (timeMatch) {
        time = timeMatch[0];
        date.setHours(parseInt(timeMatch[1]), parseInt(timeMatch[2]), 0, 0);
    } else {
        const hourMatch = text.match(/в\s*(\d{1,2})(?:\s*часа?|:)/);
        if (hourMatch) {
            let hour = parseInt(hourMatch[1]);
            let minutes = 0;
            
            if (words.includes('30')) minutes = 30;
            if (words.includes('половина')) minutes = 30;
            
            if (words.includes('вечера') || words.includes('вечер')) {
                if (hour < 12) hour += 12;
            } else if (words.includes('утра') || words.includes('утро')) {
                if (hour === 12) hour = 0;
            }
            
            time = String(hour).padStart(2, '0') + ':' + String(minutes).padStart(2, '0');
            date.setHours(hour, minutes, 0, 0);
        }
    }
    
    // Определяем повтор
    if (words.includes('каждый') || words.includes('ежедневно')) repeat = 'daily';
    if (words.includes('еженедельно')) repeat = 'weekly';
    if (words.includes('по будням')) repeat = 'workdays';
    if (words.includes('ежегодно')) repeat = 'yearly';
    
    // Определяем напоминание
    if (words.includes('напомни')) {
        if (words.includes('5')) reminder = 5;
        else if (words.includes('15')) reminder = 15;
        else if (words.includes('30')) reminder = 30;
        else if (words.includes('час')) reminder = 60;
        else reminder = 15;
    }
    
    // Определяем приоритет
    if (words.includes('срочно') || words.includes('важно')) priority = 'high';
    if (words.includes('неважно') || words.includes('потом')) priority = 'low';
    
    // Определяем категорию
    if (words.includes('личное')) category = 'personal';
    if (words.includes('учеба') || words.includes('учёба') || words.includes('уроки')) category = 'study';
    if (words.includes('работа') || words.includes('дело') || words.includes('проект')) category = 'work';
    
    // Извлекаем текст задачи
    const stopWords = ['сегодня', 'завтра', 'послезавтра', 'через', 'дн', 'в', 'на', 'по', 'время', 
                      'часов', 'минут', 'утра', 'дня', 'вечера', 'каждый', 'ежедневно', 
                      'еженедельно', 'по будням', 'ежегодно', 'срочно', 'важно', 'неважно',
                      'личное', 'работа', 'учеба', 'учёба', 'уроки', 'дело', 'проект',
                      'напомни', 'час', 'половина', 'утро', 'вечер'];
    
    const taskWords = text.split(' ').filter(word => 
        !stopWords.includes(word.toLowerCase()) && 
        !word.match(/\d{1,2}:\d{2}/) &&
        !word.match(/\d+/)
    );
    const taskText = taskWords.join(' ').trim() || text;
    
    if (!taskText) return null;
    
    return {
        text: taskText,
        date: formatDate(date),
        time: time,
        repeat: repeat,
        reminder: reminder,
        priority: priority,
        category: category
    };
}

// ================================================================
// НАВИГАЦИЯ
// ================================================================

function setupNavigation() {
    console.log('🔧 Настройка навигации...');
    
    const navButtons = getEls('.nav-btn');
    console.log(`📋 Найдено кнопок навигации: ${navButtons.length}`);
    
    if (navButtons.length === 0) {
        console.warn('⚠️ Кнопки навигации не найдены!');
        return;
    }
    
    navButtons.forEach((button) => {
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
        
        newButton.addEventListener('click', function(event) {
            event.preventDefault();
            
            // Если это кнопка отзыва
            if (this.dataset.tab === 'feedback') {
                const modal = getEl('feedbackModal');
                if (modal) modal.classList.add('active');
                document.body.style.overflow = 'hidden';
                return;
            }
            
            console.log(`🔄 Переключение на: ${this.dataset.tab}`);
            
            const allNavButtons = getEls('.nav-btn');
            allNavButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            const allTabs = getEls('.tab-content');
            allTabs.forEach(tab => tab.classList.remove('active'));
            
            const tabId = 'tab-' + this.dataset.tab;
            const targetTab = getEl(tabId);
            
            if (targetTab) {
                targetTab.classList.add('active');
                console.log(`✅ Открыта вкладка: ${tabId}`);
                
                if (this.dataset.tab === 'calendar') {
                    renderCalendar();
                    renderTasks(TASK_RENDER_CONFIG.calendar);
                }
                
                if (this.dataset.tab === 'today') {
                    renderTasks(TASK_RENDER_CONFIG.urgent);
                    renderTasks(TASK_RENDER_CONFIG.today);
                    updateHeader();
                    updateStats();
                }
            } else {
                console.warn(`⚠️ Вкладка не найдена: ${tabId}`);
            }
        });
    });
    
    // Активируем первую вкладку
    setTimeout(function() {
        const activeButton = document.querySelector('.nav-btn.active');
        if (activeButton && activeButton.dataset.tab !== 'feedback') {
            const tabId = 'tab-' + activeButton.dataset.tab;
            const targetTab = getEl(tabId);
            if (targetTab) {
                targetTab.classList.add('active');
                console.log(`✅ Активирована вкладка: ${tabId}`);
            }
        } else {
            const firstButton = document.querySelector('.nav-btn:not([data-tab="feedback"])');
            if (firstButton) {
                firstButton.classList.add('active');
                const tabId = 'tab-' + firstButton.dataset.tab;
                const targetTab = getEl(tabId);
                if (targetTab) {
                    targetTab.classList.add('active');
                    console.log(`✅ Активирована первая вкладка: ${tabId}`);
                }
            }
        }
    }, 100);
}

// ================================================================
// ПАНЕЛИ
// ================================================================

/**
 * Настроить сворачивание панелей
 */
function setupPanels() {
    const setupPanel = (panelId, toggleId) => {
        const panel = getEl(panelId);
        const toggle = getEl(toggleId);
        
        if (panel && toggle) {
            toggle.addEventListener('click', function(event) {
                event.stopPropagation();
                panel.classList.toggle('collapsed');
                localStorage.setItem('panel_' + panelId, panel.classList.contains('collapsed'));
            });
            
            if (localStorage.getItem('panel_' + panelId) === 'true') {
                panel.classList.add('collapsed');
            }
        }
    };
    
    setupPanel('urgentPanel', 'urgentToggle');
    setupPanel('todayPanel', 'todayTasksToggle');
}

// ================================================================
// КНОПКИ
// ================================================================

/**
 * Создать оверлей всех задач
 */
function createAllTasksOverlay() {
    try {
        if (allTasksOverlay) return;
        
        const overlay = document.createElement('div');
        overlay.className = 'all-tasks-overlay';
        overlay.id = 'allTasksOverlay';
        overlay.innerHTML = `
            <div class="all-tasks-sheet">
                <div class="sheet-header">
                    <h2>📋 Все задачи</h2>
                    <button class="close-sheet" id="closeAllTasksSheet">✕</button>
                </div>
                <div class="filters">
                    <div class="filters-grid">
                        <div class="filter-group">
                            <label>Поиск</label>
                            <input type="text" id="filterSearch" placeholder="Поиск...">
                        </div>
                        <div class="filter-group">
                            <label>Дата</label>
                            <input type="date" id="filterDate">
                        </div>
                        <div class="filter-group">
                            <label>Категория</label>
                            <select id="filterCategory">
                                <option value="all">Все</option>
                                <option value="work">💼</option>
                                <option value="personal">❤️</option>
                                <option value="study">📚</option>
                                <option value="other">📌</option>
                            </select>
                        </div>
                        <div class="filter-group">
                            <label>Важность</label>
                            <select id="filterPriority">
                                <option value="all">Все</option>
                                <option value="high">🔥 Высокая</option>
                                <option value="medium">⚡ Средняя</option>
                                <option value="low">💤 Низкая</option>
                            </select>
                        </div>
                        <div class="filter-group" style="grid-column:1/-1;">
                            <label style="display:flex;align-items:center;gap:4px;cursor:pointer;">
                                <input type="checkbox" id="filterOverdue"> 
                                <span style="color:var(--text2);font-size:10px;">Показать только просроченные</span>
                            </label>
                        </div>
                        <div class="filter-actions">
                            <button class="text-link" id="resetFilters">Сброс</button>
                        </div>
                    </div>
                </div>
                <div class="all-task-list" id="allTasksList"></div>
                <div class="actions">
                    <button class="action-btn primary" id="clearAll">🗑️ Очистить все</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        allTasksOverlay = overlay;
        
        overlay.querySelector('#closeAllTasksSheet').addEventListener('click', () => {
            overlay.classList.remove('active');
        });
        
        overlay.addEventListener('click', event => {
            if (event.target === overlay) overlay.classList.remove('active');
        });
        
        overlay.querySelector('#clearAll').addEventListener('click', () => {
            if (!tasks.length) return;
            if (confirm('⚠️ Вы уверены, что хотите удалить ВСЕ задачи? Это действие нельзя отменить.')) {
                tasks = [];
                saveTasks();
                renderAll();
                showToast('🗑️ Все задачи удалены');
            }
        });
        
        overlay.querySelector('#resetFilters').addEventListener('click', () => {
            overlay.querySelector('#filterSearch').value = '';
            overlay.querySelector('#filterDate').value = '';
            overlay.querySelector('#filterCategory').value = 'all';
            overlay.querySelector('#filterPriority').value = 'all';
            overlay.querySelector('#filterOverdue').checked = false;
            renderAllTasks();
        });
        
        const searchInput = overlay.querySelector('#filterSearch');
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                clearTimeout(window._searchDebounce);
                window._searchDebounce = setTimeout(renderAllTasks, 300);
            });
        }
        
        overlay.querySelector('#filterDate')?.addEventListener('change', renderAllTasks);
        overlay.querySelector('#filterCategory')?.addEventListener('change', renderAllTasks);
        overlay.querySelector('#filterPriority')?.addEventListener('change', renderAllTasks);
        overlay.querySelector('#filterOverdue')?.addEventListener('change', renderAllTasks);
        
    } catch (error) {
        console.warn('Ошибка создания оверлея задач:', error);
    }
}

/**
 * Настроить все кнопки приложения
 */
function setupButtons() {
    const allTasksButton = getEl('allTasksBtn');
    if (allTasksButton) {
        allTasksButton.addEventListener('click', function() {
            createAllTasksOverlay();
            if (allTasksOverlay) {
                allTasksOverlay.classList.add('active');
                renderAllTasks();
            }
        });
    }
    
    const feedbackBtn = getEl('feedbackBtn');
    if (feedbackBtn) {
        feedbackBtn.addEventListener('click', () => {
            const modal = getEl('feedbackModal');
            if (modal) modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            
            const settingsPanel = getEl('settingsPanel');
            if (settingsPanel) settingsPanel.classList.remove('active');
        });
    }
    
    const feedbackCloseBtn = getEl('feedbackCloseBtn');
    if (feedbackCloseBtn) {
        feedbackCloseBtn.addEventListener('click', () => {
            const modal = getEl('feedbackModal');
            if (modal) modal.classList.remove('active');
            document.body.style.overflow = '';
        });
    }
    
    const feedbackModal = getEl('feedbackModal');
    if (feedbackModal) {
        feedbackModal.addEventListener('click', event => {
            if (event.target === feedbackModal) {
                feedbackModal.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    }
    
    const prevMonth = getEl('prevMonth');
    if (prevMonth) {
        prevMonth.addEventListener('click', () => {
            currentDate.setMonth(currentDate.getMonth() - 1);
            renderCalendar();
        });
    }
    
    const nextMonth = getEl('nextMonth');
    if (nextMonth) {
        nextMonth.addEventListener('click', () => {
            currentDate.setMonth(currentDate.getMonth() + 1);
            renderCalendar();
        });
    }
    
    const todayButton = getEl('todayBtn');
    if (todayButton) {
        todayButton.addEventListener('click', () => {
            const now = new Date();
            currentDate = new Date(now);
            selectedDate = new Date(now);
            selectedDate.setHours(0, 0, 0, 0);
            renderCalendar();
            renderTasks(TASK_RENDER_CONFIG.calendar);
            showToast('📆 Сегодня');
        });
    }
    
    const selectModeBtn = getEl('selectModeBtn');
    if (selectModeBtn) selectModeBtn.addEventListener('click', toggleMultiSelect);
    
    const multiCancel = getEl('multiCancel');
    if (multiCancel) {
        multiCancel.addEventListener('click', () => {
            if (isMultiSelect) toggleMultiSelect();
        });
    }
    
    const multiCreateTask = getEl('multiCreateTask');
    if (multiCreateTask) {
        multiCreateTask.addEventListener('click', function() {
            if (multiDays.size === 0) return;
            
            const text = prompt('Введите название задачи для всех выбранных дней:');
            if (!text || !text.trim()) return;
            
            const days = Array.from(multiDays);
            days.forEach(date => {
                addTask(text.trim(), 'work', 'medium', date, '', null, 0);
            });
            
            multiDays.clear();
            isMultiSelect = false;
            
            const button = getEl('selectModeBtn');
            if (button) {
                button.classList.remove('active');
                button.textContent = '✏️';
            }
            
            showToast('✅ Задача создана на ' + days.length + ' дней');
        });
    }
    
    const monthLabel = getEl('monthLabel');
    if (monthLabel) {
        monthLabel.addEventListener('click', function() {
            const year = prompt('Введите год (например, 2026):', currentDate.getFullYear());
            if (year && !isNaN(year) && year.length === 4) {
                currentDate.setFullYear(parseInt(year));
                renderCalendar();
            }
        });
    }
    
    const exportButton = getEl('exportDataBtn');
    if (exportButton) {
        exportButton.addEventListener('click', function() {
            const data = {
                tasks: tasks,
                theme: localStorage.getItem('theme') || 'default',
                fontSize: localStorage.getItem('font_size') || 16,
                showHolidays: localStorage.getItem('show_holidays') !== 'false',
                holidayCountry: localStorage.getItem('holiday_country') || 'ru',
                exportedAt: new Date().toISOString()
            };
            
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'backup_' + formatDate(new Date()) + '.json';
            link.click();
            URL.revokeObjectURL(url);
            
            localStorage.setItem('backup_date', new Date().toLocaleString('ru-RU'));
            showToast('💾 Копия создана');
            
            const settingsPanel = getEl('settingsPanel');
            if (settingsPanel) settingsPanel.classList.remove('active');
        });
    }
    
    const importButton = getEl('importDataBtn');
    if (importButton) {
        importButton.addEventListener('click', () => {
            const fileInput = getEl('importFileInput');
            if (fileInput) fileInput.click();
        });
    }
    
    const importFileInput = getEl('importFileInput');
    if (importFileInput) {
        importFileInput.addEventListener('change', function(event) {
            const file = this.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = function(loadEvent) {
                try {
                    const data = JSON.parse(loadEvent.target.result);
                    
                    if (!data.tasks || !Array.isArray(data.tasks)) {
                        showToast('❌ Неверный формат файла', 'error');
                        return;
                    }
                    
                    if (confirm('Восстановить ' + data.tasks.length + ' задач?')) {
                        tasks = data.tasks;
                        saveTasks();
                        
                        if (data.theme) localStorage.setItem('theme', data.theme);
                        if (data.fontSize) localStorage.setItem('font_size', data.fontSize);
                        if (data.showHolidays !== undefined) {
                            localStorage.setItem('show_holidays', String(data.showHolidays));
                        }
                        if (data.holidayCountry) localStorage.setItem('holiday_country', data.holidayCountry);
                        
                        localStorage.setItem('backup_date', new Date().toLocaleString('ru-RU'));
                        renderAll();
                        showToast('✅ Восстановлено');
                    }
                } catch (error) {
                    showToast('❌ Ошибка чтения файла', 'error');
                }
            };
            reader.readAsText(file);
            this.value = '';
        });
    }
    
    const resetButton = getEl('resetAllBtn');
    if (resetButton) {
        resetButton.addEventListener('click', function() {
            if (!confirm('Сбросить все настройки к стандартным? Это не удалит ваши задачи.')) return;
            
            localStorage.removeItem('theme');
            localStorage.removeItem('font_size');
            localStorage.removeItem('bg_custom');
            localStorage.removeItem('schedule');
            localStorage.removeItem('show_holidays');
            localStorage.removeItem('reminder_time');
            localStorage.removeItem('reminder_offset');
            localStorage.removeItem('first_launch');
            localStorage.removeItem('auto_theme');
            
            document.body.style.backgroundImage = 'none';
            document.body.style.backgroundSize = '';
            document.body.style.backgroundPosition = '';
            document.body.style.backgroundRepeat = '';
            
            schedule.type = 'standard';
            schedule.template = '5_2';
            schedule.custom = [0, 1, 1, 1, 1, 1, 0];
            schedule.exceptions = {};
            saveSchedule();
            
            applyTheme('default');
            applyFontSize(16);
            
            const preview = getEl('bgPreview');
            if (preview) {
                preview.classList.remove('active');
                preview.style.backgroundImage = 'none';
            }
            
            const resetBgButton = getEl('resetBg');
            if (resetBgButton) resetBgButton.style.display = 'none';
            
            const showHolidaysToggle = getEl('showHolidaysToggle');
            if (showHolidaysToggle) showHolidaysToggle.checked = true;
            
            const holidayCountrySelect = getEl('holidayCountry');
            if (holidayCountrySelect) holidayCountrySelect.value = 'ru';
            
            const reminderStatus = getEl('reminderStatus');
            if (reminderStatus) reminderStatus.textContent = 'Не установлено';
            
            renderAll();
            updateHeader();
            showToast('🔄 Настройки сброшены');
            
            const settingsPanel = getEl('settingsPanel');
            if (settingsPanel) settingsPanel.classList.remove('active');
        });
    }
    
    let silentMode = localStorage.getItem('silent_mode') === 'true';
    
    function applySilent(enabled) {
        document.body.classList.toggle('silent', enabled);
        localStorage.setItem('silent_mode', enabled);
        
        const silentToggle = getEl('silentToggle');
        const silentExit = getEl('silentExit');
        
        if (silentToggle) {
            silentToggle.textContent = enabled ? '' : '🔇';
            silentToggle.style.display = enabled ? 'none' : 'flex';
        }
        
        if (silentExit) {
            silentExit.style.display = enabled ? 'flex' : 'none';
        }
    }
    
    const silentToggle = getEl('silentToggle');
    if (silentToggle) {
        silentToggle.addEventListener('click', function() {
            silentMode = !silentMode;
            applySilent(silentMode);
            showToast(silentMode ? '🔇 Тишина включена' : '🔊 Звук включён');
        });
    }
    
    const silentExit = getEl('silentExit');
    if (silentExit) {
        silentExit.addEventListener('click', function() {
            silentMode = false;
            applySilent(false);
            showToast('🔊 Звук включён');
        });
    }
    
    applySilent(silentMode);
    
    function updateReminderStatus() {
        const time = localStorage.getItem('reminder_time');
        const offset = parseInt(localStorage.getItem('reminder_offset') || 0);
        const status = getEl('reminderStatus');
        
        if (time && status) {
            const text = offset === 0 ? 'в момент' : 
                        offset < 60 ? 'за ' + offset + ' мин' :
                        offset === 60 ? 'за 1 час' :
                        offset === 1440 ? 'за 1 день' : 'за ' + offset + ' мин';
            status.textContent = '⏰ Напоминание в ' + time + ' (' + text + ')';
            
            const timeInput = getEl('reminderTime');
            if (timeInput) timeInput.value = time;
            
            const offsetSelect = getEl('reminderOffset');
            if (offsetSelect) offsetSelect.value = offset;
        } else if (status) {
            status.textContent = 'Не установлено';
            
            const timeInput = getEl('reminderTime');
            if (timeInput) timeInput.value = '09:00';
            
            const offsetSelect = getEl('reminderOffset');
            if (offsetSelect) offsetSelect.value = '0';
        }
    }
    
    const setReminderButton = getEl('setReminderBtn');
    if (setReminderButton) {
        setReminderButton.addEventListener('click', function() {
            const time = getEl('reminderTime')?.value;
            if (!time) {
                showToast('❌ Выберите время', 'error');
                return;
            }
            
            const offset = parseInt(getEl('reminderOffset')?.value || 0);
            localStorage.setItem('reminder_time', time);
            localStorage.setItem('reminder_offset', offset);
            
            if ('Notification' in window && Notification.permission === 'default') {
                Notification.requestPermission();
            }
            
            updateReminderStatus();
            showToast('🔔 Напоминание в ' + time);
            
            const settingsPanel = getEl('settingsPanel');
            if (settingsPanel) settingsPanel.classList.remove('active');
        });
    }
    
    updateReminderStatus();
    
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
    
    // Кнопка экспорта PDF
    const exportPdfBtn = document.createElement('button');
    exportPdfBtn.className = 'settings-btn-sm';
    exportPdfBtn.textContent = '📄 Экспорт в PDF';
    exportPdfBtn.style.marginTop = '2px';
    exportPdfBtn.addEventListener('click', function() {
        exportTasksToPDF();
        const panel = getEl('settingsPanel');
        if (panel) panel.classList.remove('active');
    });
    
    const sectionBackup = getEl('sectionBackup');
    if (sectionBackup) {
        const importBtn = sectionBackup.querySelector('#importDataBtn');
        if (importBtn) {
            importBtn.parentNode.insertBefore(exportPdfBtn, importBtn.nextSibling);
        }
    }
}

// ================================================================
// ЗАПУСК ПРИЛОЖЕНИЯ
// ================================================================

/**
 * Инициализация приложения
 */
function init() {
    try {
        console.log('🔍 Инициализация приложения...');
        console.log('📋 Состояние DOM:', document.readyState);
        
        loadTasks();
        loadSchedule();
        console.log(`📊 Загружено задач: ${tasks.length}`);
        
        const savedFont = localStorage.getItem('font_size');
        applyFontSize(savedFont ? parseInt(savedFont) : 16);
        
        // Применяем тему с учетом системных настроек
        const autoTheme = localStorage.getItem('auto_theme') !== 'false';
        if (autoTheme) {
            setupSystemTheme();
        } else {
            const savedTheme = localStorage.getItem('theme') || 'default';
            applyTheme(savedTheme);
        }
        
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        selectedDate = now;
        currentDate = new Date(now);
        
        createDemoTasks();
        loadDraft();
        
        updateHeader();
        renderAll();
        getWeather();
        
        console.log('🔧 Настройка UI...');
        setupSettingsPanel();
        setupTodayForm();
        setupQuickAdd();
        setupVoiceInput();
        setupNavigation();
        setupPanels();
        setupButtons();
        
        setTimeout(() => {
            const headers = getEls('.settings-section-header');
            console.log(`📋 Проверка секций настроек: найдено ${headers.length}`);
        }, 500);
        
        setInterval(updateHeader, 10000);
        setInterval(updateStats, 30000);
        
        setTimeout(() => {
            const splash = getEl('splash');
            if (splash) {
                splash.classList.add('hide');
                console.log('✅ Заставка скрыта');
            }
        }, 500);
        
        console.log('✅ Архитектор времени (v' + APP_VERSION + ')');
        console.log('🎉 Приложение готово к работе!');
        
    } catch (error) {
        console.error('❌ Ошибка инициализации:', error);
        console.error('📋 Стек ошибки:', error.stack);
        
        setTimeout(() => {
            const splash = getEl('splash');
            if (splash) {
                splash.classList.add('hide');
                console.log('⚠️ Заставка скрыта принудительно');
            }
        }, 500);
    }
}

// ================================================================
// СТАРТ
// ================================================================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        console.log('✅ DOM загружен, запускаем init()');
        init();
    });
} else {
    console.log('✅ DOM уже загружен, запускаем init()');
    init();
}
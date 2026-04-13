# 🚀 Курс: Создание интерактивного калькулятора зарплаты (Кыргызстан)

Добро пожаловать в детальное руководство по созданию современного веб-приложения на чистом JavaScript, HTML и CSS. В этом курсе мы шаг за шагом создадим **Калькулятор зарплаты для Кыргызстана** с поддержкой *прямого* и *обратного* расчета налогов (алгебраическое решение в реальном времени).

Мы не будем использовать тяжелые фреймворки вроде React или Vue. Только Vanilla JS, современный CSS (Glassmorphism, Dark Theme) и библиотеку Chart.js для визуализации.

---

## 🎯 Что мы построим?
Полноценный калькулятор со следующими фичами:
- **Мгновенный (Real-time) расчет** ПН (подоходного налога), ПФ (пенсионного фонда) и ГНПФ.
- **Обратный расчет (Реверс-инжиниринг зарплаты)**: пользователь вводит желаемую сумму налога (или двигает ползунок), а система сама вычисляет исходный "Гросс" оклад.
- **Поддержка налоговых режимов**: Штатный сотрудник, Пенсионер, Иностранец, ПВТ (Парк Высоких Технологий).
- **Продвинутый UI**: Темная тема, подсветка ключевых метрик (На руки — зеленый, Удержания — красный, ФОТ — синий) и динамическая кольцевая диаграмма.

![Схема распределения зарплаты](/home/timur/Desktop/PetProjects/Cacculator/assets/top_image.png)

---

## 🛠 Модуль 1: Архитектура и разметка (HTML)

Мы начинаем с создания структуры нашего приложения в файле [index.html](file:///home/timur/Desktop/PetProjects/Cacculator/index.html). 

### Шаг 1.1: Базовый каркас и библиотеки
Подключаем шрифты (Inter) и библиотеку Chart.js через CDN. Это позволит нам отрисовывать графики без сложных настроек сборщиков (Webpack/Vite).

```html
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <title>Калькулятор зарплаты Кыргызстан</title>
    <link rel="stylesheet" href="style.css">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
```

### Шаг 1.2: Сетка (CSS Grid Layout)
Интерфейс делится на две основные панели (Слева — Ввод, Справа — Результаты). Для этого мы используем `CSS Grid`.

```html
<main class="calculator-grid">
    <!-- Левая панель: Инпуты и ползунки -->
    <section class="panel input-panel">...</section>
    
    <!-- Правая панель: Графики и таблицы -->
    <section class="panel output-panel">...</section>
</main>
```

### Шаг 1.3: Связка "Input + Range" для обратного расчета
Ключевая фича нашего UI — возможность задавать налоги вручную через ползунок или текстовое поле. 

```html
<div class="deduction-group">
    <div class="deduction-header">
        <label for="deduction-pn">Подоходный налог (ПН)</label>
        <input type="number" id="deduction-pn" class="editable-deduction">
    </div>
    <!-- Ползунок, который будет синхронизироваться с полем выше -->
    <input type="range" id="slider-pn" min="0" step="100" class="slider">
</div>
```

---

## 🎨 Модуль 2: Современный дизайн (CSS)

Разрабатываем премиальный Dark Theme UI в [style.css](file:///home/timur/Desktop/PetProjects/Cacculator/style.css).

### Шаг 2.1: CSS Переменные (Design Tokens)
Использование переменных (custom properties) позволяет легко управлять цветовой палитрой и менять тему в будущем.

```css
:root {
    --bg-color: #0d1117;       /* Глубокий темный фон (в стиле GitHub Dark) */
    --panel-bg: #161b22;       /* Фон панелей */
    --border-color: #30363d;
    --text-primary: #c9d1d9;
    --accent-color: #58a6ff;   /* Неоновый синий для акцентов */
    
    /* Семантические цвета */
    --color-green: #238636;    /* Деньги "на руки" */
    --color-red: #da3633;      /* Удержания */
    --color-blue: #1f6feb;     /* ФОТ */
}
```

### Шаг 2.2: Стилизация ползунков (Cross-browser Sliders)
Стандартные `<input type="range">` выглядят плохо. Мы обнуляем их стандартный вид с помощью `appearance: none;` и стилизуем ползунок («Thumb») вручную для WebKit (Chrome/Safari) и Gecko (Firefox).

```css
.slider {
    -webkit-appearance: none;
    -moz-appearance: none;
    appearance: none;
    background: var(--border-color);
    height: 6px;
    border-radius: 3px;
}

.slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: var(--accent-color);
    cursor: pointer;
    transition: transform 0.1s;
}
.slider::-webkit-slider-thumb:hover {
    transform: scale(1.2); /* Анимация при наведении */
}
```

---

## 🧠 Модуль 3: Ядро бизнес-логики (JavaScript)

Открываем [script.js](file:///home/timur/Desktop/PetProjects/Cacculator/script.js). Здесь сосредоточена вся математика.

### Шаг 3.1: Управление состоянием (State Management)
Вместо того чтобы хранить данные в DOM (считывать value каждый раз), мы создаем единый объект состояния `state`. Это подход, заимствованный из React/Redux.

```javascript
// Константы Налогового Кодекса КР
const CONSTANTS = {
    PTN: 650, // Вычет на себя
    RATES: {
        standard: { pf: 0.10, pn: 0.10, gnfp: 0.02, employer_sf: 0.1725 },
        pensioner: { pf: 0.00, pn: 0.10, gnfp: 0.00, employer_sf: 0.1525 }
    }
};

// Единый источник истины (Single Source of Truth)
let state = {
    gross: 50000,
    bonus: 0,
    type: 'standard',
    deductions: { pn: 0, pf: 0, gnfp: 0 },
    employerDeductions: { sf: 0 },
    net: 0,
    fot: 0,
    activeOverride: null // Хранит ID налога, который мы редактируем прямо сейчас
};
```

### Шаг 3.2: Прямой расчет (Forward Calculation)
Логика расчета зарплаты по законам КР.

```javascript
function calculateForward() {
    let totalGross = state.gross + state.bonus;
    const rates = CONSTANTS.RATES[state.type];

    // ПФ (10% от оклада)
    state.deductions.pf = totalGross * rates.pf;
    
    // ПН считается от (Оклад - ПФ - Вычет)
    let taxableForPn = Math.max(0, totalGross - state.deductions.pf - CONSTANTS.PTN);
    state.deductions.pn = taxableForPn * rates.pn;
    
    // ГНПФ (2%) - Государственный накопительный пенсионный фонд
    state.deductions.gnfp = totalGross * rates.gnfp;
    
    // Обновляем итоги
    let totalEmpDeductions = state.deductions.pn + state.deductions.pf + state.deductions.gnfp;
    state.net = totalGross - totalEmpDeductions;
    state.fot = totalGross + (totalGross * rates.employer_sf);
}
```

### Шаг 3.3: Алгебра обратного расчета (Reverse Calculation)
Самая сложная часть курса. Что если пользователь хочет, чтобы ПН был ровно 5,000 сом? Нам нужно вывести формулу `Гросс = f(ПН)`.

Вывод формулы для Подоходного Налога (ПН):
1. `ПН = (Gross - (Gross * pf_rate) - PTN) * pn_rate`
2. `ПН / pn_rate = Gross - Gross * pf_rate - PTN`
3. [(ПН / pn_rate) + PTN = Gross * (1 - pf_rate)](file:///home/timur/Desktop/PetProjects/Cacculator/script.js#52-58)
4. **`Gross = ((ПН / pn_rate) + PTN) / (1 - pf_rate)`**

Реализация в коде:

```javascript
function calculateReverse() {
    const rates = CONSTANTS.RATES[state.type];
    
    let newTotalGross = state.gross + state.bonus;

    if (state.activeOverride === 'pf') {
        newTotalGross = state.deductions.pf / rates.pf;
    } else if (state.activeOverride === 'pn') {
        // Применяем выведенную формулу:
        if (rates.pn > 0) {
            newTotalGross = ((state.deductions.pn / rates.pn) + CONSTANTS.PTN) / (1 - rates.pf);
        }
    }

    // Вычитаем бонус, так как найденный нью-Гросс это (Оклад + Бонус)
    state.gross = Math.max(0, newTotalGross - state.bonus);
    
    // Прогоняем прямой расчет для синхронизации остальных переменных
    calculateForward();
}
```

---

## 📊 Модуль 4: Синхронизация UI и Графиков

### Шаг 4.1: Реактивность (Слушатели событий)
Мы связываем ползунки и текстовые инпуты так, чтобы изменение одного моментально меняло другое, вызывало [calculateReverse()](file:///home/timur/Desktop/PetProjects/Cacculator/script.js#125-151), а затем обновляло весь UI.

```javascript
// Синхронизация инпута и ползунка
h.input.addEventListener('input', (e) => {
    state.activeOverride = h.id; // Например, 'pn'
    state.deductions[h.id] = parseFloat(e.target.value) || 0;
    
    h.slider.value = state.deductions[h.id]; // Двигаем ползунок
    calculateReverse();                      // Вычисляем новый Гросс
    updateUI(true);                          // Рендерим изменения в DOM
});
```

### Шаг 4.2: Отрисовка Chart.js
Динамическое визуальное представление налогов в виде кольцевой диаграммы (Doughnut).

```javascript
function updateChart() {
    if (chartInstance) {
        // Просто обновляем массив данных (Data Array) и вызываем .update()
        chartInstance.data.datasets[0].data = [
            Math.round(state.net),
            Math.round(state.deductions.pn),
            Math.round(state.deductions.pf),
            Math.round(state.deductions.gnfp),
            Math.round(state.employerDeductions.sf)
        ];
        chartInstance.update(); // Плавная анимация изменения
    }
}
```

---

## 🎉 Итог
Пройдя эти шаги, вы создали профессиональный реактивный UI без использования тяжеловесных фреймворков. Вы спроектировали:
1. Однонаправленный поток данных (Event -> State Update -> Math -> UI Update).
2. Алгебраический "движок" реверса налогов.
3. Модульную и масштабируемую архитектуру (добавить новый вычет — дело добавления 1 строки в `CONSTANTS`).

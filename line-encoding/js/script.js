// Shared JavaScript for Digital Signal Encoding Visualizer

const colors = {
    high: '#4ade80',
    zero: '#fbbf24',
    low: '#f87171',
    grid: 'rgba(255, 255, 255, 0.1)',
    text: 'rgba(255, 255, 255, 0.6)'
};

const encodingColors = {
    'nrzl': '#ff6b6b',
    'nrzi': '#feca57',
    'ami': '#48dbfb',
    'pseudo': '#ff9ff3',
    'manchester': '#1dd1a1',
    'diffmanchester': '#a55eea'
};

// Storage functions
function saveBinaryInput(binary) {
    localStorage.setItem('binaryInput', binary);
}

function getBinaryInput() {
    return localStorage.getItem('binaryInput') || '10110010';
}

// Validation
function validateBinary(input) {
    return /^[01]+$/.test(input);
}

// Generate random binary
function generateRandom() {
    const length = Math.floor(Math.random() * 8) + 4;
    let binary = '';
    for (let i = 0; i < length; i++) {
        binary += Math.round(Math.random());
    }
    return binary;
}

// Canvas setup
function setupCanvas(canvasId, bits) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;

    const ctx = canvas.getContext('2d');
    canvas.width = canvas.parentElement.clientWidth - 40;

    const width = canvas.width;
    const height = canvas.height;
    const padding = 50;
    const bitWidth = (width - 2 * padding) / bits.length;

    ctx.clearRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = colors.grid;
    ctx.lineWidth = 1;

    const levels = [padding, height / 2, height - padding];
    levels.forEach(y => {
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();
    });

    // Vertical lines
    for (let i = 0; i <= bits.length; i++) {
        const x = padding + i * bitWidth;
        ctx.beginPath();
        ctx.setLineDash([5, 5]);
        ctx.moveTo(x, padding);
        ctx.lineTo(x, height - padding);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    // Labels
    ctx.fillStyle = colors.text;
    ctx.font = '12px Arial';
    ctx.textAlign = 'right';
    ctx.fillText('+V', padding - 8, padding + 4);
    ctx.fillText('0', padding - 8, height / 2 + 4);
    ctx.fillText('-V', padding - 8, height - padding + 4);

    // Bit labels on top
    ctx.textAlign = 'center';
    ctx.font = '14px Courier New';
    for (let i = 0; i < bits.length; i++) {
        const x = padding + i * bitWidth + bitWidth / 2;
        ctx.fillText(bits[i].toString(), x, padding - 15);
    }

    return { ctx, width, height, padding, bitWidth };
}

function getY(level, padding, height) {
    if (level === 1) return padding;
    if (level === 0) return height / 2;
    return height - padding;
}

function drawSignal(ctx, points, color, padding, height) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();

    for (let i = 0; i < points.length; i++) {
        const point = points[i];
        const x = point.x;
        const y = getY(point.level, padding, height);

        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            const prevPoint = points[i - 1];
            const prevY = getY(prevPoint.level, padding, height);

            if (point.transition) {
                ctx.lineTo(x, prevY);
                ctx.lineTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
    }

    ctx.stroke();
}

// Encoding functions
function encodeNRZL(bits) {
    const points = [];
    for (let i = 0; i < bits.length; i++) {
        const level = bits[i] === 1 ? 1 : -1;
        points.push({
            bitIndex: i,
            level: level,
            transition: i > 0 && bits[i] !== bits[i - 1]
        });
    }
    return points;
}

function encodeNRZI(bits) {
    const points = [];
    let currentLevel = -1;

    for (let i = 0; i < bits.length; i++) {
        if (bits[i] === 1) {
            currentLevel = currentLevel === 1 ? -1 : 1;
        }
        points.push({
            bitIndex: i,
            level: currentLevel,
            transition: bits[i] === 1
        });
    }
    return points;
}

function encodeAMI(bits) {
    const points = [];
    let lastPolarity = -1;

    for (let i = 0; i < bits.length; i++) {
        let level;
        if (bits[i] === 0) {
            level = 0;
        } else {
            lastPolarity = lastPolarity === 1 ? -1 : 1;
            level = lastPolarity;
        }
        points.push({
            bitIndex: i,
            level: level,
            transition: i > 0
        });
    }
    return points;
}

function encodePseudoternary(bits) {
    const points = [];
    let lastPolarity = -1;

    for (let i = 0; i < bits.length; i++) {
        let level;
        if (bits[i] === 1) {
            level = 0;
        } else {
            lastPolarity = lastPolarity === 1 ? -1 : 1;
            level = lastPolarity;
        }
        points.push({
            bitIndex: i,
            level: level,
            transition: i > 0
        });
    }
    return points;
}

function encodeManchester(bits) {
    // 1 = Low-to-High, 0 = High-to-Low (G.E. Thomas convention)
    const points = [];
    for (let i = 0; i < bits.length; i++) {
        if (bits[i] === 1) {
            points.push({ bitIndex: i, half: 0, level: -1 });
            points.push({ bitIndex: i, half: 1, level: 1 });
        } else {
            points.push({ bitIndex: i, half: 0, level: 1 });
            points.push({ bitIndex: i, half: 1, level: -1 });
        }
    }
    return points;
}

function encodeDifferentialManchester(bits) {
    const points = [];
    let currentLevel = 1;

    for (let i = 0; i < bits.length; i++) {
        // Bit 0: transition at beginning
        // Bit 1: no transition at beginning
        if (bits[i] === 0) {
            currentLevel = currentLevel === 1 ? -1 : 1;
        }

        const startLevel = currentLevel;
        points.push({ bitIndex: i, half: 0, level: startLevel, transitionAtStart: bits[i] === 0 });

        // Always transition at middle
        currentLevel = currentLevel === 1 ? -1 : 1;
        points.push({ bitIndex: i, half: 1, level: currentLevel });
    }
    return points;
}

// Drawing functions for each encoding
function drawNRZL(bits, canvasId = 'canvas-nrzl') {
    const setup = setupCanvas(canvasId, bits);
    if (!setup) return;

    const { ctx, width, height, padding, bitWidth } = setup;
    const encoded = encodeNRZL(bits);

    const points = [];
    encoded.forEach((p, i) => {
        const x = padding + p.bitIndex * bitWidth;
        points.push({ x, level: p.level, transition: p.transition });
        points.push({ x: x + bitWidth, level: p.level, transition: false });
    });

    drawSignal(ctx, points, encodingColors.nrzl, padding, height);
}

function drawNRZI(bits, canvasId = 'canvas-nrzi') {
    const setup = setupCanvas(canvasId, bits);
    if (!setup) return;

    const { ctx, width, height, padding, bitWidth } = setup;
    const encoded = encodeNRZI(bits);

    const points = [];
    encoded.forEach((p, i) => {
        const x = padding + p.bitIndex * bitWidth;
        points.push({ x, level: p.level, transition: p.transition });
        points.push({ x: x + bitWidth, level: p.level, transition: false });
    });

    drawSignal(ctx, points, encodingColors.nrzi, padding, height);
}

function drawAMI(bits, canvasId = 'canvas-ami') {
    const setup = setupCanvas(canvasId, bits);
    if (!setup) return;

    const { ctx, width, height, padding, bitWidth } = setup;
    const encoded = encodeAMI(bits);

    const points = [];
    encoded.forEach((p, i) => {
        const x = padding + p.bitIndex * bitWidth;
        const prevLevel = i > 0 ? encoded[i - 1].level : 0;
        points.push({ x, level: p.level, transition: p.level !== prevLevel });
        points.push({ x: x + bitWidth, level: p.level, transition: false });
    });

    drawSignal(ctx, points, encodingColors.ami, padding, height);
}

function drawPseudoternary(bits, canvasId = 'canvas-pseudo') {
    const setup = setupCanvas(canvasId, bits);
    if (!setup) return;

    const { ctx, width, height, padding, bitWidth } = setup;
    const encoded = encodePseudoternary(bits);

    const points = [];
    encoded.forEach((p, i) => {
        const x = padding + p.bitIndex * bitWidth;
        const prevLevel = i > 0 ? encoded[i - 1].level : 0;
        points.push({ x, level: p.level, transition: p.level !== prevLevel });
        points.push({ x: x + bitWidth, level: p.level, transition: false });
    });

    drawSignal(ctx, points, encodingColors.pseudo, padding, height);
}

function drawManchester(bits, canvasId = 'canvas-manchester') {
    const setup = setupCanvas(canvasId, bits);
    if (!setup) return;

    const { ctx, width, height, padding, bitWidth } = setup;
    const encoded = encodeManchester(bits);

    const points = [];
    for (let i = 0; i < encoded.length; i++) {
        const p = encoded[i];
        const x = padding + p.bitIndex * bitWidth + (p.half * bitWidth / 2);

        if (i === 0) {
            points.push({ x, level: p.level, transition: false });
        } else {
            const prev = encoded[i - 1];
            points.push({ x, level: p.level, transition: p.level !== prev.level });
        }

        if (p.half === 1) {
            points.push({ x: x + bitWidth / 2, level: p.level, transition: false });
        }
    }

    drawSignal(ctx, points, encodingColors.manchester, padding, height);
}

function drawDifferentialManchester(bits, canvasId = 'canvas-diffmanchester') {
    const setup = setupCanvas(canvasId, bits);
    if (!setup) return;

    const { ctx, width, height, padding, bitWidth } = setup;
    const encoded = encodeDifferentialManchester(bits);

    const points = [];
    for (let i = 0; i < encoded.length; i++) {
        const p = encoded[i];
        const x = padding + p.bitIndex * bitWidth + (p.half * bitWidth / 2);

        if (i === 0) {
            points.push({ x, level: p.level, transition: false });
        } else {
            const prev = encoded[i - 1];
            points.push({ x, level: p.level, transition: p.level !== prev.level });
        }

        if (p.half === 1) {
            points.push({ x: x + bitWidth / 2, level: p.level, transition: false });
        }
    }

    drawSignal(ctx, points, encodingColors.diffmanchester, padding, height);
}

// Draw all encodings
function drawAllEncodings(bits) {
    drawNRZL(bits);
    drawNRZI(bits);
    drawAMI(bits);
    drawPseudoternary(bits);
    drawManchester(bits);
    drawDifferentialManchester(bits);
}

// Initialize input handler
function initInputHandler() {
    const input = document.getElementById('binaryInput');
    const errorDiv = document.getElementById('errorMessage');

    if (input) {
        input.value = getBinaryInput();

        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleGenerate();
            }
        });
    }
}

function handleGenerate() {
    const input = document.getElementById('binaryInput');
    const errorDiv = document.getElementById('errorMessage');

    if (!input) return;

    const value = input.value.trim();

    if (!value) {
        if (errorDiv) errorDiv.textContent = 'Please enter a binary string';
        return;
    }

    if (!validateBinary(value)) {
        if (errorDiv) errorDiv.textContent = 'Invalid input! Please enter only 0s and 1s';
        return;
    }

    if (errorDiv) errorDiv.textContent = '';
    saveBinaryInput(value);

    const bits = value.split('').map(Number);

    // Check which page we're on and draw appropriate graphs
    if (document.getElementById('canvas-nrzl')) drawNRZL(bits);
    if (document.getElementById('canvas-nrzi')) drawNRZI(bits);
    if (document.getElementById('canvas-ami')) drawAMI(bits);
    if (document.getElementById('canvas-pseudo')) drawPseudoternary(bits);
    if (document.getElementById('canvas-manchester')) drawManchester(bits);
    if (document.getElementById('canvas-diffmanchester')) drawDifferentialManchester(bits);

    // For single encoding pages
    if (document.getElementById('canvas-single')) {
        const encodingType = document.body.dataset.encoding;
        const bits = value.split('').map(Number);
        drawSingleEncoding(bits, encodingType);
    }

    updateBinaryDisplay(value);
}

function handleRandom() {
    const input = document.getElementById('binaryInput');
    if (input) {
        input.value = generateRandom();
        handleGenerate();
    }
}

function handleClear() {
    const input = document.getElementById('binaryInput');
    const errorDiv = document.getElementById('errorMessage');

    if (input) input.value = '';
    if (errorDiv) errorDiv.textContent = '';

    // Clear all canvases
    document.querySelectorAll('.graph-canvas').forEach(canvas => {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    });

    updateBinaryDisplay('');
}

function updateBinaryDisplay(binary) {
    const displays = document.querySelectorAll('.current-binary span');
    displays.forEach(display => {
        display.textContent = binary || 'No input';
    });
}

function drawSingleEncoding(bits, type) {
    const canvas = document.getElementById('canvas-single');
    if (!canvas) return;

    switch (type) {
        case 'nrzl':
            drawNRZL(bits, 'canvas-single');
            break;
        case 'nrzi':
            drawNRZI(bits, 'canvas-single');
            break;
        case 'ami':
            drawAMI(bits, 'canvas-single');
            break;
        case 'pseudo':
            drawPseudoternary(bits, 'canvas-single');
            break;
        case 'manchester':
            drawManchester(bits, 'canvas-single');
            break;
        case 'diffmanchester':
            drawDifferentialManchester(bits, 'canvas-single');
            break;
    }
}

// Window resize handler
window.addEventListener('resize', () => {
    const binary = getBinaryInput();
    if (binary && validateBinary(binary)) {
        const bits = binary.split('').map(Number);

        if (document.getElementById('canvas-single')) {
            const encodingType = document.body.dataset.encoding;
            drawSingleEncoding(bits, encodingType);
        } else {
            handleGenerate();
        }
    }
});

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initInputHandler();

    const binary = getBinaryInput();
    if (binary && validateBinary(binary)) {
        handleGenerate();
    }
});
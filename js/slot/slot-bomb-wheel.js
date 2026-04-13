// ============================================================
// Slot Game — Bomb Wheel Helpers
// Loaded before slot-main.js via index.html.
// ============================================================

function getBombWheelSegments() {
    const weights = CONFIG.bombWheelWeights || {};
    const options = BOMB_WHEEL_OPTIONS.map((option) => {
        const raw = Number(weights[option.id]);
        const safeWeight = Number.isFinite(raw) && raw > 0 ? raw : 0;
        return {
            ...option,
            weight: safeWeight,
            color: BOMB_WHEEL_COLOR_MAP[option.id] || '#6c63ff'
        };
    });

    let totalWeight = options.reduce((sum, option) => sum + option.weight, 0);
    if (totalWeight <= 0) {
        options.forEach((option) => {
            option.weight = 1;
        });
        totalWeight = options.length;
    }

    let cursor = 0;
    return options.map((option, index) => {
        const span = (index === options.length - 1)
            ? (360 - cursor)
            : (option.weight / totalWeight) * 360;
        const startAngle = cursor;
        const endAngle = Math.max(startAngle, startAngle + span);
        const centerAngle = startAngle + ((endAngle - startAngle) / 2);
        cursor = endAngle;
        return {
            ...option,
            startAngle,
            endAngle,
            centerAngle,
            span: endAngle - startAngle
        };
    });
}

function createBombWheel(cell, segments) {
    const { x: centerX, y: centerY } = getGridCellBoxCenterInContainer(cell, gameContainer);

    const overlay = document.createElement('div');
    overlay.className = 'bomb-wheel-overlay';
    overlay.style.left = `${centerX}px`;
    overlay.style.top = `${centerY}px`;

    const pointer = document.createElement('div');
    pointer.className = 'bomb-wheel-pointer';

    const wheel = document.createElement('div');
    wheel.className = 'bomb-wheel';
    wheel.style.setProperty('--spin-ms', `${CONFIG.bombWheelSpinMs}ms`);
    const activeSegments = (Array.isArray(segments) && segments.length > 0)
        ? segments
        : getBombWheelSegments();
    const gradientStops = activeSegments
        .filter((segment) => segment.span > 0)
        .map((segment) => `${segment.color} ${segment.startAngle.toFixed(3)}deg ${segment.endAngle.toFixed(3)}deg`)
        .join(', ');
    if (gradientStops) {
        wheel.style.background = `conic-gradient(${gradientStops})`;
    }

    const core = document.createElement('div');
    core.className = 'bomb-wheel-core';
    core.textContent = '';
    wheel.appendChild(core);

    const textRadius = 47;
    activeSegments.forEach((segment) => {
        if (segment.span <= 0.5) return;
        const label = document.createElement('span');
        label.className = 'bomb-wheel-label';
        label.dataset.segmentId = segment.id;
        label.textContent = segment.shortLabel;
        const labelRadius = textRadius;
        const radialDeg = segment.centerAngle - 90;
        const radialRad = (radialDeg * Math.PI) / 180;
        const offsetX = Math.cos(radialRad) * labelRadius;
        const offsetY = Math.sin(radialRad) * labelRadius;

        label.style.left = `calc(50% + ${offsetX.toFixed(2)}px)`;
        label.style.top = `calc(50% + ${offsetY.toFixed(2)}px)`;

        let textDeg = segment.centerAngle;
        if (textDeg > 90 && textDeg < 270) {
            textDeg += 180;
        }
        label.style.transform = `translate(-50%, -50%) rotate(${textDeg.toFixed(3)}deg)`;
        wheel.appendChild(label);
    });

    const result = document.createElement('div');
    result.className = 'bomb-wheel-result';

    overlay.appendChild(pointer);
    overlay.appendChild(wheel);
    overlay.appendChild(result);
    gameContainer.appendChild(overlay);
    activeBombWheelOverlay = overlay;

    return { overlay, wheel, result };
}

function highlightWinningSegment(wheel, segmentId, segment) {
    if (!wheel || !segment) return;

    wheel.style.setProperty('--win-start', `${segment.startAngle.toFixed(3)}deg`);
    wheel.style.setProperty('--win-end', `${segment.endAngle.toFixed(3)}deg`);
    wheel.classList.add('win-highlight');

    const labels = wheel.querySelectorAll('.bomb-wheel-label');
    labels.forEach((label) => {
        label.classList.remove('is-winning');
    });

    const winningLabel = wheel.querySelector(`.bomb-wheel-label[data-segment-id="${segmentId}"]`);
    if (winningLabel) {
        winningLabel.classList.add('is-winning');
    }
}

function removeBombWheel() {
    if (!gameContainer) return;
    if (activeBombWheelOverlay && activeBombWheelOverlay.isConnected) {
        activeBombWheelOverlay.remove();
        activeBombWheelOverlay = null;
        return;
    }
    const existing = gameContainer.querySelectorAll('.bomb-wheel-overlay');
    existing.forEach((el) => el.remove());
    activeBombWheelOverlay = null;
}

// ============================================================
// Slot Game — Geometry & Animation Helpers
// Loaded before slot-main.js via index.html.
// ============================================================

function animateUiElement(element, keyframes, options) {
    if (!element || typeof element.animate !== 'function') return null;
    return element.animate(keyframes, options);
}

function restartCssClassAnimation(element, className) {
    if (!element || !className) return;
    element.classList.remove(className);
    void element.offsetWidth;
    element.classList.add(className);
}

function clearCssClassAnimation(element, className, delayMs) {
    if (!element || !className) return;
    window.setTimeout(() => {
        if (!element.isConnected) return;
        element.classList.remove(className);
    }, Math.max(0, Math.floor(Number(delayMs) || 0)));
}

function waitMs(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function waitRaf() {
    return new Promise((resolve) => requestAnimationFrame(resolve));
}

function parseScalePercent(rawValue, fallbackScale) {
    const text = String(rawValue || '').trim();
    if (!text) return fallbackScale;
    if (text.endsWith('%')) {
        const num = Number(text.slice(0, -1));
        return Number.isFinite(num) ? (num / 100) : fallbackScale;
    }
    const num = Number(text.replace('px', ''));
    if (!Number.isFinite(num)) return fallbackScale;
    if (num <= 0) return fallbackScale;
    return num > 10 ? (num / 100) : num;
}

function parseLengthPx(rawValue, referencePx, fallbackPx) {
    const text = String(rawValue || '').trim();
    if (!text) return fallbackPx;
    if (text.endsWith('%')) {
        const num = Number(text.slice(0, -1));
        return Number.isFinite(num) ? ((referencePx * num) / 100) : fallbackPx;
    }
    const num = Number(text.replace('px', ''));
    return Number.isFinite(num) ? num : fallbackPx;
}

function getGridCellBoxCenter(cell) {
    if (!cell) return { x: 0, y: 0 };
    const rect = cell.getBoundingClientRect();
    const cellWidth = rect.width || 0;
    const cellHeight = rect.height || 0;
    if (cellWidth <= 0 || cellHeight <= 0) {
        return { x: 0, y: 0 };
    }

    const style = getComputedStyle(cell);
    const bgSizeScale = parseScalePercent(style.getPropertyValue('--grid-cell-bg-size'), 1.5);
    const bottomOffsetPx = parseLengthPx(
        style.getPropertyValue('--grid-cell-bottom-offset'),
        cellHeight,
        -0.15 * cellHeight
    );
    const overlapOffsetPx = parseLengthPx(
        style.getPropertyValue('--grid-cell-overlap-x-offset'),
        cellWidth,
        0
    );
    const overlapOffsetYPx = parseLengthPx(
        style.getPropertyValue('--grid-cell-overlap-y-offset'),
        cellHeight,
        0
    );

    const pseudoWidth = cellWidth * bgSizeScale;
    const pseudoHeight = cellHeight * 2;
    const pseudoBottom = cellHeight - bottomOffsetPx;
    const centerX = (cellWidth / 2) + overlapOffsetPx;

    const naturalWidth = GRID_BOX_UNOPEN_IMAGE.naturalWidth;
    const naturalHeight = GRID_BOX_UNOPEN_IMAGE.naturalHeight;
    const spriteAspect = (naturalWidth > 0 && naturalHeight > 0)
        ? (naturalWidth / naturalHeight)
        : GRID_BOX_FALLBACK_ASPECT;
    const safeSpriteAspect = (Number.isFinite(spriteAspect) && spriteAspect > 0)
        ? spriteAspect
        : GRID_BOX_FALLBACK_ASPECT;
    const pseudoAspect = pseudoWidth / pseudoHeight;
    const boxSpriteHeight = (pseudoAspect > safeSpriteAspect)
        ? pseudoHeight
        : (pseudoWidth / safeSpriteAspect);

    const centerY = pseudoBottom - (boxSpriteHeight / 2) + overlapOffsetYPx;
    return { x: centerX, y: centerY };
}

function positionSimpleModeCellPlusButton(cell, plusButton) {
    if (!cell || !plusButton) return;
    const center = getGridCellBoxCenter(cell);
    if (!Number.isFinite(center.x) || !Number.isFinite(center.y)) return;
    plusButton.style.left = `${center.x.toFixed(2)}px`;
    plusButton.style.top = `${center.y.toFixed(2)}px`;
}

function getGridCellBoxCenterInViewport(cell) {
    if (!cell) return { x: 0, y: 0 };
    const rect = cell.getBoundingClientRect();
    const localCenter = getGridCellBoxCenter(cell);
    return {
        x: rect.left + localCenter.x,
        y: rect.top + localCenter.y
    };
}

function getGridCellBoxCenterInContainer(cell, container) {
    const viewportCenter = getGridCellBoxCenterInViewport(cell);
    if (!container) {
        return viewportCenter;
    }
    const containerRect = container.getBoundingClientRect();
    return {
        x: viewportCenter.x - containerRect.left,
        y: viewportCenter.y - containerRect.top
    };
}

function getFreeSpinItemBoxCenter(element) {
    if (!element) return { x: 0, y: 0 };

    const boxSize = Math.max(1, Math.floor(Number(element.dataset.boxSize) || 1));
    if (boxSize <= 1) {
        return getGridCellBoxCenter(element);
    }

    const rect = element.getBoundingClientRect();
    const elementWidth = rect.width || 0;
    const elementHeight = rect.height || 0;
    if (elementWidth <= 0 || elementHeight <= 0) {
        return { x: 0, y: 0 };
    }

    const style = getComputedStyle(element);
    const pseudoWidth = parseLengthPx(style.getPropertyValue('--free-spin-box-width'), elementWidth, elementWidth);
    const pseudoHeight = parseLengthPx(style.getPropertyValue('--free-spin-box-height'), elementHeight, elementHeight);
    const shiftYPx = parseLengthPx(style.getPropertyValue('--free-spin-box-shift-y'), elementHeight, 0);

    const naturalWidth = GRID_BOX_UNOPEN_IMAGE.naturalWidth;
    const naturalHeight = GRID_BOX_UNOPEN_IMAGE.naturalHeight;
    const spriteAspect = (naturalWidth > 0 && naturalHeight > 0)
        ? (naturalWidth / naturalHeight)
        : GRID_BOX_FALLBACK_ASPECT;
    const safeSpriteAspect = (Number.isFinite(spriteAspect) && spriteAspect > 0)
        ? spriteAspect
        : GRID_BOX_FALLBACK_ASPECT;
    const pseudoAspect = pseudoWidth / pseudoHeight;
    const boxSpriteHeight = (pseudoAspect > safeSpriteAspect)
        ? pseudoHeight
        : (pseudoWidth / safeSpriteAspect);

    return {
        x: elementWidth / 2,
        y: (elementHeight / 2) + (pseudoHeight / 2) - (boxSpriteHeight / 2) + shiftYPx
    };
}

function getFreeSpinItemBoxCenterInViewport(element) {
    if (!element) return { x: 0, y: 0 };
    const rect = element.getBoundingClientRect();
    const localCenter = getFreeSpinItemBoxCenter(element);
    return {
        x: rect.left + localCenter.x,
        y: rect.top + localCenter.y
    };
}

function getElementCenterInViewport(element) {
    if (!element) return { x: 0, y: 0 };
    const rect = element.getBoundingClientRect();
    return {
        x: rect.left + (rect.width / 2),
        y: rect.top + (rect.height / 2)
    };
}

function getRestockTrayBoxCenterInViewport(element) {
    return getElementCenterInViewport(element);
}

function playSimpleModeRestockFlight(sourceElement, targetCell, {
    durationMs = SIMPLE_RESTOCK_FLIGHT_MS
} = {}) {
    return new Promise((resolve) => {
        if (!gameContainer || !targetCell) {
            resolve();
            return;
        }

        const containerRect = gameContainer.getBoundingClientRect();
        const targetCenter = getGridCellBoxCenterInContainer(targetCell, gameContainer);
        const sourceCenter = sourceElement
            ? getRestockTrayBoxCenterInViewport(sourceElement)
            : getGridCellBoxCenterInViewport(targetCell);
        const startX = sourceCenter.x - containerRect.left;
        const startY = sourceCenter.y - containerRect.top;
        const deltaX = targetCenter.x - startX;
        const deltaY = targetCenter.y - startY;
        const sourceRect = sourceElement ? sourceElement.getBoundingClientRect() : null;
        const flyEl = document.createElement('div');

        flyEl.className = 'restock-fly-box';
        flyEl.style.left = `${startX}px`;
        flyEl.style.top = `${startY}px`;
        flyEl.style.width = `${Math.max(72, Math.round(sourceRect?.width || 110))}px`;
        flyEl.style.height = `${Math.max(72, Math.round(sourceRect?.height || 110))}px`;
        gameContainer.appendChild(flyEl);

        const animation = animateUiElement(flyEl, [
            {
                transform: 'translate(-50%, -50%) translate(0px, -8px) scale(1.08)',
                opacity: 1,
                filter: 'none'
            },
            {
                transform: `translate(-50%, -50%) translate(${(deltaX * 0.46).toFixed(2)}px, ${(deltaY * 0.46 - 14).toFixed(2)}px) scale(1.02)`,
                opacity: 1,
                filter: 'none',
                offset: 0.42
            },
            {
                transform: `translate(-50%, -50%) translate(${deltaX.toFixed(2)}px, ${deltaY.toFixed(2)}px) scale(0.94)`,
                opacity: 0.98,
                filter: 'none'
            }
        ], {
            duration: Math.max(120, Math.floor(Number(durationMs) || SIMPLE_RESTOCK_FLIGHT_MS)),
            easing: 'cubic-bezier(0.18, 0.84, 0.22, 1)',
            fill: 'forwards'
        });

        const finish = () => {
            flyEl.remove();
            resolve();
        };

        if (animation && typeof animation.finished?.then === 'function') {
            animation.finished.then(finish).catch(finish);
            return;
        }

        window.setTimeout(finish, Math.max(120, Math.floor(Number(durationMs) || SIMPLE_RESTOCK_FLIGHT_MS)) + 32);
    });
}

function playSimpleModeRestockLandingFeedback(cell) {
    if (!cell) return;
    const boxImg = cell.querySelector('.grid-cell-box-img');
    if (boxImg) {
        restartCssClassAnimation(boxImg, 'restock-land-hit');
        clearCssClassAnimation(boxImg, 'restock-land-hit', 320);
    }
}

function positionImageToGridBoxCenter(cell, img) {
    if (!cell || !img) return;
    const center = getGridCellBoxCenter(cell);
    img.style.left = `${center.x.toFixed(2)}px`;
    img.style.top = `${center.y.toFixed(2)}px`;
}

function positionBombAnimImage(cell, img) {
    positionImageToGridBoxCenter(cell, img);
}

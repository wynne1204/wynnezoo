# Performance Partition Notes

## Goals
- Reduce hot-path CPU work during play.
- Keep first-screen parsing and execution lighter.
- Split low-frequency visual code out of the main runtime path.

## Current Partitions
- Main runtime: `script.js`
  - Grid state, click handling, settlement, wheel logic, UI state updates.
  - Hot-path data optimized with typed arrays and index pools.
- Effects runtime: `js/effects.js`
  - Particle, shockwave, and floating-text rendering.
  - Loaded lazily at runtime (`loadEffectsApi`) and prewarmed during idle time.
- Bonus runtime: `js/bonus.js`
  - Bonus board generation, spin/settlement flow, unlock cinematics, chest/magnet/add resolutions.
  - Loaded lazily on first bonus-related action (`loadBonusApi`), initialized with main-runtime dependencies.

## Hot-path Optimizations in Main Runtime
- `STATE.grid` / `STATE.revealed` migrated to `Uint8Array`.
- Added `STATE.revealedCount` to avoid repeated full-array counting.
- Added `STATE.unrevealedIndices` + `STATE.unrevealedPosByIndex` for O(1) random unrevealed picks and O(1) removal.
- Bonus card and trigger stack lookups switched from repeated selectors to `Map` caches.
- Grid click handling switched to event delegation (single listener instead of per-cell listener).
- Grid cell rendering now uses `DocumentFragment` to reduce repeated DOM append cost.
- When `gridSize` is unchanged, grid DOM nodes are reused between rounds instead of destroyed/rebuilt.
- Bomb seeding switched from retry-loop random placement to collision-free partial shuffle.
- Bomb wheel removal now tracks active overlay first to avoid repeated full-container scans.

## Lazy-loading Strategy
- Effects script is loaded on demand the first time an effect is requested.
- During `initGame`, effects are prewarmed via `requestIdleCallback` (or timeout fallback) so first interaction remains smooth.
- Bonus script is not loaded on first screen.
  - It loads only when the user enters a bonus path (or clicks bonus spin), reducing initial parse/execution work for the common non-bonus path.

## Safety Guards
- `gridSize` is clamped to at least `1`.
- `bombCount` is clamped to `[0, gridSize]` to avoid invalid generation loops.

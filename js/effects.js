(function initGameEffectsModule(globalScope) {
    // ── Cached container reference ──────────────────────────
    let _gameContainer = null;
    function getGameContainer() {
        if (!_gameContainer || !_gameContainer.isConnected) {
            _gameContainer = document.querySelector('.game-container') || document.body;
        }
        return _gameContainer;
    }

    // ── Helper: batch-append particles with auto-cleanup ────
    function batchAppendParticles(parent, elements, durations) {
        const fragment = document.createDocumentFragment();
        for (let i = 0; i < elements.length; i++) {
            fragment.appendChild(elements[i]);
        }
        parent.appendChild(fragment);
        for (let i = 0; i < elements.length; i++) {
            const el = elements[i];
            const ms = Math.ceil((durations[i] || 1) * 1000) + 150;
            setTimeout(() => { if (el.isConnected) el.remove(); }, ms);
        }
    }

    function createParticles(x, y, color, count) {
        const safeCount = Math.max(0, Number(count) || 10);
        const els = [];
        const durs = [];
        for (let i = 0; i < safeCount; i++) {
            const particle = document.createElement('div');
            particle.classList.add('particle');
            particle.style.backgroundColor = color;
            particle.style.left = `${x}px`;
            particle.style.top = `${y}px`;
            const angle = Math.random() * Math.PI * 2;
            const velocity = 50 + (Math.random() * 100);
            particle.style.setProperty('--tx', `${Math.cos(angle) * velocity}px`);
            particle.style.setProperty('--ty', `${Math.sin(angle) * velocity}px`);
            const size = 4 + (Math.random() * 6);
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;
            particle.style.animation = 'particle-explode 0.6s ease-out forwards';
            els.push(particle);
            durs.push(0.6);
        }
        batchAppendParticles(document.body, els, durs);
    }

    function createFloatingText(x, y, text) {
        const el = document.createElement('div');
        el.classList.add('floating-text');
        el.textContent = text;
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 1000);
    }

    function createCoinFloatingText(x, y, text) {
        const el = document.createElement('div');
        el.classList.add('floating-text', 'floating-text-coin');
        const img = document.createElement('img');
        img.src = './Texture/UI/Icon_Gold.png';
        img.className = 'floating-coin-icon';
        img.alt = '';
        el.appendChild(img);
        const span = document.createElement('span');
        span.textContent = text;
        el.appendChild(span);
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 1000);
    }

    function createCoinRain(coinCount) {
        const container = getGameContainer();
        const rect = container.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const count = Math.max(1, Math.floor(Number(coinCount) || 40));
        const baseY = height;
        const els = [];
        const durs = [];

        for (let i = 0; i < count; i++) {
            const coin = document.createElement('div');
            coin.classList.add('coin-rain-particle');
            const img = document.createElement('img');
            img.src = './Texture/UI/Icon_Gold.png';
            img.alt = '';
            img.className = 'coin-rain-img';
            coin.appendChild(img);
            const startX = width * 0.2 + Math.random() * width * 0.6;
            coin.style.left = `${startX}px`;
            coin.style.top = `${baseY}px`;
            const size = 22 + Math.random() * 20;
            coin.style.width = `${size}px`;
            coin.style.height = `${size}px`;
            const spreadAngle = -Math.PI / 2 + (Math.random() - 0.5) * 1.4;
            const velocity = height * (0.4 + Math.random() * 0.45);
            coin.style.setProperty('--tx', `${Math.cos(spreadAngle) * velocity}px`);
            coin.style.setProperty('--ty', `${Math.sin(spreadAngle) * velocity}px`);
            coin.style.setProperty('--rot', `${Math.random() * 720 - 360}deg`);
            const delay = Math.random() * 200;
            const duration = 1.0 + Math.random() * 0.6;
            coin.style.animation = `coin-burst ${duration}s cubic-bezier(0.16, 0.9, 0.3, 1) ${delay}ms forwards`;
            els.push(coin);
            durs.push(duration + delay / 1000);
        }
        batchAppendParticles(container, els, durs);
    }

    function createCoinFall(coinCount) {
        const container = getGameContainer();
        const rect = container.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const count = Math.max(1, Math.floor(Number(coinCount) || 30));
        const els = [];
        const durs = [];

        for (let i = 0; i < count; i++) {
            const coin = document.createElement('div');
            coin.classList.add('coin-rain-particle');
            const img = document.createElement('img');
            img.src = './Texture/UI/Icon_Gold.png';
            img.alt = '';
            img.className = 'coin-rain-img';
            coin.appendChild(img);
            coin.style.left = `${Math.random() * width}px`;
            coin.style.top = `${-(20 + Math.random() * 60)}px`;
            const size = 20 + Math.random() * 18;
            coin.style.width = `${size}px`;
            coin.style.height = `${size}px`;
            coin.style.setProperty('--drift-x', `${(Math.random() - 0.5) * 100}px`);
            coin.style.setProperty('--fall-dist', `${height + 80}px`);
            coin.style.setProperty('--rot', `${Math.random() * 540 - 270}deg`);
            const delay = Math.random() * 800;
            const duration = 1.2 + Math.random() * 0.8;
            coin.style.animation = `coin-fall ${duration}s cubic-bezier(0.25, 0.1, 0.25, 1) ${delay}ms forwards`;
            els.push(coin);
            durs.push(duration + delay / 1000);
        }
        batchAppendParticles(container, els, durs);
    }

    function createSafeShockwave(x, y) {
        const el = document.createElement('div');
        el.classList.add('safe-shockwave');
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 600);
    }

    function createSafeBurstParticles(x, y) {
        const colors = ['#FFD700', '#FFA500', '#FFFFFF', '#4CAF50', '#81C784', '#FFF9C4'];
        const count = 35;
        const els = [];
        const durs = [];

        for (let i = 0; i < count; i++) {
            const particle = document.createElement('div');
            particle.classList.add('safe-particle');
            const color = colors[Math.floor(Math.random() * colors.length)];
            particle.style.backgroundColor = color;
            particle.style.boxShadow = `0 0 8px ${color}`;
            particle.style.left = `${x}px`;
            particle.style.top = `${y}px`;
            const angle = Math.random() * Math.PI * 2;
            const velocity = 50 + (Math.random() * 120);
            particle.style.setProperty('--tx', `${Math.cos(angle) * velocity}px`);
            particle.style.setProperty('--ty', `${(Math.sin(angle) * velocity) - (Math.random() * 30)}px`);
            const size = 6 + (Math.random() * 8);
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;
            const duration = 0.6 + (Math.random() * 0.4);
            particle.style.animation = `safe-particle-anim ${duration}s cubic-bezier(0.15, 0.85, 0.35, 1) forwards`;
            particle.style.borderRadius = '50%';
            els.push(particle);
            durs.push(duration);
        }
        batchAppendParticles(document.body, els, durs);
    }

    function createShockwave(x, y) {
        const el = document.createElement('div');
        el.classList.add('shockwave');
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 500);
    }

    function createConfettiFireworks() {
        const container = getGameContainer();
        const rect = container.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const colors = ['#FFD700', '#FF3E4D', '#4CAF50', '#00BCD4', '#E040FB', '#FF4081'];
        const numParticles = 80;
        const els = [];
        const durs = [];

        for (let i = 0; i < numParticles; i++) {
            const isLeft = i % 2 === 0;
            const particle = document.createElement('div');
            particle.classList.add('confetti-particle');
            particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            const startX = isLeft ? -10 : width + 10;
            particle.style.left = `${startX}px`;
            particle.style.top = `${height}px`;
            const angleRad = isLeft ? (-Math.PI/2 + 0.1 + (Math.random() * 0.7)) : (-Math.PI/2 - 0.1 - (Math.random() * 0.7));
            const velocity = height * (0.6 + Math.random() * 0.6);
            particle.style.setProperty('--tx', `${Math.cos(angleRad) * velocity}px`);
            particle.style.setProperty('--ty', `${Math.sin(angleRad) * velocity}px`);
            const size = 6 + Math.random() * 8;
            if (Math.random() > 0.5) {
                particle.style.width = `${size/1.5}px`;
                particle.style.height = `${size * 2}px`;
            } else {
                particle.style.width = `${size}px`;
                particle.style.height = `${size}px`;
            }
            particle.style.setProperty('--rot', `${Math.random() * 1080 - 540}deg`);
            const duration = 1.8 + Math.random() * 1.2;
            particle.style.animation = `confetti-anim ${duration}s cubic-bezier(0.25, 0.8, 0.25, 1) forwards`;
            els.push(particle);
            durs.push(duration);
        }
        batchAppendParticles(container, els, durs);
    }

    function createCustomerDepartureParticles(x, y) {
        const colors = ['#F5E0C8', '#e8943a', '#FFD700', '#f0d9b8', '#864D26', '#fff4e0'];
        const emojis = ['✨', '💛', '🌟', '⭐'];
        const count = 18;
        const els = [];
        const durs = [];

        for (let i = 0; i < count; i++) {
            const particle = document.createElement('div');
            particle.classList.add('customer-departure-particle');
            const useEmoji = i < 5;
            if (useEmoji) {
                particle.textContent = emojis[Math.floor(Math.random() * emojis.length)];
                particle.style.fontSize = `${10 + Math.random() * 10}px`;
                particle.style.backgroundColor = 'transparent';
            } else {
                const color = colors[Math.floor(Math.random() * colors.length)];
                particle.style.backgroundColor = color;
                particle.style.boxShadow = `0 0 6px ${color}`;
                const size = 4 + Math.random() * 6;
                particle.style.width = `${size}px`;
                particle.style.height = `${size}px`;
            }
            particle.style.left = `${x}px`;
            particle.style.top = `${y}px`;
            const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.2;
            const velocity = 60 + Math.random() * 100;
            particle.style.setProperty('--tx', `${Math.cos(angle) * velocity}px`);
            particle.style.setProperty('--ty', `${Math.sin(angle) * velocity}px`);
            const duration = 0.7 + Math.random() * 0.5;
            particle.style.animation = `customer-departure-anim ${duration}s cubic-bezier(0.15, 0.85, 0.35, 1) forwards`;
            els.push(particle);
            durs.push(duration);
        }
        batchAppendParticles(document.body, els, durs);
    }

    function createHeartBurstParticles(x, y) {
        const emojis = ['❤', '💗', '💖', '💕'];
        const count = 10;
        const els = [];
        const durs = [];

        for (let i = 0; i < count; i++) {
            const particle = document.createElement('div');
            particle.classList.add('heart-burst-particle');
            particle.textContent = emojis[Math.floor(Math.random() * emojis.length)];
            particle.style.fontSize = `${8 + Math.random() * 10}px`;
            particle.style.left = `${x}px`;
            particle.style.top = `${y}px`;
            const angle = Math.random() * Math.PI * 2;
            const velocity = 30 + Math.random() * 60;
            particle.style.setProperty('--tx', `${Math.cos(angle) * velocity}px`);
            particle.style.setProperty('--ty', `${Math.sin(angle) * velocity}px`);
            const duration = 0.5 + Math.random() * 0.4;
            particle.style.animation = `heart-burst-anim ${duration}s cubic-bezier(0.16, 0.9, 0.3, 1) forwards`;
            els.push(particle);
            durs.push(duration);
        }
        batchAppendParticles(document.body, els, durs);
    }

    globalScope.GameEffects = {
        createParticles,
        createFloatingText,
        createCoinFloatingText,
        createCoinRain,
        createCoinFall,
        createSafeShockwave,
        createSafeBurstParticles,
        createShockwave,
        createConfettiFireworks,
        createCustomerDepartureParticles,
        createHeartBurstParticles
    };

    if (globalScope.WynneRegistry) {
        globalScope.WynneRegistry.register('GameEffects', globalScope.GameEffects);
    }
}(window));
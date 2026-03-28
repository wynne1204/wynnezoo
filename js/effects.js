(function initGameEffectsModule(globalScope) {
    function createParticles(x, y, color, count) {
        const safeCount = Math.max(0, Number(count) || 10);
        for (let i = 0; i < safeCount; i++) {
            const particle = document.createElement('div');
            particle.classList.add('particle');
            particle.style.backgroundColor = color;
            particle.style.left = `${x}px`;
            particle.style.top = `${y}px`;

            const angle = Math.random() * Math.PI * 2;
            const velocity = 50 + (Math.random() * 100);
            const tx = `${Math.cos(angle) * velocity}px`;
            const ty = `${Math.sin(angle) * velocity}px`;

            particle.style.setProperty('--tx', tx);
            particle.style.setProperty('--ty', ty);

            const size = 4 + (Math.random() * 6);
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;

            particle.style.animation = 'particle-explode 0.6s ease-out forwards';

            document.body.appendChild(particle);
            setTimeout(() => particle.remove(), 600);
        }
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

    /**
     * 带金币图标的飘字（用于连团结算）
     */
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

    /**
     * 金币雨 — 从顶部落下大量旋转金币，类似 Coin Master 风格
     */
    function createCoinRain(coinCount) {
        const container = document.querySelector('.game-container') || document.body;
        const rect = container.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const count = Math.max(1, Math.floor(Number(coinCount) || 40));

        // 从底部中央区域往上迸发
        const baseY = height;

        for (let i = 0; i < count; i++) {
            const coin = document.createElement('div');
            coin.classList.add('coin-rain-particle');

            const img = document.createElement('img');
            img.src = './Texture/UI/Icon_Gold.png';
            img.alt = '';
            img.className = 'coin-rain-img';
            coin.appendChild(img);

            // 从底部随机水平位置出发
            const startX = width * 0.2 + Math.random() * width * 0.6;
            coin.style.left = `${startX}px`;
            coin.style.top = `${baseY}px`;

            // 随机大小
            const size = 22 + Math.random() * 20;
            coin.style.width = `${size}px`;
            coin.style.height = `${size}px`;

            // 向上 + 向外扩散
            const spreadAngle = -Math.PI / 2 + (Math.random() - 0.5) * 1.4;
            const velocity = height * (0.4 + Math.random() * 0.45);
            const tx = Math.cos(spreadAngle) * velocity;
            const ty = Math.sin(spreadAngle) * velocity;
            const rot = Math.random() * 720 - 360;
            coin.style.setProperty('--tx', `${tx}px`);
            coin.style.setProperty('--ty', `${ty}px`);
            coin.style.setProperty('--rot', `${rot}deg`);

            const delay = Math.random() * 200;
            const duration = 1.0 + Math.random() * 0.6;
            coin.style.animation = `coin-burst ${duration}s cubic-bezier(0.16, 0.9, 0.3, 1) ${delay}ms forwards`;

            container.appendChild(coin);
            setTimeout(() => coin.remove(), (duration * 1000) + delay + 100);
        }
    }

    /**
     * 从天而降的金币雨 — 连团 > 5 时触发
     */
    function createCoinFall(coinCount) {
        const container = document.querySelector('.game-container') || document.body;
        const rect = container.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const count = Math.max(1, Math.floor(Number(coinCount) || 30));

        for (let i = 0; i < count; i++) {
            const coin = document.createElement('div');
            coin.classList.add('coin-rain-particle');

            const img = document.createElement('img');
            img.src = './Texture/UI/Icon_Gold.png';
            img.alt = '';
            img.className = 'coin-rain-img';
            coin.appendChild(img);

            const startX = Math.random() * width;
            coin.style.left = `${startX}px`;
            coin.style.top = `${-(20 + Math.random() * 60)}px`;

            const size = 20 + Math.random() * 18;
            coin.style.width = `${size}px`;
            coin.style.height = `${size}px`;

            const driftX = (Math.random() - 0.5) * 100;
            const rot = Math.random() * 540 - 270;
            coin.style.setProperty('--drift-x', `${driftX}px`);
            coin.style.setProperty('--fall-dist', `${height + 80}px`);
            coin.style.setProperty('--rot', `${rot}deg`);

            const delay = Math.random() * 800;
            const duration = 1.2 + Math.random() * 0.8;
            coin.style.animation = `coin-fall ${duration}s cubic-bezier(0.25, 0.1, 0.25, 1) ${delay}ms forwards`;

            container.appendChild(coin);
            setTimeout(() => coin.remove(), (duration * 1000) + delay + 100);
        }
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
            const tx = `${Math.cos(angle) * velocity}px`;
            const ty = `${(Math.sin(angle) * velocity) - (Math.random() * 30)}px`;

            particle.style.setProperty('--tx', tx);
            particle.style.setProperty('--ty', ty);

            const size = 6 + (Math.random() * 8);
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;

            const duration = 0.6 + (Math.random() * 0.4);
            particle.style.animation = `safe-particle-anim ${duration}s cubic-bezier(0.15, 0.85, 0.35, 1) forwards`;
            particle.style.borderRadius = '50%';

            document.body.appendChild(particle);
            setTimeout(() => particle.remove(), (duration * 1000) + 100);
        }
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
        const container = document.querySelector('.game-container') || document.body;
        const rect = container.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;

        const colors = ['#FFD700', '#FF3E4D', '#4CAF50', '#00BCD4', '#E040FB', '#FF4081'];
        const numParticles = 80;

        for (let i = 0; i < numParticles; i++) {
            const isLeft = i % 2 === 0;
            const particle = document.createElement('div');
            particle.classList.add('confetti-particle');

            const color = colors[Math.floor(Math.random() * colors.length)];
            particle.style.backgroundColor = color;
            
            // 粒子从游戏容器两侧底部发射
            const startX = isLeft ? -10 : width + 10;
            const startY = height;
            
            particle.style.left = `${startX}px`;
            particle.style.top = `${startY}px`;

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

            container.appendChild(particle);
            setTimeout(() => particle.remove(), duration * 1000);
        }
    }

    /**
     * 顾客离场粒子 — 从顾客立绘位置向上飘散的温暖色调粒子
     * @param {number} x - 粒子发射中心 x
     * @param {number} y - 粒子发射中心 y
     */
    function createCustomerDepartureParticles(x, y) {
        const colors = ['#F5E0C8', '#e8943a', '#FFD700', '#f0d9b8', '#864D26', '#fff4e0'];
        const emojis = ['✨', '💛', '🌟', '⭐'];
        const count = 18;

        for (let i = 0; i < count; i++) {
            const particle = document.createElement('div');
            particle.classList.add('customer-departure-particle');

            // 一部分用 emoji，一部分用圆点
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

            // 主要向上飘散，略微左右扩散
            const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.2;
            const velocity = 60 + Math.random() * 100;
            const tx = Math.cos(angle) * velocity;
            const ty = Math.sin(angle) * velocity;

            particle.style.setProperty('--tx', `${tx}px`);
            particle.style.setProperty('--ty', `${ty}px`);

            const duration = 0.7 + Math.random() * 0.5;
            particle.style.animation = `customer-departure-anim ${duration}s cubic-bezier(0.15, 0.85, 0.35, 1) forwards`;

            document.body.appendChild(particle);
            setTimeout(() => particle.remove(), (duration * 1000) + 100);
        }
    }

    /**
     * 爱心迸发粒子 — 获得爱心时从爱心位置炸开的小爱心和星星
     */
    function createHeartBurstParticles(x, y) {
        const emojis = ['❤', '💗', '💖', '💕'];
        const count = 10;

        for (let i = 0; i < count; i++) {
            const particle = document.createElement('div');
            particle.classList.add('heart-burst-particle');
            particle.textContent = emojis[Math.floor(Math.random() * emojis.length)];
            particle.style.fontSize = `${8 + Math.random() * 10}px`;
            particle.style.left = `${x}px`;
            particle.style.top = `${y}px`;

            const angle = Math.random() * Math.PI * 2;
            const velocity = 30 + Math.random() * 60;
            const tx = Math.cos(angle) * velocity;
            const ty = Math.sin(angle) * velocity;
            particle.style.setProperty('--tx', `${tx}px`);
            particle.style.setProperty('--ty', `${ty}px`);

            const duration = 0.5 + Math.random() * 0.4;
            particle.style.animation = `heart-burst-anim ${duration}s cubic-bezier(0.16, 0.9, 0.3, 1) forwards`;

            document.body.appendChild(particle);
            setTimeout(() => particle.remove(), (duration * 1000) + 100);
        }
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

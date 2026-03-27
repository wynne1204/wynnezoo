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

    globalScope.GameEffects = {
        createParticles,
        createFloatingText,
        createSafeShockwave,
        createSafeBurstParticles,
        createShockwave,
        createConfettiFireworks
    };

    if (globalScope.WynneRegistry) {
        globalScope.WynneRegistry.register('GameEffects', globalScope.GameEffects);
    }
}(window));

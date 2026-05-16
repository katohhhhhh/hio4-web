(function() {
    'use strict';

    // ====== Hamburger Menu ======
    const menuToggle = document.getElementById('menuToggle');
    const nav = document.getElementById('nav');

    function closeMenu() {
        nav.classList.remove('open');
        menuToggle.classList.remove('open');
        document.body.style.overflow = '';
    }
    function openMenu() {
        nav.classList.add('open');
        menuToggle.classList.add('open');
        document.body.style.overflow = 'hidden';
    }
    menuToggle.addEventListener('click', function() {
        nav.classList.contains('open') ? closeMenu() : openMenu();
    });
    document.querySelectorAll('#nav a').forEach(function(l) {
        l.addEventListener('click', closeMenu);
    });
    document.addEventListener('click', function(e) {
        if (nav.classList.contains('open') && !nav.contains(e.target) && !menuToggle.contains(e.target)) {
            closeMenu();
        }
    });
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && nav.classList.contains('open')) closeMenu();
    });

    // ====== Smooth Scroll & Active Nav ======
    document.querySelectorAll('#nav a').forEach(function(link) {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            var target = document.querySelector(this.getAttribute('href'));
            if (target) window.scrollTo({ top: target.offsetTop - 80, behavior: 'smooth' });
        });
    });

    var sections = document.querySelectorAll('section[id]');
    window.addEventListener('scroll', function() {
        var scrollY = window.pageYOffset + 120;
        var current = '';
        sections.forEach(function(s) {
            if (scrollY >= s.offsetTop && scrollY < s.offsetTop + s.offsetHeight) current = s.id;
        });
        document.querySelectorAll('#nav a').forEach(function(l) {
            l.classList.toggle('active', l.getAttribute('href') === '#' + current);
        });
    });

    // ====== UP主 Cards ======
    (function renderUperCards() {
        var grid = document.getElementById('uperGrid');
        if (!grid || typeof UPER_DATA === 'undefined') return;
        var html = '';
        UPER_DATA.forEach(function(up) {
            var fans = up.follower >= 10000 ? (up.follower / 10000).toFixed(1) + '万粉丝'
                : up.follower + '粉丝';
            var avatarHtml = up.avatar
                ? '<img src="' + up.avatar + '" alt="" class="uper-avatar-img" loading="lazy" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\';">' +
                  '<div class="uper-avatar" style="display:none">' + up.name.charAt(0) + '</div>'
                : '<div class="uper-avatar">' + up.name.charAt(0) + '</div>';
            html += '<a href="https://space.bilibili.com/' + up.mid + '" target="_blank" rel="noopener" class="uper-card">' +
                '<div class="uper-avatar-wrap">' + avatarHtml + '</div>' +
                '<div class="uper-info"><div class="uper-name">' + up.name + '</div>' +
                '<div class="uper-desc">' + up.desc + '</div>' +
                '<div class="uper-meta">' + fans + '</div></div></a>';
        });
        grid.innerHTML = html;
    })();

    // ====== Scroll Animation ======
    var observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(e) {
            if (e.isIntersecting) {
                e.target.style.opacity = '1';
                e.target.style.transform = 'translateY(0)';
                observer.unobserve(e.target);
            }
        });
    }, { threshold: 0.1 });
    document.querySelectorAll('.card, .tactic-card, .step, .uper-card, .feature-section').forEach(function(el) {
        el.style.opacity = '0';
        el.style.transform = 'translateY(24px)';
        el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        observer.observe(el);
    });

    // ====== Download Buttons ======
    var dlBtn = document.getElementById('dlBtn');
    if (dlBtn) {
        dlBtn.addEventListener('click', function(e) {
            e.preventDefault();
            showToast('感谢关注！游戏下载链接将在后续更新中提供。');
        });
    }
    document.querySelectorAll('.alt-link').forEach(function(link) {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            showToast('该下载方式正在维护，请稍后再试。');
        });
    });

    // ====== Toast ======
    function showToast(msg) {
        var existing = document.querySelector('.toast');
        if (existing) existing.remove();
        var toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = msg;
        Object.assign(toast.style, {
            position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
            background: '#25261c', color: '#d4c5a0', padding: '12px 24px', borderRadius: '2px',
            border: '1px solid #8a7030', fontSize: '0.88rem', zIndex: '9999',
            opacity: '0', transition: 'opacity 0.3s', pointerEvents: 'none',
            fontFamily: 'inherit', letterSpacing: '0.04em'
        });
        document.body.appendChild(toast);
        requestAnimationFrame(function() { toast.style.opacity = '1'; });
        setTimeout(function() { toast.style.opacity = '0'; setTimeout(function() { toast.remove(); }, 300); }, 2500);
    }

    // ====== Collapsible Tutorial Blocks ======
    document.querySelectorAll('.tutorial-block').forEach(function(block) {
        var header = block.querySelector('.block-header');
        if (!header) return;

        var body = document.createElement('div');
        body.className = 'tutorial-body';
        while (header.nextSibling) {
            body.appendChild(header.nextSibling);
        }
        block.appendChild(body);

        header.addEventListener('click', function() {
            block.classList.toggle('collapsed');
        });
    });


})();

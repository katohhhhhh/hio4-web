(function() {
    'use strict';

    // ====== Hamburger Menu ======
    const menuToggle = document.getElementById('menuToggle');
    const nav = document.getElementById('nav');
    const navLinks = nav.querySelectorAll('a');

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
        if (nav.classList.contains('open')) {
            closeMenu();
        } else {
            openMenu();
        }
    });

    // Close menu when a nav link is clicked
    navLinks.forEach(function(link) {
        link.addEventListener('click', function() {
            closeMenu();
        });
    });

    // Close menu when clicking outside
    document.addEventListener('click', function(e) {
        if (nav.classList.contains('open') &&
            !nav.contains(e.target) &&
            !menuToggle.contains(e.target)) {
            closeMenu();
        }
    });

    // ====== Smooth Scroll ======
    navLinks.forEach(function(link) {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            var targetId = this.getAttribute('href');
            var target = document.querySelector(targetId);
            if (target) {
                var offset = target.offsetTop - 60;
                window.scrollTo({ top: offset, behavior: 'smooth' });
            }
        });
    });

    // ====== Active Nav on Scroll ======
    var sections = document.querySelectorAll('section[id]');
    var scrollTimeout;

    function updateActiveNav() {
        var scrollY = window.pageYOffset + 100;
        var current = '';
        sections.forEach(function(section) {
            var top = section.offsetTop;
            var height = section.offsetHeight;
            if (scrollY >= top && scrollY < top + height) {
                current = section.getAttribute('id');
            }
        });
        navLinks.forEach(function(link) {
            link.classList.remove('active');
            if (link.getAttribute('href') === '#' + current) {
                link.classList.add('active');
            }
        });
    }

    window.addEventListener('scroll', function() {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(updateActiveNav, 50);
    });

    // ====== UP主 Cards Rendering ======
    function renderUperCards() {
        var grid = document.getElementById('uperGrid');
        if (!grid || typeof UPER_DATA === 'undefined') return;

        var html = '';
        UPER_DATA.forEach(function(up) {
            var plays = up.total_play;
            var playStr;
            if (plays >= 10000000) {
                playStr = (plays / 10000000).toFixed(1) + '千万播放';
            } else if (plays >= 10000) {
                playStr = (plays / 10000).toFixed(1) + '万播放';
            } else {
                playStr = plays + '播放';
            }

            // 用名字首字生成头像
            var initial = up.name.charAt(0);

            html += [
                '<a href="' + up.space_url + '" target="_blank" rel="noopener" class="uper-card">',
                '  <div class="uper-avatar">' + initial + '</div>',
                '  <div class="uper-info">',
                '    <div class="uper-name">' + up.name + '</div>',
                '    <div class="uper-sign">' + up.sign + '</div>',
                '    <div class="uper-meta">' + up.video_count + '个视频 · ' + playStr + '</div>',
                '  </div>',
                '</a>'
            ].join('');
        });

        grid.innerHTML = html;
    }

    renderUperCards();

    // ====== Scroll Animation ======
    var observerOptions = { threshold: 0.1, rootMargin: '0px 0px -30px 0px' };

    var observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    document.querySelectorAll('.card, .tactic-card, .step, .uper-card, .feature-section').forEach(function(el) {
        el.style.opacity = '0';
        el.style.transform = 'translateY(24px)';
        el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        observer.observe(el);
    });

    // ====== Message Board Filters ======
    var filterBtns = document.querySelectorAll('.filter-btn');

    filterBtns.forEach(function(btn) {
        btn.addEventListener('click', function() {
            var filter = this.getAttribute('data-filter');

            filterBtns.forEach(function(b) { b.classList.remove('active'); });
            this.classList.add('active');

            var messages = document.querySelectorAll('.message-item:not(.pinned)');
            messages.forEach(function(msg) {
                if (filter === 'all' || msg.getAttribute('data-category') === filter) {
                    msg.style.display = 'block';
                } else {
                    msg.style.display = 'none';
                }
            });
        });
    });

    // ====== Comment Form ======
    var commentForm = document.getElementById('commentForm');
    if (commentForm) {
        commentForm.addEventListener('submit', function(e) {
            e.preventDefault();

            var username = document.getElementById('username').value.trim();
            var title = document.getElementById('commentTitle').value.trim();
            var text = document.getElementById('commentText').value.trim();
            var category = document.getElementById('commentCategory').value;

            if (!username || !title || !text) return;

            var categoryNames = {
                'general': '综合',
                'guide': '攻略',
                'question': '问答',
                'team': '联机',
                'mod': 'MOD'
            };

            var newMsg = document.createElement('div');
            newMsg.className = 'message-item';
            newMsg.setAttribute('data-category', category);
            newMsg.innerHTML =
                '<div class="message-header">' +
                '  <span class="category-tag ' + category + '">' + (categoryNames[category] || category) + '</span>' +
                '  <span class="message-title">' + escapeHtml(title) + '</span>' +
                '</div>' +
                '<div class="message-preview">' + escapeHtml(text) + '</div>' +
                '<div class="message-footer">' +
                '  <div class="author-info"><span class="author-name">🎮 ' + escapeHtml(username) + '</span><span class="post-time">刚刚</span></div>' +
                '  <div class="message-stats"><span>👍 0</span><span>💬 0</span></div>' +
                '</div>';

            var list = document.getElementById('messagesList');
            list.insertBefore(newMsg, list.firstChild);

            // Flash animation
            newMsg.style.background = 'rgba(88,166,255,0.1)';
            setTimeout(function() { newMsg.style.background = ''; newMsg.style.transition = 'background 0.6s'; }, 100);

            // Reset
            document.getElementById('username').value = '';
            document.getElementById('commentTitle').value = '';
            document.getElementById('commentText').value = '';
            document.getElementById('commentCategory').value = 'general';
        });
    }

    function escapeHtml(str) {
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    // ====== Load More ======
    var loadMoreBtn = document.getElementById('loadMoreBtn');
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', function() {
            var list = document.getElementById('messagesList');
            var dummy = document.createElement('div');
            dummy.className = 'message-item';
            dummy.setAttribute('data-category', 'general');
            dummy.innerHTML =
                '<div class="message-header">' +
                '  <span class="category-tag general">综合</span>' +
                '  <span class="message-title">更多留言即将开放</span>' +
                '</div>' +
                '<div class="message-preview">留言板功能持续完善中，敬请期待更多互动功能上线…</div>' +
                '<div class="message-footer">' +
                '  <div class="author-info"><span class="author-name">🛠 系统消息</span><span class="post-time">刚刚</span></div>' +
                '  <div class="message-stats"><span>👍 0</span><span>💬 0</span></div>' +
                '</div>';
            list.appendChild(dummy);
        });
    }

    // ====== Download Button ======
    var dlBtn = document.getElementById('dlBtn');
    if (dlBtn) {
        dlBtn.addEventListener('click', function(e) {
            e.preventDefault();
            showToast('感谢关注！游戏下载链接将在后续更新中提供。');
        });
    }

    var altLinks = document.querySelectorAll('.alt-link');
    altLinks.forEach(function(link) {
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
        toast.style.cssText =
            'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);' +
            'background:#21262d;color:#c9d1d9;padding:12px 24px;border-radius:8px;' +
            'border:1px solid #30363d;font-size:0.9rem;z-index:9999;' +
            'opacity:0;transition:opacity 0.3s;pointer-events:none;';
        document.body.appendChild(toast);

        requestAnimationFrame(function() {
            toast.style.opacity = '1';
        });

        setTimeout(function() {
            toast.style.opacity = '0';
            setTimeout(function() { toast.remove(); }, 300);
        }, 2500);
    }

    // ====== Keyboard shortcut: Escape to close menu ======
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && nav.classList.contains('open')) {
            closeMenu();
        }
    });

})();

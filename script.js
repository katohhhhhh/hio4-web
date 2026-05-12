(function() {
    'use strict';

    const LS_KEY = 'hoi4_forum_messages';
    const PAGE_SIZE = 5;
    let currentFilter = 'all';
    let visibleCount = PAGE_SIZE;

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
            var plays = up.total_play >= 10000000 ? (up.total_play / 10000000).toFixed(1) + '千万播放'
                : up.total_play >= 10000 ? (up.total_play / 10000).toFixed(1) + '万播放'
                : up.total_play + '播放';
            var avatarHtml = up.avatar
                ? '<img src="' + up.avatar + '" alt="" class="uper-avatar-img" loading="lazy" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\';">' +
                  '<div class="uper-avatar" style="display:none">' + up.name.charAt(0) + '</div>'
                : '<div class="uper-avatar">' + up.name.charAt(0) + '</div>';
            html += '<a href="https://space.bilibili.com/' + up.mid + '" target="_blank" rel="noopener" class="uper-card">' +
                '<div class="uper-avatar-wrap">' + avatarHtml + '</div>' +
                '<div class="uper-info"><div class="uper-name">' + up.name + '</div>' +
                '<div class="uper-desc">' + up.desc + '</div>' +
                '<div class="uper-meta">' + up.video_count + '个视频 · ' + plays + '</div></div></a>';
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

    // ====== Forum Storage ======
    function loadMessages() {
        try {
            return JSON.parse(localStorage.getItem(LS_KEY)) || [];
        } catch (e) {
            return [];
        }
    }
    function saveMessages(msgs) {
        try {
            localStorage.setItem(LS_KEY, JSON.stringify(msgs));
        } catch (e) {
            showToast('存储空间不足，请清理旧留言');
        }
    }

    function formatTime(ts) {
        var now = Date.now();
        var diff = now - ts;
        var min = Math.floor(diff / 60000);
        if (min < 1) return '刚刚';
        if (min < 60) return min + '分钟前';
        var hr = Math.floor(min / 60);
        if (hr < 24) return hr + '小时前';
        var day = Math.floor(hr / 24);
        if (day < 30) return day + '天前';
        var d = new Date(ts);
        return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
    }

    function isToday(ts) {
        var d = new Date(ts);
        var now = new Date();
        return d.getFullYear() === now.getFullYear() &&
               d.getMonth() === now.getMonth() &&
               d.getDate() === now.getDate();
    }

    // ====== Render Messages ======
    var categoryNames = { general: '综合', guide: '攻略', question: '问答', team: '联机', mod: 'MOD' };

    function renderMessages() {
        var all = loadMessages();
        var list = document.getElementById('messagesList');
        var loadMoreWrap = document.getElementById('loadMoreWrap');

        // Sort newest first
        all.sort(function(a, b) { return b.time - a.time; });

        // Filter
        var filtered = currentFilter === 'all' ? all : all.filter(function(m) { return m.category === currentFilter; });

        // Paginate
        var visible = filtered.slice(0, visibleCount);
        var hasMore = filtered.length > visibleCount;

        if (filtered.length === 0) {
            list.innerHTML = '<div class="empty-state">暂无留言，快来发表第一条吧</div>';
            loadMoreWrap.style.display = 'none';
        } else {
            var html = '';
            visible.forEach(function(m) {
                html += buildMessageHTML(m);
            });
            list.innerHTML = html;
            loadMoreWrap.style.display = hasMore ? 'block' : 'none';

            // Bind like/reply buttons
            list.querySelectorAll('.like-btn').forEach(function(btn) {
                btn.addEventListener('click', function(e) {
                    e.preventDefault();
                    var msgId = parseInt(this.getAttribute('data-id'));
                    handleLike(msgId);
                });
            });
            list.querySelectorAll('.reply-btn').forEach(function(btn) {
                btn.addEventListener('click', function(e) {
                    e.preventDefault();
                    var msgId = parseInt(this.getAttribute('data-id'));
                    handleReply(msgId);
                });
            });
        }
        updateStats(all);
    }

    function buildMessageHTML(m) {
        var cat = categoryNames[m.category] || m.category;
        return '<div class="message-item" data-category="' + m.category + '">' +
            '<div class="message-header">' +
            '<span class="category-tag ' + m.category + '">' + cat + '</span>' +
            '<span class="message-title">' + escapeHtml(m.title) + '</span>' +
            '</div>' +
            '<div class="message-preview">' + escapeHtml(m.content) + '</div>' +
            (m.replies && m.replies.length ? renderReplies(m.replies) : '') +
            '<div class="message-footer">' +
            '<div class="author-info"><span class="author-name">' + escapeHtml(m.author) + '</span><span class="post-time">' + formatTime(m.time) + '</span></div>' +
            '<div class="message-stats">' +
            '<button class="like-btn" data-id="' + m.id + '">+<span>' + (m.likes || 0) + '</span></button>' +
            '<button class="reply-btn" data-id="' + m.id + '">回复</button>' +
            '</div></div></div>';
    }

    function renderReplies(replies) {
        return '<div class="replies-list">' + replies.map(function(r) {
            return '<div class="reply-item"><span class="reply-author">' + escapeHtml(r.author) + '</span>: ' + escapeHtml(r.text) + '<span class="post-time"> ' + formatTime(r.time) + '</span></div>';
        }).join('') + '</div>';
    }

    function handleLike(msgId) {
        var msgs = loadMessages();
        var msg = msgs.find(function(m) { return m.id === msgId; });
        if (!msg) return;
        msg.likes = (msg.likes || 0) + 1;
        saveMessages(msgs);
        renderMessages();
    }

    function handleReply(msgId) {
        var text = prompt('输入你的回复：');
        if (!text || !text.trim()) return;
        var author = prompt('你的昵称：');
        if (!author || !author.trim()) return;

        var msgs = loadMessages();
        var msg = msgs.find(function(m) { return m.id === msgId; });
        if (!msg) return;
        if (!msg.replies) msg.replies = [];
        msg.replies.push({ author: author.trim(), text: text.trim(), time: Date.now() });
        saveMessages(msgs);
        renderMessages();
    }

    function escapeHtml(str) {
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    function updateStats(all) {
        var total = all.length;
        var today = all.filter(function(m) { return isToday(m.time); }).length;
        var replies = all.reduce(function(acc, m) { return acc + (m.replies ? m.replies.length : 0); }, 0);
        document.getElementById('statTotal').textContent = total;
        document.getElementById('statToday').textContent = today;
        document.getElementById('statReplies').textContent = replies;
    }

    // ====== Form Submit ======
    var commentForm = document.getElementById('commentForm');
    if (commentForm) {
        commentForm.addEventListener('submit', function(e) {
            e.preventDefault();
            var username = document.getElementById('username').value.trim();
            var title = document.getElementById('commentTitle').value.trim();
            var text = document.getElementById('commentText').value.trim();
            var category = document.getElementById('commentCategory').value;

            if (!username || !title || !text) {
                showToast('请填写完整的留言信息');
                return;
            }

            var msgs = loadMessages();
            var newMsg = {
                id: Date.now(),
                author: username,
                title: title,
                content: text,
                category: category,
                time: Date.now(),
                likes: 0,
                replies: []
            };
            msgs.push(newMsg);
            saveMessages(msgs);

            // Reset form
            document.getElementById('username').value = '';
            document.getElementById('commentTitle').value = '';
            document.getElementById('commentText').value = '';
            document.getElementById('commentCategory').value = 'general';

            // Reset filter to show new post
            currentFilter = 'all';
            visibleCount = PAGE_SIZE;
            document.querySelectorAll('.filter-btn').forEach(function(b) { b.classList.remove('active'); });
            document.querySelector('.filter-btn[data-filter="all"]').classList.add('active');
            renderMessages();
            showToast('留言发表成功');
        });
    }

    // ====== Filter ======
    document.querySelectorAll('.filter-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            currentFilter = this.getAttribute('data-filter');
            visibleCount = PAGE_SIZE;
            document.querySelectorAll('.filter-btn').forEach(function(b) { b.classList.remove('active'); });
            this.classList.add('active');
            renderMessages();
        });
    });

    // ====== Load More ======
    var loadMoreBtn = document.getElementById('loadMoreBtn');
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', function() {
            visibleCount += PAGE_SIZE;
            renderMessages();
        });
    }

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

    // ====== Init ======
    renderMessages();

})();

document.addEventListener('DOMContentLoaded', function() {
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('section');

    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            
            if (targetSection) {
                const offsetTop = targetSection.offsetTop - 80;
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
        });
    });

    window.addEventListener('scroll', function() {
        let current = '';
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop - 100;
            const sectionHeight = section.offsetHeight;
            
            if (pageYOffset >= sectionTop && pageYOffset < sectionTop + sectionHeight) {
                current = section.getAttribute('id');
            }
        });
        
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === '#' + current) {
                link.classList.add('active');
            }
        });
    });

    const tutorialCards = document.querySelectorAll('.tutorial-card');
    tutorialCards.forEach(card => {
        card.addEventListener('click', function() {
            this.classList.toggle('expanded');
        });
    });

    const downloadBtn = document.querySelector('.btn-large');
    downloadBtn.addEventListener('click', function(e) {
        e.preventDefault();
        alert('感谢您的关注！游戏下载链接将在后续更新中提供。');
    });

    const altLinks = document.querySelectorAll('.alt-link');
    altLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            alert('该下载方式正在维护中，请稍后再试。');
        });
    });

    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    document.querySelectorAll('.tutorial-card, .feature-section').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });

    const commentForm = document.getElementById('commentForm');
    const commentsList = document.querySelector('.comments-list');

    commentForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const commentText = document.getElementById('commentText').value;
        
        const newComment = document.createElement('div');
        newComment.className = 'comment-item';
        newComment.innerHTML = `
            <div class="comment-header">
                <div class="avatar">🎮</div>
                <div class="user-info">
                    <span class="username">${username}</span>
                    <span class="time">刚刚</span>
                </div>
            </div>
            <p class="comment-content">${commentText}</p>
            <div class="comment-actions">
                <button class="reply-btn">回复</button>
                <button class="like-btn">👍 点赞 (0)</button>
            </div>
        `;
        
        commentsList.insertBefore(newComment, commentsList.children[1]);
        
        document.getElementById('username').value = '';
        document.getElementById('commentText').value = '';
        
        addCommentListeners(newComment);
    });

    function addCommentListeners(commentItem) {
        const replyBtn = commentItem.querySelector('.reply-btn');
        const likeBtn = commentItem.querySelector('.like-btn');
        
        replyBtn.addEventListener('click', function() {
            alert('回复功能即将上线，敬请期待！');
        });
        
        likeBtn.addEventListener('click', function() {
            const currentCount = parseInt(this.textContent.match(/\d+/)[0]);
            const newCount = currentCount + 1;
            this.textContent = `👍 点赞 (${newCount})`;
        });
    }

    document.querySelectorAll('.comment-item').forEach(addCommentListeners);
});
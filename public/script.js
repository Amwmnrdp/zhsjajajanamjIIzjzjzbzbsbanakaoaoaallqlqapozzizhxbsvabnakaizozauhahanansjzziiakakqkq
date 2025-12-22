const hamburgerBtn = document.getElementById('hamburgerBtn');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');
const menuLinks = document.querySelectorAll('.menu-link');
const contentSections = document.querySelectorAll('.content-section');
const tabBtns = document.querySelectorAll('.tab-btn');
const commandsLists = document.querySelectorAll('.commands-list');
const activateBtn = document.getElementById('activateBtn');

const postSuggestionBtn = document.getElementById('postSuggestionBtn');
const postReportBtn = document.getElementById('postReportBtn');
const suggestionModal = document.getElementById('suggestionModal');
const reportModal = document.getElementById('reportModal');
const commentsModal = document.getElementById('commentsModal');
const suggestionForm = document.getElementById('suggestionForm');
const reportForm = document.getElementById('reportForm');
const commentForm = document.getElementById('commentForm');

const suggestionsContainer = document.getElementById('suggestionsContainer');
const reportsContainer = document.getElementById('reportsContainer');
const commentsList = document.getElementById('commentsList');

const imageUploadArea = document.getElementById('imageUploadArea');
const reportImage = document.getElementById('reportImage');
const imagePreview = document.getElementById('imagePreview');
const previewImg = document.getElementById('previewImg');
const removeImageBtn = document.getElementById('removeImage');

let currentUser = null;
let isAdmin = false;
let isOwner = false;
let uploadedImageData = null;
let timerInterval = null;
let verificationExpiresAt = null;
let allAdmins = [];

let scrollPosition = 0;

hamburgerBtn.addEventListener('click', () => {
    const isOpening = !sidebar.classList.contains('active');
    
    if (isOpening) {
        scrollPosition = window.pageYOffset;
        document.body.classList.add('menu-open');
        document.body.style.top = `-${scrollPosition}px`;
    } else {
        document.body.classList.remove('menu-open');
        document.body.style.top = '';
        window.scrollTo(0, scrollPosition);
    }
    
    hamburgerBtn.classList.toggle('active');
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
});

overlay.addEventListener('click', () => {
    hamburgerBtn.classList.remove('active');
    sidebar.classList.remove('active');
    overlay.classList.remove('active');
    document.body.classList.remove('menu-open');
    document.body.style.top = '';
    window.scrollTo(0, scrollPosition);
});

menuLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const section = link.getAttribute('data-section');
        
        hamburgerBtn.classList.remove('active');
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
        document.body.classList.remove('menu-open');
        document.body.style.top = '';
        window.scrollTo(0, scrollPosition);
        
        showSection(section);
    });
});

function showSection(sectionId) {
    contentSections.forEach(section => {
        section.classList.remove('active');
    });
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
        if (sectionId === 'suggestions') loadSuggestions();
        if (sectionId === 'reports') loadReports();
    }
}

tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const tab = btn.getAttribute('data-tab');
        commandsLists.forEach(list => {
            if (list.getAttribute('data-tab') === tab) {
                list.classList.remove('hidden');
            } else {
                list.classList.add('hidden');
            }
        });
    });
});


async function fetchStats() {
    try {
        const response = await fetch('/api/stats');
        const data = await response.json();
        document.getElementById('serverCount').textContent = data.servers || 0;
        document.getElementById('verifiedCount').textContent = data.verifiedUsers || 0;
    } catch (error) {
        console.error('Error fetching stats:', error);
    }
}

async function fetchUserProfile() {
    try {
        const response = await fetch('/api/user-profile');
        const data = await response.json();
        
        if (data.discord_id) {
            currentUser = data;
            isAdmin = data.is_admin || false;
            verificationExpiresAt = data.expires_at || null;
        }
        
        const avatarEl = document.getElementById('userAvatar');
        const nameEl = document.getElementById('userName');
        const roleIconEl = document.getElementById('userRoleIcon');
        const adminPanelLink = document.getElementById('adminPanelLink');
        const activationCard = document.getElementById('activationCard');
        const verifiedCard = document.getElementById('verifiedCard');
        
        if (data.avatar) {
            avatarEl.src = data.avatar;
            avatarEl.style.display = 'block';
        } else {
            avatarEl.src = 'https://cdn.discordapp.com/embed/avatars/0.png';
        }
        nameEl.textContent = data.username || 'Guest';
        
        // Fetch admin list to determine user's role
        try {
            const adminsResponse = await fetch('/api/admins');
            const admins = await adminsResponse.json();
            allAdmins = admins;
            
            if (currentUser && currentUser.discord_id) {
                const owner = admins.find(a => a.is_owner);
                isOwner = owner && owner.discord_id === currentUser.discord_id;
                isAdmin = admins.some(a => a.discord_id === currentUser.discord_id);
            }
        } catch (error) {
            console.error('Error fetching admins:', error);
        }
        
        // Update role icon based on user status
        if (currentUser && currentUser.discord_id) {
            if (isOwner) {
                roleIconEl.textContent = '👑';
            } else if (isAdmin) {
                roleIconEl.textContent = '⚙️';
            } else {
                roleIconEl.textContent = '👤';
            }
        } else {
            roleIconEl.textContent = '';
        }
        
        if (adminPanelLink && isAdmin) {
            adminPanelLink.style.display = 'block';
        }
        
        if (currentUser && verificationExpiresAt && activationCard && verifiedCard) {
            const now = Date.now();
            if (verificationExpiresAt > now) {
                activationCard.style.display = 'none';
                verifiedCard.style.display = 'block';
                startVerificationTimer();
            } else {
                activationCard.style.display = 'block';
                verifiedCard.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Error fetching user profile:', error);
        document.getElementById('userAvatar').src = 'https://cdn.discordapp.com/embed/avatars/0.png';
        document.getElementById('userName').textContent = 'Guest';
        document.getElementById('userRoleIcon').textContent = '';
    }
}

function startVerificationTimer() {
    if (timerInterval) clearInterval(timerInterval);
    
    function updateTimer() {
        const now = Date.now();
        const remaining = verificationExpiresAt - now;
        
        const timerDisplay = document.getElementById('verificationTimer');
        const hoursEl = document.getElementById('timerHours');
        const minutesEl = document.getElementById('timerMinutes');
        const secondsEl = document.getElementById('timerSeconds');
        
        if (remaining <= 0) {
            if (timerDisplay) timerDisplay.classList.add('timer-expired');
            if (hoursEl) hoursEl.textContent = '00';
            if (minutesEl) minutesEl.textContent = '00';
            if (secondsEl) secondsEl.textContent = '00';
            clearInterval(timerInterval);
            
            const activationCard = document.getElementById('activationCard');
            const verifiedCard = document.getElementById('verifiedCard');
            if (activationCard) activationCard.style.display = 'block';
            if (verifiedCard) verifiedCard.style.display = 'none';
            return;
        }
        
        const hours = Math.floor(remaining / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
        
        if (hoursEl) hoursEl.textContent = String(hours).padStart(2, '0');
        if (minutesEl) minutesEl.textContent = String(minutes).padStart(2, '0');
        if (secondsEl) secondsEl.textContent = String(seconds).padStart(2, '0');
    }
    
    updateTimer();
    timerInterval = setInterval(updateTimer, 1000);
}

document.querySelectorAll('.close').forEach(closeBtn => {
    closeBtn.addEventListener('click', () => {
        const modalId = closeBtn.getAttribute('data-modal');
        document.getElementById(modalId).classList.remove('active');
    });
});

window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('active');
    }
});

if (postSuggestionBtn) {
    postSuggestionBtn.addEventListener('click', () => {
        if (!currentUser) {
            alert('Please verify your Discord account first!');
            showSection('activation');
            return;
        }
        suggestionModal.classList.add('active');
    });
}

if (postReportBtn) {
    postReportBtn.addEventListener('click', () => {
        if (!currentUser) {
            alert('Please verify your Discord account first!');
            showSection('activation');
            return;
        }
        reportModal.classList.add('active');
    });
}

if (imageUploadArea) {
    imageUploadArea.addEventListener('click', () => reportImage.click());
    
    imageUploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        imageUploadArea.style.borderColor = '#667eea';
        imageUploadArea.style.background = 'rgba(102, 126, 234, 0.2)';
    });
    
    imageUploadArea.addEventListener('dragleave', () => {
        imageUploadArea.style.borderColor = 'rgba(102, 126, 234, 0.4)';
        imageUploadArea.style.background = 'rgba(102, 126, 234, 0.1)';
    });
    
    imageUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        imageUploadArea.style.borderColor = 'rgba(102, 126, 234, 0.4)';
        imageUploadArea.style.background = 'rgba(102, 126, 234, 0.1)';
        
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            handleImageUpload(file);
        }
    });
}

if (reportImage) {
    reportImage.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) handleImageUpload(file);
    });
}

function handleImageUpload(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        uploadedImageData = e.target.result;
        previewImg.src = uploadedImageData;
        imageUploadArea.style.display = 'none';
        imagePreview.style.display = 'block';
    };
    reader.readAsDataURL(file);
}

if (removeImageBtn) {
    removeImageBtn.addEventListener('click', () => {
        uploadedImageData = null;
        previewImg.src = '';
        imagePreview.style.display = 'none';
        imageUploadArea.style.display = 'block';
        reportImage.value = '';
    });
}

if (suggestionForm) {
    suggestionForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const title = document.getElementById('suggestionTitle').value;
        const description = document.getElementById('suggestionContent').value;
        
        try {
            const response = await fetch('/api/suggestions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, description })
            });
            
            if (response.ok) {
                suggestionModal.classList.remove('active');
                suggestionForm.reset();
                loadSuggestions();
            } else {
                const data = await response.json();
                alert(data.error || 'Failed to submit suggestion');
            }
        } catch (error) {
            alert('Error submitting suggestion');
        }
    });
}

if (reportForm) {
    reportForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const title = document.getElementById('reportTitle').value;
        const description = document.getElementById('reportContent').value;
        
        try {
            const response = await fetch('/api/reports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    title, 
                    description,
                    image_url: uploadedImageData 
                })
            });
            
            if (response.ok) {
                reportModal.classList.remove('active');
                reportForm.reset();
                uploadedImageData = null;
                imagePreview.style.display = 'none';
                imageUploadArea.style.display = 'block';
                loadReports();
            } else {
                const data = await response.json();
                alert(data.error || 'Failed to submit report');
            }
        } catch (error) {
            alert('Error submitting report');
        }
    });
}

async function loadSuggestions() {
    try {
        const response = await fetch('/api/suggestions');
        const suggestions = await response.json();
        
        if (suggestions.length === 0) {
            suggestionsContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-lightbulb"></i>
                    <p>No suggestions yet. Be the first to share an idea!</p>
                </div>
            `;
            return;
        }
        
        suggestionsContainer.innerHTML = suggestions.map(s => createPostCard(s, 'suggestion')).join('');
        attachPostEventListeners();
    } catch (error) {
        suggestionsContainer.innerHTML = '<p class="error">Error loading suggestions</p>';
    }
}

async function loadReports() {
    try {
        const response = await fetch('/api/reports');
        const reports = await response.json();
        
        if (reports.length === 0) {
            reportsContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-bug"></i>
                    <p>No issue reports yet. Everything seems to be working great!</p>
                </div>
            `;
            return;
        }
        
        reportsContainer.innerHTML = reports.map(r => createPostCard(r, 'report')).join('');
        attachPostEventListeners();
    } catch (error) {
        reportsContainer.innerHTML = '<p class="error">Error loading reports</p>';
    }
}

function createPostCard(post, type) {
    const date = new Date(post.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
    
    const isOwner = currentUser && currentUser.discord_id === post.discord_id;
    const canDelete = isAdmin || isOwner;
    
    return `
        <div class="post-card" data-id="${post.id}" data-type="${type}">
            <div class="post-header">
                <img src="${post.discord_avatar || 'https://cdn.discordapp.com/embed/avatars/0.png'}" 
                     alt="Avatar" class="post-avatar">
                <div class="post-user-info">
                    <div class="post-username">${escapeHtml(post.discord_username || 'Anonymous')}</div>
                    <div class="post-date">${date}</div>
                </div>
            </div>
            <div class="post-body">
                <h3 class="post-title">${escapeHtml(post.title)}</h3>
                <p class="post-description">${escapeHtml(post.description)}</p>
                ${post.image_url ? `<img src="${post.image_url}" alt="Report image" class="post-image">` : ''}
            </div>
            <div class="post-footer">
                <button class="post-action like-btn" data-id="${post.id}" data-type="${type}">
                    <i class="fas fa-thumbs-up"></i>
                    <span class="count">${post.likes || 0}</span>
                </button>
                <button class="post-action dislike-btn" data-id="${post.id}" data-type="${type}">
                    <i class="fas fa-thumbs-down"></i>
                    <span class="count">${post.dislikes || 0}</span>
                </button>
                <button class="post-action comments-btn" data-id="${post.id}" data-type="${type}">
                    <i class="fas fa-comment"></i>
                    Comments
                </button>
                ${canDelete ? `
                    <button class="post-action delete-btn" data-id="${post.id}" data-type="${type}">
                        <i class="fas fa-trash"></i>
                        Delete
                    </button>
                ` : ''}
            </div>
        </div>
    `;
}

function attachPostEventListeners() {
    document.querySelectorAll('.like-btn').forEach(btn => {
        btn.addEventListener('click', () => handleLike(btn, true));
    });
    
    document.querySelectorAll('.dislike-btn').forEach(btn => {
        btn.addEventListener('click', () => handleLike(btn, false));
    });
    
    document.querySelectorAll('.comments-btn').forEach(btn => {
        btn.addEventListener('click', () => openComments(btn.dataset.type, btn.dataset.id));
    });
    
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => handleDelete(btn.dataset.type, btn.dataset.id));
    });
}

async function handleLike(btn, isLike) {
    if (!currentUser) {
        alert('Please verify your Discord account first!');
        showSection('activation');
        return;
    }
    
    const { id, type } = btn.dataset;
    
    btn.classList.add('animating');
    setTimeout(() => btn.classList.remove('animating'), 300);
    
    try {
        const response = await fetch(`/api/${type}s/${id}/like`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_like: isLike })
        });
        
        if (response.ok) {
            if (type === 'suggestion') loadSuggestions();
            else loadReports();
        }
    } catch (error) {
        console.error('Error toggling like:', error);
    }
}

async function openComments(type, id) {
    document.getElementById('commentTargetType').value = type;
    document.getElementById('commentTargetId').value = id;
    commentsModal.classList.add('active');
    
    try {
        const response = await fetch(`/api/${type}s/${id}/comments`);
        const comments = await response.json();
        
        if (comments.length === 0) {
            commentsList.innerHTML = '<div class="no-comments">No comments yet. Be the first to comment!</div>';
        } else {
            commentsList.innerHTML = comments.map(c => createCommentItem(c)).join('');
            attachCommentDeleteListeners();
        }
    } catch (error) {
        commentsList.innerHTML = '<div class="error">Error loading comments</div>';
    }
}

function createCommentItem(comment) {
    const date = new Date(comment.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    const canDelete = isAdmin || (currentUser && currentUser.discord_id === comment.discord_id);
    
    return `
        <div class="comment-item" data-id="${comment.id}">
            <img src="${comment.discord_avatar || 'https://cdn.discordapp.com/embed/avatars/0.png'}" 
                 alt="Avatar" class="comment-avatar">
            <div class="comment-content">
                <div class="comment-header">
                    <span class="comment-username">${escapeHtml(comment.discord_username || 'Anonymous')}</span>
                    <span class="comment-date">${date}</span>
                </div>
                <p class="comment-text">${escapeHtml(comment.content)}</p>
            </div>
            ${canDelete ? `
                <button class="comment-delete" data-id="${comment.id}">
                    <i class="fas fa-times"></i>
                </button>
            ` : ''}
        </div>
    `;
}

function attachCommentDeleteListeners() {
    document.querySelectorAll('.comment-delete').forEach(btn => {
        btn.addEventListener('click', async () => {
            const commentId = btn.dataset.id;
            const type = document.getElementById('commentTargetType').value;
            const targetId = document.getElementById('commentTargetId').value;
            
            try {
                await fetch(`/api/comments/${commentId}`, { method: 'DELETE' });
                openComments(type, targetId);
            } catch (error) {
                console.error('Error deleting comment:', error);
            }
        });
    });
}

if (commentForm) {
    commentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!currentUser) {
            alert('Please verify your Discord account first!');
            return;
        }
        
        const type = document.getElementById('commentTargetType').value;
        const targetId = document.getElementById('commentTargetId').value;
        const content = document.getElementById('commentContent').value;
        
        try {
            const response = await fetch(`/api/${type}s/${targetId}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content })
            });
            
            if (response.ok) {
                document.getElementById('commentContent').value = '';
                openComments(type, targetId);
            }
        } catch (error) {
            console.error('Error posting comment:', error);
        }
    });
}

async function handleDelete(type, id) {
    if (!confirm('Are you sure you want to delete this?')) return;
    
    try {
        const response = await fetch(`/api/${type}s/${id}`, { method: 'DELETE' });
        
        if (response.ok) {
            if (type === 'suggestion') loadSuggestions();
            else loadReports();
        }
    } catch (error) {
        console.error('Error deleting:', error);
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

if (window.location.hash === '#activation') {
    showSection('activation');
}

fetchStats();
fetchUserProfile();
setInterval(fetchStats, 30000);

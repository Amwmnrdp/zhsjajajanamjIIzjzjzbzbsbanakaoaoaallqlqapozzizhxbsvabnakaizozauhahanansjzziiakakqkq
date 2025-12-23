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
        if (sectionId === 'admin') loadAdminPanel();
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
            const wasUnverified = !currentUser;
            currentUser = data;
            if (wasUnverified && !sessionStorage.getItem('verificationNotificationShown')) {
                sessionStorage.setItem('verificationNotificationShown', 'true');
                showSuccessNotification('✅ Account verification successful!');
            }
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
                roleIconEl.innerHTML = '<i class="fas fa-crown"></i>';
            } else if (isAdmin) {
                roleIconEl.innerHTML = '<i class="fas fa-cog"></i>';
            } else {
                roleIconEl.innerHTML = '<i class="fas fa-user-circle"></i>';
            }
        } else {
            roleIconEl.innerHTML = '';
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
        document.getElementById('userRoleIcon').innerHTML = '';
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
            document.getElementById('unverifiedModal').classList.add('active');
            return;
        }
        suggestionModal.classList.add('active');
    });
}

if (postReportBtn) {
    postReportBtn.addEventListener('click', () => {
        if (!currentUser) {
            document.getElementById('unverifiedModal').classList.add('active');
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
    if (file.size > 100000) {
        alert('Image size must be less than 100KB. Please compress your image and try again.');
        return;
    }
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
                if (data.error.includes('value too long')) {
                    alert('Your image is too large. Please use a smaller image (max 100KB) or reduce the description length.');
                } else {
                    alert(data.error || 'Failed to submit report');
                }
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

// Admin Panel Management
async function loadAdminPanel() {
    const adminContent = document.getElementById('adminContent');
    if (!adminContent) return;
    
    try {
        const response = await fetch('/api/user-profile');
        if (!response.ok) throw new Error('Not verified');
        
        const user = await response.json();
        if (!user.discord_id) {
            adminContent.innerHTML = '<div style="text-align: center; padding: 40px;"><i class="fas fa-lock" style="font-size: 3em; color: #ef4444; margin-bottom: 20px; display: block;"></i><h2>Account Not Verified</h2><p style="color: #a0a0a0; margin-bottom: 25px;">Please verify your Discord account first to access the admin panel.</p><a href="/auth/discord" class="btn-primary" style="display: inline-block; margin-top: 20px;">Verify with Discord</a></div>';
            return;
        }

        const adminsResponse = await fetch('/api/admins');
        const admins = await adminsResponse.json();
        
        const owner = admins.find(a => a.is_owner);
        const isOwner = owner && owner.discord_id === user.discord_id;
        const isAdmin = admins.some(a => a.discord_id === user.discord_id);

        if (!owner) {
            adminContent.innerHTML = '<div style="text-align: center; padding: 40px;"><i class="fas fa-crown" style="font-size: 3em; color: #f59e0b; margin-bottom: 20px; display: block;"></i><h2 style="color: #f59e0b;">No Owner Assigned</h2><p style="color: #a0a0a0; margin-bottom: 25px;">Be the first to claim ownership of the ProEmoji admin panel.</p><button class="btn-primary" onclick="claimAdminOwnership()" style="margin-top: 20px;"><i class="fas fa-crown"></i> Claim Ownership</button></div>';
            return;
        }

        if (!isAdmin) {
            adminContent.innerHTML = '<div style="text-align: center; padding: 40px;"><i class="fas fa-ban" style="font-size: 3em; color: #ef4444; margin-bottom: 20px; display: block;"></i><h2 style="color: #ef4444;">Access Denied</h2><p style="color: #a0a0a0;">You don\'t have permission to access the admin panel.</p></div>';
            return;
        }

        let html = '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 40px;">';
        
        if (isOwner) {
            html += `<div style="background: linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.08) 100%); border: 1px solid rgba(102, 126, 234, 0.2); border-radius: 15px; padding: 30px;">
                <h3 style="color: #667eea; margin-bottom: 20px;"><i class="fas fa-user-plus"></i> Add Administrator</h3>
                <form onsubmit="handleAddAdmin(event)" id="addAdminForm">
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; color: #e0e0e0; margin-bottom: 8px; font-weight: 600;">Discord User ID</label>
                        <input type="text" id="discordId" placeholder="Enter user ID (numbers only)" pattern="[0-9]+" inputmode="numeric" maxlength="20" required style="width: 100%; padding: 12px 16px; background: rgba(102, 126, 234, 0.1); border: 1px solid rgba(102, 126, 234, 0.3); border-radius: 8px; color: #e0e0e0; font-size: 1em; font-family: inherit;">
                    </div>
                    <button type="submit" class="btn-primary" style="width: 100%;"><i class="fas fa-plus"></i> Add Admin</button>
                    <div id="addStatus" style="margin-top: 15px;"></div>
                </form>
            </div>
            <div style="background: linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.08) 100%); border: 1px solid rgba(102, 126, 234, 0.2); border-radius: 15px; padding: 30px;">
                <h3 style="color: #667eea; margin-bottom: 20px;"><i class="fas fa-trash-alt"></i> Remove Administrator</h3>
                <p style="color: #a0a0a0; margin-bottom: 20px; font-size: 0.95em;">Click below to see and remove admins from the list.</p>
                <button class="btn-primary" onclick="showRemoveAdminModal()" style="width: 100%;"><i class="fas fa-list"></i> Select Admin to Remove</button>
            </div>`;
        }
        
        html += '</div><div style="background: linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.08) 100%); border: 1px solid rgba(102, 126, 234, 0.2); border-radius: 15px; padding: 30px;"><h3 style="color: #667eea; margin-bottom: 20px;"><i class="fas fa-users-cog"></i> Current Administrators (' + admins.length + ')</h3><div id="adminsList" class="admin-dropdown-list">';
        
        if (admins.length === 0) {
            html += '<div style="text-align: center; padding: 20px; color: #666;"><i class="fas fa-user-slash"></i> No administrators yet</div>';
        } else {
            admins.forEach(admin => {
                const avatarUrl = admin.avatar ? `https://cdn.discordapp.com/avatars/${admin.discord_id}/${admin.avatar}.png?size=256` : 'https://cdn.discordapp.com/embed/avatars/0.png';
                html += `<div class="admin-list-item">
                    <div class="admin-list-content">
                        <img src="${avatarUrl}" alt="${escapeHtml(admin.discord_username)}" class="admin-avatar" onerror="this.src='https://cdn.discordapp.com/embed/avatars/0.png'">
                        <div class="admin-info">
                            <div class="admin-name">${escapeHtml(admin.discord_username || 'Unknown')}</div>
                            <div class="admin-id-text">${admin.discord_id}</div>
                        </div>
                    </div>
                    <span class="admin-role-badge ${admin.is_owner ? 'admin-role-owner' : 'admin-role-admin'}">
                        <i class="fas ${admin.is_owner ? 'fa-crown' : 'fa-cog'}"></i> ${admin.is_owner ? 'Owner' : 'Admin'}
                    </span>
                </div>`;
            });
        }
        
        html += '</div></div>';
        adminContent.innerHTML = html;
    } catch (error) {
        adminContent.innerHTML = '<div style="text-align: center; padding: 40px;"><i class="fas fa-exclamation-triangle" style="font-size: 3em; color: #ef4444; margin-bottom: 20px; display: block;"></i><h2>Error</h2><p style="color: #a0a0a0;">Failed to load admin panel. Please try again.</p></div>';
    }
}

async function handleAddAdmin(e) {
    e.preventDefault();
    const discordId = document.getElementById('discordId').value.trim();
    const statusDiv = document.getElementById('addStatus');
    statusDiv.innerHTML = '';

    if (!/^\d+$/.test(discordId)) {
        statusDiv.innerHTML = '<div style="background: rgba(239, 68, 68, 0.2); border: 1px solid #ef4444; color: #ff6b6b; padding: 12px 15px; border-radius: 8px; display: flex; align-items: center; gap: 10px;"><i class="fas fa-exclamation-circle"></i> Invalid Discord ID format (numbers only)</div>';
        return;
    }

    statusDiv.innerHTML = '<div style="text-align: center; padding: 20px; color: #667eea;"><i class="fas fa-spinner fa-spin"></i> Verifying Discord ID...</div>';

    try {
        const verifyResponse = await fetch(`/api/verify-discord-id/${discordId}`);
        if (!verifyResponse.ok) {
            statusDiv.innerHTML = '<div style="background: rgba(239, 68, 68, 0.2); border: 1px solid #ef4444; color: #ff6b6b; padding: 12px 15px; border-radius: 8px; display: flex; align-items: center; gap: 10px;"><i class="fas fa-times-circle"></i> Discord ID not found. Please check and try again.</div>';
            return;
        }

        const discordUser = await verifyResponse.json();
        const addResponse = await fetch('/api/admins', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                discord_id: discordId,
                username: discordUser.username || 'Admin',
                avatar: discordUser.avatar || null
            })
        });

        if (addResponse.ok) {
            statusDiv.innerHTML = '<div style="background: rgba(16, 185, 129, 0.2); border: 1px solid #10b981; color: #6ee7b7; padding: 12px 15px; border-radius: 8px; display: flex; align-items: center; gap: 10px;"><i class="fas fa-check-circle"></i> Admin added successfully!</div>';
            document.getElementById('addAdminForm').reset();
            setTimeout(() => loadAdminPanel(), 1500);
        } else {
            const error = await addResponse.json();
            statusDiv.innerHTML = `<div style="background: rgba(239, 68, 68, 0.2); border: 1px solid #ef4444; color: #ff6b6b; padding: 12px 15px; border-radius: 8px; display: flex; align-items: center; gap: 10px;"><i class="fas fa-times-circle"></i> ${error.error || 'Failed to add admin'}</div>`;
        }
    } catch (error) {
        statusDiv.innerHTML = '<div style="background: rgba(239, 68, 68, 0.2); border: 1px solid #ef4444; color: #ff6b6b; padding: 12px 15px; border-radius: 8px; display: flex; align-items: center; gap: 10px;"><i class="fas fa-times-circle"></i> Error verifying Discord ID. Please try again.</div>';
    }
}

async function showRemoveAdminModal() {
    const adminsResponse = await fetch('/api/admins');
    const admins = await adminsResponse.json();
    
    const removableAdmins = admins.filter(a => !a.is_owner);
    if (removableAdmins.length === 0) {
        alert('No admins to remove');
        return;
    }
    
    let html = '';
    removableAdmins.forEach(admin => {
        const avatarUrl = admin.avatar ? `https://cdn.discordapp.com/avatars/${admin.discord_id}/${admin.avatar}.png?size=256` : 'https://cdn.discordapp.com/embed/avatars/0.png';
        html += `<div class="admin-dropdown-item">
            <div class="admin-item-content">
                <img src="${avatarUrl}" alt="${escapeHtml(admin.discord_username)}" class="admin-item-avatar" onerror="this.src='https://cdn.discordapp.com/embed/avatars/0.png'">
                <div class="admin-item-info">
                    <div class="admin-item-name">${escapeHtml(admin.discord_username || 'Unknown')}</div>
                    <div class="admin-item-id">${admin.discord_id}</div>
                </div>
            </div>
            <button type="button" class="btn-delete-admin" onclick="confirmRemoveAdmin('${admin.discord_id}', '${escapeHtml(admin.discord_username || 'Unknown')}')" title="Delete Admin">
                <i class="fas fa-trash-alt"></i>
            </button>
        </div>`;
    });
    
    document.getElementById('adminDropdownList').innerHTML = html;
    document.getElementById('removeAdminModal').classList.add('active');
}

async function confirmRemoveAdmin(discordId, username) {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content modal-error">
            <div class="error-icon"><i class="fas fa-exclamation-triangle"></i></div>
            <h2>Remove Administrator?</h2>
            <p>Are you sure you want to remove <strong>${escapeHtml(username)}</strong> as an admin?</p>
            <p style="color: #888; font-size: 0.9em; margin-top: 10px;">This action cannot be undone.</p>
            <div class="modal-buttons">
                <button class="btn-modal btn-modal-secondary" onclick="this.closest('.modal').remove()">
                    <i class="fas fa-times"></i> Cancel
                </button>
                <button class="btn-modal btn-modal-primary" onclick="performRemoveAdmin('${discordId}', this.closest('.modal'))">
                    <i class="fas fa-trash-alt"></i> Remove Admin
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

async function performRemoveAdmin(discordId, modalEl) {
    try {
        const response = await fetch(`/api/admins/${discordId}`, { method: 'DELETE' });
        if (response.ok) {
            modalEl.remove();
            document.getElementById('removeAdminModal').classList.remove('active');
            loadAdminPanel();
        } else {
            const error = await response.json();
            alert(error.error || 'Failed to remove admin');
        }
    } catch (error) {
        alert('Error removing admin');
    }
}

async function claimAdminOwnership() {
    try {
        const response = await fetch('/api/set-owner', { method: 'POST' });
        if (response.ok) {
            showSuccessNotification('You are now the owner!');
            setTimeout(() => loadAdminPanel(), 500);
        } else {
            const error = await response.json();
            alert(error.error || 'Failed to claim ownership');
        }
    } catch (error) {
        alert('Error claiming ownership');
    }
}

function closeUnverifiedModal() {
    document.getElementById('unverifiedModal').classList.remove('active');
}

function handleVerifyNow() {
    document.getElementById('unverifiedModal').classList.remove('active');
    showSection('activation');
}

function showSuccessNotification(message) {
    const notification = document.getElementById('successNotification');
    document.getElementById('notificationMessage').textContent = message;
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 5000);
}

if (window.location.hash === '#activation') {
    showSection('activation');
}

fetchStats();
fetchUserProfile();
setInterval(fetchStats, 30000);

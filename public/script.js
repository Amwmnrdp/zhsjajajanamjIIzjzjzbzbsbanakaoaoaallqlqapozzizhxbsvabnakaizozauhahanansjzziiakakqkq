// DOM Elements
const hamburgerBtn = document.getElementById('hamburgerBtn');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');
const menuLinks = document.querySelectorAll('.menu-link');
const contentSections = document.querySelectorAll('.content-section');
const tabBtns = document.querySelectorAll('.tab-btn');
const commandsLists = document.querySelectorAll('.commands-list');

// Modal Elements
const helpModal = document.getElementById('helpModal');
const suggestionModal = document.getElementById('suggestionModal');
const postHelpBtn = document.getElementById('postHelpBtn');
const postSuggestionBtn = document.getElementById('postSuggestionBtn');
const closeButtons = document.querySelectorAll('.close');
const helpForm = document.getElementById('helpForm');
const suggestionForm = document.getElementById('suggestionForm');
const helpList = document.getElementById('helpList');
const suggestionsList = document.getElementById('suggestionsList');

// Store scroll position
let scrollPosition = 0;

// Hamburger Menu Toggle
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

// Close Menu
overlay.addEventListener('click', () => {
    hamburgerBtn.classList.remove('active');
    sidebar.classList.remove('active');
    overlay.classList.remove('active');
    document.body.classList.remove('menu-open');
    document.body.style.top = '';
    window.scrollTo(0, scrollPosition);
});

// Navigation
menuLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const section = link.getAttribute('data-section');
        
        // Close menu and restore scroll
        hamburgerBtn.classList.remove('active');
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
        document.body.classList.remove('menu-open');
        document.body.style.top = '';
        window.scrollTo(0, scrollPosition);
        
        // Then show section
        showSection(section);
    });
});

function showSection(sectionId) {
    contentSections.forEach(section => {
        section.classList.remove('active');
    });
    
    const activeSection = document.getElementById(sectionId);
    if (activeSection) {
        activeSection.classList.add('active');
        activeSection.style.animation = 'none';
        setTimeout(() => {
            activeSection.style.animation = '';
        }, 10);
    }
}

// Commands Tab Switching
tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const tabName = btn.getAttribute('data-tab');
        commandsLists.forEach(list => {
            list.classList.add('hidden');
        });
        
        document.getElementById(tabName + 'Commands').classList.remove('hidden');
    });
});

// Modal Functions
function openModal(modal) {
    modal.classList.add('active');
}

function closeModal(modal) {
    modal.classList.remove('active');
}

// Help Modal
postHelpBtn.addEventListener('click', () => {
    openModal(helpModal);
});

// Suggestion Modal
postSuggestionBtn.addEventListener('click', () => {
    openModal(suggestionModal);
});

// Close Modals
closeButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.target.closest('.modal').classList.remove('active');
    });
});

window.addEventListener('click', (e) => {
    if (e.target === helpModal) closeModal(helpModal);
    if (e.target === suggestionModal) closeModal(suggestionModal);
});

// Help Form Submission
helpForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const title = document.getElementById('helpTitle').value;
    const content = document.getElementById('helpContent').value;
    
    try {
        const response = await fetch('/api/help', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, content, timestamp: new Date().toISOString() })
        });
        
        if (response.ok) {
            helpForm.reset();
            closeModal(helpModal);
            loadHelp();
            showNotification('✅ Help submitted successfully!');
        }
    } catch (error) {
        console.error('Error submitting help:', error);
        showNotification('❌ Error submitting help', true);
    }
});

// Suggestion Form Submission
suggestionForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const title = document.getElementById('suggestionTitle').value;
    const content = document.getElementById('suggestionContent').value;
    
    try {
        const response = await fetch('/api/suggestions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, content, timestamp: new Date().toISOString() })
        });
        
        if (response.ok) {
            suggestionForm.reset();
            closeModal(suggestionModal);
            loadSuggestions();
            showNotification('✅ Suggestion submitted successfully!');
        }
    } catch (error) {
        console.error('Error submitting suggestion:', error);
        showNotification('❌ Error submitting suggestion', true);
    }
});

// Load Help Posts
async function loadHelp() {
    try {
        const response = await fetch('/api/help');
        const helps = await response.json();
        
        helpList.innerHTML = '';
        helps.forEach(help => {
            const div = document.createElement('div');
            div.className = 'help-item';
            div.innerHTML = `
                <h4>${escapeHtml(help.title)}</h4>
                <p>${escapeHtml(help.content)}</p>
                <small style="color: #666; margin-top: 10px; display: block;">${new Date(help.timestamp).toLocaleDateString()}</small>
            `;
            helpList.appendChild(div);
        });
    } catch (error) {
        console.error('Error loading help:', error);
    }
}

// Load Suggestions
async function loadSuggestions() {
    try {
        const response = await fetch('/api/suggestions');
        const suggestions = await response.json();
        
        suggestionsList.innerHTML = '';
        suggestions.forEach(suggestion => {
            const div = document.createElement('div');
            div.className = 'suggestion-item';
            div.innerHTML = `
                <h4>${escapeHtml(suggestion.title)}</h4>
                <p>${escapeHtml(suggestion.content)}</p>
                <small style="color: #666; margin-top: 10px; display: block;">${new Date(suggestion.timestamp).toLocaleDateString()}</small>
            `;
            suggestionsList.appendChild(div);
        });
    } catch (error) {
        console.error('Error loading suggestions:', error);
    }
}

// Load Server Count and Verified Users
async function loadServerCount() {
    try {
        const response = await fetch('/api/stats');
        const stats = await response.json();
        document.getElementById('serverCount').textContent = stats.servers;
        document.getElementById('verifiedCount').textContent = stats.verifiedUsers || 0;
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Verification Timer Management
const VERIFICATION_DURATION = 5 * 60 * 60 * 1000; // 5 hours in milliseconds

function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours}h ${minutes}m ${seconds}s`;
}

function updateVerificationStatus() {
    const activateBtn = document.getElementById('activateBtn');
    if (!activateBtn) return;

    const verifiedTime = localStorage.getItem('proemoji_verified_time');
    if (!verifiedTime) {
        activateBtn.disabled = false;
        activateBtn.style.opacity = '1';
        activateBtn.style.cursor = 'pointer';
        activateBtn.textContent = '🔗 Activate Your Account';
        const timerDiv = document.getElementById('verificationTimer');
        if (timerDiv) timerDiv.remove();
        const resetBtn = document.getElementById('resetBtn');
        if (resetBtn) resetBtn.remove();
        return;
    }

    const verifiedAt = parseInt(verifiedTime);
    const expiresAt = verifiedAt + VERIFICATION_DURATION;
    const now = Date.now();

    if (now > expiresAt) {
        localStorage.removeItem('proemoji_verified_time');
        localStorage.removeItem('proemoji_user_profile');
        resetUserProfile();
        updateVerificationStatus();
        return;
    }

    activateBtn.disabled = true;
    activateBtn.style.opacity = '0.6';
    activateBtn.style.cursor = 'not-allowed';

    // Add reset button if not already there
    if (!document.getElementById('resetBtn')) {
        const resetBtn = document.createElement('button');
        resetBtn.id = 'resetBtn';
        resetBtn.textContent = 'Reset Verification';
        resetBtn.style.cssText = `
            display: block;
            margin-top: 15px;
            margin-left: auto;
            margin-right: auto;
            background: rgba(239, 68, 68, 0.2);
            color: #ef4444;
            border: 1px solid rgba(239, 68, 68, 0.3);
            padding: 10px 20px;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.3s ease;
        `;
        resetBtn.addEventListener('mouseenter', () => {
            resetBtn.style.background = 'rgba(239, 68, 68, 0.3)';
        });
        resetBtn.addEventListener('mouseleave', () => {
            resetBtn.style.background = 'rgba(239, 68, 68, 0.2)';
        });
        resetBtn.addEventListener('click', () => {
            localStorage.removeItem('proemoji_verified_time');
            localStorage.removeItem('proemoji_user_profile');
            resetUserProfile();
            updateVerificationStatus();
        });
        activateBtn.parentElement.appendChild(resetBtn);
    }

    let timerDiv = document.getElementById('verificationTimer');
    if (!timerDiv) {
        timerDiv = document.createElement('div');
        timerDiv.id = 'verificationTimer';
        timerDiv.style.cssText = `
            text-align: center;
            margin-top: 20px;
            padding: 15px;
            background: rgba(16, 185, 129, 0.1);
            border: 2px solid rgba(16, 185, 129, 0.3);
            border-radius: 10px;
            color: #10b981;
            font-weight: 600;
            font-size: 1.1em;
        `;
        activateBtn.parentElement.appendChild(timerDiv);
    }

    const remainingTime = expiresAt - now;
    timerDiv.textContent = `✅ Verified! Expires in: ${formatTime(remainingTime)}`;

    const interval = setInterval(() => {
        const now = Date.now();
        const remainingTime = expiresAt - now;

        if (remainingTime <= 0) {
            clearInterval(interval);
            localStorage.removeItem('proemoji_verified_time');
            localStorage.removeItem('proemoji_user_profile');
            resetUserProfile();
            updateVerificationStatus();
            return;
        }

        timerDiv.textContent = `✅ Verified! Expires in: ${formatTime(remainingTime)}`;
    }, 1000);
}

// Activate Account Button
const activateBtn = document.getElementById('activateBtn');
if (activateBtn) {
    activateBtn.addEventListener('click', () => {
        window.location.href = '/auth/discord';
    });
    
    // Check verification status on page load
    updateVerificationStatus();
}

// Show Notification
function showNotification(message, isError = false) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: ${isError ? '#ff4444' : '#10b981'};
        color: white;
        padding: 15px 25px;
        border-radius: 8px;
        z-index: 3000;
        animation: slideUp 0.3s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Scroll Animation
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.animation = 'fadeInUp 0.6s ease forwards';
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

document.querySelectorAll('.feature-card, .command, .lang-badge, .stat-card').forEach(el => {
    observer.observe(el);
});

// Load User Profile from localStorage
function loadUserProfile() {
    const userAvatar = document.getElementById('userAvatar');
    const userName = document.getElementById('userName');
    
    if (!userAvatar || !userName) return;
    
    const userProfileStr = localStorage.getItem('proemoji_user_profile');
    const verifiedTime = localStorage.getItem('proemoji_verified_time');
    
    if (userProfileStr && verifiedTime) {
        try {
            const user = JSON.parse(userProfileStr);
            userAvatar.src = user.avatar;
            userName.textContent = user.username;
            userAvatar.style.display = 'block';
        } catch (e) {
            console.log('Error loading user profile');
            resetUserProfile();
        }
    } else {
        resetUserProfile();
    }
}

function resetUserProfile() {
    const userAvatar = document.getElementById('userAvatar');
    const userName = document.getElementById('userName');
    
    if (userAvatar) {
        userAvatar.src = 'https://cdn.discordapp.com/embed/avatars/0.png';
    }
    if (userName) {
        userName.textContent = 'Guest';
    }
}

// Initialize
window.addEventListener('load', () => {
    loadHelp();
    loadSuggestions();
    loadServerCount();
    loadUserProfile();
    
    // Refresh stats every 30 seconds
    setInterval(loadServerCount, 30000);
});

console.log('✅ ProEmoji Dashboard loaded!');

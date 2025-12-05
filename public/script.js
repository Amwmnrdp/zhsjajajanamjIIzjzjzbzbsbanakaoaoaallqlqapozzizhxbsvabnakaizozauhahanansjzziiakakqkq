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

// Hamburger Menu Toggle
hamburgerBtn.addEventListener('click', () => {
    hamburgerBtn.classList.toggle('active');
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
});

// Close Menu
overlay.addEventListener('click', () => {
    hamburgerBtn.classList.remove('active');
    sidebar.classList.remove('active');
    overlay.classList.remove('active');
});

// Navigation
menuLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const section = link.getAttribute('data-section');
        showSection(section);
        
        // Close menu
        hamburgerBtn.classList.remove('active');
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
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

// Activate Account Button
const activateBtn = document.getElementById('activateBtn');
if (activateBtn) {
    activateBtn.addEventListener('click', () => {
        window.location.href = '/auth/discord';
    });
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

// Initialize
window.addEventListener('load', () => {
    loadHelp();
    loadSuggestions();
    loadServerCount();
    
    // Refresh stats every 30 seconds
    setInterval(loadServerCount, 30000);
});

console.log('✅ ProEmoji Bot Dashboard loaded!');

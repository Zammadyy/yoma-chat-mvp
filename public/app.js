// ── Yoma Chat — Client Application v3 ───────────────────────────
// ══════════════════════════════════════════════════════════════════
// INTERESTS DATA
// ══════════════════════════════════════════════════════════════════
const INTERESTS = [
    { name: 'Gaming', icon: '🎮' },
    { name: 'Music', icon: '🎵' },
    { name: 'Movies', icon: '🎬' },
    { name: 'Reading', icon: '📚' },
    { name: 'Travel', icon: '✈️' },
    { name: 'Cooking', icon: '🍳' },
    { name: 'Photography', icon: '📸' },
    { name: 'Art', icon: '🎨' },
    { name: 'Sports', icon: '⚽' },
    { name: 'Fitness', icon: '💪' },
    { name: 'Yoga', icon: '🧘' },
    { name: 'Dancing', icon: '💃' },
    { name: 'Coding', icon: '💻' },
    { name: 'Design', icon: '✏️' },
    { name: 'Writing', icon: '✍️' },
    { name: 'Fashion', icon: '👗' },
    { name: 'Nature', icon: '🌿' },
    { name: 'Pets', icon: '🐾' },
    { name: 'Cars', icon: '🚗' },
    { name: 'Science', icon: '🔬' },
    { name: 'History', icon: '📜' },
    { name: 'Languages', icon: '🗣️' },
    { name: 'Anime', icon: '🎌' },
    { name: 'Comics', icon: '📖' },
    { name: 'Podcasts', icon: '🎙️' },
    { name: 'Investing', icon: '📈' },
    { name: 'Crypto', icon: '🪙' },
    { name: 'Startups', icon: '🚀' },
    { name: 'Meditation', icon: '🧠' },
    { name: 'Volunteering', icon: '🤝' },
    { name: 'Theater', icon: '🎭' },
    { name: 'Hiking', icon: '🥾' },
    { name: 'Cycling', icon: '🚴' },
    { name: 'Swimming', icon: '🏊' },
    { name: 'Chess', icon: '♟️' },
    { name: 'Board Games', icon: '🎲' },
    { name: 'DIY', icon: '🔧' },
    { name: 'Gardening', icon: '🌱' },
    { name: 'Astrology', icon: '⭐' },
    { name: 'Streaming', icon: '📺' }
];

// ══════════════════════════════════════════════════════════════════
// STATE
// ══════════════════════════════════════════════════════════════════
let currentUser = null;
let selectedInterests = [];
let selectedCountry = null;
let localStream = null;
let peerConnection = null;
let isConnected = false;
let currentPeerId = null;
let isMicMuted = false;
let isCamOff = false;
let typingTimeout = null;
let isTyping = false;

// ══════════════════════════════════════════════════════════════════
// THEME MANAGEMENT
// ══════════════════════════════════════════════════════════════════
function initTheme() {
    const saved = localStorage.getItem('yoma-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('yoma-theme', next);
}

initTheme();

// ══════════════════════════════════════════════════════════════════
// AUTH FLOW
// ══════════════════════════════════════════════════════════════════
const authScreen = document.getElementById('authScreen');
const chatApp = document.getElementById('chatApp');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const tabLogin = document.getElementById('tabLogin');
const tabSignup = document.getElementById('tabSignup');
const authTabs = document.querySelector('.auth-tabs');
const loginError = document.getElementById('loginError');
const signupError = document.getElementById('signupError');

// Tab switching
tabLogin.addEventListener('click', () => {
    tabLogin.classList.add('active');
    tabSignup.classList.remove('active');
    authTabs.setAttribute('data-active', 'login');
    loginForm.classList.remove('hidden');
    signupForm.classList.add('hidden');
    loginError.textContent = '';
});

tabSignup.addEventListener('click', () => {
    tabSignup.classList.add('active');
    tabLogin.classList.remove('active');
    authTabs.setAttribute('data-active', 'signup');
    signupForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
    signupError.textContent = '';
});

// Build interest tags in signup form
const interestsGrid = document.getElementById('interestsGrid');
INTERESTS.forEach(interest => {
    const tag = document.createElement('div');
    tag.className = 'interest-tag';
    tag.innerHTML = `<span class="tag-icon">${interest.icon}</span> ${interest.name}`;
    tag.addEventListener('click', () => {
        if (tag.classList.contains('selected')) {
            tag.classList.remove('selected');
            selectedInterests = selectedInterests.filter(i => i !== interest.name);
        } else {
            if (selectedInterests.length >= 10) {
                showToast('Maximum 10 interests allowed', 'warning');
                return;
            }
            tag.classList.add('selected');
            selectedInterests.push(interest.name);
        }
    });
    interestsGrid.appendChild(tag);
});

// Build country dropdown
const countryDisplay = document.getElementById('countryDisplay');
const countryDropdown = document.getElementById('countryDropdown');
const countrySearch = document.getElementById('countrySearch');
const countryList = document.getElementById('countryList');
const countrySelector = document.getElementById('countrySelector');

function renderCountryList(filter = '') {
    countryList.innerHTML = '';
    const filtered = COUNTRIES.filter(c =>
        c.name.toLowerCase().includes(filter.toLowerCase())
    );
    filtered.forEach(country => {
        const item = document.createElement('div');
        item.className = 'country-item';
        item.innerHTML = `<span class="flag">${country.flag}</span><span class="name">${country.name}</span>`;
        item.addEventListener('click', () => {
            selectCountry(country);
        });
        countryList.appendChild(item);
    });
}

function selectCountry(country) {
    selectedCountry = country;
    countryDisplay.innerHTML = `<span class="country-selected-flag">${country.flag}</span><span class="country-selected-name">${country.name}</span>`;
    countryDisplay.classList.add('active');
    document.getElementById('selectedCountryCode').value = country.code;
    document.getElementById('selectedCountryName').value = country.name;
    document.getElementById('selectedCountryFlag').value = country.flag;
    closeCountryDropdown();
}

function openCountryDropdown() {
    countryDropdown.classList.remove('hidden');
    countryDisplay.classList.add('active');
    countrySearch.value = '';
    countrySearch.focus();
    renderCountryList();
}

function closeCountryDropdown() {
    countryDropdown.classList.add('hidden');
    if (!selectedCountry) countryDisplay.classList.remove('active');
}

countryDisplay.addEventListener('click', (e) => {
    e.stopPropagation();
    if (countryDropdown.classList.contains('hidden')) {
        openCountryDropdown();
    } else {
        closeCountryDropdown();
    }
});

countrySearch.addEventListener('input', (e) => {
    renderCountryList(e.target.value);
});

countrySearch.addEventListener('click', (e) => e.stopPropagation());

document.addEventListener('click', (e) => {
    if (!countrySelector.contains(e.target)) {
        closeCountryDropdown();
    }
});

renderCountryList();

// Login
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.textContent = '';
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    const btn = document.getElementById('loginBtn');
    btn.disabled = true;
    btn.querySelector('span').textContent = 'Logging in...';

    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (!res.ok) {
            loginError.textContent = data.error || 'Login failed';
            return;
        }
        currentUser = data.user;
        enterChat();
    } catch (err) {
        loginError.textContent = 'Network error. Please try again.';
    } finally {
        btn.disabled = false;
        btn.querySelector('span').textContent = 'Log In';
    }
});

// Signup
signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    signupError.textContent = '';

    const email = document.getElementById('signupEmail').value.trim();
    const displayName = document.getElementById('signupDisplayName').value.trim();
    const password = document.getElementById('signupPassword').value;
    const gender = document.querySelector('input[name="gender"]:checked')?.value;

    if (!gender) {
        signupError.textContent = 'Please select your gender';
        return;
    }
    if (!selectedCountry) {
        signupError.textContent = 'Please select your country';
        return;
    }

    const btn = document.getElementById('signupBtn');
    btn.disabled = true;
    btn.querySelector('span').textContent = 'Creating account...';

    try {
        const res = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email,
                password,
                displayName,
                gender,
                country: {
                    code: selectedCountry.code,
                    name: selectedCountry.name,
                    flag: selectedCountry.flag
                },
                interests: selectedInterests
            })
        });
        const data = await res.json();
        if (!res.ok) {
            signupError.textContent = data.error || 'Registration failed';
            return;
        }
        currentUser = data.user;
        enterChat();
    } catch (err) {
        signupError.textContent = 'Network error. Please try again.';
    } finally {
        btn.disabled = false;
        btn.querySelector('span').textContent = 'Create Account';
    }
});

// Check if already logged in
async function checkAuth() {
    try {
        const res = await fetch('/api/me');
        if (res.ok) {
            const data = await res.json();
            currentUser = data.user;
            enterChat();
        }
    } catch (e) {
        // Not logged in
    }
}

async function enterChat() {
    authScreen.classList.add('hidden');
    chatApp.classList.remove('hidden');
    await fetchTurnCredentials();
    initSocket();
    startMedia();
}

checkAuth();

// ══════════════════════════════════════════════════════════════════
// SOCKET CONNECTION (deferred until auth)
// ══════════════════════════════════════════════════════════════════
let socket = null;

function initSocket() {
    socket = io();

    socket.on('connect', () => {
        console.log('Connected to server:', socket.id);
        // Send profile to server for matching
        socket.emit('auth-profile', currentUser ? {
            displayName: currentUser.displayName,
            gender: currentUser.gender,
            country: currentUser.country,
            interests: currentUser.interests
        } : null);
    });

    socket.on('waiting', () => {
        setStatus('searching', 'Looking for someone...', 'Finding someone who shares your interests');
    });

    socket.on('online-count', (count) => {
        onlineCountEl.textContent = count;
    });

    socket.on('paired', async ({ isInitiator, peerId, peerProfile, commonInterests }) => {
        console.log(`Paired! Initiator: ${isInitiator}, Peer: ${peerId}`);
        currentPeerId = peerId;

        clearChat();
        playMatchSound();
        showPeerProfile(peerProfile, commonInterests);
        setStatus('searching', 'Connecting...', 'Establishing peer-to-peer connection');

        createPeerConnection();

        if (isInitiator) {
            try {
                const offer = await peerConnection.createOffer();
                await peerConnection.setLocalDescription(offer);
                socket.emit('signal', { type: 'offer', offer });
            } catch (err) {
                console.error('Error creating offer:', err);
                showToast('Failed to create connection. Trying next...', 'error');
            }
        }
    });

    socket.on('signal', async (data) => {
        if (!peerConnection) return;

        try {
            if (data.type === 'offer') {
                await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
                const answer = await peerConnection.createAnswer();
                await peerConnection.setLocalDescription(answer);
                socket.emit('signal', { type: 'answer', answer });
            } else if (data.type === 'answer') {
                await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
            } else if (data.type === 'ice') {
                await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
            }
        } catch (err) {
            console.error('Signaling error:', err);
        }
    });

    socket.on('peer-disconnected', ({ reason }) => {
        cleanupConnection();
        playDisconnectSound();
        hidePeerProfile();

        if (reason === 'skipped') {
            showToast('Stranger has left the chat', 'info');
            addMessage('Stranger has disconnected.');
        } else {
            showToast('Stranger disconnected', 'warning');
            addMessage('Stranger has disconnected.');
        }

        setStatus('disconnected', 'Stranger left', 'Click Next to find someone new');
    });

    socket.on('chat-message', (data) => {
        addMessage(data.text, 'received');
        playMessageSound();
        hideTypingIndicator();
    });

    socket.on('typing', (peerIsTyping) => {
        if (peerIsTyping) {
            showTypingIndicator();
        } else {
            hideTypingIndicator();
        }
    });

    socket.on('report-confirmed', () => {
        console.log('Report confirmed by server.');
    });
}

// ══════════════════════════════════════════════════════════════════
// DOM ELEMENTS
// ══════════════════════════════════════════════════════════════════
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const statusOverlay = document.getElementById('statusOverlay');
const statusText = document.getElementById('statusText');
const statusSubtext = document.getElementById('statusSubtext');
const statusSpinner = document.getElementById('statusSpinner');
const statusIcon = document.getElementById('statusIcon');
const connectionBadge = document.getElementById('connectionBadge');
const badgeText = document.getElementById('badgeText');

const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const btnSend = document.getElementById('btnSend');
const btnNext = document.getElementById('btnNext');
const btnReport = document.getElementById('btnReport');
const btnChatToggle = document.getElementById('btnChatToggle');
const chatSidebar = document.getElementById('chatSidebar');
const typingIndicator = document.getElementById('typingIndicator');
const onlineCountEl = document.getElementById('onlineCount');

const btnMic = document.getElementById('btnMic');
const btnCam = document.getElementById('btnCam');
const themeToggleBtn = document.getElementById('themeToggle');

const reportModal = document.getElementById('reportModal');
const btnCancelReport = document.getElementById('btnCancelReport');
const btnSubmitReport = document.getElementById('btnSubmitReport');
const toastContainer = document.getElementById('toastContainer');
const localVideoWrapper = document.getElementById('localVideoWrapper');

const profileModal = document.getElementById('profileModal');
const profileBtn = document.getElementById('profileBtn');
const closeProfileModalBtn = document.getElementById('closeProfileModal');
const btnLogout = document.getElementById('btnLogout');

const peerBadge = document.getElementById('peerBadge');
const peerFlag = document.getElementById('peerFlag');
const peerName = document.getElementById('peerName');
const peerGenderIcon = document.getElementById('peerGenderIcon');
const peerCommonInterests = document.getElementById('peerCommonInterests');

// ══════════════════════════════════════════════════════════════════
// THEME TOGGLE
// ══════════════════════════════════════════════════════════════════
themeToggleBtn.addEventListener('click', toggleTheme);

// ══════════════════════════════════════════════════════════════════
// PROFILE MODAL
// ══════════════════════════════════════════════════════════════════
profileBtn.addEventListener('click', () => {
    if (!currentUser) return;

    document.getElementById('profileAvatar').textContent = currentUser.displayName.charAt(0).toUpperCase();
    document.getElementById('profileName').textContent = currentUser.displayName;

    const meta = document.getElementById('profileMeta');
    meta.innerHTML = `
        <span class="profile-meta-item">${currentUser.country.flag} ${currentUser.country.name}</span>
        <span class="profile-meta-item">${currentUser.gender === 'male' ? '♂️' : '♀️'} ${currentUser.gender.charAt(0).toUpperCase() + currentUser.gender.slice(1)}</span>
    `;

    const interestsList = document.getElementById('profileInterests');
    interestsList.innerHTML = '';
    if (currentUser.interests.length > 0) {
        currentUser.interests.forEach(interest => {
            const pill = document.createElement('span');
            pill.className = 'profile-interest-pill';
            const found = INTERESTS.find(i => i.name === interest);
            pill.textContent = found ? `${found.icon} ${interest}` : interest;
            interestsList.appendChild(pill);
        });
    }

    profileModal.classList.add('active');
});

closeProfileModalBtn.addEventListener('click', () => {
    profileModal.classList.remove('active');
});

profileModal.addEventListener('click', (e) => {
    if (e.target === profileModal) {
        profileModal.classList.remove('active');
    }
});

// Logout
btnLogout.addEventListener('click', async () => {
    try {
        await fetch('/api/logout', { method: 'POST' });
    } catch (e) { /* ignore */ }

    currentUser = null;
    if (socket) socket.disconnect();
    cleanupConnection();

    profileModal.classList.remove('active');
    chatApp.classList.add('hidden');
    authScreen.classList.remove('hidden');

    // Reset forms
    loginForm.reset();
    signupForm.reset();
    selectedInterests = [];
    selectedCountry = null;
    document.querySelectorAll('.interest-tag.selected').forEach(t => t.classList.remove('selected'));
    countryDisplay.innerHTML = '<span class="country-placeholder">Select your country</span>';
});

// ══════════════════════════════════════════════════════════════════
// PEER PROFILE BADGE
// ══════════════════════════════════════════════════════════════════
function showPeerProfile(profile, commonInterests) {
    if (!profile) {
        hidePeerProfile();
        return;
    }

    peerFlag.textContent = profile.country?.flag || '';
    peerName.textContent = profile.displayName || 'Stranger';
    peerGenderIcon.textContent = profile.gender === 'male' ? '♂️' : '♀️';

    peerBadge.classList.remove('hidden');

    // Show common interests
    if (commonInterests && commonInterests.length > 0) {
        peerCommonInterests.innerHTML = '';
        commonInterests.forEach((interest, idx) => {
            const tag = document.createElement('span');
            tag.className = 'common-interest-tag';
            tag.style.animationDelay = `${idx * 0.1}s`;
            const found = INTERESTS.find(i => i.name === interest);
            tag.textContent = found ? `${found.icon} ${interest}` : interest;
            peerCommonInterests.appendChild(tag);
        });
        peerCommonInterests.classList.remove('hidden');

        // System message for common interests
        addMessage(`🎯 You share ${commonInterests.length} interest${commonInterests.length > 1 ? 's' : ''}: ${commonInterests.join(', ')}`);
    } else {
        peerCommonInterests.classList.add('hidden');
    }
}

function hidePeerProfile() {
    peerBadge.classList.add('hidden');
    peerCommonInterests.classList.add('hidden');
}

// ══════════════════════════════════════════════════════════════════
// ICE CONFIGURATION
// ══════════════════════════════════════════════════════════════════
let iceConfig = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

async function fetchTurnCredentials() {
    try {
        const res = await fetch('/api/turn');
        if (res.ok) {
            const data = await res.json();
            if (data.url && data.username && data.credential) {
                iceConfig.iceServers.push({
                    urls: data.url,
                    username: data.username,
                    credential: data.credential
                });
                if (data.url.startsWith('turn:')) {
                    iceConfig.iceServers.push({
                        urls: data.url.replace('turn:', 'turns:'),
                        username: data.username,
                        credential: data.credential
                    });
                }
            }
        }
    } catch (e) {
        console.error('Failed to fetch TURN credentials', e);
    }
}

// ══════════════════════════════════════════════════════════════════
// SOUND EFFECTS
// ══════════════════════════════════════════════════════════════════
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function getAudioCtx() {
    if (!audioCtx) audioCtx = new AudioCtx();
    return audioCtx;
}

function playTone(freq, duration, type = 'sine', volume = 0.15) {
    try {
        const ctx = getAudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(volume, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + duration);
    } catch (e) { /* audio not available */ }
}

function playMatchSound() {
    playTone(523, 0.15, 'sine', 0.12);
    setTimeout(() => playTone(659, 0.15, 'sine', 0.12), 120);
    setTimeout(() => playTone(784, 0.25, 'sine', 0.1), 240);
}

function playMessageSound() {
    playTone(880, 0.08, 'sine', 0.06);
    setTimeout(() => playTone(1100, 0.1, 'sine', 0.05), 60);
}

function playDisconnectSound() {
    playTone(440, 0.2, 'triangle', 0.1);
    setTimeout(() => playTone(330, 0.3, 'triangle', 0.08), 150);
}

// ══════════════════════════════════════════════════════════════════
// SVG ICONS
// ══════════════════════════════════════════════════════════════════
const SVG_MIC = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>`;
const SVG_MIC_OFF = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2c0 .8-.13 1.58-.39 2.3"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>`;
const SVG_CAM = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>`;
const SVG_CAM_OFF = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3m3-3h6l2 3h4a2 2 0 0 1 2 2v9.34m-7.72-2.06a4 4 0 1 1-5.56-5.56"/></svg>`;

// ══════════════════════════════════════════════════════════════════
// UI HELPERS
// ══════════════════════════════════════════════════════════════════
function setStatus(state, text, subtext) {
    statusText.textContent = text;
    statusSubtext.textContent = subtext || '';

    if (state === 'searching') {
        statusOverlay.classList.remove('hidden');
        statusSpinner.style.display = 'block';
        statusIcon.style.display = 'none';
        setBadge('searching', 'Searching');
        setChatEnabled(false);
        hideTypingIndicator();
    } else if (state === 'connected') {
        statusOverlay.classList.add('hidden');
        setBadge('connected', 'Connected');
        setChatEnabled(true);
    } else if (state === 'error') {
        statusOverlay.classList.remove('hidden');
        statusSpinner.style.display = 'none';
        statusIcon.style.display = 'flex';
        statusIcon.innerHTML = `<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="#ff4757" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
        setBadge('disconnected', 'Error');
        setChatEnabled(false);
    } else if (state === 'disconnected') {
        statusOverlay.classList.remove('hidden');
        statusSpinner.style.display = 'none';
        statusIcon.style.display = 'flex';
        statusIcon.innerHTML = `<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="#a29bfe" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`;
        setBadge('disconnected', 'Disconnected');
        setChatEnabled(false);
        hideTypingIndicator();
    }
}

function setBadge(type, text) {
    connectionBadge.className = `connection-badge ${type}`;
    badgeText.textContent = text;
}

function setChatEnabled(enabled) {
    chatInput.disabled = !enabled;
    btnSend.disabled = !enabled;
    chatInput.placeholder = enabled ? 'Type a message...' : 'Connect to start chatting...';
}

function addMessage(text, type = 'system') {
    const div = document.createElement('div');
    div.className = `message ${type}`;

    if (type === 'sent' || type === 'received') {
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        div.innerHTML = `${escapeHtml(text)}<span class="timestamp">${time}</span>`;
    } else {
        div.textContent = text;
    }

    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function clearChat() {
    chatMessages.innerHTML = '';
    addMessage('You\'ve been matched with a new stranger. Say hi! 👋');
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);

    setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 3000);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ══════════════════════════════════════════════════════════════════
// RIPPLE EFFECT
// ══════════════════════════════════════════════════════════════════
function addRipple(e, btn) {
    const rect = btn.getBoundingClientRect();
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    const size = Math.max(rect.width, rect.height);
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
    ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
}

document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn');
    if (btn) addRipple(e, btn);
});

// ══════════════════════════════════════════════════════════════════
// MEDIA
// ══════════════════════════════════════════════════════════════════
async function startMedia() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        });
        localVideo.srcObject = localStream;
        setStatus('searching', 'Looking for someone...', 'Finding someone who shares your interests');
    } catch (err) {
        console.error('Error accessing media devices:', err);
        setStatus('error', 'Camera access denied', 'Please allow camera & microphone permissions and refresh');
    }
}

// ══════════════════════════════════════════════════════════════════
// MEDIA TOGGLES
// ══════════════════════════════════════════════════════════════════
function toggleMic() {
    if (!localStream) return;
    const audioTrack = localStream.getAudioTracks()[0];
    if (!audioTrack) return;

    isMicMuted = !isMicMuted;
    audioTrack.enabled = !isMicMuted;
    btnMic.innerHTML = isMicMuted ? SVG_MIC_OFF : SVG_MIC;
    btnMic.classList.toggle('muted', isMicMuted);
    showToast(isMicMuted ? 'Microphone muted' : 'Microphone unmuted', 'info');
}

function toggleCamera() {
    if (!localStream) return;
    const videoTrack = localStream.getVideoTracks()[0];
    if (!videoTrack) return;

    isCamOff = !isCamOff;
    videoTrack.enabled = !isCamOff;
    btnCam.innerHTML = isCamOff ? SVG_CAM_OFF : SVG_CAM;
    btnCam.classList.toggle('muted', isCamOff);
    showToast(isCamOff ? 'Camera turned off' : 'Camera turned on', 'info');
}

btnMic.addEventListener('click', toggleMic);
btnCam.addEventListener('click', toggleCamera);

// ══════════════════════════════════════════════════════════════════
// TYPING INDICATOR
// ══════════════════════════════════════════════════════════════════
function showTypingIndicator() {
    typingIndicator.classList.add('visible');
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function hideTypingIndicator() {
    typingIndicator.classList.remove('visible');
}

function handleTyping() {
    if (!isConnected || !socket) return;

    if (!isTyping) {
        isTyping = true;
        socket.emit('typing', true);
    }

    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        isTyping = false;
        socket.emit('typing', false);
    }, 1000);
}

// ══════════════════════════════════════════════════════════════════
// DRAGGABLE PiP
// ══════════════════════════════════════════════════════════════════
let isDragging = false;
let dragStartX, dragStartY, pipStartX, pipStartY;

function startDrag(clientX, clientY) {
    isDragging = true;
    localVideoWrapper.classList.add('dragging');
    dragStartX = clientX;
    dragStartY = clientY;
    const rect = localVideoWrapper.getBoundingClientRect();
    pipStartX = rect.left;
    pipStartY = rect.top;
}

function moveDrag(clientX, clientY) {
    if (!isDragging) return;
    const dx = clientX - dragStartX;
    const dy = clientY - dragStartY;

    const parentRect = localVideoWrapper.parentElement.getBoundingClientRect();
    const pipRect = localVideoWrapper.getBoundingClientRect();

    let newLeft = pipStartX - parentRect.left + dx;
    let newTop = pipStartY - parentRect.top + dy;

    newLeft = Math.max(8, Math.min(newLeft, parentRect.width - pipRect.width - 8));
    newTop = Math.max(8, Math.min(newTop, parentRect.height - pipRect.height - 8));

    localVideoWrapper.style.left = newLeft + 'px';
    localVideoWrapper.style.top = newTop + 'px';
    localVideoWrapper.style.right = 'auto';
    localVideoWrapper.style.bottom = 'auto';
}

function endDrag() {
    if (!isDragging) return;
    isDragging = false;
    localVideoWrapper.classList.remove('dragging');

    const parentRect = localVideoWrapper.parentElement.getBoundingClientRect();
    const pipRect = localVideoWrapper.getBoundingClientRect();
    const centerX = pipRect.left - parentRect.left + pipRect.width / 2;
    const centerY = pipRect.top - parentRect.top + pipRect.height / 2;
    const midX = parentRect.width / 2;
    const midY = parentRect.height / 2;

    const margin = 16;
    localVideoWrapper.style.transition = 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';

    if (centerX < midX && centerY < midY) {
        localVideoWrapper.style.left = margin + 'px';
        localVideoWrapper.style.top = (60 + margin) + 'px';
        localVideoWrapper.style.right = 'auto';
        localVideoWrapper.style.bottom = 'auto';
    } else if (centerX >= midX && centerY < midY) {
        localVideoWrapper.style.right = margin + 'px';
        localVideoWrapper.style.top = (60 + margin) + 'px';
        localVideoWrapper.style.left = 'auto';
        localVideoWrapper.style.bottom = 'auto';
    } else if (centerX < midX && centerY >= midY) {
        localVideoWrapper.style.left = margin + 'px';
        localVideoWrapper.style.bottom = '100px';
        localVideoWrapper.style.right = 'auto';
        localVideoWrapper.style.top = 'auto';
    } else {
        localVideoWrapper.style.right = '24px';
        localVideoWrapper.style.bottom = '100px';
        localVideoWrapper.style.left = 'auto';
        localVideoWrapper.style.top = 'auto';
    }

    setTimeout(() => {
        localVideoWrapper.style.transition = '';
    }, 300);
}

localVideoWrapper.addEventListener('mousedown', (e) => {
    e.preventDefault();
    startDrag(e.clientX, e.clientY);
});
document.addEventListener('mousemove', (e) => moveDrag(e.clientX, e.clientY));
document.addEventListener('mouseup', endDrag);

localVideoWrapper.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    startDrag(touch.clientX, touch.clientY);
}, { passive: false });

document.addEventListener('touchmove', (e) => {
    if (isDragging) {
        const touch = e.touches[0];
        moveDrag(touch.clientX, touch.clientY);
    }
}, { passive: false });

document.addEventListener('touchend', endDrag);

// ══════════════════════════════════════════════════════════════════
// WEBRTC
// ══════════════════════════════════════════════════════════════════
function createPeerConnection() {
    if (peerConnection) {
        peerConnection.close();
    }

    peerConnection = new RTCPeerConnection(iceConfig);

    if (localStream) {
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });
    }

    peerConnection.ontrack = (event) => {
        remoteVideo.srcObject = event.streams[0];
        remoteVideo.onloadeddata = () => {
            remoteVideo.classList.add('visible');
        };
    };

    peerConnection.onicecandidate = (event) => {
        if (event.candidate && socket) {
            socket.emit('signal', { type: 'ice', candidate: event.candidate });
        }
    };

    peerConnection.oniceconnectionstatechange = () => {
        const state = peerConnection.iceConnectionState;
        console.log('ICE connection state:', state);

        switch (state) {
            case 'connected':
            case 'completed':
                isConnected = true;
                setStatus('connected', '', '');
                break;
            case 'disconnected':
                showToast('Connection unstable...', 'warning');
                break;
            case 'failed':
                showToast('Connection failed. Click Next to try again.', 'error');
                cleanupConnection();
                setStatus('disconnected', 'Connection failed', 'Click Next to find a new match');
                break;
            case 'closed':
                break;
        }
    };

    return peerConnection;
}

function cleanupConnection() {
    isConnected = false;
    currentPeerId = null;

    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }

    remoteVideo.srcObject = null;
    remoteVideo.classList.remove('visible');
    hideTypingIndicator();
    hidePeerProfile();
}

// ══════════════════════════════════════════════════════════════════
// TEXT CHAT
// ══════════════════════════════════════════════════════════════════
function sendMessage() {
    const text = chatInput.value.trim();
    if (!text || !isConnected || !socket) return;

    socket.emit('chat-message', text);
    addMessage(text, 'sent');
    chatInput.value = '';
    chatInput.focus();

    isTyping = false;
    clearTimeout(typingTimeout);
    socket.emit('typing', false);
}

btnSend.addEventListener('click', sendMessage);

chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

chatInput.addEventListener('input', handleTyping);

// ══════════════════════════════════════════════════════════════════
// NEXT / SKIP
// ══════════════════════════════════════════════════════════════════
function skipToNext() {
    if (!socket) return;
    cleanupConnection();
    addMessage('You skipped to the next person.');
    setStatus('searching', 'Looking for someone...', 'Finding someone who shares your interests');
    socket.emit('next');
}

btnNext.addEventListener('click', skipToNext);

// ══════════════════════════════════════════════════════════════════
// REPORT & BLOCK
// ══════════════════════════════════════════════════════════════════
btnReport.addEventListener('click', () => {
    if (!currentPeerId && !isConnected) {
        showToast('No one to report right now', 'warning');
        return;
    }
    reportModal.classList.add('active');
});

btnCancelReport.addEventListener('click', () => {
    reportModal.classList.remove('active');
    document.querySelectorAll('input[name="reportReason"]').forEach(r => r.checked = false);
});

btnSubmitReport.addEventListener('click', () => {
    if (!socket) return;
    const selected = document.querySelector('input[name="reportReason"]:checked');
    if (!selected) {
        showToast('Please select a reason', 'warning');
        return;
    }

    socket.emit('report', { reason: selected.value });
    socket.emit('block');

    reportModal.classList.remove('active');
    document.querySelectorAll('input[name="reportReason"]').forEach(r => r.checked = false);

    showToast('User reported & blocked. Finding next...', 'success');
    addMessage('You reported and blocked this user.');

    cleanupConnection();
    setStatus('searching', 'Looking for someone...', 'Finding you a new match');
});

reportModal.addEventListener('click', (e) => {
    if (e.target === reportModal) {
        reportModal.classList.remove('active');
        document.querySelectorAll('input[name="reportReason"]').forEach(r => r.checked = false);
    }
});

// ══════════════════════════════════════════════════════════════════
// KEYBOARD SHORTCUTS
// ══════════════════════════════════════════════════════════════════
document.addEventListener('keydown', (e) => {
    if (document.activeElement === chatInput) return;
    if (authScreen && !authScreen.classList.contains('hidden')) return;

    if (e.key === 'Escape') {
        e.preventDefault();
        skipToNext();
    } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        toggleMic();
    }
});

// ══════════════════════════════════════════════════════════════════
// MOBILE CHAT TOGGLE
// ══════════════════════════════════════════════════════════════════
btnChatToggle.addEventListener('click', () => {
    chatSidebar.classList.toggle('collapsed');
});

// Global Variables
let currentUser = null;
let isAdmin = false;
let adminLevel = 0;
let otpTimer = null;
let currentGuideId = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    showLoading();
    setTimeout(() => {
        hideLoading();
        checkAuth();
    }, 2000);
    
    initializeEventListeners();
});

// Loading Screen
function showLoading() {
    document.getElementById('loading-screen').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loading-screen').style.opacity = '0';
    setTimeout(() => {
        document.getElementById('loading-screen').style.display = 'none';
    }, 500);
}

// Notification
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type} show`;
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Check Authentication
async function checkAuth() {
    try {
        const response = await fetch('/api/user');
        const data = await response.json();
        
        if (data.loggedIn) {
            currentUser = data.username;
            showDashboard();
            loadDashboardData();
            checkAdminStatus();
        } else {
            showLoginPanel();
        }
    } catch (error) {
        console.error('Error checking auth:', error);
        showLoginPanel();
    }
}

// Show Panels
function showLoginPanel() {
    document.getElementById('login-panel').style.display = 'flex';
    document.getElementById('register-panel').style.display = 'none';
    document.getElementById('main-dashboard').style.display = 'none';
}

function showRegisterPanel() {
    document.getElementById('login-panel').style.display = 'none';
    document.getElementById('register-panel').style.display = 'flex';
    document.getElementById('main-dashboard').style.display = 'none';
}

function showDashboard() {
    document.getElementById('login-panel').style.display = 'none';
    document.getElementById('register-panel').style.display = 'none';
    document.getElementById('main-dashboard').style.display = 'block';
    document.getElementById('username-display').textContent = currentUser;
}

// Event Listeners
function initializeEventListeners() {
    // Auth Navigation
    document.getElementById('show-register').addEventListener('click', (e) => {
        e.preventDefault();
        showRegisterPanel();
    });
    
    document.getElementById('show-login').addEventListener('click', (e) => {
        e.preventDefault();
        showLoginPanel();
    });
    
    // Login Form
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    
    // Register Form
    document.getElementById('register-form').addEventListener('submit', handleRegisterSendOTP);
    
    // OTP
    document.getElementById('verify-otp-btn').addEventListener('click', handleVerifyOTP);
    initializeOTPInputs();
    
    // Sidebar
    document.getElementById('toggle-sidebar').addEventListener('click', toggleSidebar);
    document.getElementById('close-sidebar').addEventListener('click', closeSidebar);
    
    // Close sidebar when clicking overlay (mobile)
    document.getElementById('sidebar-overlay').addEventListener('click', closeSidebar);
    
    // Menu Items
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', handleMenuClick);
    });
    
    // Logout
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    
    // Copy Buttons
    document.addEventListener('click', (e) => {
        if (e.target.closest('.copy-btn')) {
            const btn = e.target.closest('.copy-btn');
            const text = btn.dataset.copy;
            navigator.clipboard.writeText(text);
            showNotification('Copied to clipboard!');
        }
    });
    
    // Modal Close
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.modal').classList.remove('active');
        });
    });
    
    // Marketplace
    document.getElementById('create-product-btn').addEventListener('click', () => {
        document.getElementById('create-product-modal').classList.add('active');
    });
    
    document.getElementById('create-product-form').addEventListener('submit', handleCreateProduct);
    document.getElementById('search-btn').addEventListener('click', loadMarketplace);
    document.getElementById('product-type-filter').addEventListener('change', loadMarketplace);
    
    // Global Chat
    document.getElementById('send-global-message').addEventListener('click', sendGlobalMessage);
    document.getElementById('global-message-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendGlobalMessage();
    });
    
    // Guide
    document.getElementById('create-guide-btn').addEventListener('click', () => {
        document.getElementById('create-guide-modal').classList.add('active');
    });
    
    document.getElementById('create-guide-form').addEventListener('submit', handleCreateGuide);
    document.getElementById('back-to-guide-list').addEventListener('click', showGuideList);
    document.getElementById('send-guide-message').addEventListener('click', sendGuideMessage);
    
    // My Invites
    document.getElementById('my-invites-btn').addEventListener('click', showMyInvites);
    
    // Manage Guide
    document.getElementById('manage-guide-btn')?.addEventListener('click', showManageGuide);
    
    // Leave Guide
    document.getElementById('leave-guide-btn')?.addEventListener('click', handleLeaveGuide);
    
    // Manage tabs
    document.querySelectorAll('.manage-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;
            switchManageTab(tabName);
        });
    });
    
    // Invite member form
    document.getElementById('invite-member-form')?.addEventListener('submit', handleInviteMember);
    
    // Representative forms
    document.getElementById('add-rep1-form')?.addEventListener('submit', (e) => handleAddRepresentative(e, 1));
    document.getElementById('add-rep2-form')?.addEventListener('submit', (e) => handleAddRepresentative(e, 2));
    document.getElementById('remove-rep1-btn')?.addEventListener('click', () => handleRemoveRepresentative(1));
    document.getElementById('remove-rep2-btn')?.addEventListener('click', () => handleRemoveRepresentative(2));
    
    // Change leader
    document.getElementById('change-leader-form')?.addEventListener('submit', handleChangeLeader);
    
    // Delete guide
    document.getElementById('delete-guide-btn')?.addEventListener('click', handleDeleteGuide);
    
    // Transfer
    document.getElementById('transfer-form').addEventListener('submit', handleTransfer);
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;
            switchTab(tabName);
        });
    });
    
    // Admin
    document.getElementById('verify-admin-key').addEventListener('click', handleVerifyAdminKey);
    
    document.querySelectorAll('#admin-money-form button').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const action = btn.dataset.action;
            handleAdminMoney(action);
        });
    });
    
    document.getElementById('admin-clear-global').addEventListener('click', () => {
        if (confirm('Yakin ingin menghapus semua chat global?')) {
            clearGlobalChat();
        }
    });
    
    document.getElementById('admin-clear-marketplace').addEventListener('click', () => {
        if (confirm('Yakin ingin menghapus semua marketplace?')) {
            clearMarketplace();
        }
    });
    
    document.getElementById('admin-clear-guide').addEventListener('click', handleClearGuideChat);
    document.getElementById('admin-delete-account').addEventListener('click', handleDeleteAccount);

    // Give Items
    document.getElementById('admin-give-item-form')?.addEventListener('submit', handleGiveItem);
    document.getElementById('load-give-history-btn')?.addEventListener('click', loadGiveHistory);
    document.getElementById('refresh-give-history-btn')?.addEventListener('click', () => loadGiveHistory(true));

    // Give Items - Tab switching
    document.querySelectorAll('.give-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;
            document.querySelectorAll('.give-tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.give-tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(`give-tab-${tabName}`)?.classList.add('active');
            if (tabName === 'history') loadGiveHistory();
        });
    });

    // Give Items - Live preview
    document.querySelectorAll('input[name="give-item-type"]').forEach(radio => {
        radio.addEventListener('change', updateGivePreview);
    });
    document.getElementById('give-quantity')?.addEventListener('input', updateGivePreview);
    document.getElementById('give-username')?.addEventListener('input', updateGivePreview);

    // Inventory filters
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentInventoryFilter = btn.dataset.filter;
            renderInventoryGrid();
        });
    });
    document.getElementById('inventory-sort')?.addEventListener('change', renderInventoryGrid);
}

// Login Handler
async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentUser = data.username;
            showNotification('Login berhasil!');
            showDashboard();
            loadDashboardData();
            checkAdminStatus();
        } else {
            showNotification(data.message, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Terjadi kesalahan server', 'error');
    }
}

// Register - Send OTP
async function handleRegisterSendOTP(e) {
    e.preventDefault();
    
    const username = document.getElementById('register-username').value;
    const phone = document.getElementById('register-phone').value;
    
    try {
        const response = await fetch('/api/register/send-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, phone })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification(data.message);
            showOTPModal();
            startOTPTimer();
        } else {
            showNotification(data.message, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Terjadi kesalahan server', 'error');
    }
}

// OTP Modal
function showOTPModal() {
    const modal = document.getElementById('otp-modal');
    modal.classList.add('active');
    
    // Reset state
    document.querySelectorAll('.otp-input').forEach(i => {
        i.value = '';
        i.classList.remove('filled');
    });
    document.getElementById('otp-expired-msg').style.display = 'none';
    document.getElementById('otp-timer-text').style.display = 'flex';
    document.getElementById('otp-countdown-bar').style.display = 'block';
    document.getElementById('verify-otp-btn').disabled = false;
    document.getElementById('otp-countdown-fill').style.width = '100%';
    document.getElementById('otp-countdown-fill').classList.remove('warning');
    document.getElementById('otp-timer-display').classList.remove('warning');

    setTimeout(() => document.querySelector('.otp-input[data-index="0"]')?.focus(), 100);
}

function initializeOTPInputs() {
    const inputs = document.querySelectorAll('.otp-input');
    inputs.forEach((input, index) => {
        input.addEventListener('input', (e) => {
            // Hanya terima angka
            e.target.value = e.target.value.replace(/\D/g, '');
            if (e.target.value.length === 1) {
                e.target.classList.add('filled');
                if (index < inputs.length - 1) {
                    inputs[index + 1].focus();
                } else {
                    // Auto verify saat digit terakhir diisi
                    setTimeout(() => handleVerifyOTP(), 300);
                }
            } else {
                e.target.classList.remove('filled');
            }
        });
        
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && e.target.value === '' && index > 0) {
                inputs[index - 1].value = '';
                inputs[index - 1].classList.remove('filled');
                inputs[index - 1].focus();
            }
        });

        // Handle paste (misal paste "123456" langsung)
        input.addEventListener('paste', (e) => {
            e.preventDefault();
            const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
            if (pasted.length > 0) {
                [...pasted].forEach((digit, i) => {
                    if (inputs[i]) {
                        inputs[i].value = digit;
                        inputs[i].classList.add('filled');
                    }
                });
                const nextEmpty = inputs[pasted.length] || inputs[inputs.length - 1];
                nextEmpty.focus();
                if (pasted.length === 6) setTimeout(() => handleVerifyOTP(), 300);
            }
        });
    });
}

// OTP Timer menggunakan timestamp agar akurat (tidak drift)
let otpEndTime = null;

function startOTPTimer() {
    // Clear timer lama jika ada
    if (otpTimer) clearInterval(otpTimer);
    
    const DURATION = 5 * 60; // 5 menit dalam detik
    otpEndTime = Date.now() + DURATION * 1000;

    const timerDisplay = document.getElementById('otp-timer-display');
    const fill = document.getElementById('otp-countdown-fill');

    function tick() {
        const remaining = Math.max(0, Math.round((otpEndTime - Date.now()) / 1000));
        const minutes = Math.floor(remaining / 60);
        const secs = remaining % 60;
        const pct = (remaining / DURATION) * 100;

        timerDisplay.textContent = `${minutes}:${secs.toString().padStart(2, '0')}`;
        fill.style.width = `${pct}%`;

        // Warning saat < 60 detik
        if (remaining <= 60) {
            fill.classList.add('warning');
            timerDisplay.classList.add('warning');
        } else {
            fill.classList.remove('warning');
            timerDisplay.classList.remove('warning');
        }

        if (remaining <= 0) {
            clearInterval(otpTimer);
            otpTimer = null;
            // Tampilkan expired UI (bukan tutup modal)
            document.getElementById('otp-timer-text').style.display = 'none';
            document.getElementById('otp-countdown-bar').style.display = 'none';
            document.getElementById('otp-expired-msg').style.display = 'flex';
            document.getElementById('verify-otp-btn').disabled = true;
            document.querySelectorAll('.otp-input').forEach(i => {
                i.disabled = true;
                i.classList.remove('filled');
            });
        }
    }

    tick(); // Jalankan sekali langsung
    otpTimer = setInterval(tick, 1000);
}

// Resend OTP
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('resend-otp-btn')?.addEventListener('click', async () => {
        const username = document.getElementById('register-username').value;
        const phone = document.getElementById('register-phone').value;

        try {
            const response = await fetch('/api/register/send-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, phone })
            });
            const data = await response.json();
            if (data.success) {
                showNotification('OTP baru telah dikirim!');
                // Reset modal state
                document.querySelectorAll('.otp-input').forEach(i => {
                    i.value = ''; i.classList.remove('filled'); i.disabled = false;
                });
                document.getElementById('otp-expired-msg').style.display = 'none';
                document.getElementById('otp-timer-text').style.display = 'flex';
                document.getElementById('otp-countdown-bar').style.display = 'block';
                document.getElementById('verify-otp-btn').disabled = false;
                startOTPTimer();
                document.querySelector('.otp-input[data-index="0"]')?.focus();
            } else {
                showNotification(data.message, 'error');
            }
        } catch (err) {
            showNotification('Terjadi kesalahan server', 'error');
        }
    });
});

// Verify OTP
async function handleVerifyOTP() {
    const inputs = document.querySelectorAll('.otp-input');
    const otp = Array.from(inputs).map(input => input.value).join('');
    
    if (otp.length !== 6) {
        showNotification('Masukkan 6 digit kode OTP', 'error');
        return;
    }
    
    const username = document.getElementById('register-username').value;
    const phone = document.getElementById('register-phone').value;

    // Disable button sementara
    const btn = document.getElementById('verify-otp-btn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifikasi...';
    
    try {
        const response = await fetch('/api/register/verify-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, phone, otp })
        });
        
        const data = await response.json();
        
        if (data.success) {
            if (otpTimer) { clearInterval(otpTimer); otpTimer = null; }
            document.getElementById('otp-modal').classList.remove('active');
            showNotification(data.message);
            showLoginPanel();
            document.getElementById('register-form')?.reset();
            inputs.forEach(input => { input.value = ''; input.classList.remove('filled'); });
        } else {
            showNotification(data.message, 'error');
            // Shake animasi pada inputs jika salah
            document.querySelector('.otp-inputs').style.animation = 'shake 0.4s ease';
            setTimeout(() => document.querySelector('.otp-inputs').style.animation = '', 400);
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-check"></i> Verifikasi';
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Terjadi kesalahan server', 'error');
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-check"></i> Verifikasi';
    }
}

// Logout
async function handleLogout(e) {
    e.preventDefault();
    
    try {
        const response = await fetch('/api/logout', { method: 'POST' });
        const data = await response.json();
        
        if (data.success) {
            currentUser = null;
            isAdmin = false;
            showNotification('Logout berhasil!');
            showLoginPanel();
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// Sidebar
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('main-content');
    const overlay = document.getElementById('sidebar-overlay');
    
    if (window.innerWidth <= 768) {
        // Mobile: toggle open class and overlay
        sidebar.classList.toggle('open');
        overlay.classList.toggle('active');
    } else {
        // Desktop: toggle closed class
        sidebar.classList.toggle('closed');
        mainContent.classList.toggle('full');
    }
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('main-content');
    const overlay = document.getElementById('sidebar-overlay');
    
    if (window.innerWidth <= 768) {
        // Mobile: remove open class and overlay
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
    } else {
        // Desktop: add closed class
        sidebar.classList.add('closed');
        mainContent.classList.add('full');
    }
}

// Menu Navigation
function handleMenuClick(e) {
    e.preventDefault();
    
    if (e.currentTarget.id === 'logout-btn') return;
    
    const page = e.currentTarget.dataset.page;
    
    // Update active menu
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });
    e.currentTarget.classList.add('active');
    
    // Update active page
    document.querySelectorAll('.page').forEach(p => {
        p.classList.remove('active');
    });
    document.getElementById(`page-${page}`).classList.add('active');
    
    // Load page data
    switch(page) {
        case 'dashboard':
            loadServerStatus();
            break;
        case 'account':
            loadAccountInfo();
            break;
        case 'inventory':
            loadInventory();
            break;
        case 'marketplace':
            loadMarketplace();
            break;
        case 'market-digital':
            loadMarketDigital();
            break;
        case 'chat-global':
            loadGlobalChat();
            break;
        case 'guide':
            loadMyGuides();
            break;
        case 'transfer':
            loadTransferHistory();
            break;
    }
    
    // Close sidebar on mobile
    if (window.innerWidth <= 768) {
        closeSidebar();
    }
}

// Check Admin Status
async function checkAdminStatus() {
    try {
        const response = await fetch('/api/check-admin');
        const data = await response.json();
        
        isAdmin = data.isAdmin;
        adminLevel = data.level;
        
        if (isAdmin) {
            document.querySelectorAll('.admin-only').forEach(el => {
                el.style.display = 'flex';
            });
            
            document.getElementById('clear-global-chat-btn').style.display = 'flex';
        }
    } catch (error) {
        console.error('Error checking admin:', error);
    }
}

// Load Dashboard Data
function loadDashboardData() {
    // Dashboard is static, no need to load
}

// Load Account Info
async function loadAccountInfo() {
    try {
        const response = await fetch('/api/account-info');
        const data = await response.json();
        
        if (data.success) {
            const account = data.data;
            
            // Account Info
            document.getElementById('info-id').textContent = account.pID;
            document.getElementById('info-name').textContent = account.pName;
            document.getElementById('info-level').textContent = account.pLevel;
            document.getElementById('info-money').textContent = formatMoney(account.pCash);
            document.getElementById('info-bank').textContent = formatMoney(account.pBank);
            document.getElementById('info-maskid').textContent = account.pMaskID;
            
            // Load detailed account info for Account page
            loadDetailedAccountInfo(account);
        }
    } catch (error) {
        console.error('Error loading account info:', error);
    }
}

// Load Server Status
async function loadServerStatus() {
    const loadingEl = document.getElementById('server-status-loading');
    const contentEl = document.getElementById('server-status-content');
    const errorEl = document.getElementById('server-status-error');
    
    // Show loading
    loadingEl.style.display = 'block';
    contentEl.style.display = 'none';
    errorEl.style.display = 'none';
    
    try {
        const response = await fetch('/api/server-status');
        const data = await response.json();
        
        if (data.success && data.online) {
            // Server Info
            document.getElementById('server-online').textContent = 'Online';
            document.getElementById('server-online').className = 'status-badge online';
            document.getElementById('server-ip').textContent = data.ip;
            document.getElementById('server-port').textContent = data.port;
            document.getElementById('server-hostname').textContent = data.hostname;
            document.getElementById('server-gamemode').textContent = data.gamemode;
            document.getElementById('server-mapname').textContent = data.mapname;
            document.getElementById('server-players').textContent = `${data.playersOnline} / ${data.maxPlayers}`;
            document.getElementById('server-maxplayers').textContent = data.maxPlayers;
            document.getElementById('server-password').textContent = data.passworded ? 'Yes' : 'No';
            document.getElementById('server-ping').textContent = data.ping + ' ms';
            
            // Color code ping
            const pingEl = document.getElementById('server-ping');
            if (data.ping < 100) {
                pingEl.className = 'ping-value good';
            } else if (data.ping < 200) {
                pingEl.className = 'ping-value medium';
            } else {
                pingEl.className = 'ping-value bad';
            }
            
            // Region Info
            if (data.region) {
                document.getElementById('region-country').textContent = data.region.country;
                document.getElementById('region-code').textContent = data.region.countryCode;
                document.getElementById('region-name').textContent = data.region.regionName;
                document.getElementById('region-city').textContent = data.region.city;
                document.getElementById('region-isp').textContent = data.region.isp;
            }
            
            // Player List
            const playerListEl = document.getElementById('player-list');
            const playerCountEl = document.getElementById('playerlist-count');
            playerCountEl.textContent = data.playersOnline;
            
            if (data.playerList && data.playerList.length > 0) {
                playerListEl.innerHTML = data.playerList.map(player => `
                    <div class="player-item">
                        <span class="player-name">${player.name || player}</span>
                        <span class="player-ping">${player.ping !== undefined ? player.ping + ' ms' : '-'}</span>
                    </div>
                `).join('');
            } else {
                playerListEl.innerHTML = '<div class="no-players">No players online</div>';
            }
            
            // Show content
            loadingEl.style.display = 'none';
            contentEl.style.display = 'block';
        } else {
            // Server offline
            loadingEl.style.display = 'none';
            errorEl.style.display = 'flex';
        }
    } catch (error) {
        console.error('Error loading server status:', error);
        loadingEl.style.display = 'none';
        errorEl.style.display = 'flex';
    }
}

// Load detailed account information
function loadDetailedAccountInfo(account) {
    // Personal Information
    document.getElementById('acc-id').textContent = account.pID || '-';
    document.getElementById('acc-name').textContent = account.pName || '-';
    document.getElementById('acc-maskid').textContent = account.pMaskID || '-';
    
    // Gender: 0 = Male, 1 = Female
    const gender = account.pSex === 0 ? 'Laki-laki' : account.pSex === 1 ? 'Perempuan' : '-';
    document.getElementById('acc-gender').textContent = gender;
    
    document.getElementById('acc-level').textContent = account.pLevel || '0';

    // Character Stats
    document.getElementById('acc-skin').textContent = account.pSkin || '-';
    document.getElementById('acc-health').textContent = account.pHP ? account.pHP.toFixed(1) : '-';
    document.getElementById('acc-armour').textContent = account.pArmour ? account.pArmour.toFixed(1) : '-';

    // Financial Info
    const cash = account.pCash || 0;
    const bank = account.pBank || 0;
    const redMoney = account.pUangMerah || 0;
    const totalLegal = cash + bank;
    
    document.getElementById('acc-cash').textContent = 'Rp ' + cash.toLocaleString();
    document.getElementById('acc-bank').textContent = 'Rp ' + bank.toLocaleString();
    document.getElementById('acc-red-money').textContent = 'Rp ' + redMoney.toLocaleString();
    document.getElementById('acc-total-money').textContent = 'Rp ' + totalLegal.toLocaleString();
}

// Create Product
async function handleCreateProduct(e) {
    e.preventDefault();
    
    const formData = new FormData();
    const photo = document.getElementById('product-photo').files[0];
    if (photo) formData.append('photo', photo);
    
    formData.append('product_name', document.getElementById('product-name').value);
    formData.append('product_type', document.getElementById('product-type').value);
    formData.append('price', document.getElementById('product-price').value);
    formData.append('phone', document.getElementById('product-phone').value);
    formData.append('samp_id', document.getElementById('product-samp').value);
    
    try {
        const response = await fetch('/api/marketplace/create', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification(data.message);
            document.getElementById('create-product-modal').classList.remove('active');
            document.getElementById('create-product-form').reset();
            loadMarketplace();
        } else {
            showNotification(data.message, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Terjadi kesalahan server', 'error');
    }
}

// Load Marketplace
async function loadMarketplace() {
    const type = document.getElementById('product-type-filter').value;
    const search = document.getElementById('product-search').value;
    
    try {
        const response = await fetch(`/api/marketplace?type=${type}&search=${search}`);
        const data = await response.json();
        
        if (data.success) {
            const container = document.getElementById('marketplace-products');
            
            if (data.products.length === 0) {
                container.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">Belum ada produk</p>';
                return;
            }
            
            container.innerHTML = data.products.map(product => `
                <div class="product-card">
                    ${product.photo_url ? `<img src="${product.photo_url}" class="product-image" alt="${product.product_name}">` : '<div class="product-image"></div>'}
                    <div class="product-info">
                        <div class="product-name">${product.product_name}</div>
                        <span class="product-type ${product.product_type}">${product.product_type === 'legal' ? 'Legal Items' : 'Illegal Items'}</span>
                        <div class="product-price">Rp ${formatMoney(product.price)}</div>
                        <div class="product-contact">
                            <span><i class="fas fa-user"></i> ${product.username}</span>
                            <span><i class="fas fa-phone"></i> ${product.phone}</span>
                            <span><i class="fas fa-gamepad"></i> ID SAMP: ${product.samp_id}</span>
                        </div>
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// Format Money
function formatMoney(amount) {
    return new Intl.NumberFormat('id-ID').format(amount);
}

// Global Chat
async function sendGlobalMessage() {
    const input = document.getElementById('global-message-input');
    const message = input.value.trim();
    
    if (!message) return;
    
    try {
        const response = await fetch('/api/chat/global/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message })
        });
        
        const data = await response.json();
        
        if (data.success) {
            input.value = '';
            loadGlobalChat();
        } else {
            showNotification(data.message, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Terjadi kesalahan server', 'error');
    }
}

async function loadGlobalChat() {
    try {
        const response = await fetch('/api/chat/global');
        const data = await response.json();
        
        if (data.success) {
            const container = document.getElementById('global-chat-messages');
            
            if (data.messages.length === 0) {
                container.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">Belum ada pesan</p>';
                return;
            }
            
            container.innerHTML = data.messages.map(msg => {
                let tag = 'warga';
                if (msg.admin_level > 0) {
                    if (msg.admin_level >= 1 && msg.admin_level <= 8) tag = 'admin';
                    else if (msg.admin_level >= 9 && msg.admin_level <= 20) tag = 'owner';
                    else if (msg.admin_level >= 21) tag = 'developer';
                }
                
                const tagText = tag === 'warga' ? '[warga]' : 
                               tag === 'admin' ? '[admin]' : 
                               tag === 'owner' ? '[owner]' : '[developer]';
                
                return `
                    <div class="chat-message">
                        <div class="message-header">
                            <span class="username">IC: ${msg.username}</span>
                            <span class="tag ${tag}">${tagText}</span>
                        </div>
                        <div class="message-text">${escapeHtml(msg.message)}</div>
                        <div class="message-time">${formatDate(msg.created_at)}</div>
                    </div>
                `;
            }).join('');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function clearGlobalChat() {
    try {
        const response = await fetch('/api/chat/global/clear', { method: 'POST' });
        const data = await response.json();
        
        if (data.success) {
            showNotification(data.message);
            loadGlobalChat();
        } else {
            showNotification(data.message, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// Guide
async function handleCreateGuide(e) {
    e.preventDefault();
    
    const guide_name = document.getElementById('guide-name').value;
    const max_members = document.getElementById('guide-max-members').value;
    const representative1 = document.getElementById('guide-rep1').value;
    const representative2 = document.getElementById('guide-rep2').value;
    
    try {
        const response = await fetch('/api/guide/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ guide_name, max_members, representative1, representative2 })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification(data.message);
            document.getElementById('create-guide-modal').classList.remove('active');
            document.getElementById('create-guide-form').reset();
            loadMyGuides();
        } else {
            showNotification(data.message, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Terjadi kesalahan server', 'error');
    }
}

async function loadMyGuides() {
    try {
        const response = await fetch('/api/guide/my-guides');
        const data = await response.json();
        
        if (data.success) {
            const container = document.getElementById('guide-list');
            
            if (data.guides.length === 0) {
                container.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">Anda belum memiliki guide</p>';
                return;
            }
            
            container.innerHTML = data.guides.map(guide => `
                <div class="guide-card" onclick="openGuide(${guide.id}, '${guide.guide_name}')">
                    <h3><i class="fas fa-users"></i> ${guide.guide_name}</h3>
                    <div class="guide-info">
                        <p><i class="fas fa-crown"></i> Captain: ${guide.captain}</p>
                        <p><i class="fas fa-users"></i> Members: ${guide.member_count}/${guide.max_members}</p>
                        <p><i class="fas fa-calendar"></i> Created: ${formatDate(guide.created_at)}</p>
                    </div>
                    <span class="role-badge ${guide.role}">${getRoleName(guide.role)}</span>
                </div>
            `).join('');
        }
        
        // Load invites count
        loadInvitesCount();
    } catch (error) {
        console.error('Error:', error);
    }
}

async function openGuide(guideId, guideName) {
    currentGuideId = guideId;
    document.getElementById('guide-list').style.display = 'none';
    document.getElementById('guide-detail').style.display = 'block';
    document.getElementById('guide-detail-name').textContent = guideName;
    
    await loadGuideDetails(guideId);
    loadGuideChat(guideId);
}

async function loadGuideDetails(guideId) {
    try {
        const response = await fetch(`/api/guide/details/${guideId}`);
        const data = await response.json();
        
        if (data.success) {
            const guide = data.guide;
            const userRole = data.userRole;
            
            // Update guide info
            document.getElementById('guide-captain').textContent = guide.captain || '-';
            document.getElementById('guide-rep1').textContent = guide.representative1 || 'Tidak ada';
            document.getElementById('guide-rep2').textContent = guide.representative2 || 'Tidak ada';
            document.getElementById('guide-member-count').textContent = `${data.members.length}/${guide.max_members}`;
            
            // Show/hide actions based on role
            if (userRole === 'captain') {
                document.getElementById('guide-captain-actions').style.display = 'flex';
                document.getElementById('guide-member-actions').style.display = 'none';
            } else {
                document.getElementById('guide-captain-actions').style.display = 'none';
                document.getElementById('guide-member-actions').style.display = 'block';
            }
            
            // Display members
            const membersList = document.getElementById('guide-members-list');
            membersList.innerHTML = data.members.map(member => `
                <div class="member-item">
                    <div class="member-name">
                        <i class="fas fa-user"></i>
                        <span>${member.username}</span>
                    </div>
                    <span class="member-role-badge ${member.role}">${getRoleName(member.role)}</span>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

function showGuideList() {
    document.getElementById('guide-list').style.display = 'grid';
    document.getElementById('guide-detail').style.display = 'none';
    currentGuideId = null;
    loadMyGuides();
}

function getRoleName(role) {
    const names = {
        'captain': 'Captain',
        'representative': 'Representative',
        'member': 'Member'
    };
    return names[role] || role;
}

// My Invites
async function loadInvitesCount() {
    try {
        const response = await fetch('/api/guide/my-invites');
        const data = await response.json();
        
        if (data.success) {
            const badge = document.getElementById('invite-badge');
            badge.textContent = data.invites.length;
            badge.style.display = data.invites.length > 0 ? 'inline-block' : 'none';
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function showMyInvites() {
    try {
        const response = await fetch('/api/guide/my-invites');
        const data = await response.json();
        
        if (data.success) {
            const container = document.getElementById('invites-list');
            
            if (data.invites.length === 0) {
                container.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">Tidak ada invite</p>';
            } else {
                container.innerHTML = data.invites.map(invite => {
                    const expiresIn = Math.ceil((new Date(invite.expires_at) - new Date()) / (1000 * 60 * 60 * 24));
                    return `
                        <div class="invite-item">
                            <div class="invite-header">
                                <span class="invite-guide-name">${invite.guide_name}</span>
                            </div>
                            <div class="invite-info">
                                <p><i class="fas fa-crown"></i> Captain: ${invite.captain}</p>
                                <p class="invite-expires"><i class="fas fa-clock"></i> Expires in ${expiresIn} days</p>
                            </div>
                            <div class="invite-actions">
                                <button class="btn-primary" onclick="respondInvite(${invite.id}, 'accept')">
                                    <i class="fas fa-check"></i> Accept
                                </button>
                                <button class="btn-danger" onclick="respondInvite(${invite.id}, 'reject')">
                                    <i class="fas fa-times"></i> Reject
                                </button>
                            </div>
                        </div>
                    `;
                }).join('');
            }
            
            document.getElementById('my-invites-modal').classList.add('active');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function respondInvite(inviteId, action) {
    try {
        const response = await fetch('/api/guide/respond-invite', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ invite_id: inviteId, action })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification(data.message);
            document.getElementById('my-invites-modal').classList.remove('active');
            loadMyGuides();
        } else {
            showNotification(data.message, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Terjadi kesalahan server', 'error');
    }
}

// Leave Guide
async function handleLeaveGuide() {
    if (!confirm('Yakin ingin keluar dari guide ini?')) return;
    
    try {
        const response = await fetch('/api/guide/leave', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ guide_id: currentGuideId })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification(data.message);
            showGuideList();
        } else {
            showNotification(data.message, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Terjadi kesalahan server', 'error');
    }
}

async function sendGuideMessage() {
    const input = document.getElementById('guide-message-input');
    const message = input.value.trim();
    
    if (!message || !currentGuideId) return;
    
    try {
        const response = await fetch('/api/guide/chat/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ guide_id: currentGuideId, message })
        });
        
        const data = await response.json();
        
        if (data.success) {
            input.value = '';
            loadGuideChat(currentGuideId);
        } else {
            showNotification(data.message, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Terjadi kesalahan server', 'error');
    }
}

async function loadGuideChat(guideId) {
    try {
        const response = await fetch(`/api/guide/chat/${guideId}`);
        const data = await response.json();
        
        if (data.success) {
            const container = document.getElementById('guide-chat-messages');
            
            if (data.messages.length === 0) {
                container.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">Belum ada pesan</p>';
                return;
            }
            
            container.innerHTML = data.messages.map(msg => {
                let tag = 'members';
                if (msg.role === 'captain') tag = 'leader';
                else if (msg.role === 'representative') tag = 'representative';
                
                const tagText = tag === 'leader' ? '[leader]' : 
                               tag === 'representative' ? '[representative]' : '[members]';
                
                return `
                    <div class="chat-message">
                        <div class="message-header">
                            <span class="username">IC: ${msg.username}</span>
                            <span class="tag ${tag}">${tagText}</span>
                        </div>
                        <div class="message-text">${escapeHtml(msg.message)}</div>
                        <div class="message-time">${formatDate(msg.created_at)}</div>
                    </div>
                `;
            }).join('');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// Transfer
async function handleTransfer(e) {
    e.preventDefault();
    
    const receiver = document.getElementById('transfer-receiver').value;
    const amount = parseInt(document.getElementById('transfer-amount').value);
    const transfer_type = document.getElementById('transfer-type').value;
    
    try {
        const response = await fetch('/api/transfer/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ receiver, amount, transfer_type })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification(data.message);
            document.getElementById('transfer-form').reset();
            loadTransferHistory();
        } else {
            showNotification(data.message, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Terjadi kesalahan server', 'error');
    }
}

async function loadTransferHistory() {
    loadTransferSent();
    loadTransferReceived();
}

async function loadTransferSent() {
    try {
        const response = await fetch('/api/transfer/history-sent');
        const data = await response.json();
        
        if (data.success) {
            const container = document.getElementById('transfer-sent-list');
            
            if (data.history.length === 0) {
                container.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">Belum ada history</p>';
                return;
            }
            
            container.innerHTML = data.history.map(transfer => `
                <div class="transfer-item">
                    <div class="transfer-header">
                        <span>Transfer ke ${transfer.receiver}</span>
                        <span class="transfer-amount">Rp ${formatMoney(transfer.amount)}</span>
                    </div>
                    <div class="transfer-details">
                        <p>Type: ${transfer.transfer_type === 'pCash' ? 'Cash' : 'Bank'}</p>
                        <p>${formatDate(transfer.created_at)}</p>
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function loadTransferReceived() {
    try {
        const response = await fetch('/api/transfer/history-received');
        const data = await response.json();
        
        if (data.success) {
            const container = document.getElementById('transfer-received-list');
            
            if (data.history.length === 0) {
                container.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">Belum ada history</p>';
                return;
            }
            
            container.innerHTML = data.history.map(transfer => `
                <div class="transfer-item">
                    <div class="transfer-header">
                        <span>Dari ${transfer.sender}</span>
                        <span class="transfer-amount">Rp ${formatMoney(transfer.amount)}</span>
                    </div>
                    <div class="transfer-details">
                        <p>Type: ${transfer.transfer_type === 'pCash' ? 'Cash' : 'Bank'}</p>
                        <p>${formatDate(transfer.created_at)}</p>
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.transfer-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.getElementById(tabName).classList.add('active');
}

// Admin Panel
async function handleVerifyAdminKey() {
    const key = document.getElementById('admin-key-input').value;
    
    try {
        const response = await fetch('/api/verify-admin-key', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Admin key verified!');
            document.getElementById('admin-key-verify').style.display = 'none';
            document.getElementById('admin-panel-content').style.display = 'grid';
            adminLevel = data.level;
        } else {
            showNotification(data.message, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Terjadi kesalahan server', 'error');
    }
}

async function handleAdminMoney(action) {
    const username = document.getElementById('admin-money-username').value;
    const amount = parseInt(document.getElementById('admin-money-amount').value);
    const type = document.getElementById('admin-money-type').value;
    
    if (!username || !amount) {
        showNotification('Harap isi semua field!', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/admin/manage-money', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, amount, type, action })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification(data.message);
            document.getElementById('admin-money-form').reset();
        } else {
            showNotification(data.message, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Terjadi kesalahan server', 'error');
    }
}

async function clearMarketplace() {
    try {
        const response = await fetch('/api/admin/clear-marketplace', { method: 'POST' });
        const data = await response.json();
        
        if (data.success) {
            showNotification(data.message);
        } else {
            showNotification(data.message, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function handleClearGuideChat() {
    const guideName = document.getElementById('admin-guide-name').value;
    
    if (!guideName) {
        showNotification('Masukkan nama guide!', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/admin/clear-guide-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ guide_name: guideName })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification(data.message);
            document.getElementById('admin-guide-name').value = '';
        } else {
            showNotification(data.message, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Terjadi kesalahan server', 'error');
    }
}

async function handleDeleteAccount() {
    const username = document.getElementById('admin-delete-username').value;
    
    if (!username) {
        showNotification('Masukkan username!', 'error');
        return;
    }
    
    if (!confirm(`Yakin ingin menghapus akun ${username}?`)) {
        return;
    }
    
    try {
        const response = await fetch('/api/admin/delete-account', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification(data.message);
            document.getElementById('admin-delete-username').value = '';
        } else {
            showNotification(data.message, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Terjadi kesalahan server', 'error');
    }
}

// Utility Functions
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Baru saja';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} menit lalu`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} jam lalu`;
    
    return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Auto refresh chat every 5 seconds
setInterval(() => {
    const activePage = document.querySelector('.page.active');
    if (!activePage) return;
    
    const pageId = activePage.id;
    
    if (pageId === 'page-chat-global') {
        loadGlobalChat();
    } else if (pageId === 'page-guide' && currentGuideId) {
        loadGuideChat(currentGuideId);
    }
}, 5000);

// Manage Guide Functions
async function showManageGuide() {
    document.getElementById('manage-guide-modal').classList.add('active');
    await loadGuideManageData();
}

async function loadGuideManageData() {
    try {
        const response = await fetch(`/api/guide/details/${currentGuideId}`);
        const data = await response.json();
        
        if (data.success) {
            // Update representatives display
            document.getElementById('rep1-current').textContent = data.guide.representative1 || 'Tidak ada';
            document.getElementById('rep2-current').textContent = data.guide.representative2 || 'Tidak ada';
            
            // Load pending invites
            const invitesContainer = document.getElementById('pending-invites-list');
            if (data.invites.length === 0) {
                invitesContainer.innerHTML = '<p style="color: var(--text-secondary);">Tidak ada pending invites</p>';
            } else {
                invitesContainer.innerHTML = data.invites.map(invite => {
                    const expiresIn = Math.ceil((new Date(invite.expires_at) - new Date()) / (1000 * 60 * 60 * 24));
                    return `
                        <div class="pending-invite-item">
                            <div>
                                <strong>${invite.username}</strong>
                                <p style="font-size: 0.8rem; color: var(--text-secondary);">Expires in ${expiresIn} days</p>
                            </div>
                        </div>
                    `;
                }).join('');
            }
            
            // Load kickable members
            const kickList = document.getElementById('kickable-members-list');
            const kickableMembers = data.members.filter(m => m.role !== 'captain');
            if (kickableMembers.length === 0) {
                kickList.innerHTML = '<p style="color: var(--text-secondary);">Tidak ada member yang bisa di-kick</p>';
            } else {
                kickList.innerHTML = kickableMembers.map(member => `
                    <div class="kick-member-item">
                        <div>
                            <strong>${member.username}</strong>
                            <span class="member-role-badge ${member.role}" style="margin-left: 0.5rem;">${getRoleName(member.role)}</span>
                        </div>
                        <button class="btn-danger" onclick="kickMember('${member.username}')">
                            <i class="fas fa-user-times"></i> Kick
                        </button>
                    </div>
                `).join('');
            }
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

function switchManageTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.manage-tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tabName) {
            btn.classList.add('active');
        }
    });
    
    // Update tab content
    document.querySelectorAll('.manage-tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`tab-${tabName}`).classList.add('active');
}

// Invite Member
async function handleInviteMember(e) {
    e.preventDefault();
    
    const username = document.getElementById('invite-username').value;
    
    try {
        const response = await fetch('/api/guide/invite', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ guide_id: currentGuideId, username })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification(data.message);
            document.getElementById('invite-member-form').reset();
            loadGuideManageData();
        } else {
            showNotification(data.message, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Terjadi kesalahan server', 'error');
    }
}

// Add Representative
async function handleAddRepresentative(e, slot) {
    e.preventDefault();
    
    const username = document.getElementById(`add-rep${slot}-username`).value;
    
    if (!username) {
        showNotification('Masukkan username!', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/guide/add-representative', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ guide_id: currentGuideId, username, slot })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification(data.message);
            document.getElementById(`add-rep${slot}-form`).reset();
            loadGuideManageData();
            loadGuideDetails(currentGuideId);
        } else {
            showNotification(data.message, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Terjadi kesalahan server', 'error');
    }
}

// Remove Representative
async function handleRemoveRepresentative(slot) {
    const username = document.getElementById(`rep${slot}-current`).textContent;
    
    if (username === 'Tidak ada') {
        showNotification('Tidak ada representative di slot ini!', 'error');
        return;
    }
    
    if (!confirm(`Yakin ingin menghapus ${username} dari representative?`)) return;
    
    try {
        const response = await fetch('/api/guide/remove-representative', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ guide_id: currentGuideId, username })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification(data.message);
            loadGuideManageData();
            loadGuideDetails(currentGuideId);
        } else {
            showNotification(data.message, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Terjadi kesalahan server', 'error');
    }
}

// Kick Member
async function kickMember(username) {
    if (!confirm(`Yakin ingin kick ${username} dari guide?`)) return;
    
    try {
        const response = await fetch('/api/guide/kick-member', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ guide_id: currentGuideId, username })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification(data.message);
            loadGuideManageData();
            loadGuideDetails(currentGuideId);
        } else {
            showNotification(data.message, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Terjadi kesalahan server', 'error');
    }
}

// Change Leader
async function handleChangeLeader(e) {
    e.preventDefault();
    
    const newLeader = document.getElementById('new-leader-username').value;
    
    if (!confirm(`Yakin ingin transfer leadership ke ${newLeader}? Anda akan menjadi member biasa!`)) return;
    
    try {
        const response = await fetch('/api/guide/change-leader', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ guide_id: currentGuideId, new_leader: newLeader })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification(data.message);
            document.getElementById('manage-guide-modal').classList.remove('active');
            document.getElementById('change-leader-form').reset();
            showGuideList();
        } else {
            showNotification(data.message, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Terjadi kesalahan server', 'error');
    }
}

// Delete Guide
async function handleDeleteGuide() {
    if (!confirm('PERINGATAN: Guide akan dihapus permanen! Yakin?')) return;
    if (!confirm('Terakhir! Semua data akan hilang. Yakin ingin menghapus guide?')) return;
    
    try {
        const response = await fetch('/api/guide/remove', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ guide_id: currentGuideId })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification(data.message);
            document.getElementById('manage-guide-modal').classList.remove('active');
            showGuideList();
        } else {
            showNotification(data.message, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Terjadi kesalahan server', 'error');
    }
}

// ========================================
// GIVE ITEMS (ADMIN)
// ========================================

const itemNames = {
    pBatu: 'Batu Bersih', pBatuk: 'Batu Kotor', pFish: 'Ikan Biasa',
    pPenyu: 'Penyu', pDolphin: 'Dolphin', pHiu: 'Ikan Hiu',
    pMegalodon: 'Ikan Megalodon', pCaught: 'Cacing/Umpan', pPadi: 'Padi',
    pAyam: 'Ayam', pSemen: 'Semen', pEmas: 'Emas', pSusu: 'Susu', pMinyak: 'Minyak'
};

const itemIcons = {
    pBatu: '🪨', pBatuk: '⛰️', pFish: '🐟', pPenyu: '🐢', pDolphin: '🐬',
    pHiu: '🦈', pMegalodon: '🦑', pCaught: '🪱', pPadi: '🌾', pAyam: '🐔',
    pSemen: '🏗️', pEmas: '💎', pSusu: '🥛', pMinyak: '🛢️',
    pDrugs: '💊', pMicin: '🌿', pSteroid: '💉', pComponent: '🔧'
};

function updateGivePreview() {
    const username = document.getElementById('give-username')?.value?.trim();
    const quantity = document.getElementById('give-quantity')?.value;
    const selectedType = document.querySelector('input[name="give-item-type"]:checked');
    const preview = document.getElementById('give-item-preview');
    const previewText = document.getElementById('give-preview-text');
    if (!preview || !previewText) return;
    if (username && quantity && selectedType) {
        const icon = itemIcons[selectedType.value] || '📦';
        const name = itemNames[selectedType.value] || selectedType.value;
        previewText.innerHTML = `${icon} <strong>${quantity}x ${name}</strong> (${selectedType.value}) → <strong>${username}</strong>`;
        preview.style.display = 'flex';
    } else {
        preview.style.display = 'none';
    }
}

async function handleGiveItem(e) {
    e.preventDefault();
    const username = document.getElementById('give-username').value.trim();
    const quantity = parseInt(document.getElementById('give-quantity').value);
    const selectedType = document.querySelector('input[name="give-item-type"]:checked');
    if (!selectedType) { showNotification('Pilih type item terlebih dahulu!', 'error'); return; }
    if (!quantity || quantity < 1) { showNotification('Jumlah harus minimal 1!', 'error'); return; }
    const itemName = itemNames[selectedType.value] || selectedType.value;
    if (!confirm(`Yakin ingin give ${quantity}x ${itemName} ke ${username}?`)) return;
    try {
        const response = await fetch('/api/admin/items/give', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, item_code: selectedType.value, quantity })
        });
        const data = await response.json();
        if (data.success) {
            showNotification(data.message);
            document.getElementById('admin-give-item-form').reset();
            document.getElementById('give-item-preview').style.display = 'none';
        } else {
            showNotification(data.message, 'error');
        }
    } catch (error) {
        showNotification('Terjadi kesalahan server', 'error');
    }
}

async function loadGiveHistory() {
    const usernameFilter = document.getElementById('give-history-username-filter')?.value?.trim() || '';
    const itemFilter = document.getElementById('give-history-item-filter')?.value || '';
    const container = document.getElementById('give-history-list');
    if (!container) return;
    container.innerHTML = '<p style="text-align:center;color:var(--text-secondary);padding:2rem">Memuat data...</p>';
    try {
        const params = new URLSearchParams();
        if (usernameFilter) params.append('username', usernameFilter);
        if (itemFilter) params.append('item_code', itemFilter);
        const response = await fetch(`/api/admin/items/give-history?${params}`);
        const data = await response.json();
        if (!data.success) {
            container.innerHTML = `<div class="give-history-empty"><i class="fas fa-exclamation-circle"></i>${data.message}</div>`;
            return;
        }
        if (data.history.length === 0) {
            container.innerHTML = `<div class="give-history-empty"><i class="fas fa-inbox"></i>Belum ada history give items</div>`;
            return;
        }
        container.innerHTML = data.history.map(h => {
            const icon = itemIcons[h.item_code] || '📦';
            const name = h.item_name || itemNames[h.item_code] || h.item_code;
            const timeAgo = formatTimeAgo(new Date(h.created_at));
            return `
                <div class="give-history-item">
                    <div class="give-history-icon">${icon}</div>
                    <div class="give-history-body">
                        <div class="give-history-text">
                            <span class="admin-name">${escapeHtml(h.spawned_by)}</span>
                            <span class="action-word"> Give Items </span>
                            <span class="item-name">${escapeHtml(name)}</span>
                            <span class="action-word"> sebanyak </span>
                            <span class="quantity">x${h.quantity}</span>
                            <span class="action-word"> ke </span>
                            <span class="target-name">${escapeHtml(h.username)}</span>
                        </div>
                        <div class="give-history-time"><i class="fas fa-clock"></i> ${timeAgo} · ${formatDate(h.created_at)}</div>
                    </div>
                </div>`;
        }).join('');
    } catch (error) {
        container.innerHTML = `<div class="give-history-empty"><i class="fas fa-exclamation-circle"></i>Gagal memuat data</div>`;
    }
}

function formatTimeAgo(date) {
    const diff = Math.floor((new Date() - date) / 1000);
    if (diff < 60) return `${diff} detik lalu`;
    if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
    return `${Math.floor(diff / 86400)} hari lalu`;
}

// ========================================
// INVENTORY MANAGEMENT
// ========================================

let currentInventoryFilter = 'all';
let inventoryItems = [];

function loadInventory() {
    fetch('/api/account-info')
        .then(r => r.json())
        .then(data => {
            if (!data.success) return;
            const acc = data.data;
            inventoryItems = [
                { code: 'pBatu', name: 'Batu Bersih', qty: acc.pBatu || 0, category: 'legal', rarity: 'common' },
                { code: 'pBatuk', name: 'Batu Kotor', qty: acc.pBatuk || 0, category: 'legal', rarity: 'common' },
                { code: 'pFish', name: 'Ikan Biasa', qty: acc.pFish || 0, category: 'legal', rarity: 'common' },
                { code: 'pPenyu', name: 'Penyu', qty: acc.pPenyu || 0, category: 'legal', rarity: 'uncommon' },
                { code: 'pDolphin', name: 'Dolphin', qty: acc.pDolphin || 0, category: 'legal', rarity: 'rare' },
                { code: 'pHiu', name: 'Ikan Hiu', qty: acc.pHiu || 0, category: 'legal', rarity: 'rare' },
                { code: 'pMegalodon', name: 'Ikan Megalodon', qty: acc.pMegalodon || 0, category: 'legal', rarity: 'legendary' },
                { code: 'pCaught', name: 'Cacing/Umpan', qty: acc.pCaught || 0, category: 'legal', rarity: 'common' },
                { code: 'pPadi', name: 'Padi', qty: acc.pPadi || 0, category: 'legal', rarity: 'common' },
                { code: 'pAyam', name: 'Ayam', qty: acc.pAyam || 0, category: 'legal', rarity: 'common' },
                { code: 'pSemen', name: 'Semen', qty: acc.pSemen || 0, category: 'legal', rarity: 'common' },
                { code: 'pEmas', name: 'Emas', qty: acc.pEmas || 0, category: 'legal', rarity: 'epic' },
                { code: 'pSusu', name: 'Susu', qty: acc.pSusu || 0, category: 'legal', rarity: 'common' },
                { code: 'pMinyak', name: 'Minyak', qty: acc.pMinyak || 0, category: 'legal', rarity: 'uncommon' },
                { code: 'pDrugs', name: 'Drugs', qty: acc.pDrugs || 0, category: 'illegal', rarity: 'rare' },
                { code: 'pMicin', name: 'Marijuana', qty: acc.pMicin || 0, category: 'illegal', rarity: 'rare' },
                { code: 'pSteroid', name: 'Steroid', qty: acc.pSteroid || 0, category: 'illegal', rarity: 'epic' },
                { code: 'pComponent', name: 'Component', qty: acc.pComponent || 0, category: 'illegal', rarity: 'uncommon' }
            ];
            renderInventoryGrid();
        })
        .catch(err => console.error('Error loading inventory:', err));
}

function renderInventoryGrid() {
    const container = document.getElementById('inventory-grid');
    if (!container) return;
    let filtered = currentInventoryFilter === 'all' ? inventoryItems : inventoryItems.filter(i => i.category === currentInventoryFilter);
    const sortBy = document.getElementById('inventory-sort')?.value || 'name';
    if (sortBy === 'name') filtered.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === 'quantity') filtered.sort((a, b) => b.qty - a.qty);
    else if (sortBy === 'rarity') {
        const order = { common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 5 };
        filtered.sort((a, b) => order[b.rarity] - order[a.rarity]);
    }
    container.innerHTML = filtered.map(item => {
        const isEmpty = item.qty === 0;
        return `
            <div class="inventory-item ${isEmpty ? 'empty' : ''}"
                 onclick="${isEmpty ? '' : `showItemDetails('${item.code}','${item.name}',${item.qty},'${item.category}','${item.rarity}')`}">
                <div class="item-rarity ${item.rarity}"></div>
                <div class="item-icon">${itemIcons[item.code] || '📦'}</div>
                <div class="item-name">${item.name}</div>
                <div class="item-quantity">${isEmpty ? '–' : 'x' + item.qty}</div>
                <span class="item-type-badge ${item.category}">${item.category}</span>
            </div>`;
    }).join('');
}

function showItemDetails(code, name, qty, category, rarity) {
    const modal = document.getElementById('item-details-modal');
    if (!modal) return;
    document.getElementById('item-details-name').textContent = name;
    const rarityColors = { common: '#9e9e9e', uncommon: '#4caf50', rare: '#2196f3', epic: '#9c27b0', legendary: '#ff9800' };
    document.getElementById('item-details-content').innerHTML = `
        <div class="item-detail-row"><span class="item-detail-label">Item Code</span><span class="item-detail-value" style="font-family:monospace">${code}</span></div>
        <div class="item-detail-row"><span class="item-detail-label">Jumlah</span><span class="item-detail-value">x${qty}</span></div>
        <div class="item-detail-row"><span class="item-detail-label">Kategori</span><span class="item-detail-value" style="color:${category === 'legal' ? '#4caf50' : '#f44336'}">${category.toUpperCase()}</span></div>
        <div class="item-detail-row"><span class="item-detail-label">Rarity</span><span class="item-detail-value" style="color:${rarityColors[rarity]}">${rarity.toUpperCase()}</span></div>
        <div class="item-detail-row"><span class="item-detail-label">Icon</span><span class="item-detail-value" style="font-size:2rem">${itemIcons[code] || '📦'}</span></div>`;
    modal.classList.add('active');
}

// ========================================
// MARKET DIGITAL
// ========================================

document.getElementById('create-digital-asset-btn')?.addEventListener('click', () => {
    document.getElementById('create-digital-asset-modal')?.classList.add('active');
});

document.getElementById('create-digital-asset-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData();
    const photo = document.getElementById('digital-asset-photo')?.files[0];
    if (photo) formData.append('photo', photo);
    formData.append('asset_name', document.getElementById('digital-asset-name').value);
    formData.append('asset_type', document.getElementById('digital-asset-type').value);
    formData.append('description', document.getElementById('digital-asset-description').value);
    formData.append('price', document.getElementById('digital-asset-price').value);
    formData.append('location', document.getElementById('digital-asset-location').value);
    formData.append('phone', document.getElementById('digital-asset-phone').value);
    formData.append('samp_id', document.getElementById('digital-asset-samp').value);
    formData.append('features', document.getElementById('digital-asset-features').value);
    try {
        const response = await fetch('/api/market-digital/create', { method: 'POST', body: formData });
        const data = await response.json();
        if (data.success) {
            showNotification(data.message);
            document.getElementById('create-digital-asset-modal')?.classList.remove('active');
            document.getElementById('create-digital-asset-form')?.reset();
            loadMarketDigital();
        } else { showNotification(data.message, 'error'); }
    } catch (err) { showNotification('Terjadi kesalahan server', 'error'); }
});

document.getElementById('digital-asset-type-filter')?.addEventListener('change', loadMarketDigital);
document.getElementById('digital-sort')?.addEventListener('change', loadMarketDigital);
document.getElementById('digital-search-btn')?.addEventListener('click', loadMarketDigital);
document.getElementById('digital-asset-search')?.addEventListener('keypress', e => { if (e.key === 'Enter') loadMarketDigital(); });

async function loadMarketDigital() {
    const type = document.getElementById('digital-asset-type-filter')?.value || 'all';
    const search = document.getElementById('digital-asset-search')?.value || '';
    const sort = document.getElementById('digital-sort')?.value || 'newest';
    try {
        const response = await fetch(`/api/market-digital?type=${type}&search=${encodeURIComponent(search)}&sort=${sort}`);
        const data = await response.json();
        const container = document.getElementById('market-digital-assets');
        if (!container) return;
        if (!data.success || data.assets.length === 0) {
            container.innerHTML = '<p style="text-align:center;color:var(--text-secondary);padding:2rem">Belum ada asset yang dijual</p>';
            return;
        }
        const typeNames = { house: 'House', business: 'Business', vehicle: 'Vehicle', motorcycle: 'Motorcycle' };
        container.innerHTML = data.assets.map(asset => `
            <div class="digital-asset-card" onclick="fetch('/api/market-digital/view/${asset.id}',{method:'POST'})">
                ${asset.photo_url ? `<img src="${asset.photo_url}" class="asset-image" alt="${escapeHtml(asset.asset_name)}">` : '<div class="asset-image" style="background:var(--dark-bg);display:flex;align-items:center;justify-content:center;font-size:4rem">🏢</div>'}
                <div class="asset-info">
                    <span class="asset-type-badge ${asset.asset_type}">${typeNames[asset.asset_type] || asset.asset_type}</span>
                    <div class="asset-name">${escapeHtml(asset.asset_name)}</div>
                    <div class="asset-location"><i class="fas fa-map-marker-alt"></i> ${escapeHtml(asset.location || '-')}</div>
                    ${asset.description ? `<p style="color:var(--text-secondary);font-size:0.9rem;margin-bottom:1rem">${escapeHtml(asset.description)}</p>` : ''}
                    <div class="asset-price">Rp ${formatMoney(asset.price)}</div>
                    <div class="asset-meta">
                        <span><i class="fas fa-user"></i> ${escapeHtml(asset.username)}</span>
                        <span class="asset-views"><i class="fas fa-eye"></i> ${asset.views}</span>
                    </div>
                </div>
            </div>`).join('');
    } catch (err) { console.error('Error loading market digital:', err); }
}

// PWA Helper - Install Prompt, Notifications, and Service Worker Management
let deferredPrompt;
let swRegistration;

// Check if PWA is already installed
function isPWAInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches || 
         window.navigator.standalone === true;
}

// Initialize PWA
function initPWA() {
  // Register Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js')
      .then((registration) => {
        console.log('[PWA] Service Worker registered:', registration);
        swRegistration = registration;
        
        // Check for updates every 5 minutes
        setInterval(() => {
          registration.update();
        }, 5 * 60 * 1000);

        // Handle updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              showUpdateAvailable();
            }
          });
        });
      })
      .catch((error) => {
        console.error('[PWA] Service Worker registration failed:', error);
      });

    // Handle controller change (new SW activated)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  }

  // Listen for install prompt
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    showInstallButton();
  });

  // Listen for app installed
  window.addEventListener('appinstalled', () => {
    console.log('[PWA] App installed successfully');
    deferredPrompt = null;
    hideInstallButton();
    showNotification('App berhasil diinstall! 🎉');
  });

  // Check if already installed
  if (isPWAInstalled()) {
    console.log('[PWA] App already running as installed PWA');
    hideInstallButton();
  }

  // Request notification permission on first login (after user logged in)
  if (window.Notification && Notification.permission === 'default') {
    // Don't auto-request, akan dipanggil saat user login
  }
}

// Show install button in UI
function showInstallButton() {
  const installBtn = document.getElementById('pwa-install-btn');
  if (installBtn) {
    installBtn.style.display = 'flex';
  }
}

// Hide install button
function hideInstallButton() {
  const installBtn = document.getElementById('pwa-install-btn');
  if (installBtn) {
    installBtn.style.display = 'none';
  }
}

// Prompt install
async function promptInstall() {
  if (!deferredPrompt) {
    console.log('[PWA] Install prompt not available');
    showNotification('Gunakan menu browser untuk install app', 'info');
    return;
  }

  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  console.log('[PWA] User choice:', outcome);
  
  if (outcome === 'accepted') {
    console.log('[PWA] User accepted install');
  } else {
    console.log('[PWA] User dismissed install');
  }
  
  deferredPrompt = null;
}

// Show update available notification
function showUpdateAvailable() {
  const updateBanner = document.createElement('div');
  updateBanner.className = 'pwa-update-banner';
  updateBanner.innerHTML = `
    <div class="update-content">
      <i class="fas fa-sync-alt"></i>
      <span>Update baru tersedia!</span>
    </div>
    <button onclick="applyPWAUpdate()" class="btn-small btn-primary">
      Update Sekarang
    </button>
    <button onclick="this.parentElement.remove()" class="btn-small btn-secondary">
      <i class="fas fa-times"></i>
    </button>
  `;
  document.body.appendChild(updateBanner);
  
  setTimeout(() => {
    updateBanner.classList.add('show');
  }, 100);
}

// Apply PWA update
function applyPWAUpdate() {
  if (swRegistration && swRegistration.waiting) {
    swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
  }
}

// Request notification permission
async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    console.log('[PWA] Browser tidak support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    showNotification('Notification diblokir. Enable di settings browser.', 'error');
    return false;
  }

  // Request permission
  const permission = await Notification.requestPermission();
  
  if (permission === 'granted') {
    showNotification('Notification enabled! 🔔');
    // Subscribe to push notifications
    subscribeToPushNotifications();
    return true;
  } else {
    showNotification('Notification ditolak', 'error');
    return false;
  }
}

// Subscribe to push notifications
async function subscribeToPushNotifications() {
  if (!swRegistration) {
    console.error('[PWA] Service Worker not registered');
    return;
  }

  try {
    // Check if already subscribed
    let subscription = await swRegistration.pushManager.getSubscription();
    
    if (!subscription) {
      // Public VAPID key (generate yours at https://web-push-codelab.glitch.me/)
      const vapidPublicKey = 'YOUR_VAPID_PUBLIC_KEY_HERE';
      
      // Subscribe
      subscription = await swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });
    }

    console.log('[PWA] Push subscription:', subscription);

    // Send subscription to server
    await fetch('/api/pwa/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription)
    });

    console.log('[PWA] Subscription sent to server');
  } catch (error) {
    console.error('[PWA] Failed to subscribe to push:', error);
  }
}

// Helper to convert VAPID key
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Show local notification (fallback if push not available)
function showLocalNotification(title, options = {}) {
  if (!('Notification' in window)) {
    return;
  }

  if (Notification.permission === 'granted') {
    new Notification(title, {
      icon: '/icons/iconme.png',
      badge: '/icons/iconme.png',
      ...options
    });
  }
}

// Check connection status
function updateOnlineStatus() {
  const isOnline = navigator.onLine;
  const statusIndicator = document.getElementById('pwa-status-indicator');
  
  if (statusIndicator) {
    if (isOnline) {
      statusIndicator.classList.remove('offline');
      statusIndicator.innerHTML = '<i class="fas fa-wifi"></i> Online';
    } else {
      statusIndicator.classList.add('offline');
      statusIndicator.innerHTML = '<i class="fas fa-wifi-slash"></i> Offline';
      showNotification('Anda sedang offline. Beberapa fitur terbatas.', 'warning');
    }
  }
}

// Add connection listeners
window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);

// Initialize PWA when DOM loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPWA);
} else {
  initPWA();
}

// Expose functions globally
window.promptInstall = promptInstall;
window.applyPWAUpdate = applyPWAUpdate;
window.requestNotificationPermission = requestNotificationPermission;
window.showLocalNotification = showLocalNotification;

console.log('[PWA] Helper loaded');

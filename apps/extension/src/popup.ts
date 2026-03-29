import { MESSAGE_TYPES, STORAGE_KEYS } from './utils/constants';
import type { SessionStats } from './services/storage';

interface StatusResponse {
  authenticated: boolean;
  stats: SessionStats | null;
  paused: boolean;
}

const DASHBOARD_URL = 'https://marketpricebr.com';

function $(id: string): HTMLElement | null {
  return document.getElementById(id);
}

function show(el: HTMLElement | null): void {
  if (el) el.style.display = '';
}

function hide(el: HTMLElement | null): void {
  if (el) el.style.display = 'none';
}

function sendMessage<T>(msg: Record<string, unknown>): Promise<T> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(msg, (response: T) => resolve(response));
  });
}

function animateCount(el: HTMLElement, target: number): void {
  const current = parseInt(el.textContent ?? '0', 10);
  if (current === target) return;

  const diff = target - current;
  const steps = Math.min(Math.abs(diff), 20);
  const increment = diff / steps;
  let step = 0;

  const timer = setInterval(() => {
    step++;
    if (step >= steps) {
      el.textContent = String(target);
      clearInterval(timer);
    } else {
      el.textContent = String(Math.round(current + increment * step));
    }
  }, 30);
}

function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0]?.charAt(0) ?? '?';
  if (parts.length >= 2) {
    const last = parts[parts.length - 1]?.charAt(0) ?? '';
    return (first + last).toUpperCase();
  }
  return first.toUpperCase();
}

async function renderStatus(): Promise<void> {
  const loginSection = $('login-section');
  const dashSection = $('dash-section');

  const status = await sendMessage<StatusResponse>({ type: MESSAGE_TYPES.GET_STATUS });

  if (!status.authenticated) {
    show(loginSection);
    hide(dashSection);
    return;
  }

  hide(loginSection);
  show(dashSection);

  // Show user info
  const userInfoEl = $('user-info');
  const userAvatarEl = $('user-avatar');
  const userNameEl = $('user-name');

  try {
    const stored = await chrome.storage.local.get(STORAGE_KEYS.USER);
    const user = stored[STORAGE_KEYS.USER] as { name?: string; email?: string } | null;
    if (user && (user.name || user.email)) {
      const displayName = user.name || user.email || 'Usuário';
      if (userAvatarEl) userAvatarEl.textContent = getInitials(displayName);
      if (userNameEl) userNameEl.textContent = displayName;
      show(userInfoEl);
    }
  } catch {
    // ignore
  }

  // Status indicator
  const statusDot = $('status-dot');
  const statusText = $('status-text');

  if (status.paused) {
    statusDot?.classList.remove('active');
    statusDot?.classList.add('paused');
    if (statusText) statusText.textContent = 'Pausado';
  } else {
    statusDot?.classList.remove('paused');
    statusDot?.classList.add('active');
    if (statusText) statusText.textContent = 'Capturando';
  }

  // Check if on marketplace and detect page type
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    const tabUrl = tab?.url ?? '';
    const isMarketplace = tabUrl.includes('facebook.com/marketplace');
    const isItemPage = tabUrl.includes('/marketplace/item/');

    if (!isMarketplace && statusDot && statusText) {
      statusDot.classList.remove('active', 'paused');
      statusDot.classList.add('inactive');
      statusText.textContent = 'Fora do Marketplace';
    }

    // Show capture mode indicator
    const captureModeEl = $('capture-mode');
    if (captureModeEl && isMarketplace) {
      if (isItemPage) {
        captureModeEl.textContent = '\uD83D\uDCF8 Captura profunda ativa';
        captureModeEl.style.color = '#a78bfa';
      } else {
        captureModeEl.textContent = '\uD83D\uDD0D Captura de listagem ativa';
        captureModeEl.style.color = '#22c55e';
      }
      show(captureModeEl);
    } else if (captureModeEl) {
      hide(captureModeEl);
    }
  });

  // Stats
  const stats = status.stats;
  if (stats) {
    const capturedEl = $('stat-captured');
    const duplicatesEl = $('stat-duplicates');
    const outliersEl = $('stat-outliers');

    if (capturedEl) animateCount(capturedEl, stats.captured);
    if (duplicatesEl) animateCount(duplicatesEl, stats.duplicates);
    if (outliersEl) animateCount(outliersEl, stats.outliers);
  }

  // Deep capture count from storage
  try {
    const stored = await new Promise<Record<string, unknown>>((resolve) => {
      chrome.storage.local.get(STORAGE_KEYS.DEEP_CAPTURES, (result) => resolve(result));
    });
    const deepCount = (stored[STORAGE_KEYS.DEEP_CAPTURES] as number) ?? 0;
    const deepEl = $('stat-deep');
    if (deepEl) animateCount(deepEl, deepCount);
  } catch {
    // ignore storage read error
  }

  // Pause button
  const pauseBtn = $('btn-pause');
  if (pauseBtn) {
    pauseBtn.textContent = status.paused ? 'Retomar' : 'Pausar';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  renderStatus();

  // Open login page button
  $('btn-open-login')?.addEventListener('click', () => {
    chrome.tabs.create({ url: `${DASHBOARD_URL}/login` });
  });

  // Dashboard button
  $('btn-dashboard')?.addEventListener('click', () => {
    chrome.tabs.create({ url: DASHBOARD_URL });
  });

  // Pause toggle
  $('btn-pause')?.addEventListener('click', async () => {
    await sendMessage({ type: MESSAGE_TYPES.PAUSE_TOGGLE });
    await renderStatus();
  });

  // Logout (disconnect extension)
  $('btn-logout')?.addEventListener('click', async () => {
    await sendMessage({ type: MESSAGE_TYPES.LOGOUT });
    await renderStatus();
  });
});

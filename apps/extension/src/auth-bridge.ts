import { STORAGE_KEYS } from './utils/constants';

const ALLOWED_ORIGINS = [
  'https://marketpricebr.com',
  'https://www.marketpricebr.com',
  'http://localhost:5173',
  'http://localhost:5174',
];

window.addEventListener('message', (event) => {
  if (!ALLOWED_ORIGINS.includes(event.origin)) return;

  if (event.data?.type === 'MARKETPRICE_AUTH_TOKEN') {
    const { token, refreshToken, email, name } = event.data;
    if (!token) return;

    chrome.storage.local.set({
      [STORAGE_KEYS.TOKEN]: token,
      [STORAGE_KEYS.REFRESH_TOKEN]: refreshToken || '',
      [STORAGE_KEYS.USER]: { email: email || '', name: name || '' },
    }, () => {
      console.log('[MarketPrice Extension] Token recebido do dashboard');
      // Notify the page that the extension received the token
      window.postMessage({ type: 'MARKETPRICE_AUTH_ACK' }, '*');
    });
  }

  if (event.data?.type === 'MARKETPRICE_LOGOUT') {
    chrome.storage.local.remove(
      [STORAGE_KEYS.TOKEN, STORAGE_KEYS.REFRESH_TOKEN, STORAGE_KEYS.USER],
      () => {
        console.log('[MarketPrice Extension] Logout realizado');
      }
    );
  }
});

// On load, check if already authenticated and notify the page
chrome.storage.local.get([STORAGE_KEYS.TOKEN], (result) => {
  if (result[STORAGE_KEYS.TOKEN]) {
    window.postMessage({ type: 'MARKETPRICE_EXTENSION_READY', authenticated: true }, '*');
  } else {
    window.postMessage({ type: 'MARKETPRICE_EXTENSION_READY', authenticated: false }, '*');
  }
});

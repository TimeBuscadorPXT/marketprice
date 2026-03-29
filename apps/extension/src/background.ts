import { MESSAGE_TYPES, STORAGE_KEYS } from './utils/constants';
import { sendListings, sendDeepUpdate, login, isAuthenticated } from './services/api';
import { getSessionStats, saveSessionStats, clearAll, getIsPaused, setIsPaused } from './services/storage';
import type { SessionStats } from './services/storage';
import type { ScrapedListing } from './services/scraper';
import type { DeepListingData } from './services/deep-scraper';

function log(level: 'info' | 'warn' | 'error', msg: string, data?: unknown): void {
  const prefix = '[MarketPrice:BG]';
  if (level === 'info') console.log(prefix, msg, data ?? '');
  else if (level === 'warn') console.warn(prefix, msg, data ?? '');
  else console.error(prefix, msg, data ?? '');
}

async function getOrCreateStats(): Promise<SessionStats> {
  const stats = await getSessionStats();
  if (stats) return stats;

  const newStats: SessionStats = {
    captured: 0,
    duplicates: 0,
    outliers: 0,
    startedAt: new Date().toISOString(),
  };
  await saveSessionStats(newStats);
  return newStats;
}

async function handleDeepCapture(data: DeepListingData): Promise<void> {
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    log('warn', 'Nao autenticado, descartando deep capture');
    return;
  }

  log('info', `Processando deep capture: ${data.fbUrl}`);

  const result = await sendDeepUpdate(data);

  if (result) {
    // Track deep capture count in storage
    const stored = await chrome.storage.local.get(STORAGE_KEYS.DEEP_CAPTURES);
    const count = ((stored[STORAGE_KEYS.DEEP_CAPTURES] as number) ?? 0) + 1;
    await chrome.storage.local.set({ [STORAGE_KEYS.DEEP_CAPTURES]: count });
    log('info', `Deep capture processado com sucesso (total: ${count})`);
  }
}

async function handleListingsBatch(listings: ScrapedListing[]): Promise<void> {
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    log('warn', 'Nao autenticado, descartando batch');
    return;
  }

  log('info', `Processando batch de ${listings.length} anuncios`);

  // API auto-detects modelId from listing title via normalizer
  const result = await sendListings(listings.map((l) => ({
    title: l.title,
    price: l.price,
    region: l.region,
    fbUrl: l.fbUrl,
    imageUrl: l.imageUrl,
    condition: l.condition,
    description: l.description,
    sellerName: l.sellerName,
    photoCount: l.photoCount,
    publishedText: l.publishedText,
    daysOnMarket: l.daysOnMarket,
    hasShipping: l.hasShipping,
  })));

  if (result) {
    const stats = await getOrCreateStats();
    stats.captured += result.saved;
    stats.duplicates += result.duplicates;
    stats.outliers += result.outliers;
    await saveSessionStats(stats);
    log('info', `Batch processado: ${result.saved} salvos, ${result.duplicates} duplicados, ${result.outliers} outliers`);
  }
}

chrome.runtime.onInstalled.addListener(() => {
  log('info', 'Extensao MarketPrice instalada');
});

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  if (typeof message !== 'object' || message === null || !('type' in message)) {
    return true;
  }

  const msg = message as { type: string; listings?: ScrapedListing[]; email?: string; password?: string; data?: DeepListingData };

  switch (msg.type) {
    case MESSAGE_TYPES.MARKETPLACE_DETECTED:
      log('info', 'Marketplace detectado');
      sendResponse({ status: 'ok' });
      break;

    case MESSAGE_TYPES.LISTINGS_CAPTURED:
      if (msg.listings && msg.listings.length > 0) {
        handleListingsBatch(msg.listings)
          .then(() => sendResponse({ status: 'ok' }))
          .catch((err) => {
            log('error', 'Erro no batch', err);
            sendResponse({ status: 'error' });
          });
        return true; // keep channel open for async
      }
      sendResponse({ status: 'empty' });
      break;

    case MESSAGE_TYPES.DEEP_CAPTURE:
      if (msg.data) {
        handleDeepCapture(msg.data)
          .then(() => sendResponse({ status: 'ok' }))
          .catch((err) => {
            log('error', 'Erro no deep capture', err);
            sendResponse({ status: 'error' });
          });
        return true;
      }
      sendResponse({ status: 'empty' });
      break;

    case MESSAGE_TYPES.LOGIN:
      if (msg.email && msg.password) {
        login(msg.email, msg.password)
          .then((result) => sendResponse(result))
          .catch((err) => {
            log('error', 'Erro no login', err);
            sendResponse({ success: false, error: 'Erro interno' });
          });
        return true;
      }
      sendResponse({ success: false, error: 'Email e senha obrigatorios' });
      break;

    case MESSAGE_TYPES.LOGOUT:
      clearAll()
        .then(() => {
          log('info', 'Logout realizado');
          sendResponse({ status: 'ok' });
        })
        .catch(() => sendResponse({ status: 'error' }));
      return true;

    case MESSAGE_TYPES.GET_STATUS:
      Promise.all([isAuthenticated(), getSessionStats(), getIsPaused()])
        .then(([auth, stats, paused]) => {
          sendResponse({ authenticated: auth, stats, paused });
        })
        .catch(() => sendResponse({ authenticated: false, stats: null, paused: false }));
      return true;

    case MESSAGE_TYPES.PAUSE_TOGGLE:
      getIsPaused()
        .then((current) => {
          const next = !current;
          return setIsPaused(next).then(() => sendResponse({ paused: next }));
        })
        .catch(() => sendResponse({ paused: false }));
      return true;

    default:
      sendResponse({ status: 'unknown' });
  }

  return true;
});

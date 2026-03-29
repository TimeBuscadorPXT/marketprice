import { extractListings, ScrapedListing } from './services/scraper';
import { extractDeepListingData } from './services/deep-scraper';
import { MESSAGE_TYPES, BATCH_SIZE, BATCH_INTERVAL_MS } from './utils/constants';

const capturedUrls = new Set<string>();
let pendingListings: ScrapedListing[] = [];
let batchTimer: ReturnType<typeof setTimeout> | null = null;
let isPaused = false;
let currentMode: 'list' | 'item' | 'none' = 'none';
let observer: MutationObserver | null = null;
let scrollHandler: (() => void) | null = null;
let deepCaptureTimer: ReturnType<typeof setTimeout> | null = null;

function log(level: 'info' | 'warn' | 'error', msg: string, data?: unknown): void {
  const prefix = '[MarketPrice]';
  if (level === 'info') console.log(prefix, msg, data ?? '');
  else if (level === 'warn') console.warn(prefix, msg, data ?? '');
  else console.error(prefix, msg, data ?? '');
}

function getPageMode(): 'list' | 'item' | 'none' {
  const url = window.location.href;
  if (!url.includes('facebook.com/marketplace')) return 'none';
  if (url.includes('/marketplace/item/')) return 'item';
  return 'list';
}

function processVisibleListings(): void {
  if (isPaused) return;

  try {
    const listings = extractListings();
    let newCount = 0;

    for (const listing of listings) {
      if (capturedUrls.has(listing.fbUrl)) continue;
      capturedUrls.add(listing.fbUrl);
      pendingListings.push(listing);
      newCount++;
    }

    if (newCount > 0) {
      log('info', `${newCount} novos anuncios detectados (pendentes: ${pendingListings.length})`);
    }

    if (pendingListings.length >= BATCH_SIZE) {
      flushBatch();
    } else if (newCount > 0) {
      resetBatchTimer();
    }
  } catch (err) {
    log('error', 'Erro ao processar anuncios', err);
  }
}

function flushBatch(): void {
  if (pendingListings.length === 0) return;

  const batch = [...pendingListings];
  pendingListings = [];

  log('info', `Enviando batch de ${batch.length} anuncios`);

  chrome.runtime.sendMessage({
    type: MESSAGE_TYPES.LISTINGS_CAPTURED,
    listings: batch,
  });

  resetBatchTimer();
}

function resetBatchTimer(): void {
  if (batchTimer) clearTimeout(batchTimer);
  batchTimer = setTimeout(() => {
    flushBatch();
  }, BATCH_INTERVAL_MS);
}

function startListMode(): void {
  log('info', 'Modo lista ativado — monitorando anuncios');

  // Initial scan
  setTimeout(() => processVisibleListings(), 1500);

  // MutationObserver for new DOM nodes (infinite scroll, dynamic loading)
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  observer = new MutationObserver(() => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      processVisibleListings();
    }, 500);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Scroll listener — FB sometimes lazy-loads cards on scroll without DOM mutations
  scrollHandler = () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      processVisibleListings();
    }, 800);
  };
  window.addEventListener('scroll', scrollHandler, { passive: true });

  // Periodic scan as fallback — catches anything the observer/scroll misses
  const periodicScan = setInterval(() => {
    if (getPageMode() !== 'list') {
      clearInterval(periodicScan);
      return;
    }
    processVisibleListings();
  }, 5000);

  resetBatchTimer();
}

function startItemMode(): void {
  log('info', 'Modo item ativado — captura profunda');
  deepCaptureTimer = setTimeout(() => attemptDeepCapture(), 2000);
}

function stopCurrentMode(): void {
  // Flush any pending listings before switching modes
  flushBatch();

  if (observer) {
    observer.disconnect();
    observer = null;
  }
  if (scrollHandler) {
    window.removeEventListener('scroll', scrollHandler);
    scrollHandler = null;
  }
  if (deepCaptureTimer) {
    clearTimeout(deepCaptureTimer);
    deepCaptureTimer = null;
  }
  currentMode = 'none';
}

function handleNavigation(): void {
  const newMode = getPageMode();
  if (newMode === currentMode) return;

  log('info', `Navegacao detectada: ${currentMode} → ${newMode}`);
  stopCurrentMode();
  currentMode = newMode;

  if (newMode === 'list') {
    startListMode();
  } else if (newMode === 'item') {
    startItemMode();
  }
}

function attemptDeepCapture(): void {
  try {
    const data = extractDeepListingData();
    if (data) {
      log('info', `[DEEP] Captura profunda: ${data.fbUrl} - ${data.photoUrls.length} fotos - descricao: ${data.fullDescription?.length ?? 0} chars`);
      chrome.runtime.sendMessage({
        type: MESSAGE_TYPES.DEEP_CAPTURE,
        data,
      });
    } else {
      log('warn', '[DEEP] Nenhum dado extraido da pagina de item');
    }
  } catch (err) {
    log('error', '[DEEP] Erro na captura profunda', err);
  }
}

// Listen for pause/resume from popup
chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  if (typeof message === 'object' && message !== null && 'type' in message) {
    const msg = message as { type: string; paused?: boolean };

    if (msg.type === MESSAGE_TYPES.PAUSE_TOGGLE) {
      isPaused = msg.paused ?? !isPaused;
      log('info', isPaused ? 'Captura pausada' : 'Captura retomada');
      sendResponse({ paused: isPaused });
    }
  }
  return true;
});

// Init — runs on ALL facebook.com pages, watches for marketplace navigation
(() => {
  let lastUrl = window.location.href;
  let marketplaceDetected = false;

  function checkAndActivate(): void {
    const isMarketplace = window.location.href.includes('facebook.com/marketplace');

    if (isMarketplace && !marketplaceDetected) {
      marketplaceDetected = true;
      log('info', 'Content script ativo no Facebook Marketplace');
      chrome.runtime.sendMessage({ type: MESSAGE_TYPES.MARKETPLACE_DETECTED });
    }

    if (isMarketplace) {
      handleNavigation();
    } else if (currentMode !== 'none') {
      // Left marketplace — stop everything
      stopCurrentMode();
    }
  }

  // Check initial page
  checkAndActivate();

  // Detect SPA navigation — Facebook uses pushState/replaceState
  const origPushState = history.pushState.bind(history);
  const origReplaceState = history.replaceState.bind(history);

  history.pushState = function (...args) {
    origPushState(...args);
    onUrlChange();
  };
  history.replaceState = function (...args) {
    origReplaceState(...args);
    onUrlChange();
  };

  window.addEventListener('popstate', onUrlChange);

  function onUrlChange(): void {
    const newUrl = window.location.href;
    if (newUrl !== lastUrl) {
      lastUrl = newUrl;
      // Delay to let FB render the new page
      setTimeout(() => checkAndActivate(), 1000);
    }
  }

  // Fallback: poll URL every 2s in case pushState patching misses something
  setInterval(() => {
    const newUrl = window.location.href;
    if (newUrl !== lastUrl) {
      lastUrl = newUrl;
      setTimeout(() => handleNavigation(), 1000);
    }
  }, 2000);
})();

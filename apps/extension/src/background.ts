chrome.runtime.onInstalled.addListener(() => {
  console.log('[MarketPrice] Extension installed');
});

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  if (typeof message === 'object' && message !== null && 'type' in message) {
    const msg = message as { type: string };
    if (msg.type === 'PING') {
      sendResponse({ status: 'ok' });
    }
  }
  return true;
});

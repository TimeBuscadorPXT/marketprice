(() => {
  const isMarketplace = window.location.href.includes('facebook.com/marketplace');

  if (!isMarketplace) return;

  console.log('[MarketPrice] Content script loaded on Facebook Marketplace');

  chrome.runtime.sendMessage({ type: 'MARKETPLACE_DETECTED' });
})();

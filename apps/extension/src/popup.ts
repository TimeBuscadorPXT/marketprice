document.addEventListener('DOMContentLoaded', () => {
  const statusEl = document.getElementById('status');
  if (!statusEl) return;

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    const isMarketplace = tab?.url?.includes('facebook.com/marketplace') ?? false;

    if (isMarketplace) {
      statusEl.textContent = 'Ativo no Marketplace';
      statusEl.className = 'active';
    } else {
      statusEl.textContent = 'Navegue ate o Facebook Marketplace para ativar';
    }
  });
});

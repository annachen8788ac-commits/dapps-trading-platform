(() => {
  const STORAGE = {
    page: 'dapps:lastPage',
    market: 'dapps:lastMarket',
    duration: 'dapps:lastDuration',
    direction: 'dapps:lastDirection',
    timeframe: 'dapps:lastTimeframe',
    watchlist: 'dapps:watchlist'
  };
  const validPages = new Set(['home','markets','trade','pledge','assets']);

  function safeGet(key, fallback = null){
    try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
  }
  function safeSet(key, value){
    try { localStorage.setItem(key, String(value)); } catch {}
  }

  // Persist page navigation and keep the URL hash in sync.
  const baseNavigate = window.navigate;
  if(typeof baseNavigate === 'function'){
    window.navigate = function(name){
      if(!validPages.has(name)) name = 'markets';
      safeSet(STORAGE.page, name);
      if(location.hash !== `#${name}`){
        history.replaceState(null, '', `${location.pathname}${location.search}#${name}`);
      }
      return baseNavigate(name);
    };
  }

  // Persist the selected market so Trade refreshes on the same symbol.
  const baseSelectMarket = window.selectMarket;
  if(typeof baseSelectMarket === 'function'){
    window.selectMarket = function(m){
      if(m?.symbol) safeSet(STORAGE.market, m.symbol);
      return baseSelectMarket(m);
    };
  }

  // Existing handlers were bound before this script loaded, so also persist from clicks.
  document.querySelectorAll('[data-nav]').forEach(el => {
    el.addEventListener('click', () => {
      const page = el.dataset.nav;
      if(validPages.has(page)){
        safeSet(STORAGE.page, page);
        history.replaceState(null, '', `${location.pathname}${location.search}#${page}`);
      }
    });
  });

  // Duration + direction persistence.
  document.querySelectorAll('[data-duration]').forEach(btn => {
    btn.addEventListener('click', () => safeSet(STORAGE.duration, btn.dataset.duration));
  });
  document.querySelector('#up-btn')?.addEventListener('click', () => safeSet(STORAGE.direction, 'up'));
  document.querySelector('#down-btn')?.addEventListener('click', () => safeSet(STORAGE.direction, 'down'));
  document.querySelectorAll('.timeframes button').forEach(btn => {
    btn.addEventListener('click', () => safeSet(STORAGE.timeframe, btn.textContent.trim()));
  });

  // Make the star genuinely interactive and persistent per market.
  const star = document.querySelector('.watch-star');
  function getWatchlist(){
    try { return new Set(JSON.parse(safeGet(STORAGE.watchlist, '[]'))); } catch { return new Set(); }
  }
  function renderStar(){
    if(!star || !window.currentMarket) return;
    const watched = getWatchlist().has(window.currentMarket.symbol);
    star.textContent = watched ? '★' : '☆';
    star.classList.toggle('watched', watched);
    star.title = watched ? 'Remove from watchlist' : 'Add to watchlist';
  }
  if(star){
    star.setAttribute('role','button');
    star.setAttribute('tabindex','0');
    const toggleStar = () => {
      if(!window.currentMarket) return;
      const list = getWatchlist();
      const symbol = window.currentMarket.symbol;
      if(list.has(symbol)){
        list.delete(symbol);
        showToast(`${symbol} removed from watchlist.`);
      }else{
        list.add(symbol);
        showToast(`${symbol} added to watchlist.`);
      }
      safeSet(STORAGE.watchlist, JSON.stringify([...list]));
      renderStar();
    };
    star.addEventListener('click', toggleStar);
    star.addEventListener('keydown', e => { if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); toggleStar(); } });
  }

  // Header and asset buttons should always respond when clicked.
  document.querySelectorAll('.top-actions .primary-btn, #page-assets > .page-header .primary-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if(typeof window.navigate === 'function') window.navigate('assets');
      showToast('Deposit is not enabled in this demo build yet.');
    });
  });
  document.querySelector('.top-actions .ghost-btn')?.addEventListener('click', () => showToast('Support center will open here.'));
  document.querySelector('.avatar-btn')?.addEventListener('click', () => showToast('Profile center will open here.'));

  // Active Trades / Trade History tabs are clickable.
  const tabs = [...document.querySelectorAll('.positions-heading .tab-row button')];
  const positionsList = document.querySelector('#positions-list');
  const positionsHead = document.querySelector('.positions-table-head');
  tabs.forEach((btn, index) => {
    btn.addEventListener('click', () => {
      tabs.forEach(x => x.classList.remove('active'));
      btn.classList.add('active');
      if(index === 0){
        if(positionsHead) positionsHead.style.display = '';
        if(typeof window.renderPositions === 'function') window.renderPositions();
      }else{
        if(positionsHead) positionsHead.style.display = 'none';
        if(positionsList){
          positionsList.className = 'positions-list empty-state';
          positionsList.textContent = 'No completed trade history yet.';
        }
      }
    });
  });

  // Restore state after app.js/chart-pro.js have initialized.
  function restoreState(){
    const savedMarket = safeGet(STORAGE.market);
    if(savedMarket && Array.isArray(window.markets)){
      const found = window.markets.find(m => m.symbol === savedMarket);
      if(found && typeof window.selectMarket === 'function') window.selectMarket(found);
    }

    const savedDuration = Number(safeGet(STORAGE.duration, '60'));
    const durationBtn = document.querySelector(`[data-duration="${savedDuration}"]`);
    if(durationBtn) durationBtn.click();

    const savedDirection = safeGet(STORAGE.direction, 'up');
    document.querySelector(savedDirection === 'down' ? '#down-btn' : '#up-btn')?.click();

    const savedTf = safeGet(STORAGE.timeframe, '1H');
    const tfBtn = [...document.querySelectorAll('.timeframes button')].find(b => b.textContent.trim() === savedTf);
    if(tfBtn) tfBtn.click();

    renderStar();

    const hashPage = location.hash.replace('#','');
    const savedPage = validPages.has(hashPage) ? hashPage : safeGet(STORAGE.page, 'markets');
    if(typeof window.navigate === 'function') window.navigate(validPages.has(savedPage) ? savedPage : 'markets');
  }

  // Hash navigation also works with browser back/forward or manual hash changes.
  window.addEventListener('hashchange', () => {
    const page = location.hash.replace('#','');
    if(validPages.has(page) && typeof window.navigate === 'function') window.navigate(page);
  });

  setTimeout(restoreState, 0);
})();
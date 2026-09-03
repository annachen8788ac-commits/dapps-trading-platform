(() => {
  const STORAGE = { page:'dapps:lastPage',market:'dapps:lastMarket',duration:'dapps:lastDuration',direction:'dapps:lastDirection',timeframe:'dapps:lastTimeframe',watchlist:'dapps:watchlist' };
  const validPages = new Set(['home','markets','trade','pledge','assets']);
  function safeGet(key,fallback=null){try{return localStorage.getItem(key)??fallback}catch{return fallback}}
  function safeSet(key,value){try{localStorage.setItem(key,String(value))}catch{}}

  const baseNavigate=navigate;
  navigate=function(name){if(!validPages.has(name))name='markets';safeSet(STORAGE.page,name);if(location.hash!==`#${name}`)history.replaceState(null,'',`${location.pathname}${location.search}#${name}`);return baseNavigate(name)};
  const baseSelectMarket=selectMarket;
  selectMarket=function(m){if(m?.symbol)safeSet(STORAGE.market,m.symbol);const result=baseSelectMarket(m);renderStar();return result};
  document.querySelectorAll('[data-nav]').forEach(el=>el.addEventListener('click',()=>{const page=el.dataset.nav;if(validPages.has(page))safeSet(STORAGE.page,page)}));
  document.querySelectorAll('[data-duration]').forEach(btn=>btn.addEventListener('click',()=>safeSet(STORAGE.duration,btn.dataset.duration)));
  document.querySelector('#up-btn')?.addEventListener('click',()=>safeSet(STORAGE.direction,'up'));
  document.querySelector('#down-btn')?.addEventListener('click',()=>safeSet(STORAGE.direction,'down'));
  document.querySelectorAll('.timeframes button').forEach(btn=>btn.addEventListener('click',()=>safeSet(STORAGE.timeframe,btn.textContent.trim())));

  const star=document.querySelector('.watch-star');
  function getWatchlist(){try{return new Set(JSON.parse(safeGet(STORAGE.watchlist,'[]')))}catch{return new Set()}}
  function renderStar(){if(!star||typeof currentMarket==='undefined'||!currentMarket)return;const watched=getWatchlist().has(currentMarket.symbol);star.textContent=watched?'★':'☆';star.classList.toggle('watched',watched);star.title=watched?'Remove from watchlist':'Add to watchlist'}
  if(star){star.setAttribute('role','button');star.setAttribute('tabindex','0');const toggleStar=()=>{if(typeof currentMarket==='undefined'||!currentMarket)return;const list=getWatchlist(),symbol=currentMarket.symbol;if(list.has(symbol)){list.delete(symbol);showToast(`${symbol} removed from watchlist.`)}else{list.add(symbol);showToast(`${symbol} added to watchlist.`)}safeSet(STORAGE.watchlist,JSON.stringify([...list]));renderStar()};star.addEventListener('click',toggleStar);star.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggleStar()}})}

  document.querySelectorAll('.top-actions .primary-btn, #page-assets > .page-header .primary-btn').forEach(btn=>{btn.textContent='Deposit';btn.addEventListener('click',()=>{location.href=localStorage.getItem('dapps:token')?'deposit.html':'login.html'})});
  const assetsHeader=document.querySelector('#page-assets > .page-header');
  if(assetsHeader&&!assetsHeader.querySelector('.wallet-actions')){
    const currentDeposit=assetsHeader.querySelector('.primary-btn');
    if(currentDeposit){const wrap=document.createElement('div');wrap.className='wallet-actions';wrap.style.cssText='display:flex;gap:8px;flex-wrap:wrap';currentDeposit.parentNode.insertBefore(wrap,currentDeposit);wrap.appendChild(currentDeposit);const withdraw=document.createElement('button');withdraw.className='ghost-btn';withdraw.textContent='Withdraw';withdraw.onclick=()=>{location.href=localStorage.getItem('dapps:token')?'withdraw.html':'login.html'};wrap.appendChild(withdraw)}
  }

  const supportBtn=document.querySelector('.top-actions .ghost-btn');if(supportBtn){supportBtn.textContent='Support';supportBtn.addEventListener('click',()=>{location.href='support.html'})}
  const avatarBtn=document.querySelector('.avatar-btn');if(avatarBtn){try{const user=JSON.parse(localStorage.getItem('dapps:user')||'null');if(user?.displayName)avatarBtn.textContent=user.displayName.slice(0,1).toUpperCase();avatarBtn.title=localStorage.getItem('dapps:token')?'Profile':'Sign in'}catch{}avatarBtn.addEventListener('click',()=>{location.href=localStorage.getItem('dapps:token')?'profile.html':'login.html'})}

  const tabs=[...document.querySelectorAll('.positions-heading .tab-row button')],positionsList=document.querySelector('#positions-list'),positionsHead=document.querySelector('.positions-table-head');tabs.forEach((btn,index)=>btn.addEventListener('click',()=>{tabs.forEach(x=>x.classList.remove('active'));btn.classList.add('active');if(index===0){if(positionsHead)positionsHead.style.display='';renderPositions()}else{if(positionsHead)positionsHead.style.display='none';if(positionsList){positionsList.className='positions-list empty-state';positionsList.textContent='No completed trade history yet.'}}}));

  async function syncWalletBalance(){
    const token=localStorage.getItem('dapps:token');if(!token)return;
    const API=localStorage.getItem('dapps:apiBase')||'https://dapps-trading-platform-production.up.railway.app';
    try{const r=await fetch(API+'/api/wallet',{headers:{Authorization:'Bearer '+token}});if(!r.ok)return;const d=await r.json();if(typeof balance!=='undefined'){balance=Number(d.balance.available)||0;updateBalances()}const total=document.querySelector('#page-assets .balance-card:first-child strong');if(total&&typeof totalPledged!=='undefined')total.textContent='$'+fmt(balance+Number(totalPledged||0));}catch{}
  }

  function restoreState(){const savedMarket=safeGet(STORAGE.market);if(savedMarket&&Array.isArray(markets)){const found=markets.find(m=>m.symbol===savedMarket);if(found)selectMarket(found)}const savedDuration=Number(safeGet(STORAGE.duration,'60'));document.querySelector(`[data-duration="${savedDuration}"]`)?.click();const savedDirection=safeGet(STORAGE.direction,'up');document.querySelector(savedDirection==='down'?'#down-btn':'#up-btn')?.click();const savedTf=safeGet(STORAGE.timeframe,'1H');const tfBtn=[...document.querySelectorAll('.timeframes button')].find(b=>b.textContent.trim()===savedTf);if(tfBtn)tfBtn.click();renderStar();const hashPage=location.hash.replace('#',''),savedPage=validPages.has(hashPage)?hashPage:safeGet(STORAGE.page,'markets');navigate(validPages.has(savedPage)?savedPage:'markets');syncWalletBalance()}
  window.addEventListener('hashchange',()=>{const page=location.hash.replace('#','');if(validPages.has(page))navigate(page)});setTimeout(restoreState,0);
})();
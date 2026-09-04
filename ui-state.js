(() => {
  const STORAGE = { page:'dapps:lastPage',market:'dapps:lastMarket',duration:'dapps:lastDuration',direction:'dapps:lastDirection',timeframe:'dapps:lastTimeframe',watchlist:'dapps:watchlist' };
  const validPages = new Set(['home','markets','trade','pledge','assets']);
  const demoId=new URLSearchParams(location.search).get('demo');
  const demoMode=Boolean(demoId);
  function safeGet(key,fallback=null){try{return localStorage.getItem(key)??fallback}catch{return fallback}}
  function safeSet(key,value){try{localStorage.setItem(key,String(value))}catch{}}

  function installBrand(){
    const mark=document.querySelector('.brand-mark');
    if(mark){mark.textContent='';mark.setAttribute('aria-label','DApps Platform');mark.innerHTML='<span class="dp-logo-shape"><i></i><i></i></span>'}
    const style=document.createElement('style');
    style.textContent=`.brand-mark{position:relative;overflow:hidden;background:linear-gradient(145deg,#081b33,#0d315a)!important;border:1px solid rgba(95,179,255,.5)!important;box-shadow:0 8px 26px rgba(31,129,255,.25)!important}.dp-logo-shape{position:relative;display:block;width:25px;height:25px;transform:rotate(45deg)}.dp-logo-shape:before,.dp-logo-shape:after,.dp-logo-shape i{content:"";position:absolute;border:3px solid #72c7ff;border-radius:4px}.dp-logo-shape:before{inset:1px 10px 10px 1px}.dp-logo-shape:after{inset:10px 1px 1px 10px;border-color:#3188ff}.dp-logo-shape i:first-child{width:7px;height:7px;right:1px;top:1px;border-color:#fff}.dp-logo-shape i:last-child{width:7px;height:7px;left:1px;bottom:1px;border-color:#48e0d0}.brand-copy strong{font-weight:800!important;letter-spacing:-.035em}.brand-copy span{letter-spacing:.04em}`;
    document.head.appendChild(style);
  }

  function demoBalanceKey(){return 'dapps:demoBalance:v3:'+demoId}
  function readDemoBalance(){
    let raw=null;try{raw=sessionStorage.getItem(demoBalanceKey())}catch{}
    const n=raw===null?50000:Number(raw);
    const value=Number.isFinite(n)?n:50000;
    try{if(raw===null)sessionStorage.setItem(demoBalanceKey(),String(value))}catch{}
    return value;
  }
  function syncSimulationBalance(){
    if(!demoMode||typeof balance==='undefined')return;
    balance=readDemoBalance();
    if(typeof totalPledged!=='undefined'&&!Number.isFinite(Number(totalPledged)))totalPledged=0;
    if(typeof updateBalances==='function')updateBalances();
    const total=balance+Number(typeof totalPledged!=='undefined'?totalPledged:0||0);
    const homeTotal=document.querySelector('#home-total-assets');if(homeTotal)homeTotal.textContent='$'+Number(total).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
    const homeAvailable=document.querySelector('#home-available');if(homeAvailable)homeAvailable.textContent='$'+Number(balance).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
    const note=document.querySelector('.asset-main small');if(note){note.textContent='Simulation Account · 50,000 USDT starting balance';note.className='positive'}
    const available=document.querySelector('#available-balance');if(available)available.textContent=Number(balance).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})+' USDT';
    const badge=document.querySelector('.demo-pill');if(badge)badge.textContent='SIMULATION';
  }

  installBrand();
  if(demoMode)syncSimulationBalance();

  const baseNavigate=navigate;
  navigate=function(name){if(!validPages.has(name))name='home';safeSet(STORAGE.page,name);if(location.hash!==`#${name}`)history.replaceState(null,'',`${location.pathname}${location.search}#${name}`);const result=baseNavigate(name);if(demoMode)setTimeout(syncSimulationBalance,0);return result};
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

  document.querySelectorAll('.top-actions .primary-btn, #page-assets > .page-header .primary-btn').forEach(btn=>{btn.textContent='Deposit';btn.addEventListener('click',()=>{if(demoMode)return showToast('Simulation accounts do not use deposits.');location.href=localStorage.getItem('dapps:token')?'deposit.html':'login.html'})});
  const assetsHeader=document.querySelector('#page-assets > .page-header');
  if(assetsHeader&&!assetsHeader.querySelector('.wallet-actions')){
    const currentDeposit=assetsHeader.querySelector('.primary-btn');
    if(currentDeposit){const wrap=document.createElement('div');wrap.className='wallet-actions';wrap.style.cssText='display:flex;gap:8px;flex-wrap:wrap';currentDeposit.parentNode.insertBefore(wrap,currentDeposit);wrap.appendChild(currentDeposit);const withdraw=document.createElement('button');withdraw.className='ghost-btn';withdraw.textContent='Withdraw';withdraw.onclick=()=>{if(demoMode)return showToast('Simulation accounts do not use withdrawals.');location.href=localStorage.getItem('dapps:token')?'withdraw.html':'login.html'};wrap.appendChild(withdraw)}
  }

  const supportBtn=document.querySelector('.top-actions .ghost-btn');if(supportBtn){supportBtn.textContent='Support';supportBtn.addEventListener('click',()=>{location.href='support.html'})}
  const avatarBtn=document.querySelector('.avatar-btn');
  if(avatarBtn){
    if(demoMode){avatarBtn.textContent='S';avatarBtn.title='Simulation Account';avatarBtn.addEventListener('click',()=>{location.href='profile.html?demo='+encodeURIComponent(demoId)})}
    else{try{const user=JSON.parse(localStorage.getItem('dapps:user')||'null');if(user?.displayName)avatarBtn.textContent=user.displayName.slice(0,1).toUpperCase();avatarBtn.title=localStorage.getItem('dapps:token')?'Profile':'Sign in'}catch{}avatarBtn.addEventListener('click',()=>{location.href=localStorage.getItem('dapps:token')?'profile.html':'login.html'})}
  }

  const tabs=[...document.querySelectorAll('.positions-heading .tab-row button')],positionsList=document.querySelector('#positions-list'),positionsHead=document.querySelector('.positions-table-head');tabs.forEach((btn,index)=>btn.addEventListener('click',()=>{tabs.forEach(x=>x.classList.remove('active'));btn.classList.add('active');if(index===0){if(positionsHead)positionsHead.style.display='';renderPositions()}else{if(positionsHead)positionsHead.style.display='none';if(positionsList){positionsList.className='positions-list empty-state';positionsList.textContent='No completed trade history yet.'}}}));

  async function syncWalletBalance(){
    if(demoMode){syncSimulationBalance();return;}
    const token=localStorage.getItem('dapps:token');if(!token){if(typeof balance!=='undefined'){balance=0;if(typeof updateBalances==='function')updateBalances()}return;}
    const API=localStorage.getItem('dapps:apiBase')||'https://dapps-trading-platform-production.up.railway.app';
    try{const r=await fetch(API+'/api/wallet',{headers:{Authorization:'Bearer '+token}});if(!r.ok)return;const d=await r.json();if(typeof balance!=='undefined'){balance=Number(d.balance.available)||0;updateBalances()}const total=document.querySelector('#page-assets .balance-card:first-child strong');if(total&&typeof totalPledged!=='undefined')total.textContent='$'+fmt(balance+Number(totalPledged||0));}catch{}
  }

  function restoreState(){const savedMarket=safeGet(STORAGE.market);if(savedMarket&&Array.isArray(markets)){const found=markets.find(m=>m.symbol===savedMarket);if(found)selectMarket(found)}const savedDuration=Number(safeGet(STORAGE.duration,'60'));document.querySelector(`[data-duration="${savedDuration}"]`)?.click();const savedDirection=safeGet(STORAGE.direction,'up');document.querySelector(savedDirection==='down'?'#down-btn':'#up-btn')?.click();const savedTf=safeGet(STORAGE.timeframe,'1H');const tfBtn=[...document.querySelectorAll('.timeframes button')].find(b=>b.textContent.trim()===savedTf);if(tfBtn)tfBtn.click();renderStar();const hashPage=location.hash.replace('#',''),savedPage=validPages.has(hashPage)?hashPage:safeGet(STORAGE.page,'home');navigate(validPages.has(savedPage)?savedPage:'home');syncWalletBalance();if(demoMode){[50,150,400,900,1600].forEach(ms=>setTimeout(syncSimulationBalance,ms))}}
  window.addEventListener('hashchange',()=>{const page=location.hash.replace('#','');if(validPages.has(page))navigate(page)});
  window.addEventListener('pageshow',()=>{if(demoMode)syncSimulationBalance()});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&demoMode)syncSimulationBalance()});
  setTimeout(restoreState,0);
})();
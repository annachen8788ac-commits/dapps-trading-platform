/*
 * DApps Platform Core Runtime
 * Consolidated from: trade-icons.js, app.js, demo-session.js, market-catalog.js, chart-pro.js, market-trade-ui.js, real-market-data.js, terminal-market.js
 * Source order is intentionally preserved. Keep trade-rules.js separate.
 */
/* ===== trade-icons.js ===== */
// Resolution-independent market marks. Every shape is drawn locally as SVG.
(()=>{
  const marks={
    BTC:`<text x="32" y="44" text-anchor="middle" font-size="43" font-weight="800" fill="#fff">₿</text>`,
    ETH:`<path d="M32 8 17 33l15 8 15-8L32 8Z" fill="#eef3ff"/><path d="m17 37 15 19 15-19-15 8-15-8Z" fill="#bac7ff"/><path d="m32 8 15 25-15 8V8Zm0 37 15-8-15 19V45Z" fill="#8ea5ff"/>`,
    SOL:`<path d="M17 16h33l-7 7H10l7-7Zm4 13h33l-7 7H14l7-7Zm-7 13h33l-7 7H7l7-7Z" fill="#9cfbd0"/><path d="m10 23 7-7h33l-7 7H10Zm4 13 7-7h33l-7 7H14Zm-7 13 7-7h33l-7 7H7Z" fill="#b185ff" opacity=".7"/>`,
    BNB:`<path d="m32 11 8 8-8 8-8-8 8-8Zm-13 13 8 8-8 8-8-8 8-8Zm26 0 8 8-8 8-8-8 8-8Zm-13 13 8 8-8 8-8-8 8-8Zm0-12 7 7-7 7-7-7 7-7Z" fill="#fff1a7"/>`,
    XRP:`<path d="M13 19h9l10 10 10-10h9L37 33a7 7 0 0 1-10 0L13 19Zm0 26h9l10-10 10 10h9L37 31a7 7 0 0 0-10 0L13 45Z" fill="#fff"/>`,
    TRX:`<path d="M12 12 51 20 39 52 12 12Zm5 5 18 28 9-21-27-7Zm0 0 28 7-18 8-10-15Z" fill="none" stroke="#fff" stroke-width="2.4" stroke-linejoin="round"/>`,
    XAU:`<path d="m12 38 5-15h29l6 15-6 6H18l-6-6Zm5-15 5 14h25l-5-14H17Z" fill="#fff1a5"/><path d="M15 42h34M24 29h16" stroke="#b87110" stroke-width="2" stroke-linecap="round"/>`,
    XAG:`<path d="m12 38 5-15h29l6 15-6 6H18l-6-6Zm5-15 5 14h25l-5-14H17Z" fill="#f5faff"/><path d="M15 42h34M24 29h16" stroke="#8cacc2" stroke-width="2" stroke-linecap="round"/>`,
    LTC:`<text x="32" y="45" text-anchor="middle" font-size="43" font-weight="800" fill="#fff">Ł</text>`,
    DOGE:`<text x="32" y="44" text-anchor="middle" font-size="42" font-weight="800" fill="#fff">Ð</text>`,
    USDT:`<path d="M12 18h40v9H37v4c12 .6 19 2.1 19 5s-10 5.6-24 5.6S8 38.9 8 36s7-4.4 19-5v-4H12v-9Zm15 16c-6 .3-10 1-10 2s6 2 15 2 15-1 15-2-4-1.7-10-2v2H27v-2Z" fill="#fff"/>`
  };
  const colors={BTC:['#f5a523','#cb6d0e'],ETH:['#8b9df8','#4859aa'],SOL:['#623fd0','#172c4c'],BNB:['#e9b923','#a8750b'],XRP:['#242f42','#09121f'],TRX:['#ed424a','#a4112a'],XAU:['#efc85a','#926010'],XAG:['#b7c9d8','#667b8f'],LTC:['#4c86d5','#214b88'],DOGE:['#c4a957','#7e6625'],USDT:['#34bd9d','#167d68']};
  function icon(m){
    const code=String(m?.symbol||'').split('/')[0].toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,5)||'?';
    const [light,dark]=colors[code]||[/^#[0-9a-f]{6}$/i.test(m?.bg||'')?m.bg:'#3579c4','#11233c'];
    const mark=marks[code]||`<text x="32" y="40" text-anchor="middle" font-size="${code.length>3?17:code.length>2?22:29}" font-weight="800" fill="#fff">${code}</text>`;
    return `<svg class="market-symbol-svg" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><circle cx="32" cy="32" r="30" fill="${light}"/><path d="M5 39q25 17 54-13a30 30 0 0 1-54 13Z" fill="${dark}" opacity=".62"/><circle cx="32" cy="32" r="29" fill="none" stroke="#fff" stroke-opacity=".28"/><path d="M14 15Q31 3 49 17" fill="none" stroke="#fff" stroke-opacity=".24" stroke-width="2" stroke-linecap="round"/>${mark}</svg>`;
  }
  window.tradeIconHTML=icon;
  window.paintTradeIcon=(el,m)=>{if(el){el.textContent='';el.style.background='transparent';el.innerHTML=icon(m)}};
  const style=document.createElement('style');
  style.textContent=`.market-symbol-svg{display:block;width:100%;height:100%;flex:none;overflow:visible;shape-rendering:geometricPrecision}.coin-icon:has(.market-symbol-svg),.mini-icon:has(.market-symbol-svg){background:transparent!important;overflow:visible!important}.coin-icon.large{width:48px!important;height:48px!important;box-shadow:none!important}.trade-quick-market{display:inline-flex;align-items:center;gap:7px}.trade-quick-market .market-symbol-svg{width:20px;height:20px}.pair-item .mini-icon{overflow:visible!important}.direction-btn span svg{display:block;width:24px;height:24px}.mobile-nav .trade-center span svg{display:block;width:27px;height:27px;margin:auto}@media(max-width:720px){.coin-icon.large{width:42px!important;height:42px!important}}`;
  document.head.appendChild(style);
})();

/* ===== app.js ===== */
const markets = [
  {symbol:'BTC/USDT',name:'Bitcoin',icon:'BTC',price:0,change:0,high:0,low:0,type:'crypto',bg:'#f7931a'},
  {symbol:'ETH/USDT',name:'Ethereum',icon:'ETH',price:0,change:0,high:0,low:0,type:'crypto',bg:'#627eea'},
  {symbol:'USDT/USDT',name:'Tether',icon:'USDT',price:1,change:0,high:1,low:1,type:'crypto',bg:'#34bd9d'},
  {symbol:'BNB/USDT',name:'BNB',icon:'BNB',price:0,change:0,high:0,low:0,type:'crypto',bg:'#c99b14'},
  {symbol:'SOL/USDT',name:'Solana',icon:'SOL',price:0,change:0,high:0,low:0,type:'crypto',bg:'#6d4cd8'},
  {symbol:'XRP/USDT',name:'XRP',icon:'XRP',price:0,change:0,high:0,low:0,type:'crypto',bg:'#111111'},
  {symbol:'DOGE/USDT',name:'Dogecoin',icon:'DOGE',price:0,change:0,high:0,low:0,type:'crypto',bg:'#9f842c'},
  {symbol:'ADA/USDT',name:'Cardano',icon:'ADA',price:0,change:0,high:0,low:0,type:'crypto',bg:'#3468d4'},
  {symbol:'AVAX/USDT',name:'Avalanche',icon:'AVAX',price:0,change:0,high:0,low:0,type:'crypto',bg:'#e84142'},
  {symbol:'LINK/USDT',name:'Chainlink',icon:'LINK',price:0,change:0,high:0,low:0,type:'crypto',bg:'#2a5ada'},
  {symbol:'LTC/USDT',name:'Litecoin',icon:'LTC',price:0,change:0,high:0,low:0,type:'crypto',bg:'#345d9d'}
]
window.markets=markets;
const demoSessionId=new URLSearchParams(location.search).get('demo');
const isDemoSession=Boolean(demoSessionId);
let currentMarket=markets[0],direction='up',duration=60,balance=isDemoSession?50000:0,totalPledged=0,selectedPledge={product:'Flexible',min:100};
const profitRates=window.DAppsTradeSpec.rates;
const minimumTradeAmounts=window.DAppsTradeSpec.minimums;
const $=s=>document.querySelector(s),$$=s=>document.querySelectorAll(s);const fmt=(n,d=2)=>Number(n).toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d});
function decimals(v){return v<1?6:v<100?4:2}
function renderMarkets(filter='all'){const list=$('#market-list');list.innerHTML='';markets.filter(m=>filter==='all'||m.type===filter).forEach(m=>{const row=document.createElement('div');row.className='market-row';row.innerHTML=`<div class="market-name"><span class="coin-icon small">${tradeIconHTML(m)}</span><div><strong>${m.symbol}</strong><small class="muted" style="display:block;margin-top:3px">${m.name}</small></div></div><strong>${fmt(m.price,decimals(m.price))}</strong><strong class="${m.change>=0?'positive':'negative'}">${m.change>=0?'+':''}${m.change.toFixed(2)}%</strong><span>${fmt(m.high,decimals(m.high))}</span><button>Trade</button>`;row.querySelector('button').onclick=()=>{selectMarket(m);navigate('trade')};list.appendChild(row)})}
function selectMarket(m){if(!m)return;currentMarket=m;$('#trade-symbol').textContent=m.symbol;$('#trade-name').textContent=m.name;paintTradeIcon($('#trade-icon'),m);const valid=Number.isFinite(Number(m.price))&&Number(m.price)>0;$('#trade-price').textContent=valid?fmt(m.price,decimals(m.price)):'--';$('#trade-price').className=m.change>=0?'positive':'negative';$('#trade-change').textContent=valid?`${m.change>=0?'+':''}${Number(m.change||0).toFixed(2)}%`:'--';$('#trade-change').className=m.change>=0?'positive':'negative';$('#trade-high').textContent=valid&&Number(m.high)>0?fmt(m.high,decimals(m.high)):'--';$('#trade-low').textContent=valid&&Number(m.low)>0?fmt(m.low,decimals(m.low)):'--';const chartBadge=$('#chart-price-badge');if(chartBadge)chartBadge.textContent=valid?fmt(m.price,decimals(m.price)):'--';window.dispatchEvent(new CustomEvent('dapps:market-selected',{detail:{market:m}}))}
function navigate(name){if(!['home','markets','trade','pledge','assets'].includes(name))name='home';if(!isDemoSession){try{localStorage.setItem('dapps:lastPage',name)}catch{}}const hash='#'+name;if(location.hash!==hash)history.replaceState(null,'',location.pathname+location.search+hash);$$('.page').forEach(p=>p.classList.remove('active'));const page=$(`#page-${name}`);if(page)page.classList.add('active');$$('[data-nav]').forEach(b=>b.classList.toggle('active',b.dataset.nav===name));window.scrollTo({top:0,behavior:'smooth'})}
const initialPage=window.__dappsInitialPage||location.hash.slice(1)||'home';
navigate(['home','markets','trade','pledge','assets'].includes(initialPage)?initialPage:'home');
delete document.documentElement.dataset.initialPage;
try{delete window.__dappsInitialPage}catch{}
$$('[data-nav]').forEach(b=>b.addEventListener('click',()=>{if(b.dataset.nav==='trade'){const btc=markets.find(m=>m.symbol==='BTC/USDT');if(btc)selectMarket(btc)}navigate(b.dataset.nav)}));$$('.filter').forEach(b=>b.onclick=()=>{$$('.filter').forEach(x=>x.classList.remove('active'));b.classList.add('active');renderMarkets(b.dataset.filter)});
function currentProfitRate(){return profitRates[duration]??29}function currentMinimum(){return minimumTradeAmounts[duration]??1000}
function updatePotential(){const input=$('#trade-amount'),min=currentMinimum();input.min=min;input.placeholder=`Minimum ${fmt(min,0)} USDT`;const amount=Number(input.value)||0,rate=currentProfitRate(),profit=amount*rate/100,total=amount+profit;const r=$('#profit-rate'),p=$('#potential-profit');if(r)r.textContent=`+${rate}%`;if(p)p.textContent=`${fmt(profit)} USDT`;$('#potential-return').textContent=`${fmt(total)} USDT`}
$('#trade-amount').addEventListener('input',updatePotential);
$('#up-btn').onclick=()=>{direction='up';$('#up-btn').classList.add('active');$('#down-btn').classList.remove('active')};$('#down-btn').onclick=()=>{direction='down';$('#down-btn').classList.add('active');$('#up-btn').classList.remove('active')};
function showToast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>t.classList.remove('show'),2600)}
function updateBalances(){
  const total=balance+Number(totalPledged||0);
  if($('#available-balance'))$('#available-balance').textContent=`${fmt(balance)} USDT`;
  if($('#asset-available'))$('#asset-available').textContent=fmt(balance);
  if($('#asset-pledged'))$('#asset-pledged').textContent=fmt(totalPledged);
  if($('#total-pledged'))$('#total-pledged').textContent=`${fmt(totalPledged)} USDT`;
  if($('#home-total-assets'))$('#home-total-assets').textContent=`$${fmt(total)}`;
  if($('#home-available'))$('#home-available').textContent=`$${fmt(balance)}`;
  const homeNote=document.querySelector('.asset-main small');if(homeNote){homeNote.textContent=isDemoSession?'Simulation balance · resets with a new simulation session':localStorage.getItem('dapps:token')?'Account balance':'No funds available';homeNote.className=isDemoSession?'positive':'muted'}
  const assetTotal=document.querySelector('#page-assets .balance-card:first-child strong');if(assetTotal)assetTotal.textContent=`$${fmt(total)}`;
  const assetApprox=document.querySelector('#page-assets .balance-card:first-child small');if(assetApprox)assetApprox.textContent=`≈ ${fmt(total)} USDT`;
  const assetRow=document.querySelector('#page-assets .asset-row');if(assetRow){const vals=assetRow.children;if(vals[1])vals[1].textContent=fmt(total);if(vals[2])vals[2].textContent=fmt(balance);if(vals[3])vals[3].textContent=fmt(totalPledged)}
}
let demoPledges=[];const demoPledgeKey=isDemoSession?'dapps:demoPledges:v1:'+demoSessionId:null;if(isDemoSession){try{demoPledges=JSON.parse(sessionStorage.getItem(demoPledgeKey)||'[]');if(!Array.isArray(demoPledges))demoPledges=[]}catch{demoPledges=[]}totalPledged=demoPledges.reduce((s,x)=>s+Number(x.amount||0),0)}window.__demoPledgeCount=()=>demoPledges.length;function renderDemoPledges(){if(!isDemoSession)return;const list=$('#pledge-list');if(!list)return;list.innerHTML=demoPledges.length?demoPledges.map(x=>`<div class="pledge-row"><span>${x.product} Pledge</span><strong>${fmt(x.amount)} USDT</strong><span>Simulation</span><span class="positive">Active</span></div>`).join(''):'<div class="empty-state" style="padding:18px">No pledge orders yet.</div>'}if(isDemoSession)renderDemoPledges();
$$('.pledge-btn').forEach(b=>b.onclick=()=>{selectedPledge={product:b.dataset.product,min:Number(b.dataset.min)};$('#modal-title').textContent=`${selectedPledge.product} Pledge`;$('#pledge-amount').min=selectedPledge.min;$('#pledge-amount').value=selectedPledge.min;$('#pledge-modal').classList.add('open');$('#pledge-modal').setAttribute('aria-hidden','false')});function closeModal(){$('#pledge-modal').classList.remove('open');$('#pledge-modal').setAttribute('aria-hidden','true')}$('#modal-close').onclick=closeModal;$('#pledge-modal').onclick=e=>{if(e.target.id==='pledge-modal')closeModal()};$('#confirm-pledge').onclick=()=>{const amount=Number($('#pledge-amount').value);if(!isDemoSession&&!localStorage.getItem('dapps:token'))return showToast('Sign in or start a simulation account first.');if(amount<selectedPledge.min)return showToast(`Minimum is ${fmt(selectedPledge.min)} USDT.`);if(amount>balance)return showToast('Insufficient balance.');balance-=amount;totalPledged+=amount;if(isDemoSession){demoPledges.unshift({id:String(Date.now()),product:selectedPledge.product,amount,createdAt:Date.now()});try{sessionStorage.setItem(demoPledgeKey,JSON.stringify(demoPledges));sessionStorage.setItem('dapps:demoBalance:v3:'+demoSessionId,String(balance))}catch{}renderDemoPledges();window.__demoTouch?.()}else{const row=document.createElement('div');row.className='pledge-row';row.innerHTML=`<span>${selectedPledge.product} Pledge</span><strong>${fmt(amount)} USDT</strong><span>APY</span><span class="positive">Active</span>`;$('#pledge-list').appendChild(row)}updateBalances();closeModal();showToast('Pledge added to portfolio.')};
setInterval(()=>{if($('#page-markets').classList.contains('active'))renderMarkets($('.filter.active')?.dataset.filter||'all');if($('#page-trade').classList.contains('active')){$('#trade-price').textContent=window.__publicQuoteFresh?.(currentMarket)===false?'--':fmt(currentMarket.price,decimals(currentMarket.price));$('#trade-high').textContent=fmt(currentMarket.high,decimals(currentMarket.high));$('#trade-low').textContent=fmt(currentMarket.low,decimals(currentMarket.low));{const chartBadge=$('#chart-price-badge');if(chartBadge)chartBadge.textContent=fmt(currentMarket.price,decimals(currentMarket.price))}}updateBalances()},1000);
renderMarkets();selectMarket(markets[0]);updatePotential();updateBalances();

/* ===== demo-session.js ===== */
(()=>{const params=new URLSearchParams(location.search),sessionId=params.get('demo');if(!sessionId)return;const API=window.DAppsPlatformConfig.apiBase,allowed=new Set(['home','markets','trade','pledge','assets']);let leaving=false,lastControl={control:'auto',forceQueue:[]};function currentPage(){const p=location.hash.slice(1);return allowed.has(p)?p:'trade'}function snapshot(){let b=0,p=0,pc=0,a=0;try{b=Number(typeof balance!=='undefined'?balance:0)||0}catch{}try{p=Number(typeof totalPledged!=='undefined'?totalPledged:0)||0}catch{}try{pc=Number(window.__demoPledgeCount?.()||0)||0}catch{}try{a=Number(window.__demoActiveTradesCount?.()||0)||0}catch{}return{sessionId,page:currentPage(),balance:b,activeTrades:a,pledged:p,pledgeCount:pc}}async function ping(){if(leaving)return lastControl;try{const r=await fetch(API+'/api/demo/presence',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(snapshot()),cache:'no-store'});if(r.ok){lastControl=await r.json();window.__demoControl=lastControl}}catch{}return lastControl}async function settle(naturalWon){try{const r=await fetch(API+'/api/demo/settle',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({sessionId,naturalWon:Boolean(naturalWon)}),cache:'no-store'});if(r.ok)return await r.json()}catch{}return{won:Boolean(naturalWon),applied:'market'}}function purge(){try{for(let i=sessionStorage.length-1;i>=0;i--){const k=sessionStorage.key(i)||'';if(k.includes(':'+sessionId)||k==='dapps:demoSession:'+sessionId)sessionStorage.removeItem(k)}}catch{}}function leave(go=true){if(leaving)return;leaving=true;try{fetch(API+'/api/demo/leave',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({sessionId}),keepalive:true})}catch{}purge();if(go)location.href='register.html'}window.__demoTouch=ping;window.__demoResolveTrade=settle;window.__leaveDemoSession=leave;const baseNavigate=window.navigate||navigate;window.navigate=navigate=function(name){return baseNavigate(allowed.has(name)?name:'trade')};document.querySelectorAll('#home-deposit,#home-withdraw').forEach(el=>{el.disabled=true;el.setAttribute('aria-disabled','true');el.title='Unavailable in Simulation'});const top=document.querySelector('.top-actions');if(top&&!top.querySelector('.demo-exit')){const b=document.createElement('button');b.className='ghost-btn demo-exit demo-logout-btn';b.type='button';b.textContent='Log Out';b.setAttribute('aria-label','Log out of simulation account');b.onclick=()=>leave(true);const avatar=top.querySelector('.avatar-btn');if(avatar)top.insertBefore(b,avatar);else top.appendChild(b)}if(location.hash&& !allowed.has(location.hash.slice(1)))navigate('trade');window.addEventListener('hashchange',()=>{if(!allowed.has(location.hash.slice(1)))navigate('trade');else ping()});window.addEventListener('pageshow',()=>{leaving=false;ping()});document.addEventListener('visibilitychange',()=>{if(!document.hidden)ping()});window.addEventListener('pagehide',()=>{try{navigator.sendBeacon(API+'/api/demo/leave?sessionId='+encodeURIComponent(sessionId),'')}catch{}});ping();setInterval(ping,8000)})();

/* ===== market-catalog.js ===== */
(()=>{
  if(typeof markets==='undefined'||!Array.isArray(markets))return;
  window.markets=markets;
  const backend=window.DAppsPlatformConfig.apiBase;
  let query='',configBusy=false;
  let resolveConfigReady=null;
  if(!window.__marketConfigReady)window.__marketConfigReady=new Promise(resolve=>{resolveConfigReady=resolve});

  const style=document.createElement('style');
  style.textContent=`
    .coin-icon,.mini-icon{font-family:Inter,system-ui,sans-serif;font-weight:800;letter-spacing:-.4px;overflow:hidden}
    .coin-icon img,.mini-icon img{width:100%;height:100%;object-fit:cover;border-radius:50%}
    .coin-icon.small,.mini-icon{font-size:8px!important}.coin-icon.large{font-size:10px!important}
    #page-trade .trade-grid{align-items:start!important}#page-trade .chart-panel{align-self:start!important;height:auto!important;min-height:0!important}
    .trade-quick-markets{display:flex;gap:8px;overflow-x:auto;padding:0 0 10px;scrollbar-width:none}.trade-quick-markets::-webkit-scrollbar{display:none}
    .trade-quick-market{flex:0 0 auto;border:1px solid #26344a;background:#0e1725;color:#b9c6da;border-radius:9px;padding:8px 10px;cursor:pointer;font-size:11px;font-weight:700;white-space:nowrap}.trade-quick-market.active{border-color:#438cff;color:#fff;background:#13233a}.trade-quick-market:hover:not(.active){border-color:#344963;color:#dce7f5;background:#101b2a}
    .market-catalog-tools{display:grid;grid-template-columns:minmax(220px,1fr) auto;gap:10px;margin:0 0 12px}.market-search{width:100%;border:1px solid #263850;background:#0c1726;color:#fff;border-radius:10px;padding:11px 13px;outline:none}.market-search:focus{border-color:#438cff}.market-count{display:flex;align-items:center;padding:0 12px;border:1px solid #263850;border-radius:10px;color:#91a2b9;font-size:11px;background:#0c1726}
    @media(max-width:720px){.market-catalog-tools{grid-template-columns:1fr}.market-count{min-height:38px}.trade-quick-markets{padding-bottom:7px}.trade-quick-market{padding:7px 9px;font-size:10px}#page-trade .chart-stage{height:300px!important}}
  `;
  document.head.appendChild(style);

  const hasPrice=m=>Number.isFinite(Number(m?.price))&&Number(m.price)>0;
  const priceText=m=>hasPrice(m)?fmt(m.price,decimals(m.price)):'--';
  const changeText=m=>hasPrice(m)?`${Number(m.change||0)>=0?'+':''}${Number(m.change||0).toFixed(2)}%`:'--';

  function installMarketTools(){
    const panel=document.querySelector('#page-markets .market-panel');
    if(!panel||document.querySelector('.market-catalog-tools'))return;
    const tools=document.createElement('div');
    tools.className='market-catalog-tools';
    tools.innerHTML='<input class="market-search" type="search" placeholder="Search by coin name or symbol" autocomplete="off"><div class="market-count">Loading markets…</div>';
    panel.parentNode.insertBefore(tools,panel);
    tools.querySelector('.market-search').addEventListener('input',e=>{query=e.target.value.trim().toLowerCase();renderCatalog(document.querySelector('.filter.active')?.dataset.filter||'all')});
  }

  function renderCatalog(filter='all'){
    const list=document.querySelector('#market-list');if(!list)return;
    const rows=markets.filter(m=>{
      if(filter!=='all'&&m.type!==filter)return false;
      if(!query)return true;
      const code=String(m.symbol||'').split('/')[0].toLowerCase();
      const nameWords=String(m.name||'').toLowerCase().split(/\s+/).filter(Boolean);
      return code.startsWith(query)||nameWords.some(word=>word.startsWith(query));
    });
    list.innerHTML='';
    rows.forEach(m=>{
      const row=document.createElement('div');
      row.className='market-row';row.style.cursor='pointer';
      row.innerHTML=`<div class="market-name"><span class="coin-icon small">${tradeIconHTML(m)}</span><div><strong>${m.symbol}</strong><small class="muted" style="display:block;margin-top:3px">${m.name||m.symbol}</small></div></div><strong>${priceText(m)}</strong><strong class="${Number(m.change||0)>=0?'positive':'negative'}">${changeText(m)}</strong><span>${hasPrice(m)&&Number(m.high)>0?fmt(m.high,decimals(m.high)):'--'}</span>`;
      row.onclick=()=>{selectMarket(m);navigate('trade')};
      list.appendChild(row);
    });
    const count=document.querySelector('.market-count');if(count)count.textContent=`${rows.length.toLocaleString()} markets`;
  }
  window.renderMarkets=renderCatalog;

  function renderQuickMarkets(){
    const grid=document.querySelector('#page-trade .trade-grid');if(!grid)return;
    let bar=document.querySelector('#page-trade .trade-quick-markets');
    if(!bar){bar=document.createElement('div');bar.className='trade-quick-markets';grid.parentNode.insertBefore(bar,grid)}
    const preferred=['BTC/USDT','ETH/USDT','USDT/USDT','BNB/USDT','SOL/USDT','XRP/USDT','DOGE/USDT','ADA/USDT','AVAX/USDT','LINK/USDT'];
    let set=preferred.map(symbol=>markets.find(m=>m.symbol===symbol)).filter(Boolean);
    if(set.length<6)set=markets.slice(0,10);
    const selected=currentMarket?.symbol?(markets.find(m=>m.symbol===currentMarket.symbol)||currentMarket):null;
    if(selected&&!set.some(m=>m.symbol===selected.symbol))set=[selected,...set].slice(0,10);
    bar.innerHTML=set.map(m=>`<button type="button" class="trade-quick-market${currentMarket?.symbol===m.symbol?' active':''}" data-symbol="${m.symbol}">${tradeIconHTML(m)}<span>${m.symbol}</span></button>`).join('');
    bar.querySelectorAll('button').forEach(btn=>btn.onclick=()=>{const m=markets.find(x=>x.symbol===btn.dataset.symbol);if(m)selectMarket(m)});
  }
  window.renderQuickMarkets=renderQuickMarkets;
  function syncQuickMarketActive(symbol){
    symbol=String(symbol||'').trim();
    if(!symbol)return;
    const bar=document.querySelector('#page-trade .trade-quick-markets');if(!bar)return;
    let buttons=[...bar.querySelectorAll('.trade-quick-market')];
    if(!buttons.some(btn=>btn.dataset.symbol===symbol)){renderQuickMarkets();buttons=[...bar.querySelectorAll('.trade-quick-market')]}
    buttons.forEach(btn=>btn.classList.toggle('active',btn.dataset.symbol===symbol));
  }
  const tradeSymbol=document.querySelector('#trade-symbol');
  if(tradeSymbol){
    new MutationObserver(()=>syncQuickMarketActive(tradeSymbol.textContent)).observe(tradeSymbol,{childList:true,subtree:true,characterData:true});
    syncQuickMarketActive(tradeSymbol.textContent);
  }

  function applyConfig(data){
    if(!data||!Array.isArray(data.markets)||!Array.isArray(data.periods)||!data.markets.length)return;
    const previous=new Map(markets.map(m=>[m.symbol,m]));
    const firstConfig=!window.__marketConfig;
    const now=Date.now();
    const next=data.markets.map(raw=>{
      const old=previous.get(raw.symbol)||{};
      const live=now-Number(old.__quoteAt||0)<30000;
      return {
        ...old,...raw,
        price:live?Number(old.price)||0:Number(raw.price)||0,
        change:live?Number(old.change)||0:Number(raw.change)||0,
        high:live?Number(old.high)||0:Number(raw.high)||0,
        low:live?Number(old.low)||0:Number(raw.low)||0,
        type:raw.type||'crypto'
      };
    });
    markets.splice(0,markets.length,...next);
    window.markets=markets;
    window.__marketConfig=data;
    window.DAppsTradeSpec?.applyProducts?.(data.tradeProducts);
    if(typeof updatePotential==='function')updatePotential();
    if(resolveConfigReady){resolveConfigReady(data);resolveConfigReady=null}
    const wanted=currentMarket?.symbol;
    const chosen=markets.find(m=>m.symbol===wanted)||markets[0];
    if(chosen){
      if(firstConfig||chosen.symbol!==wanted)selectMarket(chosen);
      else currentMarket=chosen;
    }
    renderCatalog(document.querySelector('.filter.active')?.dataset.filter||'all');
    renderQuickMarkets();
    window.dispatchEvent(new CustomEvent('dapps:market-config',{detail:data}));
    window.dispatchEvent(new Event('dapps:markets-updated'));
  }

  async function loadConfig(){
    if(configBusy)return;
    configBusy=true;
    try{
      const r=await fetch(backend+'/api/market/config',{cache:'no-store',headers:{Accept:'application/json'}});
      if(!r.ok)throw Error(String(r.status));
      applyConfig(await r.json());
    }catch(_){
      const count=document.querySelector('.market-count');if(count)count.textContent='Market data unavailable';
    }finally{configBusy=false}
  }

  installMarketTools();
  renderCatalog('all');
  renderQuickMarkets();
  loadConfig();
  setInterval(loadConfig,60000);

  if(!document.querySelector('script[data-pledge-ui]')){
    const script=document.createElement('script');script.src='assets/js/pledge-ui.js?v=20260925-1';script.dataset.pledgeUi='1';document.body.appendChild(script);
  }
})();

/* ===== chart-pro.js ===== */
(()=>{
'use strict';
const $=(s,r=document)=>r.querySelector(s);
const el=$('#page-trade .chart-stage'),canvas=$('#price-chart');
if(!el||!canvas)return;
canvas.className='pro-native-canvas';
const ctx=canvas.getContext('2d');
let tip=$('#chart-tooltip');
if(tip)tip.remove();
tip=document.createElement('div');tip.id='chart-tooltip';tip.className='pro-chart-tooltip';el.appendChild(tip);
if(!document.querySelector('#pro-chart-touch-style')){const st=document.createElement('style');st.id='pro-chart-touch-style';st.textContent=`
#page-trade .chart-stage{overflow:hidden}
#page-trade .pro-native-canvas{display:block;width:100%;height:100%;cursor:crosshair}
#page-trade .pro-chart-tooltip{position:absolute;z-index:12;display:none;width:min(286px,calc(100% - 24px));padding:10px 12px;border:1px solid rgba(66,175,241,.42);border-radius:10px;background:rgba(5,18,33,.94);box-shadow:0 12px 34px rgba(0,0,0,.42);backdrop-filter:blur(8px);color:#e8f4ff;pointer-events:none;font:10px/1.45 Inter,system-ui,sans-serif}
#page-trade .pro-chart-tooltip.show{display:grid;gap:3px}
#page-trade .pro-chart-tooltip b{font-size:11px;color:#fff}
#page-trade .pro-chart-tooltip span{display:block;color:#a9bfd4;white-space:normal}
@media(max-width:720px){#page-trade .pro-chart-tooltip{width:min(250px,calc(100% - 20px));padding:9px 10px;font-size:9px}}
`;document.head.appendChild(st)}
document.querySelector('#chart-legend')?.remove();
document.querySelector('.chart-zoom-controls')?.remove();

const backend=window.DAppsPlatformConfig.apiBase;
const state={symbol:'BTC/USDT',period:'24H',rows:[],visible:120,offset:0,hover:null,drag:false,lastX:0,historyToken:0,liveReady:false};
const overlays=[{period:7,label:'EMA 7',color:'#f5c84c'},{period:25,label:'EMA 25',color:'#b978ff'},{period:99,label:'EMA 99',color:'#38bdf8'}];

function selectedSymbol(){return (typeof currentMarket!=='undefined'&&currentMarket?.symbol)||$('#trade-symbol')?.textContent?.trim()||'BTC/USDT'}
function baseCode(){return selectedSymbol().split('/')[0].toUpperCase()}
const defaultPeriods=[{id:'1H',seconds:60,count:60},{id:'24H',seconds:300,count:288},{id:'7D',seconds:3600,count:168},{id:'30D',seconds:21600,count:180}];
function periodList(){const list=window.__marketConfig?.periods;return Array.isArray(list)&&list.length?list:defaultPeriods}
function periodInfo(id=state.period){return periodList().find(p=>p.id===id)||null}
let historyTimer=null;
function queueHistory(delay=40){clearTimeout(historyTimer);historyTimer=setTimeout(history,delay)}
let installedPeriodKey='';
function size(){const dpr=Math.min(devicePixelRatio||1,2),r=el.getBoundingClientRect(),w=Math.max(320,Math.floor(r.width)),h=Math.max(420,Math.floor(r.height));if(canvas.width!==w*dpr||canvas.height!==h*dpr){canvas.width=w*dpr;canvas.height=h*dpr;canvas.style.width=w+'px';canvas.style.height=h+'px'}ctx.setTransform(dpr,0,0,dpr,0,0);return{w,h}}
function fmt(n){if(!Number.isFinite(+n))return'—';n=+n;return n.toLocaleString('en-US',{minimumFractionDigits:n>=1000?2:4,maximumFractionDigits:n>=1?4:8})}
function compact(n){n=+n;if(!Number.isFinite(n))return'—';return Intl.NumberFormat('en-US',{notation:'compact',maximumFractionDigits:2}).format(n)}
function windowBounds(){const n=state.rows.length;if(!n)return{start:0,end:0};const count=Math.min(state.visible,n),end=Math.max(count,Math.min(n,n-state.offset));return{start:end-count,end}}
function windowRows(){const{start,end}=windowBounds();return state.rows.slice(start,end)}
function emaValues(rows,period,key='close'){if(!rows.length)return[];const k=2/(period+1),out=[];let value=+rows[0][key]||0;for(let i=0;i<rows.length;i++){const v=+rows[i][key]||0;value=i===0?v:(v*k+value*(1-k));out.push(value)}return out}
function rsiValues(rows,period=14){const out=Array(rows.length).fill(null);if(rows.length<2)return out;let gains=0,losses=0;for(let i=1;i<=Math.min(period,rows.length-1);i++){const d=rows[i].close-rows[i-1].close;if(d>=0)gains+=d;else losses-=d}if(rows.length>period){let avgGain=gains/period,avgLoss=losses/period;out[period]=avgLoss===0?100:100-(100/(1+avgGain/avgLoss));for(let i=period+1;i<rows.length;i++){const d=rows[i].close-rows[i-1].close,g=d>0?d:0,l=d<0?-d:0;avgGain=(avgGain*(period-1)+g)/period;avgLoss=(avgLoss*(period-1)+l)/period;out[i]=avgLoss===0?100:100-(100/(1+avgGain/avgLoss))}}return out}
function macdValues(rows){const e12=emaValues(rows,12),e26=emaValues(rows,26),macd=rows.map((_,i)=>e12[i]-e26[i]),signal=[];const k=2/10;let s=macd[0]||0;for(let i=0;i<macd.length;i++){s=i===0?macd[i]:(macd[i]*k+s*(1-k));signal.push(s)}return{macd,signal,hist:macd.map((v,i)=>v-signal[i])}}
function drawSeries(values,start,count,x,y,color,width=1.2){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();let begun=false;for(let i=0;i<count;i++){const v=values[start+i];if(!Number.isFinite(v)){begun=false;continue}const xx=x(i),yy=y(v);if(!begun){ctx.moveTo(xx,yy);begun=true}else ctx.lineTo(xx,yy)}if(begun)ctx.stroke()}

function draw(){
  const{w,h}=size(),L=12,R=84,T=28,B=30,W=Math.max(1,w-L-R);ctx.clearRect(0,0,w,h);ctx.fillStyle='#061425';ctx.fillRect(0,0,w,h);
  const{start}=windowBounds(),rows=windowRows();
  if(!rows.length){ctx.fillStyle='#7894ad';ctx.font='12px Inter,Arial';ctx.fillText('Loading K-line history…',18,30);tip.classList.remove('show');return}
  const gap=8,mainH=Math.max(190,Math.floor((h-T-B-gap*3)*.58)),volH=Math.max(54,Math.floor((h-T-B-gap*3)*.12)),macdH=Math.max(72,Math.floor((h-T-B-gap*3)*.16)),rsiH=Math.max(68,h-T-B-gap*3-mainH-volH-macdH);
  const mainT=T,volT=mainT+mainH+gap,macdT=volT+volH+gap,rsiT=macdT+macdH+gap,x=i=>L+(i+.5)*W/rows.length;
  let lo=Math.min(...rows.map(v=>v.low)),hi=Math.max(...rows.map(v=>v.high));const pad=(hi-lo||Math.abs(hi)*.01||1)*.08;lo-=pad;hi+=pad;const y=p=>mainT+(hi-p)/(hi-lo)*mainH;
  ctx.font='10px Inter,Arial';ctx.strokeStyle='rgba(126,163,196,.12)';ctx.fillStyle='#7894ad';ctx.lineWidth=1;
  for(let i=0;i<6;i++){const yy=mainT+mainH*i/5;ctx.beginPath();ctx.moveTo(L,yy);ctx.lineTo(L+W,yy);ctx.stroke();ctx.fillText(fmt(hi-(hi-lo)*i/5),L+W+8,yy+3)}
  for(let i=0;i<6;i++){const xx=L+W*i/5;ctx.beginPath();ctx.moveTo(xx,mainT);ctx.lineTo(xx,rsiT+rsiH);ctx.stroke();const idx=Math.min(rows.length-1,Math.round((rows.length-1)*i/5)),d=new Date(rows[idx].time*1000);ctx.fillText(d.toLocaleString('en-US',{month:'short',day:'2-digit',hour:'2-digit',minute:'2-digit'}),Math.min(xx,w-108),h-7)}
  const bw=Math.max(2,Math.min(11,W/rows.length*.68));
  rows.forEach((d,i)=>{const xx=x(i),up=d.close>=d.open,col=up?'#20c997':'#ff5f73';ctx.strokeStyle=col;ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(xx,y(d.high));ctx.lineTo(xx,y(d.low));ctx.stroke();const top=y(Math.max(d.open,d.close)),bot=y(Math.min(d.open,d.close));ctx.fillRect(xx-bw/2,top,bw,Math.max(1.5,bot-top))});
  const all=state.rows;for(const o of overlays)drawSeries(emaValues(all,o.period),start,rows.length,x,y,o.color,1.45);
  let lx=18;ctx.font='bold 9px Inter,Arial';for(const o of overlays){ctx.fillStyle=o.color;ctx.fillRect(lx,11,12,2);ctx.fillText(o.label,lx+17,15);lx+=68}
  const liveLast=state.rows[state.rows.length-1]||rows[rows.length-1],liveRawY=y(liveLast.close),liveY=Math.max(mainT+8,Math.min(mainT+mainH-8,liveRawY)),liveInRange=liveRawY>=mainT&&liveRawY<=mainT+mainH;if(liveInRange){ctx.strokeStyle='#26c9ff';ctx.setLineDash([4,4]);ctx.beginPath();ctx.moveTo(L,liveRawY);ctx.lineTo(L+W,liveRawY);ctx.stroke();ctx.setLineDash([])}ctx.fillStyle='#26c9ff';ctx.fillRect(L+W+4,liveY-8,78,16);ctx.fillStyle='#04101f';ctx.font='bold 10px Inter,Arial';ctx.fillText(fmt(liveLast.close),L+W+8,liveY+3);
  ctx.strokeStyle='rgba(126,163,196,.16)';for(const yy of[volT-4,macdT-4,rsiT-4]){ctx.beginPath();ctx.moveTo(L,yy);ctx.lineTo(L+W,yy);ctx.stroke()}
  ctx.fillStyle='#6f8ca8';ctx.font='bold 9px Inter,Arial';ctx.fillText('VOL',L,volT+9);const maxVol=Math.max(...rows.map(v=>+v.volume||0),1);rows.forEach((d,i)=>{const vh=((+d.volume||0)/maxVol)*(volH-12);ctx.fillStyle=d.close>=d.open?'rgba(32,201,151,.46)':'rgba(255,95,115,.46)';ctx.fillRect(x(i)-bw/2,volT+volH-vh,bw,Math.max(1,vh))});ctx.fillStyle='#7894ad';ctx.fillText(compact(maxVol),L+W+8,volT+10);
  const m=macdValues(all),visibleHist=m.hist.slice(start,start+rows.length),mAbs=Math.max(...visibleHist.map(v=>Math.abs(v)),...m.macd.slice(start,start+rows.length).map(v=>Math.abs(v)),...m.signal.slice(start,start+rows.length).map(v=>Math.abs(v)),1e-9),mY=v=>macdT+macdH/2-(v/mAbs)*(macdH*.42);ctx.fillStyle='#6f8ca8';ctx.font='bold 9px Inter,Arial';ctx.fillText('MACD 12 26 9',L,macdT+10);ctx.strokeStyle='rgba(126,163,196,.18)';ctx.beginPath();ctx.moveTo(L,mY(0));ctx.lineTo(L+W,mY(0));ctx.stroke();visibleHist.forEach((v,i)=>{ctx.fillStyle=v>=0?'rgba(32,201,151,.48)':'rgba(255,95,115,.48)';const yy=mY(v),zero=mY(0);ctx.fillRect(x(i)-Math.max(1,bw*.35),Math.min(yy,zero),Math.max(2,bw*.7),Math.max(1,Math.abs(zero-yy)))});drawSeries(m.macd,start,rows.length,x,mY,'#f5c84c',1.15);drawSeries(m.signal,start,rows.length,x,mY,'#b978ff',1.15);
  const r=rsiValues(all,14),rY=v=>rsiT+(100-v)/100*rsiH;ctx.fillStyle='#6f8ca8';ctx.font='bold 9px Inter,Arial';ctx.fillText('RSI 14',L,rsiT+10);for(const level of[30,50,70]){ctx.strokeStyle=level===50?'rgba(126,163,196,.12)':'rgba(245,200,76,.18)';ctx.setLineDash(level===50?[]:[3,3]);ctx.beginPath();ctx.moveTo(L,rY(level));ctx.lineTo(L+W,rY(level));ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#6f8ca8';ctx.fillText(String(level),L+W+8,rY(level)+3)}drawSeries(r,start,rows.length,x,rY,'#38bdf8',1.3);
  if(state.hover){const pointerX=Math.max(L,Math.min(L+W,state.hover.x)),my=Math.max(mainT,Math.min(mainT+mainH,state.hover.y)),idx=Math.max(0,Math.min(rows.length-1,Math.floor((pointerX-L)/W*rows.length))),mx=x(idx),d=rows[idx],gi=start+idx,crossPrice=hi-(my-mainT)/mainH*(hi-lo);ctx.strokeStyle='rgba(181,207,230,.78)';ctx.setLineDash([3,3]);ctx.beginPath();ctx.moveTo(mx,mainT);ctx.lineTo(mx,rsiT+rsiH);ctx.moveTo(L,my);ctx.lineTo(L+W,my);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#dff4ff';ctx.beginPath();ctx.arc(mx,my,3.2,0,Math.PI*2);ctx.fill();ctx.fillStyle='#b5cfe6';ctx.fillRect(L+W+4,my-8,78,16);ctx.fillStyle='#04101f';ctx.font='bold 10px Inter,Arial';ctx.fillText(fmt(crossPrice),L+W+8,my+3);const emaText=overlays.map(o=>o.label+' '+fmt(emaValues(all,o.period)[gi])).join(' · '),rv=r[gi],mv=m.macd[gi],sv=m.signal[gi],change=d.open?((d.close-d.open)/d.open*100):0;tip.innerHTML='<b>'+state.symbol+' · '+(change>=0?'+':'')+change.toFixed(2)+'%</b><span>'+new Date(d.time*1000).toLocaleString()+'</span><span>Open '+fmt(d.open)+' · High '+fmt(d.high)+'</span><span>Low '+fmt(d.low)+' · Close '+fmt(d.close)+'</span><span>Volume '+compact(d.volume||0)+'</span><span>'+emaText+'</span><span>MACD '+fmt(mv)+' / '+fmt(sv)+' · RSI '+(Number.isFinite(rv)?rv.toFixed(1):'—')+'</span>';const tipW=Math.min(286,Math.max(210,w-24)),left=Math.max(10,Math.min(mx+12,w-tipW-10));tip.style.left=left+'px';tip.style.top=(my<mainT+110?Math.min(mainT+mainH-126,my+14):Math.max(mainT+8,my-118))+'px';tip.classList.add('show')}else tip.classList.remove('show');
}
async function json(url){const r=await fetch(url,{cache:'no-store',headers:{Accept:'application/json'}});if(!r.ok)throw Error(String(r.status));return r.json()}
async function history(){
  const info=periodInfo();if(!info)return;
  const token=++state.historyToken,loadingSymbol=selectedSymbol(),period=state.period;
  state.symbol=loadingSymbol;state.liveReady=false;state.rows=[];state.offset=0;draw();
  try{
    const d=await json(backend+'/api/market/chart?symbol='+encodeURIComponent(baseCode())+'&period='+encodeURIComponent(period));
    if(token!==state.historyToken||selectedSymbol()!==loadingSymbol)return;
    const rows=(Array.isArray(d.candles)?d.candles:[]).map(v=>({time:+v.time,open:+v.open,high:+v.high,low:+v.low,close:+v.close,volume:+v.volume||0})).filter(v=>[v.time,v.open,v.high,v.low,v.close].every(Number.isFinite)).sort((a,b)=>a.time-b.time);
    if(!rows.length)throw Error('empty');
    state.rows=rows;state.visible=Math.min(rows.length,Number(info.count)||120);state.offset=0;state.liveReady=true;draw();
  }catch(_){if(token===state.historyToken){state.rows=[];state.liveReady=false;draw()}}
}
function plausibleLive(price){const last=state.rows[state.rows.length-1]?.close;if(!Number.isFinite(price)||!Number.isFinite(last)||last<=0)return false;return Math.abs(price-last)/last<=.25}
function live(price,time){
  price=+price;
  const info=periodInfo();
  if(!info||!state.liveReady||!Number.isFinite(price)||!state.rows.length||!plausibleLive(price))return;
  const sec=Number(info.seconds)||300,stamp=Number.isFinite(Date.parse(time))?Date.parse(time):Date.now(),bucket=Math.floor(stamp/1000/sec)*sec,last=state.rows[state.rows.length-1];
  let changed=false;
  if(last.time===bucket){
    if(last.close!==price){last.close=price;last.high=Math.max(last.high,price);last.low=Math.min(last.low,price);changed=true}
  }else if(bucket>last.time){
    state.rows.push({time:bucket,open:last.close,high:price,low:price,close:price,volume:0});
    if(state.rows.length>600)state.rows.shift();
    changed=true;
  }
  if(changed)draw();
}
function beginSwitch(){
  state.liveReady=false;state.historyToken++;state.rows=[];state.offset=0;state.symbol=selectedSymbol();draw();
  if(periodInfo())queueHistory(40);
}

canvas.addEventListener('wheel',e=>{e.preventDefault();const old=state.visible,f=e.deltaY>0?1.12:.88;state.visible=Math.max(20,Math.min(state.rows.length,Math.round(old*f)));state.offset=Math.min(state.offset,Math.max(0,state.rows.length-state.visible));draw()},{passive:false});
canvas.addEventListener('mousemove',e=>{const r=canvas.getBoundingClientRect();state.hover={x:e.clientX-r.left,y:e.clientY-r.top};if(state.drag){const dx=e.clientX-state.lastX,step=Math.round(dx/(r.width/Math.max(20,state.visible)));if(step){state.offset=Math.max(0,Math.min(Math.max(0,state.rows.length-state.visible),state.offset+step));state.lastX=e.clientX}}draw()});
canvas.addEventListener('mouseleave',()=>{state.hover=null;state.drag=false;canvas.classList.remove('dragging');draw()});
canvas.addEventListener('mousedown',e=>{state.drag=true;state.lastX=e.clientX;canvas.classList.add('dragging')});
window.addEventListener('mouseup',()=>{state.drag=false;canvas.classList.remove('dragging')});
canvas.addEventListener('dblclick',()=>{const info=periodInfo();state.offset=0;state.visible=Math.min(state.rows.length,Number(info?.count)||120);draw()});

let touchStartDistance=0,touchStartVisible=0,touchLastX=null,touchMode='',touchStartX=0,touchStartY=0,touchStartedAt=0,touchMoved=false,tapHideTimer=null,edgePanTimer=null,edgePanDir=0,crosshairClientX=0,crosshairClientY=0;
function clearTapHide(){clearTimeout(tapHideTimer);tapHideTimer=null}
function scheduleTapHide(){clearTapHide();tapHideTimer=setTimeout(()=>{tapHideTimer=null;stopEdgePan();state.hover=null;draw()},2000)}
function stopEdgePan(){if(edgePanTimer){clearInterval(edgePanTimer);edgePanTimer=null}edgePanDir=0}
function setCrosshairFromClient(clientX,clientY){const r=canvas.getBoundingClientRect();crosshairClientX=clientX;crosshairClientY=clientY;state.hover={x:clientX-r.left,y:clientY-r.top};draw()}
function updateEdgePan(clientX){
  const r=canvas.getBoundingClientRect(),plotLeft=12,plotRight=Math.max(plotLeft+1,r.width-84),localX=clientX-r.left,zone=Math.min(42,Math.max(24,(plotRight-plotLeft)*.1));
  const dir=localX<=plotLeft+zone?1:localX>=plotRight-zone?-1:0;
  if(dir===edgePanDir)return;
  stopEdgePan();
  if(!dir)return;
  edgePanDir=dir;
  edgePanTimer=setInterval(()=>{
    if(touchMode!=='crosshair'){stopEdgePan();return}
    const maxOffset=Math.max(0,state.rows.length-Math.min(state.visible,state.rows.length)),next=Math.max(0,Math.min(maxOffset,state.offset+edgePanDir));
    if(next===state.offset){stopEdgePan();return}
    state.offset=next;
    const rr=canvas.getBoundingClientRect();
    state.hover={x:crosshairClientX-rr.left,y:crosshairClientY-rr.top};
    draw();
  },75);
}
function hideTapCrosshair(){clearTapHide();stopEdgePan();if(state.hover){state.hover=null;draw()}}
function showTapCrosshair(clientX,clientY){setCrosshairFromClient(clientX,clientY);scheduleTapHide()}
canvas.addEventListener('touchstart',e=>{
  if(e.touches.length===2){
    clearTapHide();stopEdgePan();state.hover=null;touchMode='pinch';touchMoved=true;
    touchStartDistance=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);touchStartVisible=state.visible;draw();
  }else if(e.touches.length===1){
    const t=e.touches[0];touchLastX=t.clientX;touchStartX=t.clientX;touchStartY=t.clientY;touchStartedAt=Date.now();touchMoved=false;
    if(state.hover){clearTapHide();touchMode='crosshair';setCrosshairFromClient(t.clientX,t.clientY);updateEdgePan(t.clientX)}
    else touchMode='pan';
  }
},{passive:true});
canvas.addEventListener('touchmove',e=>{
  if(touchMode==='pinch'&&e.touches.length===2){
    e.preventDefault();const d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);
    if(touchStartDistance>0){state.visible=Math.max(20,Math.min(state.rows.length,Math.round(touchStartVisible*(touchStartDistance/d))));state.offset=Math.min(state.offset,Math.max(0,state.rows.length-state.visible));draw()}
  }else if(touchMode==='crosshair'&&e.touches.length===1){
    e.preventDefault();const t=e.touches[0];touchMoved=true;setCrosshairFromClient(t.clientX,t.clientY);updateEdgePan(t.clientX);
  }else if(touchMode==='pan'&&e.touches.length===1&&touchLastX!==null){
    const t=e.touches[0],total=Math.hypot(t.clientX-touchStartX,t.clientY-touchStartY);
    if(total>8){touchMoved=true;if(state.hover){clearTapHide();state.hover=null}}
    const dx=t.clientX-touchLastX;
    if(Math.abs(dx)>6){e.preventDefault();const step=Math.round(dx/(canvas.getBoundingClientRect().width/Math.max(20,state.visible)));if(step){state.offset=Math.max(0,Math.min(Math.max(0,state.rows.length-state.visible),state.offset+step));touchLastX=t.clientX;draw()}}
  }
},{passive:false});
canvas.addEventListener('touchend',e=>{
  const ended=e.changedTouches?.[0],wasTap=touchMode==='pan'&&!touchMoved&&ended&&Date.now()-touchStartedAt<500;
  if(touchMode==='crosshair'){stopEdgePan();scheduleTapHide()}
  else if(wasTap)showTapCrosshair(ended.clientX,ended.clientY);
  touchMode='';touchLastX=null;touchStartDistance=0;touchMoved=false;
},{passive:true});
canvas.addEventListener('touchcancel',()=>{touchMode='';touchLastX=null;touchStartDistance=0;touchMoved=false;hideTapCrosshair()},{passive:true});

function installPeriods(){
  const list=periodList(),wrap=document.querySelector('.timeframes');
  if(!wrap||!list.length)return false;
  const key=list.map(p=>p.id+':'+p.seconds+':'+p.count).join('|');
  if(!list.some(p=>p.id===state.period))state.period=(list.find(p=>p.id==='24H')||list[0]).id;
  if(key===installedPeriodKey)return true;
  installedPeriodKey=key;
  wrap.innerHTML=list.map(p=>`<button type="button" data-period="${p.id}" class="${p.id===state.period?'active':''}">${p.id}</button>`).join('');
  wrap.querySelectorAll('button').forEach(btn=>btn.addEventListener('click',()=>{
    const p=btn.dataset.period;
    if(!periodInfo(p)||p===state.period)return;
    state.period=p;
    wrap.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===btn));
    state.liveReady=false;state.rows=[];state.offset=0;draw();queueHistory(0);
  }));
  return true;
}

window.addEventListener('dapps:market-config',()=>{
  const before=installedPeriodKey;
  if(installPeriods()&&installedPeriodKey!==before)beginSwitch();
});
window.addEventListener('dapps:market-selected',beginSwitch);
const tradeSymbol=$('#trade-symbol');
if(tradeSymbol)new MutationObserver(()=>{
  if(selectedSymbol()!==state.symbol)beginSwitch();
}).observe(tradeSymbol,{childList:true,subtree:true,characterData:true});
window.addEventListener('dapps:market-quote',e=>{
  const d=e.detail||{};
  if(d.symbol===state.symbol)live(Number(d.price),d.time);
});
new ResizeObserver(draw).observe(el);
window.drawChart=draw;
draw();
installPeriods();
queueHistory(20);
if(window.__marketConfigReady?.then){
  window.__marketConfigReady.then(()=>installPeriods());
}
})();

/* ===== market-trade-ui.js ===== */
(() => {
  const marketList = document.querySelector('#market-list');
  const marketHead = document.querySelector('#page-markets .market-table-head');
  const tradeTitle = document.querySelector('#page-trade .asset-title-wrap');
  if(!marketList || !marketHead || !tradeTitle || !Array.isArray(window.markets)) return;

  const style = document.createElement('style');
  style.textContent = `
    #page-markets .market-table-head,#page-markets .market-row{grid-template-columns:1.6fr 1fr 1fr 1fr}
    #page-markets .market-row{cursor:pointer;transition:.16s ease}
    #page-markets .market-row:hover{background:rgba(60,120,210,.08)}
    .trade-pair-selector{position:relative;display:flex;align-items:center;gap:8px;margin-left:8px}
    .pair-select-btn{border:1px solid var(--line);background:#111520;color:#dfe6f5;border-radius:9px;padding:7px 10px;font-size:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:7px}
    .pair-select-btn:hover{border-color:#52627f;background:#151b29}.pair-select-btn .chev{font-size:10px;color:#8e96aa}
    .pair-menu{position:absolute;left:0;top:42px;width:330px;max-height:430px;overflow:hidden;background:#111520;border:1px solid #30384c;border-radius:12px;box-shadow:0 18px 50px rgba(0,0,0,.45);z-index:60;display:none}
    .pair-menu.open{display:block}.pair-search-wrap{padding:10px;border-bottom:1px solid #252c3c}.pair-search{width:100%;border:1px solid #30384c;background:#0d111a;color:#fff;border-radius:8px;padding:9px 10px;outline:none}
    .pair-search:focus{border-color:#4d7cff}.pair-list{max-height:370px;overflow:auto;padding:6px}
    .pair-item{width:100%;border:0;background:transparent;color:#dce4f3;border-radius:8px;padding:10px;display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;cursor:pointer;text-align:left}
    .pair-item:hover,.pair-item.active{background:#1b2232}.pair-item .left{display:flex;align-items:center;gap:9px}.pair-item .mini-icon{width:26px;height:26px;border-radius:50%;display:grid;place-items:center;color:#fff;font-size:8px;font-weight:800}.pair-item strong{font-size:12px}.pair-item small{display:block;color:#7f8a9f;margin-top:2px}.pair-item .price{text-align:right}.pair-item .price b{display:block;font-size:12px}.pair-item .price span{font-size:10px}
    @media(max-width:720px){
      #page-markets .market-table-head,#page-markets .market-row{grid-template-columns:minmax(0,1.45fr) minmax(0,.95fr) minmax(0,.72fr);gap:6px;padding:11px 8px}
      #page-markets .market-table-head span:nth-child(4),#page-markets .market-row>*:nth-child(4){display:none}
      #page-markets .market-row>*{min-width:0}
      #page-markets .market-name{min-width:0;gap:7px;overflow:hidden}
      #page-markets .market-name>div{min-width:0;overflow:hidden}
      #page-markets .market-name strong{display:block;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:10px}
      #page-markets .market-name small{display:none!important}
      #page-markets .market-row>strong{min-width:0;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:right;font-size:clamp(8px,2.55vw,10px);font-variant-numeric:tabular-nums}
      #page-markets .market-table-head span{min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:8px}
      #page-markets .market-table-head span:nth-child(n+2){text-align:right}
      #page-trade .asset-title-wrap{display:grid;grid-template-columns:auto minmax(0,1fr);grid-template-rows:auto auto;column-gap:10px;row-gap:4px;align-items:center;min-width:0}
      #page-trade .asset-title-wrap>.coin-icon{grid-column:1;grid-row:1/3;align-self:center}
      #page-trade .asset-title-wrap>div:not(.trade-pair-selector):not(.coin-icon){grid-column:2;grid-row:1;min-width:0}
      #page-trade .trade-pair-selector{grid-column:2;grid-row:2;margin-left:0;min-width:0;justify-self:start}
      #page-trade .pair-select-btn{height:32px;min-width:0;max-width:100%;padding:0 10px;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;gap:6px;white-space:nowrap;line-height:1;font-size:10px}
      #page-trade .pair-select-btn>span:first-child{white-space:nowrap}
      #page-trade .pair-select-btn .chev{display:inline-flex!important;align-items:center;font-size:8px;line-height:1;transform:none}
      .pair-menu{position:fixed;left:12px;right:12px;bottom:78px;top:auto;width:auto;max-height:66vh;border-radius:16px}.pair-list{max-height:56vh}
    }
  `;
  document.head.appendChild(style);

  marketHead.innerHTML = '<span>Market</span><span>Last Price</span><span>24h Change</span><span>24h High</span>';

  window.renderMarkets = function(filter='all'){
    marketList.innerHTML='';
    markets.filter(m=>filter==='all'||m.type===filter).forEach(m=>{
      const row=document.createElement('div');
      row.className='market-row';
      row.innerHTML=`<div class="market-name"><span class="coin-icon small">${tradeIconHTML(m)}</span><div><strong>${m.symbol}</strong><small class="muted" style="display:block;margin-top:3px">${m.name}</small></div></div><strong>${fmt(m.price,decimals(m.price))}</strong><strong class="${m.change>=0?'positive':'negative'}">${m.change>=0?'+':''}${m.change.toFixed(2)}%</strong><span>${fmt(m.high,decimals(m.high))}</span>`;
      row.addEventListener('click',()=>{selectMarket(m);navigate('trade')});
      marketList.appendChild(row);
    });
  };

  const selector = document.createElement('div');
  selector.className = 'trade-pair-selector';
  selector.innerHTML = `
    <button class="pair-select-btn" id="pair-select-btn" type="button"><span>Choose Market</span><span class="chev">▼</span></button>
    <div class="pair-menu" id="pair-menu">
      <div class="pair-search-wrap"><input class="pair-search" id="pair-search" type="search" placeholder="Search crypto or market" autocomplete="off"></div>
      <div class="pair-list" id="pair-list"></div>
    </div>`;
  tradeTitle.appendChild(selector);

  const btn = selector.querySelector('#pair-select-btn');
  const menu = selector.querySelector('#pair-menu');
  const search = selector.querySelector('#pair-search');
  const list = selector.querySelector('#pair-list');

  function renderPairList(query=''){
    const q=String(query||'').trim().toLowerCase();
    list.innerHTML='';
    markets.filter(m=>!q||m.symbol.toLowerCase().includes(q)||m.name.toLowerCase().includes(q)).slice(0,500).forEach(m=>{
      const item=document.createElement('button');
      item.type='button';
      item.className='pair-item'+(m.symbol===currentMarket.symbol?' active':'');
      item.innerHTML=`<span class="left"><span class="mini-icon">${tradeIconHTML(m)}</span><span><strong>${m.symbol}</strong><small>${m.name}</small></span></span><span class="price"><b>${fmt(m.price,decimals(m.price))}</b><span class="${m.change>=0?'positive':'negative'}">${m.change>=0?'+':''}${m.change.toFixed(2)}%</span></span>`;
      item.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();menu.classList.remove('open');search.value='';selectMarket(m)});
      list.appendChild(item);
    });
  }
  window.__renderPairList=()=>renderPairList(search.value);

  btn.addEventListener('click',e=>{e.stopPropagation();menu.classList.toggle('open');if(menu.classList.contains('open')){renderPairList();setTimeout(()=>search.focus(),0)}});
  search.addEventListener('input',()=>renderPairList(search.value));
  menu.addEventListener('click',e=>e.stopPropagation());
  document.addEventListener('click',()=>menu.classList.remove('open'));
  document.addEventListener('keydown',e=>{if(e.key==='Escape')menu.classList.remove('open')});

  const baseSelectMarket = window.selectMarket;
  window.selectMarket = function(m){const result = baseSelectMarket(m);renderPairList(search.value);return result;};

  renderMarkets(document.querySelector('.filter.active')?.dataset.filter||'all');
  renderPairList();
})();

/* ===== real-market-data.js ===== */
(()=>{
  if(typeof markets==='undefined')return;
  const backend=window.DAppsPlatformConfig.apiBase;
  const observed=new Map();
  const lastPrices=new Map();
  const tickDirections=new Map();
  let timer=null,busy=false,generation=0;

  const selected=()=>typeof currentMarket!=='undefined'?currentMarket:null;
  const codeOf=m=>String(m?.symbol||'').split('/')[0].toUpperCase();
  const pollMs=()=>Math.max(1000,Number(window.__marketConfig?.quoteIntervalMs)||1500);
  window.__publicQuoteFresh=m=>Date.now()-(observed.get(m?.symbol)||0)<180000;

  function paint(){
    const m=selected();if(!m)return;
    const fresh=window.__publicQuoteFresh(m);
    const price=document.querySelector('#trade-price'),change=document.querySelector('#trade-change');
    if(price)price.textContent=fresh?fmt(m.price,decimals(m.price)):'--';
    if(change)change.textContent=fresh?`${Number(m.change||0)>=0?'+':''}${Number(m.change||0).toFixed(2)}%`:'--';
    const tick=tickDirections.get(m.symbol)||0;
    if(price)price.className=tick>0?'positive':tick<0?'negative':(Number(m.change||0)>=0?'positive':'negative');
    if(change)change.className=Number(m.change||0)>=0?'positive':'negative';
    const high=document.querySelector('#trade-high'),low=document.querySelector('#trade-low'),badge=document.querySelector('#chart-price-badge');
    if(high)high.textContent=fresh&&Number(m.high)>0?fmt(m.high,decimals(m.high)):'--';
    if(low)low.textContent=fresh&&Number(m.low)>0?fmt(m.low,decimals(m.low)):'--';
    if(badge)badge.textContent=fresh?fmt(m.price,decimals(m.price)):'--';
  }

  function applyQuote(m,data){
    const price=Number(data?.price);
    if(!m||!Number.isFinite(price)||price<=0)return;
    const previous=lastPrices.get(m.symbol);
    if(Number.isFinite(previous)){
      if(price>previous)tickDirections.set(m.symbol,1);
      else if(price<previous)tickDirections.set(m.symbol,-1);
    }
    lastPrices.set(m.symbol,price);
    m.price=price;
    m.change=Number(data.change24h)||0;
    m.high=Number(data.high24h)||price;
    m.low=Number(data.low24h)||price;
    m.volume24h=Number(data.volume24h)||0;
    m.__quoteAt=Date.now();
    observed.set(m.symbol,m.__quoteAt);
    paint();
    window.dispatchEvent(new CustomEvent('dapps:market-quote',{detail:{symbol:m.symbol,price:m.price,change:m.change,high:m.high,low:m.low,volume:m.volume24h,time:data.time||new Date().toISOString(),stale:Boolean(data.stale)}}));
    window.dispatchEvent(new Event('dapps:markets-updated'));
  }

  async function ticker(version){
    const m=selected(),symbol=m?.symbol,code=codeOf(m);
    if(!m||!code||busy)return;
    busy=true;
    try{
      const r=await fetch(backend+'/api/market/quote?symbol='+encodeURIComponent(code),{cache:'no-store',headers:{Accept:'application/json'}});
      if(!r.ok)throw Error(String(r.status));
      const data=await r.json();
      if(version!==generation||selected()?.symbol!==symbol)return;
      applyQuote(m,data);
    }catch(_){
      if(version===generation&&selected()?.symbol===symbol)paint();
    }finally{busy=false}
  }

  function schedule(immediate=false){
    generation++;
    const version=generation;
    clearTimeout(timer);
    const run=async()=>{
      await ticker(version);
      if(version!==generation)return;
      timer=setTimeout(run,pollMs());
    };
    timer=setTimeout(run,immediate?0:pollMs());
  }

  window.addEventListener('dapps:market-selected',()=>schedule(true));
  window.addEventListener('dapps:market-config',()=>schedule(true));
  schedule(true);
})();

/* ===== terminal-market.js ===== */
(()=>{
  const page=document.querySelector('#page-trade');
  const grid=page?.querySelector('.trade-grid');
  const orderCard=page?.querySelector('.short-trade-card');
  const positions=page?.querySelector('.positions-panel');
  if(!page||!grid||!orderCard||!positions)return;

  const api=window.DAppsPlatformConfig.apiBase;
  const activeMarket=()=>typeof currentMarket!=='undefined'?currentMarket:null;
  const code=()=>String(activeMarket()?.symbol||'BTC/USDT').split('/')[0].toUpperCase();
  const compact=v=>Number(v||0).toLocaleString('en-US',{maximumFractionDigits:4});

  // Desktop terminal: chart / market depth / execution in one compact workspace.
  grid.appendChild(orderCard);

  const volumeStat=document.createElement('div');
  volumeStat.className='terminal-stat';
  volumeStat.innerHTML='<span>24h Volume</span><strong id="trade-volume">--</strong>';
  page.querySelector('.trade-header')?.appendChild(volumeStat);
  function paintStats(){
    const m=activeMarket();if(!m)return;
    const volume=Number(m.volume24h||m.volume||0);
    const text=volume?compact(volume)+' '+code():'--';
    const a=document.getElementById('trade-volume');if(a)a.textContent=text;
  }
  function refresh(){paintStats()}
  window.addEventListener('dapps:markets-updated',paintStats);
  const base=window.selectMarket;
  if(typeof base==='function')window.selectMarket=function(m){const out=base(m);setTimeout(refresh,20);return out};
  refresh();setInterval(()=>{if(page.classList.contains('active')){paintStats()}},1800);
})();
;
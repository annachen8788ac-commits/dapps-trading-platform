(()=>{
  if(typeof markets==='undefined'||!Array.isArray(markets))return;
  window.markets=markets;
  const backend=localStorage.getItem('dapps:apiBase')||'https://dapps-trading-platform-production.up.railway.app';
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
    const script=document.createElement('script');script.src='pledge-ui.js?v=20260904-1';script.dataset.pledgeUi='1';document.body.appendChild(script);
  }
})();
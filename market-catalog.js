(()=>{
  if(typeof markets==='undefined'||!Array.isArray(markets)) return;
  window.markets=markets;

  const fallback=[['USDT','Tether',1,'#26a17b'],['USDC','USD Coin',1,'#2775ca'],['ADA','Cardano',.34,'#3468d4'],['AVAX','Avalanche',24.12,'#e84142'],['LINK','Chainlink',12.86,'#2a5ada'],['DOT','Polkadot',3.91,'#e6007a'],['POL','Polygon',.41,'#8247e5'],['BCH','Bitcoin Cash',536.2,'#8dc351'],['UNI','Uniswap',6.22,'#ff007a'],['ATOM','Cosmos',4.31,'#5064fb'],['XLM','Stellar',.231,'#232323'],['ETC','Ethereum Classic',18.64,'#328332'],['FIL','Filecoin',2.44,'#0090ff'],['NEAR','NEAR Protocol',2.58,'#303030'],['APT','Aptos',4.72,'#4b5757'],['ARB','Arbitrum',.51,'#28a0f0'],['OP','Optimism',.76,'#ff0420'],['SUI','Sui',2.31,'#6fbcf0'],['PEPE','Pepe',.0000058,'#4c9540'],['SHIB','Shiba Inu',.0000079,'#ef5b2a'],['AAVE','Aave',114.2,'#7b61ff'],['MKR','Maker',1740,'#1aab9b'],['INJ','Injective',12.4,'#5264ff'],['RENDER','Render',4.63,'#d71920'],['FET','Artificial Superintelligence Alliance',.62,'#6d58d9'],['TON','Toncoin',3.16,'#0098ea'],['HBAR','Hedera',.17,'#232323'],['ICP','Internet Computer',4.86,'#29abe2'],['VET','VeChain',.022,'#15bdff'],['ALGO','Algorand',.14,'#252525'],['SEI','Sei',.31,'#b82222'],['IMX','Immutable',.72,'#17b5ff'],['GRT','The Graph',.087,'#6f4cff'],['LDO','Lido DAO',1.04,'#00a3ff'],['RUNE','THORChain',1.48,'#22d3a3'],['JUP','Jupiter',.46,'#6fc3a5'],['WIF','dogwifhat',.88,'#9a7354'],['BONK','Bonk',.000014,'#f3a53b']];
  const existing=new Set(markets.map(m=>m.symbol));
  fallback.forEach(([code,name,price,bg],i)=>{const symbol=code+'/USDT';if(existing.has(symbol))return;markets.push({symbol,name,icon:code,price,change:Number((((i%7)-3)*.37).toFixed(2)),high:price*1.018,low:price*.982,type:'crypto',bg,source:'fallback'});existing.add(symbol)});

  const style=document.createElement('style');
  style.textContent=`
    .coin-icon,.mini-icon{font-family:Inter,system-ui,sans-serif;font-weight:800;letter-spacing:-.4px;overflow:hidden}
    .coin-icon img,.mini-icon img{width:100%;height:100%;object-fit:cover;border-radius:50%}
    .coin-icon.small,.mini-icon{font-size:8px!important}.coin-icon.large{font-size:10px!important}
    #page-trade .trade-grid{align-items:start!important}#page-trade .chart-panel{align-self:start!important;height:auto!important;min-height:0!important}
    .trade-quick-markets{display:flex;gap:8px;overflow-x:auto;padding:0 0 10px;scrollbar-width:none}.trade-quick-markets::-webkit-scrollbar{display:none}
    .trade-quick-market{flex:0 0 auto;border:1px solid #26344a;background:#0e1725;color:#b9c6da;border-radius:9px;padding:8px 10px;cursor:pointer;font-size:11px;font-weight:700;white-space:nowrap}.trade-quick-market.active,.trade-quick-market:hover{border-color:#438cff;color:#fff;background:#13233a}
    .market-catalog-tools{display:grid;grid-template-columns:minmax(220px,1fr) auto;gap:10px;margin:0 0 12px}.market-search{width:100%;border:1px solid #263850;background:#0c1726;color:#fff;border-radius:10px;padding:11px 13px;outline:none}.market-search:focus{border-color:#438cff}.market-count{display:flex;align-items:center;padding:0 12px;border:1px solid #263850;border-radius:10px;color:#91a2b9;font-size:11px;background:#0c1726}.market-source-note{font-size:10px;color:#71839b;margin:8px 2px 0}
    @media(max-width:720px){.market-catalog-tools{grid-template-columns:1fr}.market-count{min-height:38px}.trade-quick-markets{padding-bottom:7px}.trade-quick-market{padding:7px 9px;font-size:10px}#page-trade .chart-stage{height:300px!important}}
  `;document.head.appendChild(style);

  let query='';
  function renderQuickMarkets(){
    const grid=document.querySelector('#page-trade .trade-grid');if(!grid)return;
    let bar=document.querySelector('#page-trade .trade-quick-markets');if(!bar){bar=document.createElement('div');bar.className='trade-quick-markets';grid.parentNode.insertBefore(bar,grid)}
    const preferred=['BTC/USDT','ETH/USDT','USDT/USDT','BNB/USDT','SOL/USDT','XRP/USDT','DOGE/USDT','ADA/USDT','AVAX/USDT','LINK/USDT'];
    const set=preferred.map(s=>markets.find(m=>m.symbol===s)).filter(Boolean);
    bar.innerHTML=set.map(m=>`<button type="button" class="trade-quick-market${window.currentMarket?.symbol===m.symbol?' active':''}" data-symbol="${m.symbol}">${m.symbol}</button>`).join('');
    bar.querySelectorAll('button').forEach(btn=>btn.onclick=()=>{const m=markets.find(x=>x.symbol===btn.dataset.symbol);if(m){selectMarket(m);renderQuickMarkets()}})
  }

  function installMarketTools(){
    const panel=document.querySelector('#page-markets .market-panel');if(!panel||document.querySelector('.market-catalog-tools'))return;
    const tools=document.createElement('div');tools.className='market-catalog-tools';tools.innerHTML='<input class="market-search" type="search" placeholder="Search by coin name or symbol" autocomplete="off"><div class="market-count">Loading market catalog…</div>';
    panel.parentNode.insertBefore(tools,panel);const note=document.createElement('div');note.className='market-source-note';note.textContent='Market prices and 24h data are loaded from a public market-data source when available.';panel.insertAdjacentElement('afterend',note);
    tools.querySelector('.market-search').addEventListener('input',e=>{query=e.target.value.trim().toLowerCase();renderCatalog(document.querySelector('.filter.active')?.dataset.filter||'all')});
  }

  function iconHTML(m,cls='coin-icon small'){return m.image?`<span class="${cls}"><img src="${m.image}" alt=""></span>`:`<span class="${cls}" style="background:${m.bg||'#24344d'}">${String(m.icon||m.symbol.split('/')[0]).slice(0,5)}</span>`}
  function renderCatalog(filter='all'){
    const list=document.querySelector('#market-list');if(!list)return;
    const rows=markets.filter(m=>(filter==='all'||m.type===filter)&&(!query||m.symbol.toLowerCase().includes(query)||m.name.toLowerCase().includes(query)));
    list.innerHTML='';rows.forEach(m=>{const row=document.createElement('div');row.className='market-row';row.style.cursor='pointer';row.innerHTML=`<div class="market-name">${iconHTML(m)}<div><strong>${m.symbol}</strong><small class="muted" style="display:block;margin-top:3px">${m.name}</small></div></div><strong>${fmt(m.price,decimals(m.price))}</strong><strong class="${m.change>=0?'positive':'negative'}">${m.change>=0?'+':''}${Number(m.change||0).toFixed(2)}%</strong><span>${fmt(m.high,decimals(m.high))}</span>`;row.onclick=()=>{selectMarket(m);navigate('trade')};list.appendChild(row)});
    const count=document.querySelector('.market-count');if(count)count.textContent=`${rows.length.toLocaleString()} markets`;
  }
  window.renderMarkets=renderCatalog;
  window.renderQuickMarkets=renderQuickMarkets;
  installMarketTools();renderQuickMarkets();renderCatalog('all');

  async function loadCatalog(){
    const pages=[1,2,3,4];
    const all=[];
    try{
      for(const p of pages){const r=await fetch(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=${p}&sparkline=false&price_change_percentage=24h`,{cache:'no-store'});if(!r.ok)throw new Error('market data unavailable');const d=await r.json();if(Array.isArray(d))all.push(...d)}
      all.forEach((c,i)=>{const code=String(c.symbol||'').toUpperCase().replace(/[^A-Z0-9.-]/g,'');if(!code)return;const symbol=code+'/USDT',price=Number(c.current_price);if(!Number.isFinite(price)||price<=0)return;let m=markets.find(x=>x.symbol===symbol);if(!m){m={symbol,name:c.name||code,icon:code,type:'crypto',bg:'#24344d'};markets.push(m)}m.cgId=c.id;m.name=c.name||m.name;m.image=c.image||m.image;m.price=price;m.change=Number(c.price_change_percentage_24h)||0;m.high=Number(c.high_24h)||price;m.low=Number(c.low_24h)||price;m.marketCap=Number(c.market_cap)||0;m.volume=Number(c.total_volume)||0;m.source='coingecko'});
      window.__fullCryptoCatalogLoaded=true;renderCatalog(document.querySelector('.filter.active')?.dataset.filter||'all');renderQuickMarkets();window.dispatchEvent(new CustomEvent('dapps:markets-updated'));
    }catch(e){window.__fullCryptoCatalogLoaded=false;const count=document.querySelector('.market-count');if(count)count.textContent=`${markets.length.toLocaleString()} markets · fallback`;}
  }
  loadCatalog();

  if(!document.querySelector('script[data-pledge-ui]')){
    const s=document.createElement('script');s.src='pledge-ui.js?v=20260904-1';s.dataset.pledgeUi='1';document.body.appendChild(s);
  }
})();
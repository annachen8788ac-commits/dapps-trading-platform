(()=>{
  if(!Array.isArray(window.markets)) return;

  const fallback=[['USDT','Tether',1,'#26a17b'],['USDC','USD Coin',1,'#2775ca'],['ADA','Cardano',.34,'#3468d4'],['AVAX','Avalanche',24.12,'#e84142'],['LINK','Chainlink',12.86,'#2a5ada'],['DOT','Polkadot',3.91,'#e6007a'],['POL','Polygon',.41,'#8247e5'],['BCH','Bitcoin Cash',536.2,'#8dc351'],['UNI','Uniswap',6.22,'#ff007a'],['ATOM','Cosmos',4.31,'#5064fb'],['XLM','Stellar',.231,'#232323'],['ETC','Ethereum Classic',18.64,'#328332'],['FIL','Filecoin',2.44,'#0090ff'],['NEAR','NEAR Protocol',2.58,'#303030'],['APT','Aptos',4.72,'#4b5757'],['ARB','Arbitrum',.51,'#28a0f0'],['OP','Optimism',.76,'#ff0420'],['SUI','Sui',2.31,'#6fbcf0'],['PEPE','Pepe',.0000058,'#4c9540'],['SHIB','Shiba Inu',.0000079,'#ef5b2a'],['AAVE','Aave',114.2,'#7b61ff'],['MKR','Maker',1740,'#1aab9b'],['INJ','Injective',12.4,'#5264ff'],['RENDER','Render',4.63,'#d71920'],['FET','Artificial Superintelligence Alliance',.62,'#6d58d9'],['TON','Toncoin',3.16,'#0098ea']];
  const existing=new Set(window.markets.map(m=>m.symbol));
  fallback.forEach(([code,name,price,bg],i)=>{const symbol=code+'/USDT';if(existing.has(symbol))return;window.markets.push({symbol,name,icon:code,price,change:Number((((i%7)-3)*.37).toFixed(2)),high:price*1.018,low:price*.982,type:'crypto',bg});existing.add(symbol)});

  const style=document.createElement('style');
  style.textContent=`
    .coin-icon,.mini-icon{font-family:Inter,system-ui,sans-serif;font-weight:800;letter-spacing:-.4px}
    .coin-icon.small,.mini-icon{font-size:8px!important}.coin-icon.large{font-size:10px!important}
    .trade-quick-markets{display:flex;gap:8px;overflow-x:auto;padding:8px 0 10px;scrollbar-width:none;background:transparent}
    .trade-quick-markets::-webkit-scrollbar{display:none}
    .trade-quick-market{flex:0 0 auto;border:1px solid #26344a;background:#0e1725;color:#b9c6da;border-radius:9px;padding:8px 10px;cursor:pointer;font-size:11px;font-weight:700;white-space:nowrap}
    .trade-quick-market.active,.trade-quick-market:hover{border-color:#438cff;color:#fff;background:#13233a}
    #page-trade .trade-header{margin-bottom:10px!important}
    #page-trade .trade-grid{margin-top:0!important}
    #page-trade .chart-panel{margin-top:0!important}
    @media(max-width:720px){#page-trade .trade-header{margin-bottom:6px!important}.trade-quick-markets{padding:5px 0 7px;margin:0}.trade-quick-market{padding:7px 9px;font-size:10px}}
  `;
  document.head.appendChild(style);

  function rerenderAll(){
    try{window.renderMarkets?.(document.querySelector('.filter.active')?.dataset.filter||'all')}catch{}
    try{window.__renderPairList?.()}catch{}
    renderQuickMarkets();
  }

  function renderQuickMarkets(){
    const trade=document.querySelector('#page-trade');
    const grid=trade?.querySelector('.trade-grid');
    if(!trade||!grid)return;
    let bar=trade.querySelector('.trade-quick-markets');
    if(!bar){bar=document.createElement('div');bar.className='trade-quick-markets';grid.parentNode.insertBefore(bar,grid)}
    const preferred=['BTC/USDT','ETH/USDT','USDT/USDT','BNB/USDT','SOL/USDT','XRP/USDT','DOGE/USDT','ADA/USDT'];
    const set=preferred.map(s=>window.markets.find(m=>m.symbol===s)).filter(Boolean);
    bar.innerHTML=set.map(m=>`<button type="button" class="trade-quick-market${window.currentMarket?.symbol===m.symbol?' active':''}" data-symbol="${m.symbol}">${m.symbol}</button>`).join('');
    bar.querySelectorAll('button').forEach(btn=>btn.onclick=()=>{const m=window.markets.find(x=>x.symbol===btn.dataset.symbol);if(m){window.selectMarket(m);renderQuickMarkets()}})
  }
  window.renderQuickMarkets=renderQuickMarkets;
  renderQuickMarkets();

  async function loadCatalog(){
    const pages=[1,2,3,4];
    const endpoint=p=>`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=${p}&sparkline=false&price_change_percentage=24h`;
    try{
      const batches=await Promise.all(pages.map(async p=>{const r=await fetch(endpoint(p),{headers:{accept:'application/json'}});if(!r.ok)throw new Error('catalog');return r.json()}));
      batches.flat().forEach((c,i)=>{
        const code=String(c.symbol||'').toUpperCase().replace(/[^A-Z0-9.-]/g,'');
        if(!code||code==='USDT')return;
        const symbol=code+'/USDT';
        if(existing.has(symbol))return;
        const price=Number(c.current_price);
        if(!Number.isFinite(price)||price<=0)return;
        const change=Number(c.price_change_percentage_24h)||0;
        window.markets.push({symbol,name:c.name||code,icon:code,price,change,high:Number(c.high_24h)||price,low:Number(c.low_24h)||price,type:'crypto',bg:'#24344d',image:c.image||''});
        existing.add(symbol);
      });
      window.__fullCryptoCatalogLoaded=true;
      rerenderAll();
    }catch(e){window.__fullCryptoCatalogLoaded=false;}
  }

  loadCatalog();
})();
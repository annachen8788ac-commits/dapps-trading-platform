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
    @media(max-width:720px){#page-markets .market-table-head,#page-markets .market-row{grid-template-columns:1.45fr 1fr .85fr}#page-markets .market-table-head span:nth-child(4),#page-markets .market-row>*:nth-child(4){display:none}.trade-pair-selector{margin-left:0}.pair-select-btn{padding:6px 8px}.pair-menu{position:fixed;left:12px;right:12px;bottom:78px;top:auto;width:auto;max-height:66vh;border-radius:16px}.pair-list{max-height:56vh}}
  `;
  document.head.appendChild(style);

  marketHead.innerHTML = '<span>Market</span><span>Last Price</span><span>24h Change</span><span>24h High</span>';

  window.renderMarkets = function(filter='all'){
    marketList.innerHTML='';
    markets.filter(m=>filter==='all'||m.type===filter).forEach(m=>{
      const row=document.createElement('div');
      row.className='market-row';
      row.innerHTML=`<div class="market-name"><span class="coin-icon small" style="background:${m.bg}">${m.icon}</span><div><strong>${m.symbol}</strong><small class="muted" style="display:block;margin-top:3px">${m.name}</small></div></div><strong>${fmt(m.price,decimals(m.price))}</strong><strong class="${m.change>=0?'positive':'negative'}">${m.change>=0?'+':''}${m.change.toFixed(2)}%</strong><span>${fmt(m.high,decimals(m.high))}</span>`;
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
      item.innerHTML=`<span class="left"><span class="mini-icon" style="background:${m.bg}">${m.icon}</span><span><strong>${m.symbol}</strong><small>${m.name}</small></span></span><span class="price"><b>${fmt(m.price,decimals(m.price))}</b><span class="${m.change>=0?'positive':'negative'}">${m.change>=0?'+':''}${m.change.toFixed(2)}%</span></span>`;
      item.addEventListener('click',()=>{selectMarket(m);menu.classList.remove('open');search.value='';renderPairList();window.renderQuickMarkets?.()});
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
  window.selectMarket = function(m){const result = baseSelectMarket(m);renderPairList(search.value);window.renderQuickMarkets?.();return result;};

  renderMarkets(document.querySelector('.filter.active')?.dataset.filter||'all');
  renderPairList();
})();
(() => {
  const ACTIVE_KEY = 'dapps:activeTrades:v2';
  const HISTORY_KEY = 'dapps:tradeHistory:v2';
  const BALANCE_KEY = 'dapps:demoBalance:v2';
  const minimums = {30:200,60:1000,90:10000,180:50000,360:250000};
  const rates = {30:21,60:29,90:37,180:45,360:53};
  const placeBtn = document.querySelector('#place-trade');
  const amountInput = document.querySelector('#trade-amount');
  const list = document.querySelector('#positions-list');
  const head = document.querySelector('.positions-table-head');
  const tabs = [...document.querySelectorAll('.positions-heading .tab-row button')];
  if(!placeBtn || !amountInput || !list || !head) return;

  const style = document.createElement('style');
  style.textContent = `
    .trade-grid{align-items:start}
    .chart-panel{align-self:start}
    .chart-stage{height:380px!important}
    .positions-table-head,.position-row{grid-template-columns:1.05fr .75fr 1fr 1fr 1.25fr .8fr .85fr .8fr;align-items:center}
    .position-row{cursor:pointer;transition:.16s;background:transparent}
    .position-row:hover{background:rgba(255,255,255,.025)}
    .position-row .trade-time{color:#a8b2c7;white-space:nowrap}
    .position-row .status-pill{display:inline-flex;width:max-content;align-items:center;gap:6px;padding:5px 8px;border-radius:999px;font-weight:700;font-size:10px}
    .status-pill.active{background:rgba(77,124,255,.12);color:#8facff}.status-pill.active:before{content:'';width:6px;height:6px;border-radius:50%;background:#4d7cff;box-shadow:0 0 8px rgba(77,124,255,.7)}
    .status-pill.won{background:rgba(40,199,124,.12);color:#62dca0}.status-pill.lost{background:rgba(255,91,103,.12);color:#ff8b94}
    .detail-link{border:1px solid #35405a;background:#151a27;color:#a9bcf7;border-radius:8px;padding:7px 9px;cursor:pointer;font-size:11px}
    .detail-link:hover{border-color:#547cff;color:#fff}.countdown{font-variant-numeric:tabular-nums;color:#dce6ff;font-weight:700}
    .positions-panel{overflow:hidden}.positions-list.empty-state{min-height:86px;display:grid;place-items:center;padding:18px}
    @media(max-width:1050px){.chart-stage{height:360px!important}}
    @media(max-width:720px){.chart-stage{height:320px!important}.positions-panel{overflow-x:auto}.positions-table-head,.position-row{display:grid!important;grid-template-columns:120px 90px 110px 110px 155px 90px 85px 92px;min-width:852px;padding:12px 14px}.positions-table-head{font-size:10px}.position-row{font-size:11px}.position-row>*{display:block!important}.positions-list.empty-state{min-width:0}.positions-heading{position:sticky;left:0;min-width:100%;background:linear-gradient(180deg,rgba(28,32,47,.98),rgba(20,23,34,.98));z-index:2}}
  `;
  document.head.appendChild(style);

  const safeParse = (key, fallback=[]) => { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch { return fallback; } };
  const save = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} };
  const fmtTime = ts => new Date(ts).toLocaleString('en-US',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});
  const marketBySymbol = symbol => markets.find(m => m.symbol === symbol) || currentMarket;

  let ledgerActive = safeParse(ACTIVE_KEY, []);
  let ledgerHistory = safeParse(HISTORY_KEY, []);
  let mode = 'active';

  const savedBalance = Number(localStorage.getItem(BALANCE_KEY));
  if(Number.isFinite(savedBalance)) balance = savedBalance;
  activeTrades.length = 0;

  function persist(){
    save(ACTIVE_KEY, ledgerActive);
    save(HISTORY_KEY, ledgerHistory);
    try { localStorage.setItem(BALANCE_KEY, String(balance)); } catch {}
  }

  function openDetails(id){
    window.location.href = `trade-detail.html?id=${encodeURIComponent(id)}`;
  }

  function renderActive(){
    head.innerHTML = '<span>Pair</span><span>Direction</span><span>Entry</span><span>Amount</span><span>Opened</span><span>Time Left</span><span>Status</span><span>Details</span>';
    if(!ledgerActive.length){
      list.className='positions-list empty-state';
      list.textContent='No active trades.';
      return;
    }
    list.className='positions-list';
    const now=Date.now();
    list.innerHTML=ledgerActive.map(t=>{
      const left=Math.max(0,Math.ceil((t.endAt-now)/1000));
      return `<div class="position-row" data-trade-id="${t.id}">
        <strong>${t.symbol}</strong>
        <span class="${t.dir==='up'?'positive':'negative'}">${t.dir==='up'?'↑ Up':'↓ Down'}</span>
        <strong>${fmt(t.entry,decimals(t.entry))}</strong>
        <span>${fmt(t.amount)} USDT</span>
        <span class="trade-time">${fmtTime(t.openedAt)}</span>
        <span class="countdown">${left}s</span>
        <span><i class="status-pill active">Trading</i></span>
        <span><button class="detail-link" type="button">View</button></span>
      </div>`;
    }).join('');
  }

  function renderHistory(){
    head.innerHTML = '<span>Pair</span><span>Result</span><span>Entry</span><span>Exit</span><span>Amount</span><span>Opened</span><span>Closed</span><span>Details</span>';
    if(!ledgerHistory.length){
      list.className='positions-list empty-state';
      list.textContent='No completed trades yet.';
      return;
    }
    list.className='positions-list';
    list.innerHTML=ledgerHistory.map(t=>`<div class="position-row" data-trade-id="${t.id}">
      <strong>${t.symbol}</strong>
      <span><i class="status-pill ${t.result==='won'?'won':'lost'}">${t.result==='won'?'Won':'Lost'}</i></span>
      <strong>${fmt(t.entry,decimals(t.entry))}</strong>
      <strong>${fmt(t.exit,decimals(t.exit))}</strong>
      <span>${fmt(t.amount)} USDT</span>
      <span class="trade-time">${fmtTime(t.openedAt)}</span>
      <span class="trade-time">${fmtTime(t.closedAt)}</span>
      <span><button class="detail-link" type="button">View</button></span>
    </div>`).join('');
  }

  function renderLedger(){ mode==='history' ? renderHistory() : renderActive(); }
  window.renderPositions = renderLedger;

  list.addEventListener('click',e=>{
    const row=e.target.closest('.position-row[data-trade-id]');
    if(!row) return;
    openDetails(row.dataset.tradeId);
  });

  tabs.forEach((tab,index)=>tab.addEventListener('click',()=>{
    mode=index===0?'active':'history';
    tabs.forEach(x=>x.classList.remove('active'));
    tab.classList.add('active');
    head.style.display='grid';
    renderLedger();
  }));

  placeBtn.onclick = () => {
    const amount=Number(amountInput.value)||0;
    const min=minimums[Number(duration)]??1000;
    const rate=rates[Number(duration)]??29;
    if(amount<min){ showToast(`Order blocked: minimum for ${duration}s is ${fmt(min,0)} USDT.`); return; }
    if(amount>balance){ showToast('Order blocked: insufficient available balance.'); return; }
    const now=Date.now();
    const trade={
      id:String(now)+'-'+Math.random().toString(36).slice(2,7),
      symbol:currentMarket.symbol,
      name:currentMarket.name,
      dir:direction,
      entry:currentMarket.price,
      amount,
      duration:Number(duration),
      profitRate:rate,
      openedAt:now,
      endAt:now+Number(duration)*1000,
      status:'active'
    };
    balance-=amount;
    ledgerActive.unshift(trade);
    persist();
    updateBalances();
    mode='active';
    tabs.forEach((x,i)=>x.classList.toggle('active',i===0));
    renderActive();
    showToast(`${trade.symbol} ${trade.dir==='up'?'Up':'Down'} ${trade.duration}s trade opened.`);
  };

  function settleExpired(){
    const now=Date.now();
    let changed=false;
    const remaining=[];
    ledgerActive.forEach(t=>{
      if(t.endAt>now){ remaining.push(t); return; }
      const m=marketBySymbol(t.symbol);
      const exit=m.price;
      const won=t.dir==='up'?exit>=t.entry:exit<=t.entry;
      const profit=won?t.amount*t.profitRate/100:-t.amount;
      if(won) balance+=t.amount+profit;
      ledgerHistory.unshift({...t,exit,closedAt:now,status:'closed',result:won?'won':'lost',profit});
      changed=true;
      showToast(`${t.symbol} trade ${won?'won':'lost'} · ${won?'+':''}${fmt(profit)} USDT`);
    });
    if(changed){
      ledgerActive=remaining;
      persist();
      updateBalances();
      renderLedger();
    }else if(mode==='active' && ledgerActive.length){
      renderActive();
    }
  }

  settleExpired();
  renderLedger();
  updateBalances();
  setInterval(settleExpired,1000);
})();
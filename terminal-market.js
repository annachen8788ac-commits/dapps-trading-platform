(()=>{
  const page=document.querySelector('#page-trade');
  const grid=page?.querySelector('.trade-grid');
  const orderCard=page?.querySelector('.short-trade-card');
  const positions=page?.querySelector('.positions-panel');
  if(!page||!grid||!orderCard||!positions)return;

  const api=localStorage.getItem('dapps:apiBase')||'https://dapps-trading-platform-production.up.railway.app';
  const activeMarket=()=>typeof currentMarket!=='undefined'?currentMarket:null;\n  const code=()=>String(activeMarket()?.symbol||'BTC/USDT').split('/')[0].toUpperCase();
  const money=v=>Number(v).toLocaleString('en-US',{minimumFractionDigits:decimals(Number(v)||0),maximumFractionDigits:decimals(Number(v)||0)});
  const compact=v=>Number(v||0).toLocaleString('en-US',{maximumFractionDigits:4});

  const sidebar=document.createElement('aside');
  sidebar.className='terminal-sidebar';
  sidebar.innerHTML=`
    <section class="terminal-panel">
      <div class="terminal-panel-head"><div class="label"><small>MARKET DEPTH</small><strong>Order Book</strong></div><span class="terminal-live">LIVE</span></div>
      <div class="book-head"><span>Price</span><span>Size</span><span>Total</span></div>
      <div class="book-scroll"><div id="terminal-asks"></div><div class="book-mid"><strong id="terminal-mid">--</strong><span id="terminal-spread">Spread --</span></div><div id="terminal-bids"></div></div>
    </section>
    <section class="terminal-panel">
      <div class="terminal-panel-head"><div class="label"><small>TAPE</small><strong>Recent Trades</strong></div><span class="terminal-live">STREAM</span></div>
      <div class="trade-tape-head"><span>Price</span><span>Size</span><span>Time</span></div>
      <div class="trade-tape-scroll" id="terminal-trades"></div>
    </section>`;
  grid.appendChild(sidebar);

  const indicators=document.createElement('div');
  indicators.className='terminal-indicators';
  indicators.innerHTML='<span class="indicator-e7">EMA 7 <b id="term-ema7">--</b></span><span class="indicator-e25">EMA 25 <b id="term-ema25">--</b></span><span class="indicator-e99">EMA 99 <b id="term-ema99">--</b></span><span>VOL <b id="term-vol">--</b></span><span class="indicator-macd">MACD <b id="term-macd">--</b></span><span class="indicator-rsi">RSI <b id="term-rsi">--</b></span>';
  page.querySelector('.chart-panel')?.appendChild(indicators);

  const exec=document.createElement('div');
  exec.className='terminal-execution';
  orderCard.parentNode.insertBefore(exec,positions);
  exec.appendChild(orderCard);

  const micro=document.createElement('section');
  micro.className='micro-panel';
  micro.innerHTML=`
    <div class="terminal-panel-head"><div class="label"><small>LIQUIDITY SNAPSHOT</small><strong>Market Microstructure</strong></div><span class="terminal-live">CONNECTED</span></div>
    <div class="micro-grid">
      <div><span>Best Bid</span><strong id="micro-bid">--</strong></div>
      <div><span>Best Ask</span><strong id="micro-ask">--</strong></div>
      <div><span>Spread</span><strong id="micro-spread">--</strong></div>
      <div><span>Bid Depth</span><strong id="micro-bid-depth">--</strong></div>
      <div><span>Ask Depth</span><strong id="micro-ask-depth">--</strong></div>
      <div><span>24H Volume</span><strong id="micro-volume">--</strong></div>
    </div>`;
  exec.insertBefore(micro,orderCard);

  const volumeStat=document.createElement('div');
  volumeStat.className='terminal-stat';
  volumeStat.innerHTML='<span>24h Volume</span><strong id="trade-volume">--</strong>';
  page.querySelector('.trade-header')?.appendChild(volumeStat);

  function ema(values,period){
    if(!values.length)return NaN;
    const k=2/(period+1);let out=values[0];
    for(let i=1;i<values.length;i++)out=values[i]*k+out*(1-k);
    return out;
  }
  function rsi(values,period=14){
    if(values.length<period+1)return NaN;
    let gain=0,loss=0;
    for(let i=values.length-period;i<values.length;i++){const d=values[i]-values[i-1];if(d>=0)gain+=d;else loss-=d}
    if(loss===0)return 100;const rs=(gain/period)/(loss/period);return 100-(100/(1+rs));
  }
  function indicatorsPaint(){
    const data=(typeof chartHistory!=='undefined'&&activeMarket())?(chartHistory.get(activeMarket().symbol)||[]):[];
    const closes=data.map(x=>Number(x.close)).filter(Number.isFinite);
    if(!closes.length)return;
    const e7=ema(closes,7),e25=ema(closes,25),e99=ema(closes,99),macd=ema(closes,12)-ema(closes,26),r=rsi(closes);
    const set=(id,v,formatter=money)=>{const el=document.getElementById(id);if(el&&Number.isFinite(v))el.textContent=formatter(v)};
    set('term-ema7',e7);set('term-ema25',e25);set('term-ema99',e99);set('term-macd',macd,v=>(v>=0?'+':'')+money(v));set('term-rsi',r,v=>v.toFixed(2));
    const vol=data.at(-1)?.volume;set('term-vol',vol,v=>compact(v));
  }

  let bookController=null,tradesController=null,serial=0;
  async function get(url,controller){const r=await fetch(url,{cache:'no-store',signal:controller.signal});if(!r.ok)throw Error(String(r.status));return r.json()}
  function rowBook(type,[price,size],max){
    const pct=Math.min(100,Math.max(3,(size/max)*100));
    return `<div class="book-row ${type}"><i style="width:${pct}%"></i><span>${money(price)}</span><span>${compact(size)}</span><span>${compact(price*size)}</span></div>`;
  }
  async function loadBook(){
    const token=++serial,c=code();bookController?.abort();bookController=new AbortController();
    try{
      const d=await get(`${api}/api/market/orderbook?symbol=${encodeURIComponent(c)}&level=2`,bookController);
      if(token!==serial||c!==code())return;
      const asks=(d.asks||[]).slice(0,10).reverse(),bids=(d.bids||[]).slice(0,10),max=Math.max(1,...asks.map(x=>x[1]),...bids.map(x=>x[1]));
      document.getElementById('terminal-asks').innerHTML=asks.map(x=>rowBook('ask',x,max)).join('');
      document.getElementById('terminal-bids').innerHTML=bids.map(x=>rowBook('bid',x,max)).join('');
      const bestAsk=Number(d.asks?.[0]?.[0]),bestBid=Number(d.bids?.[0]?.[0]),mid=(bestAsk+bestBid)/2,spread=bestAsk-bestBid;
      if(Number.isFinite(mid))document.getElementById('terminal-mid').textContent=money(mid);
      if(Number.isFinite(spread))document.getElementById('terminal-spread').textContent=`Spread ${money(spread)}`;
      const bidDepth=bids.reduce((a,x)=>a+Number(x[1]||0),0),askDepth=asks.reduce((a,x)=>a+Number(x[1]||0),0);
      [['micro-bid',bestBid],['micro-ask',bestAsk],['micro-spread',spread]].forEach(([id,v])=>{const el=document.getElementById(id);if(el&&Number.isFinite(v))el.textContent=money(v)});
      document.getElementById('micro-bid-depth').textContent=compact(bidDepth)+' '+c;
      document.getElementById('micro-ask-depth').textContent=compact(askDepth)+' '+c;
    }catch(e){if(e.name!=='AbortError'){}}
  }
  async function loadTrades(){
    const c=code();tradesController?.abort();tradesController=new AbortController();
    try{
      const d=await get(`${api}/api/market/trades?symbol=${encodeURIComponent(c)}`,tradesController);
      if(c!==code())return;
      document.getElementById('terminal-trades').innerHTML=(d.trades||[]).slice(0,11).map(t=>`<div class="trade-tape-row ${t.side==='sell'?'sell':'buy'}"><span>${money(t.price)}</span><span>${compact(t.size)}</span><span>${new Date(t.time).toLocaleTimeString('en-US',{hour12:false,hour:'2-digit',minute:'2-digit',second:'2-digit'})}</span></div>`).join('');
    }catch(e){if(e.name!=='AbortError'){}}
  }
  function paintStats(){
    const m=activeMarket();if(!m)return;
    const volume=Number(m.volume24h||m.volume||0);
    const text=volume?compact(volume)+' '+code():'--';
    const a=document.getElementById('trade-volume'),b=document.getElementById('micro-volume');if(a)a.textContent=text;if(b)b.textContent=text;
    indicatorsPaint();
  }
  function refresh(){loadBook();loadTrades();paintStats()}
  window.addEventListener('dapps:markets-updated',paintStats);
  const base=window.selectMarket;
  if(typeof base==='function')window.selectMarket=function(m){const out=base(m);setTimeout(refresh,20);return out};
  refresh();setInterval(()=>{if(page.classList.contains('active')){loadBook();loadTrades();paintStats()}},1800);
})();

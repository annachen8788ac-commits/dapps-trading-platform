(()=>{
  if(typeof markets==='undefined')return;
  const backend=localStorage.getItem('dapps:apiBase')||'https://dapps-trading-platform-production.up.railway.app';
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
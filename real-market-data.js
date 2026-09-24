(()=>{
  if(typeof markets==='undefined'||typeof chartHistory==='undefined')return;

  const backend=localStorage.getItem('dapps:apiBase')||'https://dapps-trading-platform-production.up.railway.app';
  const durations={'1H':60,'24H':300,'7D':3600,'30D':21600};
  const supported=new Set(['BTC','ETH','SOL','XRP','LTC','DOGE','ADA','AVAX','LINK','BCH','UNI','DOT','ATOM','XLM','ETC','FIL','NEAR','APT','ARB','OP','SUI','SHIB','AAVE','MKR','INJ','RENDER','FET','TON','HBAR','ICP','VET','ALGO','SEI','IMX','GRT','LDO']);
  const ids={BTC:'bitcoin',ETH:'ethereum',SOL:'solana',XRP:'ripple',LTC:'litecoin',DOGE:'dogecoin',ADA:'cardano',AVAX:'avalanche-2',LINK:'chainlink',BNB:'binancecoin',TRX:'tron',BCH:'bitcoin-cash',DOT:'polkadot',XLM:'stellar',USDT:'tether'};
  const observed=new Map();
  const lastPrices=new Map();
  const tickDirections=new Map();
  const historyCache=new Map();
  const inflight=new Map();
  let request=0,lastPaint=0,tickerTimer=null,tickerBusy=false;

  const codeOf=m=>String(m?.symbol||'').split('/')[0].toUpperCase();
  const selected=()=>typeof currentMarket!=='undefined'?currentMarket:null;
  const cacheKey=(m,tf=chartTimeframe)=>`${m?.symbol||''}:${tf}`;
  window.__publicQuoteFresh=m=>Date.now()-(observed.get(m?.symbol)||0)<180000;

  ensureChartHistory=function(m){return chartHistory.get(m.symbol)||[]};
  chartHistory.clear();
  try{pushChartTick=function(){};}catch{}

  const status=document.querySelector('.legend-live');
  function label(message='LIVE',live=false){
    if(!status)return;
    status.innerHTML=`<i></i> ${message}`;
    status.style.color=live?'#40d99a':'#a8b7cd';
    const dot=status.querySelector('i');if(dot)dot.style.background=live?'#40d99a':'#a8b7cd';
  }
  function setLoading(on){
    const panel=document.querySelector('#page-trade .chart-panel');
    if(panel)panel.classList.toggle('market-switching',!!on);
  }
  function paint(force=false){
    const m=selected();if(!m)return;
    const age=Date.now()-(observed.get(m.symbol)||0),live=age<5000;
    label(live?'LIVE':age<180000?'LIVE · reconnecting':'CONNECTING',live);
    const price=document.querySelector('#trade-price'),change=document.querySelector('#trade-change');
    if(price)price.textContent=age<180000?fmt(m.price,decimals(m.price)):'--';
    if(change)change.textContent=age<180000?`${m.change>=0?'+':''}${Number(m.change||0).toFixed(2)}%`:'--';
    const tick=tickDirections.get(m.symbol)||0;
    if(price)price.className=tick>0?'positive':tick<0?'negative':(m.change>=0?'positive':'negative');
    if(change)change.className=m.change>=0?'positive':'negative';
    for(const [id,value] of [['#trade-high',m.high],['#trade-low',m.low]]){const el=document.querySelector(id);if(el)el.textContent=age<180000?fmt(value,decimals(value)):'--'}
    if((force||Date.now()-lastPaint>150)&&document.querySelector('#page-trade')?.classList.contains('active')){lastPaint=Date.now();drawChart()}
    window.dispatchEvent(new Event('dapps:markets-updated'));
  }
  function quote(m,p,ts=Date.now(),open,hi,lo,size=0){
    if(!m||!Number.isFinite(p)||p<=0)return;
    const previous=lastPrices.get(m.symbol);
    if(Number.isFinite(previous)){if(p>previous)tickDirections.set(m.symbol,1);else if(p<previous)tickDirections.set(m.symbol,-1)}
    lastPrices.set(m.symbol,p);
    m.price=p;
    if(Number.isFinite(open)&&open>0)m.change=(p/open-1)*100;
    if(Number.isFinite(hi)&&hi>0)m.high=hi;
    if(Number.isFinite(lo)&&lo>0)m.low=lo;
    observed.set(m.symbol,Date.now());
    const data=chartHistory.get(m.symbol);
    if(data?.length&&m===selected()){
      const interval=durations[chartTimeframe]||3600,bucket=Math.floor(ts/1000/interval)*interval*1000,last=data[data.length-1];
      if(bucket>last.ts){data.push({ts:bucket,open:last.close,high:p,low:p,close:p,volume:size||0});if(data.length>300)data.shift()}
      else if(bucket===last.ts){last.high=Math.max(last.high,p);last.low=Math.min(last.low,p);last.close=p;last.volume+=(size||0)}
      historyCache.set(cacheKey(m),{at:Date.now(),candles:data.slice()});
    }
    paint();
  }
  async function json(url,signal){
    const r=await fetch(url,{cache:'no-store',signal});if(!r.ok)throw Error(String(r.status));return r.json();
  }
  function installCached(m){
    const cached=historyCache.get(cacheKey(m));
    if(!cached?.candles?.length)return false;
    chartHistory.set(m.symbol,cached.candles.slice());
    setLoading(false);paint(true);return true;
  }
  async function history(m,{prefetch=false}={}){
    const code=codeOf(m);if(!supported.has(code)){if(!prefetch){chartHistory.delete(m.symbol);setLoading(false);fallbackHistory(m)}return}
    const key=cacheKey(m),cached=historyCache.get(key);
    if(cached&&Date.now()-cached.at<15000){if(!prefetch&&m===selected())installCached(m);return}
    if(inflight.has(key))return inflight.get(key);
    const serial=prefetch?request:++request,controller=new AbortController();
    if(!prefetch&&!cached)setLoading(true);
    const task=(async()=>{
      try{
        const granularity=durations[chartTimeframe]||3600;
        const data=await json(`${backend}/api/market/candles?symbol=${encodeURIComponent(code)}&granularity=${granularity}`,controller.signal);
        const rows=Array.isArray(data.candles)?data.candles:[];
        const candles=rows.map(c=>({ts:Number(c[0])*1000,low:Number(c[1]),high:Number(c[2]),open:Number(c[3]),close:Number(c[4]),volume:Number(c[5])})).filter(c=>Number.isFinite(c.close)&&c.close>0).sort((a,b)=>a.ts-b.ts).slice(-300);
        if(!candles.length)throw Error('empty candles');
        historyCache.set(key,{at:Date.now(),candles});
        if(!prefetch&&m===selected()&&serial===request){chartHistory.set(m.symbol,candles.slice());setLoading(false);const latest=candles[candles.length-1];if(!observed.has(m.symbol))quote(m,latest.close,latest.ts,NaN,NaN,NaN,0);paint(true)}
      }catch(e){
        if(e.name!=='AbortError'&&!prefetch&&m===selected()){console.warn('Market history unavailable',m.symbol);setLoading(false);fallbackHistory(m)}
      }finally{inflight.delete(key)}
    })();
    inflight.set(key,task);return task;
  }
  async function ticker(){
    const m=selected(),code=codeOf(m);if(!m||tickerBusy)return;
    if(!supported.has(code)){if(Number.isFinite(Number(m.price))&&Number(m.price)>0)observed.set(m.symbol,Date.now());return;}
    tickerBusy=true;
    try{
      const d=await json(`${backend}/api/market/ticker?symbol=${encodeURIComponent(code)}`);
      if(m!==selected())return;
      m.volume24h=Number(d.volume24h)||m.volume24h||0;
      quote(m,Number(d.price),Date.parse(d.time)||Date.now(),Number(d.open24h),Number(d.high24h),Number(d.low24h),Number(d.size||0));
    }catch(e){if(Date.now()-(observed.get(m.symbol)||0)>10000)label('LIVE · reconnecting',false)}
    finally{tickerBusy=false}
  }
  async function fallback(){
    const idFor=m=>m?.cgId||ids[codeOf(m)];
    const entries=markets.filter(m=>idFor(m)),idList=[...new Set(entries.map(m=>idFor(m)))];
    try{
      const data=await json(`${backend}/api/market/quotes?ids=${idList.join(',')}`);
      if(data.stale)return;
      for(const m of entries){const value=data[idFor(m)];if(!value||Date.now()-(observed.get(m.symbol)||0)<30000)continue;m.price=Number(value.usd)||m.price;if(Number.isFinite(value.usd_24h_change))m.change=value.usd_24h_change;if(Number.isFinite(m.price)&&m.price>0)observed.set(m.symbol,Date.now())}
      window.dispatchEvent(new Event('dapps:markets-updated'));
    }catch{}
  }
  async function fallbackHistory(m){
    const id=m?.cgId||ids[codeOf(m)];if(!id||historyCache.get(cacheKey(m))?.candles?.length)return;
    const serial=request,days=chartTimeframe==='30D'?30:chartTimeframe==='7D'?7:chartTimeframe==='24H'?1:1;
    try{
      const data=await json(`${backend}/api/market/history?id=${encodeURIComponent(id)}&days=${days}`);
      if(serial!==request||m!==selected()||!Array.isArray(data.prices))return;
      const points=data.prices.map(([ts,price])=>({ts:Number(ts),price:Number(price)})).filter(p=>Number.isFinite(p.price));
      const interval=Math.max(durations[chartTimeframe]||300,60)*1000,candles=[];
      for(const point of points){const ts=Math.floor(point.ts/interval)*interval,last=candles.at(-1);if(last?.ts===ts){last.high=Math.max(last.high,point.price);last.low=Math.min(last.low,point.price);last.close=point.price}else candles.push({ts,open:point.price,high:point.price,low:point.price,close:point.price,volume:0,sampled:true})}
      if(candles.length>1){historyCache.set(cacheKey(m),{at:Date.now(),candles:candles.slice(-300)});chartHistory.set(m.symbol,candles.slice(-300));setLoading(false);paint(true)}
    }catch{}
  }
  function restartTicker(){clearInterval(tickerTimer);ticker();tickerTimer=setInterval(ticker,1200)}
  function prefetchPopular(){
    const symbols=['BTC/USDT','ETH/USDT','SOL/USDT','XRP/USDT','DOGE/USDT','ADA/USDT'];
    let delay=0;
    for(const symbol of symbols){const m=markets.find(x=>x.symbol===symbol);if(m&&m!==selected())setTimeout(()=>history(m,{prefetch:true}),delay+=350)}
  }

  const style=document.createElement('style');
  style.textContent=`
    #page-trade .chart-panel{position:relative}
    #page-trade .chart-panel::after{content:"";position:absolute;inset:48px 0 0;pointer-events:none;background:linear-gradient(110deg,transparent 35%,rgba(255,255,255,.025) 50%,transparent 65%);background-size:220% 100%;opacity:0;transition:opacity .12s ease}
    #page-trade .chart-panel.market-switching::after{opacity:1;animation:marketSweep .8s linear infinite}
    #page-trade .chart-stage{transition:opacity .12s ease}
    #page-trade .chart-panel.market-switching .chart-stage{opacity:.58}
    @keyframes marketSweep{from{background-position:160% 0}to{background-position:-60% 0}}
  `;document.head.appendChild(style);

  const baseSelect=window.selectMarket;
  if(typeof baseSelect==='function')window.selectMarket=function(m){
    const same=selected()?.symbol===m?.symbol,out=baseSelect(m);window.currentMarket=m;
    if(!same){request++;installCached(m)||setLoading(true);history(m);restartTicker()}
    return out;
  };
  document.querySelectorAll('.timeframes button').forEach(button=>button.addEventListener('click',()=>{request++;installCached(selected())||setLoading(true);history(selected());setTimeout(()=>fallbackHistory(selected()),700)}));

  installCached(selected());history(selected());restartTicker();
  setTimeout(prefetchPopular,1800);
  setTimeout(fallback,1200);setInterval(fallback,25000);
  setInterval(()=>{const m=selected();if(m)paint()},5000);
})();

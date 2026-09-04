(()=>{
  if(typeof markets==='undefined'||!Array.isArray(markets))return;
  const API='https://api.coingecko.com/api/v3';
  let selectedRequest=0;

  function lockMarket(m,price,high,low,change){
    if(!m||!Number.isFinite(Number(price)))return;
    if(m.__realLocked){m.__setReal?.({price,high,low,change});return;}
    let p=Number(price),h=Number(high)||p,l=Number(low)||p,c=Number(change)||0;
    Object.defineProperty(m,'price',{configurable:true,enumerable:true,get:()=>p,set:()=>{}});
    Object.defineProperty(m,'high',{configurable:true,enumerable:true,get:()=>h,set:()=>{}});
    Object.defineProperty(m,'low',{configurable:true,enumerable:true,get:()=>l,set:()=>{}});
    Object.defineProperty(m,'change',{configurable:true,enumerable:true,get:()=>c,set:()=>{}});
    Object.defineProperty(m,'__realLocked',{value:true,configurable:true});
    Object.defineProperty(m,'__setReal',{value:v=>{if(Number.isFinite(Number(v.price)))p=Number(v.price);if(Number.isFinite(Number(v.high)))h=Number(v.high);if(Number.isFinite(Number(v.low)))l=Number(v.low);if(Number.isFinite(Number(v.change)))c=Number(v.change)},configurable:true});
  }

  function lockCatalog(){markets.forEach(m=>{if(m.source==='coingecko'||m.cgId)lockMarket(m,m.price,m.high,m.low,m.change)})}

  async function loadHistory(m){
    if(!m?.cgId||typeof chartHistory==='undefined')return;
    const request=++selectedRequest;
    try{
      const r=await fetch(`${API}/coins/${encodeURIComponent(m.cgId)}/market_chart?vs_currency=usd&days=1`,{cache:'no-store'});
      if(!r.ok)throw new Error('history');
      const d=await r.json();if(request!==selectedRequest||!Array.isArray(d.prices)||d.prices.length<4)return;
      const prices=d.prices.map(x=>({ts:Number(x[0]),price:Number(x[1])})).filter(x=>Number.isFinite(x.price));
      const desired=120,group=Math.max(1,Math.floor(prices.length/desired)),candles=[];
      for(let i=0;i<prices.length;i+=group){const chunk=prices.slice(i,i+group);if(!chunk.length)continue;const vals=chunk.map(x=>x.price);candles.push({open:vals[0],high:Math.max(...vals),low:Math.min(...vals),close:vals[vals.length-1],volume:0,ts:chunk[chunk.length-1].ts})}
      if(candles.length){chartHistory.set(m.symbol,candles.slice(-180));m.__setReal?.({price:candles[candles.length-1].close});if(typeof drawChart==='function')drawChart()}
    }catch(e){console.warn('Real history unavailable for',m.symbol)}
  }

  async function refreshSelected(){
    const m=window.currentMarket||((typeof currentMarket!=='undefined')?currentMarket:null);if(!m?.cgId)return;
    try{
      const r=await fetch(`${API}/simple/price?ids=${encodeURIComponent(m.cgId)}&vs_currencies=usd&include_24hr_change=true`,{cache:'no-store'});if(!r.ok)return;const d=await r.json(),v=d[m.cgId];if(!v)return;
      m.__setReal?.({price:Number(v.usd),change:Number(v.usd_24h_change)});
      const p=document.querySelector('#trade-price');if(p)p.textContent=fmt(m.price,decimals(m.price));const ch=document.querySelector('#trade-change');if(ch){ch.textContent=`${m.change>=0?'+':''}${m.change.toFixed(2)}%`;ch.className=m.change>=0?'positive':'negative'}const badge=document.querySelector('#chart-price-badge');if(badge)badge.textContent=fmt(m.price,decimals(m.price));
    }catch{}
  }

  const baseSelect=window.selectMarket;
  if(typeof baseSelect==='function')window.selectMarket=function(m){const out=baseSelect(m);window.currentMarket=m;lockCatalog();loadHistory(m);refreshSelected();return out};

  window.addEventListener('dapps:markets-updated',()=>{lockCatalog();const m=window.currentMarket||((typeof currentMarket!=='undefined')?currentMarket:null);if(m){loadHistory(m);refreshSelected()}});

  // Prevent the old synthetic candle writer from inventing price movement once real market data is enabled.
  try{pushChartTick=function(){};}catch{}
  lockCatalog();
  setTimeout(()=>{const m=window.currentMarket||((typeof currentMarket!=='undefined')?currentMarket:null);if(m){loadHistory(m);refreshSelected()}},1200);
  setInterval(refreshSelected,20000);
})();
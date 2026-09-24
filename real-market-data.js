(()=>{
  if(typeof markets==='undefined')return;

  const backend=localStorage.getItem('dapps:apiBase')||'https://dapps-trading-platform-production.up.railway.app';
  const supported=new Set(['BTC','ETH','SOL','XRP','LTC','DOGE','ADA','AVAX','LINK','BCH','UNI','DOT','ATOM','XLM','ETC','FIL','NEAR','APT','ARB','OP','SUI','SHIB','AAVE','MKR','INJ','RENDER','FET','TON','HBAR','ICP','VET','ALGO','SEI','IMX','GRT','LDO']);
  const ids={BTC:'bitcoin',ETH:'ethereum',SOL:'solana',XRP:'ripple',LTC:'litecoin',DOGE:'dogecoin',ADA:'cardano',AVAX:'avalanche-2',LINK:'chainlink',BNB:'binancecoin',TRX:'tron',BCH:'bitcoin-cash',DOT:'polkadot',XLM:'stellar',USDT:'tether'};
  const observed=new Map();
  const lastPrices=new Map();
  const tickDirections=new Map();
  let tickerTimer=null,tickerBusy=false;

  const codeOf=m=>String(m?.symbol||'').split('/')[0].toUpperCase();
  const selected=()=>typeof currentMarket!=='undefined'?currentMarket:null;
  window.__publicQuoteFresh=m=>Date.now()-(observed.get(m?.symbol)||0)<180000;

  function paint(){
    const m=selected();if(!m)return;
    const age=Date.now()-(observed.get(m.symbol)||0);
    const fresh=age<180000;
    const price=document.querySelector('#trade-price');
    const change=document.querySelector('#trade-change');
    if(price)price.textContent=fresh?fmt(m.price,decimals(m.price)):'--';
    if(change)change.textContent=fresh?`${m.change>=0?'+':''}${Number(m.change||0).toFixed(2)}%`:'--';
    const tick=tickDirections.get(m.symbol)||0;
    if(price)price.className=tick>0?'positive':tick<0?'negative':(m.change>=0?'positive':'negative');
    if(change)change.className=m.change>=0?'positive':'negative';
    for(const [id,value] of [['#trade-high',m.high],['#trade-low',m.low]]){
      const el=document.querySelector(id);
      if(el)el.textContent=fresh&&Number.isFinite(Number(value))?fmt(value,decimals(value)):'--';
    }
    window.dispatchEvent(new Event('dapps:markets-updated'));
  }

  function quote(m,p,open,hi,lo,size=0){
    if(!m||!Number.isFinite(p)||p<=0)return;
    const previous=lastPrices.get(m.symbol);
    if(Number.isFinite(previous)){
      if(p>previous)tickDirections.set(m.symbol,1);
      else if(p<previous)tickDirections.set(m.symbol,-1);
    }
    lastPrices.set(m.symbol,p);
    m.price=p;
    if(Number.isFinite(open)&&open>0)m.change=(p/open-1)*100;
    if(Number.isFinite(hi)&&hi>0)m.high=hi;
    if(Number.isFinite(lo)&&lo>0)m.low=lo;
    if(Number.isFinite(size)&&size>0)m.volume24h=m.volume24h||size;
    observed.set(m.symbol,Date.now());
    paint();
  }

  async function json(url){
    const r=await fetch(url,{cache:'no-store'});
    if(!r.ok)throw Error(String(r.status));
    return r.json();
  }

  async function ticker(){
    const m=selected(),code=codeOf(m);
    if(!m||tickerBusy)return;
    tickerBusy=true;
    try{
      if(supported.has(code)){
        const d=await json(`${backend}/api/market/ticker?symbol=${encodeURIComponent(code)}`);
        if(m!==selected())return;
        m.volume24h=Number(d.volume24h)||m.volume24h||0;
        quote(m,Number(d.price),Number(d.open24h),Number(d.high24h),Number(d.low24h),Number(d.size||0));
      }else if(code==='BNB'||code==='USDT'){
        const id=ids[code];
        const d=await json(`${backend}/api/market/quotes?ids=${encodeURIComponent(id)}`);
        if(m!==selected())return;
        const v=d?.[id];if(!v)return;
        if(Number.isFinite(v.usd_24h_change))m.change=Number(v.usd_24h_change);
        quote(m,Number(v.usd));
      }
    }catch(_){}
    finally{tickerBusy=false}
  }

  async function fallback(){
    const entries=markets.filter(m=>ids[codeOf(m)]);
    const idList=[...new Set(entries.map(m=>ids[codeOf(m)]))];
    if(!idList.length)return;
    try{
      const data=await json(`${backend}/api/market/quotes?ids=${idList.join(',')}`);
      if(data.stale)return;
      for(const m of entries){
        if(Date.now()-(observed.get(m.symbol)||0)<30000)continue;
        const value=data[ids[codeOf(m)]];
        if(!value)continue;
        const p=Number(value.usd);
        if(Number.isFinite(p)&&p>0)m.price=p;
        if(Number.isFinite(value.usd_24h_change))m.change=Number(value.usd_24h_change);
      }
      window.dispatchEvent(new Event('dapps:markets-updated'));
    }catch(_){}
  }

  function restartTicker(){
    clearInterval(tickerTimer);
    ticker();
    const code=codeOf(selected());
    tickerTimer=setInterval(ticker,supported.has(code)?1200:10000);
  }

  const baseSelect=window.selectMarket;
  if(typeof baseSelect==='function')window.selectMarket=function(m){
    const out=baseSelect(m);
    window.currentMarket=m;
    restartTicker();
    return out;
  };

  restartTicker();
  setTimeout(fallback,1200);
  setInterval(fallback,25000);
  setInterval(paint,5000);
})();
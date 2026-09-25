(()=>{
  const page=document.querySelector('#page-trade');
  const grid=page?.querySelector('.trade-grid');
  const orderCard=page?.querySelector('.short-trade-card');
  const positions=page?.querySelector('.positions-panel');
  if(!page||!grid||!orderCard||!positions)return;

  const api=localStorage.getItem('dapps:apiBase')||'https://dapps-trading-platform-production.up.railway.app';
  const activeMarket=()=>typeof currentMarket!=='undefined'?currentMarket:null;
  const code=()=>String(activeMarket()?.symbol||'BTC/USDT').split('/')[0].toUpperCase();
  const money=v=>Number(v).toLocaleString('en-US',{minimumFractionDigits:decimals(Number(v)||0),maximumFractionDigits:decimals(Number(v)||0)});
  const compact=v=>Number(v||0).toLocaleString('en-US',{maximumFractionDigits:4});

  // Desktop terminal: chart / market depth / execution in one compact workspace.
  grid.appendChild(orderCard);

  const volumeStat=document.createElement('div');
  volumeStat.className='terminal-stat';
  volumeStat.innerHTML='<span>24h Volume</span><strong id="trade-volume">--</strong>';
  page.querySelector('.trade-header')?.appendChild(volumeStat);
  function prepCanvas(id){
    const canvas=document.getElementById(id);if(!canvas)return null;const rect=canvas.getBoundingClientRect(),dpr=window.devicePixelRatio||1;
    if(rect.width<10||rect.height<10)return null;canvas.width=Math.floor(rect.width*dpr);canvas.height=Math.floor(rect.height*dpr);const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,rect.width,rect.height);return {canvas,ctx,w:rect.width,h:rect.height};
  }
  async function get(url,controller){const r=await fetch(url,{cache:'no-store',signal:controller.signal});if(!r.ok)throw Error(String(r.status));return r.json()}
  function paintStats(){
    const m=activeMarket();if(!m)return;
    const volume=Number(m.volume24h||m.volume||0);
    const text=volume?compact(volume)+' '+code():'--';
    const a=document.getElementById('trade-volume');if(a)a.textContent=text;
  }
  function refresh(){paintStats()}
  window.addEventListener('dapps:markets-updated',paintStats);
  const base=window.selectMarket;
  if(typeof base==='function')window.selectMarket=function(m){const out=base(m);setTimeout(refresh,20);return out};
  refresh();setInterval(()=>{if(page.classList.contains('active')){paintStats()}},1800);
})();

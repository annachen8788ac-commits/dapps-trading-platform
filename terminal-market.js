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

  const studies=document.createElement('div');
  studies.className='terminal-study-grid';
  studies.innerHTML='<div class="terminal-study"><label>MACD 12/26/9</label><canvas id="terminal-macd-chart"></canvas></div><div class="terminal-study"><label>RSI 14</label><canvas id="terminal-rsi-chart"></canvas></div>';
  page.querySelector('.chart-panel')?.appendChild(studies);

  const indicators=document.createElement('div');
  indicators.className='terminal-indicators';
  indicators.innerHTML='<span class="indicator-e7">EMA 7 <b id="term-ema7">--</b></span><span class="indicator-e25">EMA 25 <b id="term-ema25">--</b></span><span class="indicator-e99">EMA 99 <b id="term-ema99">--</b></span><span>VOL <b id="term-vol">--</b></span><span class="indicator-macd">MACD <b id="term-macd">--</b></span><span class="indicator-rsi">RSI <b id="term-rsi">--</b></span>';
  page.querySelector('.chart-panel')?.appendChild(indicators);

  // Desktop terminal: chart / market depth / execution in one compact workspace.
  grid.appendChild(orderCard);

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
  positions.parentNode.insertBefore(micro,positions);

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
  function emaArray(values,period){
    if(!values.length)return [];
    const k=2/(period+1),out=[];let e=values[0];
    values.forEach((v,i)=>{e=i===0?v:v*k+e*(1-k);out.push(e)});return out;
  }
  function rsiArray(values,period=14){
    const out=new Array(values.length).fill(null);if(values.length<period+1)return out;
    let gain=0,loss=0;
    for(let i=1;i<=period;i++){const d=values[i]-values[i-1];if(d>=0)gain+=d;else loss-=d}
    gain/=period;loss/=period;out[period]=loss===0?100:100-(100/(1+gain/loss));
    for(let i=period+1;i<values.length;i++){const d=values[i]-values[i-1],g=Math.max(d,0),l=Math.max(-d,0);gain=(gain*(period-1)+g)/period;loss=(loss*(period-1)+l)/period;out[i]=loss===0?100:100-(100/(1+gain/loss))}
    return out;
  }
  function prepCanvas(id){
    const canvas=document.getElementById(id);if(!canvas)return null;const rect=canvas.getBoundingClientRect(),dpr=window.devicePixelRatio||1;
    if(rect.width<10||rect.height<10)return null;canvas.width=Math.floor(rect.width*dpr);canvas.height=Math.floor(rect.height*dpr);const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,rect.width,rect.height);return {canvas,ctx,w:rect.width,h:rect.height};
  }
  function line(ctx,values,x,y,stroke){
    ctx.beginPath();let begun=false;values.forEach((v,i)=>{if(!Number.isFinite(v))return;const px=x(i),py=y(v);if(!begun){ctx.moveTo(px,py);begun=true}else ctx.lineTo(px,py)});ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke();
  }
  function drawStudies(){
    const data=(typeof chartHistory!=='undefined'&&activeMarket())?(chartHistory.get(activeMarket().symbol)||[]):[];
    const closes=data.map(x=>Number(x.close)).filter(Number.isFinite).slice(-120);if(closes.length<3)return;
    const e12=emaArray(closes,12),e26=emaArray(closes,26),macd=e12.map((v,i)=>v-e26[i]),signal=emaArray(macd,9),hist=macd.map((v,i)=>v-signal[i]);
    const mc=prepCanvas('terminal-macd-chart');
    if(mc){const {ctx,w,h}=mc,p={l:9,r:8,t:15,b:7},pw=w-p.l-p.r,ph=h-p.t-p.b,max=Math.max(...macd.map(Math.abs),...signal.map(Math.abs),1e-9),x=i=>p.l+i/(Math.max(1,macd.length-1))*pw,y=v=>p.t+ph/2-v/max*(ph*.42);ctx.strokeStyle='rgba(110,135,160,.16)';ctx.beginPath();ctx.moveTo(p.l,y(0));ctx.lineTo(w-p.r,y(0));ctx.stroke();const bw=Math.max(1,pw/macd.length*.55);hist.forEach((v,i)=>{ctx.fillStyle=v>=0?'rgba(32,201,139,.45)':'rgba(240,93,108,.45)';const yy=y(v),zero=y(0);ctx.fillRect(x(i)-bw/2,Math.min(yy,zero),bw,Math.max(1,Math.abs(zero-yy)))});line(ctx,macd,x,y,'#55c7e9');line(ctx,signal,x,y,'#e4a64f')}
    const rv=rsiArray(closes),rc=prepCanvas('terminal-rsi-chart');
    if(rc){const {ctx,w,h}=rc,p={l:9,r:8,t:14,b:6},pw=w-p.l-p.r,ph=h-p.t-p.b,x=i=>p.l+i/(Math.max(1,rv.length-1))*pw,y=v=>p.t+(100-v)/100*ph;[30,70].forEach(v=>{ctx.strokeStyle='rgba(110,135,160,.20)';ctx.setLineDash([3,3]);ctx.beginPath();ctx.moveTo(p.l,y(v));ctx.lineTo(w-p.r,y(v));ctx.stroke()});ctx.setLineDash([]);line(ctx,rv,x,y,'#9b8cff')}
  }
  function indicatorsPaint(){
    const data=(typeof chartHistory!=='undefined'&&activeMarket())?(chartHistory.get(activeMarket().symbol)||[]):[];
    const closes=data.map(x=>Number(x.close)).filter(Number.isFinite);
    if(!closes.length)return;
    const e7=ema(closes,7),e25=ema(closes,25),e99=ema(closes,99),macd=ema(closes,12)-ema(closes,26),r=rsi(closes);
    const set=(id,v,formatter=money)=>{const el=document.getElementById(id);if(el&&Number.isFinite(v))el.textContent=formatter(v)};
    set('term-ema7',e7);set('term-ema25',e25);set('term-ema99',e99);set('term-macd',macd,v=>(v>=0?'+':'')+money(v));set('term-rsi',r,v=>v.toFixed(2));
    const vol=data.at(-1)?.volume;set('term-vol',vol,v=>compact(v));
    drawStudies();
  }
  async function get(url,controller){const r=await fetch(url,{cache:'no-store',signal:controller.signal});if(!r.ok)throw Error(String(r.status));return r.json()}
  function paintStats(){
    const m=activeMarket();if(!m)return;
    const volume=Number(m.volume24h||m.volume||0);
    const text=volume?compact(volume)+' '+code():'--';
    const a=document.getElementById('trade-volume'),b=document.getElementById('micro-volume');if(a)a.textContent=text;if(b)b.textContent=text;
    indicatorsPaint();
  }
  function refresh(){paintStats()}
  window.addEventListener('dapps:markets-updated',paintStats);
  const base=window.selectMarket;
  if(typeof base==='function')window.selectMarket=function(m){const out=base(m);setTimeout(refresh,20);return out};
  refresh();setInterval(()=>{if(page.classList.contains('active')){paintStats()}},1800);
})();

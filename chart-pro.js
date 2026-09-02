(() => {
  const state={mouseX:null,mouseY:null,zoom:1,isTouching:false,pinchStartDistance:null,pinchStartZoom:1};
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  const isMobile=()=>window.matchMedia('(max-width:720px)').matches||'ontouchstart'in window;
  const tfCounts={'1m':72,'5m':72,'15m':72,'1H':84,'4H':90,'1D':96};
  const tfLabels={'1m':'1 min','5m':'5 min','15m':'15 min','1H':'1 hour','4H':'4 hour','1D':'1 day'};

  function normalizeSeries(m){
    const data=ensureChartHistory(m);
    if(!data.length)return data;
    for(let i=0;i<data.length;i++){
      const c=data[i];
      if(i>0)c.open=data[i-1].close;
      c.high=Math.max(c.high,c.open,c.close);
      c.low=Math.min(c.low,c.open,c.close);
      if(c.volume==null)c.volume=Math.round(55+Math.random()*130);
      if(c.ts==null)c.ts=Date.now()-(data.length-1-i)*60000;
    }
    return data;
  }

  const originalEnsure=ensureChartHistory;
  ensureChartHistory=function(m){
    const data=originalEnsure(m);
    if(!data.__professionalized){
      for(let i=0;i<data.length;i++){
        const prev=i?data[i-1]:null;
        if(prev)data[i].open=prev.close;
        data[i].high=Math.max(data[i].high,data[i].open,data[i].close);
        data[i].low=Math.min(data[i].low,data[i].open,data[i].close);
        data[i].volume=data[i].volume??Math.round(55+Math.random()*130);
        data[i].ts=Date.now()-(data.length-1-i)*60000;
      }
      Object.defineProperty(data,'__professionalized',{value:true,writable:true,enumerable:false});
    }
    return data;
  };

  // Update the latest candle instead of creating a disconnected candle every second.
  // A new candle is created every 8 ticks in demo mode so the motion reads like a live market.
  const tickCounter=new Map();
  pushChartTick=function(m){
    const data=normalizeSeries(m);
    const key=m.symbol;
    const ticks=(tickCounter.get(key)||0)+1;
    tickCounter.set(key,ticks);
    let c=data[data.length-1];
    if(!c)return;

    c.close=m.price;
    c.high=Math.max(c.high,m.price);
    c.low=Math.min(c.low,m.price);
    const impulse=Math.abs(c.close-c.open)/Math.max(c.open,1e-9);
    c.volume=Math.round(Math.max(35,(c.volume||60)*0.92+35+impulse*24000));

    if(ticks%8===0){
      data.push({open:c.close,high:c.close,low:c.close,close:c.close,volume:Math.round(45+Math.random()*90),ts:Date.now()});
      if(data.length>180)data.shift();
    }
  };

  function installUI(){
    const stage=document.querySelector('.chart-stage');
    const canvas=document.querySelector('#price-chart');
    if(!stage||!canvas)return;

    document.querySelector('#chart-legend')?.remove();
    document.querySelector('#chart-tooltip')?.remove();
    document.querySelector('.chart-zoom-controls')?.remove();

    const legend=document.createElement('div');
    legend.id='chart-legend';legend.className='chart-legend';
    legend.innerHTML='<span id="legend-ohlc">O -- H -- L -- C --</span><span class="ma7">MA7</span><span class="ma20">MA20</span><span class="legend-live"><i></i> LIVE</span>';
    stage.appendChild(legend);

    const tooltip=document.createElement('div');
    tooltip.id='chart-tooltip';tooltip.className='chart-tooltip';
    tooltip.innerHTML='<div class="tt-head"><strong id="tt-symbol">BTC/USDT</strong><span id="tt-timeframe">1H</span></div><div class="tt-grid"><span>Open</span><b id="tt-open">--</b><span>High</span><b id="tt-high">--</b><span>Low</span><b id="tt-low">--</b><span>Close</span><b id="tt-close">--</b><span>Change</span><b id="tt-change">--</b><span>Volume</span><b id="tt-volume">--</b></div>';
    stage.appendChild(tooltip);

    const controls=document.createElement('div');controls.className='chart-zoom-controls';
    controls.innerHTML='<button data-chart-zoom="in">+</button><button data-chart-zoom="out">−</button><button data-chart-zoom="reset">↺</button>';
    stage.appendChild(controls);

    if(!document.querySelector('#professional-chart-style')){
      const style=document.createElement('style');style.id='professional-chart-style';style.textContent=`
      .chart-stage{position:relative;overflow:hidden;touch-action:none;background:linear-gradient(180deg,rgba(11,15,25,.18),rgba(11,15,25,.02))}.chart-stage canvas{cursor:crosshair;touch-action:none}
      .chart-legend{position:absolute;left:14px;top:10px;z-index:4;display:flex;gap:13px;align-items:center;padding:5px 8px;border-radius:6px;background:rgba(8,11,18,.72);font-size:10px;color:#9aa7bd;pointer-events:none}.chart-legend .ma7{color:#f0b90b}.chart-legend .ma20{color:#8d94ff}.legend-live{color:#40d99a;font-weight:700}.legend-live i{display:inline-block;width:6px;height:6px;border-radius:50%;background:#40d99a;margin-right:5px;box-shadow:0 0 8px rgba(64,217,154,.7)}
      .chart-tooltip{position:absolute;display:none;z-index:10;width:198px;padding:11px 12px;border-radius:8px;background:rgba(4,6,10,.97);border:1px solid rgba(255,255,255,.11);box-shadow:0 12px 35px rgba(0,0,0,.5);font-size:11px;color:#e9eef8;pointer-events:none}.chart-tooltip.show{display:block}.tt-head{display:flex;justify-content:space-between;padding-bottom:7px;margin-bottom:7px;border-bottom:1px solid rgba(255,255,255,.08)}.tt-head span,.tt-grid span{color:#7f8ba2}.tt-grid{display:grid;grid-template-columns:auto 1fr;gap:5px 16px}.tt-grid b{text-align:right;font-weight:600}.tt-grid b.positive{color:#29c77d}.tt-grid b.negative{color:#ff5b67}
      .chart-zoom-controls{position:absolute;right:82px;top:9px;z-index:8;display:flex;gap:4px}.chart-zoom-controls button{width:28px;height:28px;border:1px solid rgba(255,255,255,.1);border-radius:6px;background:rgba(8,12,20,.86);color:#b8c3d8;cursor:pointer;font-size:15px}.chart-zoom-controls button:hover{color:#fff;background:#20283a}
      @media(max-width:720px){.chart-legend{left:8px;top:7px;gap:8px;max-width:calc(100% - 16px);font-size:9px}.chart-zoom-controls{right:7px;top:42px}.chart-tooltip{left:8px!important;right:8px!important;top:auto!important;bottom:8px!important;width:auto}.tt-grid{grid-template-columns:repeat(3,auto 1fr);gap:4px 7px}.chart-stage canvas{cursor:default}}
      `;document.head.appendChild(style);
    }

    const local=(cx,cy)=>{const r=canvas.getBoundingClientRect();return{x:clamp(cx-r.left,0,r.width),y:clamp(cy-r.top,0,r.height)}};
    canvas.onmousemove=e=>{const p=local(e.clientX,e.clientY);state.mouseX=p.x;state.mouseY=p.y;drawChart()};
    canvas.onmouseleave=()=>{if(state.isTouching)return;state.mouseX=state.mouseY=null;tooltip.classList.remove('show');drawChart()};
    canvas.onwheel=e=>{e.preventDefault();state.zoom=clamp(state.zoom*(e.deltaY<0?1.12:.89),.6,3.2);state.mouseX=state.mouseY=null;tooltip.classList.remove('show');drawChart()};
    canvas.ontouchstart=e=>{e.preventDefault();state.isTouching=true;if(e.touches.length===2){const[a,b]=e.touches;state.pinchStartDistance=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);state.pinchStartZoom=state.zoom}else if(e.touches.length===1){const p=local(e.touches[0].clientX,e.touches[0].clientY);state.mouseX=p.x;state.mouseY=p.y;drawChart()}};
    canvas.ontouchmove=e=>{e.preventDefault();if(e.touches.length===2&&state.pinchStartDistance){const[a,b]=e.touches;const dist=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);state.zoom=clamp(state.pinchStartZoom*(dist/state.pinchStartDistance),.6,3.2);state.mouseX=state.mouseY=null;tooltip.classList.remove('show');drawChart()}else if(e.touches.length===1){const p=local(e.touches[0].clientX,e.touches[0].clientY);state.mouseX=p.x;state.mouseY=p.y;drawChart()}};
    canvas.ontouchend=()=>{state.isTouching=false;state.pinchStartDistance=null;setTimeout(()=>{if(!state.isTouching){state.mouseX=state.mouseY=null;tooltip.classList.remove('show');drawChart()}},500)};
    controls.onclick=e=>{const a=e.target.closest('button')?.dataset.chartZoom;if(!a)return;if(a==='in')state.zoom=clamp(state.zoom*1.2,.6,3.2);if(a==='out')state.zoom=clamp(state.zoom/1.2,.6,3.2);if(a==='reset')state.zoom=1;drawChart()};
    document.querySelectorAll('.timeframes button').forEach(btn=>btn.addEventListener('click',()=>{chartTimeframe=btn.textContent.trim();document.querySelectorAll('.timeframes button').forEach(x=>x.classList.toggle('active',x===btn));state.zoom=1;state.mouseX=state.mouseY=null;drawChart()}));
  }

  function drawContinuous(ctx,values,x,y,color,width){
    ctx.save();ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineJoin='round';ctx.lineCap='round';ctx.beginPath();
    let started=false;
    values.forEach((v,i)=>{if(!Number.isFinite(v))return;const px=x(i),py=y(v);if(!started){ctx.moveTo(px,py);started=true}else ctx.lineTo(px,py)});
    if(started)ctx.stroke();ctx.restore();
  }

  function tooltipFor(active,cx,cy,w,h){
    const tt=document.querySelector('#chart-tooltip');if(!tt||!active)return;
    const d=decimals(currentMarket.price),chg=(active.close-active.open)/active.open*100;
    document.querySelector('#tt-symbol').textContent=currentMarket.symbol;document.querySelector('#tt-timeframe').textContent=tfLabels[chartTimeframe]||chartTimeframe;
    document.querySelector('#tt-open').textContent=fmt(active.open,d);document.querySelector('#tt-high').textContent=fmt(active.high,d);document.querySelector('#tt-low').textContent=fmt(active.low,d);document.querySelector('#tt-close').textContent=fmt(active.close,d);document.querySelector('#tt-volume').textContent=Number(active.volume||0).toLocaleString('en-US');
    const ch=document.querySelector('#tt-change');ch.textContent=`${chg>=0?'+':''}${chg.toFixed(2)}%`;ch.className=chg>=0?'positive':'negative';tt.classList.add('show');
    if(!isMobile()){const tw=205,th=176;let left=cx+15,top=cy+14;if(left+tw>w-6)left=cx-tw-15;if(top+th>h-6)top=cy-th-14;tt.style.left=`${Math.max(7,left)}px`;tt.style.top=`${Math.max(7,top)}px`;tt.style.right='auto';tt.style.bottom='auto'}
  }

  drawChart=function(){
    const canvas=document.querySelector('#price-chart');if(!canvas)return;const rect=canvas.getBoundingClientRect();if(rect.width<20||rect.height<20)return;
    const dpr=window.devicePixelRatio||1;canvas.width=Math.floor(rect.width*dpr);canvas.height=Math.floor(rect.height*dpr);const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);
    const w=rect.width,h=rect.height,pad={top:40,right:isMobile()?62:78,bottom:28,left:10},plotW=w-pad.left-pad.right,fullH=h-pad.top-pad.bottom,volH=Math.max(34,fullH*.18),priceH=fullH-volH-8,volTop=pad.top+priceH+8;ctx.clearRect(0,0,w,h);
    const source=normalizeSeries(currentMarket),base=tfCounts[chartTimeframe]||84,count=Math.min(source.length,Math.max(24,Math.round(base/state.zoom))),data=source.slice(-count);if(data.length<2)return;
    const rawMin=Math.min(...data.map(d=>d.low)),rawMax=Math.max(...data.map(d=>d.high)),range=Math.max(rawMax-rawMin,currentMarket.price*.0025),min=rawMin-range*.08,max=rawMax+range*.08,y=v=>pad.top+(max-v)/(max-min)*priceH,step=plotW/data.length,x=i=>pad.left+i*step+step/2;

    ctx.font=`${isMobile()?10:11}px Inter,sans-serif`;ctx.textBaseline='middle';
    for(let i=0;i<=5;i++){const yy=pad.top+priceH*i/5;ctx.strokeStyle='rgba(123,139,169,.14)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(pad.left,yy);ctx.lineTo(pad.left+plotW,yy);ctx.stroke();ctx.fillStyle='rgba(168,180,205,.68)';ctx.textAlign='left';ctx.fillText(fmt(max-(max-min)*i/5,decimals(currentMarket.price)),pad.left+plotW+7,yy)}
    for(let i=0;i<=6;i++){const xx=pad.left+plotW*i/6;ctx.strokeStyle='rgba(123,139,169,.08)';ctx.beginPath();ctx.moveTo(xx,pad.top);ctx.lineTo(xx,volTop+volH);ctx.stroke()}

    const maxVol=Math.max(...data.map(d=>d.volume||1),1),cw=Math.max(3,Math.min(10,step*.62));
    data.forEach((d,i)=>{const xx=x(i),up=d.close>=d.open,color=up?'#22b87a':'#ef5362';const vh=(d.volume||1)/maxVol*(volH-9);ctx.fillStyle=up?'rgba(34,184,122,.20)':'rgba(239,83,98,.20)';ctx.fillRect(xx-cw/2,volTop+volH-vh,cw,vh);ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(xx,y(d.high));ctx.lineTo(xx,y(d.low));ctx.stroke();const bt=Math.min(y(d.open),y(d.close)),bh=Math.max(1.5,Math.abs(y(d.close)-y(d.open)));ctx.fillRect(xx-cw/2,bt,cw,bh)});

    const closes=data.map(d=>d.close),ma7=movingAverage(closes,7),ma20=movingAverage(closes,20);
    // A continuous close-price trace makes the market structure readable instead of visually fragmented.
    const grad=ctx.createLinearGradient(0,pad.top,0,pad.top+priceH);grad.addColorStop(0,'rgba(75,145,255,.92)');grad.addColorStop(1,'rgba(69,184,255,.62)');drawContinuous(ctx,closes,x,y,grad,1.65);drawContinuous(ctx,ma7,x,y,'#f0b90b',1.25);drawContinuous(ctx,ma20,x,y,'#8d94ff',1.25);

    const currentY=y(currentMarket.price);ctx.save();ctx.setLineDash([5,4]);ctx.strokeStyle='rgba(77,151,255,.82)';ctx.beginPath();ctx.moveTo(pad.left,currentY);ctx.lineTo(pad.left+plotW,currentY);ctx.stroke();ctx.restore();
    const lastX=x(data.length-1);ctx.fillStyle='#4d97ff';ctx.beginPath();ctx.arc(lastX,currentY,3,0,Math.PI*2);ctx.fill();ctx.fillStyle='rgba(7,11,19,.98)';ctx.fillRect(pad.left+plotW+3,currentY-10,pad.right-5,20);ctx.fillStyle='#7fb0ff';ctx.textAlign='left';ctx.fillText(fmt(currentMarket.price,decimals(currentMarket.price)),pad.left+plotW+8,currentY);

    let active=data[data.length-1];
    if(state.mouseX!=null&&state.mouseX>=pad.left&&state.mouseX<=pad.left+plotW&&state.mouseY>=pad.top&&state.mouseY<=volTop+volH){const index=clamp(Math.floor((state.mouseX-pad.left)/step),0,data.length-1),cx=x(index),cy=clamp(state.mouseY,pad.top,volTop+volH);active=data[index];ctx.save();ctx.setLineDash([3,4]);ctx.strokeStyle='rgba(219,228,243,.55)';ctx.beginPath();ctx.moveTo(cx,pad.top);ctx.lineTo(cx,volTop+volH);ctx.stroke();ctx.beginPath();ctx.moveTo(pad.left,cy);ctx.lineTo(pad.left+plotW,cy);ctx.stroke();ctx.restore();if(cy<=pad.top+priceH){const hp=max-(cy-pad.top)/priceH*(max-min);ctx.fillStyle='rgba(4,6,10,.98)';ctx.fillRect(pad.left+plotW+3,cy-10,pad.right-5,20);ctx.fillStyle='#eef3fb';ctx.fillText(fmt(hp,decimals(currentMarket.price)),pad.left+plotW+8,cy)}tooltipFor(active,cx,cy,w,h)}else document.querySelector('#chart-tooltip')?.classList.remove('show');

    const legend=document.querySelector('#legend-ohlc');if(legend){const d=decimals(currentMarket.price);legend.textContent=`O ${fmt(active.open,d)}  H ${fmt(active.high,d)}  L ${fmt(active.low,d)}  C ${fmt(active.close,d)}`}
    const badge=document.querySelector('#chart-price-badge');if(badge)badge.textContent=fmt(currentMarket.price,decimals(currentMarket.price));
  };

  installUI();drawChart();
})();
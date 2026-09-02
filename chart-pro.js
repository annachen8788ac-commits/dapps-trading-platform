(() => {
  const state = {
    mouseX: null,
    mouseY: null,
    hoverIndex: null,
    zoom: 1,
    isTouching: false,
    pinchStartDistance: null,
    pinchStartZoom: 1
  };

  const isMobile = () => window.matchMedia('(max-width: 720px)').matches || 'ontouchstart' in window;
  const clamp = (v,min,max) => Math.max(min,Math.min(max,v));

  function installChartUI(){
    const stage = document.querySelector('.chart-stage');
    const canvas = document.querySelector('#price-chart');
    if(!stage || !canvas || document.querySelector('#chart-legend')) return;

    const legend = document.createElement('div');
    legend.id = 'chart-legend';
    legend.className = 'chart-legend';
    legend.innerHTML = `
      <span id="legend-ohlc">O -- &nbsp; H -- &nbsp; L -- &nbsp; C --</span>
      <span class="legend-ma ma7">MA7</span>
      <span class="legend-ma ma20">MA20</span>
      <span class="legend-live"><i></i> LIVE</span>`;
    stage.appendChild(legend);

    const tooltip = document.createElement('div');
    tooltip.id = 'chart-tooltip';
    tooltip.className = 'chart-tooltip';
    tooltip.innerHTML = `
      <div class="chart-tooltip-title"><strong id="tt-symbol">BTC/USDT</strong><span id="tt-timeframe">1H</span></div>
      <div class="chart-tooltip-grid">
        <span>Open</span><strong id="tt-open">--</strong>
        <span>High</span><strong id="tt-high">--</strong>
        <span>Low</span><strong id="tt-low">--</strong>
        <span>Close</span><strong id="tt-close">--</strong>
        <span>Change</span><strong id="tt-change">--</strong>
        <span>Volume</span><strong id="tt-volume">--</strong>
      </div>`;
    stage.appendChild(tooltip);

    const zoomControls = document.createElement('div');
    zoomControls.className = 'chart-zoom-controls';
    zoomControls.innerHTML = `
      <button type="button" data-chart-zoom="in" aria-label="Zoom in">+</button>
      <button type="button" data-chart-zoom="out" aria-label="Zoom out">−</button>
      <button type="button" data-chart-zoom="reset" aria-label="Reset zoom">↺</button>`;
    stage.appendChild(zoomControls);

    const style = document.createElement('style');
    style.textContent = `
      .chart-stage{position:relative;overflow:hidden;touch-action:none}
      .chart-stage canvas{cursor:crosshair;touch-action:none}
      .chart-legend{position:absolute;left:16px;top:12px;z-index:3;display:flex;gap:14px;align-items:center;flex-wrap:wrap;font-size:11px;color:#9aa7bd;pointer-events:none;background:rgba(10,15,26,.66);padding:6px 9px;border-radius:7px;backdrop-filter:blur(5px)}
      .chart-legend .ma7{color:#f0b90b}.chart-legend .ma20{color:#8d94ff}.chart-legend .legend-live{color:#45d69b;font-weight:700}.chart-legend .legend-live i{display:inline-block;width:6px;height:6px;border-radius:50%;background:#45d69b;margin-right:5px;box-shadow:0 0 8px rgba(69,214,155,.7)}
      .chart-tooltip{position:absolute;z-index:8;display:none;min-width:190px;padding:11px 12px;border-radius:9px;background:rgba(5,7,12,.96);border:1px solid rgba(255,255,255,.10);box-shadow:0 12px 30px rgba(0,0,0,.42);color:#f5f7fb;font-size:11px;pointer-events:none;backdrop-filter:blur(8px)}
      .chart-tooltip.show{display:block}.chart-tooltip-title{display:flex;align-items:center;justify-content:space-between;gap:10px;padding-bottom:8px;margin-bottom:7px;border-bottom:1px solid rgba(255,255,255,.09)}.chart-tooltip-title strong{font-size:12px}.chart-tooltip-title span{color:#7f8ca5}
      .chart-tooltip-grid{display:grid;grid-template-columns:auto 1fr;gap:5px 14px}.chart-tooltip-grid span{color:#7f8ca5}.chart-tooltip-grid strong{text-align:right;font-weight:600;color:#eaf0fa}.chart-tooltip-grid strong.positive{color:#28c77c}.chart-tooltip-grid strong.negative{color:#ff5b67}
      .chart-zoom-controls{position:absolute;right:82px;top:10px;z-index:7;display:flex;gap:5px}.chart-zoom-controls button{width:28px;height:28px;border-radius:7px;border:1px solid rgba(255,255,255,.10);background:rgba(8,12,21,.82);color:#b8c3d8;font-size:16px;line-height:1;cursor:pointer}.chart-zoom-controls button:hover{background:#20283a;color:#fff}
      @media(max-width:700px){.chart-legend{left:8px;top:8px;gap:8px;font-size:10px;max-width:calc(100% - 16px);padding:5px 7px}.chart-zoom-controls{right:8px;top:48px}.chart-zoom-controls button{width:30px;height:30px}.chart-tooltip{left:8px!important;right:8px!important;top:auto!important;bottom:8px!important;min-width:0;width:auto;padding:9px 10px;border-radius:8px}.chart-tooltip-grid{grid-template-columns:repeat(4,auto 1fr);gap:4px 7px}.chart-tooltip-grid span{font-size:9px}.chart-tooltip-grid strong{font-size:10px}.chart-tooltip-title{padding-bottom:6px;margin-bottom:6px}.chart-stage canvas{cursor:default}}
    `;
    document.head.appendChild(style);

    function localPoint(clientX,clientY){
      const r = canvas.getBoundingClientRect();
      return {
        x: clamp(clientX-r.left,0,r.width),
        y: clamp(clientY-r.top,0,r.height)
      };
    }

    const pointer = e => {
      const p = localPoint(e.clientX,e.clientY);
      state.mouseX = p.x;
      state.mouseY = p.y;
      drawChart();
    };

    canvas.addEventListener('mousemove', pointer);
    canvas.addEventListener('mouseleave', () => {
      if(state.isTouching) return;
      state.mouseX = state.mouseY = state.hoverIndex = null;
      tooltip.classList.remove('show');
      drawChart();
    });

    canvas.addEventListener('wheel', e => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.12 : 0.89;
      state.zoom = clamp(state.zoom * factor,0.55,2.8);
      state.mouseX = state.mouseY = state.hoverIndex = null;
      tooltip.classList.remove('show');
      drawChart();
    },{passive:false});

    canvas.addEventListener('touchstart', e => {
      e.preventDefault();
      state.isTouching = true;
      if(e.touches.length === 2){
        const a=e.touches[0], b=e.touches[1];
        state.pinchStartDistance = Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);
        state.pinchStartZoom = state.zoom;
        state.mouseX = state.mouseY = null;
        tooltip.classList.remove('show');
      }else if(e.touches.length === 1){
        const p=localPoint(e.touches[0].clientX,e.touches[0].clientY);
        state.mouseX=p.x; state.mouseY=p.y;
        drawChart();
      }
    },{passive:false});

    canvas.addEventListener('touchmove', e => {
      e.preventDefault();
      if(e.touches.length === 2 && state.pinchStartDistance){
        const a=e.touches[0], b=e.touches[1];
        const dist=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);
        state.zoom=clamp(state.pinchStartZoom*(dist/state.pinchStartDistance),0.55,2.8);
        state.mouseX=state.mouseY=state.hoverIndex=null;
        tooltip.classList.remove('show');
        drawChart();
      }else if(e.touches.length === 1){
        const p=localPoint(e.touches[0].clientX,e.touches[0].clientY);
        state.mouseX=p.x; state.mouseY=p.y;
        drawChart();
      }
    },{passive:false});

    const endTouch = e => {
      if(e.touches && e.touches.length) return;
      state.isTouching=false;
      state.pinchStartDistance=null;
      window.setTimeout(()=>{
        if(!state.isTouching){
          state.mouseX=state.mouseY=state.hoverIndex=null;
          tooltip.classList.remove('show');
          drawChart();
        }
      },650);
    };
    canvas.addEventListener('touchend',endTouch,{passive:true});
    canvas.addEventListener('touchcancel',endTouch,{passive:true});

    zoomControls.addEventListener('click',e=>{
      const action=e.target.closest('button')?.dataset.chartZoom;
      if(!action) return;
      if(action==='in') state.zoom=clamp(state.zoom*1.22,0.55,2.8);
      if(action==='out') state.zoom=clamp(state.zoom/1.22,0.55,2.8);
      if(action==='reset') state.zoom=1;
      state.mouseX=state.mouseY=state.hoverIndex=null;
      tooltip.classList.remove('show');
      drawChart();
    });

    document.querySelectorAll('.timeframes button').forEach(btn => {
      btn.addEventListener('click', () => {
        chartTimeframe = btn.textContent.trim();
        document.querySelectorAll('.timeframes button').forEach(x => x.classList.remove('active'));
        btn.classList.add('active');
        state.zoom=1;
        state.mouseX = state.mouseY = state.hoverIndex = null;
        tooltip.classList.remove('show');
        drawChart();
      });
    });
  }

  const oldPushChartTick = pushChartTick;
  pushChartTick = function(m){
    const data = ensureChartHistory(m);
    const prev = data[data.length-1];
    oldPushChartTick(m);
    const last = data[data.length-1];
    const movement = Math.abs(last.close-last.open) / Math.max(last.open, 1e-9);
    last.volume = Math.max(18, Math.round(35 + movement*18000 + Math.random()*90));
    if(prev && prev.volume == null) prev.volume = Math.round(35 + Math.random()*90);
  };

  ensureChartHistory = ((original) => function(m){
    const data = original(m);
    data.forEach(c => { if(c.volume == null) c.volume = Math.round(35 + Math.random()*100); });
    return data;
  })(ensureChartHistory);

  function updateTooltip(active,cx,cy,w,h,pad,plotW){
    const tooltip=document.querySelector('#chart-tooltip');
    if(!tooltip || !active){
      if(tooltip) tooltip.classList.remove('show');
      return;
    }
    const d=decimals(currentMarket.price);
    const change=((active.close-active.open)/active.open)*100;
    document.querySelector('#tt-symbol').textContent=currentMarket.symbol;
    document.querySelector('#tt-timeframe').textContent=chartTimeframe;
    document.querySelector('#tt-open').textContent=fmt(active.open,d);
    document.querySelector('#tt-high').textContent=fmt(active.high,d);
    document.querySelector('#tt-low').textContent=fmt(active.low,d);
    document.querySelector('#tt-close').textContent=fmt(active.close,d);
    const changeEl=document.querySelector('#tt-change');
    changeEl.textContent=`${change>=0?'+':''}${change.toFixed(2)}%`;
    changeEl.className=change>=0?'positive':'negative';
    document.querySelector('#tt-volume').textContent=Number(active.volume||0).toLocaleString('en-US');
    tooltip.classList.add('show');

    if(!isMobile()){
      const tw=205, th=178;
      let left=cx+16;
      let top=cy+14;
      if(left+tw>w-8) left=cx-tw-16;
      if(top+th>h-8) top=cy-th-14;
      tooltip.style.left=`${Math.max(8,left)}px`;
      tooltip.style.top=`${Math.max(8,top)}px`;
      tooltip.style.right='auto';
      tooltip.style.bottom='auto';
    }
  }

  drawChart = function(){
    const canvas = document.querySelector('#price-chart');
    if(!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if(rect.width < 10 || rect.height < 10) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(rect.width*dpr);
    canvas.height = Math.floor(rect.height*dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr,0,0,dpr,0,0);

    const w = rect.width, h = rect.height;
    const pad = {top:42,right:isMobile()?60:76,bottom:30,left:10};
    const plotW = Math.max(20,w-pad.left-pad.right);
    const fullPlotH = Math.max(40,h-pad.top-pad.bottom);
    const volH = Math.max(38, fullPlotH*.20);
    const priceH = fullPlotH-volH-8;
    const volTop = pad.top+priceH+8;
    ctx.clearRect(0,0,w,h);

    const source = ensureChartHistory(currentMarket);
    const countByTf = {'1m':42,'5m':50,'15m':58,'1H':66,'4H':74,'1D':86};
    const baseCount = countByTf[chartTimeframe] || 66;
    const count = Math.min(source.length,Math.max(18,Math.round(baseCount/state.zoom)));
    const data = source.slice(-count);
    if(!data.length) return;

    const rawMin = Math.min(...data.map(d=>d.low));
    const rawMax = Math.max(...data.map(d=>d.high));
    const range = Math.max(rawMax-rawMin,currentMarket.price*.002);
    const min = rawMin-range*.10;
    const max = rawMax+range*.10;
    const y = v => pad.top + (max-v)/(max-min)*priceH;
    const step = plotW/data.length;
    const x = i => pad.left + i*step + step/2;

    ctx.font = `${isMobile()?10:11}px Inter, sans-serif`;
    ctx.textBaseline = 'middle';
    for(let i=0;i<=5;i++){
      const yy = pad.top + priceH*i/5;
      ctx.strokeStyle='rgba(126,140,170,.15)';
      ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(pad.left,yy); ctx.lineTo(pad.left+plotW,yy); ctx.stroke();
      const value = max-(max-min)*i/5;
      ctx.fillStyle='rgba(173,184,208,.72)';
      ctx.textAlign='left';
      ctx.fillText(fmt(value,decimals(currentMarket.price)),pad.left+plotW+7,yy);
    }

    for(let i=0;i<=6;i++){
      const xx = pad.left + plotW*i/6;
      ctx.strokeStyle='rgba(126,140,170,.09)';
      ctx.beginPath(); ctx.moveTo(xx,pad.top); ctx.lineTo(xx,volTop+volH); ctx.stroke();
      if(i<6){
        const unitsAgo = Math.max(0,Math.round((6-i)*count/6));
        ctx.fillStyle='rgba(173,184,208,.52)';
        ctx.textAlign='center';
        ctx.fillText(i===5?'Now':`-${unitsAgo}`,xx,pad.top+fullPlotH+17);
      }
    }

    const volumes = data.map(d=>d.volume || 50);
    const maxVol = Math.max(...volumes,1);
    ctx.fillStyle='rgba(130,145,175,.38)';
    ctx.textAlign='left';
    ctx.fillText('VOL',pad.left,volTop+8);
    const candleW = Math.max(3,Math.min(12,step*.58));
    data.forEach((d,i)=>{
      const xx=x(i), up=d.close>=d.open;
      const color=up?'#26c281':'#ff5b67';
      const vh=(d.volume||50)/maxVol*(volH-12);
      ctx.fillStyle=up?'rgba(38,194,129,.27)':'rgba(255,91,103,.27)';
      ctx.fillRect(xx-candleW/2,volTop+volH-vh,candleW,vh);
      ctx.strokeStyle=color; ctx.fillStyle=color; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(xx,y(d.high)); ctx.lineTo(xx,y(d.low)); ctx.stroke();
      const bodyTop=Math.min(y(d.open),y(d.close));
      const bodyH=Math.max(2,Math.abs(y(d.close)-y(d.open)));
      ctx.fillRect(xx-candleW/2,bodyTop,candleW,bodyH);
    });

    const closes=data.map(d=>d.close);
    const ma7=movingAverage(closes,7);
    const ma20=movingAverage(closes,20);
    drawSeries(ctx,ma7,x,y,'#f0b90b',1.45);
    drawSeries(ctx,ma20,x,y,'#8d94ff',1.45);

    const currentY=y(currentMarket.price);
    ctx.save();
    ctx.setLineDash([5,5]);
    ctx.strokeStyle='rgba(74,151,255,.9)';
    ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(pad.left,currentY); ctx.lineTo(pad.left+plotW,currentY); ctx.stroke();
    ctx.restore();

    const lastX=x(data.length-1);
    ctx.fillStyle='#4a97ff';
    ctx.beginPath(); ctx.arc(lastX,currentY,3.2,0,Math.PI*2); ctx.fill();
    ctx.shadowColor='rgba(74,151,255,.65)'; ctx.shadowBlur=10;
    ctx.beginPath(); ctx.arc(lastX,currentY,2.2,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur=0;

    ctx.fillStyle='rgba(9,15,27,.96)';
    ctx.fillRect(pad.left+plotW+4,currentY-10,pad.right-7,20);
    ctx.fillStyle='#78aaff'; ctx.textAlign='left';
    ctx.fillText(fmt(currentMarket.price,decimals(currentMarket.price)),pad.left+plotW+8,currentY);

    let active = data[data.length-1];
    let hoverX=null, hoverY=null;
    if(state.mouseX != null && state.mouseX >= pad.left && state.mouseX <= pad.left+plotW && state.mouseY >= pad.top && state.mouseY <= volTop+volH){
      const index = clamp(Math.floor((state.mouseX-pad.left)/step),0,data.length-1);
      state.hoverIndex=index;
      active=data[index];
      const cx=x(index), cy=clamp(state.mouseY,pad.top,volTop+volH);
      hoverX=cx; hoverY=cy;
      ctx.save();
      ctx.setLineDash([3,4]);
      ctx.strokeStyle='rgba(220,229,244,.62)';
      ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(cx,pad.top); ctx.lineTo(cx,volTop+volH); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(pad.left,cy); ctx.lineTo(pad.left+plotW,cy); ctx.stroke();
      ctx.restore();

      const hoverPrice=max-(cy-pad.top)/priceH*(max-min);
      if(cy<=pad.top+priceH){
        ctx.fillStyle='rgba(5,7,12,.97)';
        ctx.fillRect(pad.left+plotW+3,cy-11,pad.right-5,22);
        ctx.fillStyle='#f1f5fb'; ctx.textAlign='left';
        ctx.fillText(fmt(hoverPrice,decimals(currentMarket.price)),pad.left+plotW+8,cy);
      }

      ctx.fillStyle='rgba(5,7,12,.96)';
      ctx.fillRect(clamp(cx-31,pad.left,pad.left+plotW-62),pad.top+fullPlotH+5,62,20);
      ctx.fillStyle='#dce5f4'; ctx.textAlign='center';
      ctx.fillText(`${chartTimeframe} #${index+1}`,clamp(cx,pad.left+31,pad.left+plotW-31),pad.top+fullPlotH+15);

      updateTooltip(active,cx,cy,w,h,pad,plotW);
    }else{
      const tooltip=document.querySelector('#chart-tooltip');
      if(tooltip) tooltip.classList.remove('show');
    }

    const legend=document.querySelector('#legend-ohlc');
    if(legend){
      const d=decimals(currentMarket.price);
      legend.textContent=`O ${fmt(active.open,d)}   H ${fmt(active.high,d)}   L ${fmt(active.low,d)}   C ${fmt(active.close,d)}`;
    }
    const badge=document.querySelector('#chart-price-badge');
    if(badge) badge.textContent=fmt(currentMarket.price,decimals(currentMarket.price));
  };

  installChartUI();
  drawChart();
})();
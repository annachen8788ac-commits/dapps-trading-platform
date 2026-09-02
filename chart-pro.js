(() => {
  const state = { mouseX: null, mouseY: null, hoverIndex: null };

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

    const style = document.createElement('style');
    style.textContent = `
      .chart-stage{position:relative;overflow:hidden}.chart-stage canvas{cursor:crosshair}
      .chart-legend{position:absolute;left:16px;top:12px;z-index:3;display:flex;gap:14px;align-items:center;flex-wrap:wrap;font-size:11px;color:#9aa7bd;pointer-events:none;background:rgba(10,15,26,.66);padding:6px 9px;border-radius:7px;backdrop-filter:blur(5px)}
      .chart-legend .ma7{color:#f0b90b}.chart-legend .ma20{color:#8d94ff}.chart-legend .legend-live{color:#45d69b;font-weight:700}.chart-legend .legend-live i{display:inline-block;width:6px;height:6px;border-radius:50%;background:#45d69b;margin-right:5px;box-shadow:0 0 8px rgba(69,214,155,.7)}
      @media(max-width:700px){.chart-legend{left:8px;top:8px;gap:8px;font-size:10px;max-width:calc(100% - 16px)}}`;
    document.head.appendChild(style);

    const pointer = e => {
      const r = canvas.getBoundingClientRect();
      state.mouseX = Math.max(0, Math.min(r.width, e.clientX-r.left));
      state.mouseY = Math.max(0, Math.min(r.height, e.clientY-r.top));
      drawChart();
    };
    canvas.addEventListener('mousemove', pointer);
    canvas.addEventListener('mouseleave', () => {
      state.mouseX = state.mouseY = state.hoverIndex = null;
      drawChart();
    });

    document.querySelectorAll('.timeframes button').forEach(btn => {
      btn.addEventListener('click', () => {
        chartTimeframe = btn.textContent.trim();
        document.querySelectorAll('.timeframes button').forEach(x => x.classList.remove('active'));
        btn.classList.add('active');
        state.mouseX = state.mouseY = state.hoverIndex = null;
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
    const pad = {top:42,right:76,bottom:30,left:10};
    const plotW = Math.max(20,w-pad.left-pad.right);
    const fullPlotH = Math.max(40,h-pad.top-pad.bottom);
    const volH = Math.max(38, fullPlotH*.20);
    const priceH = fullPlotH-volH-8;
    const volTop = pad.top+priceH+8;
    ctx.clearRect(0,0,w,h);

    const source = ensureChartHistory(currentMarket);
    const countByTf = {'1m':42,'5m':50,'15m':58,'1H':66,'4H':74,'1D':86};
    const count = Math.min(source.length,countByTf[chartTimeframe] || 66);
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

    ctx.font = '11px Inter, sans-serif';
    ctx.textBaseline = 'middle';
    for(let i=0;i<=5;i++){
      const yy = pad.top + priceH*i/5;
      ctx.strokeStyle='rgba(126,140,170,.15)';
      ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(pad.left,yy); ctx.lineTo(pad.left+plotW,yy); ctx.stroke();
      const value = max-(max-min)*i/5;
      ctx.fillStyle='rgba(173,184,208,.72)';
      ctx.textAlign='left';
      ctx.fillText(fmt(value,decimals(currentMarket.price)),pad.left+plotW+9,yy);
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
    const candleW = Math.max(3,Math.min(9,step*.58));
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
    ctx.fillText(fmt(currentMarket.price,decimals(currentMarket.price)),pad.left+plotW+9,currentY);

    let active = data[data.length-1];
    if(state.mouseX != null && state.mouseX >= pad.left && state.mouseX <= pad.left+plotW && state.mouseY >= pad.top && state.mouseY <= volTop+volH){
      const index = Math.max(0,Math.min(data.length-1,Math.floor((state.mouseX-pad.left)/step)));
      state.hoverIndex=index;
      active=data[index];
      const cx=x(index), cy=Math.max(pad.top,Math.min(volTop+volH,state.mouseY));
      ctx.save();
      ctx.setLineDash([3,4]);
      ctx.strokeStyle='rgba(185,197,220,.46)';
      ctx.beginPath(); ctx.moveTo(cx,pad.top); ctx.lineTo(cx,volTop+volH); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(pad.left,cy); ctx.lineTo(pad.left+plotW,cy); ctx.stroke();
      ctx.restore();
      const hoverPrice=max-(cy-pad.top)/priceH*(max-min);
      if(cy<=pad.top+priceH){
        ctx.fillStyle='rgba(36,45,63,.96)';
        ctx.fillRect(pad.left+plotW+4,cy-10,pad.right-7,20);
        ctx.fillStyle='#d8e1f1'; ctx.textAlign='left';
        ctx.fillText(fmt(hoverPrice,decimals(currentMarket.price)),pad.left+plotW+9,cy);
      }
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
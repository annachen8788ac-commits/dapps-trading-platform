const markets = [
  {symbol:'BTC/USDT',name:'Bitcoin',icon:'₿',price:77282.09,change:0.12,high:78424.15,low:75884.4,type:'crypto',bg:'#f7931a'},
  {symbol:'ETH/USDT',name:'Ethereum',icon:'◆',price:2391.09,change:-0.98,high:2440.55,low:2362.3,type:'crypto',bg:'#627eea'},
  {symbol:'XAU/USDT',name:'Gold',icon:'Au',price:4388.21,change:1.38,high:4404.61,low:4308.2,type:'metal',bg:'#b98a11'},
  {symbol:'XAG/USDT',name:'Silver',icon:'Ag',price:65.3289,change:1.94,high:66.05,low:63.81,type:'metal',bg:'#a6a8ac'},
  {symbol:'XRP/USDT',name:'XRP',icon:'X',price:1.3469,change:-0.08,high:1.3821,low:1.319,type:'crypto',bg:'#111'},
  {symbol:'LTC/USDT',name:'Litecoin',icon:'Ł',price:49.67,change:0.06,high:50.21,low:48.83,type:'crypto',bg:'#345d9d'},
  {symbol:'BNB/USDT',name:'BNB',icon:'◇',price:687.56,change:1.04,high:694.44,low:674.11,type:'crypto',bg:'#c99b14'},
  {symbol:'SOL/USDT',name:'Solana',icon:'S',price:99.55,change:0.08,high:101.1,low:97.2,type:'crypto',bg:'#6d4cd8'},
  {symbol:'DOGE/USDT',name:'Dogecoin',icon:'Ð',price:.08155,change:.03,high:.0829,low:.0798,type:'crypto',bg:'#9f842c'},
  {symbol:'TRX/USDT',name:'TRON',icon:'T',price:.3248,change:.49,high:.3272,low:.3201,type:'crypto',bg:'#d71920'}
];

let currentMarket = markets[0];
let direction = 'up';
let duration = 60;
let balance = 12345.67;
let totalPledged = 12500;
let activeTrades = [];
let selectedPledge = {product:'Flexible',min:100};
let chartTimeframe = '1H';

const chartHistory = new Map();
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const fmt = (n,d=2) => Number(n).toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d});

function decimals(v){ return v < 1 ? 6 : v < 100 ? 4 : 2; }

function renderMarkets(filter='all'){
  const list = $('#market-list');
  list.innerHTML = '';
  markets.filter(m => filter === 'all' || m.type === filter).forEach(m => {
    const row = document.createElement('div');
    row.className = 'market-row';
    row.innerHTML = `<div class="market-name"><span class="coin-icon small" style="background:${m.bg}">${m.icon}</span><div><strong>${m.symbol}</strong><small class="muted" style="display:block;margin-top:3px">${m.name}</small></div></div><strong>${fmt(m.price,decimals(m.price))}</strong><strong class="${m.change>=0?'positive':'negative'}">${m.change>=0?'+':''}${m.change.toFixed(2)}%</strong><span>${fmt(m.high,decimals(m.high))}</span><button>Trade</button>`;
    row.querySelector('button').onclick = () => { selectMarket(m); navigate('trade'); };
    list.appendChild(row);
  });
}

function selectMarket(m){
  currentMarket = m;
  $('#trade-symbol').textContent = m.symbol;
  $('#trade-name').textContent = m.name;
  $('#trade-icon').textContent = m.icon;
  $('#trade-icon').style.background = m.bg;
  $('#trade-price').textContent = fmt(m.price,decimals(m.price));
  $('#trade-change').textContent = `${m.change>=0?'+':''}${m.change.toFixed(2)}%`;
  $('#trade-change').className = m.change >= 0 ? 'positive' : 'negative';
  $('#trade-high').textContent = fmt(m.high,decimals(m.high));
  $('#trade-low').textContent = fmt(m.low,decimals(m.low));
  $('#chart-price-badge').textContent = fmt(m.price,decimals(m.price));
  ensureChartHistory(m);
  drawChart();
}

function navigate(name){
  $$('.page').forEach(p => p.classList.remove('active'));
  const page = $(`#page-${name}`);
  if(page) page.classList.add('active');
  $$('[data-nav]').forEach(b => b.classList.toggle('active',b.dataset.nav === name));
  window.scrollTo({top:0,behavior:'smooth'});
  if(name === 'trade') setTimeout(drawChart,30);
}

$$('[data-nav]').forEach(b => b.addEventListener('click',() => navigate(b.dataset.nav)));
$$('.filter').forEach(b => b.onclick = () => {
  $$('.filter').forEach(x => x.classList.remove('active'));
  b.classList.add('active');
  renderMarkets(b.dataset.filter);
});

function updatePotential(){
  const amount = Number($('#trade-amount').value) || 0;
  $('#potential-return').textContent = `${fmt(amount*1.82)} USDT`;
}
$('#trade-amount').addEventListener('input',updatePotential);
$$('[data-amount]').forEach(b => b.onclick = () => { $('#trade-amount').value = b.dataset.amount; updatePotential(); });

$('#up-btn').onclick = () => { direction='up'; $('#up-btn').classList.add('active'); $('#down-btn').classList.remove('active'); };
$('#down-btn').onclick = () => { direction='down'; $('#down-btn').classList.add('active'); $('#up-btn').classList.remove('active'); };
$$('[data-duration]').forEach(b => b.onclick = () => {
  duration = Number(b.dataset.duration);
  $$('[data-duration]').forEach(x => x.classList.remove('active'));
  b.classList.add('active');
});

function showToast(msg){
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => t.classList.remove('show'),2600);
}

$('#place-trade').onclick = () => {
  const amount = Number($('#trade-amount').value);
  if(!amount || amount < 10) return showToast('Minimum demo trade is 10 USDT.');
  if(amount > balance) return showToast('Insufficient demo balance.');
  balance -= amount;
  activeTrades.push({id:Date.now(),market:currentMarket,dir:direction,entry:currentMarket.price,amount,end:Date.now()+duration*1000});
  updateBalances();
  renderPositions();
  showToast(`${direction==='up'?'Up':'Down'} demo trade opened on ${currentMarket.symbol}.`);
};

function renderPositions(){
  const list = $('#positions-list');
  if(!activeTrades.length){
    list.className='positions-list empty-state';
    list.textContent='No active trades yet.';
    return;
  }
  list.className='positions-list';
  list.innerHTML = activeTrades.map(t => {
    const left = Math.max(0,Math.ceil((t.end-Date.now())/1000));
    return `<div class="position-row"><strong>${t.market.symbol}</strong><span class="${t.dir==='up'?'positive':'negative'}">${t.dir==='up'?'↑ Up':'↓ Down'}</span><strong>${fmt(t.entry,decimals(t.entry))}</strong><span>${fmt(t.amount)} USDT</span><span>${left}s</span><span>Active</span></div>`;
  }).join('');
}

function updateBalances(){
  $('#available-balance').textContent = `${fmt(balance)} USDT`;
  $('#asset-available').textContent = fmt(balance);
  $('#asset-pledged').textContent = fmt(totalPledged);
  $('#total-pledged').textContent = `${fmt(totalPledged)} USDT`;
}

$$('.pledge-btn').forEach(b => b.onclick = () => {
  selectedPledge = {product:b.dataset.product,min:Number(b.dataset.min)};
  $('#modal-title').textContent = `${selectedPledge.product} Pledge`;
  $('#pledge-amount').min = selectedPledge.min;
  $('#pledge-amount').value = selectedPledge.min;
  $('#pledge-modal').classList.add('open');
  $('#pledge-modal').setAttribute('aria-hidden','false');
});

function closeModal(){
  $('#pledge-modal').classList.remove('open');
  $('#pledge-modal').setAttribute('aria-hidden','true');
}
$('#modal-close').onclick = closeModal;
$('#pledge-modal').onclick = e => { if(e.target.id === 'pledge-modal') closeModal(); };
$('#confirm-pledge').onclick = () => {
  const amount = Number($('#pledge-amount').value);
  if(amount < selectedPledge.min) return showToast(`Minimum is ${fmt(selectedPledge.min)} USDT.`);
  if(amount > balance) return showToast('Insufficient demo balance.');
  balance -= amount;
  totalPledged += amount;
  const row = document.createElement('div');
  row.className='pledge-row';
  row.innerHTML = `<span>${selectedPledge.product} Pledge</span><strong>${fmt(amount)} USDT</strong><span>Demo APY</span><span class="positive">Active</span>`;
  $('#pledge-list').appendChild(row);
  updateBalances();
  closeModal();
  showToast('Demo pledge added to portfolio.');
};

function ensureChartHistory(m){
  if(chartHistory.has(m.symbol)) return chartHistory.get(m.symbol);
  const data = [];
  let p = m.price * 0.985;
  for(let i=0;i<90;i++){
    const open = p;
    const close = open * (1 + (Math.random()-.485)*.0036);
    const high = Math.max(open,close) * (1 + Math.random()*.0018);
    const low = Math.min(open,close) * (1 - Math.random()*.0018);
    data.push({open,high,low,close});
    p = close;
  }
  const scale = m.price / data[data.length-1].close;
  data.forEach(c => { c.open*=scale; c.high*=scale; c.low*=scale; c.close*=scale; });
  chartHistory.set(m.symbol,data);
  return data;
}

function pushChartTick(m){
  const data = ensureChartHistory(m);
  const last = data[data.length-1];
  const open = last.close;
  const close = m.price;
  const spread = Math.max(Math.abs(close-open)*.45, close*.00035);
  const high = Math.max(open,close) + Math.random()*spread;
  const low = Math.min(open,close) - Math.random()*spread;
  data.push({open,high,low,close});
  if(data.length > 120) data.shift();
}

function movingAverage(values, period){
  return values.map((_,i) => {
    if(i < period-1) return null;
    let sum = 0;
    for(let j=i-period+1;j<=i;j++) sum += values[j];
    return sum/period;
  });
}

function drawSeries(ctx, values, xFor, yFor, color, width=1.5){
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  let started = false;
  values.forEach((v,i) => {
    if(v == null) return;
    const x = xFor(i), y = yFor(v);
    if(!started){ ctx.moveTo(x,y); started=true; }
    else ctx.lineTo(x,y);
  });
  ctx.stroke();
  ctx.restore();
}

function drawChart(){
  const canvas = $('#price-chart');
  if(!canvas) return;
  const rect = canvas.getBoundingClientRect();
  if(rect.width < 10 || rect.height < 10) return;

  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(rect.width*dpr);
  canvas.height = Math.floor(rect.height*dpr);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr,0,0,dpr,0,0);

  const w = rect.width, h = rect.height;
  const pad = {top:18,right:72,bottom:28,left:10};
  const plotW = w-pad.left-pad.right;
  const plotH = h-pad.top-pad.bottom;
  ctx.clearRect(0,0,w,h);

  const source = ensureChartHistory(currentMarket);
  const countByTf = {'1m':42,'5m':50,'15m':58,'1H':66,'4H':74,'1D':86};
  const count = Math.min(source.length,countByTf[chartTimeframe] || 66);
  const data = source.slice(-count);

  const rawMin = Math.min(...data.map(d=>d.low));
  const rawMax = Math.max(...data.map(d=>d.high));
  const range = Math.max(rawMax-rawMin,currentMarket.price*.002);
  const min = rawMin-range*.11;
  const max = rawMax+range*.11;
  const y = v => pad.top + (max-v)/(max-min)*plotH;
  const step = plotW/data.length;
  const x = i => pad.left + i*step + step/2;

  ctx.font = '11px Inter, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  for(let i=0;i<=5;i++){
    const yy = pad.top + plotH*i/5;
    ctx.strokeStyle='rgba(126,140,170,.16)';
    ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(pad.left,yy); ctx.lineTo(pad.left+plotW,yy); ctx.stroke();
    const value = max-(max-min)*i/5;
    ctx.fillStyle='rgba(173,184,208,.72)';
    ctx.fillText(fmt(value,decimals(currentMarket.price)),pad.left+plotW+9,yy);
  }

  for(let i=0;i<=6;i++){
    const xx = pad.left + plotW*i/6;
    ctx.strokeStyle='rgba(126,140,170,.10)';
    ctx.beginPath(); ctx.moveTo(xx,pad.top); ctx.lineTo(xx,pad.top+plotH); ctx.stroke();
    if(i<6){
      const minsAgo = Math.round((6-i)*count/6);
      ctx.fillStyle='rgba(173,184,208,.55)';
      ctx.textAlign='center';
      ctx.fillText(minsAgo===0?'Now':`-${minsAgo}`,xx,pad.top+plotH+17);
    }
  }

  const candleW = Math.max(3,Math.min(9,step*.58));
  data.forEach((d,i)=>{
    const xx=x(i), up=d.close>=d.open;
    const color=up?'#26c281':'#ff5b67';
    ctx.strokeStyle=color;
    ctx.fillStyle=color;
    ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(xx,y(d.high)); ctx.lineTo(xx,y(d.low)); ctx.stroke();
    const bodyTop=Math.min(y(d.open),y(d.close));
    const bodyH=Math.max(2,Math.abs(y(d.close)-y(d.open)));
    ctx.fillRect(xx-candleW/2,bodyTop,candleW,bodyH);
  });

  const closes=data.map(d=>d.close);
  const ma7=movingAverage(closes,7);
  const ma20=movingAverage(closes,20);
  drawSeries(ctx,ma7,x,y,'#f0b90b',1.4);
  drawSeries(ctx,ma20,x,y,'#7f8cff',1.4);

  const lineGradient=ctx.createLinearGradient(0,pad.top,0,pad.top+plotH);
  lineGradient.addColorStop(0,'rgba(45,126,247,.95)');
  lineGradient.addColorStop(1,'rgba(60,185,255,.55)');
  drawSeries(ctx,closes,x,y,lineGradient,1.8);

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

  ctx.fillStyle='rgba(9,15,27,.96)';
  ctx.fillRect(pad.left+plotW+4,currentY-10,pad.right-7,20);
  ctx.fillStyle='#78aaff';
  ctx.textAlign='left';
  ctx.fillText(fmt(currentMarket.price,decimals(currentMarket.price)),pad.left+plotW+9,currentY);

  ctx.textAlign='left';
  ctx.textBaseline='top';
  ctx.font='11px Inter, sans-serif';
  ctx.fillStyle='#f0b90b';
  ctx.fillText(`MA7 ${fmt(ma7[ma7.length-1],decimals(currentMarket.price))}`,pad.left+8,pad.top+5);
  ctx.fillStyle='#8f9cff';
  ctx.fillText(`MA20 ${fmt(ma20[ma20.length-1],decimals(currentMarket.price))}`,pad.left+118,pad.top+5);
}

const timeframeButtons = $$('.timeframes button');
timeframeButtons.forEach(btn => {
  btn.addEventListener('click',() => {
    timeframeButtons.forEach(x=>x.classList.remove('active'));
    btn.classList.add('active');
    chartTimeframe=btn.textContent.trim();
    drawChart();
  });
});

setInterval(() => {
  markets.forEach(m => {
    const move=(Math.random()-.5)*.0012;
    m.price=Math.max(.000001,m.price*(1+move));
    m.high=Math.max(m.high,m.price);
    m.low=Math.min(m.low,m.price);
  });

  pushChartTick(currentMarket);

  if($('#page-markets').classList.contains('active')) renderMarkets($('.filter.active')?.dataset.filter||'all');
  if($('#page-trade').classList.contains('active')){
    $('#trade-price').textContent=fmt(currentMarket.price,decimals(currentMarket.price));
    $('#trade-high').textContent=fmt(currentMarket.high,decimals(currentMarket.high));
    $('#trade-low').textContent=fmt(currentMarket.low,decimals(currentMarket.low));
    $('#chart-price-badge').textContent=fmt(currentMarket.price,decimals(currentMarket.price));
    drawChart();
  }

  const now=Date.now();
  activeTrades.filter(t=>t.end<=now).forEach(t=>{
    const won=t.dir==='up'?t.market.price>=t.entry:t.market.price<=t.entry;
    if(won){
      const payout=t.amount*1.82;
      balance+=payout;
      showToast(`Demo trade settled: +${fmt(payout-t.amount)} USDT`);
    }else showToast(`Demo trade settled: -${fmt(t.amount)} USDT`);
  });
  activeTrades=activeTrades.filter(t=>t.end>now);
  updateBalances();
  renderPositions();
},1000);

window.addEventListener('resize',()=>{ if($('#page-trade').classList.contains('active')) drawChart(); });
renderMarkets();
selectMarket(markets[0]);
updatePotential();
updateBalances();
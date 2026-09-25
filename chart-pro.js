(()=>{
'use strict';
const $=(s,r=document)=>r.querySelector(s);
const el=$('#page-trade .chart-stage'),canvas=$('#price-chart');
if(!el||!canvas)return;
canvas.className='pro-native-canvas';
const ctx=canvas.getContext('2d');
let tip=$('#chart-tooltip');
if(tip)tip.remove();
tip=document.createElement('div');tip.id='chart-tooltip';tip.className='pro-chart-tooltip';el.appendChild(tip);
document.querySelector('#chart-legend')?.remove();
document.querySelector('.chart-zoom-controls')?.remove();

const backend=localStorage.getItem('dapps:apiBase')||'https://dapps-trading-platform-production.up.railway.app';
const state={symbol:'BTC/USDT',period:'24H',rows:[],visible:120,offset:0,hover:null,drag:false,lastX:0,historyToken:0,liveReady:false};
const overlays=[{period:7,label:'EMA 7',color:'#f5c84c'},{period:25,label:'EMA 25',color:'#b978ff'},{period:99,label:'EMA 99',color:'#38bdf8'}];

function selectedSymbol(){return (typeof currentMarket!=='undefined'&&currentMarket?.symbol)||$('#trade-symbol')?.textContent?.trim()||'BTC/USDT'}
function baseCode(){return selectedSymbol().split('/')[0].toUpperCase()}
const defaultPeriods=[{id:'1H',seconds:60,count:60},{id:'24H',seconds:300,count:288},{id:'7D',seconds:3600,count:168},{id:'30D',seconds:21600,count:180}];
function periodList(){const list=window.__marketConfig?.periods;return Array.isArray(list)&&list.length?list:defaultPeriods}
function periodInfo(id=state.period){return periodList().find(p=>p.id===id)||null}
let historyTimer=null;
function queueHistory(delay=40){clearTimeout(historyTimer);historyTimer=setTimeout(history,delay)}
let installedPeriodKey='';
function size(){const dpr=Math.min(devicePixelRatio||1,2),r=el.getBoundingClientRect(),w=Math.max(320,Math.floor(r.width)),h=Math.max(420,Math.floor(r.height));if(canvas.width!==w*dpr||canvas.height!==h*dpr){canvas.width=w*dpr;canvas.height=h*dpr;canvas.style.width=w+'px';canvas.style.height=h+'px'}ctx.setTransform(dpr,0,0,dpr,0,0);return{w,h}}
function fmt(n){if(!Number.isFinite(+n))return'—';n=+n;return n.toLocaleString('en-US',{minimumFractionDigits:n>=1000?2:4,maximumFractionDigits:n>=1?4:8})}
function compact(n){n=+n;if(!Number.isFinite(n))return'—';return Intl.NumberFormat('en-US',{notation:'compact',maximumFractionDigits:2}).format(n)}
function windowBounds(){const n=state.rows.length;if(!n)return{start:0,end:0};const count=Math.min(state.visible,n),end=Math.max(count,Math.min(n,n-state.offset));return{start:end-count,end}}
function windowRows(){const{start,end}=windowBounds();return state.rows.slice(start,end)}
function emaValues(rows,period,key='close'){if(!rows.length)return[];const k=2/(period+1),out=[];let value=+rows[0][key]||0;for(let i=0;i<rows.length;i++){const v=+rows[i][key]||0;value=i===0?v:(v*k+value*(1-k));out.push(value)}return out}
function rsiValues(rows,period=14){const out=Array(rows.length).fill(null);if(rows.length<2)return out;let gains=0,losses=0;for(let i=1;i<=Math.min(period,rows.length-1);i++){const d=rows[i].close-rows[i-1].close;if(d>=0)gains+=d;else losses-=d}if(rows.length>period){let avgGain=gains/period,avgLoss=losses/period;out[period]=avgLoss===0?100:100-(100/(1+avgGain/avgLoss));for(let i=period+1;i<rows.length;i++){const d=rows[i].close-rows[i-1].close,g=d>0?d:0,l=d<0?-d:0;avgGain=(avgGain*(period-1)+g)/period;avgLoss=(avgLoss*(period-1)+l)/period;out[i]=avgLoss===0?100:100-(100/(1+avgGain/avgLoss))}}return out}
function macdValues(rows){const e12=emaValues(rows,12),e26=emaValues(rows,26),macd=rows.map((_,i)=>e12[i]-e26[i]),signal=[];const k=2/10;let s=macd[0]||0;for(let i=0;i<macd.length;i++){s=i===0?macd[i]:(macd[i]*k+s*(1-k));signal.push(s)}return{macd,signal,hist:macd.map((v,i)=>v-signal[i])}}
function drawSeries(values,start,count,x,y,color,width=1.2){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();let begun=false;for(let i=0;i<count;i++){const v=values[start+i];if(!Number.isFinite(v)){begun=false;continue}const xx=x(i),yy=y(v);if(!begun){ctx.moveTo(xx,yy);begun=true}else ctx.lineTo(xx,yy)}if(begun)ctx.stroke()}

function draw(){
  const{w,h}=size(),L=12,R=84,T=28,B=30,W=Math.max(1,w-L-R);ctx.clearRect(0,0,w,h);ctx.fillStyle='#061425';ctx.fillRect(0,0,w,h);
  const{start}=windowBounds(),rows=windowRows();
  if(!rows.length){ctx.fillStyle='#7894ad';ctx.font='12px Inter,Arial';ctx.fillText('Loading K-line history…',18,30);tip.classList.remove('show');return}
  const gap=8,mainH=Math.max(190,Math.floor((h-T-B-gap*3)*.58)),volH=Math.max(54,Math.floor((h-T-B-gap*3)*.12)),macdH=Math.max(72,Math.floor((h-T-B-gap*3)*.16)),rsiH=Math.max(68,h-T-B-gap*3-mainH-volH-macdH);
  const mainT=T,volT=mainT+mainH+gap,macdT=volT+volH+gap,rsiT=macdT+macdH+gap,x=i=>L+(i+.5)*W/rows.length;
  let lo=Math.min(...rows.map(v=>v.low)),hi=Math.max(...rows.map(v=>v.high));const pad=(hi-lo||Math.abs(hi)*.01||1)*.08;lo-=pad;hi+=pad;const y=p=>mainT+(hi-p)/(hi-lo)*mainH;
  ctx.font='10px Inter,Arial';ctx.strokeStyle='rgba(126,163,196,.12)';ctx.fillStyle='#7894ad';ctx.lineWidth=1;
  for(let i=0;i<6;i++){const yy=mainT+mainH*i/5;ctx.beginPath();ctx.moveTo(L,yy);ctx.lineTo(L+W,yy);ctx.stroke();ctx.fillText(fmt(hi-(hi-lo)*i/5),L+W+8,yy+3)}
  for(let i=0;i<6;i++){const xx=L+W*i/5;ctx.beginPath();ctx.moveTo(xx,mainT);ctx.lineTo(xx,rsiT+rsiH);ctx.stroke();const idx=Math.min(rows.length-1,Math.round((rows.length-1)*i/5)),d=new Date(rows[idx].time*1000);ctx.fillText(d.toLocaleString('en-US',{month:'short',day:'2-digit',hour:'2-digit',minute:'2-digit'}),Math.min(xx,w-108),h-7)}
  const bw=Math.max(2,Math.min(11,W/rows.length*.68));
  rows.forEach((d,i)=>{const xx=x(i),up=d.close>=d.open,col=up?'#20c997':'#ff5f73';ctx.strokeStyle=col;ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(xx,y(d.high));ctx.lineTo(xx,y(d.low));ctx.stroke();const top=y(Math.max(d.open,d.close)),bot=y(Math.min(d.open,d.close));ctx.fillRect(xx-bw/2,top,bw,Math.max(1.5,bot-top))});
  const all=state.rows;for(const o of overlays)drawSeries(emaValues(all,o.period),start,rows.length,x,y,o.color,1.45);
  let lx=18;ctx.font='bold 9px Inter,Arial';for(const o of overlays){ctx.fillStyle=o.color;ctx.fillRect(lx,11,12,2);ctx.fillText(o.label,lx+17,15);lx+=68}
  const last=rows[rows.length-1];ctx.strokeStyle='#26c9ff';ctx.setLineDash([4,4]);ctx.beginPath();ctx.moveTo(L,y(last.close));ctx.lineTo(L+W,y(last.close));ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#26c9ff';ctx.fillRect(L+W+4,y(last.close)-8,78,16);ctx.fillStyle='#04101f';ctx.font='bold 10px Inter,Arial';ctx.fillText(fmt(last.close),L+W+8,y(last.close)+3);
  ctx.strokeStyle='rgba(126,163,196,.16)';for(const yy of[volT-4,macdT-4,rsiT-4]){ctx.beginPath();ctx.moveTo(L,yy);ctx.lineTo(L+W,yy);ctx.stroke()}
  ctx.fillStyle='#6f8ca8';ctx.font='bold 9px Inter,Arial';ctx.fillText('VOL',L,volT+9);const maxVol=Math.max(...rows.map(v=>+v.volume||0),1);rows.forEach((d,i)=>{const vh=((+d.volume||0)/maxVol)*(volH-12);ctx.fillStyle=d.close>=d.open?'rgba(32,201,151,.46)':'rgba(255,95,115,.46)';ctx.fillRect(x(i)-bw/2,volT+volH-vh,bw,Math.max(1,vh))});ctx.fillStyle='#7894ad';ctx.fillText(compact(maxVol),L+W+8,volT+10);
  const m=macdValues(all),visibleHist=m.hist.slice(start,start+rows.length),mAbs=Math.max(...visibleHist.map(v=>Math.abs(v)),...m.macd.slice(start,start+rows.length).map(v=>Math.abs(v)),...m.signal.slice(start,start+rows.length).map(v=>Math.abs(v)),1e-9),mY=v=>macdT+macdH/2-(v/mAbs)*(macdH*.42);ctx.fillStyle='#6f8ca8';ctx.font='bold 9px Inter,Arial';ctx.fillText('MACD 12 26 9',L,macdT+10);ctx.strokeStyle='rgba(126,163,196,.18)';ctx.beginPath();ctx.moveTo(L,mY(0));ctx.lineTo(L+W,mY(0));ctx.stroke();visibleHist.forEach((v,i)=>{ctx.fillStyle=v>=0?'rgba(32,201,151,.48)':'rgba(255,95,115,.48)';const yy=mY(v),zero=mY(0);ctx.fillRect(x(i)-Math.max(1,bw*.35),Math.min(yy,zero),Math.max(2,bw*.7),Math.max(1,Math.abs(zero-yy)))});drawSeries(m.macd,start,rows.length,x,mY,'#f5c84c',1.15);drawSeries(m.signal,start,rows.length,x,mY,'#b978ff',1.15);
  const r=rsiValues(all,14),rY=v=>rsiT+(100-v)/100*rsiH;ctx.fillStyle='#6f8ca8';ctx.font='bold 9px Inter,Arial';ctx.fillText('RSI 14',L,rsiT+10);for(const level of[30,50,70]){ctx.strokeStyle=level===50?'rgba(126,163,196,.12)':'rgba(245,200,76,.18)';ctx.setLineDash(level===50?[]:[3,3]);ctx.beginPath();ctx.moveTo(L,rY(level));ctx.lineTo(L+W,rY(level));ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#6f8ca8';ctx.fillText(String(level),L+W+8,rY(level)+3)}drawSeries(r,start,rows.length,x,rY,'#38bdf8',1.3);
  if(state.hover){const mx=Math.max(L,Math.min(L+W,state.hover.x)),my=Math.max(mainT,Math.min(mainT+mainH,state.hover.y)),idx=Math.max(0,Math.min(rows.length-1,Math.floor((mx-L)/W*rows.length))),d=rows[idx],gi=start+idx,crossPrice=hi-(my-mainT)/mainH*(hi-lo);ctx.strokeStyle='rgba(181,207,230,.72)';ctx.setLineDash([3,3]);ctx.beginPath();ctx.moveTo(mx,mainT);ctx.lineTo(mx,rsiT+rsiH);ctx.moveTo(L,my);ctx.lineTo(L+W,my);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#b5cfe6';ctx.fillRect(L+W+4,my-8,78,16);ctx.fillStyle='#04101f';ctx.font='bold 10px Inter,Arial';ctx.fillText(fmt(crossPrice),L+W+8,my+3);const emaText=overlays.map(o=>o.label+' '+fmt(emaValues(all,o.period)[gi])).join(' · '),rv=r[gi],mv=m.macd[gi],sv=m.signal[gi];tip.innerHTML='<b>'+state.symbol+'</b><span>'+new Date(d.time*1000).toLocaleString()+'</span><span>O '+fmt(d.open)+' · H '+fmt(d.high)+' · L '+fmt(d.low)+' · C '+fmt(d.close)+'</span><span>'+emaText+'</span><span>VOL '+compact(d.volume||0)+' · MACD '+fmt(mv)+' / '+fmt(sv)+' · RSI '+(Number.isFinite(rv)?rv.toFixed(1):'—')+'</span>';tip.style.left=Math.min(mx+14,w-300)+'px';tip.style.top='36px';tip.classList.add('show')}else tip.classList.remove('show');
}
async function json(url){const r=await fetch(url,{cache:'no-store',headers:{Accept:'application/json'}});if(!r.ok)throw Error(String(r.status));return r.json()}
async function history(){
  const info=periodInfo();if(!info)return;
  const token=++state.historyToken,loadingSymbol=selectedSymbol(),period=state.period;
  state.symbol=loadingSymbol;state.liveReady=false;state.rows=[];state.offset=0;draw();
  try{
    const d=await json(backend+'/api/market/chart?symbol='+encodeURIComponent(baseCode())+'&period='+encodeURIComponent(period));
    if(token!==state.historyToken||selectedSymbol()!==loadingSymbol)return;
    const rows=(Array.isArray(d.candles)?d.candles:[]).map(v=>({time:+v.time,open:+v.open,high:+v.high,low:+v.low,close:+v.close,volume:+v.volume||0})).filter(v=>[v.time,v.open,v.high,v.low,v.close].every(Number.isFinite)).sort((a,b)=>a.time-b.time);
    if(!rows.length)throw Error('empty');
    state.rows=rows;state.visible=Math.min(rows.length,Number(info.count)||120);state.offset=0;state.liveReady=true;draw();
  }catch(_){if(token===state.historyToken){state.rows=[];state.liveReady=false;draw()}}
}
function plausibleLive(price){const last=state.rows[state.rows.length-1]?.close;if(!Number.isFinite(price)||!Number.isFinite(last)||last<=0)return false;return Math.abs(price-last)/last<=.25}
function live(price,time){
  price=+price;
  const info=periodInfo();
  if(!info||!state.liveReady||!Number.isFinite(price)||!state.rows.length||!plausibleLive(price))return;
  const sec=Number(info.seconds)||300,stamp=Number.isFinite(Date.parse(time))?Date.parse(time):Date.now(),bucket=Math.floor(stamp/1000/sec)*sec,last=state.rows[state.rows.length-1];
  let changed=false;
  if(last.time===bucket){
    if(last.close!==price){last.close=price;last.high=Math.max(last.high,price);last.low=Math.min(last.low,price);changed=true}
  }else if(bucket>last.time){
    state.rows.push({time:bucket,open:last.close,high:price,low:price,close:price,volume:0});
    if(state.rows.length>600)state.rows.shift();
    changed=true;
  }
  if(changed)draw();
}
function beginSwitch(){
  state.liveReady=false;state.historyToken++;state.rows=[];state.offset=0;state.symbol=selectedSymbol();draw();
  if(periodInfo())queueHistory(40);
}

canvas.addEventListener('wheel',e=>{e.preventDefault();const old=state.visible,f=e.deltaY>0?1.12:.88;state.visible=Math.max(20,Math.min(state.rows.length,Math.round(old*f)));state.offset=Math.min(state.offset,Math.max(0,state.rows.length-state.visible));draw()},{passive:false});
canvas.addEventListener('mousemove',e=>{const r=canvas.getBoundingClientRect();state.hover={x:e.clientX-r.left,y:e.clientY-r.top};if(state.drag){const dx=e.clientX-state.lastX,step=Math.round(dx/(r.width/Math.max(20,state.visible)));if(step){state.offset=Math.max(0,Math.min(Math.max(0,state.rows.length-state.visible),state.offset+step));state.lastX=e.clientX}}draw()});
canvas.addEventListener('mouseleave',()=>{state.hover=null;state.drag=false;canvas.classList.remove('dragging');draw()});
canvas.addEventListener('mousedown',e=>{state.drag=true;state.lastX=e.clientX;canvas.classList.add('dragging')});
window.addEventListener('mouseup',()=>{state.drag=false;canvas.classList.remove('dragging')});
canvas.addEventListener('dblclick',()=>{const info=periodInfo();state.offset=0;state.visible=Math.min(state.rows.length,Number(info?.count)||120);draw()});

let touchStartDistance=0,touchStartVisible=0,touchLastX=null,touchMode='';
canvas.addEventListener('touchstart',e=>{if(e.touches.length===2){touchMode='pinch';touchStartDistance=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);touchStartVisible=state.visible}else if(e.touches.length===1){touchMode='pan';touchLastX=e.touches[0].clientX}},{passive:true});
canvas.addEventListener('touchmove',e=>{if(touchMode==='pinch'&&e.touches.length===2){e.preventDefault();const d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);if(touchStartDistance>0){state.visible=Math.max(20,Math.min(state.rows.length,Math.round(touchStartVisible*(touchStartDistance/d))));state.offset=Math.min(state.offset,Math.max(0,state.rows.length-state.visible));draw()}}else if(touchMode==='pan'&&e.touches.length===1&&touchLastX!==null){const dx=e.touches[0].clientX-touchLastX;if(Math.abs(dx)>6){e.preventDefault();const step=Math.round(dx/(canvas.getBoundingClientRect().width/Math.max(20,state.visible)));if(step){state.offset=Math.max(0,Math.min(Math.max(0,state.rows.length-state.visible),state.offset+step));touchLastX=e.touches[0].clientX;draw()}}}},{passive:false});
canvas.addEventListener('touchend',()=>{touchMode='';touchLastX=null;touchStartDistance=0},{passive:true});

function installPeriods(){
  const list=periodList(),wrap=document.querySelector('.timeframes');
  if(!wrap||!list.length)return false;
  const key=list.map(p=>p.id+':'+p.seconds+':'+p.count).join('|');
  if(!list.some(p=>p.id===state.period))state.period=(list.find(p=>p.id==='24H')||list[0]).id;
  if(key===installedPeriodKey)return true;
  installedPeriodKey=key;
  wrap.innerHTML=list.map(p=>`<button type="button" data-period="${p.id}" class="${p.id===state.period?'active':''}">${p.id}</button>`).join('');
  wrap.querySelectorAll('button').forEach(btn=>btn.addEventListener('click',()=>{
    const p=btn.dataset.period;
    if(!periodInfo(p)||p===state.period)return;
    state.period=p;
    wrap.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===btn));
    state.liveReady=false;state.rows=[];state.offset=0;draw();queueHistory(0);
  }));
  return true;
}

window.addEventListener('dapps:market-config',()=>{
  const before=installedPeriodKey;
  if(installPeriods()&&installedPeriodKey!==before)beginSwitch();
});
window.addEventListener('dapps:market-selected',beginSwitch);
const tradeSymbol=$('#trade-symbol');
if(tradeSymbol)new MutationObserver(()=>{
  if(selectedSymbol()!==state.symbol)beginSwitch();
}).observe(tradeSymbol,{childList:true,subtree:true,characterData:true});
window.addEventListener('dapps:market-quote',e=>{
  const d=e.detail||{};
  if(d.symbol===state.symbol)live(Number(d.price),d.time);
});
new ResizeObserver(draw).observe(el);
window.drawChart=draw;
draw();
installPeriods();
queueHistory(20);
if(window.__marketConfigReady?.then){
  window.__marketConfigReady.then(()=>installPeriods());
}
})();
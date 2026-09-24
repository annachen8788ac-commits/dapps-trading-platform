(()=>{
'use strict';
const state={hover:null,drag:false,lastX:0,visible:120,offset:0};
const specs={
  '1H':{count:60},
  '24H':{count:288},
  '7D':{count:168},
  '30D':{count:180}
};
const overlays=[
  {period:7,label:'EMA 7',color:'#f5c84c'},
  {period:25,label:'EMA 25',color:'#b978ff'},
  {period:99,label:'EMA 99',color:'#38bdf8'}
];
const canvas=document.querySelector('#price-chart');
const stage=document.querySelector('.chart-stage');
if(!canvas||!stage)return;
const ctx=canvas.getContext('2d');
let tip=document.querySelector('#chart-tooltip');
if(!tip){tip=document.createElement('div');tip.id='chart-tooltip';tip.className='pro-chart-tooltip';stage.appendChild(tip)}
document.querySelector('#chart-legend')?.remove();
document.querySelector('.chart-zoom-controls')?.remove();

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const fmt=n=>{if(!Number.isFinite(+n))return'—';n=+n;return n.toLocaleString('en-US',{minimumFractionDigits:n>=1000?2:4,maximumFractionDigits:n>=1?4:8})};
const compact=n=>{n=+n;if(!Number.isFinite(n))return'—';return Intl.NumberFormat('en-US',{notation:'compact',maximumFractionDigits:2}).format(n)};
const rowsAll=()=>{const a=typeof chartHistory!=='undefined'&&typeof currentMarket!=='undefined'?chartHistory.get(currentMarket.symbol):null;return Array.isArray(a)?a:[]};
function size(){const dpr=Math.min(window.devicePixelRatio||1,2),r=stage.getBoundingClientRect(),w=Math.max(320,Math.floor(r.width)),h=Math.max(500,Math.floor(r.height));if(canvas.width!==w*dpr||canvas.height!==h*dpr){canvas.width=w*dpr;canvas.height=h*dpr;canvas.style.width=w+'px';canvas.style.height=h+'px'}ctx.setTransform(dpr,0,0,dpr,0,0);return{w,h}}
function normalized(){return rowsAll().map((c,i,a)=>({time:Math.floor(Number(c.ts||Date.now())/1000),open:Number(c.open),high:Number(c.high),low:Number(c.low),close:Number(c.close),volume:Number(c.volume||0)})).filter(c=>[c.time,c.open,c.high,c.low,c.close].every(Number.isFinite)).sort((a,b)=>a.time-b.time)}
function emaValues(rows,period,key='close'){if(!rows.length)return[];const k=2/(period+1),out=[];let value=+rows[0][key]||0;for(let i=0;i<rows.length;i++){const v=+rows[i][key]||0;value=i===0?v:(v*k+value*(1-k));out.push(value)}return out}
function rsiValues(rows,period=14){const out=Array(rows.length).fill(null);if(rows.length<2)return out;let gains=0,losses=0;for(let i=1;i<=Math.min(period,rows.length-1);i++){const d=rows[i].close-rows[i-1].close;if(d>=0)gains+=d;else losses-=d}if(rows.length>period){let avgGain=gains/period,avgLoss=losses/period;out[period]=avgLoss===0?100:100-(100/(1+avgGain/avgLoss));for(let i=period+1;i<rows.length;i++){const d=rows[i].close-rows[i-1].close,g=d>0?d:0,l=d<0?-d:0;avgGain=(avgGain*(period-1)+g)/period;avgLoss=(avgLoss*(period-1)+l)/period;out[i]=avgLoss===0?100:100-(100/(1+avgGain/avgLoss))}}return out}
function macdValues(rows){const e12=emaValues(rows,12),e26=emaValues(rows,26),macd=rows.map((_,i)=>e12[i]-e26[i]),signal=[];const k=2/10;let s=macd[0]||0;for(let i=0;i<macd.length;i++){s=i===0?macd[i]:(macd[i]*k+s*(1-k));signal.push(s)}return{macd,signal,hist:macd.map((v,i)=>v-signal[i])}}
function bounds(rows){const n=rows.length;if(!n)return{start:0,end:0};const wanted=specs[chartTimeframe]?.count||120;if(state.offset===0&&state.visible!==wanted)state.visible=Math.min(n,wanted);const count=Math.min(state.visible,n),end=Math.max(count,Math.min(n,n-state.offset));return{start:end-count,end}}
function drawSeries(values,start,count,x,y,color,width=1.2){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();let begun=false;for(let i=0;i<count;i++){const v=values[start+i];if(!Number.isFinite(v)){begun=false;continue}const xx=x(i),yy=y(v);if(!begun){ctx.moveTo(xx,yy);begun=true}else ctx.lineTo(xx,yy)}if(begun)ctx.stroke()}
function draw(){
  const {w,h}=size(),rows=normalized();ctx.clearRect(0,0,w,h);ctx.fillStyle='#061425';ctx.fillRect(0,0,w,h);
  if(!rows.length){ctx.fillStyle='#7894ad';ctx.font='12px Inter,Arial';ctx.fillText('Loading K-line history…',18,30);return}
  const {start,end}=bounds(rows),view=rows.slice(start,end);if(!view.length)return;
  const L=10,R=82,T=28,B=28,W=Math.max(1,w-L-R),gap=7;
  const mainH=Math.max(190,Math.floor((h-T-B-gap*3)*.58)),volH=Math.max(54,Math.floor((h-T-B-gap*3)*.12)),macdH=Math.max(72,Math.floor((h-T-B-gap*3)*.16)),rsiH=Math.max(68,h-T-B-gap*3-mainH-volH-macdH);
  const mainT=T,volT=mainT+mainH+gap,macdT=volT+volH+gap,rsiT=macdT+macdH+gap;
  const x=i=>L+(i+.5)*W/view.length;
  let lo=Math.min(...view.map(v=>v.low)),hi=Math.max(...view.map(v=>v.high));const pad=(hi-lo||Math.abs(hi)*.01||1)*.08;lo-=pad;hi+=pad;const y=p=>mainT+(hi-p)/(hi-lo)*mainH;
  ctx.font='10px Inter,Arial';ctx.strokeStyle='rgba(126,163,196,.12)';ctx.fillStyle='#7894ad';ctx.lineWidth=1;
  for(let i=0;i<6;i++){const yy=mainT+mainH*i/5;ctx.beginPath();ctx.moveTo(L,yy);ctx.lineTo(L+W,yy);ctx.stroke();ctx.fillText(fmt(hi-(hi-lo)*i/5),L+W+8,yy+3)}
  for(let i=0;i<6;i++){const xx=L+W*i/5;ctx.beginPath();ctx.moveTo(xx,mainT);ctx.lineTo(xx,rsiT+rsiH);ctx.stroke();const idx=Math.min(view.length-1,Math.round((view.length-1)*i/5)),d=new Date(view[idx].time*1000);const label=chartTimeframe==='30D'||chartTimeframe==='7D'?d.toLocaleDateString('en-US',{month:'short',day:'2-digit'}):d.toLocaleString('en-US',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'});ctx.fillText(label,Math.min(xx,w-108),h-7)}
  const bw=Math.max(2,Math.min(11,W/view.length*.68));
  view.forEach((d,i)=>{const xx=x(i),up=d.close>=d.open,col=up?'#20c997':'#ff5f73';ctx.strokeStyle=col;ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(xx,y(d.high));ctx.lineTo(xx,y(d.low));ctx.stroke();const top=y(Math.max(d.open,d.close)),bot=y(Math.min(d.open,d.close));ctx.fillRect(xx-bw/2,top,bw,Math.max(1.5,bot-top))});
  let lx=18;ctx.font='bold 9px Inter,Arial';for(const o of overlays){drawSeries(emaValues(rows,o.period),start,view.length,x,y,o.color,1.45);ctx.fillStyle=o.color;ctx.fillRect(lx,11,12,2);ctx.fillText(o.label,lx+17,15);lx+=68}
  const last=view[view.length-1];ctx.strokeStyle='#26c9ff';ctx.setLineDash([4,4]);ctx.beginPath();ctx.moveTo(L,y(last.close));ctx.lineTo(L+W,y(last.close));ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#26c9ff';ctx.fillRect(L+W+4,y(last.close)-8,76,16);ctx.fillStyle='#04101f';ctx.font='bold 10px Inter,Arial';ctx.fillText(fmt(last.close),L+W+8,y(last.close)+3);
  ctx.strokeStyle='rgba(126,163,196,.16)';for(const yy of[volT-4,macdT-4,rsiT-4]){ctx.beginPath();ctx.moveTo(L,yy);ctx.lineTo(L+W,yy);ctx.stroke()}
  ctx.fillStyle='#6f8ca8';ctx.font='bold 9px Inter,Arial';ctx.fillText('VOL',L,volT+9);const maxVol=Math.max(...view.map(v=>+v.volume||0),1);view.forEach((d,i)=>{const vh=((+d.volume||0)/maxVol)*(volH-12);ctx.fillStyle=d.close>=d.open?'rgba(32,201,151,.46)':'rgba(255,95,115,.46)';ctx.fillRect(x(i)-bw/2,volT+volH-vh,bw,Math.max(1,vh))});ctx.fillStyle='#7894ad';ctx.fillText(compact(maxVol),L+W+8,volT+10);
  const m=macdValues(rows),hist=m.hist.slice(start,end),mAbs=Math.max(...hist.map(v=>Math.abs(v)),...m.macd.slice(start,end).map(v=>Math.abs(v)),...m.signal.slice(start,end).map(v=>Math.abs(v)),1e-9),mY=v=>macdT+macdH/2-(v/mAbs)*(macdH*.42);ctx.fillStyle='#6f8ca8';ctx.fillText('MACD 12 26 9',L,macdT+10);ctx.strokeStyle='rgba(126,163,196,.18)';ctx.beginPath();ctx.moveTo(L,mY(0));ctx.lineTo(L+W,mY(0));ctx.stroke();hist.forEach((v,i)=>{ctx.fillStyle=v>=0?'rgba(32,201,151,.48)':'rgba(255,95,115,.48)';const yy=mY(v),zero=mY(0);ctx.fillRect(x(i)-Math.max(1,bw*.35),Math.min(yy,zero),Math.max(2,bw*.7),Math.max(1,Math.abs(zero-yy)))});drawSeries(m.macd,start,view.length,x,mY,'#f5c84c',1.15);drawSeries(m.signal,start,view.length,x,mY,'#b978ff',1.15);
  const r=rsiValues(rows,14),rY=v=>rsiT+(100-v)/100*rsiH;ctx.fillStyle='#6f8ca8';ctx.fillText('RSI 14',L,rsiT+10);for(const level of[30,50,70]){ctx.strokeStyle=level===50?'rgba(126,163,196,.12)':'rgba(245,200,76,.18)';ctx.setLineDash(level===50?[]:[3,3]);ctx.beginPath();ctx.moveTo(L,rY(level));ctx.lineTo(L+W,rY(level));ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#6f8ca8';ctx.fillText(String(level),L+W+8,rY(level)+3)}drawSeries(r,start,view.length,x,rY,'#38bdf8',1.3);
  if(state.hover){const mx=clamp(state.hover.x,L,L+W),my=clamp(state.hover.y,mainT,mainT+mainH),idx=clamp(Math.floor((mx-L)/W*view.length),0,view.length-1),d=view[idx],gi=start+idx,cross=hi-(my-mainT)/mainH*(hi-lo);ctx.strokeStyle='rgba(181,207,230,.72)';ctx.setLineDash([3,3]);ctx.beginPath();ctx.moveTo(mx,mainT);ctx.lineTo(mx,rsiT+rsiH);ctx.moveTo(L,my);ctx.lineTo(L+W,my);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#b5cfe6';ctx.fillRect(L+W+4,my-8,76,16);ctx.fillStyle='#04101f';ctx.fillText(fmt(cross),L+W+8,my+3);const e=overlays.map(o=>o.label+' '+fmt(emaValues(rows,o.period)[gi])).join(' · '),rv=r[gi];tip.innerHTML='<b>'+currentMarket.symbol+'</b><span>'+new Date(d.time*1000).toLocaleString()+'</span><span>O '+fmt(d.open)+' · H '+fmt(d.high)+' · L '+fmt(d.low)+' · C '+fmt(d.close)+'</span><span>'+e+'</span><span>VOL '+compact(d.volume||0)+' · MACD '+fmt(m.macd[gi])+' / '+fmt(m.signal[gi])+' · RSI '+(Number.isFinite(rv)?rv.toFixed(1):'—')+'</span>';tip.style.left=Math.min(mx+14,w-300)+'px';tip.style.top='36px';tip.classList.add('show')}else tip.classList.remove('show');
}
canvas.addEventListener('wheel',e=>{e.preventDefault();const rows=normalized(),old=state.visible,f=e.deltaY>0?1.12:.88;state.visible=Math.max(20,Math.min(rows.length,Math.round(old*f)));state.offset=Math.min(state.offset,Math.max(0,rows.length-state.visible));draw()},{passive:false});
canvas.addEventListener('mousemove',e=>{const r=canvas.getBoundingClientRect();state.hover={x:e.clientX-r.left,y:e.clientY-r.top};if(state.drag){const dx=e.clientX-state.lastX,step=Math.round(dx/(r.width/Math.max(20,state.visible)));if(step){const rows=normalized();state.offset=clamp(state.offset+step,0,Math.max(0,rows.length-state.visible));state.lastX=e.clientX}}draw()});
canvas.addEventListener('mouseleave',()=>{state.hover=null;state.drag=false;canvas.classList.remove('dragging');draw()});
canvas.addEventListener('mousedown',e=>{state.drag=true;state.lastX=e.clientX;canvas.classList.add('dragging')});
window.addEventListener('mouseup',()=>{state.drag=false;canvas.classList.remove('dragging')});
canvas.addEventListener('dblclick',()=>{const rows=normalized();state.offset=0;state.visible=Math.min(rows.length,specs[chartTimeframe]?.count||120);draw()});
document.querySelectorAll('.timeframes button').forEach(btn=>btn.addEventListener('click',()=>{state.offset=0;const rows=normalized();state.visible=Math.min(rows.length,specs[btn.textContent.trim()]?.count||120);setTimeout(draw,30)}));
window.addEventListener('resize',draw);
const ro=new ResizeObserver(draw);ro.observe(stage);
drawChart=draw;
setTimeout(draw,50);
})();
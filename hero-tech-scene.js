// Decorative market environment. Content and numeric panels remain HTML above it.
(()=>{
  const canvas=document.querySelector('.tech-scene-canvas');if(!canvas)return;
  const ctx=canvas.getContext('2d');if(!ctx)return;
  const hero=canvas.parentElement;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rand=i=>{const n=Math.sin(i*127.1+78.233)*43758.5453;return n-Math.floor(n)};
  const candles=Array.from({length:43},(_,i)=>({x:i/42,y:.53+(rand(i+6)-.5)*.22,up:rand(i+37)>.43,size:8+rand(i+15)*29}));
  const stars=Array.from({length:88},(_,i)=>({x:.4+rand(i+83)*.59,y:.12+rand(i+134)*.74,r:.4+rand(i+195)*1.2,a:.2+rand(i+252)*.65}));
  let w=0,h=0,dpr=1,frame=0;
  function resize(){const r=hero.getBoundingClientRect();dpr=Math.min(devicePixelRatio||1,2);w=r.width;h=r.height;canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0)}
  const line=(x1,y1,x2,y2,color,width)=>{ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke()};
  function ellipse(x,y,rx,ry,color,width,blur=0){ctx.save();ctx.shadowBlur=blur;ctx.shadowColor=color;ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.ellipse(x,y,rx,ry,-.07,0,Math.PI*2);ctx.stroke();ctx.restore()}
  function draw(time){
    if(!w||Math.abs(hero.clientWidth-w)>2||Math.abs(hero.clientHeight-h)>2)resize();
    const t=reduced?0:time*.001;
    ctx.clearRect(0,0,w,h);
    const right=w*.73;
    // Low city silhouettes and tiny lit windows add depth behind the market.
    for(let i=0;i<75;i++){
      const x=w*(.46+i*.008),height=(22+rand(i+19)*132)*(x/w>.57?1:.5);
      const y=h*.78-height;
      ctx.fillStyle=`rgba(9,83,172,${.035+rand(i+33)*.11})`;
      ctx.fillRect(x,y,4+rand(i+7)*8,height);
      if(i%3===0){ctx.fillStyle=`rgba(31,162,250,${.11+rand(i+61)*.26})`;for(let j=0;j<height/11;j+=2)ctx.fillRect(x+2,y+j*10,1.3,2.2)}
    }
    // Translucent candlesticks continue behind the floating panels and the logo.
    candles.forEach((c,i)=>{
      const x=w*(.48+i*.0123),pulse=Math.sin(t*.85+i*.61)*3;
      const y=h*c.y+pulse,body=c.size,wick=body+15+rand(i+21)*18;
      const color=c.up?'rgba(35,202,255,.68)':'rgba(159,120,255,.53)';
      line(x,y-wick/2,x,y+wick/2,color,1.2);
      ctx.fillStyle=color;ctx.shadowColor=c.up?'#12baff':'#8568ff';ctx.shadowBlur=13;
      ctx.fillRect(x-3.3,y+(c.up?-body:0),6.6,body);ctx.shadowBlur=0;
    });
    stars.forEach((s,i)=>{const shimmer=.75+.25*Math.sin(t*1.4+i);ctx.fillStyle=`rgba(55,205,255,${s.a*shimmer})`;ctx.shadowColor='#1dbdff';ctx.shadowBlur=5;ctx.beginPath();ctx.arc(w*s.x,h*s.y,s.r,0,Math.PI*2);ctx.fill()});ctx.shadowBlur=0;
    // Multiple orbit paths move independently through the scene.
    ctx.save();ctx.setLineDash([90,28,12,34]);ctx.lineDashOffset=-t*27;
    ellipse(right,h*.73,w*.27,h*.115,'rgba(20,184,255,.56)',1.2,14);
    ctx.setLineDash([34,54]);ctx.lineDashOffset=t*18;
    ellipse(right,h*.71,w*.32,h*.14,'rgba(65,143,255,.24)',1,4);
    ctx.restore();
    // Illuminated stacked platform and mirrored floor streaks.
    const py=h*.84,rx=w*.235;
    const base=ctx.createLinearGradient(0,py-28,0,py+58);
    base.addColorStop(0,'rgba(19,90,225,.16)');base.addColorStop(.45,'rgba(8,36,100,.48)');base.addColorStop(1,'rgba(1,8,33,.06)');
    ctx.fillStyle=base;ctx.beginPath();ctx.ellipse(right,py+17,rx,42,0,0,Math.PI*2);ctx.fill();
    ellipse(right,py-8,rx,28,'rgba(33,212,255,.66)',2.5,18);
    ellipse(right,py+14,rx*.96,30,'rgba(18,102,255,.44)',2,11);
    ellipse(right,py-10,rx*.72,14,'rgba(45,230,255,.3)',1.4,14);
    for(let i=0;i<25;i++){
      const x=w*(.05+i*.043),y=h*(.84+rand(i+500)*.15);
      const a=.06+rand(i+520)*.23;
      line(x,y,x+24+rand(i+540)*48,y-2,`rgba(19,145,255,${a})`,.7);
    }
    // Soft localized reflection, kept away from body copy.
    const glow=ctx.createRadialGradient(right,py+52,5,right,py+52,w*.3);
    glow.addColorStop(0,'rgba(5,126,255,.23)');glow.addColorStop(1,'rgba(5,126,255,0)');
    ctx.fillStyle=glow;ctx.fillRect(w*.36,h*.72,w*.64,h*.28);
    if(!reduced)frame=requestAnimationFrame(draw);
  }
  resize();frame=requestAnimationFrame(draw);
  window.addEventListener('resize',resize,{passive:true});
  window.addEventListener('beforeunload',()=>cancelAnimationFrame(frame),{once:true});
})();

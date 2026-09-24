(()=> {
  const hero=document.querySelector('.tech-visual');
  if(!hero) return;
  const stack=hero.querySelector('.tech-logo-stack');
  const layers=[...hero.querySelectorAll('.tech-logo-layer.depth')];
  const back=hero.querySelector('.tech-logo-layer.back');

  const totalDepth=54;
  const step=totalDepth/Math.max(1,layers.length);
  layers.forEach((el,i)=> {
    const z=-(i+1)*step;
    el.style.transform=`translateZ(${z.toFixed(2)}px)`;
    const t=i/Math.max(1,layers.length-1);
    const brightness=(.72-.30*t).toFixed(3);
    const saturation=(1.95-.25*t).toFixed(2);
    el.style.filter=`brightness(${brightness}) contrast(1.22) saturate(${saturation}) hue-rotate(-3deg)`;
    el.style.opacity=String(.98);
    el.style.zIndex=String(80-i);
  });
  if(back){
    back.style.transform=`translateZ(-${(totalDepth+1).toFixed(1)}px) rotateY(180deg)`;
    back.style.zIndex='40';
  }

  let tx=0,ty=0,cx=0,cy=0,raf=0;
  const paint=()=>{
    cx+=(tx-cx)*.08; cy+=(ty-cy)*.08;
    hero.style.setProperty('--hero-tilt-x',cx.toFixed(2));
    hero.style.setProperty('--hero-tilt-y',cy.toFixed(2));
    raf=requestAnimationFrame(paint);
  };
  if(matchMedia('(pointer:fine)').matches){
    hero.addEventListener('pointermove',e=>{
      const r=hero.getBoundingClientRect();
      tx=((e.clientX-r.left)/r.width-.5)*6;
      ty=-((e.clientY-r.top)/r.height-.5)*4;
    });
    hero.addEventListener('pointerleave',()=>{tx=0;ty=0});
    raf=requestAnimationFrame(paint);
  }
  window.addEventListener('beforeunload',()=>raf&&cancelAnimationFrame(raf),{once:true});
})();
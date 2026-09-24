(()=> {
  const hero=document.querySelector('.tech-visual');
  if(!hero) return;
  const layers=[...hero.querySelectorAll('.tech-logo-layer.depth')];
  layers.forEach((el,i)=> {
    const z=-(i+1)*3.2;
    const x=(i+1)*0.45;
    el.style.transform=`translate3d(${x}px,0,${z}px)`;
    el.style.opacity=String(Math.max(.22,.82-i*.045));
    el.style.zIndex=String(30-i);
  });

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
      tx=((e.clientX-r.left)/r.width-.5)*7;
      ty=-((e.clientY-r.top)/r.height-.5)*5;
    });
    hero.addEventListener('pointerleave',()=>{tx=0;ty=0});
    raf=requestAnimationFrame(paint);
  }
  window.addEventListener('beforeunload',()=>raf&&cancelAnimationFrame(raf),{once:true});
})();
// Orthographic animated Earth built from Natural Earth vector land coordinates.
(()=>{
  const host=document.querySelector('.tech-globe'),rings=window.DAPPS_LAND;
  if(!host||!rings)return;
  const canvas=document.createElement('canvas');canvas.className='tech-earth-canvas';canvas.setAttribute('aria-hidden','true');
  host.appendChild(canvas);const ctx=canvas.getContext('2d');if(!ctx)return;
  const box=rings.map(r=>({ring:r,minX:Math.min(...r.map(p=>p[0])),maxX:Math.max(...r.map(p=>p[0])),minY:Math.min(...r.map(p=>p[1])),maxY:Math.max(...r.map(p=>p[1]))}));
  function inside(x,y,r){let hit=false;for(let i=0,j=r.length-1;i<r.length;j=i++){
    const a=r[i],b=r[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])hit=!hit;
  }return hit}
  const dots=[];
  for(let lat=-80;lat<=80;lat+=3.5)for(let lon=-180;lon<180;lon+=3.5){
    if(box.some(b=>lon>=b.minX&&lon<=b.maxX&&lat>=b.minY&&lat<=b.maxY&&inside(lon,lat,b.ring)))dots.push([lon,lat]);
  }
  let size=0,ratio=1,last=0,raf=0;const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rad=Math.PI/180;
  function project(lon,lat,center,R){const l=(lon-center)*rad,p=lat*rad,visible=Math.cos(p)*Math.cos(l);
    return [R+R*Math.cos(p)*Math.sin(l),R-R*Math.sin(p),visible]}
  function curve(points,center,R,color,width){ctx.beginPath();let opened=false;
    for(const [lon,lat] of points){const [x,y,v]=project(lon,lat,center,R);if(v>.015){if(!opened)ctx.moveTo(x,y);else ctx.lineTo(x,y);opened=true}else opened=false}
    ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke()}
  function render(time){
    if(!reduced&&time-last<36){raf=requestAnimationFrame(render);return}last=time;
    const s=host.clientWidth;if(s!==size){size=s;ratio=Math.min(devicePixelRatio||1,2);canvas.width=s*ratio;canvas.height=s*ratio;ctx.setTransform(ratio,0,0,ratio,0,0)}
    const R=s/2,center=reduced?-89:-89+time*.002;
    ctx.clearRect(0,0,s,s);
    ctx.save();ctx.beginPath();ctx.arc(R,R,R-2,0,Math.PI*2);ctx.clip();
    let ocean=ctx.createRadialGradient(R*.65,R*.56,8,R,R,R*1.55);
    ocean.addColorStop(0,'#1053af');ocean.addColorStop(.42,'#062b78');ocean.addColorStop(.8,'#031743');ocean.addColorStop(1,'#010d2b');
    ctx.fillStyle=ocean;ctx.fillRect(0,0,s,s);
    for(let lat=-60;lat<=60;lat+=30){const p=[];for(let lon=-180;lon<=180;lon+=3)p.push([lon,lat]);curve(p,center,R,'rgba(47,144,250,.13)',.8)}
    for(let lon=-180;lon<180;lon+=30){const p=[];for(let lat=-86;lat<=86;lat+=3)p.push([lon,lat]);curve(p,center,R,'rgba(47,144,250,.1)',.7)}
    ctx.shadowColor='#25a9ff';ctx.shadowBlur=5;
    rings.forEach(r=>curve(r,center,R,'rgba(68,175,255,.53)',1.15));ctx.shadowBlur=0;
    dots.forEach(([lon,lat],i)=>{const [x,y,v]=project(lon,lat,center,R);if(v<=0)return;
      ctx.fillStyle=`rgba(80,199,255,${(.26+.62*v).toFixed(2)})`;
      const z=1.1+v*.7;ctx.fillRect(x,y,z,z);
      if(i%53===0){ctx.fillStyle=`rgba(157,233,255,${(.32+.45*v).toFixed(2)})`;ctx.fillRect(x-1,y-1,3,3)}
    });
    const shade=ctx.createLinearGradient(R*.2,0,s,0);
    shade.addColorStop(0,'rgba(19,136,255,.12)');shade.addColorStop(.48,'transparent');shade.addColorStop(1,'rgba(0,4,29,.83)');
    ctx.fillStyle=shade;ctx.fillRect(0,0,s,s);
    const highlight=ctx.createRadialGradient(R*.6,R*.42,0,R*.65,R*.4,R*.8);
    highlight.addColorStop(0,'rgba(108,207,255,.21)');highlight.addColorStop(1,'rgba(39,143,255,0)');ctx.fillStyle=highlight;ctx.fillRect(0,0,s,s);
    ctx.restore();
    ctx.save();ctx.strokeStyle='rgba(49,184,255,.65)';ctx.lineWidth=2;ctx.shadowColor='#148dff';ctx.shadowBlur=20;ctx.beginPath();ctx.arc(R,R,R-3,0,Math.PI*2);ctx.stroke();ctx.restore();
    canvas.classList.add('ready');if(!reduced)raf=requestAnimationFrame(render);
  }
  raf=requestAnimationFrame(render);
  window.addEventListener('beforeunload',()=>cancelAnimationFrame(raf),{once:true});
})();

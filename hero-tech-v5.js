// The DP mark is a textured front and back with actual polygon side walls.
// The silhouette comes from the two main paths in the original brand SVG.
(()=>{
  const hero=document.querySelector('.tech-visual');
  const canvas=hero?.querySelector('.tech-logo-canvas');
  if(!canvas)return;
  const gl=null; // Canvas 2D avoids inconsistent SVG texture uploads in WebGL browsers.
  if(!gl){
    // Canvas 2D renderer for devices where WebGL is disabled. It projects the
    // same extruded contours, so the logo still turns with visible side walls.
    const ctx=canvas.getContext('2d');if(!ctx)return;
    const img=new Image();
    const imageReady=new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject});
    img.src='dp-logo-user.svg';
    Promise.all([imageReady,fetch('dp-logo-user.svg').then(r=>r.text())]).then(([,markup])=>{
      const faceTexture=document.createElement('canvas');faceTexture.width=540;faceTexture.height=453;
      const faceCtx=faceTexture.getContext('2d');faceCtx.drawImage(img,0,0,540,453);
      faceCtx.globalCompositeOperation='source-atop';
      const sheen=faceCtx.createLinearGradient(70,0,470,420);
      sheen.addColorStop(0,'rgba(108,228,255,.28)');sheen.addColorStop(.32,'rgba(0,132,255,0)');
      sheen.addColorStop(.66,'rgba(0,28,159,.13)');sheen.addColorStop(1,'rgba(3,8,81,.30)');
      faceCtx.fillStyle=sheen;faceCtx.fillRect(0,0,540,453);
      const doc=new DOMParser().parseFromString(markup,'image/svg+xml');
      const paths=[...doc.querySelectorAll('path')];
      const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
      const edges=[paths[0],paths[2]].map(source=>{
        const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',source.getAttribute('d'));svg.appendChild(path);
        const length=path.getTotalLength(),count=Math.ceil(length/2);
        return Array.from({length:count},(_,i)=>path.getPointAtLength(i*length/count));
      });
      const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
      let begin=0;
      function render(time){
        if(!begin)begin=time;
        const ratio=Math.min(devicePixelRatio||1,2),w=Math.round(canvas.clientWidth*ratio),h=Math.round(canvas.clientHeight*ratio);
        if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}
        ctx.clearRect(0,0,w,h);
        const mobile=matchMedia('(max-width: 720px)').matches;
        const a=reduced&&!mobile?-.46:-.46+(time-begin)*Math.PI*2/(mobile?10500:12000);
        const cs=Math.cos(a),sn=Math.sin(a),scale=Math.min(w/210,h/175),cx=w/2,cy=h/2;
        const point=(p,z)=>[cx+((p.x-90)*cs+z*sn)*scale,cy+(p.y-75.5)*scale];
        const face=z=>{
          ctx.save();ctx.translate(cx+z*sn*scale,cy);ctx.scale(cs*scale,scale);
          ctx.drawImage(faceTexture,-90,-75.5,180,151);ctx.restore();
        };
        const sides=[];
        edges.forEach(edge=>edge.forEach((p,i)=>{
          const q=edge[(i+1)%edge.length],dx=q.x-p.x,dy=q.y-p.y;
          const facing=-(dy/Math.hypot(dx,dy))*sn;
          if(facing<-.04)return;
          sides.push({p,q,z:-(p.x+q.x-180)*sn/2,light:Math.max(.18,.48+facing*.43)});
        }));
        const front=cs>=0;
        if(front){ctx.save();ctx.globalAlpha=.42;face(-25);ctx.restore()}else face(25);
        sides.sort((a,b)=>a.z-b.z).forEach(({p,q,light})=>{
          const a=point(p,25),b=point(q,25),c=point(q,-25),d=point(p,-25);
          ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.lineTo(...c);ctx.lineTo(...d);ctx.closePath();
          const t=(p.x+q.x)/360;
          ctx.fillStyle=`rgb(${Math.round((10+t*16)*light)},${Math.round((85+t*95)*light)},${Math.round((255-t*20)*light)})`;
          ctx.fill();
        });
        if(front){
          face(25);
          ctx.save();ctx.translate(cx+25*sn*scale,cy);ctx.scale(cs*scale,scale);
          ctx.lineWidth=1.15/scale;ctx.strokeStyle='rgba(112,231,255,.72)';
          ctx.shadowColor='#35caff';ctx.shadowBlur=5/scale;
          edges.forEach(edge=>{ctx.beginPath();edge.forEach((p,i)=>i?ctx.lineTo(p.x-90,p.y-75.5):ctx.moveTo(p.x-90,p.y-75.5));ctx.closePath();ctx.stroke()});
          ctx.restore();
        }else{ctx.save();ctx.globalAlpha=.68;face(-25);ctx.restore()}
        if(!canvas.classList.contains('ready'))canvas.classList.add('ready');
        if(!reduced||mobile)requestAnimationFrame(render);
      }
      requestAnimationFrame(render);
    }).catch(()=>{});
    return;
  }
  const vertex=`attribute vec3 aPosition; attribute vec3 aNormal; attribute vec2 aUV;
    uniform float uAngle; uniform float uTilt;
    varying vec3 vNormal; varying vec2 vUV; varying float vSide;
    void main(){
      float cy=cos(uAngle),sy=sin(uAngle),cx=cos(uTilt),sx=sin(uTilt);
      vec3 p=vec3(aPosition.x*cy+aPosition.z*sy,aPosition.y,-aPosition.x*sy+aPosition.z*cy);
      vec3 n=vec3(aNormal.x*cy+aNormal.z*sy,aNormal.y,-aNormal.x*sy+aNormal.z*cy);
      p=vec3(p.x,p.y*cx-p.z*sx,p.y*sx+p.z*cx);
      vNormal=vec3(n.x,n.y*cx-n.z*sx,n.y*sx+n.z*cx);
      vUV=aUV;vSide=abs(aNormal.z)<.5?1.0:0.0;
      float perspective=1.0-p.z/370.0;
      gl_Position=vec4(p.x/94.0,p.y/84.0,-p.z/260.0,perspective);
    }`;
  const fragment=`precision mediump float; varying vec3 vNormal;varying vec2 vUV;varying float vSide;
    uniform sampler2D uTexture;
    void main(){
      if(vSide<.5){vec4 c=texture2D(uTexture,vUV);if(c.a<.12)discard;
        float light=.78+.22*max(dot(normalize(vNormal),normalize(vec3(-.35,.55,1.0))),0.0);
        gl_FragColor=vec4(c.rgb*light,c.a);return;}
      vec3 n=normalize(vNormal);
      float light=.34+.62*max(dot(n,normalize(vec3(-.65,.5,1.0))),0.0);
      float rim=pow(max(dot(n,normalize(vec3(.25,.18,1.0))),0.0),9.0);
      vec3 cobalt=vec3(.018,.19,.78),cyan=vec3(.03,.74,.93);
      vec3 color=mix(cobalt,cyan,clamp(vUV.x*.75+.12,0.0,1.0));
      color=color*light+vec3(.12,.3,.38)*rim;
      gl_FragColor=vec4(color,1.0);
    }`;
  function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s}
  let program;
  try{program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))return}catch(e){console.warn('3D logo unavailable',e);return}
  gl.useProgram(program);
  const verts=[];const push=(x,y,z,nx,ny,nz,u,v)=>verts.push(x,y,z,nx,ny,nz,u,v);
  const tri=(a,b,c)=>{push(...a);push(...b);push(...c)};
  // Front and rear surfaces are cut out by the SVG texture's alpha channel.
  for(const z of [-19,19]){
    const nz=z>0?1:-1;
    const a=[-90,75.5,z,0,0,nz,0,0],b=[90,75.5,z,0,0,nz,1,0],c=[90,-75.5,z,0,0,nz,1,1],d=[-90,-75.5,z,0,0,nz,0,1];
    tri(a,b,c);tri(a,c,d);
  }
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  const contours=[
    'M9 19h113c30 0 49 20 49 47s-19 48-49 48H98l10-25h13c14 0 24-9 24-23 0-13-10-22-24-22H35L9 19Z',
    'M7 121 41 54c5-10 15-16 26-16h39c23 0 38 15 38 35 0 21-16 35-38 35H89l-17 34-28 9 35-68h26c8 0 13-4 13-10s-5-10-13-10H71c-5 0-9 3-11 7l-27 51H7Z'
  ];
  contours.forEach(d=>{
    const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',d);svg.appendChild(path);
    const length=path.getTotalLength(),count=Math.ceil(length/2);
    for(let i=0;i<count;i++){
      const p=path.getPointAtLength(length*i/count),q=path.getPointAtLength(length*(i+1)/count);
      const dx=q.x-p.x,dy=q.y-p.y,mag=Math.hypot(dx,dy)||1;
      const nx=dy/mag,ny=dx/mag;
      const a=[p.x-90,75.5-p.y,19,nx,ny,0,p.x/180,p.y/151];
      const b=[q.x-90,75.5-q.y,19,nx,ny,0,q.x/180,q.y/151];
      const c=[q.x-90,75.5-q.y,-19,nx,ny,0,q.x/180,q.y/151];
      const e=[p.x-90,75.5-p.y,-19,nx,ny,0,p.x/180,p.y/151];
      tri(a,b,c);tri(a,c,e);
    }
  });
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(verts),gl.STATIC_DRAW);
  const stride=32;[['aPosition',3,0],['aNormal',3,12],['aUV',2,24]].forEach(([name,size,offset])=>{const loc=gl.getAttribLocation(program,name);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,size,gl.FLOAT,false,stride,offset)});
  const image=new Image();image.src='dp-logo-user.svg';
  image.onload=()=>{
    const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
    gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
    const angle=gl.getUniformLocation(program,'uAngle'),tilt=gl.getUniformLocation(program,'uTilt');
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    canvas.classList.add('ready');
    let start=0,frame;
    function draw(time){
      const ratio=Math.min(devicePixelRatio||1,2),w=Math.round(canvas.clientWidth*ratio),h=Math.round(canvas.clientHeight*ratio);
      if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h)}
      gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
      if(!start)start=time;
      gl.uniform1f(angle,reduced?-.46:-.46+(time-start)*Math.PI*2/12000);
      gl.uniform1f(tilt,-.10);
      gl.drawArrays(gl.TRIANGLES,0,verts.length/8);
      if(!reduced)frame=requestAnimationFrame(draw);
    }
    frame=requestAnimationFrame(draw);
    window.addEventListener('beforeunload',()=>cancelAnimationFrame(frame),{once:true});
  };
})();

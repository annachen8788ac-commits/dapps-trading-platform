/* Rotate the two original logo pieces with a clean, contained bevel. */
(() => {
  const canvas = document.querySelector('.dp-logo-solid');
  const fallback = document.querySelector('.dp-hero-logo-exact');
  if (!canvas || !fallback) return;
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  const image = new Image();
  image.onload = () => {
    const side = document.createElement('canvas');
    side.width = 758; side.height = 620;
    const sideCtx = side.getContext('2d');
    sideCtx.drawImage(image, 0, 0, side.width, side.height);
    sideCtx.globalCompositeOperation = 'source-in';
    const gradient = sideCtx.createLinearGradient(0, 0, side.width, side.height * .24);
    gradient.addColorStop(0, '#053e9b');
    gradient.addColorStop(.48, '#087cc8');
    gradient.addColorStop(1, '#079dca');
    sideCtx.fillStyle = gradient;
    sideCtx.fillRect(0, 0, side.width, side.height);

    const sideLayer = document.createElement('canvas');
    const sideCtx2 = sideLayer.getContext('2d');
    const bevelLayer = document.createElement('canvas');
    const bevelCtx = bevelLayer.getContext('2d');
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let start;
    function draw(time) {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      const w = Math.round(canvas.clientWidth * dpr);
      const h = Math.round(canvas.clientHeight * dpr);
      if (!w || !h) { requestAnimationFrame(draw); return; }
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = sideLayer.width = bevelLayer.width = w;
        canvas.height = sideLayer.height = bevelLayer.height = h;
      }
      if (start === undefined) start = time;
      const angle = reducedMotion ? -.4 : -.4 + (time - start) * Math.PI * 2 / 14000;
      const c = Math.cos(angle), s = Math.sin(angle);
      const halfDepth = 20 * dpr;
      const faceZ = (c >= 0 ? halfDepth : -halfDepth) * s;
      ctx.clearRect(0, 0, w, h);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // The full 40px side is exposed as the logo turns edge-on.
      const sideOpacity = Math.max(0, Math.min(1, (.38 - Math.abs(c)) / .23));
      if (sideOpacity) {
        sideCtx2.clearRect(0, 0, w, h);
        for (let i = 0; i <= 64; i++) {
          const z = (c >= 0 ? -1 : 1) * halfDepth * (1 - i / 32);
          sideCtx2.setTransform(c, 0, 0, 1, w / 2 + z * s, h / 2);
          sideCtx2.drawImage(side, -w / 2, -h / 2, w, h);
        }
        sideCtx2.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = sideOpacity;
        ctx.drawImage(sideLayer, 0, 0);
        ctx.globalAlpha = 1;
      }

      // A shaded bevel stays within the face. Nothing sticks into its gaps.
      ctx.setTransform(c, 0, 0, 1, w / 2 + faceZ, h / 2);
      ctx.drawImage(image, -w / 2, -h / 2, w, h);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      bevelCtx.clearRect(0, 0, w, h);
      bevelCtx.setTransform(c, 0, 0, 1, w / 2 + faceZ, h / 2);
      bevelCtx.drawImage(side, -w / 2, -h / 2, w, h);
      bevelCtx.globalCompositeOperation = 'destination-out';
      bevelCtx.setTransform(c, 0, 0, 1,
        w / 2 + faceZ + (s >= 0 ? 1 : -1) * (5 + 9 * Math.abs(s)) * dpr, h / 2);
      bevelCtx.drawImage(image, -w / 2, -h / 2, w, h);
      bevelCtx.globalCompositeOperation = 'source-over';
      bevelCtx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = .42 * (1 - sideOpacity);
      ctx.drawImage(bevelLayer, 0, 0);
      ctx.globalAlpha = 1;

      if (!canvas.classList.contains('ready')) canvas.classList.add('ready');
      if (!reducedMotion) requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);
  };
  image.onerror = () => console.warn('Logo source unavailable');
  image.src = 'dp-logo-separated.svg?v=20260925-5';
})();

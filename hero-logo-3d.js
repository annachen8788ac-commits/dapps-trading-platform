/* A clean rotating extrusion from the two original vector silhouettes. */
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
    const gradient = sideCtx.createLinearGradient(0, 0, side.width, side.height * 0.24);
    gradient.addColorStop(0, '#053e9b');
    gradient.addColorStop(0.48, '#087cc8');
    gradient.addColorStop(1, '#079dca');
    sideCtx.fillStyle = gradient;
    sideCtx.fillRect(0, 0, side.width, side.height);
    const sideLayer = document.createElement('canvas');
    const sideLayerCtx = sideLayer.getContext('2d');

    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let start;
    function draw(time) {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      const w = Math.round(canvas.clientWidth * dpr);
      const h = Math.round(canvas.clientHeight * dpr);
      if (!w || !h) { requestAnimationFrame(draw); return; }
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w; canvas.height = h;
        sideLayer.width = w; sideLayer.height = h;
      }
      if (start === undefined) start = time;
      const angle = reducedMotion ? -0.4 : -0.4 + (time - start) * Math.PI * 2 / 14000;
      const c = Math.cos(angle), s = Math.sin(angle);
      const halfDepth = 20 * dpr;
      ctx.clearRect(0, 0, w, h);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // The side is visible only near edge-on. At front angles, offset copies
      // intrude into the logo's gaps and create the dark bumps seen before.
      const edgeVisibility = Math.max(0, Math.min(1, (0.48 - Math.abs(c)) / 0.30));
      if (edgeVisibility > 0) {
        sideLayerCtx.clearRect(0, 0, w, h);
        for (let i = 0; i <= 64; i++) {
          const z = (c >= 0 ? -1 : 1) * halfDepth * (1 - i / 32);
          sideLayerCtx.setTransform(c, 0, 0, 1, w / 2 + z * s, h / 2);
          sideLayerCtx.drawImage(side, -w / 2, -h / 2, w, h);
        }
        sideLayerCtx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = edgeVisibility;
        ctx.drawImage(sideLayer, 0, 0);
        ctx.globalAlpha = 1;
      }
      ctx.setTransform(c, 0, 0, 1, w / 2 + (c >= 0 ? halfDepth : -halfDepth) * s, h / 2);
      ctx.drawImage(image, -w / 2, -h / 2, w, h);
      ctx.setTransform(1, 0, 0, 1, 0, 0);

      if (!canvas.classList.contains('ready')) canvas.classList.add('ready');
      if (!reducedMotion) requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);
  };
  image.onerror = () => console.warn('Logo source unavailable');
  image.src = 'dp-logo-separated.svg?v=20260925-4';
})();

/* Extrude the two vector outlines as one rotating DP mark. */
(() => {
  const canvas = document.querySelector('.dp-logo-solid');
  const fallback = document.querySelector('.dp-hero-logo-exact');
  if (!canvas || !fallback) return;
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;
  const sourceUrl = 'dp-logo-separated.svg?v=20260925-7';
  const image = new Image();
  image.onload = async () => {
    let contours;
    try {
      const documentSVG = new DOMParser().parseFromString(await (await fetch(sourceUrl)).text(), 'image/svg+xml');
      contours = [...documentSVG.querySelectorAll('path')].map(path => {
        const points = [];
        const length = path.getTotalLength();
        const count = Math.ceil(length / 1.5);
        for (let i = 0; i < count; i++) {
          const p = path.getPointAtLength(i * length / count);
          points.push([p.x, p.y]);
        }
        const area = points.reduce((sum, p, i) => {
          const q = points[(i + 1) % points.length];
          return sum + p[0] * q[1] - q[0] * p[1];
        }, 0);
        return { points, orientation: Math.sign(area) || 1 };
      });
      if (contours.length !== 2 || contours.some(c => c.points.length < 3)) return;
    } catch (error) { console.warn('Logo contour unavailable', error); return; }

    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let start;
    function draw(time) {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      const w = Math.round(canvas.clientWidth * dpr);
      const h = Math.round(canvas.clientHeight * dpr);
      if (!w || !h) { requestAnimationFrame(draw); return; }
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w; canvas.height = h;
      }
      if (start === undefined) start = time;
      const angle = reducedMotion ? -.4 : -.4 + (time - start) * Math.PI * 2 / 14000;
      const c = Math.cos(angle), s = Math.sin(angle);
      const depth = 20 * dpr;
      ctx.clearRect(0, 0, w, h);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Only side facets facing the viewer are drawn. The face masks the rest.
      if (Math.abs(s) > .003) {
        ctx.beginPath();
        for (const contour of contours) {
          const pts = contour.points;
          for (let i = 0; i < pts.length; i++) {
            const p = pts[i], q = pts[(i + 1) % pts.length];
            const dx = q[0] - p[0], dy = q[1] - p[1];
            if (-contour.orientation * dy * s <= 0 || dx * dx + dy * dy < .001) continue;
            const px = w / 2 + (p[0] / 379 - .5) * w * c;
            const qx = w / 2 + (q[0] / 379 - .5) * w * c;
            const py = p[1] / 310 * h, qy = q[1] / 310 * h;
            ctx.moveTo(px - depth * s, py);
            ctx.lineTo(qx - depth * s, qy);
            ctx.lineTo(qx + depth * s, qy);
            ctx.lineTo(px + depth * s, py);
            ctx.closePath();
          }
        }
        const sideColor = ctx.createLinearGradient(w * .18, 0, w * .92, h);
        sideColor.addColorStop(0, '#064293');
        sideColor.addColorStop(.55, '#075fb0');
        sideColor.addColorStop(1, '#087fae');
        ctx.fillStyle = sideColor;
        ctx.fill();
      }

      const faceZ = (c >= 0 ? depth : -depth) * s;
      ctx.setTransform(c, 0, 0, 1, w / 2 + faceZ, h / 2);
      ctx.drawImage(image, -w / 2, -h / 2, w, h);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (!canvas.classList.contains('ready')) canvas.classList.add('ready');
      if (!reducedMotion) requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);
  };
  image.onerror = () => console.warn('Logo source unavailable');
  image.src = sourceUrl;
})();

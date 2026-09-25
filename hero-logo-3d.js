/* A single extruded solid, traced from the same transparent face used as its texture. */
(() => {
  const canvas = document.querySelector('.dp-logo-solid');
  const fallback = document.querySelector('.dp-hero-logo-exact');
  if (!canvas || !fallback) return;
  const gl = canvas.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: false });
  if (!gl) return;

  const vertexSource = `
    attribute vec3 position; attribute vec3 normal; attribute vec2 uv;
    uniform float angle; uniform vec2 viewport;
    varying vec3 surfaceNormal; varying vec2 texCoord; varying float side;
    void main() {
      float c = cos(angle), s = sin(angle);
      vec3 p = vec3(position.x*c + position.z*s, position.y, -position.x*s + position.z*c);
      surfaceNormal = normalize(vec3(normal.x*c + normal.z*s, normal.y, -normal.x*s + normal.z*c));
      texCoord = uv; side = 1.0 - abs(normal.z);
      float ratio = viewport.x / viewport.y;
      gl_Position = vec4(p.x / (91.0*ratio), p.y / 91.0, p.z / 250.0, 1.0 - p.z / 480.0);
    }`;
  const fragmentSource = `
    precision highp float;
    varying vec3 surfaceNormal; varying vec2 texCoord; varying float side;
    uniform sampler2D face;
    void main() {
      vec3 n = normalize(surfaceNormal);
      vec3 lightDir = normalize(vec3(-0.48, 0.68, 0.66));
      if (side < 0.5) {
        vec4 color = texture2D(face, texCoord);
        if (color.a < 0.07) discard;
        float light = 0.83 + 0.17 * max(dot(n, lightDir), 0.0);
        gl_FragColor = vec4(color.rgb * light, color.a);
      } else {
        float light = 0.40 + 0.55 * max(dot(n, lightDir), 0.0);
        vec3 cobalt = vec3(0.025, 0.31, 0.94);
        vec3 cyan = vec3(0.045, 0.78, 0.93);
        vec3 color = mix(cobalt, cyan, clamp(texCoord.x * 0.9, 0.0, 1.0));
        gl_FragColor = vec4(color * light, 1.0);
      }
    }`;
  function compile(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source); gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
    return shader;
  }
  let program;
  try {
    program = gl.createProgram();
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexSource));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentSource));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  } catch (error) { console.warn('Logo 3D renderer unavailable', error); return; }

  const source = new Image();
  source.onload = () => {
    // Rasterize the SVG once at high resolution. The alpha boundary supplies
    // the outside and the holes, so internal strokes never get extra walls.
    const textureCanvas = document.createElement('canvas');
    textureCanvas.width = 1024; textureCanvas.height = 860;
    const textureContext = textureCanvas.getContext('2d', { willReadFrequently: true });
    textureContext.drawImage(source, 0, 0, 1024, 860);
    const maskCanvas = document.createElement('canvas');
    const width = 720, height = 604;
    maskCanvas.width = width; maskCanvas.height = height;
    const maskContext = maskCanvas.getContext('2d', { willReadFrequently: true });
    maskContext.drawImage(source, 0, 0, width, height);
    const rgba = maskContext.getImageData(0, 0, width, height).data;
    const solid = new Uint8Array(width * height);
    for (let i = 0; i < solid.length; i++) solid[i] = rgba[i * 4 + 3] >= 128 ? 1 : 0;
    const isSolid = (x, y) => x >= 0 && y >= 0 && x < width && y < height && solid[y * width + x];
    const boundary = new Map();
    const key = (x, y) => y * (width + 1) + x;
    const edge = (x, y, a, b) => boundary.set(key(x, y), [a, b]);
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      if (!isSolid(x, y)) continue;
      if (!isSolid(x, y - 1)) edge(x, y, x + 1, y);
      if (!isSolid(x + 1, y)) edge(x + 1, y, x + 1, y + 1);
      if (!isSolid(x, y + 1)) edge(x + 1, y + 1, x, y + 1);
      if (!isSolid(x - 1, y)) edge(x, y + 1, x, y);
    }
    const contours = [];
    while (boundary.size) {
      const first = boundary.keys().next().value, loop = [];
      let current = first;
      do {
        const next = boundary.get(current);
        if (!next) break;
        boundary.delete(current);
        loop.push([current % (width + 1), Math.floor(current / (width + 1))]);
        current = key(next[0], next[1]);
      } while (current !== first && loop.length < width * height);
      if (loop.length > 12) contours.push(loop);
    }
    const vertices = [];
    const push = (x, y, z, nx, ny, nz, u, v) => vertices.push(x, y, z, nx, ny, nz, u, v);
    const quad = (a, b, c, d) => { vertices.push(...a, ...b, ...c, ...a, ...c, ...d); };
    const depth = 12;
    for (const z of [-depth, depth]) {
      const n = z > 0 ? 1 : -1;
      quad([-90, -75.5, z, 0, 0, n, 0, 0], [90, -75.5, z, 0, 0, n, 1, 0],
           [90, 75.5, z, 0, 0, n, 1, 1], [-90, 75.5, z, 0, 0, n, 0, 1]);
    }
    function simplify(points, tolerance) {
      if (points.length < 3) return points;
      const first = points[0], last = points[points.length - 1];
      const dx = last[0] - first[0], dy = last[1] - first[1], distance = dx * dx + dy * dy;
      let farthest = -1, index = 0;
      for (let i = 1; i < points.length - 1; i++) {
        const p = points[i];
        const t = distance ? Math.max(0, Math.min(1, ((p[0] - first[0]) * dx + (p[1] - first[1]) * dy) / distance)) : 0;
        const error = Math.hypot(p[0] - first[0] - t * dx, p[1] - first[1] - t * dy);
        if (error > farthest) { farthest = error; index = i; }
      }
      if (farthest <= tolerance) return [first, last];
      return [...simplify(points.slice(0, index + 1), tolerance).slice(0, -1), ...simplify(points.slice(index), tolerance)];
    }
    for (const contour of contours) {
      // Smooth the pixel trace before extrusion; all holes remain in the same mask.
      let split = 0, greatest = -1;
      for (let i = 1; i < contour.length; i++) {
        const distance = Math.hypot(contour[i][0] - contour[0][0], contour[i][1] - contour[0][1]);
        if (distance > greatest) { greatest = distance; split = i; }
      }
      const corners = [
        ...simplify(contour.slice(0, split + 1), 1.6).slice(0, -1),
        ...simplify([...contour.slice(split), contour[0]], 1.6).slice(0, -1)
      ];
      for (let i = 0; i < corners.length; i++) {
        const p = corners[i], q = corners[(i + 1) % corners.length];
        const dx = q[0] - p[0], dy = q[1] - p[1], length = Math.hypot(dx, dy);
        if (!length) continue;
        const nx = dy / length, ny = dx / length;
        const a = (v, z) => [(v[0] / 4) - 90, 75.5 - (v[1] / 4), z, nx, ny, 0, v[0] / width, 1 - v[1] / height];
        quad(a(p, depth - 0.15), a(q, depth - 0.15), a(q, -depth + 0.15), a(p, -depth + 0.15));
      }
    }
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    gl.useProgram(program);
    for (const [name, count, offset] of [['position', 3, 0], ['normal', 3, 12], ['uv', 2, 24]]) {
      const location = gl.getAttribLocation(program, name);
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, count, gl.FLOAT, false, 32, offset);
    }
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textureCanvas);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    const angleUniform = gl.getUniformLocation(program, 'angle');
    const viewportUniform = gl.getUniformLocation(program, 'viewport');
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let start;
    function draw(time) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr);
      if (!w || !h) { requestAnimationFrame(draw); return; }
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h);
      }
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      if (start === undefined) start = time;
      gl.uniform2f(viewportUniform, w, h);
      gl.uniform1f(angleUniform, reducedMotion ? -0.35 : -0.35 + (time - start) * Math.PI * 2 / 14000);
      gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 8);
      if (!canvas.classList.contains('ready')) canvas.classList.add('ready');
      if (!reducedMotion) requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);
  };
  source.onerror = () => console.warn('Logo face unavailable');
  source.src = 'dp-logo-3d-face.svg?v=20260925-1';
})();

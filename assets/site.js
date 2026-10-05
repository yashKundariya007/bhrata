/* BHRATA — shared behaviour for the inner pages:
   hero globe (three.js), mobile menu, scroll reveal, enquiry forms. */
(function () {
  "use strict";

  // ---------- mobile menu ----------
  const nav = document.querySelector(".nav");
  document.querySelectorAll("[data-menu]").forEach((b) =>
    b.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      document.body.style.overflow = open ? "hidden" : "";
    })
  );

  // ---------- reveal on scroll ----------
  const io = "IntersectionObserver" in window
    ? new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { rootMargin: "0px 0px -10% 0px" })
    : null;
  document.querySelectorAll(".reveal").forEach((el) => (io ? io.observe(el) : el.classList.add("in")));

  // ---------- enquiry forms (not connected to email yet) ----------
  document.querySelectorAll("form[data-enquiry]").forEach((f) =>
    f.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!f.reportValidity()) return;
      const msg = f.querySelector(".form-msg");
      if (msg) msg.textContent = "Thank you — this form isn't connected to email yet, so nothing was sent. Please use the contact details on this page for now.";
    })
  );

  // ---------- hero globe ----------
  const host = document.querySelector("[data-globe]");
  if (!host) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const s = document.createElement("script");
  s.src = "https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js";
  s.onload = () => { try { globe(host, reduce); } catch (e) { /* page still works without the globe */ } };
  document.head.appendChild(s);

  function globe(el, still) {
    const T = window.THREE;
    const R = 5;
    const PORTS = [
      [22.82, 70.84], [18.95, 72.95], [11.60, 43.14], [-4.06, 39.67], [-6.82, 39.29], [-25.97, 32.57], [-29.87, 31.03],
      [-33.91, 18.43], [-8.80, 13.23], [6.44, 3.39], [6.35, 2.43], [5.63, 0.02], [5.29, -4.01], [14.68, -17.43],
    ];
    const ARCS = [[0, 3], [0, 4], [0, 2], [0, 6], [1, 3], [1, 5], [0, 9], [0, 11], [6, 7], [7, 8], [9, 12], [11, 13]];
    const ll = (lat, lon, r) => {
      const D = Math.PI / 180, ph = (90 - lat) * D, th = (lon + 180) * D;
      return new T.Vector3(-r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph), r * Math.sin(ph) * Math.sin(th));
    };

    const renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.appendChild(renderer.domElement);
    const scene = new T.Scene();
    const cam = new T.PerspectiveCamera(35, 1, 0.1, 100);
    const g = new T.Group();
    scene.add(g);

    // dotted sphere
    const N = 5200, pos = [];
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), t = i * 2.399963;
      pos.push(Math.cos(t) * r * R, y * R, Math.sin(t) * r * R);
    }
    const dg = new T.BufferGeometry();
    dg.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
    g.add(new T.Points(dg, new T.PointsMaterial({ color: 0xa9b1c4, size: 0.075, transparent: true, opacity: 0.75 })));

    // dark core so the back of the globe is hidden
    g.add(new T.Mesh(new T.SphereGeometry(R * 0.995, 64, 64), new T.MeshBasicMaterial({ color: 0x07090d })));

    // atmosphere: orange on top, blue underneath (like the homepage globe)
    const atm = new T.Mesh(
      new T.SphereGeometry(R * 1.18, 64, 64),
      new T.ShaderMaterial({
        side: T.BackSide, transparent: true, depthWrite: false, blending: T.AdditiveBlending,
        uniforms: { cA: { value: new T.Color(0xff6a2c) }, cB: { value: new T.Color(0x3a5bff) } },
        vertexShader: "varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
        fragmentShader: "uniform vec3 cA; uniform vec3 cB; varying vec3 vN; void main(){ float i = pow(max(0.0, 0.72 - dot(vN, vec3(0.0, 0.0, 1.0))), 2.6); vec3 c = mix(cB, cA, smoothstep(-0.4, 0.5, vN.y)); gl_FragColor = vec4(c * i * 1.3, i); }",
      })
    );
    scene.add(atm);

    // ports + routes
    const nodeM = new T.MeshBasicMaterial({ color: 0xff563c });
    PORTS.forEach(([la, lo], i) => {
      const m = new T.Mesh(new T.SphereGeometry(i === 0 ? 0.11 : 0.07, 12, 10), nodeM);
      m.position.copy(ll(la, lo, R * 1.01));
      g.add(m);
    });
    const arcM = new T.LineBasicMaterial({ color: 0xff7a52, transparent: true, opacity: 0.85 });
    ARCS.forEach(([a, b]) => {
      const va = ll(PORTS[a][0], PORTS[a][1], 1), vb = ll(PORTS[b][0], PORTS[b][1], 1), ang = va.angleTo(vb), pts = [];
      for (let j = 0; j <= 64; j++) {
        const t = j / 64;
        const v = va.clone().multiplyScalar(Math.sin((1 - t) * ang)).add(vb.clone().multiplyScalar(Math.sin(t * ang))).divideScalar(Math.sin(ang));
        pts.push(v.normalize().multiplyScalar(R * (1.01 + Math.sin(t * Math.PI) * ang * 0.28)));
      }
      g.add(new T.Line(new T.BufferGeometry().setFromPoints(pts), arcM));
    });

    // face India / East Africa
    const f = ll(4, 46, 1);
    const baseY = -Math.atan2(f.x, f.z);
    g.rotation.x = 0.1;

    const size = () => {
      const w = el.clientWidth, h = el.clientHeight;
      renderer.setSize(w, h, false);
      cam.aspect = w / h;
      const wide = w > 860;
      cam.position.set(0, 0, wide ? 24 : 34);
      cam.setViewOffset(w, h, wide ? -w * 0.24 : 0, wide ? h * 0.04 : h * 0.14, w, h);
      cam.updateProjectionMatrix();
    };
    size();
    window.addEventListener("resize", size);

    let visible = true;
    if ("IntersectionObserver" in window) new IntersectionObserver((es) => (visible = es[0].isIntersecting)).observe(el);
    const t0 = performance.now();
    const loop = (now) => {
      if (visible) {
        const t = (now - t0) / 1000;
        g.rotation.y = baseY + (still ? 0 : Math.sin(t * 0.12) * 0.35);
        renderer.render(scene, cam);
      }
      if (!still) requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
})();

export function initBackground() {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let width, height;

  const SPACING = 50;
  const MOUSE_RADIUS = 150;
  const dots = [];
  let mouseX = 0, mouseY = 0;

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }

  function initDots() {
    dots.length = 0;
    for (let x = 0; x < width; x += SPACING) {
      for (let y = 0; y < height; y += SPACING) {
        dots.push({ baseX: x, baseY: y });
      }
    }
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    for (const dot of dots) {
      const dx = mouseX - dot.baseX;
      const dy = mouseY - dot.baseY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      let size = 1;
      let alpha = 0.12;

      if (dist < MOUSE_RADIUS) {
        const force = 1 - dist / MOUSE_RADIUS;
        size = 1 + force * 3;
        alpha = 0.12 + force * 0.5;
      }

      ctx.beginPath();
      ctx.arc(dot.baseX, dot.baseY, size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(74, 108, 247, ${alpha})`;
      ctx.fill();
    }
    requestAnimationFrame(draw);
  }

  resize();
  initDots();
  window.addEventListener('resize', () => { resize(); initDots(); });
  document.addEventListener('mousemove', e => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  draw();
}

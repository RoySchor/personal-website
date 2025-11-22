// src/loader.js
export function createMatrixLoader(canvasId = 'loader') {
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext('2d', { alpha: false });

  const glyphs = '01𐄷Ξπϟ9中日仮名ｱｲｳｴｵﾊﾐﾑﾒﾓｶｷｸｹｺ';
  const fontSize = 18;
  let columns = 0;
  let drops = [];
  let raf = 0;

  function size() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    columns = Math.floor(canvas.width / fontSize);
    drops = new Array(columns).fill(1);
  }

  function draw() {
    ctx.fillStyle = 'rgba(0,0,0,0.08)'; // trail fade
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#00ff88'; // matrix green
    ctx.font = `${fontSize}px monospace`;

    for (let i = 0; i < drops.length; i++) {
      const char = glyphs[Math.floor(Math.random() * glyphs.length)];
      const x = i * fontSize;
      const y = drops[i] * fontSize;

      ctx.fillText(char, x, y);

      if (y > canvas.height && Math.random() > 0.975) drops[i] = 0;
      drops[i]++;
    }
  }

  function loop() {
    draw();
    raf = window.requestAnimationFrame(loop);
  }

  function start() {
    size();
    loop();
    window.addEventListener('resize', size);
  }

  function stop() {
    window.cancelAnimationFrame(raf);
    canvas.classList.add('hide');
    setTimeout(() => canvas.remove(), 450);
    window.removeEventListener('resize', size);
  }

  return { start, stop, canvas };
}

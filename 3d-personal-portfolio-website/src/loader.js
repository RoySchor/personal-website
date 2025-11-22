export function createMatrixLoader(canvasId = 'loader') {
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext('2d', { alpha: false });

  const glyphs = '01𐄷Ξπϟ9中日仮ｱｲｳｴｵﾊﾐﾑﾒﾓｶｷｸｹｺשדלעץפצףהמא';
  const fontSize = 18;
  let columns = 0;
  let drops = [];
  let raf = 0;

  let progress = 0;
  let DPR = 1;
  let CW = 0;
  let CH = 0;

  function size() {
    DPR = Math.max(1, window.devicePixelRatio || 1);
    // Let CSS fill the box set by `inset:0`
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    // Backing store in device pixels
    CW = window.innerWidth;
    CH = window.innerHeight;
    canvas.width  = Math.round(CW * DPR);
    canvas.height = Math.round(CH * DPR);
    // Draw in CSS pixels again
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    columns = Math.ceil(CW / fontSize);
    drops = new Array(columns).fill(1);
  }

  function drawMatrix() {
    // translucent black for trails
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    ctx.fillRect(0, 0, CW, CH);

    ctx.fillStyle = '#00ff88';
    ctx.font = `${fontSize}px monospace`;

    for (let i = 0; i < drops.length; i++) {
      const char = glyphs[Math.floor(Math.random() * glyphs.length)];
      const x = i * fontSize;
      const y = drops[i] * fontSize;

      ctx.fillText(char, x, y);

      if (y > CH && Math.random() > 0.975) drops[i] = 0;
      drops[i]++;
    }
  }

  function drawProgress() {
    const pct = Math.max(0, Math.min(1, progress));
    const pctText = `${Math.round(pct * 100)}%`;

    // Box geometry
    const W = Math.min(CW, CH);
    const boxWidth = Math.max(260, Math.floor(W * 0.45));
    const boxHeight = 28;
    const boxX = Math.floor((CW - boxWidth) / 2);
    const boxY = Math.floor(CH / 2 + 24);
    const radius = 8;

    // Label (percent) above the box
    ctx.font = '700 22px Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = '#FFE58A'; // warm yellow
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = 8;
    ctx.fillText(pctText, CW / 2, boxY - 10);
    ctx.shadowBlur = 0;

    // Box background (subtle dark panel)
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    roundedRect(ctx, boxX, boxY, boxWidth, boxHeight, radius, true, false);

    ctx.lineWidth = 2;
    ctx.strokeStyle = '#FFD766';
    roundedRect(ctx, boxX, boxY, boxWidth, boxHeight, radius, false, true);

    // Fill based on progress
    const fillW = Math.floor(boxWidth * pct);
    if (fillW > 0) {
      const grd = ctx.createLinearGradient(boxX, 0, boxX + boxWidth, 0);
      grd.addColorStop(0, '#FFF1B8');
      grd.addColorStop(1, '#FFD766');
      ctx.fillStyle = grd;
      roundedRect(ctx, boxX, boxY, fillW, boxHeight, radius, true, false);
    }
  }

  function roundedRect(ctx, x, y, w, h, r, fill, stroke) {
    const rr = Math.min(r, h / 2, w / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }

  function loop() {
    drawMatrix();
    drawProgress(); // overlay on top of the rain
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

  // allow external progress updates (0..1)
  function setProgress(p) {
    progress = Number.isFinite(p) ? Math.max(0, Math.min(1, p)) : 0;
  }

  return { start, stop, setProgress, canvas };
}

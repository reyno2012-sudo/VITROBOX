// Drawing adapted from the user-supplied haloflux-loader.html.
export function createHalofluxArtwork(root: HTMLElement) {
  let loaderActive = true;
  let loaderCollapsing = false;
  let collapseProgress = 0;
  let labMouseX = window.innerWidth * .45;
  let labMouseY = window.innerHeight * .45;
  let smoothMouseX = labMouseX;
  let smoothMouseY = labMouseY;
  let drumAngle = 0;
  let labFrameCount = 0;
  let frameId = 0;
  let dragPanX = 0;
  const haloCanvas = root.querySelector<HTMLCanvasElement>('#halofluxStageCanvas')!;
  const haloCtx = haloCanvas.getContext('2d');
  const floatingFormulaBox = root.querySelector<HTMLElement>('#floatingFormulaBox');
  const formulaFreqReadout = root.querySelector<HTMLElement>('#formulaFreqReadout');
  const miniParticleCtx = root.querySelector<HTMLCanvasElement>('#labMiniParticleCanvas')?.getContext('2d');
  const miniScopeCtx = root.querySelector<HTMLCanvasElement>('#labMiniScopeCanvas')?.getContext('2d');
  const miniMatrixCtx = root.querySelector<HTMLCanvasElement>('#labMiniMatrixCanvas')?.getContext('2d');
  const miniFieldCtx = root.querySelector<HTMLCanvasElement>('#labMiniFieldCanvas')?.getContext('2d');
  function resize() {
    if (!haloCanvas.parentElement || !loaderActive) return;
    haloCanvas.width = Math.max(640, haloCanvas.parentElement.clientWidth);
    haloCanvas.height = Math.max(360, haloCanvas.parentElement.clientHeight);
  }
      const acousticRays = Array.from({ length: 380 }, () => ({
        x1: Math.random() * 1400 - 300,
        y1: Math.random() * 1100 - 150,
        angle: Math.random() * Math.PI * 2,
        angVel: (Math.random() - 0.5) * 0.018,
        len: 500 + Math.random() * 1300,
        alpha: 0.05 + Math.random() * 0.18,
        tint: Math.random() > 0.86 ? (Math.random() > 0.5 ? '#f472b6' : '#a5b4fc') : '#ffffff'
      }));

      const webNodes = Array.from({ length: 42 }, () => ({
        x: Math.random() * 900,
        y: Math.random() * 700,
        vx: (Math.random() - 0.5) * 4.2,
        vy: (Math.random() - 0.5) * 4.2,
        r: 2 + Math.random() * 4.5
      }));

      // 2. 左侧 14 组高速游走平行梳状折线束 (Swarming Comb Ribbons)
      const ribbonSwarms = Array.from({ length: 14 }, (_, idx) => ({
        x: Math.random() * 700 + 40,
        y: Math.random() * 520 + 40,
        vx: (Math.random() - 0.5) * 6.5,
        vy: (Math.random() - 0.5) * 5.5,
        count: 8 + Math.floor(Math.random() * 9),
        spread: 3.2 + Math.random() * 2.2,
        angle1: Math.random() * Math.PI * 2,
        angle2: Math.random() * Math.PI * 2,
        rotSpeed1: (Math.random() - 0.5) * 0.09,
        rotSpeed2: (Math.random() - 0.5) * 0.09,
        len1: 45 + Math.random() * 95,
        len2: 45 + Math.random() * 95,
        tint: idx % 4 === 0 ? '#c7d2fe' : '#ffffff'
      }));

      // 3. 右侧 170 道超高速水平脉冲射流光束
      const horizontalJets = Array.from({ length: 170 }, () => ({
        x: Math.random() * 1400,
        yRatio: Math.random(),
        len: 90 + Math.random() * 420,
        thickness: Math.random() > 0.78 ? (3.5 + Math.random() * 9) : (0.8 + Math.random() * 2.2),
        speed: 22 + Math.random() * 58,
        alpha: 0.25 + Math.random() * 0.75,
        tint: Math.random() > 0.72 ? (Math.random() > 0.4 ? '#c7d2fe' : '#e9d5ff') : '#ffffff'
      }));

      function renderHalofluxLoader() {
        if (!loaderActive || !haloCtx) return;
        frameId = requestAnimationFrame(renderHalofluxLoader);
        labFrameCount++;

        const W = haloCanvas.width;
        const H = haloCanvas.height;

        smoothMouseX += (labMouseX - smoothMouseX) * 0.11;
        smoothMouseY += (labMouseY - smoothMouseY) * 0.11;
        const normMX = (smoothMouseX / Math.max(1, W)) - 0.5;
        const normMY = (smoothMouseY / Math.max(1, H)) - 0.5;

        if (floatingFormulaBox && labFrameCount % 3 === 0) {
          floatingFormulaBox.style.transform = `translate3d(${-normMX * 180}px, ${-normMY * 65}px, 0)`;
          if (formulaFreqReadout) {
            formulaFreqReadout.textContent = `${(384 + Math.sin(labFrameCount * 0.15) * 1.8).toFixed(1)} kHz`;
          }
        }

        haloCtx.fillStyle = '#08090c';
        haloCtx.fillRect(0, 0, W, H);

        drumAngle += loaderCollapsing ? 0.085 : 0.015;
        if (loaderCollapsing) {
          collapseProgress = Math.min(1, collapseProgress + 0.045);
        }

        const panShiftX = -normMX * W * 0.38 + dragPanX;
        const panShiftY = -normMY * H * 0.12;
        const outerR = Math.max(480, Math.max(W, H) * 1.28);
        const drumBandWidth = Math.min(235, outerR - 80);
        const innerR = Math.max(80, outerR - drumBandWidth);
        const drumCenterX = W * 0.44 + outerR - drumBandWidth * 0.5 + panShiftX;
        const drumCenterY = H * 0.48 + panShiftY;

        const getDrumEdgeX = (y: number, radius: number) => {
          const dy = y - drumCenterY;
          if (Math.abs(dy) >= radius) return W * 0.42 + panShiftX;
          return drumCenterX - Math.sqrt(radius * radius - dy * dy);
        };

        const targetTLX = W * 0.28;
        const targetTLY = H * 0.34;
        const pull = loaderCollapsing ? collapseProgress : 0;

        // A. 绘制左侧射线网 + 游走节点 + 14 组平行折线簇
        haloCtx.save();
        acousticRays.forEach((ray) => {
          ray.angle += ray.angVel;
          const sx = (ray.x1 + panShiftX * 0.45) * (1 - pull) + targetTLX * pull;
          const sy = (ray.y1 + panShiftY * 0.45) * (1 - pull) + targetTLY * pull;
          const ex = sx + Math.cos(ray.angle) * ray.len * (1 - pull * 0.85);
          const ey = sy + Math.sin(ray.angle) * ray.len * (1 - pull * 0.85);

          haloCtx.beginPath();
          haloCtx.moveTo(sx, sy);
          haloCtx.lineTo(ex, ey);
          haloCtx.strokeStyle = ray.tint;
          haloCtx.globalAlpha = ray.alpha;
          haloCtx.lineWidth = 0.75;
          haloCtx.stroke();
        });

        webNodes.forEach(node => {
          node.x += node.vx;
          node.y += node.vy;
          const limitX = getDrumEdgeX(node.y, innerR) - 20;
          if (node.x < 10) { node.x = 10; node.vx *= -1; }
          if (node.x > limitX) { node.x = Math.max(20, limitX); node.vx *= -1; }
          if (node.y < 10 || node.y > H - 10) node.vy *= -1;

          haloCtx.beginPath();
          haloCtx.arc(node.x, node.y, node.r, 0, Math.PI * 2);
          haloCtx.strokeStyle = 'rgba(255,255,255,0.45)';
          haloCtx.lineWidth = 1;
          haloCtx.stroke();
        });

        ribbonSwarms.forEach((b) => {
          b.x += b.vx * (1 + Math.abs(normMX) * 1.6);
          b.y += b.vy * (1 + Math.abs(normMY) * 1.6);
          b.angle1 += b.rotSpeed1;
          b.angle2 += b.rotSpeed2;

          const maxLeftX = getDrumEdgeX(b.y, innerR) - 45;
          if (b.x < 30) { b.x = 30; b.vx *= -1; }
          if (b.x > maxLeftX) { b.x = Math.max(40, maxLeftX); b.vx *= -1; }
          if (b.y < 30) { b.y = 30; b.vy *= -1; }
          if (b.y > H - 30) { b.y = H - 30; b.vy *= -1; }

          const drawX = b.x * (1 - pull) + targetTLX * pull;
          const drawY = b.y * (1 - pull) + targetTLY * pull;

          for (let i = 0; i < b.count; i++) {
            const offset = (i - b.count / 2) * b.spread;
            const perpX = -Math.sin(b.angle1) * offset;
            const perpY = Math.cos(b.angle1) * offset;

            const x0 = drawX + perpX + Math.cos(b.angle1) * b.len1;
            const y0 = drawY + perpY + Math.sin(b.angle1) * b.len1;
            const xMid = drawX + perpX * 0.55;
            const yMid = drawY + perpY * 0.55;
            const x1 = drawX + perpX + Math.cos(b.angle2) * b.len2;
            const y1 = drawY + perpY + Math.sin(b.angle2) * b.len2;

            haloCtx.beginPath();
            haloCtx.moveTo(x0, y0);
            haloCtx.lineTo(xMid, yMid);
            haloCtx.lineTo(x1, y1);
            haloCtx.strokeStyle = b.tint;
            haloCtx.globalAlpha = 0.85;
            haloCtx.lineWidth = 1.85;
            haloCtx.stroke();
          }
        });
        haloCtx.restore();

        // B. 绘制右侧超高速水平扫描底纹 + 170 道水平脉冲射流光束
        haloCtx.save();
        for (let y = 0; y < H; y += 3) {
          const startX = getDrumEdgeX(y, outerR);
          if (startX < W) {
            const waveLum = Math.sin(y * 0.045 - drumAngle * 14 + Math.sin(y * 0.012) * 4);
            const alpha = waveLum > 0.2 ? 0.14 + waveLum * 0.22 : 0.04;
            haloCtx.fillStyle = `rgba(215, 225, 245, ${alpha})`;
            haloCtx.fillRect(startX, y, W - startX, 1.3);
          }
        }

        horizontalJets.forEach(jet => {
          const y = jet.yRatio * H;
          const originX = getDrumEdgeX(y, outerR);
          jet.x += jet.speed * (loaderCollapsing ? 2.4 : 1);

          if (originX + jet.x > W + 200) {
            jet.x = -jet.len * 0.4;
            jet.yRatio = Math.random();
          }

          const drawStartX = Math.max(originX, originX + jet.x);
          const drawEndX = originX + jet.x + jet.len;

          if (drawEndX > originX && drawStartX < W) {
            const grad = haloCtx.createLinearGradient(drawStartX, y, drawEndX, y);
            grad.addColorStop(0, 'rgba(255,255,255,0)');
            grad.addColorStop(0.25, jet.tint);
            grad.addColorStop(0.85, '#ffffff');
            grad.addColorStop(1, 'rgba(255,255,255,0)');

            haloCtx.fillStyle = grad;
            haloCtx.globalAlpha = jet.alpha;
            haloCtx.fillRect(drawStartX, y - jet.thickness * 0.5, drawEndX - drawStartX, jet.thickness);
          }
        });
        haloCtx.restore();

        // C. 绘制中间巨型弧形声学胶片转鼓与 18 仓频谱数据块
        haloCtx.save();
        haloCtx.beginPath();
        haloCtx.arc(drumCenterX, drumCenterY, outerR, Math.PI - 0.65, Math.PI + 0.65);
        haloCtx.arc(drumCenterX, drumCenterY, innerR, Math.PI + 0.65, Math.PI - 0.65, true);
        haloCtx.closePath();
        haloCtx.fillStyle = '#07080a';
        haloCtx.fill();
        haloCtx.lineWidth = 2.5;
        haloCtx.strokeStyle = 'rgba(255,255,255,0.45)';
        haloCtx.stroke();

        const totalTicks = 320;
        for (let t = 0; t < totalTicks; t++) {
          const ang = Math.PI + ((t / totalTicks) - 0.5) * 1.15 + (drumAngle * 0.25) % (1.15 / totalTicks * 5);
          const cosA = Math.cos(ang);
          const sinA = Math.sin(ang);
          const isMajor = t % 5 === 0;

          haloCtx.beginPath();
          haloCtx.moveTo(drumCenterX + cosA * (innerR - (isMajor ? 14 : 7)), drumCenterY + sinA * (innerR - (isMajor ? 14 : 7)));
          haloCtx.lineTo(drumCenterX + cosA * (innerR + 3), drumCenterY + sinA * (innerR + 3));
          haloCtx.strokeStyle = isMajor ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.32)';
          haloCtx.lineWidth = isMajor ? 2.2 : 1;
          haloCtx.stroke();

          haloCtx.beginPath();
          haloCtx.moveTo(drumCenterX + cosA * (outerR - 4), drumCenterY + sinA * (outerR - 4));
          haloCtx.lineTo(drumCenterX + cosA * (outerR + (isMajor ? 16 : 8)), drumCenterY + sinA * (outerR + (isMajor ? 16 : 8)));
          haloCtx.stroke();
        }

        const panelCount = 18;
        for (let p = 0; p < panelCount; p++) {
          const rawOffset = ((p / panelCount) - (drumAngle * 0.16) % 1 + 1) % 1;
          const pAngle = Math.PI - 0.52 + rawOffset * 1.04;
          const midR = (innerR + outerR) * 0.5;
          const px = drumCenterX + Math.cos(pAngle) * midR;
          const py = drumCenterY + Math.sin(pAngle) * midR;

          if (py > -120 && py < H + 120) {
            haloCtx.save();
            haloCtx.translate(px, py);
            haloCtx.rotate(pAngle + Math.PI);

            const pw = drumBandWidth - 26;
            const ph = 118;
            haloCtx.strokeStyle = 'rgba(255,255,255,0.22)';
            haloCtx.lineWidth = 1;
            haloCtx.strokeRect(-pw / 2, -ph / 2, pw, ph);

            haloCtx.fillStyle = '#ffffff';
            haloCtx.font = 'bold 8.5px monospace';
            const titles = [
              'SOLVER/04  PAPER 97  11.5L',
              'STEP 1204  JAY_CHOU_WAV',
              'LBM DIAG   WOOFER_TL_38%',
              'FIG.3      ACOUSTIC_CAVITY',
              'CODE FIELD VITROBOX_DAC',
              'HARMONIC   STAY_UP_NIGHT'
            ];
            haloCtx.fillText(titles[p % titles.length], -pw / 2 + 6, -ph / 2 + 12);

            haloCtx.fillStyle = 'rgba(255,255,255,0.2)';
            haloCtx.fillRect(-pw / 2 + 6, -ph / 2 + 17, pw - 12, 2);
            haloCtx.fillStyle = p % 2 === 0 ? '#a3e635' : '#38bdf8';
            haloCtx.fillRect(-pw / 2 + 6, -ph / 2 + 17, ((pw - 12) * (0.4 + 0.5 * Math.abs(Math.sin(drumAngle * 3 + p)))), 2);

            for (let wLine = 0; wLine < 2; wLine++) {
              haloCtx.beginPath();
              for (let wx = -pw / 2 + 6; wx < pw / 2 - 6; wx += 3) {
                const wy = -12 + wLine * 14 + Math.sin(wx * 0.22 + drumAngle * 18 + p + wLine) * (5 + Math.sin(drumAngle * 7) * 3);
                if (wx === -pw / 2 + 6) haloCtx.moveTo(wx, wy);
                else haloCtx.lineTo(wx, wy);
              }
              haloCtx.strokeStyle = wLine === 0 ? 'rgba(255,255,255,0.9)' : '#c084fc';
              haloCtx.lineWidth = 1.1;
              haloCtx.stroke();
            }

            const cols = 38;
            const rows = 5;
            const cellW = (pw - 14) / cols;
            for (let r = 0; r < rows; r++) {
              for (let c = 0; c < cols; c++) {
                const noise = Math.sin(c * 0.9 + r * 1.7 + drumAngle * 12 + p);
                if (noise > -0.2) {
                  haloCtx.fillStyle = (c + r) % 9 === 0 ? '#f472b6' : (p % 2 === 0 ? 'rgba(190, 242, 100, 0.85)' : 'rgba(165, 180, 252, 0.85)');
                  haloCtx.fillRect(-pw / 2 + 7 + c * cellW, 14 + r * 7, cellW - 1.2, 4.8);
                }
              }
            }
            haloCtx.restore();
          }
        }
        haloCtx.restore();

        // D. 底部 8 宫格实时遥测更新
        if (miniParticleCtx) {
          miniParticleCtx.fillStyle = 'rgba(8, 9, 12, 0.3)';
          miniParticleCtx.fillRect(0, 0, 280, 72);
          for (let i = 0; i < 65; i++) {
            const px = (i * 29 + drumAngle * 260) % 280;
            const py = 36 + Math.sin(i * 1.7 + drumAngle * 11) * 28;
            miniParticleCtx.fillStyle = i % 6 === 0 ? '#38bdf8' : '#e5e7eb';
            miniParticleCtx.fillRect(px, py, 1.8, 1.8);
          }
        }

        if (miniScopeCtx) {
          miniScopeCtx.clearRect(0, 0, 280, 78);
          [16, 40, 64].forEach((baseY, sIdx) => {
            miniScopeCtx.beginPath();
            for (let x = 0; x < 280; x += 3) {
              const burst = (sIdx === 2 && ((x + Math.floor(drumAngle * 120)) % 90 < 24))
                ? Math.sin(x * 2.4 + drumAngle * 55) * 11
                : 0;
              const y = baseY + Math.sin(x * 0.06 + drumAngle * (8 + sIdx * 4)) * 4.5 + burst;
              if (x === 0) miniScopeCtx.moveTo(x, y);
              else miniScopeCtx.lineTo(x, y);
            }
            miniScopeCtx.strokeStyle = sIdx === 0 ? '#ffffff' : (sIdx === 1 ? 'rgba(255,255,255,0.65)' : '#f472b6');
            miniScopeCtx.lineWidth = 1.15;
            miniScopeCtx.stroke();
          });
        }

        if (miniMatrixCtx) {
          miniMatrixCtx.clearRect(0, 0, 280, 78);
          const cols = 22, rows = 8, cw = 280 / cols, ch = 78 / rows;
          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
              const v = Math.sin(c * 0.7 + r * 1.1 + drumAngle * 14);
              if (c === 10 || v > 0.62) {
                miniMatrixCtx.fillStyle = v > 0.82 ? '#ffffff' : '#f472b6';
              } else if (v > 0.1) {
                miniMatrixCtx.fillStyle = 'rgba(244, 114, 182, 0.42)';
              } else {
                miniMatrixCtx.fillStyle = 'rgba(255, 255, 255, 0.12)';
              }
              miniMatrixCtx.fillRect(c * cw + 1, r * ch + 1, cw - 1.8, ch - 1.8);
            }
          }
        }

        if (miniFieldCtx) {
          miniFieldCtx.clearRect(0, 0, 280, 78);
          for (let gx = 0; gx < 28; gx++) {
            for (let gy = 0; gy < 4; gy++) {
              const lum = Math.abs(Math.sin(gx * 0.3 + gy * 0.6 - drumAngle * 10));
              miniFieldCtx.fillStyle = (gx > 20 && gy === 2)
                ? `rgba(244, 114, 182, ${lum})`
                : `rgba(255, 255, 255, ${lum * 0.55})`;
              miniFieldCtx.fillRect(gx * 10, gy * 10, 8.5, 8.5);
            }
          }
          for (let c = 0; c < 28; c++) {
            const h = Math.abs(Math.sin(c * 0.45 + drumAngle * 12)) * 26 + 3;
            miniFieldCtx.fillStyle = c > 17 ? '#f472b6' : 'rgba(255,255,255,0.7)';
            miniFieldCtx.fillRect(c * 10, 76 - h, 7.5, h);
          }
        }
      }

  const observer = new ResizeObserver(resize);
  observer.observe(haloCanvas.parentElement!);
  resize();
  renderHalofluxLoader();
  return {
    move(clientX: number, clientY: number) {
      const bounds = haloCanvas.getBoundingClientRect();
      labMouseX = (clientX - bounds.left) * haloCanvas.width / Math.max(1, bounds.width);
      labMouseY = (clientY - bounds.top) * haloCanvas.height / Math.max(1, bounds.height);
    },
    drag(deltaX: number) { dragPanX = Math.max(-haloCanvas.width * .65, Math.min(haloCanvas.width * .65, dragPanX + deltaX * 1.2)); },
    collapse() { loaderCollapsing = true; },
    stop() { loaderActive = false; cancelAnimationFrame(frameId); },
    reset() {
      cancelAnimationFrame(frameId);
      loaderActive = true;
      loaderCollapsing = false;
      collapseProgress = 0;
      resize();
      renderHalofluxLoader();
    },
    dispose() { loaderActive = false; cancelAnimationFrame(frameId); observer.disconnect(); },
  };
}

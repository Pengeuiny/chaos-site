"use client";

import { useEffect, useRef } from "react";

type Beam = {
  color: [number, number, number];
  baseX: number; // fraction of width
  swaySpeed: number;
  swayAmount: number; // fraction of width
  halfAngle: number; // radians
  intensity: number;
  particles: { t: number; s: number; speed: number; phase: number }[];
};

const BEAMS: Beam[] = [
  {
    color: [255, 199, 89], // amber
    baseX: 0.3,
    swaySpeed: 0.22 * 0.7,
    swayAmount: 0.05,
    halfAngle: 0.24,
    intensity: 1,
    particles: [],
  },
  {
    color: [77, 140, 255], // blue
    baseX: 0.72,
    swaySpeed: 0.22 * 0.8,
    swayAmount: 0.05,
    halfAngle: 0.24,
    intensity: 0.9,
    particles: [],
  },
];

for (const b of BEAMS) {
  for (let i = 0; i < 26; i++) {
    b.particles.push({
      t: Math.random(),
      s: Math.random() * 2 - 1,
      speed: 0.05 + Math.random() * 0.1,
      phase: Math.random() * Math.PI * 2,
    });
  }
}

/**
 * Persistent spotlight background — canvas2D, no GL context required.
 * Falls back to the CSS gradient (#stage-fallback) only when the visitor
 * prefers reduced motion.
 */
export default function Stage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const reduce = matchMedia("(prefers-reduced-motion:reduce)").matches;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx || reduce) {
      canvas.style.display = "none";
      return;
    }

    let mouse = [0.5, 0.5];
    const onMove = (e: PointerEvent) => {
      mouse = [e.clientX / innerWidth, e.clientY / innerHeight];
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    let w = 0;
    let h = 0;
    let dpr = 1;
    const resize = () => {
      dpr = Math.min(devicePixelRatio || 1, 1.75);
      w = innerWidth;
      h = innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    addEventListener("resize", resize);
    resize();

    const drawBeam = (t: number, beam: Beam) => {
      const sway = Math.sin(t * beam.swaySpeed) * beam.swayAmount;
      const srcX = (beam.baseX + sway + (mouse[0] - 0.5) * 0.08) * w;
      const srcY = -h * 0.08;
      const dirX = Math.sin(t * beam.swaySpeed * 3) * 0.12;
      const dirY = 1;
      const dirLen = Math.hypot(dirX, dirY);
      const angle = Math.atan2(dirX, dirY); // measured from +y (down)
      const far = h * 1.7;
      const [r, g, b] = beam.color;

      const layers: [number, number][] = [
        [beam.halfAngle * 1.7, 0.05],
        [beam.halfAngle * 1.15, 0.09],
        [beam.halfAngle * 0.55, 0.16],
      ];
      for (const [halfAngle, alpha] of layers) {
        const leftAngle = angle - halfAngle;
        const rightAngle = angle + halfAngle;
        const lx = srcX + Math.sin(leftAngle) * far;
        const ly = srcY + Math.cos(leftAngle) * far;
        const rx = srcX + Math.sin(rightAngle) * far;
        const ry = srcY + Math.cos(rightAngle) * far;
        const cx = srcX + (dirX / dirLen) * far;
        const cy = srcY + (dirY / dirLen) * far;

        const grad = ctx.createLinearGradient(srcX, srcY, cx, cy);
        grad.addColorStop(0, `rgba(${r},${g},${b},${alpha * beam.intensity})`);
        grad.addColorStop(1, `rgba(${r},${g},${b},0)`);

        ctx.beginPath();
        ctx.moveTo(srcX, srcY);
        ctx.lineTo(lx, ly);
        ctx.lineTo(rx, ry);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();
      }

      // dust sparkle drifting down the beam
      for (const p of beam.particles) {
        const along = (p.t + t * p.speed) % 1;
        const spread = p.s * beam.halfAngle * 0.85 * along;
        const ang = angle + spread;
        const dist = along * far;
        const px = srcX + Math.sin(ang) * dist;
        const py = srcY + Math.cos(ang) * dist;
        const twinkle = (Math.sin(t * 2 + p.phase) + 1) / 2;
        const a = (1 - along) * 0.35 * twinkle * beam.intensity;
        if (a <= 0.01) continue;
        ctx.beginPath();
        ctx.arc(px, py, 1.6, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,240,215,${a})`;
        ctx.fill();
      }
    };

    const start = performance.now();
    let raf = 0;
    const loop = (now: number) => {
      const t = (now - start) / 1000;

      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, "rgb(9,18,36)");
      bg.addColorStop(1, "rgb(2,4,9)");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      ctx.globalCompositeOperation = "lighter";
      for (const beam of BEAMS) drawBeam(t, beam);

      ctx.globalCompositeOperation = "source-over";
      const vignette = ctx.createRadialGradient(
        w / 2,
        h * 0.45,
        0,
        w / 2,
        h * 0.45,
        Math.hypot(w, h) * 0.65,
      );
      vignette.addColorStop(0, "rgba(0,0,0,0)");
      vignette.addColorStop(1, "rgba(0,0,0,0.55)");
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, w, h);

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      removeEventListener("resize", resize);
    };
  }, []);

  return (
    <>
      <div id="stage-fallback" />
      <canvas id="stage" ref={canvasRef} />
      <div className="grain" />
    </>
  );
}

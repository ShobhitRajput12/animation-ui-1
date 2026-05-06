"use client";

import { useEffect, useRef } from "react";

type OrbitalLine = {
  color: string;
  opacity: number;
  points: number;
  radiusX: number;
  radiusY: number;
  wobble: number;
  turns: number;
  phase: number;
  rotation: number;
  speed: number;
  thickness: number;
};

type Star = {
  x: number;
  y: number;
  radius: number;
  alpha: number;
};

function createLines(): OrbitalLine[] {
  return Array.from({ length: 16 }, (_, index) => {
    const ratio = index / 16;

    return {
      color: ratio < 0.66 ? "#fff7df" : ratio < 0.82 ? "#9cefff" : "#b68cff",
      opacity: 0.22 + ratio * 0.1,
      points: 240,
      radiusX: 220 + Math.sin(index * 0.65) * 18,
      radiusY: 140 + Math.cos(index * 0.45) * 20,
      wobble: 18 + ratio * 12,
      turns: 7 + (index % 4),
      phase: ratio * Math.PI * 1.2,
      rotation: ratio * Math.PI * 0.9,
      speed: 0.38 + ratio * 0.26,
      thickness: 0.6 + (index % 3) * 0.35
    };
  });
}

function createStars(total: number): Star[] {
  return Array.from({ length: total }, () => ({
    x: Math.random(),
    y: Math.random(),
    radius: Math.random() * 1.6 + 0.25,
    alpha: Math.random() * 0.4 + 0.1
  }));
}

export function OrbitalScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    const lines = createLines();
    const stars = createStars(180);
    const pointer = { x: 0, y: 0, targetX: 0, targetY: 0, active: false };
    let width = 0;
    let height = 0;
    let centerX = 0;
    let centerY = 0;
    let maxRadius = 0;
    let animationFrame = 0;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      centerX = width / 2;
      centerY = height / 2;
      maxRadius = Math.min(width, height) * 0.34;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const handlePointerMove = (event: PointerEvent) => {
      pointer.targetX = event.clientX;
      pointer.targetY = event.clientY;
      pointer.active = true;
    };

    const handlePointerLeave = () => {
      pointer.active = false;
    };

    const drawBackground = (time: number) => {
      context.clearRect(0, 0, width, height);

      const baseGradient = context.createLinearGradient(0, 0, 0, height);
      baseGradient.addColorStop(0, "#020511");
      baseGradient.addColorStop(0.55, "#030711");
      baseGradient.addColorStop(1, "#010203");
      context.fillStyle = baseGradient;
      context.fillRect(0, 0, width, height);

      const glow = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, maxRadius * 1.2);
      glow.addColorStop(0, "rgba(150, 196, 255, 0.22)");
      glow.addColorStop(0.38, "rgba(84, 126, 188, 0.14)");
      glow.addColorStop(1, "rgba(0, 0, 0, 0)");
      context.fillStyle = glow;
      context.fillRect(0, 0, width, height);

      context.strokeStyle = "rgba(188, 218, 255, 0.08)";
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(centerX, 0);
      context.lineTo(centerX, height);
      context.moveTo(0, centerY);
      context.lineTo(width, centerY);
      context.stroke();

      const ringPulse = 1 + Math.sin(time * 0.55) * 0.02;
      [0.58, 0.76].forEach((scale, index) => {
        context.beginPath();
        context.strokeStyle = index === 0 ? "rgba(165, 209, 255, 0.12)" : "rgba(130, 152, 228, 0.1)";
        context.lineWidth = 1;
        context.arc(centerX, centerY, maxRadius * scale * ringPulse, 0, Math.PI * 2);
        context.stroke();
      });
    };

    const drawStars = (time: number) => {
      for (const star of stars) {
        const x = star.x * width;
        const y = star.y * height;
        const alpha = star.alpha + Math.sin(time * 0.5 + star.x * 12 + star.y * 6) * 0.08;
        context.beginPath();
        context.fillStyle = `rgba(166, 200, 255, ${Math.max(alpha, 0.04)})`;
        context.arc(x, y, star.radius, 0, Math.PI * 2);
        context.fill();
      }
    };

    const drawRibbons = (time: number) => {
      const ribbonConfigs = [
        { colorA: "80, 220, 255", colorB: "123, 99, 255", width: 260, height: 54, rotation: 0.3, offsetY: -20 },
        { colorA: "96, 213, 255", colorB: "159, 123, 255", width: 220, height: 42, rotation: -0.6, offsetY: 22 },
        { colorA: "88, 198, 255", colorB: "135, 111, 255", width: 300, height: 32, rotation: 1.04, offsetY: 0 }
      ];

      ribbonConfigs.forEach((ribbon, index) => {
        context.save();
        context.translate(centerX, centerY + ribbon.offsetY);
        context.rotate(ribbon.rotation + Math.sin(time * 0.18 + index) * 0.08);

        for (let layer = 0; layer < 10; layer += 1) {
          const progress = layer / 9;
          const alpha = 0.018 - progress * 0.0012;
          const wave = Math.sin(time * 0.9 + progress * Math.PI * 2 + index) * 12;

          context.beginPath();
          for (let step = 0; step <= 120; step += 1) {
            const t = step / 120;
            const x = (t - 0.5) * ribbon.width;
            const y =
              Math.sin(t * Math.PI * 2.2 + time * 0.9 + index) * ribbon.height * (0.36 - progress * 0.16) +
              Math.cos(t * Math.PI * 3.4 - time * 0.5) * 8 +
              wave * (0.12 - progress * 0.05);

            if (step === 0) {
              context.moveTo(x, y);
            } else {
              context.lineTo(x, y);
            }
          }

          context.strokeStyle =
            index % 2 === 0
              ? `rgba(${ribbon.colorA}, ${alpha})`
              : `rgba(${ribbon.colorB}, ${alpha})`;
          context.lineWidth = 28 - progress * 16;
          context.stroke();
        }

        context.restore();
      });
    };

    const drawOrbitalLines = (time: number) => {
      const pointerRadius = Math.min(width, height) * 0.11;
      pointer.x += (pointer.targetX - pointer.x) * 0.12;
      pointer.y += (pointer.targetY - pointer.y) * 0.12;

      lines.forEach((line, index) => {
        context.save();
        context.translate(centerX, centerY + Math.sin(time * 0.62) * 16);
        context.rotate(line.rotation + time * line.speed * 0.1);

        context.beginPath();

        for (let step = 0; step <= line.points; step += 1) {
          const t = (step / line.points) * Math.PI * 2;
          const harmonic = line.turns * t + line.phase + time * line.speed;
          const torusWave = Math.sin(harmonic) * line.wobble;
          const baseX = Math.cos(t) * (line.radiusX + torusWave * 0.55);
          const baseY = Math.sin(t) * (line.radiusY + torusWave);
          const wave = Math.sin(t * 5.4 - time * 1.55 + index * 0.45) * 7;
          const twist = Math.cos(t * 3.8 + time * 1.05 + index * 0.22) * 5;
          let x = baseX + Math.cos(t) * wave;
          let y = baseY + Math.sin(t) * wave + twist;

          const globalX = x + centerX;
          const globalY = y + centerY + Math.sin(time * 0.62) * 16;

          if (pointer.active) {
            const dx = globalX - pointer.x;
            const dy = globalY - pointer.y;
            const distance = Math.hypot(dx, dy);

            if (distance < pointerRadius) {
              const force = Math.pow(1 - distance / pointerRadius, 2) * 44;
              const safeDistance = Math.max(distance, 0.001);
              x += (dx / safeDistance) * force;
              y += (dy / safeDistance) * force;
            }
          }

          if (step === 0) {
            context.moveTo(x, y);
          } else {
            context.lineTo(x, y);
          }
        }

        context.strokeStyle = line.color;
        context.globalAlpha = line.opacity + Math.sin(time * 0.8 + index * 0.5) * 0.08;
        context.lineWidth = line.thickness;
        context.shadowColor = line.color;
        context.shadowBlur = 10;
        context.stroke();
        context.restore();
      });
    };

    const render = (now: number) => {
      const time = now * 0.001;
      drawBackground(time);
      drawStars(time);
      drawRibbons(time);
      drawOrbitalLines(time);
      animationFrame = window.requestAnimationFrame(render);
    };

    resize();
    pointer.targetX = centerX;
    pointer.targetY = centerY;
    pointer.x = centerX;
    pointer.y = centerY;

    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerleave", handlePointerLeave);
    animationFrame = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#02040a]">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
}

import { useEffect, useRef } from "react";

const BAR_COUNT = 24;
const FLOOR = 4;

function makeBands(binCount) {
  const maxBin = Math.min(binCount - 1, Math.round(binCount * 0.55));
  const edges = [];
  for (let i = 0; i <= BAR_COUNT; i++) {
    edges.push(1 + Math.round(Math.pow(i / BAR_COUNT, 1.8) * (maxBin - 1)));
  }
  return Array.from({ length: BAR_COUNT }, (_, i) => [
    edges[i],
    Math.max(edges[i] + 1, edges[i + 1]),
  ]);
}

function bandLevels(data, bands) {
  return bands.map(([lo, hi], i) => {
    let peak = 0;
    for (let b = lo; b < hi && b < data.length; b++) {
      if (data[b] > peak) peak = data[b];
    }
    const tilt = 1 + (i / BAR_COUNT) * 0.7;
    return Math.min(1, Math.pow(peak / 255, 1.5) * tilt);
  });
}

export default function Equalizer({ active, analyserRef, color, onMode = () => {} }) {
  const canvasRef = useRef(null);
  const heightsRef = useRef(new Array(BAR_COUNT).fill(FLOOR));
  const sizeRef = useRef({ width: 0, height: 0, dpr: 1 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const paint = () => {
      const { width: w, height: h } = sizeRef.current;
      if (w === 0 || h === 0) return;
      ctx.clearRect(0, 0, w, h);

      const gap = 5;
      const barW = Math.max(4, (w - (BAR_COUNT - 1) * gap) / BAR_COUNT);

      heightsRef.current.forEach((bh, i) => {
        const hh = Math.max(5, Math.min(bh, h));
        const x = Math.floor(i * (barW + gap));
        const y = Math.floor(h - hh);
        const radius = Math.min(barW / 2, 6);

        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(x, y, barW, hh, [radius, radius, 0, 0]);
        } else {
          ctx.rect(x, y, barW, hh);
        }
        ctx.fillStyle = color;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#1B1A17";
        ctx.stroke();
      });
    };

    const updateSize = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      if (w === 0 || h === 0) return;
      const s = sizeRef.current;
      if (s.width !== w || s.height !== h || s.dpr !== dpr) {
        sizeRef.current = { width: w, height: h, dpr };
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        paint();
      }
    };

    updateSize();

    let observer;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(updateSize);
      observer.observe(canvas);
    }

    let raf = 0;
    let data = null;
    let bands = null;
    let silentFrames = 0;
    let heard = false;
    let mode = null;

    const setMode = (m) => {
      if (m !== mode) {
        mode = m;
        onMode?.(m);
      }
    };

    const render = (time) => {
      const { height: h } = sizeRef.current;
      const analyser = active ? analyserRef.current : null;
      let levels = null;

      if (analyser) {
        if (!data || data.length !== analyser.frequencyBinCount) {
          data = new Uint8Array(analyser.frequencyBinCount);
          bands = makeBands(data.length);
        }
        analyser.getByteFrequencyData(data);

        let peak = 0;
        for (let i = 0; i < data.length; i++) {
          if (data[i] > peak) peak = data[i];
        }
        if (peak > 0) {
          heard = true;
          silentFrames = 0;
        } else {
          silentFrames++;
        }

        if (heard && silentFrames < 180) {
          setMode("live");
          levels = bandLevels(data, bands);
        } else {
          setMode("sim");
        }
      } else if (active) {
        setMode("sim");
      } else {
        setMode("idle");
      }

      if (levels === null && active) {
        const t = time * 0.003;
        levels = Array.from({ length: BAR_COUNT }, (_, i) => {
          const s1 = Math.sin(t * 1.7 + i * 0.35);
          const s2 = Math.cos(t * 0.9 - i * 0.2);
          const s3 = Math.sin(t * 2.5 + i * 0.8);
          const raw = (s1 + s2 + s3 + 3) / 6;
          const hump = Math.sin((i / (BAR_COUNT - 1)) * Math.PI);
          return Math.max(0.08, raw * 0.75 + hump * 0.25);
        });
      }

      const prevHeights = heightsRef.current;
      let moving = false;
      const targetHeights = levels
        ? levels.map((l) => FLOOR + l * (h - FLOOR - 4))
        : new Array(BAR_COUNT).fill(FLOOR);

      const nextHeights = prevHeights.map((currentH, i) => {
        const target = targetHeights[i];
        let nextH;
        if (target > currentH) {
          nextH = currentH + (target - currentH) * 0.45;
        } else {
          nextH = currentH - 2.8;
          if (nextH < target) nextH = target;
        }
        if (Math.abs(nextH - currentH) > 0.3) moving = true;
        return nextH;
      });

      heightsRef.current = nextHeights;
      paint();

      if (active || moving) raf = requestAnimationFrame(render);
    };

    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      if (observer) observer.disconnect();
    };
  }, [active, analyserRef, color, onMode]);

  return (
    <div className="relative min-h-[50px] flex-1">
      <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" />
    </div>
  );
}

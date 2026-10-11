import { useEffect, useRef } from "react";

// ---------------------------------------------------------------------------
// Shared audio visualiser (Now Playing + mini player).
//
// Reads real frequency data from the player's analyser when it has one. If the
// stream can't be analysed (no CORS headers) it falls back to a simulated
// animation and reports that through onMode, so the caller can say so.
// When nothing is playing, the loop settles and STOPS: no animation, no CPU.
//
// Props
//   active       true while audio is really playing
//   analyserRef  ref from usePlayer(); .current is null when unavailable
//   color        bar colour (changing it never restarts the animation)
//   onMode       optional, called with "live" | "sim" | "idle" on change
//   bars         fixed number of bars (default 24) ...
//   barWidth     ... or, if > 0, as many bars of this width (px) as fit
//   gap          px between bars
//   className    classes for the wrapper; it MUST be positioned and sized
// ---------------------------------------------------------------------------

const FLOOR = 3;
const MIN_AUTO_BARS = 12;
const MAX_AUTO_BARS = 64;

function makeBands(binCount, bars) {
  const maxBin = Math.min(binCount - 1, Math.round(binCount * 0.55));
  const edges = [];
  for (let i = 0; i <= bars; i++) {
    edges.push(1 + Math.round(Math.pow(i / bars, 1.8) * (maxBin - 1)));
  }
  return Array.from({ length: bars }, (_, i) => [
    edges[i],
    Math.max(edges[i] + 1, edges[i + 1]),
  ]);
}

function bandLevels(data, bands) {
  const bars = bands.length;
  return bands.map(([lo, hi], i) => {
    let peak = 0;
    for (let b = lo; b < hi && b < data.length; b++) {
      if (data[b] > peak) peak = data[b];
    }
    const tilt = 1 + (i / bars) * 0.7; // highs carry less energy
    return Math.min(1, Math.pow(peak / 255, 1.5) * tilt);
  });
}

function paintBars(ctx, size, heights, color, gap) {
  const { width: w, height: h } = size;
  if (w === 0 || h === 0) return;
  ctx.clearRect(0, 0, w, h);

  const n = heights.length;
  const barW = Math.max(2, (w - (n - 1) * gap) / n);
  ctx.fillStyle = color;

  for (let i = 0; i < n; i++) {
    const hh = Math.min(heights[i], h);
    ctx.fillRect(
      Math.floor(i * (barW + gap)),
      Math.floor(h - hh),
      Math.floor(barW),
      Math.ceil(hh)
    );
  }
}

export default function Equalizer({
  active,
  analyserRef,
  color,
  onMode,
  bars = 24,
  barWidth = 0,
  gap = 4,
  className = "relative min-h-[48px] flex-1",
}) {
  const canvasRef = useRef(null);
  const heightsRef = useRef(null);
  const sizeRef = useRef({ width: 0, height: 0, dpr: 1 });
  const colorRef = useRef(color);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const countFor = (w) =>
      barWidth > 0
        ? Math.max(
            MIN_AUTO_BARS,
            Math.min(MAX_AUTO_BARS, Math.floor((w + gap) / (barWidth + gap)))
          )
        : bars;

    const ensureHeights = () => {
      const n = countFor(sizeRef.current.width);
      if (!heightsRef.current || heightsRef.current.length !== n) {
        heightsRef.current = new Array(n).fill(FLOOR);
      }
      return heightsRef.current;
    };

    const paint = () =>
      paintBars(ctx, sizeRef.current, ensureHeights(), colorRef.current, gap);

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
        paint(); // resizing clears the canvas; redraw even if the loop is idle
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
        if (onMode) onMode(m);
      }
    };

    const render = (time) => {
      const { height: h } = sizeRef.current;
      const heights = ensureHeights();
      const n = heights.length;
      const analyser = active ? analyserRef.current : null;
      let levels = null;

      if (analyser) {
        if (!data || data.length !== analyser.frequencyBinCount) {
          data = new Uint8Array(analyser.frequencyBinCount);
          bands = null;
        }
        if (!bands || bands.length !== n) bands = makeBands(data.length, n);
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

        // Analyser present but never produced a single non-zero sample in
        // ~3s: the browser is feeding it silence. Treat as unavailable.
        if (heard || silentFrames < 180) levels = bandLevels(data, bands);
      }

      setMode(levels ? "live" : active ? "sim" : "idle");

      let moving = false;

      for (let i = 0; i < n; i++) {
        let target = FLOOR;

        if (active) {
          if (levels) {
            target = Math.max(FLOOR, levels[i] * h * 0.95);
          } else {
            const t = time * 0.0012;
            const a = Math.sin(t * 1.5 + i * 0.4);
            const b = Math.cos(t * 2.1 - i * 0.3);
            const c = Math.sin(t * 3.3 + i * 0.7);
            const norm = (a * 0.4 + b * 0.4 + c * 0.2 + 1) / 2;
            target = Math.max(6, norm * (h * 0.85));
          }
        }

        // fast attack so beats hit, slower release so bars fall smoothly
        const diff = target - heights[i];
        heights[i] += diff * (diff > 0 ? 0.6 : 0.15);
        if (heights[i] > FLOOR + 0.5) moving = true;
      }

      paint();

      // Keep looping only while playing or while bars are still falling.
      if (active || moving) raf = requestAnimationFrame(render);
    };

    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      if (observer) observer.disconnect();
    };
  }, [active, analyserRef, bars, barWidth, gap, onMode]);

  // Colour changes repaint in place; they never restart the loop.
  useEffect(() => {
    colorRef.current = color;
    const canvas = canvasRef.current;
    if (!canvas || !heightsRef.current) return;
    paintBars(
      canvas.getContext("2d"),
      sizeRef.current,
      heightsRef.current,
      color,
      gap
    );
  }, [color, gap]);

  return (
    <div className={className}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 block h-full w-full"
      />
    </div>
  );
}
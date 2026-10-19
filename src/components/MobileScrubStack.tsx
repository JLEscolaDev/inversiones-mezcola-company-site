'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { FrameSequence } from '@/lib/assets';
import { DecodedSprites, SpriteStore } from '@/lib/sprite-store';
import styles from '@/components/CinematicExperience.module.css';

type Frames = { count: number; frameWidth: number; frameHeight: number; columns: number; rows: number };

function drawFrame(canvas: HTMLCanvasElement, image: CanvasImageSource, frames: Frames, index: number) {
  const context = canvas.getContext('2d');
  if (!context) return;
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(1, Math.round(rect.width * dpr));
  const height = Math.max(1, Math.round(rect.height * dpr));
  if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
  const ratio = frames.frameWidth / frames.frameHeight;
  const drawWidth = Math.max(width, height * ratio);
  const drawHeight = drawWidth / ratio;
  context.drawImage(image, index % frames.columns * frames.frameWidth,
    Math.floor(index / frames.columns) * frames.frameHeight, frames.frameWidth, frames.frameHeight,
    (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
}

export function MobileScrubStack({ sceneLayers, frameSequences, loadingLabel = 'Preparando la animación' }: {
  loadingLabel?: string;
  sceneLayers: ReactNode[];
  frameSequences: FrameSequence[];
}) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const sceneRefs = useRef<Array<HTMLDivElement | null>>([]);
  const mediaRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const [loaded, setLoaded] = useState(0);
  const [failed, setFailed] = useState(false);
  const count = frameSequences.length;
  const sceneCount = sceneLayers.length;

  useEffect(() => {
    const section = sectionRef.current;
    const canvas = canvasRef.current;
    if (!section || !canvas || !count || failed) return;
    let raf = 0;
    let target = 0;
    let progress = 0;
    let disposed = false;
    let bootComplete = false;
    let hasRevealed = false;
    let painted = '';
    let paintedSequence = -1;
    const store = new SpriteStore();
    const previews = new Set(frameSequences.map(sequence => sequence.preview.src));
    const requestRender = () => {
      if (disposed || raf) return;
      raf = requestAnimationFrame(render);
    };
    const decoded = new DecodedSprites(store, requestRender, undefined, undefined, src => {
      if (!disposed && !hasRevealed && previews.has(src)) setFailed(true);
    });
    decoded.retain(previews);
    previews.forEach(src => decoded.load(src, 0));
    const sheetSrc = (sequence: FrameSequence, sheet: number) =>
      `${sequence.basePath}/sheet_${String(sheet + 1).padStart(4, '0')}.jpg`;

    // Every transition has its complete motion cached as a small compressed atlas.
    // The bounded base tier is fully decoded before enabling scroll. Detail is
    // decoded only for the current sheet; no first-visit decoder stalls.
    const bootTimeout = window.setTimeout(() => { if (!hasRevealed && !disposed) setFailed(true); }, 20000);
    const sceneImages = [...section.querySelectorAll('img')];
    sceneImages.forEach(image => { image.loading = 'eager'; });
    void Promise.all([
      ...[...previews].map(src => store.request(src, 0)),
      ...sceneImages.map(image => image.decode()),
    ]).then(() => {
      bootComplete = true;
      requestRender();
    }).catch(() => { if (!disposed) setFailed(true); });

    function render() {
      raf = 0;
      if (disposed || !canvas) return;
      const delta = target - progress;
      progress = Math.abs(delta) > 0.0006 ? progress + delta * 0.24 : target;
      const scaled = progress * count;
      const active = Math.min(count - 1, Math.floor(scaled));
      const local = progress >= 1 ? 1 : scaled - active;
      const hold = active === 0 ? 0.08 : 0.22;
      const motion = Math.max(0, Math.min(1, (local - hold) / (0.88 - hold)));
      const sequence = frameSequences[active];
      const frame = Math.min(sequence.count - 1, Math.round(motion * (sequence.count - 1)));
      const perSheet = sequence.columns * sequence.rows;
      const sheet = Math.floor(frame / perSheet);
      const fullSrc = sheetSrc(sequence, sheet);
      const previewSrc = sequence.preview.src;
      const keep = new Set([...previews, fullSrc]);
      decoded.retain(keep);
      const networkKeep = new Set([...previews, fullSrc]);
      // Fetch one sheet ahead, but only decode the frame the scroll actually wants.
      if (sheet + 1 < sequence.sheetCount) networkKeep.add(sheetSrc(sequence, sheet + 1));
      store.retain(networkKeep);
      decoded.load(previewSrc, 0);
      if (hasRevealed) decoded.load(fullSrc, 1);
      for (const src of networkKeep) {
        if (!previews.has(src) && src !== fullSrc) void store.request(src, 3).catch(() => undefined);
      }
      const full = decoded.get(fullSrc);
      const preview = decoded.get(previewSrc);
      const image = full ?? preview;
      if (image) {
        const tier = full ? 'full' : 'preview';
        // Identity belongs to the shared canvas, including sequence and size.
        const key = `${active}:${frame}:${tier}:${canvas.clientWidth}:${canvas.clientHeight}:${window.devicePixelRatio}`;
        if (key !== painted) {
          drawFrame(canvas, image, full ? sequence : sequence.preview, full ? frame % perSheet : frame);
          painted = key;
          paintedSequence = active;
        }
      }
      const prepared = [...previews].filter(src => decoded.get(src)).length;
      setLoaded(prepared);
      if (bootComplete && prepared === previews.size && image && !hasRevealed) {
        hasRevealed = true;
        window.clearTimeout(bootTimeout);
        section!.style.height = `${count * 135 + 100}vh`;
        setReady(true);
      }
      const hasCurrentPixels = paintedSequence === active;
      const fadeIn = hasCurrentPixels ? Math.max(0, Math.min(1, (local - hold) / 0.12)) : 0;
      const fadeOut = Math.max(0, Math.min(1, (1 - local) / 0.12));
      const next = Math.max(0, Math.min(1, (local - 0.88) / 0.12));
      sceneRefs.current.forEach((layer, index) => {
        if (!layer) return;
        let opacity = 0;
        if (index === active) opacity = hasCurrentPixels ? 1 - fadeIn : 1 - next;
        else if (index === active + 1) opacity = next;
        if (progress >= 1 && index === sceneCount - 1) opacity = 1;
        layer.style.opacity = String(opacity);
      });
      if (mediaRef.current) mediaRef.current.style.opacity = String(Math.min(fadeIn, fadeOut));
      if (Math.abs(target - progress) > 0.0006) requestRender();
    }

    const sync = () => {
      const distance = Math.max(count * 135 * window.innerHeight / 100, 1);
      target = Math.max(0, Math.min(1, -section.getBoundingClientRect().top / distance));
      requestRender();
    };
    window.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    sync();
    return () => {
      disposed = true;
      window.removeEventListener('scroll', sync);
      window.removeEventListener('resize', sync);
      if (raf) cancelAnimationFrame(raf);
      window.clearTimeout(bootTimeout);
      decoded.dispose();
      store.dispose();
    };
  }, [count, failed, frameSequences, sceneCount]);

  if (failed) return <div>{sceneLayers}</div>;

  return (
    <div aria-busy={!ready} ref={sectionRef} className={styles.mobileStackScroll} style={{ height: ready ? `${count * 135 + 100}vh` : '100vh' }}>
      <div className={styles.mobileStackStage}>
        {!ready ? <div className={styles.mediaLoading} role="status">
          <span>{loadingLabel} · {Math.min(99, Math.round(loaded / count * 100))}%</span>
          <progress value={loaded} max={count} aria-label={loadingLabel} />
        </div> : null}
        {sceneLayers.map((scene, index) => (
          <div key={index} ref={node => { sceneRefs.current[index] = node; }}
            className={styles.mobileSceneLayer} style={{ zIndex: (sceneCount - index) * 2 }}>{scene}</div>
        ))}
        <div ref={mediaRef} className={styles.mobileVideoLayer} style={{ opacity: 0, zIndex: sceneCount * 2 + 1 }}>
          <canvas ref={canvasRef} className={styles.mobileScrubCanvas} />
        </div>
      </div>
    </div>
  );
}

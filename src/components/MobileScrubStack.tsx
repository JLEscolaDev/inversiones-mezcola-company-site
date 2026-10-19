'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { FrameSequence } from '@/lib/assets';
import { VideoScrubber } from '@/lib/video-scrubber';
import styles from '@/components/CinematicExperience.module.css';

export function MobileScrubStack({ sceneLayers, frameSequences, loadingLabel = 'Preparando la animación' }: {
  loadingLabel?: string;
  sceneLayers: ReactNode[];
  frameSequences: FrameSequence[];
}) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const sceneRefs = useRef<Array<HTMLDivElement | null>>([]);
  const mediaRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const decoderHostRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [loaded, setLoaded] = useState(0);
  const [failed, setFailed] = useState(false);
  const count = frameSequences.length;
  const sceneCount = sceneLayers.length;

  useEffect(() => {
    const section = sectionRef.current;
    const canvas = canvasRef.current;
    const host = decoderHostRef.current;
    if (!section || !canvas || !host || !count || failed) return;
    let raf = 0;
    let target = 0;
    let progress = 0;
    let disposed = false;
    let hasRevealed = false;
    let scrubber: VideoScrubber | undefined;
    const urls: string[] = [];
    const controllers = new Set<AbortController>();
    const requestRender = () => {
      if (disposed || raf) return;
      raf = requestAnimationFrame(render);
    };
    const fail = () => { if (!disposed) setFailed(true); };
    const sizes = frameSequences.map(() => 0);
    const total = frameSequences.reduce((sum, sequence) => sum + sequence.motion.bytes, 0);
    const loadVideo = async (index: number) => {
      const controller = new AbortController();
      controllers.add(controller);
      let timeout = 0;
      // A slow connection is allowed to finish. Only a stalled transfer times out.
      const arm = () => {
        window.clearTimeout(timeout);
        timeout = window.setTimeout(() => controller.abort(), 30000);
      };
      arm();
      try {
        const response = await fetch(frameSequences[index].motion.src, { signal: controller.signal, cache: 'force-cache' });
        if (!response.ok) throw new Error(`Motion HTTP ${response.status}`);
        const reader = response.body?.getReader();
        let blob: Blob;
        if (reader) {
          const chunks: ArrayBuffer[] = [];
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value.slice().buffer);
            sizes[index] += value.byteLength;
            arm();
            if (!disposed) setLoaded(Math.min(99, Math.round(sizes.reduce((sum, size) => sum + size, 0) / total * 100)));
          }
          blob = new Blob(chunks, { type: 'video/mp4' });
        } else blob = await response.blob();
        if (!disposed) urls[index] = URL.createObjectURL(blob);
      } finally {
        window.clearTimeout(timeout);
        controllers.delete(controller);
      }
    };
    const images = [...section.querySelectorAll('img')];
    images.forEach(image => { image.loading = 'eager'; });
    let next = 0;
    const worker = async () => {
      while (!disposed && next < count) await loadVideo(next++);
    };
    void Promise.all([worker(), worker(), ...images.map(image => image.decode())]).then(() => {
      if (disposed) return;
      // Full compressed clips are resident before scrolling, with only current
      // and next clips decoded natively. Every displayed frame remains900x1600.
      scrubber = new VideoScrubber(canvas, host, frameSequences.map(sequence => sequence.motion), urls, requestRender, fail);
      requestRender();
    }).catch(fail);

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
      const hasCurrentPixels = scrubber?.request(active, frame) ?? false;
      if (hasCurrentPixels && !hasRevealed) {
        hasRevealed = true;
        section!.style.height = `${count * 135 + 100}vh`;
        setLoaded(100);
        setReady(true);
      }
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
      controllers.forEach(controller => controller.abort());
      scrubber?.dispose();
      urls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [count, failed, frameSequences, sceneCount]);

  if (failed) return <div>{sceneLayers}</div>;
  return (
    <div aria-busy={!ready} ref={sectionRef} className={styles.mobileStackScroll} style={{ height: ready ? `${count * 135 + 100}vh` : '100vh' }}>
      <div className={styles.mobileStackStage}>
        {!ready ? <div className={styles.mediaLoading} role="status">
          <span>{loadingLabel} · {loaded}%</span>
          <progress value={loaded} max={100} aria-label={loadingLabel} />
        </div> : null}
        {sceneLayers.map((scene, index) => (
          <div key={index} ref={node => { sceneRefs.current[index] = node; }}
            className={styles.mobileSceneLayer} style={{ zIndex: (sceneCount - index) * 2 }}>{scene}</div>
        ))}
        <div ref={mediaRef} className={styles.mobileVideoLayer} style={{ opacity: 0, zIndex: sceneCount * 2 + 1 }}>
          <canvas ref={canvasRef} className={styles.mobileScrubCanvas} />
        </div>
        <div ref={decoderHostRef} aria-hidden="true" />
      </div>
    </div>
  );
}

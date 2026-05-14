'use client';

import { useEffect, useRef, useState } from 'react';

type Props = {
  id: string;
  videoSrc: string;
  posterSrc: string;
  classNames: {
    transition: string;
    video: string;
    overlay: string;
  };
  reducedMotion: boolean;
  onEnded?: () => void;
};

export function TransitionVideo({ id, videoSrc, posterSrc, classNames, reducedMotion, onEnded }: Props) {
  const [hasError, setHasError] = useState(false);
  const [outroOpacity, setOutroOpacity] = useState(0);
  const [isVideoVisible, setIsVideoVisible] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (reducedMotion || hasError) return;

    const node = videoRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            void node.play().catch(() => {
              setHasError(true);
            });
          } else {
            node.pause();
          }
        });
      },
      { threshold: 0.4 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [reducedMotion, hasError]);

  useEffect(() => {
    if (reducedMotion || hasError) return;
    const node = videoRef.current;
    if (!node) return;

    let rafId = 0;
    const OUTRO_SECONDS = 1.5;

    const tick = () => {
      const duration = node.duration;
      if (duration && Number.isFinite(duration)) {
        const startTime = Math.max(0, duration - OUTRO_SECONDS);
        const raw = (node.currentTime - startTime) / OUTRO_SECONDS;
        const clamped = Math.max(0, Math.min(1, raw));
        setOutroOpacity(clamped);
      }
      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [reducedMotion, hasError, videoSrc, onEnded]);

  if (reducedMotion) return null;

  return (
    <section
      id={id}
      className={`${classNames.transition} js-transition`}
      aria-hidden="true"
      style={{ backgroundImage: `url(${posterSrc})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      {!hasError ? (
        <video
          ref={videoRef}
          className={classNames.video}
          style={{ opacity: isVideoVisible ? 1 : 0, transition: 'opacity 140ms linear' }}
          src={videoSrc}
          poster={posterSrc}
          muted
          loop={!onEnded}
          playsInline
          autoPlay
          preload="metadata"
          onEnded={onEnded}
          onPlaying={() => setIsVideoVisible(true)}
          onPause={() => {
            if (!onEnded) setIsVideoVisible(false);
          }}
          onError={() => setHasError(true)}
        />
      ) : null}
      <div className={classNames.overlay} style={{ opacity: outroOpacity }} />
    </section>
  );
}

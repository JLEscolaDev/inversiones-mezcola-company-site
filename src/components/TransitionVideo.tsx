'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

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
  mode?: 'autoplay' | 'scroll';
  onEnded?: () => void;
};

export function TransitionVideo({
  id,
  videoSrc,
  posterSrc,
  classNames,
  reducedMotion,
  mode = 'autoplay',
  onEnded,
}: Props) {
  const [hasError, setHasError] = useState(false);
  const [outroOpacity, setOutroOpacity] = useState(0);
  const [isVideoVisible, setIsVideoVisible] = useState(false);
  const [isPlaybackStarted, setIsPlaybackStarted] = useState(false);
  const hasCompletedRef = useRef(false);
  const hasMetadataRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const completeTransition = useCallback(() => {
    if (hasCompletedRef.current) return;
    hasCompletedRef.current = true;
    onEnded?.();
  }, [onEnded]);

  useEffect(() => {
    if (mode !== 'autoplay' || reducedMotion || hasError) return;

    const node = videoRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            void node.play().then(() => {
              setIsPlaybackStarted(true);
            }).catch(() => {
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
  }, [hasError, mode, reducedMotion]);

  useEffect(() => {
    if (mode !== 'scroll' || reducedMotion || hasError) return;

    const node = videoRef.current;
    if (!node) return;

    let rafId = 0;

    const syncFrameToScroll = () => {
      if (hasMetadataRef.current) {
        const rect = node.getBoundingClientRect();
        const viewportHeight = window.innerHeight || 1;
        const totalTravel = rect.height + viewportHeight;
        const progress = (viewportHeight - rect.top) / totalTravel;
        const clampedProgress = Math.max(0, Math.min(1, progress));
        const duration = node.duration;

        if (duration && Number.isFinite(duration)) {
          const targetTime = clampedProgress * duration;
          if (Math.abs(node.currentTime - targetTime) > 0.033) {
            node.currentTime = targetTime;
          }
          setOutroOpacity(clampedProgress);
          setIsVideoVisible(clampedProgress > 0.02);
        }
      }

      rafId = window.requestAnimationFrame(syncFrameToScroll);
    };

    const onLoadedMetadata = () => {
      hasMetadataRef.current = true;
    };

    node.pause();
    node.muted = true;
    node.addEventListener('loadedmetadata', onLoadedMetadata);
    if (node.readyState >= 1) {
      hasMetadataRef.current = true;
    }

    rafId = window.requestAnimationFrame(syncFrameToScroll);

    return () => {
      node.removeEventListener('loadedmetadata', onLoadedMetadata);
      window.cancelAnimationFrame(rafId);
    };
  }, [hasError, mode, reducedMotion]);

  useEffect(() => {
    hasCompletedRef.current = false;
    hasMetadataRef.current = false;
  }, [videoSrc]);

  useEffect(() => {
    if (mode !== 'autoplay') return;
    if (!onEnded) return;
    if (reducedMotion) return;

    const fallbackTimer = window.setTimeout(() => {
      if (!isPlaybackStarted || hasError) {
        completeTransition();
      }
    }, 1200);

    return () => window.clearTimeout(fallbackTimer);
  }, [completeTransition, hasError, isPlaybackStarted, mode, onEnded, reducedMotion]);

  useEffect(() => {
    if (reducedMotion || hasError) return;
    if (mode !== 'autoplay') return;
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
  }, [hasError, mode, reducedMotion, videoSrc]);

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
          loop={mode === 'scroll' ? false : !onEnded}
          playsInline
          autoPlay={mode === 'autoplay'}
          preload="metadata"
          onEnded={mode === 'autoplay' ? completeTransition : undefined}
          onPlaying={() => {
            setIsPlaybackStarted(true);
            setIsVideoVisible(true);
          }}
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

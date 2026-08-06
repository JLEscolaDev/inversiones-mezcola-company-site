'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Link from 'next/link';

import styles from '@/components/CinematicExperience.module.css';
import { Scene } from '@/components/Scene';
import { TransitionVideo } from '@/components/TransitionVideo';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { ContactForm } from '@/components/ContactForm';
import { resolveFrameSequence, resolveImage, resolveVideo, type SceneBlock, type TransitionBlock } from '@/lib/content';
import type { Locale } from '@/lib/i18n';
import type { FrameSequence } from '@/lib/assets';

type Props = {
  locale: Locale;
  languageLabel: string;
  switchToText: string;
  switchToHref: string;
  ui: {
    previousSceneAria: string;
    technologyProfileAria: string;
    capitalProfileAria: string;
    technologyExpertLabel: string;
    capitalExpertLabel: string;
    profileLinkText: string;
  };
  hero: SceneBlock;
  scenes: SceneBlock[];
  transitions: TransitionBlock[];
  contact: {
    title: string;
    fields: {
      name: string;
      company: string;
      email: string;
      message: string;
    };
    cta: string;
  };
};

type MobileScrubStepProps = {
  sceneLayers: ReactNode[];
  frameSequences: FrameSequence[];
  posterSrcs: string[];
};

gsap.registerPlugin(ScrollTrigger);

type SpriteCacheEntry = {
  image?: CanvasImageSource;
  lastUsed: number;
  promise: Promise<CanvasImageSource>;
};

const spriteCache = new Map<string, SpriteCacheEntry>();
const FIRST_SCENE_HOLD = 0.08;
const SCENE_HOLD = 0.22;
const SCENE_FADE = 0.12;
const VIDEO_FADE = 0.12;
const SCROLL_EASE = 0.24;
const STILL_THRESHOLD = 0.0006;
const MOBILE_SEGMENT_SCROLL_VH = 135;
const MOBILE_STACK_EXTRA_VH = 100;
const MOBILE_CANVAS_MAX_DPR = 2;
const MAX_SPRITE_CACHE_ITEMS = 8;

function getSheetSrc(frames: FrameSequence, sheetIndex: number) {
  return `${frames.basePath}/sheet_${String(sheetIndex + 1).padStart(4, '0')}.jpg`;
}

function closeSprite(image: CanvasImageSource | undefined) {
  if (typeof ImageBitmap !== 'undefined' && image instanceof ImageBitmap) {
    image.close();
  }
}

function trimSpriteCache(keepSrcs: Set<string>) {
  const removableEntries = [...spriteCache.entries()]
    .filter(([src]) => !keepSrcs.has(src))
    .sort(([, a], [, b]) => a.lastUsed - b.lastUsed);

  while (spriteCache.size > MAX_SPRITE_CACHE_ITEMS && removableEntries.length > 0) {
    const [src, entry] = removableEntries.shift()!;
    closeSprite(entry.image);
    spriteCache.delete(src);
  }
}

function loadSprite(src: string, keepSrcs: Set<string>, onLoad?: (image: CanvasImageSource) => void) {
  const cached = spriteCache.get(src);
  if (cached) {
    cached.lastUsed = Date.now();
    cached.promise.then((image) => onLoad?.(image)).catch(() => undefined);
    trimSpriteCache(keepSrcs);
    return cached.promise;
  }

  const promise = new Promise<CanvasImageSource>((resolve, reject) => {
    const image = new window.Image();
    image.decoding = 'async';
    image.onload = async () => {
      try {
        if ('createImageBitmap' in window) {
          resolve(await window.createImageBitmap(image));
          return;
        }
      } catch {
        // If bitmap creation fails, the decoded image is still drawable.
      }
      resolve(image);
    };
    image.onerror = () => reject(new Error(`Unable to load sprite ${src}`));
    image.src = src;
  });

  const entry: SpriteCacheEntry = { lastUsed: Date.now(), promise };
  promise.then((image) => {
    entry.image = image;
  }).catch(() => {
    spriteCache.delete(src);
  });
  spriteCache.set(src, entry);
  trimSpriteCache(keepSrcs);
  promise.then((image) => onLoad?.(image)).catch(() => undefined);
  return promise;
}

function drawCoverSpriteFrame(canvas: HTMLCanvasElement, image: CanvasImageSource, frames: FrameSequence, frameIndex: number) {
  const context = canvas.getContext('2d');
  if (!context) return;

  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, MOBILE_CANVAS_MAX_DPR);
  const width = Math.max(1, Math.round(rect.width * dpr));
  const height = Math.max(1, Math.round(rect.height * dpr));

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  const imageRatio = frames.frameWidth / frames.frameHeight;
  const canvasRatio = width / height;
  let drawWidth = width;
  let drawHeight = height;

  if (imageRatio > canvasRatio) {
    drawHeight = height;
    drawWidth = height * imageRatio;
  } else {
    drawWidth = width;
    drawHeight = width / imageRatio;
  }

  const framesPerSheet = frames.columns * frames.rows;
  const sheetFrameIndex = frameIndex % framesPerSheet;
  const sourceX = (sheetFrameIndex % frames.columns) * frames.frameWidth;
  const sourceY = Math.floor(sheetFrameIndex / frames.columns) * frames.frameHeight;

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'medium';
  context.clearRect(0, 0, width, height);
  context.drawImage(
    image,
    sourceX,
    sourceY,
    frames.frameWidth,
    frames.frameHeight,
    (width - drawWidth) / 2,
    (height - drawHeight) / 2,
    drawWidth,
    drawHeight,
  );
}

function MobileScrubStack({ sceneLayers, frameSequences, posterSrcs }: MobileScrubStepProps) {
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const sceneLayerRefs = useRef<Array<HTMLDivElement | null>>([]);
  const frameLayerRefs = useRef<Array<HTMLDivElement | null>>([]);
  const canvasRefs = useRef<Array<HTMLCanvasElement | null>>([]);
  const lastFrameRefs = useRef<number[]>([]);
  const segmentCount = frameSequences.length;
  const sceneCount = sceneLayers.length;

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || segmentCount === 0) return;

    let rafId = 0;
    let targetProgress = 0;
    let displayProgress = 0;

    const getSheetSrcAt = (sequenceIndex: number, sheetIndex: number) => {
      const frames = frameSequences[sequenceIndex];
      if (!frames) return null;
      const clampedSheetIndex = Math.max(0, Math.min(frames.sheetCount - 1, sheetIndex));
      return getSheetSrc(frames, clampedSheetIndex);
    };

    const getKeepSrcs = (sequenceIndex: number, sheetIndex: number) => {
      const keepSrcs = new Set<string>();
      [sheetIndex - 1, sheetIndex, sheetIndex + 1].forEach((index) => {
        const src = getSheetSrcAt(sequenceIndex, index);
        if (src) keepSrcs.add(src);
      });

      const nextSequenceFirstSheet = getSheetSrcAt(sequenceIndex + 1, 0);
      if (nextSequenceFirstSheet) keepSrcs.add(nextSequenceFirstSheet);
      return keepSrcs;
    };

    const drawFrameAt = (sequenceIndex: number, frameIndex: number) => {
      const canvas = canvasRefs.current[sequenceIndex];
      const frames = frameSequences[sequenceIndex];
      if (!canvas || !frames) return;

      const sheetIndex = Math.floor(frameIndex / (frames.columns * frames.rows));
      const keepSrcs = getKeepSrcs(sequenceIndex, sheetIndex);
      const currentSheetSrc = getSheetSrc(frames, sheetIndex);
      loadSprite(currentSheetSrc, keepSrcs, (image) => {
        if (lastFrameRefs.current[sequenceIndex] === frameIndex) {
          drawCoverSpriteFrame(canvas, image, frames, frameIndex);
        }
      });

      keepSrcs.forEach((src) => {
        if (src !== currentSheetSrc) {
          loadSprite(src, keepSrcs);
        }
      });
    };

    const updateTargetFromScroll = () => {
      const viewportHeight = window.innerHeight || 1;
      const rect = section.getBoundingClientRect();
      const scrollDistance = Math.max(section.offsetHeight - viewportHeight, 1);
      targetProgress = Math.max(0, Math.min(1, -rect.top / scrollDistance));
    };

    const renderProgress = () => {
      const delta = targetProgress - displayProgress;
      if (Math.abs(delta) > STILL_THRESHOLD) {
        displayProgress += delta * SCROLL_EASE;
      } else {
        displayProgress = targetProgress;
      }

      const totalProgress = displayProgress;
      const scaledProgress = totalProgress * segmentCount;
      const activeIndex = Math.min(segmentCount - 1, Math.floor(scaledProgress));
      const segmentProgress = totalProgress >= 1 ? 1 : scaledProgress - activeIndex;
      const sceneHold = activeIndex === 0 ? FIRST_SCENE_HOLD : SCENE_HOLD;
      const videoStart = sceneHold;
      const videoEnd = 1 - VIDEO_FADE;
      const videoProgress = Math.max(0, Math.min(1, (segmentProgress - videoStart) / (videoEnd - videoStart)));
      const sceneFadeProgress = Math.max(0, Math.min(1, (segmentProgress - sceneHold) / SCENE_FADE));
      const nextSceneProgress = Math.max(0, Math.min(1, (segmentProgress - videoEnd) / VIDEO_FADE));

      sceneLayerRefs.current.forEach((layer, index) => {
        if (!layer) return;
        let opacity = 0;
        if (index === activeIndex) {
          opacity = 1 - sceneFadeProgress;
        } else if (index === activeIndex + 1) {
          opacity = nextSceneProgress;
        } else if (totalProgress >= 1 && index === sceneCount - 1) {
          opacity = 1;
        }
        layer.style.opacity = String(opacity);
      });

      frameLayerRefs.current.forEach((layer, index) => {
        if (!layer) return;
        let opacity = 0;
        if (index === activeIndex) {
          const fadeIn = Math.max(0, Math.min(1, (segmentProgress - sceneHold) / SCENE_FADE));
          const fadeOut = Math.max(0, Math.min(1, (1 - segmentProgress) / VIDEO_FADE));
          opacity = Math.min(fadeIn, fadeOut);
        }
        layer.style.opacity = String(opacity);
      });

      const activeFrames = frameSequences[activeIndex];
      if (activeFrames) {
        const frameIndex = Math.min(
          activeFrames.count - 1,
          Math.max(0, Math.round(videoProgress * (activeFrames.count - 1))),
        );
        if (frameIndex !== lastFrameRefs.current[activeIndex]) {
          lastFrameRefs.current[activeIndex] = frameIndex;
          drawFrameAt(activeIndex, frameIndex);
        }
      }

      if (Math.abs(targetProgress - displayProgress) > STILL_THRESHOLD) {
        rafId = window.requestAnimationFrame(renderProgress);
      } else {
        rafId = 0;
      }
    };

    const requestSync = () => {
      updateTargetFromScroll();
      if (rafId !== 0) return;
      rafId = window.requestAnimationFrame(renderProgress);
    };

    lastFrameRefs.current = frameSequences.map(() => -1);
    drawFrameAt(0, 0);

    window.addEventListener('scroll', requestSync, { passive: true });
    window.addEventListener('resize', requestSync);
    requestSync();

    return () => {
      window.removeEventListener('scroll', requestSync);
      window.removeEventListener('resize', requestSync);
      if (rafId !== 0) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [frameSequences, sceneCount, segmentCount]);

  return (
    <div
      ref={sectionRef}
      className={styles.mobileStackScroll}
      style={{ height: `${segmentCount * MOBILE_SEGMENT_SCROLL_VH + MOBILE_STACK_EXTRA_VH}vh` }}
    >
      <div className={styles.mobileStackStage}>
        {sceneLayers.map((sceneLayer, index) => (
          <div
            key={`scene-${index}`}
            ref={(node) => {
              sceneLayerRefs.current[index] = node;
            }}
            className={styles.mobileSceneLayer}
            style={{ zIndex: (sceneLayers.length - index) * 2 }}
          >
            {sceneLayer}
          </div>
        ))}
        {frameSequences.map((frames, index) => (
          <div
            key={frames.basePath}
            ref={(node) => {
              frameLayerRefs.current[index] = node;
            }}
            className={styles.mobileVideoLayer}
            style={{
              backgroundImage: `url(${posterSrcs[index]})`,
              zIndex: (sceneLayers.length - index) * 2 - 1,
            }}
          >
            <canvas
              ref={(node) => {
                canvasRefs.current[index] = node;
              }}
              className={styles.mobileScrubCanvas}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function CinematicExperience({
  locale,
  languageLabel,
  switchToText,
  switchToHref,
  ui,
  hero,
  scenes,
  transitions,
  contact,
}: Props) {
  const sceneList = useMemo(() => [hero, ...scenes], [hero, scenes]);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [hasResolvedViewport, setHasResolvedViewport] = useState(false);
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [activeTransitionIndex, setActiveTransitionIndex] = useState<number | null>(null);
  const [playToken, setPlayToken] = useState(0);
  const [pendingDirection, setPendingDirection] = useState<1 | -1>(1);
  const [isLocked, setIsLocked] = useState(false);
  const [isManualFading, setIsManualFading] = useState(false);
  const sceneContainerRef = useRef<HTMLDivElement | null>(null);
  const useCinematicMode = hasResolvedViewport && isDesktop && !reducedMotion;
  const useMobileStackMode = hasResolvedViewport && !isDesktop && !reducedMotion;

  const triggerPrevScene = () => {
    if (isLocked) return;
    if (currentSceneIndex <= 0) return;
    setIsLocked(true);
    setIsManualFading(true);

    window.setTimeout(() => {
      setCurrentSceneIndex((prev) => Math.max(prev - 1, 0));
    }, 260);

    window.setTimeout(() => {
      setIsManualFading(false);
      setIsLocked(false);
    }, 620);
  };

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const desktop = window.matchMedia('(min-width: 1024px)');

    const update = () => {
      setReducedMotion(reduced.matches);
      setIsDesktop(desktop.matches);
      setHasResolvedViewport(true);
    };

    update();
    reduced.addEventListener('change', update);
    desktop.addEventListener('change', update);

    return () => {
      reduced.removeEventListener('change', update);
      desktop.removeEventListener('change', update);
    };
  }, []);

  useEffect(() => {
    const target = sceneContainerRef.current;
    if (!target || !useCinematicMode) return;

    const animateScene = () => {
      const image = target.querySelector('.js-scene-image');
      const copy = target.querySelector('.js-scene-copy');

      if (image) {
        gsap.fromTo(image, { scale: 1.03, yPercent: 0 }, { scale: 1.09, yPercent: -2, duration: 1.45, ease: 'power2.out' });
      }

      if (copy) {
        gsap.fromTo(copy, { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power2.out' });
      }
    };

    animateScene();
  }, [currentSceneIndex, useCinematicMode]);

  useEffect(() => {
    if (!useCinematicMode) return;

    const goNext = () => {
      if (isLocked) return;
      if (currentSceneIndex >= sceneList.length - 1) return;

      const transitionIndex = currentSceneIndex;
      if (!transitions[transitionIndex]) {
        setCurrentSceneIndex((prev) => Math.min(prev + 1, sceneList.length - 1));
        return;
      }

      setPendingDirection(1);
      setIsLocked(true);
      setActiveTransitionIndex(transitionIndex);
      setPlayToken((v) => v + 1);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTypingContext =
        !!target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      if (isTypingContext) return;

      if (event.key === 'ArrowDown' || event.key === 'PageDown' || event.key === ' ') {
        event.preventDefault();
        goNext();
      }
      if (event.key === 'ArrowUp' || event.key === 'PageUp') {
        event.preventDefault();
      }
    };

    let observer: ReturnType<typeof ScrollTrigger.observe> | null = null;
    let touchStartY: number | null = null;

    const canHandleTarget = (target: EventTarget | null) => {
      const element = target instanceof HTMLElement ? target : null;
      if (!element) return true;
      return !element.closest('input, textarea, select, button, a');
    };

    const onWheel = (event: WheelEvent) => {
      if (!canHandleTarget(event.target)) return;
      event.preventDefault();
      if (Math.abs(event.deltaY) < 8) return;
      goNext();
    };

    const onTouchStart = (event: TouchEvent) => {
      if (!canHandleTarget(event.target)) return;
      touchStartY = event.changedTouches[0]?.clientY ?? null;
    };

    const onTouchMove = (event: TouchEvent) => {
      if (!canHandleTarget(event.target)) return;
      event.preventDefault();
    };

    const onTouchEnd = (event: TouchEvent) => {
      if (!canHandleTarget(event.target)) return;
      if (touchStartY === null) return;
      const currentY = event.changedTouches[0]?.clientY ?? touchStartY;
      const deltaY = touchStartY - currentY;
      touchStartY = null;
      if (Math.abs(deltaY) < 22) return;
      goNext();
    };

    window.addEventListener('keydown', onKeyDown);
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';

    if (isDesktop) {
      observer = ScrollTrigger.observe({
        target: window,
        type: 'wheel,touch,pointer',
        tolerance: 18,
        preventDefault: true,
        onDown: goNext,
        onUp: goNext,
      });
    } else {
      window.addEventListener('wheel', onWheel, { passive: false });
      window.addEventListener('touchstart', onTouchStart, { passive: false });
      window.addEventListener('touchmove', onTouchMove, { passive: false });
      window.addEventListener('touchend', onTouchEnd, { passive: false });
    }

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      document.body.style.overscrollBehavior = '';

      if (observer) {
        observer.kill();
      }

      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [currentSceneIndex, isDesktop, isLocked, sceneList.length, transitions, useCinematicMode]);

  const onTransitionEnded = () => {
    if (pendingDirection === 1) {
      setCurrentSceneIndex((prev) => Math.min(prev + 1, sceneList.length - 1));
    }

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        setActiveTransitionIndex(null);
        setIsLocked(false);
      });
    });
  };

  const renderScene = (scene: SceneBlock, isHero: boolean) => {
    const isContactScene = scene.id === 'final-contact';
    const floatingIdentity =
      scene.id === 'technology' ? (
        <aside className={`${styles.technologyIdentity} ${styles.technologyIdentityTech}`} aria-label={ui.technologyProfileAria}>
          <p className={styles.technologyKicker}>{ui.technologyExpertLabel}</p>
          <p className={styles.technologyName}>Jose Luis Escolá García</p>
          <Link
            className={styles.technologyLink}
            href="https://jlescola-projects-d68d54e5febb.herokuapp.com/"
            target="_blank"
            rel="noopener noreferrer"
          >
            {ui.profileLinkText}
          </Link>
        </aside>
      ) : scene.id === 'capital' ? (
        <aside
          className={`${styles.technologyIdentity} ${styles.technologyIdentityCapital}`}
          aria-label={ui.capitalProfileAria}
        >
          <p className={styles.technologyKicker}>{ui.capitalExpertLabel}</p>
          <p className={styles.technologyName}>Jose Luis Escolá Hernando</p>
        </aside>
      ) : null;

    return (
      <Scene
        key={scene.id}
        id={scene.id}
        priority={isHero}
        initialVisible={true}
        imageSrc={resolveImage(scene.image)}
        align={scene.align}
        eyebrow={isHero ? scene.eyebrow : undefined}
        title={scene.title}
        body={scene.body}
        bodySecondary={scene.bodySecondary}
        secondaryTitle={scene.secondaryTitle}
        secondaryBody={scene.secondaryBody}
        classNames={{
          scene: styles.scene,
          sceneMedia: styles.sceneMedia,
          overlay: styles.overlay,
          floatingLayer: styles.floatingLayer,
          contentGrid: styles.contentGrid,
          copyBlock: styles.copyBlock,
          copyBlockRight: styles.copyBlockRight,
          eyebrow: styles.eyebrow,
          title: styles.title,
          body: styles.body,
          bodySecondary: styles.bodySecondary,
          secondaryBlock: styles.secondaryBlock,
          secondaryTitle: styles.secondaryTitle,
          secondaryBody: styles.secondaryBody,
        }}
        floatingContent={floatingIdentity}
      >
        {isContactScene ? (
          <ContactForm
            locale={locale}
            title={contact.title}
            fields={contact.fields}
            cta={contact.cta}
            classNames={{
              card: styles.contactCard,
              row: styles.fieldRow,
              field: styles.field,
              submit: styles.submitButton,
            }}
          />
        ) : null}
      </Scene>
    );
  };

  const activeScene = sceneList[currentSceneIndex];

  const renderMobileStack = () => {
    return (
      <MobileScrubStack
        sceneLayers={sceneList.map((scene) => renderScene(scene, scene.id === hero.id))}
        frameSequences={transitions.map((transition) => resolveFrameSequence(transition.video))}
        posterSrcs={transitions.map((transition) => resolveImage(transition.poster))}
      />
    );
  };

  const onUpButtonClick = () => {
    if (!useCinematicMode) return;
    if (activeTransitionIndex !== null) return;
    if (isLocked) return;
    if (currentSceneIndex <= 0) return;
    triggerPrevScene();
  };

  return (
    <div className={styles.viewport}>
      <div className={styles.topBar}>
        <div className={styles.topBarInner}>
          <LanguageSwitcher
            label={languageLabel}
            text={switchToText}
            href={switchToHref}
            classNameLabel={styles.langLabel}
            classNameLink={styles.langLink}
          />
        </div>
      </div>

      {useCinematicMode ? (
        <div className={styles.desktopStage} ref={sceneContainerRef}>
          <div className={`${styles.manualFadeLayer} ${isManualFading ? 'isVisible' : ''}`.trim()} />
          {renderScene(activeScene, currentSceneIndex === 0)}
          {activeTransitionIndex !== null ? (
            <div className={styles.transitionFixedLayer}>
              <TransitionVideo
                key={`${activeTransitionIndex}-${playToken}`}
                id={`transition-${activeTransitionIndex}`}
                reducedMotion={false}
                videoSrc={resolveVideo(transitions[activeTransitionIndex].video)}
                posterSrc={resolveImage(sceneList[currentSceneIndex].image)}
                onEnded={onTransitionEnded}
                classNames={{
                  transition: styles.transition,
                  video: styles.transitionVideo,
                  overlay: styles.transitionOverlay,
                }}
              />
            </div>
          ) : null}
          {currentSceneIndex > 0 ? (
            <button className={styles.upButton} type="button" aria-label={ui.previousSceneAria} onClick={onUpButtonClick}>
              ↑
            </button>
          ) : null}
        </div>
      ) : useMobileStackMode ? (
        <div className={styles.track}>
          {renderMobileStack()}
        </div>
      ) : (
        <div className={styles.track}>
          {sceneList.map((scene) => (
            <div key={scene.id}>{renderScene(scene, scene.id === hero.id)}</div>
          ))}
        </div>
      )}
    </div>
  );
}

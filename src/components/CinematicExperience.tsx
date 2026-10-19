'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Link from 'next/link';
import Image from 'next/image';

import styles from '@/components/CinematicExperience.module.css';
import { Scene } from '@/components/Scene';
import { TransitionVideo } from '@/components/TransitionVideo';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { ContactForm } from '@/components/ContactForm';
import { resolveFrameSequence, resolveImage, resolveVideo, type SceneBlock, type TransitionBlock } from '@/lib/content';
import type { Locale } from '@/lib/i18n';
import { MobileScrubStack } from '@/components/MobileScrubStack';

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

gsap.registerPlugin(ScrollTrigger);

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
  const mobileFrames = useMemo(() => transitions.map(transition => resolveFrameSequence(transition.video)), [transitions]);
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
        frameSequences={mobileFrames}
        loadingLabel={locale === 'es' ? 'Preparando la animación' : 'Preparing the animation'}
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
          {sceneList[currentSceneIndex + 1] ? <div hidden aria-hidden="true">
            <Image src={resolveImage(sceneList[currentSceneIndex + 1].image)} alt="" fill sizes="100vw" loading="eager" />
          </div> : null}
          {transitions[currentSceneIndex] && activeTransitionIndex === null ? (
            <video key={currentSceneIndex} hidden aria-hidden="true" muted playsInline preload="auto"
              src={resolveVideo(transitions[currentSceneIndex].video)} />
          ) : null}
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

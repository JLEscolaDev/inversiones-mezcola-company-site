'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Link from 'next/link';

import styles from '@/components/CinematicExperience.module.css';
import { Scene } from '@/components/Scene';
import { TransitionVideo } from '@/components/TransitionVideo';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { ContactForm } from '@/components/ContactForm';
import { resolveImage, resolveVideo, type SceneBlock, type TransitionBlock } from '@/lib/content';
import type { Locale } from '@/lib/i18n';

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
  const [reducedMotion, setReducedMotion] = useState(false);
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [activeTransitionIndex, setActiveTransitionIndex] = useState<number | null>(null);
  const [playToken, setPlayToken] = useState(0);
  const [pendingDirection, setPendingDirection] = useState<1 | -1>(1);
  const [isLocked, setIsLocked] = useState(false);
  const [isManualFading, setIsManualFading] = useState(false);
  const sceneContainerRef = useRef<HTMLDivElement | null>(null);

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

    const update = () => {
      setReducedMotion(reduced.matches);
    };

    update();
    reduced.addEventListener('change', update);

    return () => {
      reduced.removeEventListener('change', update);
    };
  }, []);

  useEffect(() => {
    const target = sceneContainerRef.current;
    if (!target || reducedMotion) return;

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
  }, [currentSceneIndex, reducedMotion]);

  useEffect(() => {
    if (reducedMotion) return;

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

    const observer = ScrollTrigger.observe({
      target: window,
      type: 'wheel,touch,pointer',
      tolerance: 18,
      preventDefault: true,
      // Different devices/browsers report scroll/swipe direction differently.
      // Treat both vertical directions as "next" to keep step navigation reliable.
      onDown: goNext,
      onUp: goNext,
      // Disable accidental up-scroll jumps; previous section uses explicit UI control.
    });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowDown' || event.key === 'PageDown' || event.key === ' ') {
        event.preventDefault();
        goNext();
      }
      if (event.key === 'ArrowUp' || event.key === 'PageUp') {
        event.preventDefault();
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      observer.kill();
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [currentSceneIndex, isLocked, reducedMotion, sceneList.length, transitions]);

  const onTransitionEnded = () => {
    if (pendingDirection === 1) {
      setCurrentSceneIndex((prev) => Math.min(prev + 1, sceneList.length - 1));
    }

    // Avoid a black/frame flash by keeping the transition layer mounted
    // for a couple frames while the next scene paints.
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

  const onUpButtonClick = () => {
    if (reducedMotion) return;
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

      {!reducedMotion ? (
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

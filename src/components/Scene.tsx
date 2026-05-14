import Image from 'next/image';

type Props = {
  id: string;
  imageSrc: string;
  eyebrow?: string;
  title: string;
  body: string;
  bodySecondary?: string;
  secondaryTitle?: string;
  secondaryBody?: string;
  align?: 'left' | 'right';
  priority?: boolean;
  initialVisible?: boolean;
  classNames: {
    scene: string;
    sceneMedia: string;
    overlay: string;
    floatingLayer: string;
    contentGrid: string;
    copyBlock: string;
    eyebrow: string;
    title: string;
    body: string;
    bodySecondary: string;
    secondaryBlock: string;
    secondaryTitle: string;
    secondaryBody: string;
    copyBlockRight: string;
  };
  floatingContent?: React.ReactNode;
  children?: React.ReactNode;
};

export function Scene({
  id,
  imageSrc,
  eyebrow,
  title,
  body,
  bodySecondary,
  secondaryTitle,
  secondaryBody,
  align = 'left',
  priority = false,
  initialVisible = false,
  classNames,
  floatingContent,
  children,
}: Props) {
  return (
    <section id={id} className={`${classNames.scene} js-scene`} data-scene={id} aria-label={title}>
      <div className={classNames.sceneMedia}>
        <Image
          src={imageSrc}
          alt=""
          fill
          priority={priority}
          sizes="100vw"
          className="js-scene-image"
        />
      </div>
      <div className={classNames.overlay} />
      {floatingContent ? <div className={classNames.floatingLayer}>{floatingContent}</div> : null}
      <div className={classNames.contentGrid}>
        <article
          className={`${classNames.copyBlock} ${align === 'right' ? classNames.copyBlockRight : ''} js-scene-copy ${initialVisible ? 'js-initial-visible' : ''}`}
        >
          {eyebrow ? <span className={classNames.eyebrow}>{eyebrow}</span> : null}
          <h2 className={classNames.title}>{title}</h2>
          <p className={classNames.body}>{body}</p>
          {bodySecondary ? <p className={classNames.bodySecondary}>{bodySecondary}</p> : null}
          {secondaryTitle || secondaryBody ? (
            <div className={classNames.secondaryBlock}>
              {secondaryTitle ? <h3 className={classNames.secondaryTitle}>{secondaryTitle}</h3> : null}
              {secondaryBody ? <p className={classNames.secondaryBody}>{secondaryBody}</p> : null}
            </div>
          ) : null}
          {children}
        </article>
      </div>
    </section>
  );
}

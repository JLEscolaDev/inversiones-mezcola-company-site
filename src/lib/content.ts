import { assets, type FrameSequence, type ImageKey, type VideoKey } from '@/lib/assets';
import type { Locale } from '@/lib/i18n';

export type SceneTone = 'mystery' | 'revelation' | 'ascent' | 'arrival' | 'precision' | 'systems' | 'power' | 'closure';

export type SceneBlock = {
  id: string;
  image: ImageKey;
  eyebrow?: string;
  title: string;
  body: string;
  bodySecondary?: string;
  secondaryTitle?: string;
  secondaryBody?: string;
  tone: SceneTone;
  align?: 'left' | 'right';
};

export type TransitionBlock = {
  id: string;
  video: VideoKey;
  poster: ImageKey;
};

type LocalizedContent = {
  navLabel: string;
  switchTo: string;
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

const transitions: TransitionBlock[] = [
  { id: 't-forest-lake', video: 'forestToLake', poster: 'lake' },
  { id: 't-lake-waterfall', video: 'lakeToWaterfall', poster: 'waterfall' },
  { id: 't-waterfall-house', video: 'waterfallToHouse', poster: 'house' },
  { id: 't-house-room1', video: 'houseToRoom1', poster: 'room1' },
  { id: 't-room1-room2', video: 'room1ToRoom2', poster: 'room2' },
  { id: 't-room2-room3', video: 'room2ToRoom3', poster: 'room3' },
  { id: 't-room3-final', video: 'room3ToFinal', poster: 'finalDesk' },
];

const contentByLocale: Record<Locale, LocalizedContent> = {
  es: {
    navLabel: 'Idioma',
    switchTo: 'EN',
    switchToHref: '/en',
    ui: {
      previousSceneAria: 'Ir a la sección anterior',
      technologyProfileAria: 'Perfil tecnológico',
      capitalProfileAria: 'Perfil de patrimonio y empresa',
      technologyExpertLabel: 'Experto en tecnología',
      capitalExpertLabel: 'Experto en gestión de patrimonio y asesoría empresarial',
      profileLinkText: 'Ver perfil y proyectos',
    },
    hero: {
      id: 'forest-hero',
      image: 'forest',
      title: 'INVERSIONES MEZCOLÁ SL',
      body: 'Asesoría estratégica · Consultoría · Crecimiento empresarial',
      tone: 'mystery',
    },
    scenes: [
      {
        id: 'lake',
        image: 'lake',
        title: 'La perspectiva que cambia todo.',
        body: 'Claridad para decidir. Altura para crecer.',
        tone: 'revelation',
      },
      {
        id: 'waterfall',
        image: 'waterfall',
        title: 'Ascenso con intención.',
        body: 'Cada paso suma precisión, enfoque y serenidad estratégica.',
        tone: 'ascent',
      },
      {
        id: 'house',
        image: 'house',
        title: 'ESCOLÁ ES SINÓNIMO DE EXCELENCIA',
        body: 'Escalamos negocios hacia una visión más clara del futuro.',
        bodySecondary: 'Donde otros ven complejidad, nosotros construimos perspectiva.',
        tone: 'arrival',
      },
      {
        id: 'financial',
        image: 'room1',
        title: 'Consultoría Financiera',
        body: 'Ofrecemos asesoramiento financiero estratégico para impulsar el crecimiento de tu negocio.',
        tone: 'precision',
      },
      {
        id: 'technology',
        image: 'room2',
        title: 'Innovación tecnológica, producto e IA',
        body: 'Sistemas digitales, aplicaciones móviles y transición hacia modelos autónomos con inteligencia artificial.',
        bodySecondary:
          'Definimos arquitecturas para sistemas complejos, entornos escalables y experiencias digitales preparadas para el futuro del producto.',
        tone: 'systems',
        align: 'right',
      },
      {
        id: 'capital',
        image: 'room3',
        title: 'Gestión de Capital y Bienes Raíces',
        body: 'Optimizamos la gestión de activos financieros y bienes raíces para maximizar rentabilidad con criterio, discreción y visión a largo plazo.',
        secondaryTitle: 'Asesoría Empresarial',
        secondaryBody:
          'Brindamos soluciones integrales y personalizadas para potenciar el emprendimiento, la toma de decisiones y el éxito empresarial.',
        tone: 'power',
      },
      {
        id: 'final-contact',
        image: 'finalDesk',
        title: 'Hablemos.',
        body: 'La confianza se construye con criterio, método y ejecución impecable.',
        tone: 'closure',
      },
    ],
    transitions,
    contact: {
      title: '',
      fields: {
        name: 'Nombre',
        company: 'Empresa',
        email: 'Correo',
        message: 'Mensaje',
      },
      cta: 'Enviar',
    },
  },
  en: {
    navLabel: 'Language',
    switchTo: 'ES',
    switchToHref: '/es',
    ui: {
      previousSceneAria: 'Go to previous section',
      technologyProfileAria: 'Technology profile',
      capitalProfileAria: 'Wealth and business profile',
      technologyExpertLabel: 'Expert in technology',
      capitalExpertLabel: 'Expert in wealth management and business advisory',
      profileLinkText: 'View profile and projects',
    },
    hero: {
      id: 'forest-hero',
      image: 'forest',
      title: 'INVERSIONES MEZCOLÁ SL',
      body: 'Strategic advisory · Consulting · Business growth',
      tone: 'mystery',
    },
    scenes: [
      {
        id: 'lake',
        image: 'lake',
        title: 'The perspective that changes everything.',
        body: 'Clarity to decide. Height to grow.',
        tone: 'revelation',
      },
      {
        id: 'waterfall',
        image: 'waterfall',
        title: 'Ascent with intention.',
        body: 'Every movement adds precision, focus, and strategic calm.',
        tone: 'ascent',
      },
      {
        id: 'house',
        image: 'house',
        title: 'ESCOLÁ MEANS EXCELLENCE',
        body: 'We scale businesses toward a clearer vision of the future.',
        bodySecondary: 'Where others see complexity, we build perspective.',
        tone: 'arrival',
      },
      {
        id: 'financial',
        image: 'room1',
        title: 'Financial consulting',
        body: 'We provide strategic financial advisory to accelerate your business growth.',
        tone: 'precision',
      },
      {
        id: 'technology',
        image: 'room2',
        title: 'Technology innovation, product and AI',
        body: 'Digital systems, mobile applications and transition toward autonomous AI-powered models.',
        bodySecondary:
          'We define architectures for complex systems, scalable environments, and digital experiences designed for the future of product.',
        tone: 'systems',
        align: 'right',
      },
      {
        id: 'capital',
        image: 'room3',
        title: 'Capital and Real Estate Management',
        body: 'We optimize financial assets and real estate management to maximize returns with discipline, discretion, and long-term vision.',
        secondaryTitle: 'Business Advisory',
        secondaryBody:
          'We deliver integrated and tailored solutions to strengthen entrepreneurship, decision-making, and business success.',
        tone: 'power',
      },
      {
        id: 'final-contact',
        image: 'finalDesk',
        title: 'Let’s talk.',
        body: 'Trust is built through criteria, method, and disciplined execution.',
        tone: 'closure',
      },
    ],
    transitions,
    contact: {
      title: '',
      fields: {
        name: 'Name',
        company: 'Company',
        email: 'Email',
        message: 'Message',
      },
      cta: 'Send',
    },
  },
};

export function getLocaleContent(locale: Locale): LocalizedContent {
  return contentByLocale[locale];
}

export function resolveImage(key: ImageKey): string {
  return assets.images[key];
}

export function resolveVideo(key: VideoKey): string {
  return assets.videos[key];
}

export function resolveFrameSequence(key: VideoKey): FrameSequence {
  return assets.frames[key];
}

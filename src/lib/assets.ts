import mobileMotion from './mobile-motion.json';

export const assets = {
  images: {
    forest: '/images/Photo1Forest.png',
    lake: '/images/Photo2Lake.png',
    waterfall: '/images/Photo3Waterfall.png',
    house: '/images/Photo4House.png',
    room1: '/images/Photo5Room1.png',
    room2: '/images/Photo6Room2.png',
    room3: '/images/Photo7Room3.png',
    finalDesk: '/images/Photo8TableAndPaper.png',
  },

  videos: {
    forestToLake: '/videos-web-v1/Transition1ForestToLake.mp4',
    lakeToWaterfall: '/videos-web-v1/Transition2LakeToWaterfall.mp4',
    waterfallToHouse: '/videos-web-v1/Transition3WaterfallToHouse.mp4',
    houseToRoom1: '/videos-web-v1/Transition4HouseToRoom1.mp4',
    room1ToRoom2: '/videos-web-v1/Transition5Room1ToRoom2Wall.mp4',
    room2ToRoom3: '/videos-web-v1/Transition6Room2ToRoom3ThroughAir.mp4',
    room3ToFinal: '/videos-web-v1/Transition7Room3ToFinalOfficePaper.mp4',
  },

  frames: {
    forestToLake: { count: 92, motion: mobileMotion.forestToLake },
    lakeToWaterfall: { count: 92, motion: mobileMotion.lakeToWaterfall },
    waterfallToHouse: { count: 92, motion: mobileMotion.waterfallToHouse },
    houseToRoom1: { count: 92, motion: mobileMotion.houseToRoom1 },
    room1ToRoom2: { count: 127, motion: mobileMotion.room1ToRoom2 },
    room2ToRoom3: { count: 184, motion: mobileMotion.room2ToRoom3 },
    room3ToFinal: { count: 92, motion: mobileMotion.room3ToFinal },
  },
} as const;

export type ImageKey = keyof typeof assets.images;
export type VideoKey = keyof typeof assets.videos;
export type FrameSequence = (typeof assets.frames)[VideoKey];

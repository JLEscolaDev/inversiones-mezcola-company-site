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
    forestToLake: '/videos/Transition1ForestToLake.mp4',
    lakeToWaterfall: '/videos/Transition2LakeToWaterfall.mp4',
    waterfallToHouse: '/videos/Transition3WaterfallToHouse.mp4',
    houseToRoom1: '/videos/Transition4HouseToRoom1.mp4',
    room1ToRoom2: '/videos/Transition5Room1ToRoom2Wall.mp4',
    room2ToRoom3: '/videos/Transition6Room2ToRoom3ThroughAir.mp4',
    room3ToFinal: '/videos/Transition7Room3ToFinalOfficePaper.mp4',
  },

  frames: {
    forestToLake: { basePath: '/sprites-mobile-v2/forestToLake', count: 92, sheetCount: 23, frameWidth: 1080, frameHeight: 608, columns: 2, rows: 2 },
    lakeToWaterfall: { basePath: '/sprites-mobile-v2/lakeToWaterfall', count: 92, sheetCount: 23, frameWidth: 1080, frameHeight: 608, columns: 2, rows: 2 },
    waterfallToHouse: { basePath: '/sprites-mobile-v2/waterfallToHouse', count: 92, sheetCount: 23, frameWidth: 1080, frameHeight: 608, columns: 2, rows: 2 },
    houseToRoom1: { basePath: '/sprites-mobile-v2/houseToRoom1', count: 92, sheetCount: 23, frameWidth: 1080, frameHeight: 608, columns: 2, rows: 2 },
    room1ToRoom2: { basePath: '/sprites-mobile-v2/room1ToRoom2', count: 127, sheetCount: 32, frameWidth: 1080, frameHeight: 608, columns: 2, rows: 2 },
    room2ToRoom3: { basePath: '/sprites-mobile-v2/room2ToRoom3', count: 184, sheetCount: 46, frameWidth: 1080, frameHeight: 608, columns: 2, rows: 2 },
    room3ToFinal: { basePath: '/sprites-mobile-v2/room3ToFinal', count: 92, sheetCount: 23, frameWidth: 1080, frameHeight: 608, columns: 2, rows: 2 },
  },
} as const;

export type ImageKey = keyof typeof assets.images;
export type VideoKey = keyof typeof assets.videos;
export type FrameSequence = (typeof assets.frames)[VideoKey];

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
} as const;

export type ImageKey = keyof typeof assets.images;
export type VideoKey = keyof typeof assets.videos;

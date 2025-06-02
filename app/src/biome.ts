const BIOME_IDS = {
    OCEAN: 0, BEACH: 1, PLAINS: 2, FOREST: 3, DESERT: 4, MOUNTAINS: 5,
    SNOWY_PEAKS: 6, TAIGA: 7, JUNGLE: 8, BADLANDS: 9,
};
const BLOCK_TYPES = {
    AIR: 0, STONE: 1, GRASS: 2, DIRT: 3, WATER: 9, SAND: 12, SANDSTONE: 13,
    SNOW_BLOCK: 14, ICE: 15, WOOD_LOG: 17, LEAVES: 18, GRAVEL: 19, CLAY: 82,
    TERRACOTTA_RED: 159,
};
const BiomeData = {
    [BIOME_IDS.OCEAN]: { id: BIOME_IDS.OCEAN, name: "Ocean", primaryBlock: BLOCK_TYPES.WATER, secondaryBlock: BLOCK_TYPES.SAND, stoneBlock: BLOCK_TYPES.STONE, soilDepth: 3, baseHeightOffset: -30, heightVariation: 5, },
    [BIOME_IDS.BEACH]: { id: BIOME_IDS.BEACH, name: "Beach", primaryBlock: BLOCK_TYPES.SAND, secondaryBlock: BLOCK_TYPES.SAND, stoneBlock: BLOCK_TYPES.SANDSTONE, soilDepth: 4, baseHeightOffset: 1, heightVariation: 1, },
    [BIOME_IDS.PLAINS]: { id: BIOME_IDS.PLAINS, name: "Plains", primaryBlock: BLOCK_TYPES.GRASS, secondaryBlock: BLOCK_TYPES.DIRT, stoneBlock: BLOCK_TYPES.STONE, soilDepth: 3, baseHeightOffset: 2, heightVariation: 5, },
    [BIOME_IDS.FOREST]: { id: BIOME_IDS.FOREST, name: "Forest", primaryBlock: BLOCK_TYPES.GRASS, secondaryBlock: BLOCK_TYPES.DIRT, stoneBlock: BLOCK_TYPES.STONE, soilDepth: 4, baseHeightOffset: 4, heightVariation: 10, },
    [BIOME_IDS.DESERT]: { id: BIOME_IDS.DESERT, name: "Desert", primaryBlock: BLOCK_TYPES.SAND, secondaryBlock: BLOCK_TYPES.SAND, stoneBlock: BLOCK_TYPES.SANDSTONE, soilDepth: 5, baseHeightOffset: 2, heightVariation: 3, },
    [BIOME_IDS.MOUNTAINS]: { id: BIOME_IDS.MOUNTAINS, name: "Mountains", primaryBlock: BLOCK_TYPES.STONE, secondaryBlock: BLOCK_TYPES.STONE, stoneBlock: BLOCK_TYPES.STONE, soilDepth: 1, baseHeightOffset: 30, heightVariation: 50, },
    [BIOME_IDS.SNOWY_PEAKS]: { id: BIOME_IDS.SNOWY_PEAKS, name: "Snowy Peaks", primaryBlock: BLOCK_TYPES.SNOW_BLOCK, secondaryBlock: BLOCK_TYPES.STONE, stoneBlock: BLOCK_TYPES.STONE, soilDepth: 2, baseHeightOffset: 40, heightVariation: 40, },
    [BIOME_IDS.TAIGA]: { id: BIOME_IDS.TAIGA, name: "Taiga", primaryBlock: BLOCK_TYPES.GRASS, secondaryBlock: BLOCK_TYPES.DIRT, stoneBlock: BLOCK_TYPES.STONE, soilDepth: 3, baseHeightOffset: 3, heightVariation: 8, },
    [BIOME_IDS.JUNGLE]: { id: BIOME_IDS.JUNGLE, name: "Jungle", primaryBlock: BLOCK_TYPES.GRASS, secondaryBlock: BLOCK_TYPES.DIRT, stoneBlock: BLOCK_TYPES.STONE, soilDepth: 5, baseHeightOffset: 5, heightVariation: 20, },
    [BIOME_IDS.BADLANDS]: { id: BIOME_IDS.BADLANDS, name: "Badlands", primaryBlock: BLOCK_TYPES.TERRACOTTA_RED, secondaryBlock: BLOCK_TYPES.SAND, stoneBlock: BLOCK_TYPES.STONE, soilDepth: 10, baseHeightOffset: 10, heightVariation: 25, },
};
export { BIOME_IDS, BLOCK_TYPES, BiomeData};
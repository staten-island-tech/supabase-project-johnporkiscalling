import { Noise } from "./noise";
import { Random } from "./utils";

const BLOCK_TYPES = {
    AIR: 0,
    STONE: 1,
    DIRT: 2,
    GRASS: 3,
    SAND: 4,
    WATER: 5,
    SNOW: 6,
    ICE: 7,
    COAL_ORE: 8,
    IRON_ORE: 9,
    GOLD_ORE: 10,
    DIAMOND_ORE: 11,
    BEDROCK: 12,
    CLAY: 13,
    GRAVEL: 14,
    OBSIDIAN: 15
};

const BIOMES = {
    PLAINS: 0,
    DESERT: 1,
    MOUNTAINS: 2,
    FOREST: 3,
    TUNDRA: 4,
    OCEAN: 5,
    SWAMP: 6,
    SAVANNA: 7
};

// Biome configuration for better terrain variety
const BIOME_CONFIG = {
    [BIOMES.PLAINS]: { baseHeight: 64, variation: 8, surfaceBlock: BLOCK_TYPES.GRASS, subBlock: BLOCK_TYPES.DIRT },
    [BIOMES.DESERT]: { baseHeight: 62, variation: 12, surfaceBlock: BLOCK_TYPES.SAND, subBlock: BLOCK_TYPES.SAND },
    [BIOMES.MOUNTAINS]: { baseHeight: 80, variation: 40, surfaceBlock: BLOCK_TYPES.STONE, subBlock: BLOCK_TYPES.STONE },
    [BIOMES.FOREST]: { baseHeight: 66, variation: 10, surfaceBlock: BLOCK_TYPES.GRASS, subBlock: BLOCK_TYPES.DIRT },
    [BIOMES.TUNDRA]: { baseHeight: 68, variation: 6, surfaceBlock: BLOCK_TYPES.SNOW, subBlock: BLOCK_TYPES.DIRT },
    [BIOMES.OCEAN]: { baseHeight: 45, variation: 5, surfaceBlock: BLOCK_TYPES.SAND, subBlock: BLOCK_TYPES.CLAY },
    [BIOMES.SWAMP]: { baseHeight: 60, variation: 4, surfaceBlock: BLOCK_TYPES.GRASS, subBlock: BLOCK_TYPES.CLAY },
    [BIOMES.SAVANNA]: { baseHeight: 65, variation: 8, surfaceBlock: BLOCK_TYPES.GRASS, subBlock: BLOCK_TYPES.DIRT }
};

export class TerrainGenerator extends Random {
    heightNoise: Noise;
    biomeNoise: Noise;
    temperatureNoise: Noise;
    humidityNoise: Noise;
    caveNoise: Noise;
    riverNoise: Noise;
    oreNoise: Noise;
    detailNoise: Noise;
    erosionNoise: Noise;
    ridgeNoise: Noise;

    constructor(seed: number) {
        super(seed);
        this.heightNoise = new Noise(this.lcg());
        this.biomeNoise = new Noise(this.lcg());
        this.temperatureNoise = new Noise(this.lcg());
        this.humidityNoise = new Noise(this.lcg());
        this.caveNoise = new Noise(this.lcg());
        this.riverNoise = new Noise(this.lcg());
        this.oreNoise = new Noise(this.lcg());
        this.detailNoise = new Noise(this.lcg());
        this.erosionNoise = new Noise(this.lcg());
        this.ridgeNoise = new Noise(this.lcg());
    }

    generateChunkData(chunkX: number, chunkZ: number): {data: Map<number, Uint8Array>; maxChunkY: number} {
        const data: Map<number, Uint8Array> = new Map();
        
        // Pre-compute maps for better performance
        const heightMap = this.generateHeightMap(chunkX, chunkZ);
        const biomeMap = this.generateBiomeMap(chunkX, chunkZ);
        const erosionMap = this.generateErosionMap(chunkX, chunkZ);
        
        const maxHeight = Math.max(...heightMap);
        const maxChunkY = Math.floor(maxHeight / 16) + 2; // Extra buffer for features
        
        // Generate each Y chunk section
        for (let chunkY = 0; chunkY <= maxChunkY; chunkY++) {
            const chunkBlocks = this.generateChunkSection(chunkX, chunkY, chunkZ, heightMap, biomeMap, erosionMap);
            if (chunkBlocks.some(block => block !== BLOCK_TYPES.AIR)) {
                data.set(chunkY, chunkBlocks);
            }
        }
        
        return {data, maxChunkY};
    }

    generateChunkSection(
        chunkX: number, 
        chunkY: number, 
        chunkZ: number, 
        heightMap: Uint8Array, 
        biomeMap: Uint8Array,
        erosionMap: Float32Array
    ): Uint8Array {
        const blocks = new Uint8Array(4096);
        const worldX = chunkX * 16;
        const worldY = chunkY * 16;
        const worldZ = chunkZ * 16;
        
        for (let x = 0; x < 16; x++) {
            for (let z = 0; z < 16; z++) {
                const localIndex = x * 16 + z;
                const surfaceHeight = heightMap[localIndex];
                const biome = biomeMap[localIndex];
                const erosion = erosionMap[localIndex];
                const absX = worldX + x;
                const absZ = worldZ + z;
                
                for (let y = 0; y < 16; y++) {
                    const absY = worldY + y;
                    const blockIndex = x + 16 * (y + 16 * z);
                    
                    blocks[blockIndex] = this.getBlockAtPosition(absX, absY, absZ, surfaceHeight, biome, erosion);
                }
            }
        }
        
        return blocks;
    }

    private getBlockAtPosition(x: number, y: number, z: number, surfaceHeight: number, biome: number, erosion: number): number {
        // Early exit for high altitude
        if (y > surfaceHeight + 10) return BLOCK_TYPES.AIR;
        
        // Bedrock layer with some variation
        if (y <= 1 + Math.floor(this.detailNoise.simplex(x * 0.1, z * 0.1) * 3)) {
            return BLOCK_TYPES.BEDROCK;
        }
        
        // Cave generation with improved 3D noise
        if (this.isCave(x, y, z)) {
            // Lava lakes in deep caves
            if (y < 12 && this.detailNoise.simplex3(x * 0.05, y * 0.05, z * 0.05) > 0.6) {
                return BLOCK_TYPES.OBSIDIAN; // Placeholder for lava
            }
            return BLOCK_TYPES.AIR;
        }
        
        // Water level and ocean generation
        const waterLevel = 62;
        if (y <= waterLevel && biome === BIOMES.OCEAN) {
            return y <= waterLevel - 3 ? this.getOceanFloorBlock(y) : BLOCK_TYPES.WATER;
        }
        
        // River generation
        if (y <= surfaceHeight + 2 && this.isRiver(x, z)) {
            return y <= surfaceHeight - 1 ? BLOCK_TYPES.GRAVEL : BLOCK_TYPES.WATER;
        }
        
        // Terrain generation based on depth from surface
        const depthFromSurface = surfaceHeight - y;
        
        // Surface layer
        if (depthFromSurface <= 0) {
            return this.getSurfaceBlock(biome, y, surfaceHeight, erosion);
        }
        
        // Subsurface layers
        if (depthFromSurface <= 1) {
            return this.getSubsurfaceBlock(biome, depthFromSurface);
        }
        
        // Deep layers with ore generation
        return this.getDeepLayerBlock(x, y, z, biome, depthFromSurface);
    }

    private getSurfaceBlock(biome: number, y: number, surfaceHeight: number, erosion: number): number {
        const config = BIOME_CONFIG[biome];
        
        switch (biome) {
            case BIOMES.DESERT:
                return BLOCK_TYPES.SAND;
            case BIOMES.TUNDRA:
                return y > 120 ? BLOCK_TYPES.ICE : BLOCK_TYPES.SNOW;
            case BIOMES.MOUNTAINS:
                return y > 140 ? BLOCK_TYPES.SNOW : (y > 100 ? BLOCK_TYPES.STONE : BLOCK_TYPES.GRASS);
            case BIOMES.OCEAN:
                return BLOCK_TYPES.SAND;
            case BIOMES.SWAMP:
                return erosion > 0.3 ? BLOCK_TYPES.CLAY : BLOCK_TYPES.GRASS;
            default:
                return config.surfaceBlock;
        }
    }

    private getSubsurfaceBlock(biome: number, depth: number): number {
        const config = BIOME_CONFIG[biome];
        
        if (biome === BIOMES.DESERT || biome === BIOMES.OCEAN) {
            return depth <= 3 ? BLOCK_TYPES.SAND : BLOCK_TYPES.STONE;
        }
        
        return depth <= 4 ? config.subBlock : BLOCK_TYPES.STONE;
    }

    private getDeepLayerBlock(x: number, y: number, z: number, biome: number, depth: number): number {
        // Ore generation with realistic distribution
        const oreValue = this.oreNoise.simplex3(x * 0.08, y * 0.08, z * 0.08);
        const secondaryOre = this.detailNoise.simplex3(x * 0.12, y * 0.12, z * 0.12);
        
        // Diamond ore (very rare, deep only)
        if (y < 16 && oreValue > 0.85 && secondaryOre > 0.8) {
            return BLOCK_TYPES.DIAMOND_ORE;
        }
        
        // Gold ore (rare, medium depth)
        if (y < 32 && oreValue > 0.78 && secondaryOre > 0.7) {
            return BLOCK_TYPES.GOLD_ORE;
        }
        
        // Iron ore (common, various depths)
        if (y < 64 && oreValue > 0.65) {
            return BLOCK_TYPES.IRON_ORE;
        }
        
        // Coal ore (very common, near surface)
        if (y < 96 && oreValue > 0.6) {
            return BLOCK_TYPES.COAL_ORE;
        }
        
        // Gravel pockets
        if (depth > 10 && secondaryOre > 0.75) {
            return BLOCK_TYPES.GRAVEL;
        }
        
        return BLOCK_TYPES.STONE;
    }

    private getOceanFloorBlock(y: number): number {
        if (y < 30) return BLOCK_TYPES.STONE;
        if (y < 40) return BLOCK_TYPES.CLAY;
        return BLOCK_TYPES.SAND;
    }

    generateHeightMap(chunkX: number, chunkZ: number): Uint8Array {
        const heightMap = new Uint8Array(256);
        const worldX = chunkX * 16;
        const worldZ = chunkZ * 16;
        
        for (let x = 0; x < 16; x++) {
            for (let z = 0; z < 16; z++) {
                const absX = worldX + x;
                const absZ = worldZ + z;
                
                // Continental noise for large-scale terrain
                const continentalNoise = this.heightNoise.octaveNoise(
                    absX * 0.001, absZ * 0.001,
                    3, 0.5, 1.0, 1.0, 2.0,
                    (x, z) => this.heightNoise.simplex(x, z)
                );
                
                // Regional height variation
                const regionalNoise = this.heightNoise.octaveNoise(
                    absX * 0.005, absZ * 0.005,
                    4, 0.6, 0.8, 0.8, 2.0,
                    (x, z) => this.heightNoise.simplex(x, z)
                );
                
                // Local detail
                const localNoise = this.detailNoise.octaveNoise(
                    absX * 0.02, absZ * 0.02,
                    3, 0.4, 0.3, 0.3, 2.0,
                    (x, z) => this.detailNoise.simplex(x, z)
                );
                
                // Ridge generation for mountain ranges
                const ridgeNoise = this.createRidges(absX, absZ);
                
                // Combine all noise layers
                const baseHeight = 64;
                const continentalHeight = continentalNoise * 40;
                const regionalHeight = regionalNoise * 20;
                const localHeight = localNoise * 8;
                const ridgeHeight = ridgeNoise * 30;
                
                const finalHeight = baseHeight + continentalHeight + regionalHeight + localHeight + ridgeHeight;
                heightMap[x * 16 + z] = Math.max(5, Math.min(250, Math.floor(finalHeight)));
            }
        }
        
        return heightMap;
    }

    generateBiomeMap(chunkX: number, chunkZ: number): Uint8Array {
        const biomeMap = new Uint8Array(256);
        const worldX = chunkX * 16;
        const worldZ = chunkZ * 16;
        
        for (let x = 0; x < 16; x++) {
            for (let z = 0; z < 16; z++) {
                const absX = worldX + x;
                const absZ = worldZ + z;
                
                // Multi-scale temperature and humidity
                const temperature = this.temperatureNoise.octaveNoise(
                    absX * 0.002, absZ * 0.002,
                    3, 0.5, 1.0, 1.0, 2.0,
                    (x, z) => this.temperatureNoise.simplex(x, z)
                );
                
                const humidity = this.humidityNoise.octaveNoise(
                    absX * 0.002, absZ * 0.002,
                    3, 0.5, 1.0, 1.0, 2.0,
                    (x, z) => this.humidityNoise.simplex(x, z)
                );
                
                // Altitude affects temperature
                const height = this.heightNoise.simplex(absX * 0.005, absZ * 0.005);
                const adjustedTemp = temperature - (height * 0.3);
                
                biomeMap[x * 16 + z] = this.determineBiome(adjustedTemp, humidity, height);
            }
        }
        
        return biomeMap;
    }

    generateErosionMap(chunkX: number, chunkZ: number): Float32Array {
        const erosionMap = new Float32Array(256);
        const worldX = chunkX * 16;
        const worldZ = chunkZ * 16;
        
        for (let x = 0; x < 16; x++) {
            for (let z = 0; z < 16; z++) {
                const absX = worldX + x;
                const absZ = worldZ + z;
                
                const erosion = this.erosionNoise.octaveNoise(
                    absX * 0.003, absZ * 0.003,
                    4, 0.5, 1.0, 1.0, 2.0,
                    (x, z) => this.erosionNoise.simplex(x, z)
                );
                
                erosionMap[x * 16 + z] = erosion;
            }
        }
        
        return erosionMap;
    }

    private determineBiome(temperature: number, humidity: number, elevation: number): number {
        // Ocean biome for low areas
        if (elevation < -0.3) return BIOMES.OCEAN;
        
        // Mountain biome for high elevation
        if (elevation > 0.4) return BIOMES.MOUNTAINS;
        
        // Temperature-humidity based biome selection
        if (temperature < -0.4) {
            return BIOMES.TUNDRA;
        } else if (temperature > 0.5) {
            if (humidity < -0.3) return BIOMES.DESERT;
            if (humidity > 0.3) return BIOMES.SWAMP;
            return BIOMES.SAVANNA;
        } else if (humidity > 0.2) {
            return BIOMES.FOREST;
        }
        
        return BIOMES.PLAINS;
    }

    private createRidges(x: number, z: number): number {
        // Use faster math operations
        const n1 = this.ridgeNoise.simplex(x * 0.003, z * 0.003);
        const n2 = this.ridgeNoise.simplex(x * 0.006 + 1000, z * 0.006 + 1000);
        const ridge1 = 1 - Math.abs(n1);
        const ridge2 = 1 - Math.abs(n2);
        return (ridge1 > ridge2 ? ridge1 : ridge2) * 0.8;
    }

    private isCave(x: number, y: number, z: number): boolean {
        if (y < 8 || y > 120) return false;
        
        // Multi-scale cave system
        const caveNoise1 = this.caveNoise.simplex3(x * 0.02, y * 0.02, z * 0.02);
        const caveNoise2 = this.caveNoise.simplex3(x * 0.03 + 100, y * 0.03, z * 0.03 + 100);
        const caveNoise3 = this.detailNoise.simplex3(x * 0.05, y * 0.05, z * 0.05);
        
        // Worm-like cave tunnels
        const tunnel1 = Math.abs(caveNoise1) < 0.12 && Math.abs(caveNoise2) < 0.08;
        const tunnel2 = Math.abs(caveNoise1) < 0.08 && Math.abs(caveNoise3) < 0.1;
        
        // Large caverns
        const cavern = caveNoise1 > 0.6 && caveNoise2 > 0.5 && y > 20 && y < 60;
        
        return tunnel1 || tunnel2 || cavern;
    }

    private isRiver(x: number, z: number): boolean {
        // Create more natural, winding rivers
        const riverNoise1 = this.riverNoise.simplex(x * 0.008, z * 0.008);
        const riverNoise2 = this.riverNoise.simplex(x * 0.015 + 500, z * 0.015 + 500);
        const riverWidth = 0.05 + Math.abs(this.detailNoise.simplex(x * 0.01, z * 0.01)) * 0.03;
        
        return Math.abs(riverNoise1 + riverNoise2 * 0.5) < riverWidth;
    }
}
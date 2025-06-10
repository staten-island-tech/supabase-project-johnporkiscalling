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
    BEDROCK: 10
};
const BIOMES = {
    PLAINS: 0,
    DESERT: 1,
    MOUNTAINS: 2,
    FOREST: 3,
    TUNDRA: 4,
    OCEAN: 5
};
export class TerrainGenerator extends Random {
    heightNoise: Noise;
    biomeNoise: Noise;
    caveNoise: Noise;
    riverNoise: Noise;
    oreNoise: Noise;
    detailNoise: Noise;

    constructor(seed: number) {
        super(seed);
        this.heightNoise = new Noise(this.lcg());
        this.biomeNoise = new Noise(this.lcg());
        this.caveNoise = new Noise(this.lcg());
        this.riverNoise = new Noise(this.lcg());
        this.oreNoise = new Noise (this.lcg());
        this.detailNoise = new Noise(this.lcg());
    }

    generateChunkData(chunkX: number, chunkZ: number): {data: Record<number, Uint8Array>; maxChunkY: number} 
    {
        const data: Record<number, Uint8Array> = []
        
        // Generate height and biome maps for this chunk
        const heightMap = this.baseHeightMap(chunkX, chunkZ);
        const biomeMap = this.biomeMap(chunkX, chunkZ);
        const maxHeight = Math.max(...heightMap);
        const maxChunkY = Math.floor(maxHeight / 16) + 1;
        
        // Generate each Y chunk section
        for (let chunkY = 0; chunkY <= maxChunkY; chunkY++) {
            const chunkBlocks = this.generateChunkSection(chunkX, chunkY, chunkZ, heightMap, biomeMap);
            if (chunkBlocks.some(block => block !== BLOCK_TYPES.AIR)) {
                data[chunkY] = chunkBlocks
            }
        }
        
        return {data, maxChunkY};
    }

    generateChunkSection(chunkX: number, chunkY: number, chunkZ: number, heightMap: Uint8Array, biomeMap: Uint8Array): Uint8Array {
        const blocks = new Uint8Array(4096); // 16x16x16 = 4096
        const worldX = chunkX * 16;
        const worldY = chunkY * 16;
        const worldZ = chunkZ * 16;
        
        for (let x = 0; x < 16; x++) {
            for (let z = 0; z < 16; z++) {
                const localIndex = x * 16 + z;
                const surfaceHeight = heightMap[localIndex];
                const biome = biomeMap[localIndex];
                const absX = worldX + x;
                const absZ = worldZ + z;
                
                for (let y = 0; y < 16; y++) {
                    const absY = worldY + y;
                    const blockIndex = x + 16 * (y + 16 * z); // y * 16 * 16 + z * 16 + x
                    
                    // Skip if above surface (unless water level)
                    if (absY > surfaceHeight + 5) {
                        blocks[blockIndex] = BLOCK_TYPES.AIR;
                        continue;
                    }
                    
                    // Bedrock layer
                    if (absY <= 2) {
                        blocks[blockIndex] = BLOCK_TYPES.BEDROCK;
                        continue;
                    }
                    
                    // Check for caves
                    if (this.isCave(absX, absY, absZ)) {
                        blocks[blockIndex] = BLOCK_TYPES.AIR;
                        continue;
                    }
                    
                    // Check for rivers (at surface level)
                    if (Math.abs(absY - surfaceHeight) <= 2 && this.isRiver(absX, absZ)) {
                        blocks[blockIndex] = BLOCK_TYPES.WATER;
                        continue;
                    }
                    
                    // Generate terrain based on height and biome
                    blocks[blockIndex] = this.getBlockType(absX, absY, absZ, surfaceHeight, biome);
                }
            }
        }
        
        return blocks;
    }

    baseHeightMap(chunkX: number, chunkZ: number): Uint8Array {
        const heightMap = new Uint8Array(256); // 16x16
        const worldX = chunkX * 16;
        const worldZ = chunkZ * 16;
        
        for (let x = 0; x < 16; x++) {
            for (let z = 0; z < 16; z++) {
                const absX = worldX + x;
                const absZ = worldZ + z;
                
                // Multi-octave noise for varied terrain
                const baseHeight = this.heightNoise.octaveNoise(
                    absX * 0.005, absZ * 0.005, // Low frequency for large features
                    4, 0.5, 0.5, 0.5, 2.0,
                    (x, z) => this.heightNoise.simplex(x, z)
                ) * 60 + 12; // Scale to 64-124 range
                
                // Add mountains
                const mountainHeight = this.mountainCreate(absX, absZ);
                
                // Final height
                const finalHeight = Math.max(0, Math.min(255, baseHeight + mountainHeight));
                heightMap[x * 16 + z] = Math.floor(finalHeight);
            }
        }
        
        return heightMap;
    }

    biomeMap(chunkX: number, chunkZ: number): Uint8Array {
        const biomeMap = new Uint8Array(256); // 16x16
        const worldX = chunkX * 16;
        const worldZ = chunkZ * 16;
        
        for (let x = 0; x < 16; x++) {
            for (let z = 0; z < 16; z++) {
                const absX = worldX + x;
                const absZ = worldZ + z;
                
                // Temperature and humidity maps
                const temperature = this.biomeNoise.simplex(absX * 0.003, absZ * 0.003);
                const humidity = this.biomeNoise.simplex(absX * 0.003 + 1000, absZ * 0.003 + 1000);
                
                // Determine biome based on temperature and humidity
                let biome = BIOMES.PLAINS;
                
                if (temperature < -0.3) {
                    biome = BIOMES.TUNDRA;
                } else if (temperature > 0.4 && humidity < -0.2) {
                    biome = BIOMES.DESERT;
                } else if (temperature > -0.1 && temperature < 0.3 && humidity > 0.2) {
                    biome = BIOMES.FOREST;
                } else if (temperature < 0.6 && this.isNearWater(absX, absZ)) {
                    biome = BIOMES.OCEAN;
                }
                
                biomeMap[x * 16 + z] = biome;
            }
        }
        
        return biomeMap;
    }

    riverCarve(x: number, z: number): boolean {
        // Create winding rivers using multiple octaves
        const riverNoise1 = this.riverNoise.simplex(x * 0.01, z * 0.01);
        const riverNoise2 = this.riverNoise.simplex(x * 0.02 + 100, z * 0.02 + 100);
        
        // Rivers follow noise valleys
        return Math.abs(riverNoise1) < 0.1 || Math.abs(riverNoise2) < 0.08;
    }

    mountainCreate(x: number, z: number): number {
        // Mountain regions using simplex noise
        const mountainMask = this.heightNoise.simplex(x * 0.002, z * 0.002);
        
        if (mountainMask > 0.3) {
            // Add height variation in mountain regions
            const mountainHeight = this.heightNoise.octaveNoise(
                x * 0.008, z * 0.008,
                6, 0.6, 1.0, 1.0, 2.0,
                (x, z) => this.heightNoise.simplex(x, z)
            ) * 80; // Up to 80 blocks additional height
            
            return mountainHeight * (mountainMask - 0.3) * 2; // Fade in mountains
        }
        
        return 0;
    }

    private getBlockType(x: number, y: number, z: number, surfaceHeight: number, biome: number): number {
        const depthFromSurface = surfaceHeight - y;
        
        // Surface blocks based on biome
        if (depthFromSurface <= 0) {
            switch (biome) {
                case BIOMES.DESERT:
                    return BLOCK_TYPES.SAND;
                case BIOMES.TUNDRA:
                    return y > 120 ? BLOCK_TYPES.SNOW : BLOCK_TYPES.GRASS;
                case BIOMES.OCEAN:
                    return y < surfaceHeight - 3 ? BLOCK_TYPES.SAND : BLOCK_TYPES.WATER;
                default:
                    return BLOCK_TYPES.GRASS;
            }
        }
        
        // Subsurface layers
        if (depthFromSurface <= 3) {
            return biome === BIOMES.DESERT ? BLOCK_TYPES.SAND : BLOCK_TYPES.DIRT;
        }
        
        // Check for ores in stone layer
        if (depthFromSurface > 3) {
            const oreChance = this.oreNoise.simplex3(x * 0.1, y * 0.1, z * 0.1);
            
            if (y < 16 && oreChance > 0.6) {
                return BLOCK_TYPES.IRON_ORE;
            } else if (y < 32 && oreChance > 0.7) {
                return BLOCK_TYPES.COAL_ORE;
            }
            
            return BLOCK_TYPES.STONE;
        }
        
        return BLOCK_TYPES.AIR;
    }

    private isCave(x: number, y: number, z: number): boolean {
        if (y < 8 || y > 120) return false; // No caves too high or low
        
        // 3D cave system using simplex noise
        const caveNoise1 = this.caveNoise.simplex3(x * 0.02, y * 0.02, z * 0.02);
        const caveNoise2 = this.caveNoise.simplex3(x * 0.03 + 100, y * 0.03, z * 0.03 + 100);
        
        // Caves where noise values are close to 0
        
        return (Math.abs(caveNoise1) < 0.15 && Math.abs(caveNoise2) < 0.1) ||
               (Math.abs(caveNoise1) < 0.1 && Math.abs(caveNoise2) < 0.15);
    }

    private isRiver(x: number, z: number): boolean {
        return this.riverCarve(x, z);
    }

    private isNearWater(x: number, z: number): boolean {
        // Simple check for ocean biome proximity
        const waterNoise = this.biomeNoise.simplex(x * 0.005, z * 0.005);
        return waterNoise < -0.4;
    }
}
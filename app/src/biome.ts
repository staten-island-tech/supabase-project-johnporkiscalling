export type BiomeName = "ocean" | "plains" | "mountains" | "desert" | "tundra" | "forest" | "swamp" | "river";

export interface Biome {
    name: BiomeName;
    baseHeight: number;
    heightVariation: number;
    temperature: [number, number]; // min, max
    humidity: [number, number];    // min, max
    continentalness: [number, number]; // min, max
    color: string; // For visualization
    blockTypes: {
        surface: string;
        subsurface: string;
        bedrock: string;
    };
}

export const BIOMES: Record<BiomeName, Biome> = {
    ocean: {
        name: "ocean",
        baseHeight: 0.2,
        heightVariation: 0.1,
        temperature: [0.2, 0.6],
        humidity: [0.7, 1.0],
        continentalness: [-1.0, 0.1],
        color: "#1a64d6",
        blockTypes: {
            surface: "water",
            subsurface: "sand",
            bedrock: "stone"
        }
    },
    plains: {
        name: "plains",
        baseHeight: 0.5,
        heightVariation: 0.2,
        temperature: [0.4, 0.8],
        humidity: [0.4, 0.7],
        continentalness: [0.1, 0.5],
        color: "#7cfc00",
        blockTypes: {
            surface: "grass_block",
            subsurface: "dirt",
            bedrock: "stone"
        }
    },
    mountains: {
        name: "mountains",
        baseHeight: 0.8,
        heightVariation: 0.5,
        temperature: [0.0, 0.6],
        humidity: [0.2, 0.7],
        continentalness: [0.5, 1.0],
        color: "#8b4513",
        blockTypes: {
            surface: "stone",
            subsurface: "stone",
            bedrock: "stone"
        }
    },
    desert: {
        name: "desert",
        baseHeight: 0.5,
        heightVariation: 0.2,
        temperature: [0.7, 1.0],
        humidity: [0.0, 0.2],
        continentalness: [0.1, 0.8],
        color: "#f5deb3",
        blockTypes: {
            surface: "sand",
            subsurface: "sandstone",
            bedrock: "stone"
        }
    },
    tundra: {
        name: "tundra",
        baseHeight: 0.5,
        heightVariation: 0.3,
        temperature: [0.0, 0.3],
        humidity: [0.3, 0.6],
        continentalness: [0.1, 0.8],
        color: "#f0f8ff",
        blockTypes: {
            surface: "snow_block",
            subsurface: "dirt",
            bedrock: "stone"
        }
    },
    forest: {
        name: "forest",
        baseHeight: 0.6,
        heightVariation: 0.3,
        temperature: [0.4, 0.7],
        humidity: [0.5, 0.9],
        continentalness: [0.1, 0.6],
        color: "#228b22",
        blockTypes: {
            surface: "grass_block",
            subsurface: "dirt",
            bedrock: "stone"
        }
    },
    swamp: {
        name: "swamp",
        baseHeight: 0.3,
        heightVariation: 0.2,
        temperature: [0.5, 0.8],
        humidity: [0.8, 1.0],
        continentalness: [0.0, 0.4],
        color: "#6b8e23",
        blockTypes: {
            surface: "grass_block",
            subsurface: "dirt",
            bedrock: "stone"
        }
    },
    river: {
        name: "river",
        baseHeight: 0.1,
        heightVariation: 0.1,
        temperature: [0.3, 0.8],
        humidity: [0.7, 1.0],
        continentalness: [-0.2, 0.3],
        color: "#1e90ff",
        blockTypes: {
            surface: "water",
            subsurface: "sand",
            bedrock: "stone"
        }
    }
};
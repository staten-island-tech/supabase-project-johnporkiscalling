interface TextureSize {
    width: number;
    height: number;
}
type AtlasData = {
    textureSize: TextureSize;
    frames: Record<string, TextureFrame>;
}
interface TextureFrame {
    x: number;
    y: number;
    w: number;
    h: number;
}
export type { AtlasData };
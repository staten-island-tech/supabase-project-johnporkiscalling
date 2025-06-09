//define a worker batch szie of hunks to operate off of 
//since each chunk section takes around 3ms for just tgen do for 4 chunks
//stay under 50ms so the max batch size should be 16 but 16 might be a bit too mcuh

import { TerrainGenerator } from "@/lib/workerscripts";
//gottta import the seed into here and then pass values into it

type WorkerMessage =
    {
        type: "generate",
        data:
        {
            seed: number;
            payload: Array<string>
        }
    }
type CD =
    {
        data: Record<string, Uint8Array>
        maxChunkY: number,
    }
self.onmessage = (e: MessageEvent<WorkerMessage>) => {
    const { type, data } = e.data;
    const tgen = new TerrainGenerator(data.seed);
    let results: Record<string, CD> = {};
    for (let r = 0; r < data.payload.length; r++) {
        let cords = data.payload[r].split(',').map(Number);
        results[data.payload[r]] = tgen.generateChunkData(cords[0], cords[1]);
    }
    self.postMessage({
        type: "a",
        data: results
    });
}

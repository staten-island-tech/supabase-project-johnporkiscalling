//define a worker batch szie of hunks to operate off of 
//since each chunk section takes around 3ms for just tgen do for 4 chunks
//stay under 50ms so the max batch size should be 16 but 16 might be a bit too mcuh

import { TerrainGenerator } from "@/lib/workerscripts";
//gottta import the seed into here and then pass values into it

type WorkerMessage =
{
    type: string,
    DATABUTUPPERCASE:
    {
        seed: number;
        payload: Array<string>
    }
}
type CD =
{
    data: Record<number, Uint8Array>
    maxChunkY: number,
}
type ReturnMessage =
{
    type:string,
    data:Record<string,
    {
        data: Record<number, Uint8Array>
        maxChunkY: number,
    }>
}
self.onmessage = (e: MessageEvent<WorkerMessage>) => 
{
    const { type, DATABUTUPPERCASE } = e.data;
    const tgen = new TerrainGenerator(DATABUTUPPERCASE.seed);
    let results: Record<string, CD> = {};
    for (let r = 0; r < DATABUTUPPERCASE.payload.length; r++) {
        let cords = DATABUTUPPERCASE.payload[r].split(',').map(Number);
        results[DATABUTUPPERCASE.payload[r]] = tgen.generateChunkData(cords[0], cords[1]);
    }
    const rm:ReturnMessage =  {
        type: "a",
        data: results
    }
    self.postMessage(rm);
}

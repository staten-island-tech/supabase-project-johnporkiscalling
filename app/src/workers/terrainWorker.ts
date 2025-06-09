//define a worker batch szie of hunks to operate off of 
//since each chunk section takes around 3ms for just tgen do for 4 chunks
//stay under 50ms so the max batch size should be 16 but 16 might be a bit too mcuh

import { TerrainGenerator } from "@/lib/workerscripts";
//gottta import the seed into here and then pass values into it

self.onmessage = (e) =>
{
    const { type, data } = e.data;
    
    const tgen = new TerrainGenerator(data.seed);
    //initialize the tgen. then parse the data into the 
    data.payload.forEach(()=>
    {

    })
    
}
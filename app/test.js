const zoomLayer1 = new Uint8Array(16);
const zoomLayer2 = new Uint8Array(64);
const zoomLayer3 = new Uint8Array(256);
let initialState = 1;
function testRNG() {
    initialState = (initialState * 1664525 + 1013904223) >>> 0;
    return initialState;
}
function initialLayer()
{
  for(let x = 0; x<4; x++)
  {
    for(let z = 0; z<4; z++)
    {
        console.log(testRNG())
      const trueF = testRNG()%10==1;
      if(trueF==true)
      {
        console.log("true")
        zoomLayer1[x+z*4] = 1;
      }

    }
  }
};
initialLayer();
console.log(zoomLayer1)
//pretend theres some data
const exampleData = new Uint8Array(4096);
const cubicSize = 16;
const faceLookup = ["right", "left", "top", "bottom", "front", "back"]
function faceOcclude() {
    //get the neighbors
    //determine if the neighbors exist 
    //if they dont exist add a face there
    const validFaces = []
    for (let x = 0; x < cubicSize; x++) {
        for (let y = 0; y < cubicSize; y++) {
            for (let z = 0; z < cubicSize; z++) {
                const neighbors = getNeighbors(x, y, z);
                for (let i = 0; i < neighbors.length; i++) {
                    if (neighbors[i] != 0) validFaces.push(faceLookup[i]);
                }
            }
        }
    }
    //return data for the given chunk that has the possible faces that should be rendered
    return validFaces;
}
interface BlockInfo {
    validFaces: Array<boolean>
    material: number
}
function greedyMesh(validFace: Map<string, Array<BlockInfo>>) {
    const greediedQuads = [];
    const consumedQuads = new Set();
    //define an
    for (const [key, value] of validFace) {
        //get the face  
        for (let i = 0; i < value.length; i++) {
            value[i]//determine the direction the face is facing 
            //get 
            //if the face dir is +x go +-y and +-z; etc
            //expand until it reaches a limit in the faces that it can consume
            //the 

        }
    }
}
function getNeighbors(x: number, y: number, z: number) {
    //this thing can account for neighbors across chunk boundaries by loading the data but not actually rendering it
    return []
}

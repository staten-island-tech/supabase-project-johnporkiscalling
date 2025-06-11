export const playerData = {
    
}
const faceDirections = {
  left: [
    0, 0, 0,
    0, 0, 1,
    0, 1, 1,
    0, 1, 0,
  ],
  right: [
    1, 0, 1,
    1, 0, 0,
    1, 1, 0,
    1, 1, 1,
  ],
  top: [
    0, 1, 0,
    1, 1, 0,
    1, 1, 1,
    0, 1, 1,
  ],
  bottom: [
    0, 0, 1,
    1, 0, 1,
    1, 0, 0,
    0, 0, 0,
  ],
  back: [
    1, 0, 0,
    0, 0, 0,
    0, 1, 0,
    1, 1, 0,
  ],
  front: [
    0, 0, 1,
    1, 0, 1,
    1, 1, 1,
    0, 1, 1,
  ],
};

export { faceDirections }
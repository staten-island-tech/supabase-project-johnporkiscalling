import * as THREE from 'three'
const moveSpeed = 5;
const currentFov = 75;
const sprintFov = currentFov + 25;
const adjustmentSpeed = 0.1; 

class Entity
{
  boundingBox:THREE.Box3
  entityType:string
  id:number
  entitySize:THREE.Vector3
  entityPosition:THREE.Vector3
  entityVelocity:THREE.Vector3;
  worldBoundingBox:THREE.Box3;
  toggledBox:boolean;
  boxHelper?:THREE.Box3Helper
  constructor(entityType:string, entitySize:THREE.Vector3)
  {
    this.id = 1;
    this.entityType = entityType
    this.entitySize = entitySize;
    this.entityPosition = new THREE.Vector3;
    const max = new THREE.Vector3(this.entitySize.x/2, this.entitySize.y/2, this.entitySize.z/2)
    const min = new THREE.Vector3(-this.entitySize.x/2, -this.entitySize.y/2, -this.entitySize.z/2)
    this.boundingBox = new THREE.Box3(min, max);
    this.worldBoundingBox =  new THREE.Box3();
    this.worldBoundingBox.copy(this.boundingBox);
    this.entityVelocity =  new THREE.Vector3;
    this.toggledBox = false;

  }
  checkCollision(box:THREE.Box3)
  {
    if(this.worldBoundingBox.intersectsBox(box))
    {


      return true;
    }
    return false;
  }
  toggleHitbox(scene:THREE.Scene)
  {   
    this.toggledBox = !this.toggledBox;
    if(this.toggledBox)
    {
      const boxHelper = new THREE.Box3Helper(this.worldBoundingBox, 0x000000);
      this.boxHelper = boxHelper;
      scene.add(boxHelper);
      return
    }
    scene.remove(this.boxHelper as THREE.Box3Helper);
  }
  updateBound()
  {
    //corners of the bounding boxes defined by a given size dimension vector
    this.worldBoundingBox.copy(this.boundingBox);
    this.worldBoundingBox.min.add(this.entityPosition);
    this.worldBoundingBox.max.add(this.entityPosition);
  }
  handleIntersect(box:THREE.Box3)
  {
    if(this.worldBoundingBox.intersectsBox(box))
    {
      //set the position of the entity to above the block so they dont collide
    } 
  }
}
class Mob extends Entity
{
  agroLevel:number
  constructor()
  {
    super("id", new THREE.Vector3(1,1,1))
    this.agroLevel = 0;
  }
  manageAgro()
  {
    //conditions for agro
    //target entities in range =  agro up
    //higher agro = targets the target mob
    //must meet a certain agro threshold
  }
  targetAgro()
  {
    //system to find the nearest target and pathfind to it
  }
}

let verticalVelocity = 0;
const gravity = -19.6;
const jumpStrength = 10;
let isOnGround = true;
const groundLevel = 2.5;

class Player extends Entity
{
  position:THREE.Vector3;
  velocity:THREE.Vector3;
  fov:number;
  fovMultiplier:number;
  constructor(position:THREE.Vector3, velocity:THREE.Vector3, fov:number)
  {
    super("test", new THREE.Vector3(1,1,1));
    this.position = position;
    this.velocity =  velocity;
    this.fov =  75;
    this.fovMultiplier = 1.3;
  }
  getBoundingBox():THREE.Box3
  { 
    const min =  new THREE.Vector3();
    const max = new THREE.Vector3();
    return new THREE.Box3(
      min, max
    )
  }
  checkPosition()
  {
    this.getBoundingBox();

  }
  updatePosition(delta:number, camera:THREE.PerspectiveCamera, keys:Record<string, boolean>, yawObject:THREE.Object3D)
  {
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward).normalize();
    forward.y = 0; 
    forward.normalize();

    const right = new THREE.Vector3();
    right.crossVectors(forward, camera.up).normalize();
    if(!keys["w"]){
      if(camera.fov>currentFov)
      {
        camera.fov-=(camera.fov-this.fov)*0.1;
        camera.updateProjectionMatrix();
      }
    }
    if (keys["w"]) { 
      if(camera.fov<sprintFov)
      {
        camera.fov+=(this.fov*this.fovMultiplier-camera.fov)* adjustmentSpeed;
        camera.updateProjectionMatrix();
      }
      yawObject.position.add(forward.clone().multiplyScalar(moveSpeed * delta))
    };
    if (keys["s"]) yawObject.position.add(forward.clone().multiplyScalar(-moveSpeed * delta));
    if (keys["a"]) yawObject.position.add(right.clone().multiplyScalar(-moveSpeed * delta));
    if (keys["d"]) yawObject.position.add(right.clone().multiplyScalar(moveSpeed * delta));
    if (keys[" "] && isOnGround) {
      verticalVelocity = jumpStrength;
      isOnGround = false;
    }
    verticalVelocity += gravity * delta;
    // Update Y position
    yawObject.position.y += verticalVelocity * delta;
    // Check ground collision (very basic, replace with your terrain or collision logic)
    if (yawObject.position.y <= groundLevel) {
      yawObject.position.y = groundLevel;
      verticalVelocity = 0;
      isOnGround = true;
    }
  }

  checkMovement(delta:number)
  {

  }
}
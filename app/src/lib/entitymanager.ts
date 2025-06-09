import * as THREE from 'three';

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
export class Player extends Entity {
    position: THREE.Vector3;
    velocity: THREE.Vector3;
    fov: number;
    fovMultiplier: number;
    verticalVelocity: number;
    gravity: number;
    jumpStrength: number;
    isOnGround: boolean;
    groundLevel: number;
    currentFov: number;
    sprintFov: number;
    adjustmentSpeed: number;
    moveSpeed: number;

    constructor(position: THREE.Vector3, velocity: THREE.Vector3, fov: number = 75) {
        super("player", new THREE.Vector3(1, 1, 1));
        this.position = position;
        this.velocity = velocity;
        this.fov = fov;
        this.fovMultiplier = 1.3;
        this.verticalVelocity = 0;
        this.gravity = -19.6;
        this.jumpStrength = 10;
        this.isOnGround = true;
        this.groundLevel = 64.5;
        this.currentFov = this.fov;
        this.sprintFov = this.fov + 25;
        this.adjustmentSpeed = 0.1;
        this.moveSpeed = 20;
    }
    checkPosition(delt:number, yawObject:THREE.Object3D)
    {   
        const forward = new THREE.Vector3(0,)
    }

    updatePosition(delta: number, camera: THREE.PerspectiveCamera, keys: Record<string, boolean>, yawObject: THREE.Object3D) {
        // Get forward direction from yawObject
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(yawObject.quaternion).normalize();
        forward.y = 0;
        forward.normalize();

        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(yawObject.quaternion).normalize();

        // FOV sprint effect
        if (keys["w"]) {
        if (camera.fov < this.sprintFov) {
            camera.fov += (this.fov * this.fovMultiplier - camera.fov) * this.adjustmentSpeed;
            camera.updateProjectionMatrix();
        }
        } else {
        if (camera.fov > this.currentFov) {
            camera.fov -= (camera.fov - this.currentFov) * this.adjustmentSpeed;
            camera.updateProjectionMatrix();
        }
        }

        // Movement controls
        if (keys["w"]) yawObject.position.add(forward.clone().multiplyScalar(this.moveSpeed * delta));
        if (keys["s"]) yawObject.position.add(forward.clone().multiplyScalar(-this.moveSpeed * delta));
        if (keys["a"]) yawObject.position.add(right.clone().multiplyScalar(-this.moveSpeed * delta));
        if (keys["d"]) yawObject.position.add(right.clone().multiplyScalar(this.moveSpeed * delta));

        // Jumping
        if (keys[" "] && this.isOnGround) {
        this.verticalVelocity = this.jumpStrength;
        this.isOnGround = false;
        }

        // Apply gravity
        this.verticalVelocity += this.gravity * delta;
        yawObject.position.y += this.verticalVelocity * delta;

        // Simple ground collision
        if (yawObject.position.y <= this.groundLevel) {
        yawObject.position.y = this.groundLevel;
        this.verticalVelocity = 0;
        this.isOnGround = true;
        }

        // Update Entity position
        this.position.copy(yawObject.position);
        this.entityPosition.copy(this.position);
        this.updateBound();
    }

    checkMovement(delta: number) {
        // Future movement or collision logic here
    }
}
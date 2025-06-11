import * as THREE from 'three';
import type { DataManager } from './renderer';

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

interface VoxelRayInfo 
{
    hit:boolean;
    position?:THREE.Vector3;
    distance?:number;
    face?:THREE.Vector3;
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
    playerSize:THREE.Vector3;
    maxReach = 8;
    constructor(position: THREE.Vector3, velocity: THREE.Vector3, fov: number = 75) {
        super("player", new THREE.Vector3(1, 1, 1));
        this.position = position;
        this.velocity = velocity;
        this.fov = fov;
        this.fovMultiplier = 1.3;
        this.verticalVelocity = 0;
        this.gravity = -19.6;
        this.jumpStrength = 7.5;
        this.isOnGround = true;
        this.groundLevel = 64.5;
        this.currentFov = this.fov;
        this.sprintFov = this.fov + 25;
        this.adjustmentSpeed = 0.1;
        this.moveSpeed = 5;
        this.playerSize = new THREE.Vector3(0.6,1.8,0.6);
    }
    getPlayerAABB(position:THREE.Vector3)
    {
        const half = this.playerSize.clone().multiplyScalar(0.5);
        const actualPos = new THREE.Vector3(position.x,  position.clone().y-0.75, position.z);
        const min = actualPos.clone().sub(half);
        const max = actualPos.clone().add(half);
        return new THREE.Box3(min, max);
    }
    collidesBlock(position:THREE.Vector3, dm:DataManager)
    {
        const aabb = this.getPlayerAABB(position);
        const min = aabb.min.clone().floor();
        const max = aabb.max.clone().floor();
        for (let x = min.x; x <= max.x; x++) {
            for (let y = min.y; y <= max.y; y++) {
                for (let z = min.z; z <= max.z; z++) {
                    const block = dm.getVoxel(x, y, z);
                    if (block) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
    voxelRayCast(direction: THREE.Vector3, yawObject: THREE.Object3D,dm:DataManager, maxReach = 4): VoxelRayInfo {
        const origin = yawObject.position.clone();
        const dir = direction.clone().normalize();
        const pos = origin.clone().floor();
        const step = new THREE.Vector3(
            Math.sign(dir.x),
            Math.sign(dir.y),
            Math.sign(dir.z)
        );
        const tDelta = new THREE.Vector3(
            dir.x !== 0 ? Math.abs(1 / dir.x) : Number.POSITIVE_INFINITY,
            dir.y !== 0 ? Math.abs(1 / dir.y) : Number.POSITIVE_INFINITY,
            dir.z !== 0 ? Math.abs(1 / dir.z) : Number.POSITIVE_INFINITY
        );
        const voxelBorder = new THREE.Vector3(
            step.x > 0 ? pos.x + 1 : pos.x,
            step.y > 0 ? pos.y + 1 : pos.y,
            step.z > 0 ? pos.z + 1 : pos.z
        );
        const next = new THREE.Vector3(
            dir.x !== 0 ? (voxelBorder.x - origin.x) / dir.x : Number.POSITIVE_INFINITY,
            dir.y !== 0 ? (voxelBorder.y - origin.y) / dir.y : Number.POSITIVE_INFINITY,
            dir.z !== 0 ? (voxelBorder.z - origin.z) / dir.z : Number.POSITIVE_INFINITY
        );
        let faceDir = new THREE.Vector3();
        let distanceTraveled = 0;
        while (distanceTraveled <= maxReach) {
            if (dm.getVoxel(pos.x, pos.y, pos.z)) {
                return {
                    hit: true,
                    position: pos.clone(),
                    distance: distanceTraveled,
                    face: faceDir.clone()
                };
            }
            if (next.x < next.y && next.x < next.z) {
                pos.x += step.x;
                distanceTraveled = next.x;
                next.x += tDelta.x;
                faceDir.set(-step.x, 0, 0);
            } else if (next.y < next.z) {
                pos.y += step.y;
                distanceTraveled = next.y;
                next.y += tDelta.y;
                faceDir.set(0, -step.y, 0);
            } else {
                pos.z += step.z;
                distanceTraveled = next.z;
                next.z += tDelta.z;
                faceDir.set(0, 0, -step.z);
            }
        }
        return { hit: false };
    }
    updatePosition2(delta: number, camera: THREE.PerspectiveCamera, keys: Record<string, boolean>, yawObject: THREE.Object3D, dm: DataManager) 
    {
        delta = Math.min(delta, 0.05);
        const moveSpeed = this.moveSpeed * delta;
        const position = yawObject.position;
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(yawObject.quaternion).setY(0).normalize();
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(yawObject.quaternion).setY(0).normalize();
        const targetFov = keys["w"] ? this.fov * this.fovMultiplier : this.currentFov;
        camera.fov += (targetFov - camera.fov) * this.adjustmentSpeed;
        camera.fov = THREE.MathUtils.clamp(camera.fov, this.currentFov, this.sprintFov);
        camera.updateProjectionMatrix();
        const move = new THREE.Vector3();
        if (keys["w"]) move.add(forward);
        if (keys["s"]) move.sub(forward);
        if (keys["a"]) move.sub(right);
        if (keys["d"]) move.add(right);
        move.normalize().multiplyScalar(moveSpeed);
        const testX = position.clone().add(new THREE.Vector3(move.x, 0, 0));
        if (!this.collidesBlock(testX, dm)) position.x = testX.x;
        const testZ = position.clone().add(new THREE.Vector3(0, 0, move.z));
        if (!this.collidesBlock(testZ, dm)) position.z = testZ.z;
        if (keys[" "] && this.isOnGround) {
            this.verticalVelocity = this.jumpStrength;
            this.isOnGround = false;
        }
         this.verticalVelocity += this.gravity * delta ;
        const testY = position.clone();
        testY.y += this.verticalVelocity * delta;

        if (!this.collidesBlock(testY, dm)) {
            position.y = testY.y;
            this.isOnGround = false;
        } else {
            if (this.verticalVelocity < 0) this.isOnGround = true;
            this.verticalVelocity = 0;
        }
        this.position.copy(position);
    }
    
}
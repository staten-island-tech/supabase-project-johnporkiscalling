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
    }
}
export class Item extends Entity {
    position: THREE.Vector3;
    velocity: THREE.Vector3;
    size: THREE.Vector3;
    gravity: number;
    isOnGround: boolean;
    rotationAxis: THREE.Vector3;
    rotationSpeed: number; // radians per second
    maxReach = 8;
    rotationAngle: number = 0;
    id: number;
    quantity:number
    constructor(
        id: number,
        quantity:number,
        position: THREE.Vector3,
        initialVelocity: THREE.Vector3,
        size: THREE.Vector3 = new THREE.Vector3(0.25, 0.25, 0.25),
        gravity: number = -9.8,
        rotationAxis = new THREE.Vector3(0, 1, 0),
        rotationSpeed: number = Math.PI,

    ) {
        super("droppedItem", size);
        this.id = id;
        this.position = position.clone();
        this.velocity = initialVelocity.clone();
        this.size = size.clone();
        this.gravity = gravity;
        this.isOnGround = false;
        this.quantity = quantity
        
        if (rotationAxis) {
            rotationAxis.y = 0;
            if (rotationAxis.length() > 0) {
                this.rotationAxis = rotationAxis.normalize();
            } else {
                this.rotationAxis = new THREE.Vector3(1, 0, 0);
            }
        } else {
            const randomAngle = Math.random() * Math.PI * 2;
            this.rotationAxis = new THREE.Vector3(
                Math.cos(randomAngle),
                0,
                Math.sin(randomAngle)
            ).normalize();
        }
        this.rotationSpeed = rotationSpeed;
    }

    getAABB(position: THREE.Vector3) {
        const half = this.size.clone().multiplyScalar(0.5);
        const actualPos = new THREE.Vector3(position.x, position.clone().y - 0.75, position.z);
        const min = actualPos.clone().sub(half);
        const max = actualPos.clone().add(half);
        return new THREE.Box3(min, max);
    }

    collidesBlock(position: THREE.Vector3, dm: DataManager) {
        const aabb = this.getAABB(position);
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

update(delta: number, dm: DataManager) {
    const maxDelta = 0.05;
    delta = Math.min(delta, maxDelta);
    
    if (!this.isOnGround) {
        this.velocity.y += this.gravity * delta;
    }
    
    // Handle horizontal movement first
    const nextPos = this.position.clone();
    nextPos.x += this.velocity.x * delta;
    nextPos.z += this.velocity.z * delta;
    
    if (!this.collidesBlock(nextPos, dm)) {
        this.position.x = nextPos.x;
        this.position.z = nextPos.z;
    } else {
        this.velocity.x = 0;
        this.velocity.z = 0;
    }
    
    // Handle vertical movement
    nextPos.y += this.velocity.y * delta;
    
    if (!this.collidesBlock(nextPos, dm)) {
        this.position.y = nextPos.y;
        this.isOnGround = false;
    } else {
        if (this.velocity.y < 0) {
            // We're moving downward and hit something - snap to top of block
            const bbox = this.getAABB(this.position);
            const currentMinY = bbox.min.y;
            const targetMinY = Math.floor(currentMinY) + 1;
            const halfHeight = -0.15;
            
            // Set position directly to the surface
            this.position.y = targetMinY + halfHeight;
            this.isOnGround = true;
            
            // Cancel any remaining downward velocity
            this.velocity.y = 0;
        } else {
            // We're moving upward and hit something
            this.velocity.y = 0;
        }
    }
    
    // Apply friction if on ground
    if (this.isOnGround) {
        this.velocity.x *= 0.8;
        this.velocity.z *= 0.8;
        if (Math.abs(this.velocity.y) < 0.1) {
            this.velocity.y = 0;
        }
    }

    this.rotationAngle += this.rotationSpeed * delta;
}


    applyToMesh(mesh: THREE.Object3D, delta: number) {
        const positon = new THREE.Vector3().addVectors(new THREE.Vector3(0,-0.7,0), this.position.clone());
        mesh.position.copy(positon);
        const quaternion = new THREE.Quaternion();
        quaternion.setFromAxisAngle(this.rotationAxis, this.rotationAngle);
        mesh.rotation.set(0, this.rotationAngle, 0);
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
        this.jumpStrength = 20;
        this.isOnGround = true;
        this.groundLevel = 64.5;
        this.currentFov = this.fov;
        this.sprintFov = this.fov + 25;
        this.adjustmentSpeed = 0.1;
        this.moveSpeed = 20;
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
    voxelRayCast(direction: THREE.Vector3, yawObject: THREE.Object3D,dm:DataManager, maxReach = 8): VoxelRayInfo {
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
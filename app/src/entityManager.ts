import * as THREE from 'three'
class Entity {
    boundingBox: THREE.Box3
    entityType: string
    id: number
    entitySize: THREE.Vector3
    entityPosition: THREE.Vector3
    entityVelocity: THREE.Vector3;
    worldBoundingBox: THREE.Box3;
    toggledBox: boolean
    boxHelper?: THREE.Box3Helper
    constructor(entityType: string, entitySize: THREE.Vector3) {
        this.id = 1;
        this.entityType = entityType
        this.entitySize = entitySize;
        this.entityPosition = new THREE.Vector3;
        const max = new THREE.Vector3(this.entitySize.x / 2, this.entitySize.y / 2, this.entitySize.z / 2)
        const min = new THREE.Vector3(-this.entitySize.x / 2, -this.entitySize.y / 2, -this.entitySize.z / 2)
        this.boundingBox = new THREE.Box3(min, max);
        this.worldBoundingBox = new THREE.Box3();
        this.worldBoundingBox.copy(this.boundingBox);
        this.entityVelocity = new THREE.Vector3;
        this.toggledBox = false;

    }
    checkCollision(entity: Entity) {
        if (this.worldBoundingBox.intersectsBox(entity.worldBoundingBox)) {
            //apply velocity to the entities to push them apart based off of how close to each other's center they are which is basically just their position
            //
            return true;
        }
        return false;
    }
    toggleHitbox(scene: THREE.Scene) {
        this.toggledBox = !this.toggledBox;
        if (this.toggledBox) {
            const boxHelper = new THREE.Box3Helper(this.worldBoundingBox, 0x000000);
            this.boxHelper = boxHelper;
            scene.add(boxHelper);
            return
        }
        scene.remove(this.boxHelper as THREE.Box3Helper);
    }
    updateBound() {
        //corners of the bounding boxes defined by a given size dimension vector
        this.worldBoundingBox.copy(this.boundingBox);
        this.worldBoundingBox.min.add(this.entityPosition);
        this.worldBoundingBox.max.add(this.entityPosition);
    }
    updatePosition(delta: number) {
        //trigger when velocity changes 
    }
    handleIntersect(box: THREE.Box3) {

    }
}
class Mob extends Entity {
    agroLevel: number
    constructor() {
        super("id", new THREE.Vector3(1, 1, 1))
        this.agroLevel = 0;
    }
    manageAgro() {
        //conditions for agro
        //target entities in range =  agro up
        //higher agro = targets the target mob
        //must meet a certain agro threshold
    }
    targetAgro() {
        //system to find the nearest target and pathfind to it
    }

}
class Player extends Entity {
    position: THREE.Vector3;
    velocity: THREE.Vector3;
    constructor(position: THREE.Vector3, velocity: THREE.Vector3) {
        super("test", new THREE.Vector3(1, 1, 1));
        this.position = position;
        this.velocity = velocity;
    }
    getBoundingBox(): THREE.Box3 {
        const min = new THREE.Vector3();
        const max = new THREE.Vector3();
        return new THREE.Box3(
            min, max
        )
    }
    //add a function here to check the position. checking for in air can be done using bounding boxes of the player 
    checkPosition() {
        this.getBoundingBox();
        //if the player is off the ground 
        //multiple the delta variable by the velocity and apply that to the camera position
        //continuously do this until the boundingBoxs have collided and returns a true condition
    }
    test(camera: THREE.Camera) {
        //tweak this might not be good practice
        camera.position.copy(this.position);
        //adjust for the current players rotation to prevent it from snapping every animation frame
        //
    }
}
class entityManager {
    //class to manage entities
    //
    entityMap: Map<number, Entity>
    entityPositions: Map<number, THREE.Vector3>
    constructor() {
        this.entityPositions = new Map();
        this.entityMap = new Map();
    }
    add(entity: Entity, position: THREE.Vector3) {
        this.entityMap.set(entity.id, entity);
        this.entityPositions.set(entity.id, position);

    }
    remove(id: number) {

    }
    get() {

    }
    update() {

    }

}
export { entityManager, Player };
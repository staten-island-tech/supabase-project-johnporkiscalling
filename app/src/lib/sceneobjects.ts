import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';


class basicSkySetup
{
    scene:THREE.Scene
    time:number
    sun:THREE.Vector3;
    sky:Sky
    sunSource:THREE.Light
    constructor(scene:THREE.Scene)
    {
        this.scene = scene;
        this.time = 0;
        this.sunSource =  new THREE.DirectionalLight(0xffffff,1);
        this.sky = new Sky();
        this.sun = new THREE.Vector3();
    }
    setup()
    {
        const skyUniforms = this.sky.material.uniforms;
        skyUniforms['turbidity'].value = 4;
        skyUniforms['rayleigh'].value = 2;
        skyUniforms['mieCoefficient'].value = 0.00005;
        skyUniforms['mieDirectionalG'].value = 0.8;
        this.sky.scale.setScalar(10000);
        this.scene.add(this.sky);
        this.scene.add(this.sunSource);
    }
    updateSun() 
    {
        this.time += 0.000001; // Adjust for speed
        if (this.time > 1) this.time = 0;
        const elevation = Math.sin(this.time * 2 * Math.PI) * 90;
        const azimuth = 180 + Math.cos(this.time * 2 * Math.PI) * 90;
        const phi = THREE.MathUtils.degToRad(90 - elevation);
        const theta = THREE.MathUtils.degToRad(azimuth);
        this.sun.setFromSphericalCoords(1, phi, theta);
        this.sky.material.uniforms['sunPosition'].value.copy(this.sun);
        this.sunSource.position.copy(this.sun);
    }
}
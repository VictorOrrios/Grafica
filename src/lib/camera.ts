import { Matrix4, Vector3 } from "math.gl";
import { createBaseMatrix, createViewMatrix } from "./Math/Bases";

export class Camera {
    public view_inv:Matrix4;
    public position:Vector3;
    public up:Vector3 = new Vector3(0.0);
    public right:Vector3 = new Vector3(0.0);
    public tan_fov:number;
    public radius:number;

    constructor(position:Vector3 = new Vector3(0.0,0.0,-1.0), fov:number = 45){
        if(position.len() <= 0.0) console.error("Camera origin can't be 0,0,0");
        this.position = position.clone();
        this.radius = position.len();
        this.tan_fov = Math.tan(fov * Math.PI / 180.0 / 2.0);
        this.view_inv = this.generateViewMatrix();
    }

    public moveTo(azymuth:number,polar:number){
        this.position.set(
            -this.radius*Math.sin(polar)*Math.sin(azymuth),
            this.radius*Math.cos(polar),
            this.radius*Math.sin(polar)*Math.cos(azymuth),
        );
        this.view_inv = this.generateViewMatrix();
    }

    private generateViewMatrix(){
        let target = new Vector3(0, 0, 0);
        let w = this.position.clone().subtract(target).normalize();
        let posY = new Vector3(0.0,1.0,0.0);
        if (Math.abs(w.dot(posY)) > 0.999) { // Gimbal lock prevention
            posY = new Vector3(0, 0, 1);
        }
        this.right = w.clone().cross(posY).normalize();
        this.up = this.right.clone().cross(w).normalize();
        return createViewMatrix(this.right,this.up,w,this.position);
    }

    public tick(){
        this.position = this.position.multiplyByScalar(this.radius/this.position.len());
        this.view_inv = this.generateViewMatrix();
    }

    public serialize(aperture_radius:number,focal_distance:number):Float32Array{
        let data = new Float32Array(32);
        data.set(this.view_inv, 0);
        data.set(this.position, 16);
        data[19] = this.tan_fov;
        data.set(this.up, 20);
        data.set(this.right, 24);
        data[28] = aperture_radius;
        data[29] = focal_distance;
        return data;
    }

    public printViewMatrix(){
        for (let i = 0; i < 5; i++) {
            console.log(this.view_inv[4*i+0],
                this.view_inv[4*i+1],
                this.view_inv[4*i+2],
                this.view_inv[4*i+3],
            )
        }
    }
}
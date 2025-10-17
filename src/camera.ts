import { Matrix4, Vector3 } from "math.gl";
import { createBaseMatrix, createViewMatrix } from "./Math/Bases";

export class Camera {
    public view_inv:Matrix4;
    public position:Vector3;
    public tan_fov:number;
    private radius:number;

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
        let up = new Vector3(0.0,1.0,0.0);
        if (Math.abs(w.dot(up)) > 0.999) { // Gimbal lock prevention
            up = new Vector3(0, 0, 1);
        }
        let u:Vector3 = w.clone().cross(up).normalize();
        let v:Vector3 = u.clone().cross(w).normalize();
        return createViewMatrix(u,v,w,this.position);
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
import { Matrix4, Vector3 } from "math.gl";
import { createBaseMatrix } from "./Math/Bases";

export class Camera {
    public view_inv:Matrix4;
    public position:Vector3;
    public tan_fov;

    constructor(position:Vector3 = new Vector3(0.0,0.0,-1.0), fov:number = 45){
        if(position.len() <= 0.0) console.error("Camera origin can't be 0,0,0");
        this.position = position.clone();
        this.tan_fov = Math.tan(fov * Math.PI / 180.0 / 2.0);
        this.view_inv = this.createViewMatrix();
    }

    private createViewMatrix(){
        let target = new Vector3(0, 0, 0);
        let w = this.position.clone().subtract(target).normalize();
        let u:Vector3 = w.clone().cross(new Vector3(0.0,1.0,0.0)).normalize();
        let v:Vector3 = u.clone().cross(w).normalize();
        return createBaseMatrix(u,v,w,this.position).invert();
    }
}
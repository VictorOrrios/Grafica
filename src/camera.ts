import { Matrix4, Vector3 } from "math.gl";
import { createBaseMatrix } from "./Math/Bases";

export class Camera {
    public view_inv:Matrix4;
    public position:Vector3;
    public fov:number;

    constructor(position:Vector3 = new Vector3(0.0,0.0,-1.0), fov:number = 45){
        this.position = position.clone();
        this.fov = Math.tan(fov*0.01745329252/2.0);
        this.view_inv = this.createViewMatrix();
    }

    private createViewMatrix(){
        let w:Vector3 = this.position.clone().multiplyByScalar(-1.0).normalize();
        let u:Vector3 = new Vector3(0.0,1.0,0.0).cross(w).normalize();
        let v:Vector3 = w.clone().cross(u).normalize();
        return createBaseMatrix(u,v,w,this.position).invert();
        
    }
}
import { Vector3 } from "math.gl";


export class Material{
    public albedo:Vector3;

    constructor(albedo:Vector3){
        this.albedo = albedo;
    }

    public serialize():Float32Array{
        return new Float32Array([this.albedo.x,this.albedo.y,this.albedo.z,0]);
    }

};
import { Vector3 } from "math.gl";


export class Material{
    public albedo:Vector3;
    public emission:number = 0.0;
    public specular_color:Vector3 = new Vector3(0);
    public subsurface_color:Vector3 = new Vector3(0);
    public ior:number = 1.0;

    constructor(albedo:Vector3, emission:number, 
        specular_color:Vector3, 
        subsurface_color:Vector3, ior:number){
            
        this.albedo = albedo;
        this.emission = emission;
        this.specular_color = specular_color;
        this.subsurface_color = subsurface_color;
        this.ior = ior;
    }

    public serialize():Float32Array{
        return new Float32Array([
            this.albedo.x, this.albedo.y, this.albedo.z, this.emission,
            this.specular_color.x, this.specular_color.y, this.specular_color.z, 0,
            this.subsurface_color.x, this.subsurface_color.y, this.subsurface_color.z, this.ior
        ]);
    }

};
import { Vector3, Vector4 } from "math.gl";


export class Material{
    public albedo:Vector3;
    public emission:number = 0.0;
    public specular_color:Vector3 = new Vector3(0);
    public subsurface_color:Vector3 = new Vector3(0);
    public ior:number = 1.0;
    public roughness:number = 1.0;
    public metalness:number = 0.0;
    public trs_weight:number = 0.0;

    constructor(albedo:Vector3, emission:number, 
        specular_color:Vector3, 
        subsurface_color:Vector3, ior:number = 1.5,
        roughness:number = 1.0, metalness:number = 0.0, trs_weight:number = 0.0
    ){

        // Check for dielectric with 0% specular
        if(subsurface_color.len() > 0.0 && specular_color.len() === 0.0){
            console.warn("Dielectric material with 0% specular coeficient found");
        }
            
        this.albedo = albedo;
        this.emission = emission;
        this.specular_color = specular_color;
        this.subsurface_color = subsurface_color;
        this.ior = ior;
        this.roughness = roughness;
        this.metalness = metalness;
        this.trs_weight = trs_weight;
    }

    private static getMaxComponent(v:Vector3):number{
        return Math.max(v.x,v.y,v.z); 
    }

    private static dielectricF0(ri:number):number{
        let F0 = (1.0 - ri) / (1.0 + ri);
        return F0*F0;
    }

    public serialize():Float32Array{
        return new Float32Array([
            this.albedo.x, this.albedo.y, this.albedo.z, this.emission,
            this.specular_color.x, this.specular_color.y, this.specular_color.z, 0.0,
            this.subsurface_color.x, this.subsurface_color.y, this.subsurface_color.z, this.ior,
            this.roughness, this.metalness, this.trs_weight, 0.0,
            this.roughness*this.roughness, Material.dielectricF0(1.0/this.ior), Material.dielectricF0(this.ior), 0.0
        ]);
    }

};
import { Vector3 } from "math.gl";
import { clamp } from "three/src/math/MathUtils.js";

export type Params = {
    albedo?:Vector3,
    emission?:number,
    specular_color?:Vector3,
    subsurface_color?:Vector3,
    ior?:number,
    roughness?:number,
    metalness?:number,
    trs_weight?:number,
    reflectance?:number,
}

export class Material{
    public albedo:Vector3 = new Vector3(1.0,1.0,1.0);
    public emission:number = 0.0;
    public specular_color:Vector3 = new Vector3(1.0,1.0,1.0);
    public subsurface_color:Vector3 = new Vector3(1.0,1.0,1.0);
    public ior:number = 1.5;
    public roughness:number = 1.0;
    public metalness:number = 0.0;
    public trs_weight:number = 0.0;
    public reflectance:number = 0.5;

    constructor(p:Params){
        if(p.albedo !== undefined) this.albedo = p.albedo;
        if(p.emission !== undefined) this.emission = p.emission;
        if(p.specular_color !== undefined) this.specular_color = p.specular_color;
        if(p.subsurface_color !== undefined) this.subsurface_color = p.subsurface_color;
        if(p.ior !== undefined){
            p.ior = Math.max(0.0,p.ior);
            if(p.ior == 1.0){
                console.warn("Material with ior of 1.0 found")
            }
            this.ior = p.ior;
        }
        if(p.roughness !== undefined){
            p.roughness = Math.max(0.008,p.roughness);
            this.roughness = p.roughness;
        }
        if(p.metalness !== undefined){
            p.metalness = Math.max(0.0,p.metalness);
            this.metalness = p.metalness;
        }
        if(p.trs_weight !== undefined){
            p.trs_weight = clamp(p.trs_weight,0.0,1.0);
            this.trs_weight = p.trs_weight;
        }
        if(p.reflectance !== undefined){
            p.reflectance = clamp(p.reflectance,0.0,1.0);
            this.reflectance = p.reflectance;
        }
    }

    private static getMaxComponent(v:Vector3):number{
        return Math.max(v.x,v.y,v.z); 
    }

    public static mix(a: Vector3, b: Vector3, t: number): Vector3 {
        return new Vector3(
            a.x * (1 - t) + b.x * t,
            a.y * (1 - t) + b.y * t,
            a.z * (1 - t) + b.z * t
        );
    }

    public serialize():Float32Array{
        let alpha = this.roughness*this.roughness;
        let f0_dielectric = 0.16 * this.reflectance * this.reflectance;
        let F0_dielectric = new Vector3(f0_dielectric,f0_dielectric,f0_dielectric);
        let F0 = Material.mix(F0_dielectric,this.albedo,this.metalness);
        return new Float32Array([
            this.albedo.x, this.albedo.y, this.albedo.z, this.emission,
            this.specular_color.x, this.specular_color.y, this.specular_color.z, 0.0,
            this.subsurface_color.x, this.subsurface_color.y, this.subsurface_color.z, this.ior,
            this.roughness, this.metalness, this.trs_weight, this.reflectance,
            F0.x,F0.y,F0.z,alpha
        ]);
    }

};
import { Vector3, Vector4 } from "math.gl";


export class Material{
    public albedo:Vector3;
    public emission:number = 0.0;
    public specular_color:Vector3 = new Vector3(0);
    public subsurface_color:Vector3 = new Vector3(0);
    public ior:number = 1.0;

    constructor(albedo:Vector3, emission:number, 
        specular_color:Vector3, 
        subsurface_color:Vector3, ior:number){

        // Check for sum of channel bigger than 1
        for (let i = 0; i < 3; i++) {
            let t = 0;
            t += albedo[i];
            t += specular_color[i];
            t += subsurface_color[i];
            if(t>1){
                console.warn("Material with no phisical correlation found",
                    albedo,emission,specular_color,subsurface_color,ior)
            }
        }
            
        this.albedo = albedo;
        this.emission = emission;
        this.specular_color = specular_color;
        this.subsurface_color = subsurface_color;
        this.ior = ior;
    }

    private static getMaxComponent(v:Vector3):number{
        return Math.max(v.x,v.y,v.z); 
    }

    private getLobeChances():Vector3{
        let pd = 0, ps = 0, pt = 0;
        if(this.subsurface_color.len() > 0){
            let ks_max = Material.getMaxComponent(this.specular_color);
            let kt_max = Material.getMaxComponent(this.subsurface_color);
            ps = ks_max / (ks_max+kt_max);
            pt = 1 - ps;
        }else{
            let kd_max = Material.getMaxComponent(this.albedo);
            let ks_max = Material.getMaxComponent(this.specular_color);
            pd = kd_max / (kd_max+ks_max);
            ps = 1 - pd;
        }
        return new Vector3(pd,ps,pt);
    }

    public serialize():Float32Array{
        const lobe_chances = this.getLobeChances();
        return new Float32Array([
            this.albedo.x, this.albedo.y, this.albedo.z, this.emission,
            this.specular_color.x, this.specular_color.y, this.specular_color.z, 0,
            this.subsurface_color.x, this.subsurface_color.y, this.subsurface_color.z, this.ior,
            lobe_chances.x, lobe_chances.y, lobe_chances.z, 0
        ]);
    }

};
import { Vector3 } from "math.gl";
import { Sphere } from "./Primitives/Sphere"
import { Camera } from "./camera";
import { Material } from "./Primitives/Material";

export class Scene {
    public camera:Camera;
    public materialVec:Material[] = [];
    public sphereVec:{sphere:Sphere,materialIndex:number}[] = [];

    constructor() {
        this.camera = new Camera(new Vector3(0.0,0.0,10.0));
        this.scene1();
    }

    private addSphere(sphere:Sphere, materialIndex:number) {
        this.sphereVec.push({
            sphere,materialIndex
        });
    }

    private addMaterial(material:Material):number{
        this.materialVec.push(material);
        return this.materialVec.length-1;
    }

    private scene1(){
        const m1 = this.addMaterial(new Material(
            new Vector3(1.0,0.0,0.0)
        ));

        const m2 = this.addMaterial(new Material(
            new Vector3(0.0,1.0,0.0)
        ));

        const s1:Sphere = new Sphere(
            new Vector3(0.0,0.0,0.0),
            1.0);
        this.addSphere(s1,m1);

        const s2 = new Sphere(
            new Vector3(4.0,0.0,3.0),
            2.0);
        this.addSphere(s2,m2);
    }
    
    public serializeMaterialVec():Float32Array {
        let arr: number[] = [];
        this.materialVec.forEach(m => {
            // Spread material onto the arr
            arr.push(...(m.serialize()));
        });
        console.log("Serialized material vector length:", arr.length);
        const ret: Float32Array = new Float32Array(arr);
        
        return ret;
    }

    public serializeSphereVec():Float32Array {
        let arr: number[] = [];
        this.sphereVec.forEach(s => {
            // Spread serialized sphere and material index onto the arr
            arr.push(...(s.sphere.serialize()),s.materialIndex);
        });
        console.log("Serialized sphere vector length:", arr.length);
        const ret: Float32Array = new Float32Array(arr);
        
        return ret;
    }
}

import { Vector3 } from "math.gl";
import { Sphere } from "./Math/Sphere"
import { Camera } from "./camera";

export class Scene {
    public sphereVec:Sphere[] = [];
    public camera:Camera;

    constructor() {
        this.camera = new Camera(new Vector3(0.0,0.0,-10.0));
        this.scene1();
    }

    private addSphere(sphere:Sphere) {
        this.sphereVec.push(sphere);
    }

    private scene1(){
        const s1:Sphere = new Sphere(
            new Vector3(0.0,0.0,0.0),
            1.0);
        this.addSphere(s1);

        const s2 = new Sphere(
            new Vector3(4.0,0.0,3.0),
            2.0);
        this.addSphere(s2);
    }
    
    public serializeSphereVec():Float32Array {
        let arr: number[] = [];
        this.sphereVec.forEach(s => {
            // Spread serialized sphere and push into arr
            arr.push(...(s.serialize()));
        });
        console.log("Serialized sphere vector length:", arr.length);
        const ret: Float32Array = new Float32Array(arr);
        
        return ret;
    }
}

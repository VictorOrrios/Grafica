import { Vector3 } from "math.gl";
import { Sphere } from "./Primitives/Sphere"
import { Camera } from "./camera";
import { Material } from "./Primitives/Material";
import { Plane } from "./Primitives/Plane";
import { Triangle } from "./Primitives/Triangle";

export class Scene {
    public camera:Camera = new Camera();
    public materialVec:Material[] = [];
    public sphereVec:{sphere:Sphere,materialIndex:number}[] = [];
    public planeVec:{plane:Plane,materialIndex:number}[] = [];
    public triangleVec:{tri:Triangle,materialIndex:number}[] = [];

    constructor() {
        this.scene2();
    }

    private addMaterial(material:Material):number{
        this.materialVec.push(material);
        return this.materialVec.length-1;
    }

    private addSphere(sphere:Sphere, materialIndex:number) {
        this.sphereVec.push({
            sphere,materialIndex
        });
    }

    private addPlane(plane:Plane, materialIndex:number) {
        this.planeVec.push({
            plane,materialIndex
        });
    }

    private addTriangle(tri:Triangle, materialIndex:number) {
        this.triangleVec.push({
            tri,materialIndex
        });
    }

    private scene1(){
        this.camera = new Camera(new Vector3(0.0,0.0,10.0));

        const m1 = this.addMaterial(new Material(
            new Vector3(1.0,0.0,0.0)
        ));

        const m2 = this.addMaterial(new Material(
            new Vector3(0.0,1.0,0.0)
        ));

        const m3 = this.addMaterial(new Material(
            new Vector3(0.0,0.5,1.0)
        ));

         const m4 = this.addMaterial(new Material(
            new Vector3(0.9,0.9,0.0)
        ));

        const s1:Sphere = new Sphere(
            new Vector3(0.0,0.0,0.0),
            1.0);
        this.addSphere(s1,m1);

        const s2 = new Sphere(
            new Vector3(4.0,1.0,3.0),
            2.0);
        this.addSphere(s2,m2);

        const t1:Triangle = new Triangle(
            new Vector3(-3.0,0.5,2.0),
            new Vector3(-6.0,0.0,0.0),
            new Vector3(-4.5,2.5,-2.0),
        );
        this.addTriangle(t1,m4);

        const p1:Plane = new Plane(
            new Vector3(0.0,1.0,0.0),
            1.0
        );
        this.addPlane(p1,m3);
    }

    private scene2(){
        this.camera = new Camera(new Vector3(0.0,0.0,3.5));

        const red = this.addMaterial(new Material(
            new Vector3(1.0,0.0,0.0)
        ));

        const green = this.addMaterial(new Material(
            new Vector3(0.0,1.0,0.0)
        ));

        const blue = this.addMaterial(new Material(
            new Vector3(0.0,0.0,1.0)
        ));

        const white = this.addMaterial(new Material(
            new Vector3(1.0,1.0,1.0)
        ));

        const yellow = this.addMaterial(new Material(
            new Vector3(1.0,1.0,0.0)
        ));

        const floor:Plane = new Plane(
            new Vector3(0.0,1.0,0.0),
            1.0
        );
        this.addPlane(floor,white);

        const back:Plane = new Plane(
            new Vector3(0.0,0.0,-1.0),
            1.0
        );
        this.addPlane(back,white);

        const ceiling:Plane = new Plane(
            new Vector3(0.0,-1.0,0.0),
            1.0
        );
        this.addPlane(ceiling,white);

        const left:Plane = new Plane(
            new Vector3(1.0,0.0,0.0),
            1.0
        );
        this.addPlane(left,red);

        const right:Plane = new Plane(
            new Vector3(-1.0,0.0,0.0),
            1.0
        );
        this.addPlane(right,green);

        const s1:Sphere = new Sphere(
            new Vector3(0.5,-0.7,-0.25),
            0.3);
        this.addSphere(s1,yellow);

        const s2:Sphere = new Sphere(
            new Vector3(-0.5,-0.7,0.25),
            0.3);
        this.addSphere(s2,blue);

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

    public serializePlaneVec():Float32Array {
        let arr: number[] = [];
        this.planeVec.forEach(p => {
            // Spread serialized plane and material index onto the arr
            arr.push(...(p.plane.serialize()),p.materialIndex);
        });
        console.log("Serialized plane vector length:", arr.length);
        const ret: Float32Array = new Float32Array(arr);
        
        return ret;
    }

    public serializeTriangleVec():Float32Array {
        let arr: number[] = [];
        this.triangleVec.forEach(t => {
            // Spread serialized triangle and material index onto the arr
            arr.push(...(t.tri.serialize()),t.materialIndex);
        });
        console.log("Serialized triangle vector length:", arr.length);
        const ret: Float32Array = new Float32Array(arr);
        
        return ret;
    }
}

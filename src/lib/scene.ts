import { Vector3 } from "math.gl";
import { Sphere } from "./Primitives/Sphere"
import { Camera } from "./camera";
import { Material } from "./Primitives/Material";
import { Plane } from "./Primitives/Plane";
import { Triangle } from "./Primitives/Triangle";
import { Quad } from "./Primitives/Quad";
import { Mesh } from "./Primitives/Mesh";
import { MeshLoader } from "./loaders/MeshLoader";

export class Scene {
    public camera:Camera = new Camera();
    public materialVec:Material[] = [];
    public sphereVec:{sphere:Sphere,materialIndex:number}[] = [];
    public planeVec:{plane:Plane,materialIndex:number}[] = [];
    public triangleVec:{tri:Triangle,materialIndex:number}[] = [];
    public quadVec:{quad:Quad,materialIndex:number}[] = [];
    public meshVec:{mesh:Mesh,materialIndex:number}[] = [];
    public hasMeshes: boolean = false;
    public loadedMeshes: Map<string, Mesh> = new Map();
    public sceneType: string = 'tung';

    constructor() {
        this.sceneType = 'tung';
        this.setupScene();
    }

    private setupScene() {
        if (this.sceneType === 'tung') {
            this.hasMeshes = true;
            const yellow = this.addMaterial(new Material(new Vector3(1, 1, 0)));
            const lightBlue = this.addMaterial(new Material(new Vector3(0.0,0.5,1.0)));
            const p1:Plane = new Plane(
                new Vector3(0.0,1.0,0.0),
                1.0
            );
            this.addPlane(p1,lightBlue);
        } else if (this.sceneType === 'scene2') {
            this.scene2();
        }
        // Add other scenes as needed
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
    
    private addQuad(quad:Quad, materialIndex:number){
        this.addTriangle(quad.t1,materialIndex);
        this.addTriangle(quad.t2,materialIndex);
    }

    /**
     * Add a mesh to the scene
     * All triangles from the mesh will be added with the specified material
     */
    public addMesh(mesh:Mesh, materialIndex:number) {
        this.meshVec.push({mesh, materialIndex});
        // Add all mesh triangles to the triangle vector
        mesh.getTriangles().forEach(tri => {
            this.addTriangle(tri, materialIndex);
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

        const s3 = new Sphere(
            new Vector3(4.0,1.0,-6.0),
            2.0);
        this.addSphere(s3,m2);

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

        const floor:Quad = new Quad(
            new Vector3(-1.0,-1.0,-1.0),
            new Vector3(-1.0,-1.0,1.0),
            new Vector3(1.0,-1.0,1.0),
            new Vector3(1.0,-1.0,-1.0),
        );
        this.addQuad(floor,white);

        const back:Quad = new Quad(
            new Vector3(-1.0,-1.0,-1.0),
            new Vector3(-1.0,1.0,-1.0),
            new Vector3(1.0,1.0,-1.0),
            new Vector3(1.0,-1.0,-1.0),
        );
        this.addQuad(back,white);

        const ceiling:Quad = new Quad(
            new Vector3(-1.0,1.0,-1.0),
            new Vector3(-1.0,1.0,1.0),
            new Vector3(1.0,1.0,1.0),
            new Vector3(1.0,1.0,-1.0),
        );
        this.addQuad(ceiling,white);

        const left:Quad = new Quad(
            new Vector3(-1.0,-1.0,1.0),
            new Vector3(-1.0,1.0,1.0),
            new Vector3(-1.0,1.0,-1.0),
            new Vector3(-1.0,-1.0,-1.0),
        );
        this.addQuad(left,red);

        const right:Quad = new Quad(
            new Vector3(1.0,-1.0,1.0),
            new Vector3(1.0,1.0,1.0),
            new Vector3(1.0,1.0,-1.0),
            new Vector3(1.0,-1.0,-1.0),
        );
        this.addQuad(right,green);

        const s1:Sphere = new Sphere(
            new Vector3(0.5,-0.7,-0.25),
            0.3);
        this.addSphere(s1,yellow);

        const s2:Sphere = new Sphere(
            new Vector3(-0.5,-0.7,0.25),
            0.3);
        this.addSphere(s2,blue);

    }



    public async loadMeshes() {
        if (this.sceneType === 'tung') {
            try {
                const tungTungTungSahurMesh = await MeshLoader.load("/models/tung.fbx", "TungTungTungSahur");
                tungTungTungSahurMesh.translate(new Vector3(20, 0, 0));
                this.loadedMeshes.set("tung", tungTungTungSahurMesh);
                console.log("✓ Mesh loaded successfully:", tungTungTungSahurMesh.toString());
            } catch (error) {
                console.warn("⚠ Could not load mesh:", error);
            }
        }
        // Load meshes for other scenes here
    }

    public finalizeScene() {
        if (this.sceneType === 'tung') {
            const yellow = this.materialVec.find(m => m.albedo.equals(new Vector3(1, 1, 0)));
            if (!yellow) return;
            const yellowIndex = this.materialVec.indexOf(yellow);
            
            const tungMesh = this.loadedMeshes.get("tung");
            if (tungMesh) {
                this.addMesh(tungMesh, yellowIndex);
            }
        }
        // Finalize other scenes here
    }

    public serializeStaticBlock():Float32Array {
        const data: number[] = [];
        data.push(...this.serializeMaterialVec(),
                ...this.serializeSphereVec(),
                ...this.serializePlaneVec(),
                ...this.serializeTriangleVec(),
                );
        return new Float32Array(data);
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
            arr.push(...(s.sphere.serialize(s.materialIndex)));
        });
        console.log("Serialized sphere vector length:", arr.length);
        const ret: Float32Array = new Float32Array(arr);
        
        return ret;
    }

    public serializePlaneVec():Float32Array {
        let arr: number[] = [];
        this.planeVec.forEach(p => {
            // Spread serialized plane and material index onto the arr
            arr.push(...p.plane.serialize(p.materialIndex));
        });
        console.log("Serialized plane vector length:", arr.length);
        const ret: Float32Array = new Float32Array(arr);
        
        return ret;
    }

    public serializeTriangleVec():Float32Array {
        let arr: number[] = [];
        this.triangleVec.forEach(t => {
            // Spread serialized triangle and material index onto the arr
            arr.push(...t.tri.serialize(t.materialIndex));
        });
        console.log("Serialized triangle vector length:", arr.length);
        const ret: Float32Array = new Float32Array(arr);
        
        return ret;
    }
}

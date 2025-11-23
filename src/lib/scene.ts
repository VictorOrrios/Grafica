import { Vector3 } from "math.gl";
import { Sphere } from "./Primitives/Sphere"
import { Camera } from "./camera";
import { Material } from "./Primitives/Material";
import { Plane } from "./Primitives/Plane";
import { Triangle } from "./Primitives/Triangle";
import { Quad } from "./Primitives/Quad";
import { Mesh } from "./Primitives/Mesh";
import { MeshLoader } from "./Mesh/loaders/MeshLoader";
import { PointLight } from "./Lights/PointLight";
import {
    ThreeJSOBJLoader,
    type EfficientMeshData
} from './Mesh/loaders/ThreeJSOBJLoader';

export enum SceneType {
    TUNG = 'tung',
    TRALALERO = 'tralalero',
    ARTHAS = 'arthas',
    TESTPLANE = 'testplane',
    CORNELEXTRA = 'cornellextra',
    CORNEL = 'cornell',
    CORNELTRANSIENT = 'cornelltransient',
}

enum MeshType {
    TUNG = 'tung',
    TRALALERO = 'tralalero',
    ARTHAS = 'arthas',
    GLOCK = 'glock',
}

export class Scene {
    public camera: Camera = new Camera();
    public materialVec: Material[] = [];
    public sphereVec: { sphere: Sphere, materialIndex: number }[] = [];
    public planeVec: { plane: Plane, materialIndex: number }[] = [];
    public triangleVec: { tri: Triangle, materialIndex: number }[] = [];
    public quadVec: { quad: Quad, materialIndex: number }[] = [];
    public meshVec: { mesh: Mesh, materialIndex: number }[] = [];
    public sceneType: SceneType;
    public pointLightVec: PointLight[] = [];

    // Efficient mesh data for GLSL
    public meshDataVec: EfficientMeshData[] = [];

    constructor(type: SceneType = SceneType.TRALALERO /*SceneType.CORNELTRANSIENT*/) {
        this.sceneType = type;
    }

    public async setupScene() {
        if (this.sceneType === SceneType.TUNG) {
            await this.tungTungTungSahurScene();
        } else if (this.sceneType === SceneType.TRALALERO) {
            await this.tralaleroScene();
        } else if (this.sceneType === SceneType.TESTPLANE) {
            this.testplane();
        } else if (this.sceneType === SceneType.CORNEL) {
            this.cornell();
        } else if (this.sceneType === SceneType.CORNELEXTRA) {
            this.cornellextra();
        } else if (this.sceneType === SceneType.CORNELTRANSIENT) {
            this.cornelltransient();
        } else if (this.sceneType === SceneType.ARTHAS) {
            await this.arthasScene();
        }
        // Add other scenes as needed
    }

    private addMaterial(material: Material): number {
        this.materialVec.push(material);
        return this.materialVec.length - 1;
    }

    private addSphere(sphere: Sphere, materialIndex: number) {
        this.sphereVec.push({
            sphere, materialIndex
        });
    }

    private addPlane(plane: Plane, materialIndex: number) {
        this.planeVec.push({
            plane, materialIndex
        });
    }

    private addTriangle(tri: Triangle, materialIndex: number) {
        this.triangleVec.push({
            tri, materialIndex
        });
    }

    private addQuad(quad: Quad, materialIndex: number) {
        this.addTriangle(quad.t1, materialIndex);
        this.addTriangle(quad.t2, materialIndex);
    }

    private addPointLight(pl: PointLight) {
        this.pointLightVec.push(pl);
    }

    /**
     * Add a mesh to the scene
     * All triangles from the mesh will be added with the specified material
     */
    public addMesh(mesh: Mesh, materialIndex: number) {
        this.meshVec.push({ mesh, materialIndex });
        // Add all mesh triangles to the triangle vector
        mesh.getTriangles().forEach(tri => {
            this.addTriangle(tri, materialIndex);
        });
    }

    private testplane() {
        this.camera = new Camera(new Vector3(0.0, 0.0, 10.0));

        const m1 = this.addMaterial(new Material(
            new Vector3(1.0, 0.0, 0.0),
            0,
            new Vector3(0),
            new Vector3(0),
            1.0
        ));

        const m2 = this.addMaterial(new Material(
            new Vector3(0.0, 1.0, 0.0),
            0,
            new Vector3(0),
            new Vector3(0),
            1.0
        ));

        const m3 = this.addMaterial(new Material(
            new Vector3(0.0, 0.5, 1.0),
            0,
            new Vector3(0),
            new Vector3(0),
            1.0
        ));

        const m4 = this.addMaterial(new Material(
            new Vector3(0.9, 0.9, 0.0),
            0,
            new Vector3(0),
            new Vector3(0),
            1.0
        ));

        const s1: Sphere = new Sphere(
            new Vector3(0.0, 0.0, 0.0),
            1.0);
        this.addSphere(s1, m1);

        const s2 = new Sphere(
            new Vector3(4.0, 1.0, 3.0),
            2.0);
        this.addSphere(s2, m2);

        const s3 = new Sphere(
            new Vector3(4.0, 1.0, -6.0),
            2.0);
        this.addSphere(s3, m2);

        const t1: Triangle = new Triangle(
            new Vector3(-3.0, 0.5, 2.0),
            new Vector3(-6.0, 0.0, 0.0),
            new Vector3(-4.5, 2.5, -2.0),
        );
        this.addTriangle(t1, m4);

        const p1: Plane = new Plane(
            new Vector3(0.0, 1.0, 0.0),
            1.0
        );
        this.addPlane(p1, m3);
    }

    private cornell() {
        this.camera = new Camera(new Vector3(0.0, 0.0, 3.5));

        const red = this.addMaterial(new Material(
            new Vector3(1.0, 0.0, 0.0),
            0,
            new Vector3(0),
            new Vector3(0),
            1.0
        ));

        const green = this.addMaterial(new Material(
            new Vector3(0.0, 1.0, 0.0),
            0,
            new Vector3(0),
            new Vector3(0),
            1.0
        ));

        const purple = this.addMaterial(new Material(
            new Vector3(0.5, 0.9, 0.9),
            0,
            new Vector3(0),
            new Vector3(0),
            1.0
        ));

        const pink = this.addMaterial(new Material(
            new Vector3(0.8, 0.6, 0.9),
            0,
            new Vector3(0),
            new Vector3(0),
            1.0
        ));

        const white = this.addMaterial(new Material(
            new Vector3(1.0, 1.0, 1.0),
            0,
            new Vector3(0),
            new Vector3(0),
            1.0
        ));

        const white_light = this.addMaterial(new Material(
            new Vector3(1.0, 1.0, 1.0),
            1.0,
            new Vector3(0),
            new Vector3(0),
            1.0
        ));

        const floor: Quad = new Quad(
            new Vector3(-1.0, -1.0, -1.0),
            new Vector3(-1.0, -1.0, 1.0),
            new Vector3(1.0, -1.0, 1.0),
            new Vector3(1.0, -1.0, -1.0),
        );
        this.addQuad(floor, white);

        const back: Quad = new Quad(
            new Vector3(-1.0, -1.0, -1.0),
            new Vector3(-1.0, 1.0, -1.0),
            new Vector3(1.0, 1.0, -1.0),
            new Vector3(1.0, -1.0, -1.0),
        );
        this.addQuad(back, white);

        const ceiling: Quad = new Quad(
            new Vector3(-1.0, 1.0, -1.0),
            new Vector3(-1.0, 1.0, 1.0),
            new Vector3(1.0, 1.0, 1.0),
            new Vector3(1.0, 1.0, -1.0),
        );
        this.addQuad(ceiling, white);

        const left: Quad = new Quad(
            new Vector3(-1.0, -1.0, 1.0),
            new Vector3(-1.0, 1.0, 1.0),
            new Vector3(-1.0, 1.0, -1.0),
            new Vector3(-1.0, -1.0, -1.0),
        );
        this.addQuad(left, red);

        const right: Quad = new Quad(
            new Vector3(1.0, -1.0, 1.0),
            new Vector3(1.0, 1.0, 1.0),
            new Vector3(1.0, 1.0, -1.0),
            new Vector3(1.0, -1.0, -1.0),
        );
        this.addQuad(right, green);

        const s1: Sphere = new Sphere(
            new Vector3(0.5, -0.7, -0.25),
            0.3);
        this.addSphere(s1, pink);

        const s2: Sphere = new Sphere(
            new Vector3(-0.5, -0.7, 0.25),
            0.3);
        this.addSphere(s2, purple);


        const l1: PointLight = new PointLight(
            new Vector3(0, 0.95, 0.0),
            new Vector3(1.0, 1.0, 1.0),
            0.1
        );
        this.addPointLight(l1);


    }

    private cornellextra() {
        this.camera = new Camera(new Vector3(0.0, 0.0, 3.5));

        const red = this.addMaterial(new Material(
            new Vector3(1.0, 0.0, 0.0),
            0,
            new Vector3(0),
            new Vector3(0),
            1.0
        ));

        const green = this.addMaterial(new Material(
            new Vector3(0.0, 1.0, 0.0),
            0,
            new Vector3(0),
            new Vector3(0),
            1.0
        ));

        const red_mirror = this.addMaterial(new Material(
            new Vector3(1.0, 0.0, 0.0),
            0,
            new Vector3(0.0, 1.0, 1.0),
            new Vector3(0),
            1.0
        ));

        const green_mirror = this.addMaterial(new Material(
            new Vector3(0.0, 1.0, 0.0),
            0,
            new Vector3(1.0, 0.0, 1.0),
            new Vector3(0),
            1.0
        ));

        const blue = this.addMaterial(new Material(
            new Vector3(0.0, 0.0, 1.0),
            0,
            new Vector3(0),
            new Vector3(0),
            1.0
        ));

        const blue_metal = this.addMaterial(new Material(
            new Vector3(0.0, 0.0, 0.9),
            0,
            new Vector3(0.1, 0.1, 0.1),
            new Vector3(0),
            1.0
        ));

        const yellow = this.addMaterial(new Material(
            new Vector3(1.0, 1.0, 0.0),
            0,
            new Vector3(0),
            new Vector3(0),
            1.0
        ));

        const half_half = this.addMaterial(new Material(
            new Vector3(0.5, 0.5, 0.5),
            0,
            new Vector3(0.5, 0.5, 0.5),
            new Vector3(0),
            1.0
        ));

        const mirror = this.addMaterial(new Material(
            new Vector3(0),
            0,
            new Vector3(1.0, 1.0, 1.0),
            new Vector3(0),
            1.0
        ));

        const white = this.addMaterial(new Material(
            new Vector3(1.0, 1.0, 1.0),
            0,
            new Vector3(0),
            new Vector3(0),
            1.0
        ));

        const white_light = this.addMaterial(new Material(
            new Vector3(1.0, 1.0, 1.0),
            1.0,
            new Vector3(0),
            new Vector3(0),
            1.0
        ));

        const blue_light = this.addMaterial(new Material(
            new Vector3(0.0, 0.85, 1.0),
            1.0,
            new Vector3(0),
            new Vector3(0),
            1.0
        ));

        const glass99 = this.addMaterial(new Material(
            new Vector3(0.0),
            0.0,
            new Vector3(0.01, 0.01, 0.01),
            new Vector3(0.99, 0.99, 0.99),
            1.52
        ));

        const glass95 = this.addMaterial(new Material(
            new Vector3(0.0),
            0.0,
            new Vector3(0.05, 0.05, 0.05),
            new Vector3(0.95, 0.95, 0.95),
            1.52
        ));

        const glass90 = this.addMaterial(new Material(
            new Vector3(0.0),
            0.0,
            new Vector3(0.1, 0.1, 0.1),
            new Vector3(0.9, 0.9, 0.9),
            1.52
        ));

        const glass50 = this.addMaterial(new Material(
            new Vector3(0.0),
            0.0,
            new Vector3(0.5, 0.5, 0.5),
            new Vector3(0.5, 0.5, 0.5),
            1.52
        ));

        const floor: Quad = new Quad(
            new Vector3(-1.0, -1.0, -1.0),
            new Vector3(-1.0, -1.0, 1.0),
            new Vector3(1.0, -1.0, 1.0),
            new Vector3(1.0, -1.0, -1.0),
        );
        this.addQuad(floor, white);

        const back: Quad = new Quad(
            new Vector3(-1.0, -1.0, -1.0),
            new Vector3(-1.0, 1.0, -1.0),
            new Vector3(1.0, 1.0, -1.0),
            new Vector3(1.0, -1.0, -1.0),
        );
        this.addQuad(back, white);

        const ceiling: Quad = new Quad(
            new Vector3(-1.0, 1.0, -1.0),
            new Vector3(-1.0, 1.0, 1.0),
            new Vector3(1.0, 1.0, 1.0),
            new Vector3(1.0, 1.0, -1.0),
        );
        this.addQuad(ceiling, white);

        const left: Quad = new Quad(
            new Vector3(-1.0, -1.0, 1.0),
            new Vector3(-1.0, 1.0, 1.0),
            new Vector3(-1.0, 1.0, -1.0),
            new Vector3(-1.0, -1.0, -1.0),
        );
        this.addQuad(left, red);

        const right: Quad = new Quad(
            new Vector3(1.0, -1.0, 1.0),
            new Vector3(1.0, 1.0, 1.0),
            new Vector3(1.0, 1.0, -1.0),
            new Vector3(1.0, -1.0, -1.0),
        );
        this.addQuad(right, green);

        const s1: Sphere = new Sphere(
            new Vector3(0.5, -0.7, -0.25),
            0.3);
        this.addSphere(s1, yellow);

        const s2: Sphere = new Sphere(
            new Vector3(-0.5, -0.7, 0.25),
            0.3);
        this.addSphere(s2, blue_metal);

        const s3: Sphere = new Sphere(
            new Vector3(0.0, -0.75, 0.5),
            0.25);
        this.addSphere(s3, glass95);

        const s4: Sphere = new Sphere(
            new Vector3(-0.8, -0.9, 0.4),
            0.1);
        this.addSphere(s4, blue_light);

        const s5: Sphere = new Sphere(
            new Vector3(0.8, -0.8, 0.4),
            0.2);
        this.addSphere(s5, mirror);

        const s6: Sphere = new Sphere(
            new Vector3(0.7, 0.5, 0.5),
            0.2);
        this.addSphere(s6, glass50);

        const s7: Sphere = new Sphere(
            new Vector3(-0.7, 0.5, 0.5),
            0.2);
        this.addSphere(s7, half_half);

        const cool_factor: number = 0.5;

        const q1: Quad = new Quad(
            new Vector3(-cool_factor, -1.0, -1.0),
            new Vector3(-cool_factor, 1.0, -1.0),
            new Vector3(-1.0, 1.0, -cool_factor),
            new Vector3(-1.0, -1.0, -cool_factor),
        );
        this.addQuad(q1, mirror);

        const q2: Quad = new Quad(
            new Vector3(cool_factor, -1.0, -1.0),
            new Vector3(cool_factor, 1.0, -1.0),
            new Vector3(1.0, 1.0, -cool_factor),
            new Vector3(1.0, -1.0, -cool_factor),
        );
        this.addQuad(q2, mirror);

        const q3: Quad = new Quad(
            new Vector3(-1.0, -1.0, -cool_factor),
            new Vector3(-1.0, -cool_factor, -1.0),
            new Vector3(1.0, -cool_factor, -1.0),
            new Vector3(1.0, -1.0, -cool_factor),
        );
        //this.addQuad(q3,mirror);

        const q4: Quad = new Quad(
            new Vector3(-1.0, 1.0, -cool_factor),
            new Vector3(-1.0, cool_factor, -1.0),
            new Vector3(1.0, cool_factor, -1.0),
            new Vector3(1.0, 1.0, -cool_factor),
        );
        //this.addQuad(q4,mirror);

        // Mirror cube as skybox
        if (false) {
            const mirror_cube_d = 5.0

            const pback: Plane = new Plane(
                new Vector3(0.0, 0.0, 1.0),
                mirror_cube_d
            );
            this.addPlane(pback, mirror)

            const pfront: Plane = new Plane(
                new Vector3(0.0, 0.0, -1.0),
                mirror_cube_d
            );
            this.addPlane(pfront, mirror)

            const pleft: Plane = new Plane(
                new Vector3(-1.0, 0.0, 0.0),
                mirror_cube_d
            );
            this.addPlane(pleft, mirror)

            const pright: Plane = new Plane(
                new Vector3(1.0, 0.0, 0.0),
                mirror_cube_d
            );
            this.addPlane(pright, mirror)

            const pdown: Plane = new Plane(
                new Vector3(0.0, -1.0, 0.0),
                mirror_cube_d
            );
            this.addPlane(pdown, mirror)

            const pup: Plane = new Plane(
                new Vector3(0.0, 1.0, 0.0),
                mirror_cube_d
            );
            this.addPlane(pup, mirror)
        }


        const l1: PointLight = new PointLight(
            new Vector3(0, 0.95, 0.0),
            new Vector3(1.0, 1.0, 1.0),
            0.1
        );
        this.addPointLight(l1);

        const l2: PointLight = new PointLight(
            new Vector3(0, 0.0, -0.95),
            new Vector3(1, 0.019, 0.878),
            0.1
        );
        //this.addPointLight(l2);


    }

    private cornelltransient() {
        this.camera = new Camera(new Vector3(0.0, 0.0, 3.5));

        const red = this.addMaterial(new Material(
            new Vector3(1.0, 0.0, 0.0),
            0,
            new Vector3(0),
            new Vector3(0),
            1.0
        ));

        const green = this.addMaterial(new Material(
            new Vector3(0.0, 1.0, 0.0),
            0,
            new Vector3(0),
            new Vector3(0),
            1.0
        ));

        const purple = this.addMaterial(new Material(
            new Vector3(0.5, 0.9, 0.9),
            0,
            new Vector3(0),
            new Vector3(0),
            1.0
        ));

        const pink = this.addMaterial(new Material(
            new Vector3(0.8, 0.6, 0.9),
            0,
            new Vector3(0),
            new Vector3(0),
            1.0
        ));

        const white = this.addMaterial(new Material(
            new Vector3(1.0, 1.0, 1.0),
            0,
            new Vector3(0),
            new Vector3(0),
            1.0
        ));

        const white_light = this.addMaterial(new Material(
            new Vector3(1.0, 1.0, 1.0),
            1.0,
            new Vector3(0),
            new Vector3(0),
            1.0
        ));

        const glass95 = this.addMaterial(new Material(
            new Vector3(0.0),
            0.0,
            new Vector3(0.05, 0.05, 0.05),
            new Vector3(0.95, 0.95, 0.95),
            1.52
        ));

        const floor: Quad = new Quad(
            new Vector3(-1.0, -1.0, -1.0),
            new Vector3(-1.0, -1.0, 1.0),
            new Vector3(1.0, -1.0, 1.0),
            new Vector3(1.0, -1.0, -1.0),
        );
        //this.addQuad(floor,white);

        const back: Quad = new Quad(
            new Vector3(-1.0, -1.0, -1.0),
            new Vector3(-1.0, 1.0, -1.0),
            new Vector3(1.0, 1.0, -1.0),
            new Vector3(1.0, -1.0, -1.0),
        );
        //this.addQuad(back,white);


        const right: Quad = new Quad(
            new Vector3(-1.0, -1.0, 1.0),
            new Vector3(-1.0, 1.0, 1.0),
            new Vector3(-1.0, 1.0, -1.0),
            new Vector3(-1.0, -1.0, -1.0),
        );
        //this.addQuad(right,red);

        const floor_panel: Plane = new Plane(
            new Vector3(0.0, 1.0, 0.0),
            1.0
        );
        this.addPlane(floor_panel, white);

        const s1: Sphere = new Sphere(
            new Vector3(0.5, -0.7, -0.25),
            0.3);
        this.addSphere(s1, red);

        const s2: Sphere = new Sphere(
            new Vector3(-0.5, -0.7, 0.25),
            0.3);
        this.addSphere(s2, glass95);

        const glass_panel: Quad = new Quad(
            new Vector3(-1.0, -1.0, -1.0),
            new Vector3(-1.0, 1.0, -1.0),
            new Vector3(1.0, 1.0, -1.0),
            new Vector3(1.0, -1.0, -1.0),
        );
        this.addQuad(glass_panel, glass95);

        const x = 0.5;
        const glass_panel_2: Quad = new Quad(
            new Vector3(1.0, -1.0, -1.0 + x),
            new Vector3(1.0, 1.0, -1.0 + x),
            new Vector3(-1.0, 1.0, -1.0 + x),
            new Vector3(-1.0, -1.0, -1.0 + x),
        );
        this.addQuad(glass_panel_2, glass95);

        const wall: Quad = new Quad(
            new Vector3(-1.0, -1.0, 3.0),
            new Vector3(-1.0, 1.0, 3.0),
            new Vector3(-1.0, 1.0, 1.0),
            new Vector3(-1.0, -1.0, 1.0),
        );
        this.addQuad(wall, red);

        const s3: Sphere = new Sphere(
            new Vector3(-4.0, 0.0, 2.0),
            1.0);
        this.addSphere(s3, white_light);

        const l1: PointLight = new PointLight(
            new Vector3(2.0, 0.0, 2.0),
            new Vector3(1.0, 1.0, 1.0),
            5.0
        );
        this.addPointLight(l1);
    }

    private async tungTungTungSahurScene() {
        this.camera = new Camera(new Vector3(0.0, -5.0, -4.0));
        const yellow = this.addMaterial(new Material(
            new Vector3(1, 1, 0),
            0,
            new Vector3(0),
            new Vector3(0),
            1.0
        ));
        const lightBlue = this.addMaterial(
            new Material(new Vector3(0.0, 0.5, 1.0),
                0,
                new Vector3(0),
                new Vector3(0),
                1.0
            ));
        const p1: Plane = new Plane(
            new Vector3(0.0, 1.0, 0.0),
            1.0
        );
        this.addPlane(p1, lightBlue);

        // Load meshes
        try {
            const tungMesh = await MeshLoader.load("/models/obj/tung/original/tung.obj", MeshType.TUNG);
            tungMesh.scale(new Vector3(0.002, 0.002, 0.002));
            this.addMesh(tungMesh, yellow);
            console.log("✓ Tung mesh loaded successfully");

            const glockMesh = await MeshLoader.load("/models/obj/glock/original/model.obj", MeshType.GLOCK);
            glockMesh.translate(new Vector3(0, 1.0, 1.0));
            this.addMesh(glockMesh, yellow);
            console.log("✓ Glock mesh loaded successfully");
        } catch (error) {
            console.warn("⚠ Could not load mesh:", error);
        }
    }

    private async tralaleroScene() {
        this.camera = new Camera(new Vector3(0.0, -6.0, -4.0));
        const yellow = this.addMaterial(
            new Material(
                new Vector3(1, 1, 0),
                0,
                new Vector3(0),
                new Vector3(0),
                1.0
            ));
        const salmon = this.addMaterial(
            new Material(new Vector3(1.0, 0.5, 0.4),
                0,
                new Vector3(0),
                new Vector3(0),
                1.0
            ));
        const p1: Plane = new Plane(
            new Vector3(0.0, 1.0, 0.0),
            3.0
        );
        this.addPlane(p1, salmon);

        const magenta = this.addMaterial(
            new Material(new Vector3(1.0, 0.0, 1.0),
                0,
                new Vector3(0),
                new Vector3(0),
                1.0
            ));

        const cyan = this.addMaterial(
            new Material(new Vector3(0.0, 0.5, 1.0),
                0,
                new Vector3(0),
                new Vector3(0),
                1.0
            ));

        // Load mesh
        try {
            /*const tralaleroMesh = await MeshLoader.load("/models/obj/tralalero/original/model.obj", MeshType.TRALALERO);
            this.addMesh(tralaleroMesh, yellow);*/
            // const tralaleroMesh = await ThreeJSOBJLoader.load("models/obj/tralalero/original/model.obj");
            // const tralaleroMesh = await ThreeJSOBJLoader.load("models/obj/skull/skull.obj");
            // const tralaleroMesh = await ThreeJSOBJLoader.load("models/obj/tetrahedron/pyramid.obj");
            // const tralaleroMesh = await ThreeJSOBJLoader.load("models/obj/hexahedron/scene.obj");
            // const tralaleroMesh = await ThreeJSOBJLoader.load("models/obj/dodecahedron/dodecahedron.obj");
            const tralaleroMesh = await ThreeJSOBJLoader.load("models/obj/skull-detailed/craneo.obj");
            // const tralaleroMesh = await ThreeJSOBJLoader.load("/models/obj/skull/skull.obj");
            // const tralaleroMesh = await ThreeJSOBJLoader.load("models/obj/vaca/optim/LP.obj");
            // const tralaleroMesh = await ThreeJSOBJLoader.load("models/obj/goldfish/goldfish.obj");
            // const tralaleroMesh = await ThreeJSOBJLoader.load("models/obj/glowfish/Glowfish.obj");
            this.addEfficientMeshData(tralaleroMesh);
            console.log("✓ Tralalero mesh loaded successfully");
        } catch (error) {
            console.warn("⚠ Could not load mesh:", error);
        }
    }

    private async arthasScene() {
        this.camera = new Camera(new Vector3(0.0, -13.0, -10.0));
        const yellow = this.addMaterial(
            new Material(
                new Vector3(1, 1, 0),
                0,
                new Vector3(0),
                new Vector3(0),
                1.0
            ));
        const lightBlue = this.addMaterial(
            new Material(new Vector3(0.0, 0.5, 1.0),
                0,
                new Vector3(0),
                new Vector3(0),
                1.0
            ));
        const p1: Plane = new Plane(
            new Vector3(0.0, 1.0, 0.0),
            1.0
        );
        this.addPlane(p1, lightBlue);

        // Load mesh
        try {
            const arthasMesh = await MeshLoader.load("/models/obj/arthas/optim/Arthas.obj", MeshType.ARTHAS);
            arthasMesh.scale(new Vector3(4.0, 4.0, 4.0));
            this.addMesh(arthasMesh, yellow);
            console.log("✓ Arthas mesh loaded successfully");
        } catch (error) {
            console.warn("⚠ Could not load mesh:", error);
        }
    }

    /**
     * Add efficient mesh data to the scene
     */
    public addEfficientMeshData(data: EfficientMeshData) {
        this.meshDataVec.push(data);
    }

    public serializeStaticBlock(): Float32Array {
        const data: number[] = [];
        console.log("Total materials (non-mesh):", this.materialVec.length);
        data.push(...this.serializeMaterialVec(),
            ...this.serializeSphereVec(),
            ...this.serializePlaneVec(),
            ...this.serializeTriangleVec(),
            ...this.serializePointLightVec(),
            ...this.serializeMeshInfoVec()
        );
        return new Float32Array(data);
    }

    public serializeMaterialVec(): Float32Array {
        let arr: number[] = [];
        this.materialVec.forEach(m => {
            // Spread material onto the arr
            arr.push(...(m.serialize()));
        });
        console.log("Serialized material vector length:", arr.length);
        const ret: Float32Array = new Float32Array(arr);

        return ret;
    }

    public serializeSphereVec(): Float32Array {
        let arr: number[] = [];
        this.sphereVec.forEach(s => {
            // Spread serialized sphere and material index onto the arr
            arr.push(...(s.sphere.serialize(s.materialIndex)));
        });
        console.log("Serialized sphere vector length:", arr.length);
        const ret: Float32Array = new Float32Array(arr);

        return ret;
    }

    public serializePlaneVec(): Float32Array {
        let arr: number[] = [];
        this.planeVec.forEach(p => {
            // Spread serialized plane and material index onto the arr
            arr.push(...p.plane.serialize(p.materialIndex));
        });
        console.log("Serialized plane vector length:", arr.length);
        const ret: Float32Array = new Float32Array(arr);

        return ret;
    }

    public serializeTriangleVec(): Float32Array {
        let arr: number[] = [];
        this.triangleVec.forEach(t => {
            // Spread serialized triangle and material index onto the arr
            arr.push(...t.tri.serialize(t.materialIndex));
        });
        console.log("Serialized triangle vector length:", arr.length);
        const ret: Float32Array = new Float32Array(arr);

        return ret;
    }

    public serializePointLightVec(): Float32Array {
        let arr: number[] = [];
        this.pointLightVec.forEach(pl => {
            // Spread serialized point light onto the arr
            arr.push(...pl.serialize());
        });
        console.log("Serialized point light vector length:", arr.length);
        const ret: Float32Array = new Float32Array(arr);

        return ret;
    }

    public serializeMeshInfoVec(): Float32Array {
        let arr: number[] = [];
        let triangleStart = 0;
        // let materialOffset = this.materialVec.length;  // Start after scene materials

        for (const meshData of this.meshDataVec) {
            const triangleCount = meshData.positionIndices.length / 3;

            // Use a random material index from scene materials for testing
            // const randomMatIdx = Math.floor(Math.random() * this.materialVec.length);
            const matIdx = this.materialVec.length - 1;
            console.log("MeshInfo - triangleCount:", triangleCount);
            console.log("MeshInfo - matIdx:", matIdx);
            console.log("MeshInfo - triangleStart:", triangleStart);
            // std140 pads struct members to vec4 boundaries. MeshInfo contains 3 ints -> occupies 16 bytes (4 floats)
            // Push an extra padding float (0) so the Uniform Buffer matches the shader's expected size.
            const ret = new Float32Array([0, 0, 0, 0]);
            (new Int32Array(ret.buffer))[0] = triangleStart;
            (new Int32Array(ret.buffer))[1] = triangleCount;
            (new Int32Array(ret.buffer))[2] = matIdx;
            // index 3 is padding, already 0
            arr.push(...ret);
            triangleStart += triangleCount;
            // materialOffset += meshData.materials.length;
        }
        console.log("Serialized mesh info vector length:", arr.length);
        const ret: Float32Array = new Float32Array(arr);

        return ret;
    }
    /**
     * Returns concatenated mesh texture buffers for all meshes in the scene.
     */
    public getMeshTextureBuffers() {
        let positionsList: Float32Array[] = [];
        let normalsList: Float32Array[] = [];
        let uvsList: Float32Array[] = [];
        let indexList: Uint32Array[] = [];
        let normalIndexList: Uint32Array[] = [];
        let uvIndexList: Uint32Array[] = [];
        let triMatList: Uint32Array[] = [];
        let materialsList: Float32Array[] = [];
        let bvhList: Float32Array[] = [];

        let positionsCount = 0;
        let trianglesCount = 0;
        let materialOffset = 0;

        for (const meshData of this.meshDataVec) {
            const s = meshData.serializeTextures();

            // Offset triangle material indices by cumulative material count
            // TODO, revise
            const offsetTriMat = new Uint32Array(s.triangleMaterials.length);
            for (let i = 0; i < s.triangleMaterials.length; i++) {
                offsetTriMat[i] = s.triangleMaterials[i] + materialOffset;
            }
            triMatList.push(offsetTriMat);

            positionsList.push(s.positionsRGBA);
            normalsList.push(s.normalsRGBA);
            uvsList.push(s.uvsRG);
            indexList.push(s.positionIndices);
            normalIndexList.push(s.normalIndices);
            uvIndexList.push(s.uvIndices);
            materialsList.push(s.materialsFloat);
            bvhList.push(s.bvh);

            positionsCount += s.positionsRGBA.length / 4;
            trianglesCount += s.positionIndices.length / 3;
            materialOffset += s.materialsFloat.length / 16;  // 16 floats per material
        }

        // Concatenate arrays
        const positionsConcat = concatFloat32Arrays(positionsList);
        const normalsConcat = concatFloat32Arrays(normalsList);
        const uvsConcat = concatFloat32Arrays(uvsList);
        const indicesConcat = concatUint32Arrays(indexList);
        const normalIndicesConcat = concatUint32Arrays(normalIndexList);
        const uvIndicesConcat = concatUint32Arrays(uvIndexList);
        const triMatConcat = concatUint32Arrays(triMatList);
        const materialsConcat = concatFloat32Arrays(materialsList);
        const bvhConcat = concatFloat32Arrays(bvhList);

        return {
            positions: positionsConcat,
            normals: normalsConcat,
            uvs: uvsConcat,
            positionIndices: indicesConcat,
            normalIndices: normalIndicesConcat,
            uvIndices: uvIndicesConcat,
            triangleMaterials: triMatConcat,
            materialsFloat: materialsConcat,
            bvh: bvhConcat,
            positionsCount,
            trianglesCount,
            materialsCount: materialOffset
        };
    }

}

// Small helpers for concatenation
function concatFloat32Arrays(arrs: Float32Array[]): Float32Array {
    if (arrs.length === 0) return new Float32Array(0);
    let total = 0;
    for (const a of arrs) total += a.length;
    const out = new Float32Array(total);
    let off = 0;
    for (const a of arrs) { out.set(a, off); off += a.length; }
    return out;
}

function concatUint32Arrays(arrs: Uint32Array[]): Uint32Array {
    if (arrs.length === 0) return new Uint32Array(0);
    let total = 0;
    for (const a of arrs) total += a.length;
    const out = new Uint32Array(total);
    let off = 0;
    for (const a of arrs) { out.set(a, off); off += a.length; }
    return out;
}

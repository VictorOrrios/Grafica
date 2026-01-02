import { Vector2, Vector3 } from "math.gl";
import { Sphere } from "./Primitives/Sphere"
import { Camera } from "./camera";
import { Material } from "./Primitives/Material";
import { Plane } from "./Primitives/Plane";
import { Triangle } from "./Primitives/Triangle";
import { NormalStrategy } from "./Mesh/loaders/constants";
import { Quad } from "./Primitives/Quad";
import { SimpleMesh } from "./Primitives/SimpleMesh";
import { MeshLoader } from "./Mesh/loaders/legacy/MeshLoader";
import { PointLight } from "./Lights/PointLight";
import {
    ThreeJSOBJLoader,
    type EfficientMeshData
} from './Mesh/loaders/OBJLoader';
import { roughness } from "three/tsl";
import { Channels, TextureManager, type LoadedTextureInfo } from "./Textures/texture-manager";
import { GLTFLoader } from "./Mesh/loaders/GLTFLoader";

export enum SceneType {
    TESTPLANE = 'testplane',
    PALETTE = 'palette',
    CORNELEXTRA = 'cornellextra',
    CORNEL = 'cornell',
    CORNELTRANSIENT = 'cornelltransient',
    SIMPLEMESH = 'simplem',
    BVHMESH = 'bvhmesh',
    GLTF_BVH = 'glbvh',
    BRUCE = 'bruce',
}

export class Scene {
    public camera: Camera = new Camera();
    public materialVec: Material[] = [];
    public sphereVec: { sphere: Sphere, materialIndex: number }[] = [];
    public planeVec: { plane: Plane, materialIndex: number }[] = [];
    public triangleVec: { tri: Triangle, materialIndex: number }[] = [];
    public quadVec: { quad: Quad, materialIndex: number }[] = [];
    public simpleMeshVec: { mesh: SimpleMesh, materialIndex: number }[] = [];
    public sceneType: SceneType;
    public pointLightVec: PointLight[] = [];
    public meshDataVec: EfficientMeshData[] = [];
    public tex_manager: TextureManager = new TextureManager();

    constructor(type: SceneType = SceneType.CORNEL) {
        this.sceneType = type;
    }

    public async setupScene() {
        if (this.sceneType === SceneType.TESTPLANE) {
            await this.testplane();
        }else if(this.sceneType === SceneType.PALETTE) {
            await this.palette();
        }
        else if (this.sceneType === SceneType.CORNEL) {
            await this.cornell();
        }else if (this.sceneType === SceneType.BRUCE) {
            await this.bruce();
        }
        /*
        } else if (this.sceneType === SceneType.CORNELEXTRA) {
            this.cornellextra();
        } else if (this.sceneType === SceneType.CORNELTRANSIENT) {
            this.cornelltransient();
        } else if (this.sceneType === SceneType.SIMPLEMESH) {
            await this.simpleMeshScene();
        } else if (this.sceneType === SceneType.BVHMESH) {
            await this.bvhMeshScene();
        } else if (this.sceneType === SceneType.GLTF_BVH) {
            await this.bhvGLTFScene();
        }
        */
    }

    

    private async testplane() {
        this.camera = new Camera(new Vector3(0.0, 0.0, 7.0));
        
        const debug_purple = this.addMaterial(new Material({
            albedo: new Vector3(1, 0.058, 0.933),
            roughness: 0.8,
        }));

        const white_matte = this.addMaterial(new Material({
            roughness: 0.8,
        }));

        const plastic = this.addMaterial(new Material({
            albedo: new Vector3(0.3,0.5,0.3),
            roughness: 0.3,
        }));

        const white_light = this.addMaterial(new Material({
            albedo: new Vector3(1.0,1.0,1.0),
            emission: 10.0
        }));

        const test_rm:LoadedTextureInfo = await this.tex_manager.addRoughMetal(
            "materials/rmTest.jpg");

        const brick_albedo:LoadedTextureInfo = await this.tex_manager.addAlbedo(
            "materials/gltf/stacked_stone_wall_1k.gltf/textures/stacked_stone_wall_diff_1k.jpg");
        const brick_normal:LoadedTextureInfo = await this.tex_manager.addNormal(
            "materials/gltf/stacked_stone_wall_1k.gltf/textures/stacked_stone_wall_nor_gl_1k.jpg");
        const brick_rm:LoadedTextureInfo = await this.tex_manager.addRoughMetal(
            "materials/gltf/stacked_stone_wall_1k.gltf/textures/stacked_stone_wall_arm_1k.jpg");
        const brick = this.addMaterial(new Material({
            albedo_tex_info:brick_albedo,
            normal_tex_info:brick_normal, 
            roughmetal_tex_info:brick_rm,
            reflectance: 0.5
        }));   
        
        const wood_albedo:LoadedTextureInfo = await this.tex_manager.addAlbedo(
            "materials/gltf/rough_pine_door_1k.gltf/textures/rough_pine_door_diff_1k.jpg");
        const wood_normal:LoadedTextureInfo = await this.tex_manager.addNormal(
            "materials/gltf/rough_pine_door_1k.gltf/textures/rough_pine_door_nor_gl_1k.jpg");
        const wood_rm:LoadedTextureInfo = await this.tex_manager.addRoughMetal(
            "materials/gltf/rough_pine_door_1k.gltf/textures/rough_pine_door_arm_1k.jpg");
        const wood = this.addMaterial(new Material({
            albedo_tex_info:wood_albedo,
            normal_tex_info:wood_normal,
            roughmetal_tex_info:wood_rm,
            reflectance: 0.5,
        })); 
        
        const wood2_albedo:LoadedTextureInfo = await this.tex_manager.addAlbedo(
            "materials/gltf/wood_table_001_1k.gltf/textures/wood_table_001_diff_1k.jpg");
        const wood2_normal:LoadedTextureInfo = await this.tex_manager.addNormal(
            "materials/gltf/wood_table_001_1k.gltf/textures/wood_table_001_nor_gl_1k.jpg");
        const wood2_rm:LoadedTextureInfo = await this.tex_manager.addRoughMetal(
            "materials/gltf/wood_table_001_1k.gltf/textures/wood_table_001_rough_1k.jpg",Channels.RG);
        const wood2 = this.addMaterial(new Material({
            albedo_tex_info:wood2_albedo,
            normal_tex_info:wood2_normal,
            roughmetal_tex_info:wood2_rm,
            reflectance: 0.5,
        })); 

        const metal_albedo:LoadedTextureInfo = await this.tex_manager.addAlbedo(
            "materials/gltf/corrugated_iron_1k.gltf/textures/corrugated_iron_diff_1k.jpg");
        const metal_normal:LoadedTextureInfo = await this.tex_manager.addNormal(
            "materials/gltf/corrugated_iron_1k.gltf/textures/corrugated_iron_nor_gl_1k.jpg");
        const metal_rm:LoadedTextureInfo = await this.tex_manager.addRoughMetal(
            "materials/gltf/corrugated_iron_1k.gltf/textures/corrugated_iron_arm_1k.jpg");
        const metal = this.addMaterial(new Material({
            albedo_tex_info:metal_albedo,
            normal_tex_info:metal_normal, 
            roughmetal_tex_info:metal_rm,
            reflectance: 0.5,
        })); 

        const metal2_albedo:LoadedTextureInfo = await this.tex_manager.addAlbedo(
            "materials/gltf/rusty_metal_04_1k.gltf/textures/rusty_metal_04_diff_1k.jpg");
        const metal2_normal:LoadedTextureInfo = await this.tex_manager.addNormal(
            "materials/gltf/rusty_metal_04_1k.gltf/textures/rusty_metal_04_nor_gl_1k.jpg");
        const metal2_rm:LoadedTextureInfo = await this.tex_manager.addRoughMetal(
            "materials/gltf/rusty_metal_04_1k.gltf/textures/rusty_metal_04_arm_1k.jpg");
        const metal2 = this.addMaterial(new Material({
            albedo_tex_info:metal2_albedo,
            normal_tex_info:metal2_normal, 
            roughmetal_tex_info:metal2_rm,
            reflectance: 0.5,
        })); 

        const dirty_glass_rm:LoadedTextureInfo = await this.tex_manager.addRoughMetal(
            "materials/gltf/earth.jpg",Channels.RG);
        const dirty_glass = this.addMaterial(new Material({
            roughmetal_tex_info:dirty_glass_rm,
            roughness:0.0,
            reflectance: 0.5,
            trs_weight:1.0,
        })); 

        const earth_mirror_rm:LoadedTextureInfo = await this.tex_manager.addRoughMetal(
            "materials/gltf/earth3.jpg",Channels.RG);
        const earth_mirror = this.addMaterial(new Material({
            roughmetal_tex_info:earth_mirror_rm,
            reflectance: 0.5,
        })); 

        const mirror = this.addMaterial(new Material({
            roughness: 0.0,
            metalness: 1.0
        }));

        const blue_matte = this.addMaterial(new Material({
            albedo: new Vector3(0.271, 0.467, 0.78),
            roughness: 1.0,
            metalness: 0.0,
            reflectance: 0.0
        }));

        const green_glass = this.addMaterial(new Material({
            albedo: new Vector3(0.9,1.0,0.9),
            subsurface_color: new Vector3(0.5,1.0,0.5),
            roughness: 0.1,
            metalness: 0.0,
            reflectance: 0.5,
            trs_weight: 1.0
        }));



        const s1: Sphere = new Sphere(
            new Vector3(-0.95, 1.4, -0.55),
            0.5,
            new Vector2(1.3,1.0),new Vector2(0.0,0.0),
            new Vector3(0.0,1.0,0.0), new Vector3(0.0,0.0,-1.0)
        );
        //this.addSphere(s1, dirty_glass);

        const s2 = new Sphere(
            new Vector3(4.0, 1.0, 3.0),
            2.0);
        //this.addSphere(s2, white_matte);

        const s3 = new Sphere(
            new Vector3(4.0, 1.0, -6.0),
            2.0);
        this.addSphere(s3, wood2);

        const s4 = new Sphere(
            new Vector3(-4.0, 1.0, -6.0),
            2.0);
        this.addSphere(s4, mirror);

        const s5 = new Sphere(
            new Vector3(0.0, 15.0, 0.0),
            8.0);
        //this.addSphere(s5, white_light);

        const t1: Triangle = new Triangle(
            new Vector3(4.0, -1.0, -9.0),
            new Vector3(4.0, 5.0, -9.0),
            new Vector3(-4.0, 5.0, -9.0),
        );
        //this.addTriangle(t1, brick);

        const t2: Triangle = new Triangle(
            new Vector3(4.0, -1.0, -9.0),
            new Vector3(-4.0, 5.0, -9.0),
            new Vector3(-4.0, -1.0, -9.0),
            new Vector2(0.0,0.0),
            new Vector2(1.0,1.0),
            new Vector2(1.0,0.0),
        );
        //this.addTriangle(t2, brick);

        const q1: Quad = new Quad(
            new Vector3(5.0, -1.0, -12.0),
            new Vector3(5.0, 7.0, -12.0),
            new Vector3(-5.0, 7.0, -12.0),
            new Vector3(-5.0, -1.0, -12.0),
        );
        //this.addQuad(q1,brick);

        const p1: Plane = new Plane(
            new Vector3(0.0, 1.0, 0.0),
            1.0,
            0.2
        );
        this.addPlane(p1, wood);

        const l1: PointLight = new PointLight(
            new Vector3(0, 3.0, 2.0),
            new Vector3(1.0, 1.0, 1.0),
            50.0
        );
        this.addPointLight(l1);

        const l2: PointLight = new PointLight(
            new Vector3(0, 8.0, -11.5),
            new Vector3(1.0, 1.0, 1.0),
            100.0
        );
        //this.addPointLight(l2);

        
        // Wood elephant
        /*
        await this.addGLTFModel(
            "models/gltf/wood_elephant/wood_elephant.gltf", 
            20.0, new Vector3(0.0,0.0,0.0), new Vector3(0.0,-1.0,-1.0), 
            NormalStrategy.INTERPOLATED,Channels.RG,
            
        )
            */
        

        /*
        // Stone kitty ^.^
        await this.addGLTFModel(
            "models/gltf/concrete_kitty/scene.gltf", 
            7.0, new Vector3(0.0,0.0,0.0), new Vector3(0.0,-1.0,0.0), 
            NormalStrategy.INTERPOLATED,Channels.GB
        )
        */

        // Dragon 5k tris
        await this.addGLTFModel(
            "models/gltf/stenford_dragon_low/stenford_dragon_low.gltf", 
            0.006, new Vector3(Math.PI/2.0,Math.PI,-Math.PI/2.0), new Vector3(0.0,-0.45,0.0), 
            NormalStrategy.INTERPOLATED,Channels.RG,
            plastic
        )

        ///*
        // Dragon 19k tris
        await this.addGLTFModel(
            "models/gltf/stanford_dragon_pbr/scene.gltf", 
            0.0135, new Vector3(0.0,0.0,0.0), new Vector3(0.0,-1.0,0.0), 
            NormalStrategy.INTERPOLATED,Channels.RG,
            plastic
        )
        //*/
            

        /*
        // Dragon 232k tris
        await this.addGLTFModel(
            "models/gltf/dragon/scene.gltf", 
            0.03, new Vector3(0.0,0.0,0.0), new Vector3(-0.7,-1.0,0.0), 
            NormalStrategy.INTERPOLATED,Channels.RG,
            plastic
        )
            */
            

    }

    private async palette(){
        this.camera = new Camera(new Vector3(0.0, 0.0, 30.0));

        const test_tex_albedo:LoadedTextureInfo = await this.tex_manager.addAlbedo(
            "materials/gltf/stacked_stone_wall_1k.gltf/textures/stacked_stone_wall_diff_1k.jpg");
        const test_tex_normal:LoadedTextureInfo = await this.tex_manager.addNormal(
            "materials/gltf/stacked_stone_wall_1k.gltf/textures/stacked_stone_wall_nor_gl_1k.jpg");
        const samples = 7;
        const offset = (samples-1.0)*2.5/2;
        for (let r = 0; r < samples; r++) {
            for (let m = 0; m < samples; m++) {
                let mat = this.addMaterial(new Material({
                    albedo: new Vector3(1.0, 1.0, 1.0),
                    //albedo_tex_info: test_tex_albedo,
                    //normal_tex_info: test_tex_normal,
                    roughness: r/(samples-1),
                    metalness: m/(samples-1),
                    reflectance: 0.5,
                }));
                this.addSphere(
                    new Sphere(
                        new Vector3(r*2.5-offset, m*2.5-offset, 0.0),
                        1.0),
                    mat);
            }
        }

        const white_light = this.addMaterial(new Material({
            albedo: new Vector3(1.0,1.0,1.0),
            emission: 1000.0
        }));

        const s5 = new Sphere(
            new Vector3(-4.0, 15.0, 30.0),
            5.0);
        this.addSphere(s5, white_light);
    }

    
    private async cornell() {
        this.camera = new Camera(new Vector3(0.0, 0.0, 3.5));

        const red = this.addMaterial(new Material({
            albedo: new Vector3(1.0,0.0,0.0)
        }));

        const green = this.addMaterial(new Material({
            albedo: new Vector3(0.0,1.0,0.0)
        }));

        const purple = this.addMaterial(new Material({
            albedo: new Vector3(0.5, 0.9, 0.9)
        }));

        const pink = this.addMaterial(new Material({
            albedo: new Vector3(0.8, 0.6, 0.9),
            roughness: 0.3
        }));

        const white = this.addMaterial(new Material({
            albedo: new Vector3(1.0,1.0,1.0)
        }));
        
        const white_light = this.addMaterial(new Material({
            albedo: new Vector3(1.0,1.0,1.0),
            emission: 1.0
        }));

        const floor: Quad = new Quad(
            new Vector3(-1.0, -1.0, -1.0),
            new Vector3(-1.0, -1.0, 1.0),
            new Vector3(1.0, -1.0, 1.0),
            new Vector3(1.0, -1.0, -1.0),
        );
        this.addQuad(floor, white);

        const back: Quad = new Quad(
            new Vector3(-1.0, -1.0, -0.9999),
            new Vector3(-1.0, 1.0, -1.0),
            new Vector3(1.0, 1.0, -1.0),
            new Vector3(1.0, -1.0, -0.9999),
        );
        this.addQuad(back, white);

        const ceiling: Quad = new Quad(
            new Vector3(-1.0, 1.0, -1.0),
            new Vector3(-1.0, 1.0, 1.0),
            new Vector3(1.0, 1.0, 1.0),
            new Vector3(1.0, 1.0, -1.0),
        );
        this.addQuad(ceiling, white);

        const ceiling_light_size = 0.3
        const ceiling_light: Quad = new Quad(
            new Vector3(-ceiling_light_size, 0.995, -ceiling_light_size),
            new Vector3(-ceiling_light_size, 0.995, ceiling_light_size),
            new Vector3(ceiling_light_size, 0.995, ceiling_light_size),
            new Vector3(ceiling_light_size, 0.995, -ceiling_light_size),
        );
        //this.addQuad(ceiling_light, white_light);

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
        //this.addSphere(s1, pink);

        const s2: Sphere = new Sphere(
            new Vector3(-0.5, -0.7, 0.25),
            0.3);
        //this.addSphere(s2, purple);

        

        const l1: PointLight = new PointLight(
            new Vector3(0, 0.95, 0.0),
            new Vector3(1.0, 1.0, 1.0),
            1.0
        );
        this.addPointLight(l1);

        /*
        await this.addGLTFModel(
            "models/gltf/helmet/DamagedHelmet.gltf", 
            0.5, new Vector3(Math.PI/2.0,0.0,Math.PI/4), new Vector3(0.0,0.0,0.0), 
            NormalStrategy.GEOMETRIC,Channels.RG,
            pink
        )
            */

        /*
        await this.addGLTFModel(
            "models/gltf/wood_elephant/wood_elephant.gltf", 
            10.0, new Vector3(0.0,0.0,0.0), new Vector3(0.0,-1.0,-0.0), 
            NormalStrategy.INTERPOLATED,Channels.RG,
            pink
        )
            */
            

        /*
        await this.addGLTFModel(
            "models/gltf/teapot.gltf", 
            0.2, new Vector3(Math.PI/2.0,0.0,0.0), new Vector3(0.0,-1.0,0.0), 
            NormalStrategy.GEOMETRIC,Channels.RG,
            pink
        )
            */

        /*
        await this.addGLTFModel(
            "models/gltf/fox/Fox.gltf", 
            0.01, new Vector3(0.0,Math.PI/4.0,0.0), new Vector3(0.0,-1.0,0.0), 
            NormalStrategy.GEOMETRIC,Channels.RG,
        )
            */

        /*
        await this.addGLTFModel(
            "models/gltf/metallic_barrel_with_lod/scene.gltf", 
            1.0, new Vector3(-Math.PI/2.0,0.0,0.0), new Vector3(0.0,-1.0,0.0), 
            NormalStrategy.INTERPOLATED,Channels.RG,
            
        )
            */

        /*
        // Dragon 19k tris
        await this.addGLTFModel(
            "models/gltf/stanford_dragon_pbr/scene.gltf", 
            0.01, new Vector3(0.0,0.0,0.0), new Vector3(0.0,-1.0,0.0), 
            NormalStrategy.INTERPOLATED,Channels.RG,
            pink
        )
            */

        /*
        // Dragon 232k tris
        await this.addGLTFModel(
            "models/gltf/dragon/scene.gltf", 
            0.02, new Vector3(0.0,0.0,0.0), new Vector3(-0.5,-1.0,0.0), 
            NormalStrategy.INTERPOLATED,Channels.RG,
            pink
        )
            */


        // 356 tris
        await this.addGLTFModel(
            "models/gltf/stellated_regular_polyhedron/scene.gltf", 
            0.01, new Vector3(Math.PI/8.0,0.0,Math.PI/8.0), new Vector3(0.0,0.0,0.0), 
            NormalStrategy.INTERPOLATED,Channels.RG,
            pink
        )

        /*
        // 120 tris
        await this.addGLTFModel(
            "models/gltf/120-faced_rhombic_polyhedron/scene.gltf", 
            0.2, new Vector3(Math.PI/8.0,0.0,Math.PI/8.0), new Vector3(0.0,0.0,0.0), 
            NormalStrategy.INTERPOLATED,Channels.RG,
            pink
        )
            */

        
        /*
        // 48 tris
        await this.addGLTFModel(
            "models/gltf/cube-octahedron_compound_polyhedron/scene.gltf", 
            0.1, new Vector3(Math.PI/5.0,0.0,Math.PI/8.0), new Vector3(0.0,0.0,-0.25), 
            NormalStrategy.INTERPOLATED,Channels.RG,
            pink
        )
            */
            

        /*
        // 12 tris
        await this.addGLTFModel(
            "models/gltf/largest_8-vertex_polyhedron_solid/scene.gltf", 
            0.4, new Vector3(Math.PI/8.0,0.0,Math.PI/2.5), new Vector3(0.0,0.0,0.0), 
            NormalStrategy.INTERPOLATED,Channels.RG,
            pink
        )
            */

        /*
        // 8 tris
        await this.addGLTFModel(
            "models/gltf/octahedron/scene.gltf", 
            0.2, new Vector3(Math.PI/8.0,0.0,Math.PI/8.0), new Vector3(0.0,0.0,0.0), 
            NormalStrategy.INTERPOLATED,Channels.RG,
            pink
        )
            */

    }

    private async bruce(){
        this.camera = new Camera(new Vector3(0.0, 0.0, 2.0));

        const white = this.addMaterial(new Material({
            albedo: new Vector3(1.0,1.0,1.0)
        }));
        
        const white_light = this.addMaterial(new Material({
            albedo: new Vector3(1.0,1.0,1.0),
            emission: 5.0
        }));

        const dirty_glass_rm:LoadedTextureInfo = await this.tex_manager.addRoughMetal(
            "materials/gltf/earth8.png",Channels.RG);
        const dirty_glass = this.addMaterial(new Material({
            roughmetal_tex_info:dirty_glass_rm,
            roughness:0.0,
            reflectance: 0.5,
            trs_weight:1.0,
        })); 

        const stripes_albedo:LoadedTextureInfo = await this.tex_manager.addAlbedo(
            "materials/gltf/stripes.png");
        const stripes = this.addMaterial(new Material({
            albedo_tex_info:stripes_albedo,
        })); 

        const metal_albedo:LoadedTextureInfo = await this.tex_manager.addAlbedo(
            "materials/gltf/corrugated_iron_1k.gltf/textures/corrugated_iron_diff_1k.jpg");
        const metal_normal:LoadedTextureInfo = await this.tex_manager.addNormal(
            "materials/gltf/corrugated_iron_1k.gltf/textures/corrugated_iron_nor_gl_1k.jpg");
        const metal_rm:LoadedTextureInfo = await this.tex_manager.addRoughMetal(
            "materials/gltf/corrugated_iron_1k.gltf/textures/corrugated_iron_arm_1k.jpg");
        const metal = this.addMaterial(new Material({
            albedo_tex_info:metal_albedo,
            normal_tex_info:metal_normal, 
            roughmetal_tex_info:metal_rm,
            reflectance: 0.5,
        })); 

        

        const floor_height = -0.8;
        const floor: Quad = new Quad(
            new Vector3(-1.0, floor_height, -1.0),
            new Vector3(-1.0, floor_height, 1.0),
            new Vector3(1.0, floor_height, 1.0),
            new Vector3(1.0, floor_height, -1.0),
        );
        this.addQuad(floor, white);

        const back: Quad = new Quad(
            new Vector3(-1.0, -1.0, -0.9999),
            new Vector3(-1.0, 1.0, -1.0),
            new Vector3(1.0, 1.0, -1.0),
            new Vector3(1.0, -1.0, -0.9999),
        );
        //this.addQuad(back, metal);

        const backp:Plane = new Plane(
            new Vector3(0.0,0.001,1.0),
            2.0,
            0.4,new Vector2(0.46,0.0)
        )
        this.addPlane(backp, stripes)

        const ceiling_light_size = 0.5
        const ceiling_light: Quad = new Quad(
            new Vector3(-ceiling_light_size, 0.995, -ceiling_light_size),
            new Vector3(-ceiling_light_size, 0.995, ceiling_light_size),
            new Vector3(ceiling_light_size, 0.995, ceiling_light_size),
            new Vector3(ceiling_light_size, 0.995, -ceiling_light_size),
        );
        //this.addQuad(ceiling_light, white_light);

        const s_light: Sphere = new Sphere(
            new Vector3(0.0,1.75,0.0),
            0.7,
        );
        this.addSphere(s_light,white_light)

        const s3: Sphere = new Sphere(
            new Vector3(0.0, -0.05, 0.0),
            0.5,
            new Vector2(1.0,1.0),new Vector2(0.05,0.0),
            new Vector3(0.0,1.0,0.0), new Vector3(0.0,0.0,-1.0)
        );
        this.addSphere(s3, dirty_glass);

    }

    /*

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

    private async simpleMeshScene() {
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
            const simpleMesh = await MeshLoader.load("/models/obj/icosahedron/icosahedron.obj", "Icosahedron");
            simpleMesh.scale(new Vector3(4.0, 4.0, 4.0));
            this.addSimpleMesh(simpleMesh, yellow);
            console.log("Simple mesh loaded successfully");
        } catch (error) {
            console.warn("Could not load simple mesh:", error);
        }
    }

    private async bvhMeshScene() {
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
        // this.addPlane(p1, salmon);

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
            const bvhMesh = await ThreeJSOBJLoader.load("models/obj/skull-detailed/craneo.obj", 1.0, new Vector3(0.8, 0.2, 0.0), new Vector3(1.0, 1.0, 1.0), NormalStrategy.GEOMETRIC);
            // const bvhMesh = await ThreeJSOBJLoader.load("models/obj/skull-salazar/scene.obj");
            // const bvhMesh = await ThreeJSOBJLoader.load("models/obj/glowfish/Glowfish.obj", 0.085, new Vector3(0.0, 0.0, 0.0), new Vector3(2.0, 2.0, 2.0), NormalStrategy.GEOMETRIC);
            this.addEfficientMeshData(bvhMesh);
            console.log("BVH mesh loaded successfully");
        } catch (error) {
            console.warn("Could not load BVH mesh:", error);
        }
    }

    private async bhvGLTFScene() {

        const salmon = this.addMaterial(
            new Material(new Vector3(1.0, 0.5, 0.4),
                0,
                new Vector3(0),
                new Vector3(0),
                1.0
            ));

        const greenish = this.addMaterial(
            new Material(new Vector3(0.6, 0.99, 0.25),
                0,
                new Vector3(0),
                new Vector3(0),
                1.0
            ));

        const magenta = this.addMaterial(
            new Material(new Vector3(1.0, 0.0, 1.0),
                0,
                new Vector3(0),
                new Vector3(0),
                1.0
            ));

        const lemonchiffon = this.addMaterial(
            new Material(new Vector3(1.0, 0.99, 0.25),
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
        const p1: Plane = new Plane(
            new Vector3(0.0, 1.0, 0.0),
            3.0
        );
        this.addPlane(p1, salmon);

        try {
            // const bvhMesh = await GLTFLoader.load("models/gltf/dragon/scene.gltf", 0.012, new Vector3(0.0, 0.0, 0.0), new Vector3(0.0, 0.0, 0.0), NormalStrategy.GEOMETRIC);
            // NOTE, KEY: ~230K vertices, only used for material loading, USE ONLY WITH RENDER DISABLED (Stop)
            // const bvhMesh = await GLTFLoader.load("models/gltf/dragon_glass/scene.gltf", 0.012);
            const bvhMesh = await GLTFLoader.load("models/gltf/skull_salazar/scene.gltf", 0.2, new Vector3(0.1, 4.0, 0.7), new Vector3(0.8, 0.2, 0.4));
            this.addEfficientMeshData(bvhMesh);
            console.log("BVH mesh loaded successfully");
        } catch (error) {
            console.warn("Could not load BVH mesh:", error);
        }
    }
        */

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

    public addSimpleMesh(mesh: SimpleMesh, materialIndex: number) {
        this.simpleMeshVec.push({ mesh, materialIndex });
        mesh.getTriangles().forEach(tri => {
            this.addTriangle(tri, materialIndex);
        });
    }

    public async addEfficientMeshData(data: EfficientMeshData, rmChannel: Channels, materialOverride:number) {
        if(materialOverride < 0){
            // Add material offset
            const offset = this.materialVec.length;
            for (let i = 0; i < data.triangleMaterials.length; i++) {
                data.triangleMaterials[i] += offset 
            }

            // Add the materials
            for (let i = 0; i < data.materials.length; i++) {
                const albedoURL = data.materials[i].albedoMap;
                const normalURL = data.materials[i].normalMap;
                const rmURL = data.materials[i].rmMap;
                if(albedoURL !== undefined){
                    data.materials[i].material.albedo_tex_info = await this.tex_manager.addAlbedo(albedoURL);
                }
                if(normalURL !== undefined){
                    data.materials[i].material.normal_tex_info = await this.tex_manager.addNormal(normalURL);
                }
                if(rmURL !== undefined){
                    data.materials[i].material.roughmetal_tex_info = await this.tex_manager.addRoughMetal(rmURL,rmChannel);
                }
                const matIdx = this.addMaterial(data.materials[i].material); 
                console.log("Added mesh material to scene:",matIdx,data.materials[i].material)
            }
        }else{
            for (let i = 0; i < data.triangleMaterials.length; i++) {
                data.triangleMaterials[i] = materialOverride 
            }
        }
            
        this.meshDataVec.push(data);
    }

    public async addGLTFModel(
        url: string,
        scale: number = 1.0,
        rotation: Vector3 = new Vector3(0, 0, 0),
        translation: Vector3 = new Vector3(0, 0, 0),
        normalStrategy: NormalStrategy = NormalStrategy.INTERPOLATED,
        rmChannel: Channels = Channels.GB,
        materialOverride:number = -1
    ){
        try {
            const bvhMesh = await GLTFLoader.load(url,scale,rotation,translation,normalStrategy);
            await this.addEfficientMeshData(bvhMesh,rmChannel,materialOverride);
            console.log("BVH mesh loaded successfully");
        } catch (error) {
            console.warn("Could not load mesh:", error);
        }
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
        let start = 0;
        let normalOffset = 0;
        let bvhOffset = 0;

        // KEY, CRITICAL: must be an Int32Array, otherwise (Float32Array) it will store 0.0
        // for ints with value 0 and Float.MAX for ints with value > 0 
        const out: Int32Array = new Int32Array(this.meshDataVec.length * 8);

        let i = 0;
        for (const m of this.meshDataVec) {
            const count = m.positionIndices.length / 3;

            // TODO, implement actual materials system
            // NOTE, CRITICAL: we'll have to calculate the offsets for the materials of each mesh,
            // AND for the uv's as well
            // TODO, add uv offset as well
            let matIdx = Math.floor(Math.random() * this.materialVec.length); // this.materialVec.length - 1;
            matIdx = matIdx > 0 ? this.materialVec.length - 1 : 1;

            // Serialize 8 ints per mesh (std140 alignment for struct arrays)
            // MeshInfo: startTriangle, triangleCount, materialIndex, normalStrategy,
            //           normalOffset, bvhOffset, pad2, pad3
            out.set([start, count, matIdx, m.normalStrategy, normalOffset, bvhOffset, 0, 0], i);

            i += 8;

            // Update normalOffset: accumulate vertices from prior GEOMETRIC meshes
            // These are the "missing" normals that we need to subtract from indices
            if (m.normalStrategy === NormalStrategy.GEOMETRIC) {
                normalOffset += m.positions.length / 3;  // vertex count
            }

            // Update bvhOffset: accumulate nodes (8 floats per node)
            bvhOffset += m.bvhData.length / 8;

            // Update start: accumulate triangles
            start += count;
        }

        return new Float32Array(out.buffer);
    }

    /**
     * Returns concatenated mesh texture buffers for all meshes in the scene.
     */
    public async getMeshTextureBuffers() {
        let positionsList: Float32Array[] = [];
        let normalsList: Float32Array[] = [];
        let uvsList: Float32Array[] = [];
        let indexList: Uint32Array[] = [];
        let normalIndexList: Uint32Array[] = [];
        let uvIndexList: Uint32Array[] = [];
        let triMatList: Uint32Array[] = [];
        let bvhList: Float32Array[] = [];

        let positionsCount = 0;
        let trianglesCount = 0;
        let bvhNodeOffset = 0;

        for (const meshData of this.meshDataVec) {
            const s = meshData.serializeTextures();

            triMatList.push(s.triangleMaterials);

            positionsList.push(s.positionsRGB);
            if (s.normalsRGB.length > 0) {
                normalsList.push(s.normalsRGB);
            }
            uvsList.push(s.uvsRG);

            // Offset position indices by cumulative vertex count (positionsCount)
            // This ensures indices are global in the concatenated u_sharedVertexIndices_tex
            const offsetIndices = new Uint32Array(s.positionIndices.length);
            for (let i = 0; i < s.positionIndices.length; i++) {
                offsetIndices[i] = s.positionIndices[i] + positionsCount;
            }
            console.log(`Mesh indices offset by ${positionsCount}, first 9 indices:`, offsetIndices.slice(0, 9));
            indexList.push(offsetIndices);

            normalIndexList.push(s.normalIndices);
            uvIndexList.push(s.uvIndices);
            // Offset BVH indices
            // We do NOT offset indices here anymore, we do it in the shader (cleaner)
            // Just copy the data
            bvhList.push(s.bvh);
            console.log(`BVH for mesh (first 16 floats):`, s.bvh.slice(0, 16));
            bvhNodeOffset += s.bvh.length / 8;
            console.log("BVH node offset after increment: ", bvhNodeOffset);

            positionsCount += s.positionsRGB.length / 3;
            trianglesCount += s.positionIndices.length / 3;
        }

        let indexListConcat: Uint32Array = concatUint32Arrays(indexList);
        let matListConcat: Uint32Array = concatUint32Arrays(triMatList)
        let indicesAndMatList: Uint32Array = new Uint32Array(matListConcat.length*4);

        for (let i = 0; i < matListConcat.length; i++) {
            indicesAndMatList[i*4+0] = indexListConcat[i*3+0];
            indicesAndMatList[i*4+1] = indexListConcat[i*3+1];
            indicesAndMatList[i*4+2] = indexListConcat[i*3+2];
            indicesAndMatList[i*4+3] = matListConcat[i];
        }

        return {
            positions: concatFloat32Arrays(positionsList),
            normals: concatFloat32Arrays(normalsList),
            uvs: concatFloat32Arrays(uvsList),
            positionIndices: concatUint32Arrays(indexList),
            normalIndices: concatUint32Arrays(normalIndexList),
            uvIndices: concatUint32Arrays(uvIndexList),
            triangleMaterials: concatUint32Arrays(triMatList),
            bvh: concatFloat32Arrays(bvhList),
            indicesAndMatList:indicesAndMatList,
            positionsCount,
            trianglesCount
        };
    }

}

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

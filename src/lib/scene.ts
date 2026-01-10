import { vec2, Vector2, Vector3 } from "@math.gl/core";
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
    TRANSIENT = 'cornelltransient',
    SIMPLEMESH = 'simplem',
    BVHMESH = 'bvhmesh',
    GLTF_BVH = 'glbvh',
    BRUCE = 'bruce',
    FINAL = 'final',
    MODEL = 'modelViewer',
}

export enum SkyboxType {
    IMAGE = 0,
    BLACK = 1,
    DAY = 2,
}

export type initialParams = {
    canvas_width:number,
    canvas_height:number,
    ssp:number,
    meanBounces:number,
    frame_acummulation:boolean,
    fast_mode:boolean,
    range_thing: boolean,
    range_slider_ini: number,
    range_input: number,
    kernel_sigma_input:number,
    focal_distance:number,
    aperture_radius:number,
};

export class Scene {
    public camera: Camera = new Camera();
    public skybox: SkyboxType = SkyboxType.BLACK;
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
    public iniP:initialParams = {
        canvas_width:500,
        canvas_height:500,
        ssp:5,
        meanBounces:5,
        frame_acummulation:true,
        fast_mode:true,
        range_thing: false,
        range_slider_ini: 0.0,
        range_input: 0.1,
        kernel_sigma_input:0.0,
        focal_distance:1.0,
        aperture_radius:0.0,
    }

    constructor(type: SceneType = SceneType.FINAL) {
        this.sceneType = type;
        this.setupVariables();
    }

    public setupVariables(){
        if (this.sceneType === SceneType.FINAL) {
            this.iniP.canvas_width = 1280;
            this.iniP.canvas_height = 720;
            this.iniP.ssp = 1;
            this.iniP.meanBounces = 7;
            this.iniP.range_input = 0.35;
            this.iniP.range_slider_ini = 4.9;
            this.iniP.kernel_sigma_input = 0.06;
        }else if(this.sceneType === SceneType.CORNEL){
            this.iniP.ssp = 20;
            this.iniP.meanBounces = 3;
            this.iniP.canvas_width = 720;
            this.iniP.canvas_height = 720;
            this.iniP.fast_mode = false;
        }else if(this.sceneType === SceneType.BRUCE){
            this.iniP.ssp = 150;
            this.iniP.meanBounces = 10;
        }else if(this.sceneType === SceneType.TRANSIENT){
            this.iniP.ssp = 100;
            this.iniP.meanBounces = 3;
            this.iniP.range_slider_ini = 16;
            this.iniP.range_input = 0.3;
            this.iniP.kernel_sigma_input = 0.09;
        }else if(this.sceneType === SceneType.TESTPLANE){
            this.iniP.aperture_radius = 0.15;
            this.iniP.focal_distance = 10.0;
        }
    }

    public async setupScene() {
        if (this.sceneType === SceneType.TESTPLANE) {
            await this.testplane();
        }else if(this.sceneType === SceneType.PALETTE) {
            await this.palette();
        }else if (this.sceneType === SceneType.CORNEL) {
            await this.cornell();
        }else if (this.sceneType === SceneType.BRUCE) {
            await this.bruce();
        }else if (this.sceneType === SceneType.TRANSIENT) {
            await this.transient();
        }else if (this.sceneType === SceneType.FINAL) {
            await this.final();
        }else if (this.sceneType === SceneType.MODEL) {
            await this.modelViewer();
        }
    }

    

    private async testplane() {
        this.camera = new Camera(new Vector3(0.0, 0.0, 10.0));
        this.skybox = SkyboxType.IMAGE;
        
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


        /* const brick_albedo:LoadedTextureInfo = await this.tex_manager.addAlbedo(
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
        }));    */
        
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

        /* const metal_albedo:LoadedTextureInfo = await this.tex_manager.addAlbedo(
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
        }));  */

        /* const metal2_albedo:LoadedTextureInfo = await this.tex_manager.addAlbedo(
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
        }));  */

        /* const cloth_albedo:LoadedTextureInfo = await this.tex_manager.addAlbedo(
            "materials/gltf/curly_teddy_checkered_2k.gltf/textures/curly_teddy_checkered_diff_2k.jpg");
        const cloth_normal:LoadedTextureInfo = await this.tex_manager.addNormal(
            "materials/gltf/curly_teddy_checkered_2k.gltf/textures/curly_teddy_checkered_nor_gl_2k.jpg");
        const cloth_rm:LoadedTextureInfo = await this.tex_manager.addRoughMetal(
            "materials/gltf/curly_teddy_checkered_2k.gltf/textures/curly_teddy_checkered_arm_2k.jpg");
        const cloth = this.addMaterial(new Material({
            albedo_tex_info:cloth_albedo,
            normal_tex_info:cloth_normal, 
            roughmetal_tex_info:cloth_rm,
            reflectance: 0.5,
        })); 
            */
        /* const dirty_glass_rm:LoadedTextureInfo = await this.tex_manager.addRoughMetal(
            "materials/gltf/earth.jpg",Channels.RG);
        const dirty_glass = this.addMaterial(new Material({
            roughmetal_tex_info:dirty_glass_rm,
            roughness:0.0,
            reflectance: 0.5,
            trs_weight:1.0,
        }));  */

        /* const earth_mirror_rm:LoadedTextureInfo = await this.tex_manager.addRoughMetal(
            "materials/gltf/earth3.jpg",Channels.RG);
        const earth_mirror = this.addMaterial(new Material({
            roughmetal_tex_info:earth_mirror_rm,
            reflectance: 0.5,
        }));  */

        const mirror = this.addMaterial(new Material({
            roughness: 0.0,
            metalness: 1.0,
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
            new Vector3(3.0, 1.0, -6.0),
            2.0);
        this.addSphere(s3, wood2);

        const s4 = new Sphere(
            new Vector3(-3.0, 1.0, -6.0),
            2.0);
        this.addSphere(s4, mirror);

        const s5 = new Sphere(
            new Vector3(0.0, 15.0, 0.0),
            8.0);
        //this.addSphere(s5, white_light);

        const s6 = new Sphere(
            new Vector3(-4.0, 1.0, -3.0),
            0.2);
        //this.addSphere(s6, white_light);

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
            100.0
        );
        this.addPointLight(l1);

        const l2: PointLight = new PointLight(
            new Vector3(0, 8.0, -11.5),
            new Vector3(1.0, 1.0, 1.0),
            100.0
        );
        //this.addPointLight(l2);

        
        
        // Wood elephant
        await this.addGLTFModel(
            "models/gltf/wood_elephant/wood_elephant.gltf", 
            20.0, new Vector3(0.0,0.0,0.0), new Vector3(0.0,-1.0,-1.0), 
            NormalStrategy.INTERPOLATED,Channels.RG,
        )            
           
        
        /*
        // Stone kitty ^.^
        await this.addGLTFModel(
            "models/gltf/concrete_kitty/scene.gltf", 
            7.0, new Vector3(0.0,0.0,0.0), new Vector3(0.0,-1.0,0.0), 
            NormalStrategy.INTERPOLATED,Channels.GB
        )
            */
            

        /*
        // Dragon 5k tris
        await this.addGLTFModel(
            "models/gltf/stenford_dragon_low/stenford_dragon_low.gltf", 
            0.006, new Vector3(Math.PI/2.0,Math.PI,-Math.PI/2.0), new Vector3(0.0,-0.45,0.0), 
            NormalStrategy.INTERPOLATED,Channels.RG,
            plastic
        )
            */

        /*
        // Dragon 19k tris
        await this.addGLTFModel(
            "models/gltf/stanford_dragon_pbr/scene.gltf", 
            0.0135, new Vector3(0.0,0.0,0.0), new Vector3(0.0,-1.0,0.0), 
            NormalStrategy.INTERPOLATED,Channels.RG,
            plastic
        )
        */
            

        /*
        // Dragon 232k tris
        await this.addGLTFModel(
            "models/gltf/dragon/scene.gltf", 
            0.03, new Vector3(0.0,0.0,0.0), new Vector3(-0.7,-1.0,0.0), 
            NormalStrategy.INTERPOLATED,Channels.RG,
            plastic
        )
            */
           

        /*
        // Chair
        await this.addGLTFModel(
            "models/gltf/mid_century_lounge_chair_2k/mid_century_lounge_chair_2k.gltf", 
            3.0, new Vector3(0.0,0.0,0.0), new Vector3(0.0,-1.0,-2.0), 
            NormalStrategy.INTERPOLATED,Channels.GB,
            
        )
            */
            
        /*
        // TV
        await this.addGLTFModel(
            "models/gltf/Television_01_2k/Television_01_2k.gltf", 
            3.0, new Vector3(0.0,0.0,0.0), new Vector3(0.0,-1.0,0.0), 
            NormalStrategy.INTERPOLATED,Channels.GB,
            
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
        this.skybox = SkyboxType.BLACK;

        const red = this.addMaterial(new Material({
            albedo: new Vector3(1.0,0.0,0.0)
        }));

        const green = this.addMaterial(new Material({
            albedo: new Vector3(0.0,1.0,0.0)
        }));

        const purple = this.addMaterial(new Material({
            albedo: new Vector3(0.5, 0.9, 0.9),
            roughness: 0.3
        }));

        const mirror = this.addMaterial(new Material({
            roughness: 0.0,
            metalness: 1.0
        }));

        const pink = this.addMaterial(new Material({
            albedo: new Vector3(0.8, 0.6, 0.9),
        }));

        const white = this.addMaterial(new Material({
            albedo: new Vector3(1.0,1.0,1.0)
        }));
        
        const white_light = this.addMaterial(new Material({
            albedo: new Vector3(1.0,1.0,1.0),
            emission: 1.0
        }));

        const glass = this.addMaterial(new Material({
            roughness:0.0,
            metalness:0.0,
            ior:1.52,
            trs_weight:1.0,
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
        this.addQuad(ceiling, white_light);

        const ceiling_light_size = 0.5
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
        this.addSphere(s1, purple);

        const s2: Sphere = new Sphere(
            new Vector3(-0.5, -0.7, 0.25),
            0.3);
        this.addSphere(s2, glass);


        

        const l1: PointLight = new PointLight(
            new Vector3(0, 0.95, 0.0),
            new Vector3(1.0, 1.0, 1.0),
            1.0
        );
        //this.addPointLight(l1);

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


        /*
        // 356 tris
        await this.addGLTFModel(
            "models/gltf/stellated_regular_polyhedron/scene.gltf", 
            0.01, new Vector3(Math.PI/8.0,0.0,Math.PI/8.0), new Vector3(0.0,0.0,0.0), 
            NormalStrategy.INTERPOLATED,Channels.RG,
            pink
        )
            */

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

        /* const metal_albedo:LoadedTextureInfo = await this.tex_manager.addAlbedo(
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
        }));  */

        

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

    private async transient(){
        this.camera = new Camera(new Vector3(0.0, 15.0, 0.0));

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
        }));

        const white = this.addMaterial(new Material({
            albedo: new Vector3(1.0,1.0,1.0)
        }));

        const glass = this.addMaterial(new Material({
            roughness:0.0,
            trs_weight:1.0,
            ior:2.0
        }));
        
        const white_light = this.addMaterial(new Material({
            albedo: new Vector3(1.0,1.0,1.0),
            emission: 4.0
        }));

        const s1:Sphere = new Sphere(
            new Vector3(3.0,0.0,-2.0),
            1.0
        )
        this.addSphere(s1,red);

        const s2:Sphere = new Sphere(
            new Vector3(3.0,0.0,2.0),
            1.0
        )
        this.addSphere(s2,red);

        const sl:Sphere = new Sphere(
            new Vector3(-3.0,1.0,0.0),
            2.0
        )
        this.addSphere(sl,white_light);

        const l1 = new PointLight(
            new Vector3(-3.0,1.0,0.0),
            new Vector3(1.0,1.0,1.0),
            10.0
        )
        //this.addPointLight(l1);

        const a = 3.0, b = 3.0, c =0.5;
        const q1:Quad = new Quad(
            new Vector3(0.0,-1.0,0.0),
            new Vector3(0.0,-1.0,a),
            new Vector3(0.0,b-1,a),
            new Vector3(0.0,b-1,0.0),
        )
        this.addQuad(q1,glass)

        const q2:Quad = new Quad(
            new Vector3(c,-1.0,0.0),
            new Vector3(c,b-1,0.0),
            new Vector3(c,b-1,a),
            new Vector3(c,-1.0,a),
        )
        this.addQuad(q2,glass)

        

        const p1: Plane = new Plane(
            new Vector3(0.0, 1.0, 0.0),
            1.0
        );
        this.addPlane(p1, white);

    }

    private async final(){
        const ini_zoom = 4.0;
        this.camera = new Camera(new Vector3(0.5, 0.1, -1.0).multiplyByScalar(ini_zoom));
        this.skybox = SkyboxType.BLACK;

        
        const debug_purple = this.addMaterial(new Material({
            albedo: new Vector3(1, 0.058, 0.933),
            roughness: 0.8,
        }));

        const white_matte = this.addMaterial(new Material({
            roughness: 0.8,
        }));

        const white_transparent = this.addMaterial(new Material({
            roughness: 0.0,
            ior:1.001,
            trs_weight:1.0
        }));

        const plastic = this.addMaterial(new Material({
            albedo: new Vector3(0.3,0.5,0.3),
            roughness: 0.3,
        }));

        const white_light = this.addMaterial(new Material({
            albedo: new Vector3(1.0,1.0,1.0),
            emission: 10.0
        }));


        /* const brick_albedo:LoadedTextureInfo = await this.tex_manager.addAlbedo(
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
        })); */   

        /* const brick2_albedo:LoadedTextureInfo = await this.tex_manager.addAlbedo(
            "materials/gltf/brushed_concrete_2k.gltf/textures/brushed_concrete_diff_2k.jpg");
        const brick2_normal:LoadedTextureInfo = await this.tex_manager.addNormal(
            "materials/gltf/brushed_concrete_2k.gltf/textures/brushed_concrete_nor_gl_2k.jpg");
        const brick2_rm:LoadedTextureInfo = await this.tex_manager.addRoughMetal(
            "materials/gltf/brushed_concrete_2k.gltf/textures/brushed_concrete_rough_2k.jpg",
            Channels.RG);
        const brick2 = this.addMaterial(new Material({
            albedo_tex_info:brick2_albedo,
            normal_tex_info:brick2_normal, 
            roughmetal_tex_info:brick2_rm,
            reflectance: 0.5
        }));   */ 

        /* const concrete_albedo:LoadedTextureInfo = await this.tex_manager.addAlbedo(
            "materials/gltf/concrete_layers_1k.gltf/textures/concrete_layers_diff_1k.jpg");
        const concrete_normal:LoadedTextureInfo = await this.tex_manager.addNormal(
            "materials/gltf/concrete_layers_1k.gltf/textures/concrete_layers_nor_gl_1k.jpg");
        const concrete_rm:LoadedTextureInfo = await this.tex_manager.addRoughMetal(
            "materials/gltf/concrete_layers_1k.gltf/textures/concrete_layers_arm_1k.jpg");
        const concrete = this.addMaterial(new Material({
            albedo_tex_info:concrete_albedo,
            normal_tex_info:concrete_normal, 
            roughmetal_tex_info:concrete_rm,
            reflectance: 0.5
        }));   */
        
        /* const wood_albedo:LoadedTextureInfo = await this.tex_manager.addAlbedo(
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
        }));  */
        
        /* const wood2_albedo:LoadedTextureInfo = await this.tex_manager.addAlbedo(
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
        }));  */
         
        const wood3_albedo:LoadedTextureInfo = await this.tex_manager.addAlbedo(
            "materials/gltf/black_painted_planks_1k.gltf/textures/black_painted_planks_diff_1k.jpg");
        const wood3_normal:LoadedTextureInfo = await this.tex_manager.addNormal(
            "materials/gltf/black_painted_planks_1k.gltf/textures/black_painted_planks_nor_gl_1k.jpg");
        const wood3_rm:LoadedTextureInfo = await this.tex_manager.addRoughMetal(
            "materials/gltf/black_painted_planks_1k.gltf/textures/black_painted_planks_arm_1k.jpg");
        const wood3 = this.addMaterial(new Material({
            albedo_tex_info:wood3_albedo,
            normal_tex_info:wood3_normal,
            roughmetal_tex_info:wood3_rm,
        })); 

        /* const metal_albedo:LoadedTextureInfo = await this.tex_manager.addAlbedo(
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
        }));  */

        /* const metal2_albedo:LoadedTextureInfo = await this.tex_manager.addAlbedo(
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
        }));  */


        /* const dirty_glass_rm:LoadedTextureInfo = await this.tex_manager.addRoughMetal(
            "materials/gltf/earth8.png",Channels.RG);
        const dirty_glass = this.addMaterial(new Material({
            roughmetal_tex_info:dirty_glass_rm,
            roughness:0.0,
            reflectance: 0.5,
            trs_weight:1.0,
        }));  */

        const mirror = this.addMaterial(new Material({
            roughness: 0.0,
            metalness: 1.0,
        }));

        const c_x = 4.0, c_y = 3.0, c_z = 4.0;
        const floor: Quad = new Quad(
            new Vector3(-c_x, -c_y, -c_z),
            new Vector3(-c_x, -c_y, c_z),
            new Vector3(c_x, -c_y, c_z),
            new Vector3(c_x, -c_y, -c_z),
        );
        //this.addQuad(floor, wood);

        const back: Quad = new Quad(
            new Vector3(-c_x, -c_y, -c_z+0.00001),
            new Vector3(-c_x, c_y, -c_z),
            new Vector3(c_x, c_y, -c_z),
            new Vector3(c_x, -c_y, -c_z+0.0001),
        );
        //this.addQuad(back, concrete);

        const ceiling: Quad = new Quad(
            new Vector3(-c_x, c_y, -c_z),
            new Vector3(-c_x, c_y, c_z),
            new Vector3(c_x, c_y, c_z),
            new Vector3(c_x, c_y, -c_z),
        );
        //this.addQuad(ceiling, concrete);

        const right: Quad = new Quad(
            new Vector3(-c_x, -c_y, c_z),
            new Vector3(-c_x, c_y, c_z),
            new Vector3(-c_x, c_y, -c_z),
            new Vector3(-c_x, -c_y, -c_z),
        );
        //this.addQuad(right, concrete);

        const left: Quad = new Quad(
            new Vector3(c_x, -c_y, c_z),
            new Vector3(c_x, c_y, c_z),
            new Vector3(c_x, c_y, -c_z),
            new Vector3(c_x, -c_y, -c_z),
        );
        //this.addQuad(left, concrete);

        /* const s1: Sphere = new Sphere(
            new Vector3(0.0,-c_y+3.18,1.46),
            0.1,
            new Vector2(1.0,1.0),new Vector2(0.05,0.0),
            new Vector3(0.0,1.0,0.0), new Vector3(0.0,0.0,-1.0)
        );
        this.addSphere(s1, dirty_glass); */

        const p_floor: Plane = new Plane(
            new Vector3(0.0, 1.0, 0.0),
            c_y,
            0.2
        );
        this.addPlane(p_floor, wood3);

        const p_back: Plane = new Plane(
            new Vector3(0.0, 0.0, 1.0),
            c_z,
            0.2
        );
        //this.addPlane(p_back, concrete);

        const p_right: Plane = new Plane(
            new Vector3(1.0, 0.0, 0.0),
            c_x,
            0.1
        );
        //this.addPlane(p_right, metal2);

        const window_x_off = 0.0;
        const l1: PointLight = new PointLight(
            new Vector3(window_x_off, 5.0, 0.0),
            new Vector3(1.0, 1.0, 1.0),
            100.0
        );
        this.addPointLight(l1);

        // 5500K 0.972, 1, 0.717
        // 5100K 1, 0.972, 0.654
        // 4700K 1, 0.917, 0.564
        // 4300K 1, 0.854, 0.478
        // 3900K 1, 0.713, 0.305
        // 2700K 1, 0.545, 0.152
        // 1900K 1, 0.349, 0.043
        // 1500K 1, 0.239, 0.043
        const l_warm: PointLight = new PointLight(
            new Vector3(-1.1,-c_y+3.5,1.5),
            new Vector3(1, 0.713, 0.305),
            50.0
        );
        this.addPointLight(l_warm);

        const stest: Sphere = new Sphere(
            new Vector3(0.0, 5.0, -7.5),
            0.1
        );
        //this.addSphere(stest,white_light)

        const w1x = 0.05, w1z = -6.0
        const qw1:Quad = new Quad(
            new Vector3(-w1x+window_x_off, 0.0-c_y, w1z),
            new Vector3(-w1x+window_x_off, 20.0-c_y, w1z),
            new Vector3(w1x+window_x_off, 20.0-c_y, w1z),
            new Vector3(w1x+window_x_off, 0.0-c_y, w1z),
        )
        //this.addQuad(qw1,white_transparent)

        const w2y = 0.05, w2z = -6.0, w2yoff = 3.0
        const qw2:Quad = new Quad(
            new Vector3(-20.0, w2yoff-w2y-c_y, w2z),
            new Vector3(-20.0, w2yoff+w2y-c_y, w2z),
            new Vector3(20.0, w2yoff+w2y-c_y, w2z),
            new Vector3(20.0, w2yoff-w2y-c_y, w2z),
        )
        //this.addQuad(qw2,white_transparent)

        /* const qmz = 2.8;
        const qm:Quad = new Quad(
            new Vector3(-2.0, 3.0-c_y, qmz),
            new Vector3(-2.0, 7.0-c_y, qmz),
            new Vector3(2.0, 7.0-c_y, qmz),
            new Vector3(2.0, 3.0-c_y, qmz),
        )
        this.addQuad(qm,mirror) */

        // Chair brown
        await this.addGLTFModel(
            "models/gltf/mid_century_lounge_chair_2k/mid_century_lounge_chair_2k.gltf", 
            3.0, new Vector3(0.0,2.0,0.0), new Vector3(-2.0,-c_y,-1.0), 
            NormalStrategy.INTERPOLATED,Channels.GB,
            
        )
            
        /*
        // Chair black
        await this.addGLTFModel(
            "models/gltf/modern_arm_chair/modern_arm_chair_01_2k.gltf", 
            3.0, new Vector3(0.0,0.0,0.0), new Vector3(0.0,-c_y+0.1,-2.0), 
            NormalStrategy.INTERPOLATED,Channels.GB,
            
        )
            */

        /*
        // Coffe table
        await this.addGLTFModel(
            "models/gltf/coffee_table_round/coffee_table_round_01_2k.gltf", 
            3.0, new Vector3(0.0,0.0,0.0), new Vector3(0.0,-c_y+0.1,2.0), 
            NormalStrategy.INTERPOLATED,Channels.GB,
            
        )
            */
        
        const tv_albedo:LoadedTextureInfo = await this.tex_manager.addAlbedo(
            "models/gltf/Television_01_2k/textures/Television_01_diff_2k.jpg");
        const tv_normal:LoadedTextureInfo = await this.tex_manager.addNormal(
            "models/gltf/Television_01_2k/textures/Television_01_nor_gl_2k.jpg");
        const tv_rm:LoadedTextureInfo = await this.tex_manager.addRoughMetal(
            "models/gltf/Television_01_2k/textures/Television_01_arm_2k.jpg", Channels.GB);
        const tv_emission:LoadedTextureInfo = await this.tex_manager.addEmission(
            "models/gltf/Television_01_2k/textures/Television_01_emissive_2k.jpg");
        const tv = this.addMaterial(new Material({
            albedo_tex_info:tv_albedo,
            normal_tex_info:tv_normal, 
            roughmetal_tex_info:tv_rm,
            emission_tex_info:tv_emission,
            emission: 1.0
        }));
        // TV VTech
        await this.addGLTFModel(
            "models/gltf/Television_01_2k/Television_01_2k.gltf", 
            2.12, new Vector3(0.0,Math.PI+0.0,0.0), new Vector3(0.0,-c_y+2.45,2.3), 
            NormalStrategy.INTERPOLATED,Channels.GB,
            tv
        )

        // TV Bottom
        /* await this.addGLTFModel(
            "models/gltf/vintage_tv/scene.gltf", 
            1.0, new Vector3(0.0,-Math.PI-0.15,0.0), new Vector3(-1.0,-c_y+3.5,2.1), 
            NormalStrategy.INTERPOLATED,Channels.GB,
            
        ) */

        // TV Simple
        /* await this.addGLTFModel(
            "models/gltf/simple_tv/scene.gltf", 
            1.0, new Vector3(0.0,Math.PI,0.1), new Vector3(0.0,-c_y+4.8,2.1), 
            NormalStrategy.INTERPOLATED,Channels.GB,
            
        ) */
            

        // MultiDesk
        /* await this.addGLTFModel(
            "models/gltf/desk_wooden_office_-_18mb/scene.gltf", 
            0.03, new Vector3(0.0,-0.02,0.0), new Vector3(0.0,-c_y+1.3,2.0), 
            NormalStrategy.INTERPOLATED,Channels.GB,
            
        ) */

        // Coffe cart
        /* await this.addGLTFModel(
            "models/gltf/CoffeeCart/CoffeeCart_01_2k.gltf", 
            2.0, new Vector3(0.0,Math.PI-0.4,0.0), new Vector3(0.0,-c_y,2.0), 
            NormalStrategy.INTERPOLATED,Channels.GB,
            
        ) */

        // Desk gov
        await this.addGLTFModel(
            "models/gltf/bureau_desk/scene.gltf", 
            0.035, new Vector3(0.0,Math.PI,0.0), new Vector3(0.0,-c_y,2.0), 
            NormalStrategy.INTERPOLATED,Channels.GB,
            
        )

        // Scifi lamp
        await this.addGLTFModel(
            "models/gltf/simple_retro_desk_lamp/scene.gltf", 
            0.15, new Vector3(-Math.PI/2.0,0.0,0.3), new Vector3(-1.5,-c_y+2.45,1.6), 
            NormalStrategy.INTERPOLATED,Channels.GB,
            
        )

        // Scifi desk
        /* await this.addGLTFModel(
            "models/gltf/retro_sci-fi_computer_desk/scene.gltf", 
            0.045, new Vector3(-Math.PI/2.0,0,Math.PI), new Vector3(0,-c_y+0.0,0.7), 
            NormalStrategy.INTERPOLATED,Channels.GB,
            
        )  */
       
        // Dragon 19k tris
        const dragon_normal:LoadedTextureInfo = await this.tex_manager.addNormal(
            "models/gltf/stanford_dragon_pbr/textures/DefaultMaterial_normal.png");
        const dragon = this.addMaterial(new Material({
            normal_tex_info:dragon_normal, 
            albedo: new Vector3(0.9,1.0,0.9),
            subsurface_color: new Vector3(0.7,1.0,0.7),
            roughness:0.15,
            metalness:0.0,
            ior: 1.52,
            trs_weight: 1.0
        }));
        await this.addGLTFModel(
            "models/gltf/stanford_dragon_pbr/scene.gltf", 
            0.005, new Vector3(0.0,Math.PI,0.0), new Vector3(-0.15,-c_y+2.65,1.65), 
            NormalStrategy.INTERPOLATED,Channels.GB,
            dragon
        )

        // Book1
        /* const book1_albedo:LoadedTextureInfo = await this.tex_manager.addAlbedo(
            "models/gltf/book/textures/Standardmaterial_baseColor.jpeg");
        const book1_normal:LoadedTextureInfo = await this.tex_manager.addNormal(
            "models/gltf/book/textures/Standardmaterial_normal.jpeg");
        const book1 = this.addMaterial(new Material({
            albedo_tex_info: book1_albedo,
            normal_tex_info: book1_normal, 
            roughness:0.8,
            metalness:0.0,
        }));
        await this.addGLTFModel(
            "models/gltf/book/scene.gltf", 
            0.26, new Vector3(-Math.PI/2.0,0.0,Math.PI/2.0-0.25), new Vector3(-0.15,-c_y+2.45,1.55), 
            NormalStrategy.INTERPOLATED,
            book1
        ) */

        // Book2
        /* await this.addGLTFModel(
            "models/gltf/book_-_encyclopedia/scene.gltf", 
            0.65, new Vector3(0.0,Math.PI/2.0-0.1,0.0), new Vector3(-0.15,-c_y+2.55,1.5), 
            NormalStrategy.INTERPOLATED
        ) */

        // Book3
        /* await this.addGLTFModel(
            "models/gltf/old_book/scene.gltf", 
            0.035, new Vector3(-Math.PI/2.0,0.0,Math.PI/2.0+0.25), new Vector3(-0.13,-c_y+2.57,1.6), 
            NormalStrategy.INTERPOLATED
        ) */

        // Book$
        await this.addGLTFModel(
            "models/gltf/leather_book/scene.gltf", 
            0.2, new Vector3(-Math.PI/2.0,0.0,Math.PI/2.0+0.25), new Vector3(-0.13,-c_y+2.57,1.6), 
            NormalStrategy.INTERPOLATED
        )

        // Venus
        /* await this.addGLTFModel(
            "models/gltf/venus_statue/scene.gltf", 
            0.07, new Vector3(0.0,Math.PI,0.0), new Vector3(1.35,-c_y+2.85,1.6), 
            NormalStrategy.INTERPOLATED
        ) */

        // Table mirror
        /* await this.addGLTFModel(
            "models/gltf/table_mirror/scene.gltf", 
            0.008, new Vector3(0.0,-Math.PI/2.0-0.5,Math.PI/2.0), new Vector3(1.0,-c_y+2.45,2.0), 
            NormalStrategy.INTERPOLATED
        ) */

        // Skull
        /* const skull_albedo:LoadedTextureInfo = await this.tex_manager.addAlbedo(
            "models/gltf/skull_salazar/textures/Rosa_material_baseColor.jpeg");
        const skull_normal:LoadedTextureInfo = await this.tex_manager.addNormal(
            "models/gltf/skull_salazar/textures/Rosa_material_normal.png");
        const skull_rm:LoadedTextureInfo = await this.tex_manager.addRoughMetal(
            "models/gltf/skull_salazar/textures/Rosa_material_metallicRoughness.png", Channels.RG);
        const skull = this.addMaterial(new Material({ 
            albedo_tex_info:skull_albedo,
            normal_tex_info:skull_normal, 
            roughmetal_tex_info:skull_rm,
        })); */
        await this.addGLTFModel(
            "models/gltf/skull_salazar/scene.gltf", 
            0.4, new Vector3(0.0,Math.PI/2.0+0.4,0.0), new Vector3(-1.0,-c_y+4.15,2.6), 
            NormalStrategy.INTERPOLATED, Channels.GB,
            
        )

        // Mirror ball
        const ball_albedo:LoadedTextureInfo = await this.tex_manager.addAlbedo(
            "models/gltf/sphere-mirror-4k-materialtest/textures/sanjiaodisikeqiu_t_baseColor.png");
        const ball_rm:LoadedTextureInfo = await this.tex_manager.addRoughMetal(
            "models/gltf/sphere-mirror-4k-materialtest/textures/sanjiaodisikeqiu_t_metallicRoughness.png", Channels.GB);
        const ball = this.addMaterial(new Material({
            albedo_tex_info:ball_albedo,
            roughmetal_tex_info:ball_rm,
        }));
        await this.addGLTFModel(
            "models/gltf/sphere-mirror-4k-materialtest/scene.gltf", 
            0.3, new Vector3(0.0,Math.PI+0.2,0.0), new Vector3(1.2,-c_y+4.15,2.5), 
            NormalStrategy.INTERPOLATED, Channels.GB,
            ball
        )

        // Book open
        /* await this.addGLTFModel(
            "models/gltf/book_open/scene.gltf", 
            0.02, new Vector3(-Math.PI/2.0,0.0,Math.PI/2.0), new Vector3(1.3,-c_y+2.45,1.6), 
            NormalStrategy.INTERPOLATED
        ) */

        // Monitor
        await this.addGLTFModel(
            "models/gltf/monitor_iii_mod/Sketchfab_Scene.gltf", 
            0.075, new Vector3(-Math.PI/2.0,0.0,-Math.PI/2.0-0.8), new Vector3(1.5,-c_y+2.45,1.8), 
            NormalStrategy.INTERPOLATED
        )
            
    }

    private async modelViewer(){
        this.camera = new Camera(new Vector3(0.0,0.0,1.0));
        this.skybox = SkyboxType.DAY;
        
        await this.addGLTFModel(
            "models/gltf/stargazing_through_the_attic_window/scene.gltf", 
            1.0, new Vector3(0.0,0.0,0.0), new Vector3(0.0,0.0,0.0), 
            NormalStrategy.INTERPOLATED
        )
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
                const emissionURL = data.materials[i].emissionMap;
                if(albedoURL !== undefined){
                    data.materials[i].material.albedo_tex_info = await this.tex_manager.addAlbedo(albedoURL);
                }
                if(normalURL !== undefined){
                    data.materials[i].material.normal_tex_info = await this.tex_manager.addNormal(normalURL);
                }
                if(rmURL !== undefined){
                    data.materials[i].material.roughmetal_tex_info = await this.tex_manager.addRoughMetal(rmURL,rmChannel);
                }
                if(emissionURL !== undefined){
                    data.materials[i].material.emission_tex_info = await this.tex_manager.addEmission(emissionURL);
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

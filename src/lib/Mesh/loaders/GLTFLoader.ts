import * as THREE from 'three';
import { GLTFLoader as THREEGLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Material, type Params } from '../../Primitives/Material';
import { Vector3 } from 'math.gl';
import { ThreeJSMeshLoader } from './ThreeJSMeshLoader';
import type { ExtractedMaterial, EfficientMeshData } from './ThreeJSMeshLoader';
import { DEFAULT_COLOR, DEFAULT_EMISSION, DEFAULT_IOR, DEFAULT_SPECULAR, DEFAULT_SUBSURFACE_COLOR, NormalStrategy } from './constants';

/**
 * Loader for GLTF/GLB files using THREE.js GLTFLoader.
 * Extends ThreeJSMeshLoader to handle GLTF-specific loading logic.
 */
export class GLTFLoader extends ThreeJSMeshLoader {
    /**
     * Load a GLTF or GLB file.
     * 
     * @param url - Path to the .gltf or .glb file
     * @returns Processed mesh data ready for the shader (not serialized yet)
     */
    static async load(
        url: string,
        scale: number = 1.0,
        rotation: Vector3 = new Vector3(0, 0, 0),
        translation: Vector3 = new Vector3(0, 0, 0),
        normalStrategy: NormalStrategy = NormalStrategy.INTERPOLATED
    ): Promise<EfficientMeshData> {
        // Base path of the model
        const basePath:string = this.getBasePath(url);

        // Load GLTF file
        const gltfLoader = new THREEGLTFLoader();
        const gltf = await gltfLoader.loadAsync(url);
        const json = gltf.parser.json;

        gltf.scene.traverse((obj: any) => {
            const mat = obj.material;
            if (!mat) return;

            const maps = [
                mat.map,
                mat.normalMap,
                mat.roughnessMap,
                mat.metalnessMap
            ];

            for (const tex of maps) {
                if (!tex) continue;

                const assoc = gltf.parser.associations.get(tex);
                if (!assoc || assoc.textures === undefined) continue;

                const textureDef = json.textures[assoc.textures];
                const imageDef = json.images[textureDef.source];

                if (imageDef?.uri) {
                    tex.userData.url = imageDef.uri;
                }
            }
        });

        
        console.debug("GLTF file loaded:", url);
        console.debug("GLTF contents:", gltf);

        // Extract materials from GLTF scene
        const materials: ExtractedMaterial[] = [];
        const materialNameToIndex = new Map<string, number>();

        // Traverse the scene to find all unique materials
        const materialsFound = new Set<THREE.Material>();
        gltf.scene.traverse((child: any) => {
            if (child instanceof THREE.Mesh) {
                if (Array.isArray(child.material)) {
                    // No need for MTL parsing here, the materials are already embedded in the gltf file
                    child.material.forEach(mat => materialsFound.add(mat));
                    // console.log("Found material array:", child.material);
                } else if (child.material) {
                    materialsFound.add(child.material);
                }
            }
        });

        console.debug("Found gltf materials:", Array.from(materialsFound));

        // Convert THREE.Material to ExtractedMaterial
        for (const mat of Array.from(materialsFound)) {
            const idx = materials.length;
            // Add Map entry for material name to index
            materialNameToIndex.set(mat.name || `material_${idx}`, idx);

            let mat_params: Params = {};
            let albedoMap: string | undefined = undefined;
            let normalMap: string | undefined = undefined;
            let rmMap: string | undefined = undefined;

            if ( mat instanceof THREE.MeshPhysicalMaterial || mat instanceof THREE.MeshStandardMaterial) {

                if(mat.color !== undefined) mat_params.albedo = new Vector3(mat.color.r, mat.color.g, mat.color.b);
                /*
                if (mat.emissive !== undefined) {
                    mat_params.emission =
                    Math.max(mat.emissive.r, mat.emissive.g, mat.emissive.g) *
                    (mat.emissiveIntensity ?? 1);
                }
                */
                mat_params.emission = 0.0;
                if(mat.roughness !== undefined) mat_params.roughness = mat.roughness;
                if(mat.metalness !== undefined) mat_params.metalness = mat.metalness;

                // PBR Extra params
                if(mat instanceof THREE.MeshPhysicalMaterial){
                    if(mat.ior !== undefined) mat_params.ior = mat.ior;
                    if(mat.transmission !== undefined) mat_params.trs_weight = mat.transmission;
                    if(mat.specularColor !== undefined) mat_params.specular_color 
                                    = new Vector3(mat.specularColor.r, mat.specularColor.g, mat.specularColor.b);
                }

                if(mat.map !== undefined && mat.map !== null) 
                    albedoMap = basePath + this.getTextureURL(mat.map);
                if(mat.normalMap !== undefined && mat.normalMap !== null) 
                    normalMap = basePath + this.getTextureURL(mat.normalMap);

                const roughTex = mat.roughnessMap;
                const metalTex = mat.metalnessMap;

                if(roughTex !== undefined && roughTex !== null){
                    if (roughTex !== metalTex) {
                        console.warn("Separate roughness/metalness maps not supported");
                    } else {
                        rmMap = basePath + this.getTextureURL(roughTex);
                    }
                }

            }else{
                console.warn("Detected not supported THREE material", typeof mat ,mat)
            }

            materials.push({
                id: idx,
                material: new Material(mat_params),
                albedoMap,
                normalMap,
                rmMap
            });

            console.log("Added GLTF material:", JSON.stringify(materials[materials.length - 1], null, 2));
        }

        console.log(`Extracted ${materials.length} materials from GLTF`);
        console.log("Extracted gltf materials:", materials);

        // Process the THREE.Object3D using the base class
        return this.processTHREEObject(gltf.scene, materialNameToIndex, materials, scale, rotation, translation, normalStrategy);
    }

    private static getBasePath(url: string): string {
        const i = url.lastIndexOf('/');
        return i >= 0 ? url.substring(0, i + 1) : '';
    }

    private static getTextureURL(tex?: THREE.Texture): string | undefined {
        if (!tex || !tex.image) return undefined

        if (tex.userData && tex.userData.url) {
            return tex.userData.url
        }

        const image = tex.image

        if (image instanceof HTMLImageElement) {
            return image.src
        }

        if ((tex as any).source && (tex as any).source.data && (tex as any).source.data.src) {
            return (tex as any).source.data.src
        }


        return tex.name
    }
}

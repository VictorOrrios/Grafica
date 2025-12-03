import * as THREE from 'three';
import { OBJLoader as THREEOBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';
import { Material } from '../../Primitives/Material';
import { Vector3 } from 'math.gl';
import { ThreeJSMeshLoader } from './ThreeJSMeshLoader';
import type { ExtractedMaterial, EfficientMeshData } from './ThreeJSMeshLoader';
import { DEFAULT_COLOR, DEFAULT_EMISSION, DEFAULT_IOR, DEFAULT_SPECULAR, DEFAULT_SUBSURFACE_COLOR, NormalStrategy } from './constants';


// Re-export types for external use (ERROR otherwise)
export type { ExtractedMaterial, EfficientMeshData };

/**
 * Loader for OBJ files with optional MTL materials using THREE.js.
 * Extends ThreeJSMeshLoader to handle OBJ-specific loading logic.
 */
export class ThreeJSOBJLoader extends ThreeJSMeshLoader {
    /**
     * Load an OBJ file and optional MTL material file.
     * 
     * @param url - Path to the .obj file
     * @returns Processed mesh data ready for GPU upload
     */
    static async load(
        url: string,
        scale: number = 1.0,
        rotation: Vector3 = new Vector3(0, 0, 0),
        translation: Vector3 = new Vector3(0, 0, 0),
        normalStrategy: NormalStrategy = NormalStrategy.INTERPOLATED
    ): Promise<EfficientMeshData> {
        const objLoader = new THREEOBJLoader();
        const mtlLoader = new MTLLoader();

        // Load materials from MTL file
        let materialsLib: any = {};
        try {
            const mtlUrl = url.replace('.obj', '.mtl');
            materialsLib = await mtlLoader.loadAsync(mtlUrl);
            console.log("MTL materials loaded:", materialsLib);
            objLoader.setMaterials(materialsLib);
        } catch (e) {
            console.warn('MTL file not found or failed to load:', e);
        }

        // Load OBJ file
        const object = await objLoader.loadAsync(url);
        console.debug("OBJ file loaded:", url);

        // Extract materials from MTL
        const materials: ExtractedMaterial[] = [];
        const materialNameToIndex = new Map<string, number>();

        for (const matName in materialsLib.materialsInfo) {
            const info = materialsLib.materialsInfo[matName];
            const idx = materials.length;
            materialNameToIndex.set(matName, idx);

            const color: Vector3 = info.kd ? new Vector3(info.kd[0], info.kd[1], info.kd[2]) : DEFAULT_COLOR;
            const emission: Vector3 = info.ke ? new Vector3(info.ke[0], info.ke[1], info.ke[2]) : DEFAULT_EMISSION;
            const specular: Vector3 = info.ks ? new Vector3(info.ks[0], info.ks[1], info.ks[2]) : DEFAULT_SPECULAR;
            const ior = info.ni ? parseFloat(info.ni) : DEFAULT_IOR;
            const diffuseMap = info.map_kd;
            const specularMap = info.map_ks;

            let subsurface_color = DEFAULT_SUBSURFACE_COLOR;
            if (info.Tf) {
                subsurface_color = new Vector3(info.Tf[0], info.Tf[1], info.Tf[2]);
            }

            // NOTE: logic shared with GLTFLoader
            let is_emissive = false;
            let albedo_emission = color;

            for (let i = 0; i < 3; i++) {
                // KEY: in THREE.js, emissive and albedo are stored in separate fields,
                // so we need to check if any of the emissive channels is greater than 0
                // to determine if the material is emissive
                if (emission[i] > 0) {
                    is_emissive = true;
                    albedo_emission = emission;
                    // Stop looping immediately
                    break;
                }
            }

            materials.push({
                id: idx,
                /*
                material: new Material(
                    albedo_emission,
                    // If it's emissive, is_emissive > 0.0
                    is_emissive ? 1.0 : -1.0,
                    specular,
                    subsurface_color,
                    ior
                ),
                */
                material: new Material({}),
                diffuseMap,
                specularMap
            });

            console.log("Added OBJ material:", JSON.stringify(materials[materials.length - 1], null, 2));
        }

        // Process the THREE.Object3D using the base class
        return this.processTHREEObject(object, materialNameToIndex, materials, scale, rotation, translation, normalStrategy);
    }
}
import * as THREE from 'three';
import { GLTFLoader as THREEGLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Material } from '../../Primitives/Material';
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
        const gltfLoader = new THREEGLTFLoader();

        // Load GLTF file
        const gltf = await gltfLoader.loadAsync(url);
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

            // Default values taken from constants.ts
            let color: Vector3 = DEFAULT_COLOR;
            let emission: Vector3 = DEFAULT_EMISSION;
            let specular: Vector3 = DEFAULT_SPECULAR;
            let ior = DEFAULT_IOR;
            let diffuseMap: string | undefined = undefined;
            let specularMap: string | undefined = undefined;

            // Handle different material types
            if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhysicalMaterial) {
                // Color (diffuse)
                if (mat.color) {
                    color = new Vector3(mat.color.r, mat.color.g, mat.color.b);
                }

                // Emission
                if (mat.emissive) {
                    const intensity = (mat as any).emissiveIntensity ?? 1.0;
                    emission = new Vector3(
                        mat.emissive.r * intensity,
                        mat.emissive.g * intensity,
                        mat.emissive.b * intensity
                    );
                }

                // Specular (use metalness)
                const metalness = mat.metalness ?? 0.0;
                specular = new Vector3(metalness, metalness, metalness);

                // IOR (for MeshPhysicalMaterial)
                if (mat instanceof THREE.MeshPhysicalMaterial && (mat as any).ior !== undefined) {
                    ior = (mat as any).ior;
                }

                // Texture maps
                if (mat.map) {
                    diffuseMap = (mat.map as any).image?.src || (mat.map as any).name;
                }
                if ((mat as any).specularMap) {
                    specularMap = ((mat as any).specularMap as any).image?.src || ((mat as any).specularMap as any).name;
                }
            } else if (mat instanceof THREE.MeshBasicMaterial) {
                // Basic material - just color (no specular, no emission, no transmission)
                if (mat.color) {
                    color = new Vector3(mat.color.r, mat.color.g, mat.color.b);
                }
                if (mat.map) {
                    diffuseMap = (mat.map as any).image?.src || (mat.map as any).name;
                }
            }

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

            // Transmission / refraction color
            let subsurface_color = DEFAULT_SUBSURFACE_COLOR;

            // Handle transmission (MeshPhysicalMaterial)
            // NOTE: no support for transmission map (too much)
            // NOTE: transmission is not supported for emissive materials (emissives just emit, and that's it)
            if (mat instanceof THREE.MeshPhysicalMaterial && (mat as any).transmission > 0 && !is_emissive) {
                const transmission = (mat as any).transmission;
                // There is no RGB for the transmission color in THREE.js; use the regular
                // albedo_emission instead (multiplied by the transmission factor)
                subsurface_color = new Vector3(
                    albedo_emission.x * transmission,
                    albedo_emission.y * transmission,
                    albedo_emission.z * transmission
                );
                // Adjust albedo_emission to conserve energy (E_input = E_reflected + E_refracted)
                albedo_emission = new Vector3(
                    albedo_emission.x * (1 - transmission),
                    albedo_emission.y * (1 - transmission),
                    albedo_emission.z * (1 - transmission)
                );
            }

            materials.push({
                id: idx,
                material: new Material(
                    albedo_emission,
                    // If it's emissive, is_emissive > 0.0
                    is_emissive ? 1.0 : -1.0,
                    specular,
                    subsurface_color,
                    ior
                ),
                diffuseMap,
                specularMap
            });

            console.log("Added GLTF material:", JSON.stringify(materials[materials.length - 1], null, 2));
        }

        console.log(`Extracted ${materials.length} materials from GLTF`);
        console.log("Extracted gltf materials:", materials);

        // Process the THREE.Object3D using the base class
        return this.processTHREEObject(gltf.scene, materialNameToIndex, materials, scale, rotation, translation, normalStrategy);
    }
}

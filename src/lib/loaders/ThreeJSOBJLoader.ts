import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';

// Interface for extracted data (matching your Triangle and Material structs)
export interface ExtractedTriangle {
    v0: [number, number, number];
    v1: [number, number, number];
    v2: [number, number, number];
    normal: [number, number, number];
    mat: number; // Material index
}

export interface ExtractedMaterial {
    albedo_emission: [number, number, number, number]; // RGB + emission
    specular_color: [number, number, number];
    subsurface_color_ior: [number, number, number, number];
    lobe_chances: [number, number, number]; // Diffuse, metallic, dielectric
}

export interface ModelData {
    triangles: ExtractedTriangle[];
    materials: ExtractedMaterial[];
}

/**
 * Loader class that uses Three.js to load OBJ models with MTL materials,
 * and extracts geometry/material data for custom rendering pipelines.
 */
export class ThreeJSOBJLoader {
    private basePath: string;

    /**
     * Creates a new ThreeJSOBJLoader instance.
     * @param basePath - Base path for loading models (default: '/models/obj/')
     */
    constructor(basePath: string = '/models/obj/') {
        this.basePath = basePath;
    }

    /**
     * Sets the base path for loading models.
     * @param path - The base path to use
     */
    setPath(path: string): void {
        this.basePath = path;
    }

    /**
     * Loads an OBJ model with MTL materials and extracts data for custom rendering.
     * @param objPath - Path to the .obj file (relative to basePath)
     * @param mtlPath - Path to the .mtl file (relative to basePath)
     * @returns Promise<ModelData> - Extracted triangles and materials
     */
    async load(objPath: string, mtlPath?: string): Promise<ModelData> {
        // Load materials if MTL path is provided
        let materialsCreator: any = null;
        if (mtlPath) {
            const mtlLoader = new MTLLoader();
            mtlLoader.setPath(this.basePath);
            materialsCreator = await new Promise<any>((resolve, reject) => {
                mtlLoader.load(mtlPath, resolve, undefined, reject);
            });
            materialsCreator.preload();
        }

        // Load OBJ with materials
        const objLoader = new OBJLoader();
        if (materialsCreator) {
            objLoader.setMaterials(materialsCreator);
        }
        objLoader.setPath(this.basePath);
        const object = await new Promise<THREE.Group>((resolve, reject) => {
            objLoader.load(objPath, resolve, undefined, reject);
        });

        // Extract data
        const extractedData = this.extractMeshData(object);
        return extractedData;
    }

    /**
     * Extracts triangles and materials from a loaded Three.js Object3D.
     * @param object - The loaded Three.js object (e.g., from OBJLoader)
     * @returns ModelData - Arrays of triangles and materials
     */
    private extractMeshData(object: THREE.Object3D): ModelData {
        const triangles: ExtractedTriangle[] = [];
        const materials: ExtractedMaterial[] = [];

        object.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                const geometry = child.geometry as THREE.BufferGeometry;
                const material = child.material as THREE.MeshPhongMaterial; // Assuming Phong for simplicity; adjust for PBR

                // Extract attributes
                const positions = geometry.attributes.position.array as Float32Array;
                const normals = geometry.attributes.normal?.array as Float32Array;
                const uvs = geometry.attributes.uv?.array as Float32Array;
                const indices = geometry.index?.array as Uint16Array | Uint32Array;

                if (!indices) {
                    console.warn('No indices found; skipping mesh without triangulation.');
                    return;
                }

                // Convert to triangles
                for (let i = 0; i < indices.length; i += 3) {
                    const i0 = indices[i];
                    const i1 = indices[i + 1];
                    const i2 = indices[i + 2];

                    const tri: ExtractedTriangle = {
                        v0: [positions[i0 * 3], positions[i0 * 3 + 1], positions[i0 * 3 + 2]],
                        v1: [positions[i1 * 3], positions[i1 * 3 + 1], positions[i1 * 3 + 2]],
                        v2: [positions[i2 * 3], positions[i2 * 3 + 1], positions[i2 * 3 + 2]],
                        normal: normals ? [
                            (normals[i0 * 3] + normals[i1 * 3] + normals[i2 * 3]) / 3,
                            (normals[i0 * 3 + 1] + normals[i1 * 3 + 1] + normals[i2 * 3 + 1]) / 3,
                            (normals[i0 * 3 + 2] + normals[i1 * 3 + 2] + normals[i2 * 3 + 2]) / 3
                        ] : [0, 1, 0], // Default up normal
                        mat: materials.length // Assign material index
                    };
                    triangles.push(tri);
                }

                // Extract material properties
                const mat: ExtractedMaterial = {
                    albedo_emission: [
                        material.color?.r || 1,
                        material.color?.g || 1,
                        material.color?.b || 1,
                        material.emissive ? 1 : 0 // Simple emission flag
                    ],
                    specular_color: [
                        material.specular?.r || 0,
                        material.specular?.g || 0,
                        material.specular?.b || 0
                    ],
                    subsurface_color_ior: [0, 0, 0, material.refractionRatio || 1.0], // Placeholder for dielectrics
                    lobe_chances: [1.0, 0.0, 0.0] // Default to diffuse; customize based on material type
                };
                materials.push(mat);

                // TODO: Handle textures (e.g., material.map) - load as THREE.Texture and pass to shader
                if (material.map) {
                    const img = material.map.image as HTMLImageElement;
                    console.log('Texture found:', img?.src);
                    // Implement texture loading/passing to shader uniforms here
                }
            }
        });

        return { triangles, materials };
    }
}
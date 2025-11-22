import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';

// Interface for extracted data (matching your Triangle and Material structs)
export interface ExtractedMaterial {
    albedo_emission: [number, number, number, number]; // RGB + emission
    specular_color: [number, number, number];
    subsurface_color_ior: [number, number, number, number];
    lobe_chances: [number, number, number, number]; // Diffuse, metallic, dielectric, sum
}

// Memory-efficient structure for GLSL serialization
export interface EfficientModelData {
    // Unique vertex attributes (shared across triangles)
    positions: Float32Array;        // [x,y,z, x,y,z, ...] - all unique positions
    normals: Float32Array;          // [x,y,z, x,y,z, ...] - all unique normals
    uvs: Float32Array;             // [u,v, u,v, ...] - all unique UV coordinates

    // Triangle indices (3 per triangle, indexing into the above arrays)
    positionIndices: Uint16Array;   // vertex position indices
    normalIndices: Uint16Array;     // vertex normal indices
    uvIndices: Uint16Array;         // vertex UV indices

    // Materials
    materials: ExtractedMaterial[];

    // Per-triangle material assignment
    triangleMaterials: Uint8Array;  // material index for each triangle

    // Serialization method that returns separate buffers for texture uploads
    serializeTextures(): {
        positionsRGBA: Float32Array;    // RGBA32F texels (x,y,z,0)
        normalsRGBA: Float32Array;      // RGBA32F texels (x,y,z,0)
        uvsRG: Float32Array;            // RG32F texels (u,v)
        positionIndices: Uint32Array;   // R32UI texels (one uint per index)
        normalIndices: Uint32Array;     // R32UI texels (one uint per index)
        uvIndices: Uint32Array;         // R32UI texels (one uint per index)
        triangleMaterials: Uint32Array; // R32UI texels (one uint per triangle)
        materialsFloat: Float32Array;   // small UBO style flattened materials (floats)
    };
}

/**
 * Loader class that uses Three.js to load OBJ models with MTL materials,
 * and extracts geometry/material data for custom rendering pipelines.
 */
export class ThreeJSOBJLoader {
    /**
     * Loads an OBJ model with MTL materials and extracts efficient data for custom rendering.
     * @param objPath - Path to the .obj file (relative to basePath)
     * @param mtlPath - Path to the .mtl file (relative to basePath)
     * @param basePath - Base path for loading models (default: '/models/obj/')
     * @returns Promise<EfficientModelData> - Memory-efficient indexed vertex data
     */
    static async load(objPath: string, mtlPath?: string, basePath: string = '/models/obj/'): Promise<EfficientModelData> {
        // Load materials if MTL path is provided
        let materialsCreator: any = null;
        if (mtlPath) {
            const mtlLoader = new MTLLoader();
            mtlLoader.setPath(basePath);
            materialsCreator = await new Promise<any>((resolve, reject) => {
                mtlLoader.load(mtlPath, resolve, undefined, reject);
            });
            materialsCreator.preload();
        }

        // Load OBJ with materials
        // TODO, add gltf loader
        const objLoader = new OBJLoader();
        if (materialsCreator) {
            objLoader.setMaterials(materialsCreator);
        }
        objLoader.setPath(basePath);
        const object = await new Promise<THREE.Group>((resolve, reject) => {
            objLoader.load(objPath, resolve, undefined, reject);
        });

        // Extract data
        const extractedData = this.extractMeshData(object);
        return extractedData;
    }

    /**
     * Extracts efficient indexed vertex data from a loaded Three.js Object3D.
     * @param object - The loaded Three.js object (e.g., from OBJLoader)
     * @returns EfficientModelData - Memory-efficient indexed vertex data
     */
    private static extractMeshData(object: THREE.Object3D): EfficientModelData {
        // For efficient data structure
        const uniquePositions: number[] = [];
        const uniqueNormals: number[] = [];
        const uniqueUVs: number[] = [];
        const positionIndices: number[] = [];
        const normalIndices: number[] = [];
        const uvIndices: number[] = [];
        const triangleMaterials: number[] = [];
        const materials: ExtractedMaterial[] = [];

        // Maps to track unique vertices (key -> index)
        const positionMap = new Map<string, number>();
        const normalMap = new Map<string, number>();
        const uvMap = new Map<string, number>();

        let total_meshes = 0;
        object.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                total_meshes++;
                if (total_meshes <= 10) console.log("Total meshes so far:", total_meshes);
                // console.log("Child object:", child);
                const geometry = child.geometry as THREE.BufferGeometry;
                const material = child.material as THREE.MeshPhongMaterial; // Assuming Phong for simplicity; adjust for PBR

                // Extract attributes
                const positions = geometry.attributes.position.array as Float32Array;
                const normals = geometry.attributes.normal?.array as Float32Array;
                const uvs = geometry.attributes.uv?.array as Float32Array;
                const indices = geometry.index?.array as Uint16Array | Uint32Array;

                console.log("Positions:", positions.subarray(0, 32), "total length:", positions.length);
                /*console.log("Normals:", normals ? normals.subarray(0, 9) : 'No normals');
                console.log("UVs:", uvs ? uvs.subarray(0, 6) : 'No UVs');
                console.log("Indices:", indices ? indices.subarray(0, 9) : 'No indices');*/

                // Handle both indexed and non-indexed geometries
                let triangleCount: number;
                let getVertexIndex: (triangleIndex: number, vertexInTriangle: number) => number;

                if (indices && indices.length > 0) {
                    // Indexed geometry
                    triangleCount = indices.length / 3;
                    getVertexIndex = (triangleIndex: number, vertexInTriangle: number) => indices[triangleIndex * 3 + vertexInTriangle];
                    console.log("Using indexed geometry with", triangleCount, "triangles");
                } else {
                    // Non-indexed geometry - each 3 vertices form a triangle
                    triangleCount = positions.length / 9; // 3 vertices * 3 components each
                    getVertexIndex = (triangleIndex: number, vertexInTriangle: number) => triangleIndex * 3 + vertexInTriangle;
                    console.log("Using non-indexed geometry with", triangleCount, "triangles");
                }

                 // Log first 3 vertices (9 values)

                const materialIndex = materials.length;

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
                    lobe_chances: [1.0, 0.0, 0.0, 1.0] // Default to diffuse; customize based on material type
                };
                materials.push(mat);

                for (let i = 0; i < triangleCount; i++) {
                    const i0 = getVertexIndex(i, 0);
                    const i1 = getVertexIndex(i, 1);
                    const i2 = getVertexIndex(i, 2);

                    // ===== EFFICIENT INDEXED FORMAT =====

                    // Helper function to get or create unique vertex
                    const getOrCreateIndex = (
                        map: Map<string, number>,
                        array: number[],
                        values: number[],
                        key: string
                    ): number => {
                        if (map.has(key)) {
                            return map.get(key)!;
                        }
                        const index = array.length / values.length;
                        array.push(...values);
                        map.set(key, index);
                        return index;
                    };

                    // Position indices (deduplicate by position)
                    const posKey0 = `${positions[i0 * 3]},${positions[i0 * 3 + 1]},${positions[i0 * 3 + 2]}`;
                    const posKey1 = `${positions[i1 * 3]},${positions[i1 * 3 + 1]},${positions[i1 * 3 + 2]}`;
                    const posKey2 = `${positions[i2 * 3]},${positions[i2 * 3 + 1]},${positions[i2 * 3 + 2]}`;

                    const posIdx0 = getOrCreateIndex(positionMap, uniquePositions,
                        [positions[i0 * 3], positions[i0 * 3 + 1], positions[i0 * 3 + 2]], posKey0);
                    const posIdx1 = getOrCreateIndex(positionMap, uniquePositions,
                        [positions[i1 * 3], positions[i1 * 3 + 1], positions[i1 * 3 + 2]], posKey1);
                    const posIdx2 = getOrCreateIndex(positionMap, uniquePositions,
                        [positions[i2 * 3], positions[i2 * 3 + 1], positions[i2 * 3 + 2]], posKey2);

                    positionIndices.push(posIdx0, posIdx1, posIdx2);

                    // Normal indices (use face normal for simplicity)
                    if (normals) {
                        const faceNormal: [number, number, number] = [
                            (normals[i0 * 3] + normals[i1 * 3] + normals[i2 * 3]) / 3,
                            (normals[i0 * 3 + 1] + normals[i1 * 3 + 1] + normals[i2 * 3 + 1]) / 3,
                            (normals[i0 * 3 + 2] + normals[i1 * 3 + 2] + normals[i2 * 3 + 2]) / 3
                        ];
                        const normalKey = `${faceNormal[0]},${faceNormal[1]},${faceNormal[2]}`;
                        const normalIdx = getOrCreateIndex(normalMap, uniqueNormals, faceNormal, normalKey);
                        normalIndices.push(normalIdx, normalIdx, normalIdx); // Same normal for all vertices
                    } else {
                        const defaultNormal: [number, number, number] = [0, 1, 0];
                        const normalKey = '0,1,0';
                        const normalIdx = getOrCreateIndex(normalMap, uniqueNormals, defaultNormal, normalKey);
                        normalIndices.push(normalIdx, normalIdx, normalIdx);
                    }

                    // UV indices (if available)
                    if (uvs) {
                        const uvKey0 = `${uvs[i0 * 2]},${uvs[i0 * 2 + 1]}`;
                        const uvKey1 = `${uvs[i1 * 2]},${uvs[i1 * 2 + 1]}`;
                        const uvKey2 = `${uvs[i2 * 2]},${uvs[i2 * 2 + 1]}`;

                        const uvIdx0 = getOrCreateIndex(uvMap, uniqueUVs,
                            [uvs[i0 * 2], uvs[i0 * 2 + 1]], uvKey0);
                        const uvIdx1 = getOrCreateIndex(uvMap, uniqueUVs,
                            [uvs[i1 * 2], uvs[i1 * 2 + 1]], uvKey1);
                        const uvIdx2 = getOrCreateIndex(uvMap, uniqueUVs,
                            [uvs[i2 * 2], uvs[i2 * 2 + 1]], uvKey2);

                        uvIndices.push(uvIdx0, uvIdx1, uvIdx2);
                    } else {
                        // Default UVs if not available
                        const defaultUV: [number, number] = [0, 0];
                        const uvKey = '0,0';
                        const uvIdx = getOrCreateIndex(uvMap, uniqueUVs, defaultUV, uvKey);
                        uvIndices.push(uvIdx, uvIdx, uvIdx);
                    }

                    // Triangle material
                    triangleMaterials.push(materialIndex);
                }

                // TODO: Handle textures (e.g., material.map) - load as THREE.Texture and pass to shader uniforms here
                if (material.map) {
                    const img = material.map.image as HTMLImageElement;
                    console.log('Texture found:', img?.src);
                    // Implement texture loading/passing to shader uniforms here
                }
            }
        });

        // Create efficient data structure
        const efficient: EfficientModelData = {
            positions: new Float32Array(uniquePositions),
            normals: new Float32Array(uniqueNormals),
            uvs: new Float32Array(uniqueUVs),
            positionIndices: new Uint16Array(positionIndices),
            normalIndices: new Uint16Array(normalIndices),
            uvIndices: new Uint16Array(uvIndices),
            materials: materials,
            triangleMaterials: new Uint8Array(triangleMaterials),
            serializeTextures: function() {
                // Convert positions to RGBA texels (x,y,z,0)
                const numPositions = this.positions.length / 3;
                const positionsRGBA = new Float32Array(numPositions * 4);
                for (let i = 0; i < numPositions; i++) {
                    positionsRGBA[i * 4 + 0] = this.positions[i * 3 + 0];
                    positionsRGBA[i * 4 + 1] = this.positions[i * 3 + 1];
                    positionsRGBA[i * 4 + 2] = this.positions[i * 3 + 2];
                    positionsRGBA[i * 4 + 3] = 0.0;
                }

                // Normals (pack as RGBA too)
                const numNormals = this.normals.length / 3;
                const normalsRGBA = new Float32Array(numNormals * 4);
                for (let i = 0; i < numNormals; i++) {
                    normalsRGBA[i * 4 + 0] = this.normals[i * 3 + 0];
                    normalsRGBA[i * 4 + 1] = this.normals[i * 3 + 1];
                    normalsRGBA[i * 4 + 2] = this.normals[i * 3 + 2];
                    normalsRGBA[i * 4 + 3] = 0.0;
                }

                // UVs (RG)
                const numUVs = this.uvs.length / 2;
                const uvsRG = new Float32Array(numUVs * 2);
                for (let i = 0; i < numUVs; i++) {
                    uvsRG[i * 2 + 0] = this.uvs[i * 2 + 0];
                    uvsRG[i * 2 + 1] = this.uvs[i * 2 + 1];
                }

                // Indices: convert to Uint32Array
                const positionIndices = new Uint32Array(this.positionIndices);
                const normalIndices = new Uint32Array(this.normalIndices);
                const uvIndices = new Uint32Array(this.uvIndices);

                // Triangle materials per triangle
                const triangleMaterials = new Uint32Array(this.triangleMaterials.length);
                for (let i = 0; i < this.triangleMaterials.length; i++) {
                    triangleMaterials[i] = this.triangleMaterials[i];
                }

                // console.log("Loaded threejs materials:", this.materials);
                // Flatten materials into float array (16 floats per material)
                // KEY, NOTE: there will be as many materials as objects in the .obj file;
                // they'll probably be repeated, we'll see if we can optimize this later
                const materialsFloat = new Float32Array(this.materials.length * 16);
                let mo = 0;
                for (const material of this.materials) {
                    materialsFloat[mo++] = material.albedo_emission[0];
                    materialsFloat[mo++] = material.albedo_emission[1];
                    materialsFloat[mo++] = material.albedo_emission[2];
                    materialsFloat[mo++] = material.albedo_emission[3];

                    materialsFloat[mo++] = material.specular_color[0];
                    materialsFloat[mo++] = material.specular_color[1];
                    materialsFloat[mo++] = material.specular_color[2];
                    materialsFloat[mo++] = 0.0; // padding

                    materialsFloat[mo++] = material.subsurface_color_ior[0];
                    materialsFloat[mo++] = material.subsurface_color_ior[1];
                    materialsFloat[mo++] = material.subsurface_color_ior[2];
                    materialsFloat[mo++] = material.subsurface_color_ior[3];

                    materialsFloat[mo++] = material.lobe_chances[0];
                    materialsFloat[mo++] = material.lobe_chances[1];
                    materialsFloat[mo++] = material.lobe_chances[2];
                    materialsFloat[mo++] = material.lobe_chances[3];
                }

                return {
                    positionsRGBA,
                    normalsRGBA,
                    uvsRG,
                    positionIndices,
                    normalIndices,
                    uvIndices,
                    triangleMaterials,
                    materialsFloat
                };
            }
        };

        return efficient;
    }
}
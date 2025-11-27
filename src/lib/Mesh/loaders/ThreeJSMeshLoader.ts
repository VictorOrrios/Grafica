import * as THREE from 'three';
import { BVHBuilder } from '../BVH/BVHBuilder';

import { Material } from '../../Primitives/Material';
import { Vector3 } from 'math.gl';
import { DEFAULT_COLOR, DEFAULT_IOR, DEFAULT_SPECULAR, DEFAULT_SUBSURFACE_COLOR } from './constants';

// Interface for extracted Material data (TODO, cambiar a voluntad)
export interface ExtractedMaterial {
    id: number;
    material: Material;
    diffuseMap?: string;
    specularMap?: string;
}

export interface EfficientMeshData {
    positions: Float32Array;        // Packed vec3 positions
    normals: Float32Array;          // Packed vec3 normals
    uvs: Float32Array;              // Packed vec2 uvs
    positionIndices: Uint32Array;   // Triangle indices (3 per triangle)
    triangleMaterials: Uint32Array; // Material index per triangle
    materials: ExtractedMaterial[];
    bvhData: Float32Array;          // Custom BVH data
    serializeTextures(): {
        positionsRGB: Float32Array;
        normalsRGB: Float32Array;
        uvsRG: Float32Array;
        positionIndices: Uint32Array;
        normalIndices: Uint32Array;
        uvIndices: Uint32Array;
        triangleMaterials: Uint32Array;
        materialsFloat: Float32Array;
        bvh: Float32Array;
    };
}

/**
 * Base class for loading 3D models using THREE.js loaders.
 * Handles common mesh processing: vertex deduplication, BVH building, and serialization.
 * Subclasses use the static processTHREEObject method for common processing.
 */
export class ThreeJSMeshLoader {
    /**
     * Process a THREE.Object3D and extract mesh data with unified indexing.
     * This method handles vertex deduplication, BVH construction, and serialization.
     * 
     * @param object - The THREE.Object3D to process (from OBJLoader, GLTFLoader, etc.)
     * @param materialNameToIndex - Map from material name to material index
     * @param materials - Array of extracted materials
     * @returns Processed mesh data ready for GPU upload
     */
    protected static async processTHREEObject(
        object: THREE.Object3D,
        materialNameToIndex: Map<string, number>,
        materials: ExtractedMaterial[],
        scale: number = 1.0
    ): Promise<EfficientMeshData> {
        const extracted: {
            positions: number[],
            normals: number[],
            uvs: number[],
            triangles: { v0: number, v1: number, v2: number, materialIndex: number }[],
            materials: ExtractedMaterial[]
        } = {
            positions: [],
            normals: [],
            uvs: [],
            triangles: [],
            materials: materials
        };

        // Map to deduplicate vertices
        const vertexMap = new Map<string, number>();

        object.traverse((child: any) => {
            if (child instanceof THREE.Mesh) {
                const geometry = child.geometry;
                const material = child.material;

                // Handle materials
                let matIndex = 0; // default

                if (material instanceof THREE.Material) {
                    matIndex = materialNameToIndex.get(material.name) || 0;
                } else if (Array.isArray(material)) {
                    // Handle material arrays (take first material)
                    const mat = material[0];
                    matIndex = mat ? (materialNameToIndex.get(mat.name) || 0) : 0;
                }

                if (geometry) {
                    const posAttr = geometry.attributes.position;
                    const normalAttr = geometry.attributes.normal;
                    const uvAttr = geometry.attributes.uv;
                    const indexAttr = geometry.index;

                    // Obtain the index for a vertex (position, normal, uv), that
                    // will be used to access the corresponding data in the shader
                    // position, normal, uv share the same index for a single vertex,
                    // to save GPU costs
                    const getVertexIndex = (localIdx: number) => {
                        const x = posAttr.getX(localIdx) * scale;
                        const y = posAttr.getY(localIdx) * scale;
                        const z = posAttr.getZ(localIdx) * scale;
                        let nx = 0, ny = 0, nz = 0;
                        if (normalAttr) {
                            nx = normalAttr.getX(localIdx);
                            ny = normalAttr.getY(localIdx);
                            nz = normalAttr.getZ(localIdx);
                        }
                        let u = 0, v = 0;
                        if (uvAttr) {
                            u = uvAttr.getX(localIdx);
                            v = uvAttr.getY(localIdx);
                        }
                        const key = `${x.toFixed(6)},${y.toFixed(6)},${z.toFixed(6)}|${nx.toFixed(6)},${ny.toFixed(6)},${nz.toFixed(6)}|${u.toFixed(6)},${v.toFixed(6)}`;

                        // If the vertex already exists, return its index (this will happen when the vertex
                        // has already been added and it's shared by multiple triangles)
                        if (vertexMap.has(key)) return vertexMap.get(key)!;

                        // Add new vertex data (indices in the three arrays
                        // (positions, normals, uvs) match for the current vertex)
                        const newIdx = extracted.positions.length / 3;
                        extracted.positions.push(x, y, z);
                        extracted.normals.push(nx, ny, nz);
                        extracted.uvs.push(u, v);
                        vertexMap.set(key, newIdx);
                        return newIdx;
                    };

                    // THREE.Mesh.geometry might have an index attribute
                    // (we need to build our own indexing system)
                    if (indexAttr) {
                        for (let i = 0; i < indexAttr.count; i += 3) {
                            const idx0 = getVertexIndex(indexAttr.getX(i));
                            const idx1 = getVertexIndex(indexAttr.getX(i + 1));
                            const idx2 = getVertexIndex(indexAttr.getX(i + 2));
                            extracted.triangles.push({ v0: idx0, v1: idx1, v2: idx2, materialIndex: matIndex });
                        }
                    } else {
                        for (let i = 0; i < posAttr.count; i += 3) {
                            const idx0 = getVertexIndex(i);
                            const idx1 = getVertexIndex(i + 1);
                            const idx2 = getVertexIndex(i + 2);
                            extracted.triangles.push({ v0: idx0, v1: idx1, v2: idx2, materialIndex: matIndex });
                        }
                    }
                }
            }
        });

        console.log("Extracted materials:", extracted.materials);

        // Add default material if no materials were extracted
        if (extracted.materials.length === 0) {
            extracted.materials.push({
                id: 0,
                material: new Material(
                    DEFAULT_COLOR,
                    0,
                    DEFAULT_SPECULAR,
                    DEFAULT_SUBSURFACE_COLOR,
                    DEFAULT_IOR
                )
            });
        }

        // Convert to typed arrays
        const positions = new Float32Array(extracted.positions);
        const normals = new Float32Array(extracted.normals);
        const uvs = new Float32Array(extracted.uvs);
        // const numVertices = positions.length / 3;
        const initialIndices = new Uint32Array(extracted.triangles.length * 3);
        const initialMaterials = new Uint32Array(extracted.triangles.length);

        console.log("Extracted positions", positions);
        console.log("Extracted normals", normals);
        console.log("Extracted uvs", uvs);

        for (let i = 0; i < extracted.triangles.length; i++) {
            initialIndices[i * 3] = extracted.triangles[i].v0;
            initialIndices[i * 3 + 1] = extracted.triangles[i].v1;
            initialIndices[i * 3 + 2] = extracted.triangles[i].v2;
            initialMaterials[i] = extracted.triangles[i].materialIndex;
        }

        console.log(`Building Custom BVH for ${extracted.triangles.length} triangles...`);

        // Build BVH
        const { root, sortedTriangleIndices } = BVHBuilder.build(positions, initialIndices);
        const bvhData = BVHBuilder.flatten(root);

        // Reorder triangle data to match BVH leaf order
        const finalIndices = new Uint32Array(initialIndices.length);
        const finalMaterials = new Uint32Array(initialMaterials.length);

        for (let i = 0; i < sortedTriangleIndices.length; i++) {
            const oldTriIdx = sortedTriangleIndices[i];

            finalIndices[i * 3] = initialIndices[oldTriIdx * 3];
            finalIndices[i * 3 + 1] = initialIndices[oldTriIdx * 3 + 1];
            finalIndices[i * 3 + 2] = initialIndices[oldTriIdx * 3 + 2];

            finalMaterials[i] = initialMaterials[oldTriIdx];
        }

        console.log(`BVH built. Nodes: ${bvhData.length / 8}. Data size: ${bvhData.byteLength} bytes.`);

        return {
            positions: positions,
            normals: normals,
            uvs: uvs,
            positionIndices: finalIndices,
            triangleMaterials: finalMaterials,
            materials: extracted.materials,
            bvhData: bvhData,
            serializeTextures: () => {
                // UNIFIED INDEXING: We use the same indices for positions, normals, and UVs.
                // This is because we deduplicate vertices based on the combination of 
                // (position, normal, UV), so each unique combination gets one index.

                // Positions: vec3 -> RGB32F (3 floats per vertex instead of 4)
                const positionsRGB = new Float32Array(positions);

                // Normals: vec3 -> RGB32F (3 floats per vertex instead of 4)
                const normalsRGB = new Float32Array(normals);

                // UVs: vec2 (RG32F)
                const uvsRG = new Float32Array(uvs);

                // All vertex attributes share the same indices (unified indexing)
                const sharedIndices = finalIndices;

                // Materials: Flatten to Float32Array (16 floats per material)
                const materialsFloat = new Float32Array(extracted.materials.length * 16);
                let mo = 0;
                for (const extMat of extracted.materials) {
                    // TODO, CRITICAL: extract diffuseMap and specularMap,
                    // and serialize them into a webgl sampler2D
                    const serialized = extMat.material.serialize();
                    materialsFloat.set(serialized, mo);
                    // Tamaño total del material: 16 floats
                    mo += 16;
                }

                return {
                    positionsRGB,
                    normalsRGB,
                    uvsRG,
                    positionIndices: sharedIndices,
                    normalIndices: sharedIndices,
                    uvIndices: sharedIndices,
                    triangleMaterials: finalMaterials,
                    materialsFloat,
                    bvh: bvhData
                };
            }
        };
    }
}

import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';

// Interface for extracted data (matching your Triangle and Material structs)
export interface ExtractedMaterial {
    id: number;
    color: [number, number, number];
    emission: [number, number, number];
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
        positionsRGBA: Float32Array;
        normalsRGBA: Float32Array;
        uvsRG: Float32Array;
        positionIndices: Uint32Array;
        normalIndices: Uint32Array;
        uvIndices: Uint32Array;
        triangleMaterials: Uint32Array;
        materialsFloat: Float32Array;
        bvh: Float32Array;
    };
}

import { BVHBuilder } from '../BVH/BVHBuilder';

export class ThreeJSOBJLoader {
    static async load(url: string): Promise<EfficientMeshData> {
        const loader = new OBJLoader();
        const mtlLoader = new MTLLoader();

        // Load materials first if possible (simplified here)

        const object = await loader.loadAsync(url);

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
            materials: []
        };

        // Map to deduplicate vertices
        const vertexMap = new Map<string, number>();

        // Default material
        extracted.materials.push({
            id: 0,
            color: [0.8, 0.8, 0.8],
            emission: [0, 0, 0]
        });

        object.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                const geometry = child.geometry;
                const material = child.material;

                // Handle materials... (simplified)
                let matIndex = 0;

                if (geometry) {
                    const posAttr = geometry.attributes.position;
                    const normalAttr = geometry.attributes.normal;
                    const uvAttr = geometry.attributes.uv;
                    const indexAttr = geometry.index;

                    const getVertexIndex = (localIdx: number) => {
                        const x = posAttr.getX(localIdx);
                        const y = posAttr.getY(localIdx);
                        const z = posAttr.getZ(localIdx);
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

                        if (vertexMap.has(key)) return vertexMap.get(key)!;

                        const newIdx = extracted.positions.length / 3;
                        extracted.positions.push(x, y, z);
                        extracted.normals.push(nx, ny, nz);
                        extracted.uvs.push(u, v);
                        vertexMap.set(key, newIdx);
                        return newIdx;
                    };

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

        // Convert to typed arrays
        const positions = new Float32Array(extracted.positions);
        const normals = new Float32Array(extracted.normals);
        const uvs = new Float32Array(extracted.uvs);
        const numVertices = positions.length / 3;
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

        // Normals and UVs are extracted directly from OBJ geometry above; no additional calculation needed.

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
                // Positions: vec3 -> vec4 (RGBA32F)
                const positionsRGBA = new Float32Array(numVertices * 4);
                for (let i = 0; i < numVertices; i++) {
                    positionsRGBA[i * 4 + 0] = positions[i * 3 + 0];
                    positionsRGBA[i * 4 + 1] = positions[i * 3 + 1];
                    positionsRGBA[i * 4 + 2] = positions[i * 3 + 2];
                    positionsRGBA[i * 4 + 3] = 1.0; // w=1
                }

                // Normals: vec3 -> vec4 (RGBA32F)
                const normalsRGBA = new Float32Array(numVertices * 4);
                for (let i = 0; i < numVertices; i++) {
                    normalsRGBA[i * 4 + 0] = normals[i * 3 + 0];
                    normalsRGBA[i * 4 + 1] = normals[i * 3 + 1];
                    normalsRGBA[i * 4 + 2] = normals[i * 3 + 2];
                    normalsRGBA[i * 4 + 3] = 0.0;
                }

                // UVs: vec2 (RG32F) - already correct format but let's copy
                const uvsRG = new Float32Array(uvs);

                // Indices: Use the reordered indices
                const normalIndices = new Uint32Array(finalIndices);
                const uvIndices = new Uint32Array(finalIndices);

                // Materials: Flatten to Float32Array (16 floats per material)
                const materialsFloat = new Float32Array(extracted.materials.length * 16);
                let mo = 0;
                for (const material of extracted.materials) {
                    materialsFloat[mo++] = material.color[0];
                    materialsFloat[mo++] = material.color[1];
                    materialsFloat[mo++] = material.color[2];
                    materialsFloat[mo++] = material.emission[0] > 0 || material.emission[1] > 0 || material.emission[2] > 0 ? 1.0 : 0.0;

                    materialsFloat[mo++] = 0.0; // Specular R
                    materialsFloat[mo++] = 0.0; // Specular G
                    materialsFloat[mo++] = 0.0; // Specular B
                    materialsFloat[mo++] = 0.0; // Padding

                    materialsFloat[mo++] = 0.0; // IOR/Subsurface
                    materialsFloat[mo++] = 0.0;
                    materialsFloat[mo++] = 0.0;
                    materialsFloat[mo++] = 0.0;

                    materialsFloat[mo++] = 1.0; // Diffuse chance
                    materialsFloat[mo++] = 0.0;
                    materialsFloat[mo++] = 0.0;
                    materialsFloat[mo++] = 0.0;
                }

                return {
                    positionsRGBA,
                    normalsRGBA,
                    uvsRG,
                    positionIndices: finalIndices,
                    normalIndices,
                    uvIndices,
                    triangleMaterials: finalMaterials,
                    materialsFloat,
                    bvh: bvhData
                };
            }
        };
    }
}
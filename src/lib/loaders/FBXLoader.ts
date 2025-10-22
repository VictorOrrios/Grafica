import { Vector3 } from "math.gl";
import { Triangle } from "../Primitives/Triangle";
import { Mesh } from "../Primitives/Mesh";

/**
 * FBX File Loader
 * 
 * FBX is a complex binary format. This loader provides basic support
 * by parsing the ASCII FBX format and extracting geometry data.
 * 
 * For full FBX support, consider using a library like:
 * - three.js FBXLoader (if integrating with Three.js)
 * - fbx-parser (standalone parser)
 */
export class FBXLoader {
    /**
     * Parse FBX file content (synchronous)
     * Use this after loading the file content yourself
     * @param content - FBX file content as string
     * @param name - Name for the mesh
     * @returns Mesh object
     */
    public static parse(content: string, name: string = "mesh"): Mesh {
        const mesh = new Mesh(name);
        const vertices: Vector3[] = [];

        // FBX ASCII format has a hierarchical structure
        // We'll look for Vertices and PolygonVertexIndex sections
        
        // Extract vertices
        const verticesMatch = content.match(/Vertices:\s*\*\d+\s*\{[^}]*a:\s*([^}]+)\}/);
        if (verticesMatch) {
            const vertexData = verticesMatch[1].split(',').map(v => parseFloat(v.trim()));
            for (let i = 0; i < vertexData.length; i += 3) {
                if (i + 2 < vertexData.length) {
                    vertices.push(new Vector3(vertexData[i], vertexData[i + 1], vertexData[i + 2]));
                }
            }
        }

        // Extract polygon vertex indices
        const indicesMatch = content.match(/PolygonVertexIndex:\s*\*\d+\s*\{[^}]*a:\s*([^}]+)\}/);
        if (indicesMatch) {
            const indexData = indicesMatch[1].split(',').map(v => parseInt(v.trim()));
            
            // In FBX, negative indices mark the end of a polygon
            let currentPoly: number[] = [];
            for (const idx of indexData) {
                if (idx < 0) {
                    // End of polygon marker (index is -(realIndex + 1))
                    currentPoly.push(-(idx + 1));
                    
                    // Triangulate polygon
                    if (currentPoly.length >= 3) {
                        for (let i = 1; i < currentPoly.length - 1; i++) {
                            const v0 = vertices[currentPoly[0]];
                            const v1 = vertices[currentPoly[i]];
                            const v2 = vertices[currentPoly[i + 1]];
                            
                            if (v0 && v1 && v2) {
                                mesh.addTriangle(new Triangle(v0, v1, v2));
                            }
                        }
                    }
                    currentPoly = [];
                } else {
                    currentPoly.push(idx);
                }
            }
        }

        console.log(`✓ Parsed FBX: ${mesh.toString()}`);
        return mesh;
    }

    /**
     * Extract mesh name from URL
     */
    private static extractName(url: string): string {
        const parts = url.split('/');
        const filename = parts[parts.length - 1];
        return filename.replace(/\.(fbx|FBX)$/, '');
    }
}
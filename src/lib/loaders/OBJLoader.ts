import { Vector3 } from "math.gl";
import { Triangle } from "../Primitives/Triangle";
import { Mesh } from "../Primitives/Mesh";

/**
 * OBJ File Loader
 */
export class OBJLoader {
    /**
     * Parse OBJ file content (synchronous)
     * Use this after loading the file content yourself
     * @param content - OBJ file content as string
     * @param name - Name for the mesh
     * @returns Mesh object
     */
    public static parse(content: string, name: string = "mesh"): Mesh {
        const lines = content.split('\n');
        const vertices: Vector3[] = [];
        const normals: Vector3[] = [];
        const faces: Array<{ vertexIndices: number[] }> = [];
        const mesh = new Mesh(name);

        for (const line of lines) {
            const trimmed = line.trim();
            
            // Skip empty lines and comments
            if (!trimmed || trimmed.startsWith('#')) continue;

            const parts = trimmed.split(/\s+/);
            const command = parts[0];

            switch (command) {
                case 'v': {
                    // Vertex position
                    const x = parseFloat(parts[1]);
                    const y = parseFloat(parts[2]);
                    const z = parseFloat(parts[3]);
                    if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
                        vertices.push(new Vector3(x, y, z));
                    }
                    break;
                }

                case 'vn': {
                    // Vertex normal (we'll recalculate, but store for reference)
                    const x = parseFloat(parts[1]);
                    const y = parseFloat(parts[2]);
                    const z = parseFloat(parts[3]);
                    if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
                        normals.push(new Vector3(x, y, z).normalize());
                    }
                    break;
                }

                case 'f': {
                    // Face (polygon) - supports formats: f v1 v2 v3 or f v1/vt1/vn1 v2/vt2/vn2 v3/vt3/vn3
                    const faceVertices: number[] = [];

                    for (let i = 1; i < parts.length; i++) {
                        const vertexData = parts[i].split('/');
                        const vertexIndex = parseInt(vertexData[0]) - 1; // OBJ indices are 1-based
                        
                        if (!isNaN(vertexIndex) && vertexIndex >= 0 && vertexIndex < vertices.length) {
                            faceVertices.push(vertexIndex);
                        }
                    }

                    if (faceVertices.length >= 3) {
                        faces.push({ vertexIndices: faceVertices });
                    }
                    break;
                }
            }
        }

        // Convert faces to triangles (triangulate quads and n-gons using fan triangulation)
        for (const face of faces) {
            const indices = face.vertexIndices;

            // Fan triangulation: split from first vertex
            for (let i = 1; i < indices.length - 1; i++) {
                const v0 = vertices[indices[0]];
                const v1 = vertices[indices[i]];
                const v2 = vertices[indices[i + 1]];

                if (v0 && v1 && v2) {
                    mesh.addTriangle(new Triangle(v0, v1, v2));
                }
            }
        }

        console.log(`✓ Parsed OBJ: ${mesh.toString()}`);
        return mesh;
    }

    /**
     * Extract mesh name from URL
     */
    private static extractName(url: string): string {
        const parts = url.split('/');
        const filename = parts[parts.length - 1];
        return filename.replace(/\.(obj|OBJ)$/, '');
    }
}
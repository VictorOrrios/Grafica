import { Vector3 } from "math.gl";
import { Triangle } from "./Triangle";

/**
 * Mesh - A collection of triangles representing a 3D model
 */
export class Mesh {
    public triangles: Triangle[] = [];
    public name: string;

    constructor(name: string = "mesh") {
        this.name = name;
    }

    /**
     * Add a triangle to the mesh
     */
    public addTriangle(triangle: Triangle): void {
        this.triangles.push(triangle);
    }

    /**
     * Get all triangles
     */
    public getTriangles(): Triangle[] {
        return this.triangles;
    }

    /**
     * Get triangle count
     */
    public getTriangleCount(): number {
        return this.triangles.length;
    }

    /**
     * Transform all triangles (translate)
     */
    public translate(offset: Vector3): void {
        this.triangles = this.triangles.map(tri => 
            new Triangle(
                tri.v0.clone().add(offset),
                tri.v1.clone().add(offset),
                tri.v2.clone().add(offset)
            )
        );
    }

    /**
     * Transform all triangles (scale)
     */
    public scale(scale: Vector3): void {
        this.triangles = this.triangles.map(tri => 
            new Triangle(
                tri.v0.clone().multiply(scale),
                tri.v1.clone().multiply(scale),
                tri.v2.clone().multiply(scale)
            )
        );
    }

    public toString(): string {
        return `Mesh(${this.name}): ${this.triangles.length} triangles`;
    }
}

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

    // To be implemented in project 2
}

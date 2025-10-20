import {
    Vector3
} from '@math.gl/core';

export class Plane {
    public normal: Vector3;
    public distance: number;
    constructor(
        normal: Vector3,
        distance: number
    ) {
        this.normal = normal;
        this.distance = distance;
    }

    public serialize():Float32Array{
        return new Float32Array([
            this.normal.x, this.normal.y, this.normal.z,
            this.distance
        ]);
    }

    public toString() : string {
        return 'normal:' + this.normal.toString() + 
                ' distance:' + this.distance.toString();
    }
}
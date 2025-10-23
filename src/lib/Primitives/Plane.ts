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

    public serialize(materialIndex:number):Float32Array{
        const ret = new Float32Array([
            this.normal.x, this.normal.y, this.normal.z,this.distance,
            0, 0, 0, 0
        ]);

        // Bitwise cast of materialIndex
        (new Int32Array(ret.buffer))[4] = materialIndex;

        return ret;
    }

    public toString() : string {
        return 'normal:' + this.normal.toString() + 
                ' distance:' + this.distance.toString();
    }
}
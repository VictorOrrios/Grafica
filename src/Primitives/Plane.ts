import {
    Vector3
} from '@math.gl/core';

export class Plane {
    public point: Vector3;
    public normal: Vector3;
    constructor(
        point: Vector3,
        normal: Vector3
    ) {
        this.point = point;
        this.normal = normal;
    }

    public serialize():Float32Array{
        return new Float32Array([this.point.x, this.point.y, this.point.z,
            this.normal.x, this.normal.y, this.normal.z]);
    }

    public toString() : string {
        return 'point:'+this.point.toString() + 
                ' normal:' + this.normal.toString();
    }
}
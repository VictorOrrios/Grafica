import {Vector3} from '@math.gl/core';

export class Sphere{
    public center: Vector3; // UCS Point
    public radius: number;  // Sphere radius

    constructor(center: Vector3, radius: number){
        this.center = center;
        this.radius = radius;
    };

    public serialize(materialIndex:number):Float32Array{
        const ret = new Float32Array([
            this.center.x, this.center.y, this.center.z, this.radius,
            0, 0, 0, 0
        ]);

        // Bitwise cast of materialIndex
        (new Int32Array(ret.buffer))[4] = materialIndex;

        return ret;
    }

    public toString() : string {
        return 'center:'+this.center.toString() + 
                ' radius:' + this.radius.toString();
    }
};

import {Vector3} from '@math.gl/core';

export class Sphere{
    public center: Vector3; // UCS Point
    public radius: number;  // Sphere radius
    public north: Vector3 = new Vector3(0.0,1.0,0.0);
    public ecuator: Vector3 = new Vector3(0.0,0.0,1.0);

    constructor(center: Vector3, radius: number,
        north?:Vector3, ecuator?:Vector3
    ){
        this.center = center;
        this.radius = radius;
        if(north !== undefined) this.north = north;
        if(ecuator !== undefined) this.ecuator = ecuator;
    };

    public serialize(materialIndex:number):Float32Array{
        const ret = new Float32Array([
            this.center.x, this.center.y, this.center.z, this.radius,
            0, 0, 0, 0,
            this.north.x, this.north.y, this.north.z, 0,
            this.ecuator.x, this.ecuator.y, this.ecuator.z, 0,
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

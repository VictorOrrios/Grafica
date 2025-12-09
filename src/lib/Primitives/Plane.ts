import {
    Vector3, Vector2
} from '@math.gl/core';

export class Plane {
    public normal: Vector3;
    public distance: number;
    public tiling_size: number = 1.0;
    public tiling_offset:Vector2 = new Vector2(0.0,0.0);

    constructor(
        normal: Vector3,
        distance: number,
        tiling_size:number = 1.0,
        tiling_offset?:Vector2
    ) {
        this.normal = normal;
        this.distance = distance;
        this.tiling_size = tiling_size;
        if(tiling_offset !== undefined){
            this.tiling_offset = tiling_offset;
        }
    }

    public serialize(materialIndex: number): Float32Array {
        const ret = new Float32Array([
            this.normal.x, this.normal.y, this.normal.z, this.distance,
            this.tiling_offset.x,this.tiling_offset.y,this.tiling_size, materialIndex,
        ]);


        return ret;
    }

    public toString(): string {
        return 'normal:' + this.normal.toString() +
            ' distance:' + this.distance.toString();
    }
}
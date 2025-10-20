import {
    Vector3
} from '@math.gl/core';
import { Triangle } from './Triangle';

export class Quad {
    public t1: Triangle;
    public t2: Triangle;

    // Must be defined in clockwise direction
    constructor(
        v0: Vector3,
        v1: Vector3,
        v2: Vector3,
        v3: Vector3,
    ) {
        this.t1 = new Triangle(v0,v1,v2);
        this.t2 = new Triangle(v0,v2,v3);
    }

    public serialize(material:number): Float32Array {
        return Float32Array.of(...this.t1.serialize(), material, 
        ...this.t2.serialize(), material);
    }

    public toString(): string {
        return 't1:' + this.t1.toString() + 
                ' t2:' + this.t2.toString();
    }
}

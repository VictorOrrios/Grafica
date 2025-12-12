import {
    Vector2,
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
        this.t2 = new Triangle(v0,v2,v3,
                    new Vector2(0.0,0.0),
                    new Vector2(1.0,1.0),
                    new Vector2(1.0,0.0),);
    }

    public serialize(material:number): Float32Array {
        const t1 = this.t1.serialize(material);
        const t2 = this.t2.serialize(material);
        const ret = new Float32Array(t1.length + t2.length);
        ret.set(t1, 0);
        ret.set(t2, t1.length);
        return ret;
    }

    public toString(): string {
        return 't1:' + this.t1.toString() + 
                ' t2:' + this.t2.toString();
    }
}

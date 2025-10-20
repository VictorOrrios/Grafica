import {
    Vector3
} from '@math.gl/core';

export class Triangle {
    public v0: Vector3;
    public v1: Vector3;
    public v2: Vector3;
    public normal: Vector3;

    constructor(
        v0: Vector3,
        v1: Vector3,
        v2: Vector3
    ) {
        this.v0 = v0;
        this.v1 = v1;
        this.v2 = v2;
        this.normal = this.getNormal();
    }

    public serialize(): Float32Array {
        return new Float32Array([
            this.v0.x, this.v0.y, this.v0.z,
            this.v1.x, this.v1.y, this.v1.z,
            this.v2.x, this.v2.y, this.v2.z,
            this.normal.x, this.normal.y, this.normal.z
        ]);
    }

    private getNormal(): Vector3 {
        const edge1 = new Vector3(this.v1).subtract(this.v0);
        const edge2 = new Vector3(this.v2).subtract(this.v0);
        return edge1.cross(edge2).normalize();
    }

    public toString(): string {
        return 'v0:' + this.v0.toString() + 
                ' v1:' + this.v1.toString() +
                ' v2:' + this.v2.toString() + 
                ' normal:' + this.normal.toString();
    }
}

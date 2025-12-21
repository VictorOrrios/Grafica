import {
    Vector2,
    Vector3
} from '@math.gl/core';

export class Triangle {
    public v0: Vector3;
    public v1: Vector3;
    public v2: Vector3;
    public normal: Vector3;
    public uv0: Vector2;
    public uv1: Vector2;
    public uv2: Vector2;
    public tangent: Vector3 = new Vector3(1.0,0.0,0.0);
    public bitangent: Vector3  = new Vector3(0.0,0.0,1.0);;


    constructor(
        v0: Vector3,
        v1: Vector3,
        v2: Vector3,
        uv0: Vector2 = new Vector2(0.0,0.0),
        uv1: Vector2 = new Vector2(0.0,1.0),
        uv2: Vector2 = new Vector2(1.0,1.0),
    ) {
        this.v0 = v0;
        this.v1 = v1;
        this.v2 = v2;
        this.normal = this.getNormal();
        this.uv0 = uv0;
        this.uv1 = uv1;
        this.uv2 = uv2;
        this.computeTangentBitangent();
    }

    public serialize(materialIndex:number): Float32Array {
        const ret = new Float32Array([
            this.v0.x, this.v0.y, this.v0.z, 0,
            this.v1.x, this.v1.y, this.v1.z, 0,
            this.v2.x, this.v2.y, this.v2.z, 0,
            this.normal.x, this.normal.y, this.normal.z, 0,
            this.tangent.x, this.tangent.y, this.tangent.z, 0,
            this.bitangent.x, this.bitangent.y, this.bitangent.z, 0,
            this.uv0.x,this.uv0.y,this.uv1.x,this.uv1.y,
            this.uv2.x,this.uv2.y,0,materialIndex,
        ]);


        return ret;
    }

    private getNormal(): Vector3 {
        const edge1 = new Vector3(this.v1).subtract(this.v0);
        const edge2 = new Vector3(this.v2).subtract(this.v0);
        return edge1.cross(edge2).normalize();
    }

    private computeTangentBitangent() {
        const p0 = this.v0;
        const p1 = this.v1;
        const p2 = this.v2;

        const uv0 = this.uv0;
        const uv1 = this.uv1;
        const uv2 = this.uv2;

        const edge1 = new Vector3(p1).subtract(p0);
        const edge2 = new Vector3(p2).subtract(p0);

        const dUV1 = new Vector2(uv1).subtract(uv0);
        const dUV2 = new Vector2(uv2).subtract(uv0);

        const f = 1.0 / (dUV1.x * dUV2.y - dUV2.x * dUV1.y);

        const tx = f * (dUV2.y * edge1.x - dUV1.y * edge2.x);
        const ty = f * (dUV2.y * edge1.y - dUV1.y * edge2.y);
        const tz = f * (dUV2.y * edge1.z - dUV1.y * edge2.z);

        const bx = f * (-dUV2.x * edge1.x + dUV1.x * edge2.x);
        const by = f * (-dUV2.x * edge1.y + dUV1.x * edge2.y);
        const bz = f * (-dUV2.x * edge1.z + dUV1.x * edge2.z);

        this.tangent   = new Vector3(tx, ty, tz).normalize();
        this.bitangent = new Vector3(bx, by, bz).normalize();

        //this.tangent.subtract(this.normal.clone().multiplyByScalar(this.tangent.clone().dot(this.normal)));
    }


    public toString(): string {
        return 'v0:' + this.v0.toString() + 
                ' v1:' + this.v1.toString() +
                ' v2:' + this.v2.toString() + 
                ' normal:' + this.normal.toString();
    }
}

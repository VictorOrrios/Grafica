import { Matrix4, Vector3 } from "math.gl";

export function createBaseMatrix(u:Vector3, v:Vector3, w:Vector3, o:Vector3):Matrix4 {
    return new Matrix4().set(
        u.x, u.y, u.z, 0,
        v.x, v.y, v.z, 0,
        w.x, w.y, w.z, 0,
        o.x, o.y, o.z, 1
    );
}

export function createViewMatrix(u:Vector3, v:Vector3, w:Vector3, o:Vector3):Matrix4 {
    return new Matrix4().set(
        u.x, u.y, u.z, o.x,
        v.x, v.y, v.z, o.y,
        w.x, w.y, w.z, o.z,
        0, 0, 0, 1
    );
}

// May move this later
export function printMatrix4(m: Matrix4) {
    const a = m.toArray();
    for (let i = 0; i < 4; i++) {
        console.log(a.slice(i * 4, i * 4 + 4));
    }
}

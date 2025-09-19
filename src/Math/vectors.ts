import { vec3 } from "gl-matrix";

export const v3 = vec3.create;

export function add(a:vec3,b:vec3):vec3{
    return vec3.add(v3(),a,b);
}

export function subtract(a:vec3,b:vec3):vec3{
    return vec3.subtract(v3(),a,b);
}

export function normalize(a:vec3):vec3{
    return vec3.normalize(v3(),a);
}
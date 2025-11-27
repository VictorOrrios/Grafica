import { Vector3 } from "math.gl";

// NOTE: change as desired
export const DEFAULT_COLOR: Vector3 = new Vector3(0.8, 0.8, 0.8);
export const DEFAULT_EMISSION: Vector3 = new Vector3(0, 0, 0);
export const DEFAULT_SPECULAR: Vector3 = new Vector3(0, 0, 0);
export const DEFAULT_SUBSURFACE_COLOR: Vector3 = new Vector3(0, 0, 0);

// NOTE: could be 0.0, set like this in case the corresponding THREE.js
// ior field is missing (and the material is dielectric)
export const DEFAULT_IOR: number = 1.5;

export enum NormalStrategy {
    INTERPOLATED = 0,
    GEOMETRIC = 1
}
import {Vector3} from '@math.gl/core';

export class Sphere{
    public center: Vector3; // UCS Point
    public axis: Vector3; // Direction from center
    public reference: Vector3;  // UCS Point
    public ecuatorDirection: Vector3;

    // Pre: center and axis are UCS coordinates, axis is a direction
    constructor(center: Vector3, axis: Vector3, reference: Vector3){
        this.center = center;
        this.axis = axis;
        this.reference = reference;

        let centerToReference:Vector3 = reference.clone().subtract(center);

        // Assert: mod(axis)/2 ~= |reference - center| => error =< 10^-6
        if (Math.abs(axis.len() / 2 - centerToReference.len())  > 1e-6){
            throw Error("Error while constructing sphere: Reference isn't at radius distance from the center: "
                        + center + ", " + axis + ", " + reference);
        }

        this.ecuatorDirection = axis.clone().cross(centerToReference.cross(axis)).normalize();
    };
    
    public toString() : string {
        return 'center:'+this.center.toString() + 
                ' axis:'+this.axis.toString() +
                ' reference:'+this.reference.toString() +
                ' ecuator:'+this.ecuatorDirection.toString();
    }
};

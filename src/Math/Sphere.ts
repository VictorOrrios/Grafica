import { vec3 } from "gl-matrix";
import { v3 } from "./vectors";

export class Sphere{
    public center: vec3; // UCS Point
    public axis: vec3; // Direction from center
    public reference: vec3;  // UCS Point
    public ecuatorDirection: vec3;

    // Pre: center and axis are UCS coordinates, axis is a direction
    constructor(center: vec3, axis: vec3, reference: vec3){
        this.center = center;
        this.axis = axis;
        this.reference = reference;
        
        // Assert: mod(axis)/2 ~= |reference - center| => error =< 10^-6
        if (vec3.length(axis) / 2 - subtract(reference, center) > 1e-6){
            throw Error("Error while constructing sphere: Reference isn't  at radius distance from the center " + center + ", " + axis + ", " + reference);
        }

        let directionToReferenceFromCenter = vec3.subtract(vec3.create(), center, reference);
        let aux = vec3.cross(v3(),directionToReferenceFromCenter,axis);
        this.ecuatorDirection = vec3.cross(vec3.create(),axis,aux);
    };
    
    public toString() : string {
        return 'center:'+this.center.toString() + 
                ' axis:'+this.axis.toString() +
                ' reference:'+this.reference.toString() +
                ' ecuator:'+this.ecuatorDirection.toString();
    }
};

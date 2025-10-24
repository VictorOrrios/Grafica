import type { Vector3 } from "math.gl";


export class PointLight {
    public position:Vector3;
    public color:Vector3;
    public power:number;

    constructor(position: Vector3, color: Vector3, power: number) {
        this.position = position;
        this.color = color;
        this.power = power;
    }

    public serialize(){
        return new Float32Array([
            this.color.x, this.color.y, this.color.z, this.power,
            this.position.x, this.position.y, this.position.z, 0
        ]);
    }
}
export class Station {
    public polar: number; // Angle in radians
    public azimuth: number; // Angle in radians

    constructor(polar: number, azimuth: number){
        this.polar = polar;
        this.azimuth = azimuth;
    }
}
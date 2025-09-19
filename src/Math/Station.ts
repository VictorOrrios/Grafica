import { Matrix4, Vector3 } from "math.gl";
import { Sphere } from "./Sphere";

export class Station {
    public polar: number; // Angle in radians
    public azimuth: number; // Angle in radians
    public planet: Sphere; // Sphere where the station is located

    public UCS_pos: Vector3; // Position in UCS coordinates

    private calculate_UCS_pos(): Vector3 {
        // To calculate the UCS position:
        // 1) Rotate (1, 0, 0) by azimuth around Z axis (Z axis = sphere axis)
        let z_rotated = new Vector3(1, 0, 0).rotateZ({radians: this.azimuth});
        // 2) Rotate z_rotated by polar around X axis (X axis = equator direction)
        let UCS_0_0_0_std_base = z_rotated.rotateX({radians: this.polar});
        // 3) Now, we perform the base change: from standard basis to (equatorDirection, normalizedOrtEquator, normalizedAxis)
        let normalizedAxis = this.planet.axis.clone().normalize();
        // We are multiplying two unit vectors, so the result is already normalized
        let normalizedOrtEquator = this.planet.ecuatorDirection.clone().cross(normalizedAxis);
        // 4) Now, we transform UCS_0_0_0_std_base to the new basis AND translate it to the center of the sphere
        const m = new Matrix4();
        m.set(this.planet.ecuatorDirection.x, normalizedOrtEquator.x, normalizedAxis.x, this.planet.center.x,
                this.planet.ecuatorDirection.y, normalizedOrtEquator.y, normalizedAxis.y, this.planet.center.y,
                this.planet.ecuatorDirection.z, normalizedOrtEquator.z, normalizedAxis.z, this.planet.center.z,
                0, 0, 0, 1
        )
        return UCS_0_0_0_std_base.transform(m);
    }

    constructor(polar: number, azimuth: number, planet: Sphere){
        this.polar = polar;
        this.azimuth = azimuth;
        this.planet = planet;

        // To calculate the position
        this.UCS_pos = this.calculate_UCS_pos();
    }
}
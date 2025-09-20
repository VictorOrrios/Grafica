import { Matrix4, Vector3, Matrix3 } from "math.gl";
import { Sphere } from "./Sphere";

export class Station {
    public polar: number; // Angle in radians
    public azimuth: number; // Angle in radians
    public planet: Sphere; // Sphere where the station is located

    public UCS_pos: Vector3; // Position in UCS coordinates
    public coord_sys: {
        normal: Vector3,
        long_tangent: Vector3,
        lat_tangent: Vector3
    }

    private calculate_UCS_pos(): Vector3 {
        // To calculate the UCS position:
        // 1) Rotate (0, 0, 1) by polar around X axis (X axis = ecuator direction)
        let x_rotated = new Vector3(0, 0, this.planet.radius).rotateX({radians: this.polar});
        // 2) Rotate x_rotated by azimuth around Z axis (Z axis = planet axis)
        let UCS_0_0_0_std_base = x_rotated.rotateZ({radians: this.azimuth});
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
        console.log(UCS_0_0_0_std_base.toString());
        return UCS_0_0_0_std_base.transform(m);
    }

    // Pre: this.UCS_pos is already calculated
    // Post: returns normalized basis for the current station
    private calculate_station_basis(): {
        normal: Vector3,
        long_tangent: Vector3,
        lat_tangent: Vector3
    } {
        // 1) To calculate the station basis:, we can first calculate the normal vector (which points from
        // the sphere/planet center to the station coordinates)
        let normal = this.UCS_pos.clone().subtract(this.planet.center);
        normal.normalize();
        // 2) Now, to calculate the longitude tangent vector, since we know it has to be
        // perpendicular to both the normal vector and the planet's axis, we compute the cross
        // product between these two
        // Thumb rule: axis = index finger, normal = middle finger, thumb will point to the positive increase of the azimuth
        let long_tangent = this.planet.axis.clone().cross(normal);
        long_tangent.normalize();
        // 3) Finally, to calculate the latitude tangent vector, we compute the cross product
        // between the normal and the long_tangent (no need to normalize again since both are already normalized)
        let lat_tangent = normal.clone().cross(long_tangent);
        return {
            normal, long_tangent, lat_tangent
        };
    }

    constructor(polar: number, azimuth: number, planet: Sphere){
        this.polar = polar;
        this.azimuth = azimuth;
        this.planet = planet;

        // To calculate the position
        this.UCS_pos = this.calculate_UCS_pos();
        this.coord_sys = this.calculate_station_basis();
    }

    public toString() : string {
        return 'UCS_position: '+this.UCS_pos.toString() + 
                ' coord_sys.normal: '+this.coord_sys.normal.toString() +
                ' coord_sys.long_tangent: '+this.coord_sys.long_tangent.toString() +
                ' coord_sys.lat_tangent: '+this.coord_sys.lat_tangent.toString();
    }
}
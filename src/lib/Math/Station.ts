import { Matrix4, Vector3, Matrix3 } from "math.gl";
import { Planet } from "./Planet";
import { createBaseMatrix, printMatrix4 } from "./Bases";

export type coordinate_system = {
    normal: Vector3,
    long_tangent: Vector3,
    lat_tangent: Vector3,
    base_matrix: Matrix4
};

export class Station {
    // 0º polar and 0º azymuth is +X (ecuator), +Polar goes to +Z (North Pole) and +Azymuth to +Y (East)
    public polar: number; // Angle in radians
    public azimuth: number; // Angle in radians
    public planet: Planet; // Sphere where the station is located

    public UCS_pos: Vector3; // Position in UCS coordinates
    public coord_sys:coordinate_system 


    private calculate_UCS_pos(): Vector3 {
        // To calculate the UCS position:
        // 1) Rotate (1, 0, 0) by polar around Y axis (X axis = ecuator direction)
        let UCS_0_0_0_std_base = new Vector3(this.planet.radius, 0, 0).rotateY({radians: -this.polar});
        // 2) Rotate again by azimuth around Z axis (Z axis = planet axis)
        UCS_0_0_0_std_base.rotateZ({radians: this.azimuth});
        // 3) Now, we perform the base change: from standard basis to (equatorDirection, normalizedOrtEquator, normalizedAxis)
        let normalizedAxis = this.planet.axis.clone().normalize();
        // We are multiplying two unit vectors, so the result is already normalized
        let normalizedOrtEquator = normalizedAxis.clone().cross(this.planet.ecuatorDirection);
        // 4) Now, we transform UCS_0_0_0_std_base to the new basis AND translate it to the center of the sphere
        const m = createBaseMatrix(this.planet.ecuatorDirection, normalizedOrtEquator, normalizedAxis, this.planet.center);
        
        return UCS_0_0_0_std_base.transform(m);
    }

    // Pre: this.UCS_pos is already calculated
    // Post: returns normalized basis for the current station
    private calculate_station_basis():coordinate_system {
        // 1) To calculate the station basis:, we can first calculate the normal vector (which points from
        // the sphere/planet center to the station coordinates)
        let normal = this.UCS_pos.clone().subtract(this.planet.center).normalize();
        // 2) Now, to calculate the longitude tangent vector, since we know it has to be
        // perpendicular to both the normal vector and the planet's axis, we compute the cross
        // product between these two
        let long_tangent = this.planet.axis.clone().cross(normal).normalize();
        // 3) To calculate the latitude tangent vector, we compute the cross product
        // between the normal and the long_tangent (no need to normalize again since both are already normalized)
        let lat_tangent = normal.clone().cross(long_tangent);
        // 4) Calculate the base matrix given the last three ortogonal vectors and the UCS coordinates
        let base_matrix = createBaseMatrix(long_tangent,lat_tangent,normal,this.UCS_pos);
        return {
            normal, long_tangent, lat_tangent, base_matrix:base_matrix
        };
    }

    constructor(polar: number, azimuth: number, planet: Planet){
        this.polar = polar;
        this.azimuth = azimuth;
        this.planet = planet;

        // To calculate the position
        this.UCS_pos = this.calculate_UCS_pos();
        this.coord_sys = this.calculate_station_basis();
    }

    public establishLink(destination:Station){
        // 1) Get the transformation matrix. 
        // We need to invert to get from UCS to local
        // Since we are transforming directions we must only use the rotation part of the matrix
        let outgoing_rot3_UCS_to_local = this.coord_sys.base_matrix.clone().invert().getRotationMatrix3();
        // 2) Get the UCS direction from the two UCS locations
        let outgoing_vector_UCS   = destination.UCS_pos.clone().subtract(this.UCS_pos).normalize();
        // 3) Transform the UCS direction to local using the matrix
        let outgoing_vector_local = outgoing_vector_UCS.clone().transformByMatrix3(outgoing_rot3_UCS_to_local);
        // 4) Output results
        console.log("Outgoing vector UCS system: ",outgoing_vector_UCS);
        console.log("Outgoing vector local system: ", outgoing_vector_local);
        // 5) -Z in local base means going into the planet so a check is done
        if(outgoing_vector_local.z < 0.0)
            console.warn("WARNING: outgoing vector may pass trough origin planet");

        // 6) Repeat from the destination to the origin
        let ingoing_rot3_UCS_to_local = destination.coord_sys.base_matrix.clone().invert().getRotationMatrix3();
        let ingoing_vector_UCS    = this.UCS_pos.clone().subtract(destination.UCS_pos).normalize();
        let ingoing_vector_local  = ingoing_vector_UCS.clone().transformByMatrix3(ingoing_rot3_UCS_to_local);
        console.log("Ingoing vector UCS system: ",ingoing_vector_UCS);
        console.log("Ingoing vector local system: ", ingoing_vector_local);
        if(ingoing_vector_local.z < 0.0)
            console.warn("WARNING: ingoing vector may pass trough destination planet");
    }

    public toString() : string {
        return 'UCS_position: '+this.UCS_pos.toString() + 
                ' coord_sys.normal: '+this.coord_sys.normal.toString() +
                ' coord_sys.long_tangent: '+this.coord_sys.long_tangent.toString() +
                ' coord_sys.lat_tangent: '+this.coord_sys.lat_tangent.toString();
    }
}
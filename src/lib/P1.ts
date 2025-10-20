import { Vector3 } from "math.gl";
import { Planet } from "./Math/Planet";
import { Station } from "./Math/Station";

try {
    const testPlanetBasic: Planet = new Planet(
        new Vector3(0.0, 0.0, 0.0),
        new Vector3(0.0, 0.0, 2.0),
        new Vector3(0.70710678, 0.0, 0.70710678),
    );
    console.log("Basic planet:", testPlanetBasic.toString());

    const testPlanetEdge: Planet = new Planet(
        new Vector3(0.0, 0.0, 0.0),
        new Vector3(0.0, 0.0, 2.0),
        new Vector3(0.9999999, 0.0, 0.0),
    );
    console.log("Edge planet:", testPlanetEdge.toString());

    const testPlanetIllegal: Planet = new Planet(
        new Vector3(0.0, 0.0, 0.0),
        new Vector3(0.0, 0.0, 2.0),
        new Vector3(0.999998, 0.0, 0.0),
    );
    console.log("Illegal planet:", testPlanetIllegal.toString());

} catch (err: any) {
    console.error(err);
}

// P1, stations
try {
    // Station testing
    const testPlanetStation1: Planet = new Planet(
        new Vector3(0.0, 0.0, 0.0),
        new Vector3(0.0, 0.0, 2.0),
        new Vector3(0.0, 0.70710678, 0.70710678)
    );

    const testStation1: Station = new Station(
        Math.PI/4,  // 45 degrees
        Math.PI/4,  // 45 degrees
        testPlanetStation1
    );
    

    console.log('Test station planet (1):', testPlanetStation1.toString());
    console.log('Test station (1):', testStation1.toString());

    // Station testing
    const testPlanetStation2: Planet = new Planet(
        new Vector3(0.0, 10.0, 0.0),
        new Vector3(0.0, 0.0, 4.0),
        new Vector3(2.0, 10.0, 0.0)
    );

    const testStation2: Station = new Station(
        0,
        -Math.PI/2,  // -90 degrees
        testPlanetStation2
    );

    console.log('Test station planet (2):', testPlanetStation2.toString());
    console.log('Test station (2):', testStation2.toString());

    testStation1.establishLink(testStation2);
} catch(err: any) {
    console.error(err);
}
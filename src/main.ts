import { Renderer } from "./renderer";
import { Scene } from "./scene";
import { Planet } from './Math/Planet'
import { clamp, Vector3 } from "math.gl";
import { Station } from "./Math/Station";

const fpsDisplay = document.getElementById('fps');
const captureBtn = document.getElementById('capture');
const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const mouse = document.getElementById('mouse');

let needCapture: boolean = false;

let lastFrameTime = performance.now();
let frameCount = 0;
let fps = 0;

canvas.addEventListener('mousedown', (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    updateInfo(x, y);
    console.log(`Mouse down at (${x}, ${y})`);
    scene.camera.printViewMatrix();
});
canvas.addEventListener('mouseup', (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    updateInfo(x, y);
    console.log(`Mouse up at (${x}, ${y})`);
});
canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left)/canvas.width;
    const y = clamp((event.clientY - rect.top)/canvas.height,0.05,0.95);
    let azymuth = 2*x*Math.PI;
    let polar = y*Math.PI;
    //polar = Math.PI/2.0;
    //azymuth = 0;
    scene.camera.moveTo(azymuth,polar);
    updateInfo(x, y);
});

if (captureBtn) {
    captureBtn.addEventListener('click', () => {
        needCapture = true;
    });
}

function updateInfo(x: number, y: number) {
    if (mouse) mouse.textContent = `Mouse Position: X: ${x}, Y: ${y}.`;
}

function updateFPS(time: number) {
    if (!fpsDisplay) return;

    frameCount++;

    if (time - lastFrameTime >= 1000) {
        fps = frameCount;
        frameCount = 0;
        lastFrameTime = time;
        fpsDisplay.textContent = `${fps}`;
    }
}


function saveScreenshot() {
    if (!canvas) return;

    canvas.toBlob((blob) => {
        if (!blob) {
            alert("Error generating screenshot.");
            return;
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `screenshot_${Date.now()}.png`;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(url);
    }, 'image/png');
}

// MAIN LOOP

/*
// P1, planets
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
*/

const gl = canvas.getContext("webgl2");
if (!gl) throw new Error("WebGL2 not supported");
const ext = gl.getExtension('EXT_color_buffer_float');
if (!ext) throw new Error('EXT_color_buffer_float not supported');

const scene = new Scene();
const renderer = new Renderer(gl, scene);
await renderer.initialize();
function loop(time: number) {
    renderer.render(time);
    if (needCapture) {
        saveScreenshot();
        needCapture = false;
    }
    updateFPS(time);
    requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

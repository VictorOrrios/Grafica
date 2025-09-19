import { Renderer } from "./renderer";
import { Scene } from "./scene";
import { Sphere } from './Math/Sphere'
import { Vector3 } from "math.gl";

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
});
canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    updateInfo(x, y);
});

if (captureBtn) {
    captureBtn.addEventListener('click', () => {
        needCapture = true;
    });
}

function updateInfo(x: number, y: number) {
    if (mouse) mouse.textContent = `Mouse Position: X: ${x}, Y: ${y}`;
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

// P1
try {
    const testPlanetBasic: Sphere = new Sphere(
        new Vector3(0.0, 0.0, 0.0),
        new Vector3(0.0, 0.0, 2.0),
        new Vector3(0.70710678, 0.0, 0.70710678),
    );
    console.log("Basic planet:", testPlanetBasic.toString());

    const testPlanetEdge: Sphere = new Sphere(
        new Vector3(0.0, 0.0, 0.0),
        new Vector3(0.0, 0.0, 2.0),
        new Vector3(0.9999999, 0.0, 0.0),
    );
    console.log("Edge planet:", testPlanetEdge.toString());

    const testPlanetIllegal: Sphere = new Sphere(
        new Vector3(0.0, 0.0, 0.0),
        new Vector3(0.0, 0.0, 2.0),
        new Vector3(0.999998, 0.0, 0.0),
    );
    console.log("Illegal planet:", testPlanetIllegal.toString());
} catch (err: any) {
    console.error(err);
}


const gl = canvas.getContext("webgl2");
if (!gl) throw new Error("WebGL2 not supported");

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

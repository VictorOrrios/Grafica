import { Renderer } from "./renderer.js";
import { Scene } from "./scene.js";

const fpsDisplay = document.getElementById('fps');
const captureBtn = document.getElementById('capture');
const canvas = document.getElementById("canvas") as HTMLCanvasElement;

let needCapture:boolean = false;

let lastFrameTime = performance.now();
let frameCount = 0;
let fps = 0;

function updateFPS(time:number) {
    if(!fpsDisplay) return;

    frameCount++;

    if (time - lastFrameTime >= 1000) {
        fps = frameCount;
        frameCount = 0;
        lastFrameTime = time;
        fpsDisplay.textContent = `${fps}`;
    }
}

if(captureBtn){
    captureBtn.addEventListener('click', () => { 
        needCapture=true; 
    });
}

function saveScreenshot(){
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


const gl = canvas.getContext("webgl2");
if (!gl) throw new Error("WebGL2 not supported");

const scene = new Scene();
const renderer = new Renderer(gl, scene);
await renderer.initialize();
function loop(time: number) {
    renderer.render(time);
    if(needCapture){
        saveScreenshot();
        needCapture = false;
    }
    updateFPS(time);
    requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

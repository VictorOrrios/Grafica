<script lang="ts">
    import { Renderer } from "$lib/renderer";
    import { Scene } from "$lib/scene";
    import { Planet } from '$lib/Math/Planet'
    import { clamp, Vector3 } from "math.gl";
    import { Station } from "$lib/Math/Station";
    import { onMount } from "svelte";
    import { render } from "svelte/server";

    const scene = new Scene();
    let renderer:Renderer;

    let canvas !: HTMLCanvasElement;

    let needCapture: boolean = false;

    let listenToMove: boolean = true;

    let lastFrameTime = performance.now();
    let frameCount = 0;
    let fps = $state(0);

    let stopRendering:boolean = $state(false);

    function mousedown(event:any){
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        console.log(`Mouse down at (${x}, ${y})`);
        listenToMove = !listenToMove;
    }

    function wheel(event:any){
        scene.camera.radius += event.deltaY/1000;
        if(scene.camera.radius <= 0) scene.camera.radius = 0.01;
        scene.camera.tick();
        renderer.resetFrameAcummulation();
    }

    function mousemove(event:any){
        if(!listenToMove) return;
        const rect = canvas.getBoundingClientRect();
        const x = (event.clientX - rect.left)/canvas.width;
        const y = clamp((event.clientY - rect.top)/canvas.height,0.05,0.95);
        let azymuth = 4*x*Math.PI;
        let polar = y*Math.PI;
        //polar = Math.PI/2.0;
        //azymuth = 0;
        scene.camera.moveTo(azymuth,polar);
        renderer.resetFrameAcummulation();
    }

    function updateFPS(time: number) {
        frameCount++;
        if (time - lastFrameTime >= 1000) {
            fps = frameCount;
            frameCount = 0;
            lastFrameTime = time;
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
    onMount(async () => {
        const mouse = document.getElementById('mouse');
        canvas.addEventListener('mousedown', (e) => mousedown(e));
        canvas.addEventListener('wheel', (e) => wheel(e));
        canvas.addEventListener('mousemove', (e) => mousemove(e));

        const gl = canvas.getContext("webgl2");
        if (!gl) throw new Error("WebGL2 not supported");
        const ext = gl.getExtension('EXT_color_buffer_float');
        if (!ext) throw new Error('EXT_color_buffer_float not supported');

        await scene.loadMeshes();
        renderer = new Renderer(gl, scene);

        await renderer.initialize();
        function loop(time: number) {
            if(stopRendering) return;
            renderer.render(time);
            if (needCapture) {
                saveScreenshot();
                needCapture = false;
            }
            updateFPS(time);
            requestAnimationFrame(loop);
        }
        requestAnimationFrame(loop);
    })

</script>

<div class="main w-screem h-screen">
	<div id="controls">

		<button onclick={() => {needCapture = true;}}>Capture PNG</button>
		<button onclick={() => {stopRendering = true;}}>STOP</button>
		FPS: {fps}
	</div>
	<canvas id="canvas" width="854" height="480" bind:this={canvas}></canvas>

</div>

<style>
    canvas {
        display: block;
        border: 1px solid #333;
        margin-top: 10px;
    }

    button {
        border: 1px solid white;
        
    }

    .main {
        margin: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        background: #111;
        color: white;
    }

    #controls {
        margin: 10px;
    }
</style>

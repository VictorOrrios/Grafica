<script lang="ts">
    import { Renderer } from "$lib/renderer";
    import { Scene } from "$lib/scene";
    import { Planet } from "$lib/Math/Planet";
    import { clamp, Vector3 } from "math.gl";
    import { Station } from "$lib/Math/Station";
    import { onMount } from "svelte";
    import { render } from "svelte/server";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import * as Select from "$lib/components/ui/select/index.js";
    import {
        Card,
        CardContent,
        CardHeader,
        CardTitle,
    } from "$lib/components/ui/card";
    import { Separator } from "$lib/components/ui/separator";
    import { Switch } from "$lib/components/ui/switch/index.js";
    import { Button } from "$lib/components/ui/button/index.js";

    let scene = new Scene();
    let renderer: Renderer;
    let rendererStarted: boolean = false;

    let canvas!: HTMLCanvasElement;

    let needCapture: boolean = false;

    let listenToMove: boolean = true;

    let lastFrameTime = performance.now();
    let frameCount = 0;

    let stopRendering: boolean = $state(false);

    let fps = $state(0);

    let samplesPerPixel = $state(5);
    let meanBounces = $state(5);
    let russianRoulette = $derived(1 - 1 / meanBounces);
    let frame_acummulation: boolean = $state(true);

    $effect(() => {
        samplesPerPixel;
        russianRoulette;
        frame_acummulation;
        if (!rendererStarted) return;
        renderer.spp = samplesPerPixel;
        renderer.rr_chance = russianRoulette;
        renderer.resetFrameAcummulation();
        if (renderer.frame_acummulation_on !== frame_acummulation) {
            renderer.setFrameAcummulation(frame_acummulation);
        }
    });

    function mousedown(event: any) {
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        console.log(`Mouse down at (${x}, ${y})`);
        listenToMove = !listenToMove;
    }

    function wheel(event: any) {
        scene.camera.radius += event.deltaY / 1000;
        if (scene.camera.radius <= 0) scene.camera.radius = 0.01;
        scene.camera.tick();
        renderer.resetFrameAcummulation();
    }

    function mousemove(event: any) {
        if (!listenToMove) return;
        const rect = canvas.getBoundingClientRect();
        const x = (event.clientX - rect.left) / canvas.width;
        const y = clamp((event.clientY - rect.top) / canvas.height, 0.05, 0.95);
        let azymuth = 4 * x * Math.PI;
        let polar = y * Math.PI;
        //polar = Math.PI/2.0;
        //azymuth = 0;
        scene.camera.moveTo(azymuth, polar);
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
            const link = document.createElement("a");
            link.href = url;
            link.download = `screenshot_${Date.now()}.png`;

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            URL.revokeObjectURL(url);
        }, "image/png");
    }

    async function setUpMain() {
        lastFrameTime = performance.now();
        frameCount = 0;

        const gl = canvas.getContext("webgl2");
        if (!gl) throw new Error("WebGL2 not supported");
        const ext = gl.getExtension("EXT_color_buffer_float");
        if (!ext) throw new Error("EXT_color_buffer_float not supported");

        if (scene.hasMeshes) {
            await scene.loadMeshes();
            scene.finalizeScene();
        }
        renderer = new Renderer(gl, scene);

        await renderer.initialize();
        rendererStarted = true;
        function loop(time: number) {
            if (stopRendering) return;
            renderer.render(time);
            if (needCapture) {
                saveScreenshot();
                needCapture = false;
            }
            updateFPS(time);
            requestAnimationFrame(loop);
        }
        requestAnimationFrame(loop);
    }

    // MAIN LOOP
    onMount(async () => {
        canvas.addEventListener("mousedown", (e) => mousedown(e));
        canvas.addEventListener("wheel", (e) => wheel(e));
        canvas.addEventListener("mousemove", (e) => mousemove(e));
        await setUpMain();
    });
</script>

<div class="main w-screem h-screen">

    <canvas id="canvas" width="854" height="480" bind:this={canvas}></canvas>

    <div class="flex gap-8">
        <Card class="max-w-md mx-auto mt-10">
            <CardHeader>
                <CardTitle>Render Control Panel</CardTitle>
            </CardHeader>

            <CardContent class="space-y-6">
                <Label>Actions</Label>
                <div class="space-y-2 flex justify-between">
                    <Button
                        onclick={() => {
                            needCapture = true;
                        }}>Capture PNG</Button
                    >
                    <Button
                        onclick={() => {
                            stopRendering = true;
                        }}>Stop</Button
                    >
                </div>

                <!-- Samples per pixel -->
                <div class="space-y-2">
                    <Label for="spp">Samples per pixel</Label>
                    <Input
                        id="spp"
                        type="number"
                        min="1"
                        step="1"
                        bind:value={samplesPerPixel}
                    />
                </div>

                <!-- Russian roulette chance -->
                <div class="space-y-2">
                    <Label for="rr">Mean bounces</Label>
                    <Input id="rr" type="number" min="1" bind:value={meanBounces} />
                </div>

                <!-- Frame acummulation toggle -->
                <div class="space-y-2">
                    <Label>Frame acummulation</Label>
                    <Switch bind:checked={frame_acummulation} />
                </div>

                <Separator />

                <!-- Debug -->
                <div class="text-sm text-muted-foreground">
                    <p><strong>SPP:</strong> {samplesPerPixel}</p>
                    <p>
                        <strong>Rusian roulette chance:</strong>
                        {Math.floor(russianRoulette * 1000) / 1000}
                    </p>
                    <p><strong>Frame acummulation:</strong> {frame_acummulation}</p>
                </div>
            </CardContent>
        </Card>
        <Card class="max-w-md mx-auto w-30 mt-10">
            <CardHeader>
                <CardTitle>Metrics</CardTitle>
            </CardHeader>

            <CardContent class="space-y-6">
                <Label>FPS: {fps}</Label>
                
            </CardContent>
        </Card>
    </div>
</div>

<style>
    canvas {
        display: block;
        border: 1px solid #333;
        margin-top: 10px;
    }

    .main {
        margin: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        background: #111;
        color: white;
    }

</style>

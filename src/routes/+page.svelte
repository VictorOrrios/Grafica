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
    import { Slider } from "$lib/components/ui/slider/index.js";

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

    let range_thing: boolean = $state(false);
    let range_slider_ini: number = $state(0.0);
    let range_numbers_ini: number = $derived(range_thing? range_slider_ini : 0.0);
    let range_input: number = $state(0.1);
    let range_size: number = $derived(range_thing? range_input : 100000.0);
    let kernel_sigma_input:number = $state(0.0);
    let kernel_sigma:number = $derived(range_thing? kernel_sigma_input : 0.0);

    let focal_distance:number = $state(1.0);
    let aperture_radius:number = $state(0.0);

    $effect(() => {
        samplesPerPixel;russianRoulette;frame_acummulation;
        range_size;range_numbers_ini;kernel_sigma;
        focal_distance;aperture_radius;
        if (!rendererStarted) return;

        let range_numbers_fix = [range_numbers_ini,range_size+range_numbers_ini];

        if (renderer.frame_acummulation_on !== frame_acummulation
            || renderer.rr_chance !== russianRoulette
            || renderer.range_numbers[0] !== range_numbers_fix[0]
            || renderer.range_numbers[1] !== range_numbers_fix[1]
            || renderer.kernel_sigma !== kernel_sigma
            || renderer.aperture_radius !== aperture_radius
            || renderer.focal_distance !== focal_distance
        ) {
            renderer.resetFrameAcummulation();
        }

        renderer.spp = Math.max(samplesPerPixel,1);
        renderer.rr_chance = Math.max(russianRoulette,0.0);
        renderer.frame_acummulation_on = frame_acummulation;
        renderer.range_numbers[0] = range_numbers_fix[0];
        renderer.range_numbers[1] = range_numbers_fix[1];
        renderer.kernel_sigma = kernel_sigma;
        renderer.aperture_radius = aperture_radius;
        renderer.focal_distance = focal_distance;
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
            link.download = `
            ${Date.now()}
            ${fps}fps
            ${renderer.frame_acummulation_on?"TAA":""}
            ${renderer.spp}spp
            ${Math.floor(russianRoulette * 1000) / 1000}rr
            .png`;

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

        await scene.setupScene();
        
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

    function animateRange(time:number){
        range_slider_ini += 0.01;
        if(range_slider_ini<5.0 || range_slider_ini>15.0) range_slider_ini = 5.0;
        requestAnimationFrame(animateRange)
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

    <div class="w-full h-full flex gap-8 p-4">
        <canvas id="canvas" width="1000" height="1000" bind:this={canvas}></canvas>

        <Card class="max-w-md w-70">
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

                <!-- Thin lense -->
                <div class="space-y-2">
                    <Label>Thin lense</Label>
                    <div class="flex items-center gap-2">
                        <p class="text-md text-muted-foreground italic">f</p> 
                        <Input id="aperture" class="w-30" type="number" min="0" step="0.001" bind:value={aperture_radius}/>
                        <Slider type="single" bind:value={focal_distance} 
                        max={20.0} min={0.1} step={0.1} />
                    </div>
                </div>

                <!-- Range thing toggle -->
                <div class="space-y-2">
                    <Label>Transient options</Label>
                    <div class="text-sm {range_thing?'':'text-muted-foreground'} flex justify-between">
                        <p>Activate</p> 
                        <p>Offset</p>
                    </div>
                    <div class="flex items-center gap-2">
                        <Switch bind:checked={range_thing} /> 
                        <Slider type="single" bind:value={range_slider_ini} 
                        disabled={!range_thing}
                        max={20.0} step={0.1} />
                    </div>
                    <div class="flex items-center gap-2 text-sm {range_thing?'':'text-muted-foreground'}">
                        <p>Range</p> 
                        <Input id="rangesize" type="number" min="0" step="0.01" bind:value={range_input} disabled={!range_thing}/>
                    </div>
                    <div class="flex items-center gap-2 text-sm {range_thing?'':'text-muted-foreground'}">
                        <p>Sigma</p>
                        <Input id="kernelsigma" type="number" min="0" step="0.01" bind:value={kernel_sigma_input} disabled={!range_thing}/>
                    </div>
                    
                </div>



                
            </CardContent>
        </Card>
        <Card class="max-w-md w-70">
            <CardHeader>
                <CardTitle>Render info</CardTitle>
            </CardHeader>

            <CardContent class="space-y-6">
                <div class="text-sm text-muted-foreground">
                    <p><strong>FPS:</strong> {fps}</p>
                    <p><strong>SPP:</strong> {samplesPerPixel}</p>
                    <p>
                        <strong>Rusian roulette chance:</strong>
                        {Math.floor(russianRoulette * 1000) / 1000}
                    </p>
                    <p><strong>Frame acummulation:</strong> {frame_acummulation}</p>
                    <p><strong>Aperture radius:</strong> {aperture_radius}</p>
                    <p><strong>Focal distance:</strong> {focal_distance}</p>
                    <p><strong>Ray range:</strong> 
                        {Math.floor(range_numbers_ini * 1000) / 1000},
                        {Math.floor((range_size+range_numbers_ini) * 1000) / 1000}
                    </p>
                    <p><strong>Kernel sigma:</strong> {kernel_sigma}</p>
                </div>
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

<script lang="ts">
    import { Renderer } from "$lib/renderer";
    import { Scene } from "$lib/scene";
    
    import { onMount } from "svelte";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import {
        Card,
        CardContent,
        CardHeader,
        CardTitle,
    } from "$lib/components/ui/card";
    import { Switch } from "$lib/components/ui/switch/index.js";
    import { Button } from "$lib/components/ui/button/index.js";
    import { Slider } from "$lib/components/ui/slider/index.js";
    import { Tween } from 'svelte/motion';
    import { cubicOut } from "svelte/easing";

    const { preset } = $props();

    let scene = new Scene(preset);
    let renderer: Renderer;
    let rendererStarted: boolean = false;

    let rafId:number;

    let canvas!: HTMLCanvasElement;

    let mousePos = new Tween({ x: 2.0*Math.PI, y: 0.5*Math.PI }, { duration: 200, easing: cubicOut });
    let needCapture: boolean = false;

    let listenToMove: boolean = true;
    let isDragging: boolean = false;

    let lastFrameTime = performance.now();
    let frameCount = 0;

    let stopRendering: boolean = $state(false);

    let fps = $state(0);

    let samplesPerPixel = $state(scene.iniP.ssp);
    let meanBounces = $state(scene.iniP.meanBounces);
    let russianRoulette = $derived(1 - 1 / meanBounces);
    let frame_acummulation: boolean = $state(scene.iniP.frame_acummulation);
    let fast_mode: boolean = $state(scene.iniP.fast_mode);

    let range_thing: boolean = $state(scene.iniP.range_thing);
    let range_slider_ini: number = $state(scene.iniP.range_slider_ini);
    let range_animation_ini: number = $state(scene.iniP.range_slider_ini);
    let range_animated:boolean = $state(false);
    let range_numbers_ini: number = $derived(range_thing? (range_animated? range_animation_ini: range_slider_ini) : 0.0);
    let range_input: number = $state(scene.iniP.range_input);
    let range_size: number = $derived(range_thing? range_input : 100000.0);
    let kernel_sigma_input:number = $state(scene.iniP.kernel_sigma_input);
    let kernel_sigma:number = $derived(range_thing? kernel_sigma_input : 0.0);

    let focal_distance:number = $state(scene.iniP.focal_distance);
    let aperture_radius:number = $state(scene.iniP.aperture_radius);

    $effect(() => {
        samplesPerPixel;russianRoulette;frame_acummulation;
        range_size;range_numbers_ini;kernel_sigma;
        focal_distance;aperture_radius;
        if (!rendererStarted) return;

        let range_numbers_fix = [range_numbers_ini,range_size+range_numbers_ini];

        if (renderer.frame_acummulation_on !== frame_acummulation
            || renderer.spp !== samplesPerPixel
            || renderer.rr_chance !== russianRoulette
            || renderer.range_numbers[0] !== range_numbers_fix[0]
            || renderer.range_numbers[1] !== range_numbers_fix[1]
            || renderer.kernel_sigma !== kernel_sigma
            || renderer.aperture_radius !== aperture_radius
            || renderer.focal_distance !== focal_distance
            || renderer.fast_mode_on !== fast_mode
        ) {
            renderer.resetFrameAcummulation();
        }

        updateRendererVariables();
    });

    function updatePageVariables(){
        samplesPerPixel = scene.iniP.ssp;
        meanBounces = scene.iniP.meanBounces;
        frame_acummulation = scene.iniP.frame_acummulation;
        fast_mode = scene.iniP.fast_mode;
        range_thing = scene.iniP.range_thing;
        range_slider_ini = scene.iniP.range_slider_ini;
        range_input = scene.iniP.range_input;
        kernel_sigma_input = scene.iniP.kernel_sigma_input;
        focal_distance = scene.iniP.focal_distance;
        aperture_radius = scene.iniP.aperture_radius;
    }

    function updateRendererVariables(){
        let range_numbers_fix = [range_numbers_ini,range_size+range_numbers_ini];
        renderer.spp = Math.max(samplesPerPixel,1);
        renderer.rr_chance = Math.min(Math.max(russianRoulette,0.0),1.0);
        renderer.frame_acummulation_on = frame_acummulation;
        renderer.range_numbers[0] = range_numbers_fix[0];
        renderer.range_numbers[1] = range_numbers_fix[1];
        renderer.kernel_sigma = kernel_sigma;
        renderer.aperture_radius = aperture_radius;
        renderer.focal_distance = focal_distance;
        renderer.fast_mode_on = fast_mode;
    }

    function mousedown(event: any) {
        isDragging = true;
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
    }

    function mouseup(event: MouseEvent) {
        isDragging = false;
    }

    function wheel(event: any) {
        scene.camera.radius += event.deltaY / 1000;
        if (scene.camera.radius <= 0) scene.camera.radius = 0.01;
        scene.camera.tick();
        renderer.resetFrameAcummulation();
    }

    function mousemove(event: any) {
        //if (!listenToMove) return;
        if (!isDragging) return;
        const rect = canvas.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.right;
        const y = Math.min(Math.max((event.clientY - rect.top) / rect.bottom,0.05),0.95);
        let azymuth:number = x * 4*Math.PI;
        let polar:number = y * Math.PI;
        mousePos.target = {x:azymuth,y:polar};
    }

    $effect(() => {
        mousePos.current;
        if(renderer && scene){
            scene.camera.moveTo(mousePos.current.x, mousePos.current.y);
            renderer.resetFrameAcummulation();
        }
    })


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

    function main_loop(time: number) {
        if (stopRendering) return;
        renderer.render(time);
        if (needCapture) {
            saveScreenshot();
            needCapture = false;
        }
        updateFPS(time);
        requestAnimationFrame(main_loop);
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
        updateRendererVariables();

        await renderer.initialize();
        rendererStarted = true;
        
        rafId = requestAnimationFrame(main_loop);
    }

    function sleep(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async function animateRange(){
        if(!range_animated) return;
        range_animation_ini += 0.1;
        if(range_animation_ini>30.0){
            range_animation_ini = scene.iniP.range_slider_ini;
            range_animated = false;
            return;
        }
        await sleep(100);
        requestAnimationFrame(animateRange)
    }

    // MAIN LOOP
    onMount(async () => {
        canvas.addEventListener("mousedown", (e) => mousedown(e));
        canvas.addEventListener("mouseup", (e) => mouseup(e));
        canvas.addEventListener("wheel", (e) => wheel(e));
        canvas.addEventListener("mousemove", (e) => mousemove(e));
        await setUpMain();
    });
</script>

<div class="main w-screem h-screen">

    <div class="w-full h-full flex gap-8 p-4">
        {#if fps <= 0}
            <div class="absolute m-20 text-4xl">
                LOADING...
            </div>
        {/if}

        <canvas id="canvas" width={scene.iniP.canvas_width} height={scene.iniP.canvas_height} bind:this={canvas}></canvas>

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
                            if(stopRendering){
                                rafId = requestAnimationFrame(main_loop);
                            }else{
                                cancelAnimationFrame(rafId);
                            }
                            stopRendering = !stopRendering;
                        }}>
                            {stopRendering?'Resume':'Pause'}
                        </Button
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
                <div class="space-y-2 flex gap-4">
                    <Label>Frame acummulation</Label>
                    <Switch bind:checked={frame_acummulation} />
                </div>

                <!-- Frame acummulation toggle -->
                <div class="space-y-2 flex gap-4">
                    <Label>Fast mode</Label>
                    <Switch bind:checked={fast_mode} />
                </div>

                <!-- Thin lense -->
                <div class="space-y-2">
                    <Label>Thin lense</Label>
                    <div class="flex items-center gap-2">
                        <p class="text-md text-muted-foreground italic">f</p> 
                        <Input id="aperture" class="w-30" type="number" min="0" step="0.005" bind:value={aperture_radius}/>
                        <Slider type="single" bind:value={focal_distance} 
                        max={30.0} min={0.1} step={0.1} />
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
                        max={30.0} step={0.1} />
                        <Button onclick={() => {
                            if(!range_animated){
                                range_animated = true;
                                range_animation_ini = scene.iniP.range_slider_ini;
                                animateRange();
                            }else{
                                range_slider_ini = range_animation_ini;
                                range_animated = false;
                            }
                            
                        }}>
                            {#if range_animated}
                                ●
                            {:else}
                                ▶
                            {/if}
                        </Button>
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

import { Matrix4, Vector3 } from "math.gl";
import { loadEXRImage } from "./loader";
import { Scene } from "./scene";

async function loadShaderSource(url: string): Promise<string> {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Could not load shader: " + url);
    return await response.text();
}

type buffer_locations = {
    time:WebGLUniformLocation,
    resolution:WebGLUniformLocation,
    spp:WebGLUniformLocation,
}

export class Renderer {
    private gl: WebGL2RenderingContext;
    private scene: Scene;
    private program!: WebGLProgram;
    private vao!: WebGLVertexArrayObject;
    private vertexShader!:WebGLShader;
    private fragmentShader!:WebGLShader;
    private camera_ubo!:WebGLBuffer;
    private buffLoc:buffer_locations;

    constructor(gl: WebGL2RenderingContext, scene: Scene) {
        this.gl = gl;
        this.scene = scene;
        this.buffLoc = {} as buffer_locations;
    }

    public async initialize() {
        this.program = await this.initShaders();
        this.gl.useProgram(this.program);
        this.initQuad();
        await this.initBuffers();
    }


    public async initShaders(): Promise<WebGLProgram> {
        const vertexSource = await loadShaderSource("./shaders/vertex.glsl");
        const fragmentSource = await loadShaderSource("./shaders/fragment.glsl");

        this.vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertexSource);
        this.fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, fragmentSource);

        const program = this.gl.createProgram()!;
        this.gl.attachShader(program, this.vertexShader);
        this.gl.attachShader(program, this.fragmentShader);
        this.gl.linkProgram(program);

        if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
            throw new Error("Error linking shaders: " + this.gl.getProgramInfoLog(program));
        }
        return program;
    }


    private createShader(type: number, source: string): WebGLShader {
        const shader = this.gl.createShader(type)!;
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            throw new Error("Error compiling shaders: " + this.gl.getShaderInfoLog(shader));
        }
        return shader;
    }


    private initQuad() {
        const gl = this.gl;
        this.vao = gl.createVertexArray()!;
        gl.bindVertexArray(this.vao);

        const vertices = new Float32Array([
            -1, -1, 1, -1, -1, 1,
            -1, 1, 1, -1, 1, 1
        ]);

        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

        let posLoc = gl.getAttribLocation(this.program, "a_position");
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
    }

    private async initBuffers() {
        this.initCamera();
        this.initUniforms();
        this.initSphereVector();
    }

    private initCamera(){
        const gl = this.gl;
        this.camera_ubo = gl.createBuffer();
        gl.bindBuffer(gl.UNIFORM_BUFFER, this.camera_ubo);
        // std140 is 16 BYTE aligned
        let data = new Float32Array(20);
        data.set(this.scene.camera.view_inv,0);
        data.set(this.scene.camera.position,16);
        data[19] = this.scene.camera.tan_fov;
        gl.bufferData(gl.UNIFORM_BUFFER, data, gl.STATIC_DRAW);
        // Link to binding point
        let blockIndex = gl.getUniformBlockIndex(this.program, "Camera");
        gl.uniformBlockBinding(this.program, blockIndex, 0);
        gl.bindBufferBase(gl.UNIFORM_BUFFER, 0, this.camera_ubo);
        const blockSize = gl.getActiveUniformBlockParameter(
            this.program, blockIndex, gl.UNIFORM_BLOCK_DATA_SIZE
        );
    }

    private initUniforms(){
        const gl = this.gl;

        let location;

        // Current time uniform
        location = gl.getUniformLocation(this.program, "time");
        if(location) this.buffLoc.time = location;

        // Resolution uniform buffer
        location = gl.getUniformLocation(this.program, "resolution");
        if(location) this.buffLoc.resolution = location;

        // Sample per pixel uniform buffer
        location = gl.getUniformLocation(this.program, "spp");
        if(location) this.buffLoc.spp = location;

        // Shape counts uniform buffers
        location = gl.getUniformLocation(this.program, "sphere_num");
        gl.uniform1i(location, this.scene.sphereVec.length);
        
    }    

    private initSphereVector(){
        const gl = this.gl;
        const sphereVec = gl.createTexture();
        const sphereData = this.scene.serializeSphereVec();
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, sphereVec);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        gl.texImage2D(
            gl.TEXTURE_2D,
            0,                        
            gl.R32F,    
            sphereData.length, 1,     // width = n, height = 1
            0,                        
            gl.RED,                  
            gl.FLOAT,                 
            sphereData                
        );

        let location = gl.getUniformLocation(this.program, "sphere_vector");
        if(!location) console.warn("sphere_vector location returned null");
        gl.uniform1i(location, 1);
    }

    // Used in P2, look at for reference in future upgrades
    private initImageBuffer(){
        const gl = this.gl;
        // Image download: https://polyhaven.com/a/little_paris_eiffel_tower
        //const image = await loadEXRImage("pisztyk_2k.exr",1.0)
        const image = {
            data:new Uint8Array(),
            width:0,
            height:0
        }

        let tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB8, image.width, image.height, 0, gl.RGB, gl.UNSIGNED_BYTE, image.data);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        let location = gl.getUniformLocation(this.program, "texture_buffer");
        if(!location) console.warn("getUniformLocation returned null at texture_buffer");
        gl.uniform1i(location, 0);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, tex);
    }

    private updateBuffers(time: number){
        const gl = this.gl;

        // Time buffer
        gl.uniform1f(this.buffLoc.time, time);

        // Resolution buffer
        gl.uniform3f(this.buffLoc.resolution, gl.canvas.width, gl.canvas.height, gl.canvas.width/gl.canvas.height);

        // Sample per pixel uniform buffer
        // TODO: Implement user controled parameter
        gl.uniform1f(this.buffLoc.spp, 1.0);

    }

    private updateCameraUBO(){
        const gl = this.gl;

        let data = new Float32Array(20);
        data.set(this.scene.camera.view_inv, 0);
        data.set(this.scene.camera.position, 16);
        data[19] = this.scene.camera.tan_fov;

        gl.bindBuffer(gl.UNIFORM_BUFFER, this.camera_ubo);
        gl.bufferSubData(gl.UNIFORM_BUFFER, 0, data);
    }

    public render(time: number) {
        const gl = this.gl;
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.useProgram(this.program);
        gl.bindVertexArray(this.vao);

        this.updateBuffers(time);

        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
}


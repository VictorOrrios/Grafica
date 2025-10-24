import { Matrix4, Vector3 } from "math.gl";
import { loadEXRImage } from "./loader";
import { Scene } from "./scene";
import vertexSource from "$lib/shaders/vertex.glsl"
import fragmentSource from "$lib/shaders/fragment.glsl"

export class Renderer {
    private gl: WebGL2RenderingContext;
    private scene: Scene;
    private program!: WebGLProgram;
    private vao!: WebGLVertexArrayObject;
    private vertexShader!:WebGLShader;
    private fragmentShader!:WebGLShader;
    private camera_ubo!:WebGLBuffer;
    private attachments:Map<string,WebGLUniformLocation> = new Map();

    private num_frames_rendered:number = 0;
    
    private num_frames_acummulated:number = 0;
    private last_frame!:WebGLTexture;

    constructor(gl: WebGL2RenderingContext, scene: Scene) {
        this.gl = gl;
        this.scene = scene;
    }

    public async initialize() {
        this.program = await this.initShaders();
        this.gl.useProgram(this.program);
        this.initQuad();
        await this.initBuffers();
    }

    public async initShaders(): Promise<WebGLProgram> {

        let fragmentModified = fragmentSource;
        fragmentModified = fragmentModified.replace("__NUM_MATERIALS__",this.scene.materialVec.length.toString())
        fragmentModified = fragmentModified.replace("__NUM_SPHERES__",this.scene.sphereVec.length.toString())
        fragmentModified = fragmentModified.replace("__NUM_PLANES__",this.scene.planeVec.length.toString())
        fragmentModified = fragmentModified.replace("__NUM_TRIANGLES__",this.scene.triangleVec.length.toString())
        fragmentModified = fragmentModified.replace("__NUM_POINT_LIGHTS__",this.scene.pointLightVec.length.toString())

        this.vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertexSource);
        this.fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, fragmentModified);

        const program = this.gl.createProgram()!;
        this.gl.attachShader(program, this.vertexShader);
        this.gl.attachShader(program, this.fragmentShader);
        this.gl.linkProgram(program);

        if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
            throw new Error("Error linking shaders: " + this.gl.getProgramInfoLog(program));
        }
        return program;
    }

    public resetFrameAcummulation(){
        this.num_frames_acummulated = 0;
        console.log("RESET");
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
        this.initFrameAcummulation();
        this.initStorageBuffers();
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

        this.attachments.set("time",this.initUniform("time",1))
        this.attachments.set("frame_count",this.initUniform("frame_count",2))
        this.attachments.set("resolution",this.initUniform("resolution",3))
        this.attachments.set("spp",this.initUniform("spp",2))
        this.attachments.set("frames_acummulated",this.initUniform("frames_acummulated",2));
        this.attachments.set("rr_chance",this.initUniform("rr_chance",1));

    }    

    private initUniform(name:string,type:number, value:any[] = [0]):WebGLUniformLocation{
        let location = this.gl.getUniformLocation(this.program, name);
        if(!location){
            console.warn(name,"location returned null");
            return 0 as WebGLUniformLocation;
        }
        switch(type){
            case 0: // int
                this.gl.uniform1i(location, value[0]);
                break;
            case 1: //float
                this.gl.uniform1f(location, value[0]);
                break;
            case 2: //uint
                this.gl.uniform1ui(location, value[0]);
                break;
            case 3: //vec3
                this.gl.uniform3f(location, value[0], value[1], value[2]);
                break;
            default: // int
                this.gl.uniform1i(location, value[0]);
                break;
        }
        return location
    }

    private initStorageBuffers(){
        const gl = this.gl;

        const data = this.scene.serializeStaticBlock();

        console.log(`Initializing static buffer storage:`,data);

        const sphereUBO = gl.createBuffer();
        gl.bindBuffer(gl.UNIFORM_BUFFER, sphereUBO);
        gl.bufferData(gl.UNIFORM_BUFFER, data, gl.DYNAMIC_DRAW);
        const blockIndex = gl.getUniformBlockIndex(this.program, 'StaticBlock');
        const bindingPoint = 1;
        gl.uniformBlockBinding(this.program, blockIndex, bindingPoint);
        gl.bindBufferBase(gl.UNIFORM_BUFFER, bindingPoint, sphereUBO);
        
    }

    private initTextureBuffer(name:string,data:Float32Array,index:number) {
        if(data.length === 0) return;
        const gl = this.gl;
        const storageVec = gl.createTexture();
        console.log(`Initializing storage buffer for ${name}:`,data);
        gl.activeTexture(gl.TEXTURE0+index);
        gl.bindTexture(gl.TEXTURE_2D, storageVec);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        gl.texImage2D(
            gl.TEXTURE_2D,
            0,                        
            gl.R32F,    
            data.length, 1,     // width = n, height = 1
            0,                        
            gl.RED,                  
            gl.FLOAT,                 
            data                
        );

        let location = gl.getUniformLocation(this.program, name);
        if(!location) console.warn(name,"location returned null");
        gl.uniform1i(location, index);
    }

    private initFrameAcummulation(){
        const gl = this.gl;

        this.last_frame = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.last_frame);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.canvas.width, gl.canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.bindTexture(gl.TEXTURE_2D, null);

        const loc = this.gl.getUniformLocation(this.program,"last_frame_buffer")
        if(loc){
            this.attachments.set("last_frame_buffer",loc)
        }else{
            throw new Error("Error while trying to find last_frame_buffer");
        }
    }

    // Used in P2, look at for reference in future upgrades
    private async initImageBuffer(){
        const gl = this.gl;
        // Image download: https://polyhaven.com/a/little_paris_eiffel_tower
        const image = await loadEXRImage("pisztyk_2k.exr",1.0)

        let tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB8, image.width, image.height, 0, gl.RGB, gl.UNSIGNED_BYTE, image.data);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        let location = gl.getUniformLocation(this.program, "skybox");
        if(!location) console.warn("getUniformLocation returned null at skybox");
        gl.uniform1i(location, 0);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, tex);
    }

    private getLocation(name:string):WebGLUniformLocation{
        const r = this.attachments.get(name);
        if(r) return r;
        else{
            throw new Error("Error while getting "+name+" attachment location")
        }
    }

    private updateBuffers(time: number){
        const gl = this.gl;

        // Time buffer
        gl.uniform1f(this.getLocation("time"), time);

        // Frame count buffer
        gl.uniform1ui(this.getLocation("frame_count"), this.num_frames_rendered);

        // Resolution buffer
        gl.uniform3f(this.getLocation("resolution"), gl.canvas.width, gl.canvas.height, gl.canvas.width/gl.canvas.height);

        // Sample per pixel uniform buffer
        // TODO: Implement user controled parameter+
        // TODO, change
        gl.uniform1ui(this.getLocation("spp"), 3);

        // Frame acummulation count buffer
        gl.uniform1ui(this.getLocation("frames_acummulated"), this.num_frames_acummulated);

        // Rusian roulette chance
        gl.uniform1f(this.getLocation("rr_chance"), 0.8);

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

    private updateFrameBuffer(){
        const gl = this.gl;

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.last_frame);
        gl.uniform1i(this.getLocation("last_frame_buffer"), 0);

    }

    public render(time: number) {
        const gl = this.gl;
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.useProgram(this.program);
        gl.bindVertexArray(this.vao);

        this.updateBuffers(time);
        this.updateCameraUBO();
        this.updateFrameBuffer();


        gl.drawArrays(gl.TRIANGLES, 0, 6);

        gl.bindTexture(gl.TEXTURE_2D, this.last_frame);
        gl.copyTexSubImage2D(
            gl.TEXTURE_2D,
            0,       // nivel mipmap
            0, 0,    // destino dentro de la textura
            0, 0,    // origen en el framebuffer
            this.gl.canvas.width,
            this.gl.canvas.height
        );
        gl.bindTexture(gl.TEXTURE_2D, null);


        this.num_frames_rendered++;
        this.num_frames_acummulated++;
    }
}


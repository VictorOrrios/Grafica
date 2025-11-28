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
    private vertexShader!: WebGLShader;
    private fragmentShader!: WebGLShader;
    private camera_ubo!: WebGLBuffer;
    private attachments: Map<string, WebGLUniformLocation> = new Map();

    public frame_acummulation_on: boolean = true;
    private num_frames_rendered: number = 0;

    private num_frames_acummulated: number = 0;
    private last_frame!: WebGLTexture;

    public spp: number = 3;
    public rr_chance: number = 0.666;
    public range_numbers: number[] = [0.0, 100000.0];
    public kernel_sigma: number = 0.0;
    public aperture_radius: number = 0.0;
    public focal_distance: number = 1.0;

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

        fragmentModified = fragmentModified.replace("__NUM_MATERIALS__", this.scene.materialVec.length.toString())
        fragmentModified = fragmentModified.replace("__NUM_SPHERES__", this.scene.sphereVec.length.toString())
        fragmentModified = fragmentModified.replace("__NUM_PLANES__", this.scene.planeVec.length.toString())
        fragmentModified = fragmentModified.replace("__NUM_TRIANGLES__", this.scene.triangleVec.length.toString())
        fragmentModified = fragmentModified.replace("__NUM_POINT_LIGHTS__", this.scene.pointLightVec.length.toString())
        fragmentModified = fragmentModified.replace("__NUM_MESHES__", this.scene.meshDataVec.length.toString())
        // console.log("Num meshes: " + this.scene.meshDataVec.length)

        // Add mesh data constants
        let totalPositions = 0;
        let totalNormals = 0;
        let totalUVs = 0;
        let totalTriangles = 0;
        let totalMaterials = 0;

        this.scene.meshDataVec.forEach(meshData => {
            // TODO, check if floor or ceil
            totalPositions += meshData.positions.length / 3; // Convert from float count to vertex count
            totalNormals += meshData.normals.length / 3;
            totalUVs += meshData.uvs.length / 2;
            totalTriangles += meshData.positionIndices.length / 3; // Convert from index count to triangle count
            totalMaterials += meshData.materials.length;
        });

        console.log("Total mesh data:");
        console.log("Positions:", totalPositions);
        console.log("Normals:", totalNormals);
        console.log("UVs:", totalUVs);
        console.log("Triangles:", totalTriangles);
        console.log("Materials:", totalMaterials);

        this.vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertexSource);
        this.fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, fragmentModified);

        const program = this.gl.createProgram()!;
        this.gl.attachShader(program, this.vertexShader);
        this.gl.attachShader(program, this.fragmentShader);
        this.gl.linkProgram(program);

        if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
            throw new Error("Error linking shaders: " + this.gl.getProgramInfoLog(program));
        }

        console.log("Info on vertex:" + this.gl.getShaderInfoLog(this.vertexShader));
        console.log("Info on fragment:" + this.gl.getShaderInfoLog(this.fragmentShader));
        console.log("Info on program:" + this.gl.getProgramInfoLog(program));


        return program;
    }

    public resetFrameAcummulation() {
        this.num_frames_acummulated = 0;
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
        //this.initSkyboxBuffer();
        this.initStorageBuffers();
        this.initStorageTextures();
    }

    private initCamera() {
        const gl = this.gl;
        this.camera_ubo = gl.createBuffer();
        gl.bindBuffer(gl.UNIFORM_BUFFER, this.camera_ubo);
        // std140 is 16 BYTE aligned
        let data = this.scene.camera.serialize(this.aperture_radius, this.focal_distance);
        gl.bufferData(gl.UNIFORM_BUFFER, data, gl.STATIC_DRAW);
        // Link to binding point
        let blockIndex = gl.getUniformBlockIndex(this.program, "Camera");
        gl.uniformBlockBinding(this.program, blockIndex, 0);
        gl.bindBufferBase(gl.UNIFORM_BUFFER, 0, this.camera_ubo);
        const blockSize = gl.getActiveUniformBlockParameter(
            this.program, blockIndex, gl.UNIFORM_BLOCK_DATA_SIZE
        );
    }

    private initUniforms() {

        this.initUniform("time", 1)
        this.initUniform("frame_count", 2)
        this.initUniform("resolution", 3)
        this.initUniform("spp", 2)
        this.initUniform("frames_acummulated", 2)
        this.initUniform("rr_chance", 1)
        this.initUniform("ray_range", 3)
        this.initUniform("kernel_sigma", 1)

    }

    private initUniform(name: string, type: number, value: any[] = [0]): WebGLUniformLocation {
        let location = this.gl.getUniformLocation(this.program, name);
        if (!location) {
            console.warn(name, "location returned null");
            return 0 as WebGLUniformLocation;
        }
        switch (type) {
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
            case 4: //vec2
                this.gl.uniform2f(location, value[0], value[1]);
                break;
            default: // int
                this.gl.uniform1i(location, value[0]);
                break;
        }
        this.attachments.set(name, location);
        return location
    }

    private initStorageBuffers() {
        const gl = this.gl;

        // Static UBO (materials, spheres, planes, triangles, lights)
        const data = this.scene.serializeStaticBlock();
        console.log(`Initializing static buffer storage:`, data);
        const staticUBO = gl.createBuffer();
        gl.bindBuffer(gl.UNIFORM_BUFFER, staticUBO);
        gl.bufferData(gl.UNIFORM_BUFFER, data, gl.DYNAMIC_DRAW);
        const blockIndex = gl.getUniformBlockIndex(this.program, 'StaticBlock');
        const bindingPoint = 1;
        gl.uniformBlockBinding(this.program, blockIndex, bindingPoint);
        gl.bindBufferBase(gl.UNIFORM_BUFFER, bindingPoint, staticUBO);
    }

    private initStorageTextures() {
        const meshBuffers = this.scene.getMeshTextureBuffers();
        let nextTextureBinding = 2;

        this.initUniform("u_positions_count", 0, [meshBuffers.positions.length / 3]);

        if (meshBuffers.positions.length > 0) {
            this.initTextureBuffer('u_positions_tex', meshBuffers.positions, nextTextureBinding++, 1);

            this.initTextureBuffer('u_normals_tex', meshBuffers.normals, nextTextureBinding++, 1);

            this.initTextureBuffer('u_sharedVertexIndices_tex', meshBuffers.positionIndices, nextTextureBinding++, 2);

            this.initTextureBuffer('u_triangleMaterials_tex', meshBuffers.triangleMaterials, nextTextureBinding++, 2);

            this.initTextureBuffer('u_bvh_tex', meshBuffers.bvh, nextTextureBinding++, 3);
        }
    }

    private initTextureBuffer(name: string, data: Float32Array | Uint32Array, index: number, texture_type: number = 0) {
        if (data.length === 0) {
            console.warn("Tried creating a texture without data!")
            return;
        };
        const gl = this.gl;
        const storageVec = gl.createTexture();
        console.log(`Initializing storage buffer for ${name}:`, data);
        gl.activeTexture(gl.TEXTURE0 + index);
        gl.bindTexture(gl.TEXTURE_2D, storageVec);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        //const maxSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
        const width = 2048;
        let texels, height, texelLenght, internalformat, format, type: number;

        switch (texture_type) {
            default:
            // R32F
            case 0: texelLenght = 1; internalformat = gl.R32F; format = gl.RED; type = gl.FLOAT; break;
            // RGB32F
            case 1: texelLenght = 3; internalformat = gl.RGB32F; format = gl.RGB; type = gl.FLOAT; break;
            // R32UI
            case 2: texelLenght = 1; internalformat = gl.R32UI; format = gl.RED_INTEGER; type = gl.UNSIGNED_INT; break;
            // RGBA32F
            case 3: texelLenght = 4; internalformat = gl.RGBA32F; format = gl.RGBA; type = gl.FLOAT; break;
        }

        texels = data.length / texelLenght;
        height = Math.ceil(texels / width);
        const paddedLength = width * height * texelLenght;
        let paddedData = data;
        if (paddedLength > data.length) {
            if (data instanceof Float32Array) paddedData = new Float32Array(paddedLength);
            if (data instanceof Uint32Array) paddedData = new Uint32Array(paddedLength);
            paddedData.set(data);
        }

        gl.texImage2D(gl.TEXTURE_2D, 0, internalformat, width, height, 0, format, type, paddedData);

        let location = gl.getUniformLocation(this.program, name);
        if (!location) console.warn(name, "location returned null");
        gl.uniform1i(location, index);
    }


    private initFrameAcummulation() {
        const gl = this.gl;

        this.last_frame = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.last_frame);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.canvas.width, gl.canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.bindTexture(gl.TEXTURE_2D, null);

        const loc = this.gl.getUniformLocation(this.program, "last_frame_buffer")
        if (loc) {
            this.attachments.set("last_frame_buffer", loc)
        } else {
            throw new Error("Error while trying to find last_frame_buffer");
        }
    }

    // Used in P2, look at for reference in future upgrades
    private async initSkyboxBuffer() {
        const gl = this.gl;
        // All images taken from: https://polyhaven.com
        const image = await loadEXRImage("charolettenbrunn_park_4k.exr", 1.0)

        let tex = gl.createTexture();
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB32F, image.width, image.height, 0, gl.RGB, gl.FLOAT, image.data);
        let location = gl.getUniformLocation(this.program, "skybox");
        if (!location) console.warn("getUniformLocation returned null at skybox");
        gl.uniform1i(location, 1);
    }

    private getLocation(name: string): WebGLUniformLocation {
        const r = this.attachments.get(name);
        if (r) return r;
        else {
            throw new Error("Error while getting " + name + " attachment location")
        }
    }

    private updateBuffers(time: number) {
        const gl = this.gl;

        // Time buffer
        gl.uniform1f(this.getLocation("time"), time);

        // Frame count buffer
        gl.uniform1ui(this.getLocation("frame_count"), this.num_frames_rendered);

        // Resolution buffer
        gl.uniform3f(this.getLocation("resolution"), gl.canvas.width, gl.canvas.height, gl.canvas.width / gl.canvas.height);

        // Sample per pixel uniform buffer
        gl.uniform1ui(this.getLocation("spp"), this.spp);

        // Frame acummulation count buffer
        gl.uniform1ui(this.getLocation("frames_acummulated"), this.num_frames_acummulated);

        // Rusian roulette chance
        gl.uniform1f(this.getLocation("rr_chance"), this.rr_chance);

        // Ray ranges
        gl.uniform3f(this.getLocation("ray_range"),
            this.range_numbers[0], this.range_numbers[1], (this.range_numbers[0] + this.range_numbers[1]) / 2.0);

        // Kernel sigma
        gl.uniform1f(this.getLocation("kernel_sigma"), this.kernel_sigma);


    }

    private updateCameraUBO() {
        const gl = this.gl;

        let data = this.scene.camera.serialize(this.aperture_radius, this.focal_distance);

        gl.bindBuffer(gl.UNIFORM_BUFFER, this.camera_ubo);
        gl.bufferSubData(gl.UNIFORM_BUFFER, 0, data);
    }

    private updateFrameBuffer() {
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
        if (this.frame_acummulation_on) this.num_frames_acummulated++;
    }
}


import { Scene } from "./scene";

async function loadShaderSource(url: string): Promise<string> {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Could not load shader: " + url);
    return await response.text();
}

export class Renderer {
    private gl: WebGL2RenderingContext;
    private scene: Scene;
    private program!: WebGLProgram;
    private vao!: WebGLVertexArrayObject;
    private resLoc!: WebGLUniformLocation;
    private vertexShader!:WebGLShader;
    private fragmentShader!:WebGLShader;


    constructor(gl: WebGL2RenderingContext, scene: Scene) {
        this.gl = gl;
        this.scene = scene;
    }

    public async initialize() {
        this.program = await this.initShaders();
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
        const gl = this.gl;
        gl.useProgram(this.program);

        // Resolution uniform buffer
        let location = gl.getUniformLocation(this.program, "u_resolution");
        if(location) this.resLoc = location;

        // Data struct uniform buffer
        let data_ubo = gl.createBuffer();
        gl.bindBuffer(gl.UNIFORM_BUFFER, data_ubo);
        // std140 is 16 byte aligned => needs padding
        let data = new Float32Array([
            1, 0, 0, 1,   // vec4 u_vec
            0.5, 0, 0, 0  // float u_float + 3 padding
        ]);
        gl.bufferData(gl.UNIFORM_BUFFER, data, gl.STATIC_DRAW);
        // Link to binding point
        let blockIndex = gl.getUniformBlockIndex(this.program, "Data");
        gl.uniformBlockBinding(this.program, blockIndex, 0);
        gl.bindBufferBase(gl.UNIFORM_BUFFER, 0, data_ubo);

        // Texture buffer
        //console.log(await loadImage())
        let values = new Float32Array(gl.canvas.width * gl.canvas.height * 4);
        for (let i = 0; i < values.length; i++) {
            values[i] = Math.random();
        }
        let tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, gl.canvas.width, gl.canvas.height, 0, gl.RGBA, gl.FLOAT, values);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        location = gl.getUniformLocation(this.program, "texture_buffer");
        if(!location) console.warn("getUniformLocation returned null at texture_buffer");
        gl.uniform1i(location, 0);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, tex);

    }

    public render(time: number) {
        const gl = this.gl;
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.useProgram(this.program);
        gl.bindVertexArray(this.vao);

        gl.uniform2f(this.resLoc, gl.canvas.width, gl.canvas.height);

        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    public getInfo(){
        console.log(this.gl.getProgramInfoLog(this.program));
        console.log(this.gl.getShaderInfoLog(this.vertexShader));
        console.log(this.gl.getShaderInfoLog(this.fragmentShader));
    }
}

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


    constructor(gl: WebGL2RenderingContext, scene: Scene) {
        this.gl = gl;
        this.scene = scene;
    }

    public async initialize() {
        this.program = await this.initShaders();
        this.initQuad();
    }


    public async initShaders(): Promise<WebGLProgram> {
        const vertexSource = await loadShaderSource("./shaders/vertex.glsl");
        const fragmentSource = await loadShaderSource("./shaders/fragment.glsl");

        const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertexSource);
        const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, fragmentSource);

        const program = this.gl.createProgram()!;
        this.gl.attachShader(program, vertexShader);
        this.gl.attachShader(program, fragmentShader);
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

    private vao!: WebGLVertexArrayObject;

    private initQuad() {
        const gl = this.gl;
        this.vao = gl.createVertexArray()!;
        gl.bindVertexArray(this.vao);

        const vertices = new Float32Array([
            -1, -1, 1, -1, -1, 1,
            -1, 1, 1, -1, 1, 1
        ]);

        const buffer = gl.createBuffer()!;
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

        const posLoc = gl.getAttribLocation(this.program, "a_position");
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
    }

    public render(time: number) {
        const gl = this.gl;
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.useProgram(this.program);
        gl.bindVertexArray(this.vao);

        const resLoc = gl.getUniformLocation(this.program, "u_resolution");
        gl.uniform2f(resLoc, gl.canvas.width, gl.canvas.height);


        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
}

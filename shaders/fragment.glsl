#version 300 es
precision highp float;

out vec4 outColor;

uniform vec2 u_resolution;

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;

    // Gradiente diagonal simple de azul a rosa
    outColor = vec4(uv.x, 0.5, 1.0 - uv.y, 1.0);

}

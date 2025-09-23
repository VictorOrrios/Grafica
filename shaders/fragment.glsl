#version 300 es
precision highp float;

out vec4 outColor;

// Normal uniform
uniform vec2 u_resolution;

// Block uniform
layout(std140) uniform Data {
    vec4 u_vec;
    float u_float;
};

// Texture data

uniform sampler2D texture_buffer;

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;

    //outColor = vec4(uv.x, 0.5, 1.0 - uv.y, 1.0);

    //outColor = vec4(u_vec);

    //vec4 uv_pixel = texture(u_dataTex, uv);
    //outColor = uv_pixel;

    //int i = 0;
    //if(uv.x <= 0.5) outColor = texelFetch(u_dataTex, ivec2(i,0), 0);

    vec4 texture_pixel = texture(texture_buffer, uv);

    outColor = texture_pixel;
}

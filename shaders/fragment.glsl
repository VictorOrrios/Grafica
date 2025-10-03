#version 300 es
precision highp float;

#define ray_min_distance 0.0001
#define ray_max_distance 10000.0

#define Sphere_size  4;
struct Sphere {
    vec3 center;
    float radius;
};

struct Ray {
    vec3 orig;
    vec3 dir;
};

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

uniform sampler2D sphere_vector;

// PRE r.dir is already normalized
float hit_sphere(const Sphere s, const Ray r){
    vec3 oc =  r.orig - s.center;
    
    float a = 1.0;
    float half_b = dot(r.dir,oc);
    float c = dot(oc,oc)-s.radius*s.radius;

    float discriminant = half_b*half_b - a*c;
    // If < 0.0 then no solution exists
    if(discriminant < 0.0) return -1.0;

    float sq_disc = sqrt(discriminant);
    float d = (-half_b - sq_disc)/a;
    if (d < ray_min_distance || d > ray_max_distance){
        d = (-half_b + sq_disc)/a;
        if (d < ray_min_distance || d > ray_max_distance)
            return -3.0;
    }
    return d;
}


Sphere getSphere(int index){
    int n_index = index*Sphere_size;
    Sphere ret = Sphere(
        vec3(
            texelFetch(sphere_vector, ivec2(n_index,0), 0).r,
            texelFetch(sphere_vector, ivec2(n_index+1,0), 0).r,
            texelFetch(sphere_vector, ivec2(n_index+2,0), 0).r
        ), 
        texelFetch(sphere_vector, ivec2(n_index+3,0), 0).r
    );
    return ret;
}

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;

    //outColor = vec4(uv.x, 0.5, 1.0 - uv.y, 1.0);

    //outColor = vec4(u_vec);

    //vec4 uv_pixel = texture(u_dataTex, uv);
    //outColor = uv_pixel;

    //int i = 0;
    //if(uv.x <= 0.5) outColor = texelFetch(u_dataTex, ivec2(i,0), 0);

    //vec4 texture_pixel = texture(texture_buffer, uv);

    Sphere s1 = getSphere(0);
    Ray r = Ray(vec3(0.0,0.0,0.0),vec3(0.0,0.0,1.0));
    float t = hit_sphere(s1,r);
    if(t < 0.0){
        if(t <= -3.0){
            // Boundary
            outColor = vec4(1.0,0.0,0.0,1.0);
        }else if(t <= -2.0){
            // Negative t
            outColor = vec4(1.0,0.5,0.0,1.0);
        }else{
            // No hit
            outColor = vec4(0.05f, 0.0f, 1.0f, 1.0f);
        }
    } else {
        outColor = vec4(0.07f, 1.0f, 0.0f, 1.0f);
    }

    //outColor = vec4(s1.center,1.0);
}

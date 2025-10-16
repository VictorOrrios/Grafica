#version 300 es
precision highp float;

//===========================
// Global constants
//===========================
// TODO: Fine tune to float precision limit when system is more advanced
#define ray_min_distance 0.0001
#define ray_max_distance 10000.0

//===========================
// Type definitions
//===========================

#define Sphere_size  4;
struct Sphere {
    vec3 center;
    float radius;
};

struct Ray {
    vec3 orig;
    vec3 dir;
};

// Hit information record
struct Hit{
    vec3 p;             // Where it happend
    vec3 normal;        // The normal where it hit
    int mat;            // Material index of the object it hit
    float t;            // The distance from the ray origin to the hit
    bool front_face;    // True if hit is to a front facing surface
};


//===========================
// External variable definitions
//===========================
out vec4 outColor;

layout(std140) uniform Camera {
    mat4 view_inv;
    vec4 position_fov;
} cam;

uniform float time;
uniform float spp;              // samples per pixel
uniform vec3 resolution;        // x,y,z = width,height,aspect_ratio

uniform int sphere_num;
uniform sampler2D sphere_vector;


//===========================
// Postprocesing
//===========================
vec3 aces_film(vec3 color){
    const float a = 2.51;
    const float b = 0.03;
    const float c = 2.43;
    const float d = 0.59;
    const float e = 0.14;
    return color*(a*color+b)/(color*(c*color+d)+e);
}

vec3 clamp_color(vec3 color){
    return clamp(color,0.0,1.0);
}

vec3 gamma_correct(vec3 color){
    return pow(color, vec3(1.0/2.2));
}


//===========================
// Sphere definitions
//===========================

// Sphere vector parser
Sphere get_sphere(int index){
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

// PRE: r.dir is already normalized
bool hit_sphere(const Sphere s, const Ray r, out Hit h){
    vec3 oc =  r.orig - s.center;
    
    float a = 1.0;
    float half_b = dot(r.dir,oc);
    float c = dot(oc,oc)-s.radius*s.radius;

    float discriminant = half_b*half_b - a*c;
    // If < 0.0 then no solution exists
    if(discriminant < 0.0) return false;

    float sq_disc = sqrt(discriminant);
    float d = (-half_b - sq_disc)/a;
    if (d < ray_min_distance || d > ray_max_distance){
        d = (-half_b + sq_disc)/a;
        if (d < ray_min_distance || d > ray_max_distance)
            return false;
    }

    // TODO: Fill out the rest of the hit record
    h.t = d;
    return true;
}


//===========================
// Main functions
//===========================

// Cast the given ray and returns the computed color
vec3 cast_ray(Ray r){
    Hit h;

    for(int s_i = 0; s_i < sphere_num; s_i++){
        Sphere s = get_sphere(s_i);
        // TODO: Display shape pure albedo instead of debug colors
        if(hit_sphere(s,r,h)){
            return vec3(1.0, 0.0, 0.0);
        }
    }


    // TODO: Return sky color, either black/Blue-Grey gradient/HDRI
    // No hit
    return vec3(0.0, 0.0, 1.0);
}

// Generates a ray pointing to the pixel this thread is assigned with
Ray get_ray(){
    // TODO: Add half pixel square offset
    vec2 uv = gl_FragCoord.xy / resolution.xy;

    // Calculate offsets
    float ndcX = 2.0 * uv.x - 1.0;
    float ndcY = 2.0 * uv.y - 1.0;

    // Ray from 0,0,0 to +z + offsets
    vec3 rayDirCameraSpace = normalize(vec3(
        ndcX * resolution.z * cam.position_fov.a,
        ndcY * cam.position_fov.a,
        -1.0
    ));

    // Tranformed to camera base
    vec3 rayDir = normalize(vec3(cam.view_inv * vec4(rayDirCameraSpace, 0.0)));

    Ray ray;
    ray.orig = cam.position_fov.xyz;
    ray.dir = rayDir;

    return ray;
}


void main() {
    // TODO: Initialize the seed of the random system

    // Calculate mean color of pixel
    for(int i = 0; i<int(spp); i++){
        Ray r = get_ray();
        outColor += vec4(cast_ray(r),0.0);
    }
    outColor /= spp;

    // Postprocessing and alpha channel correction
    outColor.xyz = gamma_correct(clamp_color(aces_film(outColor.xyz)));
    outColor.a = 1.0; 
}

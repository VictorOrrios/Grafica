#version 300 es
precision highp float;

//===========================
// Global constants
//===========================
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


//===========================
// External variable definitions
//===========================
out vec4 outColor;

layout(std140) uniform Camera {
    mat4 view_inv;
    vec4 position_fov;
} cam;

uniform float time;
uniform vec2 resolution;
uniform vec2 sphere_num;

uniform sampler2D sphere_vector;


//===========================
// Sphere definitions
//===========================

// Sphere vector parser
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



//===========================
// Ray functions
//===========================

// Generates a ray pointing to the pixel this thread is assigned with
Ray get_ray(){
    // TODO: Add half pixel square offset
    vec2 uv = gl_FragCoord.xy / resolution;

    // Calculate offsets
    float ndcX = 2.0 * uv.x - 1.0;
    float ndcY = 2.0 * uv.y - 1.0;
    float aspectRatio = float(resolution.x)/float(resolution.y);

    // Ray from 0,0,0 to +z + offsets
    vec3 rayDirCameraSpace = normalize(vec3(
        ndcX * aspectRatio * cam.position_fov.a,
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

    Sphere s1 = getSphere(0);
    Ray r = get_ray();
    float t = hit_sphere(s1,r);

    // TODO: Display shape pure albedo instead of error codes
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

}

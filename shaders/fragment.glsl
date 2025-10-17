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

#define Material_size 3
struct Material {
    vec3 albedo;    // RGB Albedo
};

// Center coords (3) + radius (1) + material index (1)
#define Sphere_size 5
struct Sphere {
    vec3 center;
    float radius;
    int mat;
};

#define Plane_size 7
struct Plane {
    vec3 point;     // A point on the plane
    vec3 normal;    // The normal of the plane
    int mat;        // Material index
};

#define Triangle_size 10
struct Triangle {
    vec3 v0;        // Vertex 0
    vec3 v1;        // Vertex 1
    vec3 v2;        // Vertex 2
    int mat;        // Material index
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
// Global variables
//===========================
uint seed;


//===========================
// External variable definitions
//===========================
out vec4 outColor;

layout(std140) uniform Camera {
    mat4 view_inv;
    vec4 position_fov;
} cam;

uniform float time;
uniform uint frame_count;
uniform float spp;              // samples per pixel
uniform vec3 resolution;        // x,y,z = width,height,aspect_ratio

uniform sampler2D material_vector;

uniform int sphere_num;
uniform sampler2D sphere_vector;

uniform int plane_num;
uniform sampler2D plane_vector;

uniform int triangle_num;
uniform sampler2D triangle_vector;


//===========================
// RNG Functions
//===========================
uint hash(uint x) {
    x ^= x >> 16;
    x *= 0x7feb352dU;
    x ^= x >> 15;
    x *= 0x846ca68bU;
    x ^= x >> 16;
    return x;
}

uint xorshift(inout uint state) {
    state ^= state << 13;
    state ^= state >> 17;
    state ^= state << 5;
    return state;
}

float random(){
    return float(xorshift(seed)) / 4294967295.0;
}

vec2 sample_square(){
    return vec2(random()-0.5,random()-0.5);
}


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
// Material functions
//===========================
// Material vector parser
Material get_material(int mat_index){
    int n_index = mat_index * Material_size;
    return Material(vec3(
        texelFetch(material_vector, ivec2(n_index,0), 0).r,
        texelFetch(material_vector, ivec2(n_index+1,0), 0).r,
        texelFetch(material_vector, ivec2(n_index+2,0), 0).r
    ));
}

//===========================
// Sphere functions
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
        texelFetch(sphere_vector, ivec2(n_index+3,0), 0).r,
        int(texelFetch(sphere_vector, ivec2(n_index+4,0), 0).r)
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
    h.p = r.orig+r.dir*d;
    h.normal = (h.p-s.center)/s.radius;
    h.mat = s.mat;
    return true;
}

//===========================
// Plane functions
//===========================
Plane get_plane(int index){
    int n_index = index*Plane_size;
    Plane ret = Plane(
        vec3(
            texelFetch(plane_vector, ivec2(n_index,0), 0).r,
            texelFetch(plane_vector, ivec2(n_index+1,0), 0).r,
            texelFetch(plane_vector, ivec2(n_index+2,0), 0).r
        ), 
        vec3(
            texelFetch(plane_vector, ivec2(n_index+3,0), 0).r,
            texelFetch(plane_vector, ivec2(n_index+4,0), 0).r,
            texelFetch(plane_vector, ivec2(n_index+5,0), 0).r
        ),
        int(texelFetch(plane_vector, ivec2(n_index+6,0), 0).r)
    );
    return ret;
}

bool hit_plane(const Plane p, const Ray r, out Hit h){
    float denom = dot(p.normal, r.dir);
    if(abs(denom) > 0.0001){
        float t = dot(p.point - r.orig, p.normal) / denom;
        if(t >= ray_min_distance && t <= ray_max_distance){
            h.t = t;
            h.p = r.orig + r.dir * t;
            h.normal = p.normal;
            h.mat = p.mat;
            return true;
        }
    }
    return false;
}

//===========================
// Triangle functions
//===========================

//===========================
// Skybox functions
//===========================
vec3 skybox_color_day(Ray r) {
    const vec3 horizon_color = vec3(0.231, 0.756, 0.945);
    const vec3 zenith_color = vec3(1.0);

    vec3 dir_unit = normalize(r.dir);
    float a = 0.5 * (dir_unit.y + 1.0); 
    vec3 sky_gradient = mix(horizon_color, zenith_color, a);


    return sky_gradient;
}

vec3 skybox_color(Ray r){
    return skybox_color_day(r);
}

//===========================
// Main functions
//===========================

// Cast the given ray and returns the computed color
vec3 cast_ray(Ray r){
    bool has_hit = false;
    Hit h, h_aux;
    h.t = ray_max_distance;

    // Check for sphere hits
    for(int s_i = 0; s_i < sphere_num; s_i++){
        Sphere s = get_sphere(s_i);
        if(hit_sphere(s,r,h_aux)){
            if(h_aux.t<h.t){
                h=h_aux;
            }
            has_hit = true;
        }
    }

    // Check for plane hits
    for(int p_i = 0; p_i < plane_num; p_i++) {
        Plane p = get_plane(p_i);
        if(hit_plane(p,r,h_aux)){
            if(h_aux.t<h.t){
                h=h_aux;
            }
            has_hit = true;
        }
    }

    //if(has_hit) return h.normal;
    if(has_hit) return get_material(h.mat).albedo;

    // TODO: Return sky color, either black/Blue-Grey gradient/HDRI
    // No hit
    return skybox_color(r);
}

// Generates a ray pointing to the pixel this thread is assigned with
Ray get_ray(){
    vec2 uv = (gl_FragCoord.xy + sample_square())/resolution.xy;

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
    // Generate a random enough seed
    seed = hash(uint(time)*1920U) 
        ^ hash(frame_count)
        ^ hash(uint(int(gl_FragCoord.x) + int(gl_FragCoord.y) * 1920));

    // Calculate mean color of pixel
    for(int i = 0; i<int(spp); i++){
        Ray r = get_ray();
        outColor += vec4(cast_ray(r),0.0);
    }
    outColor /= spp;

    // Postprocessing
    //outColor.xyz = gamma_correct(clamp_color(aces_film(outColor.xyz)));
    // Alpha channel correction
    outColor.a = 1.0; 
    //outColor.rgb = vec3(random(),random(),random()); // Random test
}

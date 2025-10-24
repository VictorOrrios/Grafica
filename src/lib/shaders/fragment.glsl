#version 300 es
precision mediump float;

#define NUM_MATERIALS __NUM_MATERIALS__
#define NUM_SPHERES __NUM_SPHERES__
#define NUM_PLANES __NUM_PLANES__
#define NUM_TRIS __NUM_TRIANGLES__
#define NUM_POINT_LIGHTS __NUM_POINT_LIGHTS__

//===========================
// Global constants
//===========================
// TODO: Fine tune to float precision limit when system is more advanced
#define ray_min_distance 0.0001
#define ray_max_distance 10000.0
#define bounce_hard_limit 100
#define PI 3.14159265359

//===========================
// Type definitions
//===========================

struct Material {
    vec4 albedo_emission;
    vec3 specular_color;
    vec4 subsurface_color_ior;
};

struct Sphere {
    vec4 center_radius;     // xyz = center, w = radius
    int mat;
};

struct Plane {
    vec4 normal_distance;   // xyz = The normal of the plane, w = Distance from 0,0,0
    int mat;                // Material index
};

struct Triangle {
    vec3 v0;            // Vertex 0
    vec3 v1;            // Vertex 1
    vec3 v2;            // Vertex 2
    vec4 normal_mat;    // xyz = The normal of the triangle, w = material index
};

struct Ray {
    vec3 orig;
    vec3 dir;
};

struct PointLight {
    vec4 color_power;
    vec3 position;
};

// Hit information record
struct Hit{
    vec3 p;             // Where it happend
    vec3 normal;        // The normal where it hit
    int mat;            // Material index of the object it hit
    float t;            // The distance from the ray origin to the hit
    bool front_face;    // True if hit is to a front facing surface
};

struct BSDF {
    // Reflectance params
    vec3 kd; // Diffuse coefficient
    vec3 ks; // Specular coefficient
    float shininess; // Shininess factor for specular highlight size
    // Transmission params
    vec3 kt; // Transmission coefficient
    float ior; // Index of refraction
    vec3 F0; // Base reflectivity at normal incidence
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
uniform uint spp;               // samples per pixel
uniform vec3 resolution;        // x,y,z = width,height,aspect_ratio
uniform float rr_chance;

uniform uint frames_acummulated;
uniform sampler2D last_frame_buffer;

layout(std140) uniform StaticBlock {
    Material materials[NUM_MATERIALS];
    #if NUM_SPHERES > 0
        Sphere spheres[NUM_SPHERES];
    #endif
    #if NUM_PLANES > 0
        Plane planes[NUM_PLANES];
    #endif
    #if NUM_TRIS > 0
        Triangle triangles[NUM_TRIS];
    #endif
    #if NUM_POINT_LIGHTS > 0
        PointLight point_lights[NUM_POINT_LIGHTS];
    #endif
};

uniform sampler2D skybox;


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

float rand1() {
    return float(xorshift(seed)) / 4294967295.0;
}

float rand2() {
    seed ^= seed << 13;
    seed ^= seed >> 17;
    seed ^= seed << 5;
    return float(seed) * 2.3283064365386963e-10; // 1/2^32
}

float rand3(){
    seed = (seed ^ 61u) ^ (seed >> 16u);
    seed *= 9u;
    seed = seed ^ (seed >> 4u);
    seed *= 0x27d4eb2du;
    seed = seed ^ (seed >> 15u);
    return float(seed) / 4294967295.0; // Divide by uint max
}

float random(){
    return rand2();
}

vec2 sample_square(){
    return vec2(random()-0.5,random()-0.5);
}

vec3 random_unit_vec(){
    float phi = 2.0 * PI * random();
    float theta = acos(2.0 * random() - 1.0);
    float sin_theta = sin(theta);
    return vec3(
        sin_theta * cos(phi),
        sin_theta * sin(phi),
        cos(theta)
    );
}

vec3 random_vec_on_hemisphere(vec3 normal){
    vec3 rvec = random_unit_vec();
    if(dot(rvec,normal) > 0.0){
        return rvec;
    }else{
        return -rvec;
    }
}

//===========================
// Tools and macros
//===========================
void set_front_face(vec3 normal, vec3 dir, inout Hit h){
    if(dot(normal,dir) > 0.0){
        h.normal = -normal;
        h.front_face = false;
    }else{
        h.normal = normal;
        h.front_face = true;
    }
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

//===========================
// Sphere functions
//===========================

// PRE: r.dir is already normalized
bool hit_sphere(const Sphere s, const Ray r, out Hit h){
    vec3 oc =  r.orig - s.center_radius.xyz;
    
    float a = 1.0;
    float half_b = dot(r.dir,oc);
    float c = dot(oc,oc)-s.center_radius.a*s.center_radius.w;

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
    h.mat = s.mat;
    vec3 s_normal = (h.p-s.center_radius.xyz)/s.center_radius.w;
    set_front_face(s_normal,r.dir,h);
    
    return true;
}

//===========================
// Plane functions
//===========================

bool hit_plane(const Plane p, const Ray r, out Hit h){
    float denom = dot(p.normal_distance.xyz, r.dir);
    if(abs(denom) > 0.0001){
        float t = dot((p.normal_distance.xyz*-p.normal_distance.w) - r.orig, p.normal_distance.xyz) / denom;
        if(t >= ray_min_distance && t <= ray_max_distance){
            h.t = t;
            h.p = r.orig + r.dir * t;
            h.mat = p.mat;
            set_front_face(p.normal_distance.xyz,r.dir,h);
            return true;
        }
    }
    return false;
}

//===========================
// Triangle functions
//===========================

bool hit_triangle(const Triangle tri, const Ray r, out Hit h){
    // Moller-Trumbore algorithm
    vec3 edge1 = tri.v1 - tri.v0;
    vec3 edge2 = tri.v2 - tri.v0;
    vec3 h_vec = cross(r.dir, edge2);

    float a = dot(edge1, h_vec);
    if(abs(a) < 0.0001) return false; // Ray parallel to triangle

    float f = 1.0 / a;
    vec3 s = r.orig - tri.v0;
    float u = f * dot(s, h_vec);
    if(u < 0.0 || u > 1.0) return false;

    vec3 q_vec = cross(s, edge1);
    float v = f * dot(r.dir, q_vec);
    if(v < 0.0 || u + v > 1.0) return false;

    float t = f * dot(edge2, q_vec);
    if(t < ray_min_distance || t > ray_max_distance) return false; // Boundary check

    h.t = t;
    h.p = r.orig + r.dir * t;
    h.normal = normalize(tri.normal_mat.xyz);
    h.mat = int(tri.normal_mat.w);
    set_front_face(h.normal,r.dir,h);
    return true;
}

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

vec3 skybox_color_black(Ray r){
    return vec3(0.0);
}

vec3 skybox_color(Ray r){
    return skybox_color_day(r);
}

//===========================
// Material functions
//===========================
// Returns 
vec3 sample_mat_direction(Material mat, vec3 Vin, Hit h){
    return random_vec_on_hemisphere(h.normal);
}

vec3 eval_mat(Material mat, vec3 Vout, vec3 Vin, Hit h, out float pdf){
    vec3 fr = mat.albedo_emission.rgb/PI;
    pdf = 1.0/PI;

    return fr;
}

//===========================
// Main functions
//===========================

bool hit_scene(Ray r, out Hit h){
    bool has_hit = false;
    Hit h_aux;
    h.t = ray_max_distance;

    // Check for sphere hits
    #if NUM_SPHERES > 0
        for(int s_i = 0; s_i < NUM_SPHERES; s_i++){
            Sphere s = spheres[s_i];
            if(hit_sphere(s,r,h_aux)){
                if(h_aux.t<h.t){
                    h=h_aux;
                }
                has_hit = true;
            }
        }
    #endif

    // Check for plane hits
    #if NUM_PLANES > 0
        for(int p_i = 0; p_i < NUM_PLANES; p_i++) {
            Plane p = planes[p_i];
            if(hit_plane(p,r,h_aux)){
                if(h_aux.t<h.t){
                    h=h_aux;
                }
                has_hit = true;
            }
        }
    #endif

    // Check for tri hits
    #if NUM_TRIS > 0
        for(int t_i = 0; t_i < NUM_TRIS; t_i++) {
            Triangle tri = triangles[t_i];
            if(hit_triangle(tri,r,h_aux)){
                if(h_aux.t<h.t){
                    h=h_aux;
                }
                has_hit = true;
            }
        }
    #endif

    return has_hit;
}

vec3 get_direct_light(Hit h){
    Hit aux;
    vec3 ret;
    for (int i = 0; i < NUM_POINT_LIGHTS; i++) {
        PointLight l = point_lights[i];
        vec3 direction = l.position-h.p;
        float d = length(direction);
        // Cast a ray from the light source to the hit position
        Ray r = Ray(h.p,normalize(l.position-h.p));
        if(!hit_scene(r,aux) || aux.t >= d){
            vec3 actual_light_color = l.color_power.xyz * l.color_power.w;
            // Multiply by the cosine(ray_dir, hit_normal)
            ret += actual_light_color * abs(dot(r.dir,h.normal));
        }
    }
    return ret;
}

// Cast the given ray and returns the computed color
vec3 cast_ray(Ray r){
    vec3 color = vec3(0.0);
    Hit h;
    float pdf;
    vec3 atenuation = vec3(1.0);

    /*
    int bounce_count = 0;
    while(bounce_count <= bounce_hard_limit && random()>rr_chance){
        bounce_count++;
    */
    for(int bounce_count = 0; 
        (random()>rr_chance || bounce_count <= 1) && bounce_count <= bounce_hard_limit; 
        bounce_count++){

        if(hit_scene(r,h)){

            Material mat = materials[h.mat];

            // Emissive material
            if(mat.albedo_emission.a > 0.0){
                return color + mat.albedo_emission.rgb*mat.albedo_emission.a*atenuation;
            }

            vec3 new_direction = sample_mat_direction(mat, r.dir,h);

            vec3 fr = eval_mat(mat,new_direction,r.dir,h,pdf);
            atenuation *= fr * abs(dot(h.normal,new_direction)) / pdf;
            
            r.dir = new_direction;
            r.orig = h.p;
            
            // Get light from all light sources
            if(bounce_count == 0){
                vec3 direct_light = get_direct_light(h);
                color += direct_light*atenuation;
            }
        }else{
            color += skybox_color(r)*atenuation;
            return color; 
        }
    }

    return color * rr_chance;
}

// Generates a ray pointing to the pixel this thread is assigned with
Ray get_ray(vec2 uv){
    // Calculate offsets
    vec2 ndc = 2.0*(uv + sample_square() / resolution.xy) -1.0;

    // Ray from 0,0,0 to +z + offsets
    vec3 rayDirCameraSpace = normalize(vec3(
        ndc.x * resolution.z * cam.position_fov.a,
        ndc.y * cam.position_fov.a,
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
    vec2 uv = (gl_FragCoord.xy)/resolution.xy;
    for(int i = 0; i<int(spp); i++){
        Ray r = get_ray(uv);
        outColor += vec4(cast_ray(r),0.0);
    }
    outColor /= float(spp);

    // Postprocessing
    //outColor.xyz = gamma_correct(clamp_color(aces_film(outColor.xyz)));

    // Alpha channel correction
    outColor.a = 1.0; 

    // Random test
    //outColor.rgb = vec3(random(),random(),random()); 

    // Frame acummulation
    if (frames_acummulated > 0u) {
        vec3 last_color = texture(last_frame_buffer, uv).rgb;
        float f = float(frames_acummulated);
        // Linear mean
        //outColor.rgb = (last_color * (f - 1.0) + outColor.rgb) / f;
        // Exponetianl mean
        outColor.rgb = mix(last_color, outColor.rgb, 1.0 / float(frames_acummulated + 1u));
    }
}

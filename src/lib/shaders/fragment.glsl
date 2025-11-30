#version 300 es
precision mediump float;
precision highp usampler2D;
//===========================
// On load constants
//===========================
#define NUM_MATERIALS __NUM_MATERIALS__
#define NUM_SPHERES __NUM_SPHERES__
#define NUM_PLANES __NUM_PLANES__
#define NUM_TRIS __NUM_TRIANGLES__
#define NUM_POINT_LIGHTS __NUM_POINT_LIGHTS__
#define NUM_MESHES __NUM_MESHES__

//===========================
// Global constants
//===========================
// TODO: Fine tune to float precision limit when system is more advanced
#define ray_min_distance 0.0001
#define ray_max_distance 10000.0
#define bounce_hard_limit 200
#define minimun_atenuation 0.0
#define PI 3.14159265359
#define TWO_PI 6.28318530718
#define INV_PI 0.31830988618
#define INV_TWO_PI 0.15915494309
#define E_NUMBER 2.71828182845

//===========================
// Enum defines
//===========================
#define NONE 0
#define DIFFUSE 1
#define METALIC 2
#define DIELECTRIC 3


//===========================
// Type definitions
//===========================

struct Material {
    vec4 albedo_emission;                   // xyz = albedo* base color, w = emission power* (0.0 == no light)
    vec3 specular_color;                    // xyz = specular color for highlights (metals)
    vec4 subsurface_color_ior;              // xyz = subsurface color for transmision (dielectrics), w = index of refraction
    vec4 rou_met_trs_ref;                   // x = roughness* 0.0 = smooth / 1.0 = rough
                                            // y = metalness* 0.0 = dielectric / 1.0 = metalic
                                            // z = transmision weight  0.0 = opaque / 1.0 = transparent
                                            // w = reflectance 0.0 = low / 0.5 = normal / 1.0 = high
    vec3 precomputed_values;                // x = alpha* = roughness*roughness
                                            // y = dielectric F0 in going
                                            // z = dielectric F0 out going
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

struct MeshInfo {
    int startTriangle;
    int triangleCount;
    int materialIndex;
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
    bool isMesh;        // True if hit came from a mesh
};


//===========================
// Global variables
//===========================
uint seed;
int bounce_count;

//===========================
// External variable definitions
//===========================
out vec4 outColor;

layout(std140) uniform Camera {
    mat4 view_inv;
    vec4 position_fov;
    vec3 up;
    vec3 right;
    vec2 thin_lense; // x = aperture radius, y = focal distance
} cam;

uniform float time;
uniform uint frame_count;
uniform uint spp;               // samples per pixel
uniform vec3 resolution;        // x,y,z = width,height,aspect_ratio
uniform float rr_chance;
uniform vec3 ray_range;         // x = min, y = max, z = (min+max)/2
uniform float kernel_sigma;

uniform uint frames_acummulated;
uniform sampler2D last_frame_buffer;

uniform sampler2D skybox;

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
    #if NUM_MESHES > 0
        MeshInfo meshInfos[NUM_MESHES];
    #endif
};

// TODO, meter sampler para el mapa de uv
uniform sampler2D u_positions_tex;
uniform sampler2D u_normals_tex;
uniform usampler2D u_positionIndices_tex;
uniform usampler2D u_triangleMaterials_tex;
uniform sampler2D u_bvh_tex;    // RGBA32F: BVH nodes (minX, minY, minZ, maxX, maxY, maxZ, left, right)

uniform int u_vertex_count;

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

void init_seed() {
    uint px = uint(gl_FragCoord.x);
    uint py = uint(gl_FragCoord.y);
    uint width = uint(resolution.x);
    
    uint spatial = (py * width + px) % 2147483647u;
    uint temporal = (uint(time * 100.0) + frame_count * 65537u) % 2147483647u;
    
    seed = hash(spatial * 1664525u + temporal);
    // Removing the px/py part gives weird paint brush effect on frame acummulation

    for(int i = 0; i < 3; i++) {
        seed = hash(seed);
    }
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
    return rand1();
}

vec2 sample_square(){
    return vec2(random()-0.5,random()-0.5);
}

vec2 sample_disc(){
    float r = sqrt(random());
    float theta = TWO_PI * random();
    return vec2(cos(theta), sin(theta)) * r;
}

vec3 random_unit_vec(){
    float phi = TWO_PI * random();
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
// Kernel functions
//===========================

vec3 apply_kernel_clamped_triangle(vec3 color, float t){
    float sigma = min(kernel_sigma, 0.5);
    float t_norm = (t - ray_range.x)/(ray_range.y-ray_range.x);
    float k = 1.0;

    if (t_norm <= sigma) {
        k = t_norm / sigma;
    } else if(t_norm >= 1.0-sigma){
        k = (1.0 - t_norm) / sigma;
    }
    k = min(k, 1.0);

    return color * k; 
}

vec3 apply_gaussian_kernel(vec3 color, float t){
    float sigma2times2 = 2.0*kernel_sigma*kernel_sigma;
    float k = inversesqrt(PI*sigma2times2);
    float d_to_center = ray_range.z - t;
    k *= pow(E_NUMBER,-d_to_center*d_to_center/sigma2times2);
    return color*k;
}

vec3 apply_kernel(vec3 color, float t){
    if(kernel_sigma <= 0.0) return color;
    return apply_kernel_clamped_triangle(color, t);
}

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

    h.t = d;
    h.p = r.orig+r.dir*d;
    h.mat = s.mat;
    vec3 s_normal = (h.p-s.center_radius.xyz)/s.center_radius.w;
    set_front_face(s_normal,r.dir,h);
    h.normal = s_normal;
    
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

bool hit_triangle(Triangle tri, const Ray r, out Hit h){
    vec3 v0 = tri.v0;
    vec3 v1 = tri.v1;
    vec3 v2 = tri.v2;

    // Moller-Trumbore intersection
    vec3 edge1 = v1 - v0;
    vec3 edge2 = v2 - v0;
    vec3 pvec = cross(r.dir, edge2);
    float det = dot(edge1, pvec);
    if(abs(det) < 1e-6) return false; // Parallel or nearly parallel

    float invDet = 1.0 / det;
    vec3 tvec = r.orig - v0;
    float u = dot(tvec, pvec) * invDet;
    if(u < 0.0 || u > 1.0) return false;

    vec3 qvec = cross(tvec, edge1);
    float v = dot(r.dir, qvec) * invDet;
    if(v < 0.0 || u + v > 1.0) return false;

    float t = dot(edge2, qvec) * invDet;
    if(t < ray_min_distance || t > ray_max_distance) return false;

    h.t = t;
    h.p = r.orig + r.dir * t;

    vec3 normal = tri.normal_mat.xyz;
    h.mat = int(tri.normal_mat.w);
    h.isMesh = false;  // This is a UBO triangle
    set_front_face(normal, r.dir, h);
    return true;
}

//===========================
// Mesh functions
//===========================

// Helper to fetch from 2D texture as if it were 1D
// Assumes texture width is 2048
#define TEX_WIDTH 2048

vec4 fetchTexelFloat(sampler2D tex, int index) {
    int x = index % TEX_WIDTH;
    int y = index / TEX_WIDTH;
    return texelFetch(tex, ivec2(x, y), 0);
}

uvec4 fetchTexelUint(usampler2D tex, int index) {
    int x = index % TEX_WIDTH;
    int y = index / TEX_WIDTH;
    return texelFetch(tex, ivec2(x, y), 0);
}


bool hit_mesh_triangle(int triIndex, const Ray r, out Hit h){
    // Each triangle stores 3 uint indices in the u_positionIndices_tex (one uint per texel)
    int base = triIndex * 3;

    // Fetch packed indices (R32UI texture) using 2D layout
    uvec4 id0 = fetchTexelUint(u_positionIndices_tex, base + 0);
    uvec4 id1 = fetchTexelUint(u_positionIndices_tex, base + 1);
    uvec4 id2 = fetchTexelUint(u_positionIndices_tex, base + 2);

    int idx0 = int(id0.r);
    int idx1 = int(id1.r);
    int idx2 = int(id2.r);

    // Reconstruct triangle vertices from positions texture (RGB32F)
    vec3 v0 = fetchTexelFloat(u_positions_tex, idx0).xyz;
    vec3 v1 = fetchTexelFloat(u_positions_tex, idx1).xyz;
    vec3 v2 = fetchTexelFloat(u_positions_tex, idx2).xyz;

    // Fetch vertex normals from texture (RGB32F)
    vec3 n0 = fetchTexelFloat(u_normals_tex, idx0).xyz;
    vec3 n1 = fetchTexelFloat(u_normals_tex, idx1).xyz;
    vec3 n2 = fetchTexelFloat(u_normals_tex, idx2).xyz;

    // Moller-Trumbore intersection
    vec3 edge1 = v1 - v0;
    vec3 edge2 = v2 - v0;
    vec3 pvec = cross(r.dir, edge2);
    float det = dot(edge1, pvec);
    if(abs(det) < 1e-6) return false; // Parallel or nearly parallel

    float invDet = 1.0 / det;
    vec3 tvec = r.orig - v0;
    float u = dot(tvec, pvec) * invDet;
    if(u < 0.0 || u > 1.0) return false;

    vec3 qvec = cross(tvec, edge1);
    float v = dot(r.dir, qvec) * invDet;
    if(v < 0.0 || u + v > 1.0) return false;

    float t = dot(edge2, qvec) * invDet;
    if(t < ray_min_distance || t > ray_max_distance) return false;

    h.t = t;
    h.p = r.orig + r.dir * t;

    // Interpolate normal using barycentric coordinates
    float w = 1.0 - u - v;
    vec3 interpolatedNormal = normalize(n0 * w + n1 * u + n2 * v);
    h.normal = interpolatedNormal;
    // Triangle material index stored as R32UI texel per triangle
    // TODO, change to R8UI and implement mesh materials
    uint mat_u = fetchTexelUint(u_triangleMaterials_tex, triIndex).r;
    h.mat = int(mat_u);
    h.isMesh = true;  // This is a mesh triangle
    set_front_face(interpolatedNormal, r.dir, h);

    // Ensure normal points outward from the mesh center (0,0,0)
    // TODO: REMOVED, since it flips the normals when translating the mesh
    /*
    if (dot(h.normal, h.p) < 0.0) {
        h.normal = -h.normal;
        h.front_face = !h.front_face;
    }
    */
    return true;
}

// Official three-mesh-bvh AABB intersection test
// https://www.reddit.com/r/opengl/comments/8ntzz5/fast_glsl_ray_box_intersection/
// https://tavianator.com/2011/ray_box.html
bool intersectsBounds(vec3 rayOrigin, vec3 rayDirection, vec3 boundsMin, vec3 boundsMax, out float dist) {
    // Robust inverse direction
    vec3 dir = rayDirection;
    //vec3 safeDir = mix(dir, sign(dir) * 1e-15, lessThan(abs(dir), vec3(1e-15)));
    vec3 invDir = 1.0 / dir;

    // Calculate intersections per axis
    vec3 t0 = (boundsMin - rayOrigin) * invDir;
    vec3 t1 = (boundsMax - rayOrigin) * invDir;
    
    // Ensure t0 <= t1 per axis
    vec3 tMin = min(t0, t1);
    vec3 tMax = max(t0, t1);

    // Find the overlap between all axes
    float tEnter = max(max(tMin.x, tMin.y), tMin.z);
    float tExit = min(min(tMax.x, tMax.y), tMax.z);

    // Check if valid intersection
    if (tExit < 0.0 || tEnter > tExit) {
        return false;
    }

    // Ray starts inside box? Use 0.0 as entry distance
    dist = max(tEnter, 0.0);
    
    return true;
}

// Main BVH traversal function
bool hit_mesh_with_bvh(MeshInfo mesh, const Ray r, out Hit h) {
    // Stack for traversal
    const int BVH_STACK_DEPTH = 64;
    uint stack[BVH_STACK_DEPTH];
    int stackPtr = 0;
    stack[0] = 0u; // Push root node
    
    float triangleDistance = ray_max_distance;
    bool found = false;
    
    // Initialize hit record
    h.t = ray_max_distance;
    
    while (stackPtr > -1 && stackPtr < BVH_STACK_DEPTH) {
        uint currNodeIndex = stack[stackPtr];
        stackPtr--;
        
        // Fetch node data
        int texelIndex = int(currNodeIndex) * 2;
        vec4 t0 = fetchTexelFloat(u_bvh_tex, texelIndex);
        vec4 t1 = fetchTexelFloat(u_bvh_tex, texelIndex + 1);
        
        vec3 boundsMin = t0.xyz;
        vec3 boundsMax = t1.xyz;
        float data1 = t0.w; // leftChildIndex (internal) OR triangleOffset (leaf)
        float data2 = t1.w; // rightChildIndex (internal) OR -triangleCount (leaf)
        
        // Check bounds intersection
        float boundsHitDistance;
        if (!intersectsBounds(r.orig, r.dir, boundsMin, boundsMax, boundsHitDistance) 
            || boundsHitDistance > triangleDistance) {
            continue;
        }
        
        // Leaf detection: data2 is negative for leaves
        bool isLeaf = data2 < 0.0;
        
        if (isLeaf) {
            // Leaf node: test triangles
            uint count = uint(-data2);
            uint offset = uint(data1);
            
            // Test all triangles in this leaf
            for (uint i = 0u; i < count; i++) {
                int triIdx = mesh.startTriangle + int(offset + i);
                Hit h_aux;
                
                if (hit_mesh_triangle(triIdx, r, h_aux) && h_aux.t < triangleDistance) {
                    triangleDistance = h_aux.t;
                    h = h_aux;
                    found = true;
                }
            }
        } else {
            // Internal node
            uint leftIndex = uint(data1);
            uint rightIndex = uint(data2);
            
            // Determine split axis dynamically based on bounds shape
            // (Matches builder's logic: split along longest axis)
            vec3 size = boundsMax - boundsMin;
            int axis = 0;
            if (size.y > size.x) axis = 1;
            if (size.z > (axis == 0 ? size.x : size.y)) axis = 2;
            
            // Determine traversal order
            bool leftToRight = r.dir[axis] >= 0.0;
            uint c1 = leftToRight ? leftIndex : rightIndex;
            uint c2 = leftToRight ? rightIndex : leftIndex;
            
            // Push children to stack
            // Push far child first so near child is processed next
            stackPtr++;
            if (stackPtr < BVH_STACK_DEPTH) {
                stack[stackPtr] = c2;
            }
            
            stackPtr++;
            if (stackPtr < BVH_STACK_DEPTH) {
                stack[stackPtr] = c1;
            }
        }
    }
    
    // Set material if we found a hit
    if (found) {
        h.mat = mesh.materialIndex;
    }
    
    return found;
}

// Legacy brute-force version (kept for debugging/comparison)
bool hit_mesh_bruteforce(MeshInfo mesh, const Ray r, out Hit h){
    bool has_hit = false;
    Hit h_aux;
    h.t = ray_max_distance;

    for(int i = 0; i < mesh.triangleCount; i++){
        int triIdx = mesh.startTriangle + i;
        if(hit_mesh_triangle(triIdx, r, h_aux)){
            if(h_aux.t < h.t){
                h = h_aux;
                has_hit = true;
            }
        }
    }

    if(has_hit) {
        h.mat = mesh.materialIndex;
    }

    return has_hit;
}

// Main hit_mesh function
bool hit_mesh(MeshInfo mesh, const Ray r, out Hit h){
    return hit_mesh_with_bvh(mesh, r, h);
}

//===========================
// Scene functions
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

    // Check for UBO triangle hits
    #if NUM_TRIS > 0
        for(int t_i = 0; t_i < NUM_TRIS; t_i++) {
            Triangle tri = triangles[t_i];
            if(hit_triangle(tri, r, h_aux)){
                if(h_aux.t < h.t){
                    h = h_aux;
                }
                has_hit = true;
            }
        }
    #endif

    // Check for mesh hits
    #if NUM_MESHES > 0
        for(int m_i = 0; m_i < NUM_MESHES; m_i++) {
            MeshInfo mesh = meshInfos[m_i];
            if(hit_mesh(mesh, r, h_aux)){
                if(h_aux.t < h.t){
                    h = h_aux;
                }
                has_hit = true;
            }
        }
    #endif

    return has_hit;
}

//===========================
// Skybox functions
//===========================
vec3 skybox_color_image(Ray r){
    float u = atan(r.dir.z, r.dir.x) * INV_TWO_PI + 0.5;
    float v = r.dir.y * 0.5 + 0.5;
    return texture(skybox, vec2(u, v)).rgb;
}

vec3 skybox_color_day(Ray r) {
    const float power = 1.0;
    const vec3 horizon_color = vec3(0.231, 0.756, 0.945) * power;
    const vec3 zenith_color = vec3(1.0) * power;

    vec3 dir_unit = normalize(r.dir);
    float a = 0.5 * (dir_unit.y + 1.0); 
    vec3 sky_gradient = mix(horizon_color, zenith_color, a);


    return sky_gradient;
}

vec3 skybox_color_black(Ray r){
    return vec3(0.0);
}

vec3 skybox_color(Ray r){
    return skybox_color_image(r);
}

//===========================
// Material functions
//===========================

// Fresnel-Schlick aproximation to reflectance for dielectrics
float fresnel_dielectric(float cos_theta_i, float eta) {
    float r0 = (1.0 - eta) / (1.0 + eta);
    float F0 = r0 * r0;
    return F0 + (1.0 - F0) * pow(1.0 - cos_theta_i, 5.0);
}

// Fresnel-Schlick aproximation to reflectance
vec3 reflectance(float cos_theta, vec3 F0) {
    return F0 + (1.0 - F0) * pow(1.0 - cos_theta, 5.0);
}

// Normal distribution function. GGX
float ggx_distribution(float NoH, float alpha){
    float alpha_squared = alpha * alpha;
    float b = NoH * NoH * (alpha_squared - 1.0) + 1.0;
    return alpha_squared * INV_PI / (b * b);
}

float G1_GGX_Schlick(float AoB, float k) {
    return max(AoB, 1e-5) / (AoB * (1.0 - k) + k);
}

float G_Smith(float NoV, float NoL, float alpha) {
    float k = alpha/2.0;
    return G1_GGX_Schlick(NoV, k) * G1_GGX_Schlick(NoL, k);
}


vec3 align_to_world(vec3 X, vec3 N){
    vec3 up = vec3(0.0,0.0,1.0);

    vec3 T = normalize(cross(up,N));
    vec3 B = cross(N,T);

    return T*X.x + B*X.y + N*X.z;
}

vec3 sample_ggx(float alpha, vec3 V, vec3 N){
    float e1 = random(), e2 = random();

    float cos_theta = sqrt((1.0 - e1) / (1.0 + (alpha - 1.0) * e1));
    float sin_theta = sqrt(1.0 - cos_theta * cos_theta);
    float phi = 2.0 * PI * e2;

    float cos_p = cos(phi);
    float sin_p = sin(phi);
    vec3 H_tan = vec3(sin_theta * cos_p, sin_theta * sin_p, cos_theta);

    vec3 H = align_to_world(H_tan,N);
    if (dot(V, H) < 0.0) H = -H;
    return normalize(H);
}


// Samples a reflected direction of V into N 
vec3 sample_r(float alpha, vec3 V, vec3 N, out vec3 H){
    H = sample_ggx(alpha,V,N);
    return reflect(-V,H);
}

// Samples a refracted direction of V into N 
    /*
vec3 sample_t(Material mat, float F0, float eta, vec3 V, vec3 N, out vec3 H){
    H = sample_ggx(mat.precomputed_values.x,V,N);

    float cos_theta = min(1.0,dot(V,H));
    float sin_theta = sqrt(1.0 - cos_theta*cos_theta);
    bool cannot_refract = eta * sin_theta > 1.0;

    float reflectance = reflectance(cos_theta,F0);

    return cannot_refract || reflectance > random() ? 
        reflect(-V,H) : refract(-V,H,eta);
}
    */

vec3 eval_mat(Material mat, vec3 Vin, Hit h, out vec3 Vout){

    if(rr_chance < random()) return vec3(0.0);

    vec3 V = -Vin;
    vec3 N = h.normal;
    vec3 H;
    float alpha = mat.precomputed_values.x;

    Vout = normalize(sample_r(alpha, V, N, H));

    H = normalize(V+Vout);

    float NoV = clamp(dot(N, V), 0.0, 1.0);
    float NoL = clamp(dot(N, Vout), 0.0, 1.0);
    float NoH = clamp(dot(N, H), 0.0, 1.0);
    float VoH = clamp(dot(V, H), 0.0, 1.0);

    vec3 dielectric_F0_vec = vec3(0.16*mat.rou_met_trs_ref.w*mat.rou_met_trs_ref.w);
    vec3 F0 = mix(dielectric_F0_vec, mat.albedo_emission.xyz, mat.rou_met_trs_ref.y);

    vec3  F = reflectance(VoH, F0);
    float D = ggx_distribution(NoH,alpha);
    float G = G_Smith(NoV,NoL,alpha);

    vec3 f_specular = (F*D*G) / (4.0 *  max(NoV, 1e-3) * max(NoL, 1e-3));

    vec3 rhoD = mat.albedo_emission.xyz;
    rhoD *= vec3(1.0) - F;
    rhoD *= (1.0 - mat.rou_met_trs_ref.y);

    vec3 f_diffuse = rhoD * INV_PI;

    vec3 fr = f_diffuse + f_specular;

    return fr * abs(NoL);
}


//===========================
// Main functions
//===========================


vec3 get_direct_light(Hit h, Material mat, float total_t){
    // 0% diffuse means no point lights
    if(length(mat.albedo_emission.xyz) <= 0.0){
        return vec3(0.0);
    }
    Hit aux;
    vec3 ret = vec3(0);

    /* TODO: fix NEE with the new sistem
    #if NUM_POINT_LIGHTS > 0
        for (int i = 0; i < NUM_POINT_LIGHTS; i++) {
            PointLight l = point_lights[i];
            vec3 direction = l.position-h.p;
            float d = length(direction);

            // Range check
            float total_plus_pl = total_t + d;
            if(total_plus_pl > ray_range.y ||
            total_plus_pl < ray_range.x) continue;

            // Normal check
            if(dot(h.normal,direction) < 0.0) continue;

            float d2 = d*d;
            // Cast a ray from the light source to the hit position
            Ray r = Ray(h.p,normalize(l.position-h.p));
            if(!hit_scene(r,aux) || aux.t >= d){
                ret += apply_kernel(
                    mat.albedo_emission.xyz / mat.lobe_chances.x
                    * l.color_power.xyz * l.color_power.w / d2
                    * abs(dot(r.dir,h.normal)),
                    total_plus_pl);
            }
        }
    #endif
    */

    return ret;
}

// Cast the given ray and returns the computed color
vec3 cast_ray(Ray r){
    vec3 color = vec3(0.0);
    Hit h;
    float pdf;
    vec3 atenuation = vec3(1.0);
    vec3 new_direction;

    float total_t = 0.0;


    bounce_count = 0;
    for(int i = 0; i < bounce_hard_limit; i++) {
        
        if(hit_scene(r,h)){

            total_t += h.t;
            // Max distance check
            if(total_t > ray_range.y) break;

            Material mat = materials[h.mat];

            // Emissive material & Min distance check
            if(mat.albedo_emission.a > 0.0){
                // Min distance check
                if(total_t < ray_range.x) break;

                color += apply_kernel(
                    atenuation * mat.albedo_emission.rgb*mat.albedo_emission.a,
                    total_t);
                break; 
            }

            atenuation *= eval_mat(mat,r.dir,h,new_direction);
            //return atenuation;
            // 0 atennuation check for termination
            if(length(atenuation) <= minimun_atenuation) break;
            
            r.dir = new_direction;
            r.orig = h.p;
            
            // Get light from all light sources
            //if(bounce_count == 0){
            if(true){
                vec3 direct_light = get_direct_light(h,mat,total_t);
                color += direct_light*atenuation;
            }
        }else{
            // No hit => skybox hit
            color += apply_kernel(
                skybox_color(r)*atenuation,
                total_t);
            break; 
        }
        bounce_count++;
    }

    

    return color;
}

// Generates a ray pointing to the pixel this thread is assigned with
Ray get_ray(vec2 uv){
    // Calculate offsets
    vec2 ndc = 2.0*(uv + sample_square() / resolution.xy) -1.0;
    vec2 aperture = sample_square()*cam.thin_lense.x;

    // Ray from 0,0,0 to +z + offsets
    vec3 rayDirCameraSpace = vec3(
        ndc.x * resolution.z * cam.position_fov.a,
        ndc.y * cam.position_fov.a,
        -1.0
    );

    // Tranformed to camera base
    vec3 focus_point = vec3(cam.view_inv * vec4(rayDirCameraSpace, 0.0))*cam.thin_lense.y;
    vec3 orig_offset = cam.right*aperture.x+cam.up*aperture.y;

    Ray ray;
    ray.orig = cam.position_fov.xyz + orig_offset;
    ray.dir = normalize(focus_point-orig_offset);

    return ray;
}


void main() {
    // Generate a random enough seed
    init_seed();

    // Calculate mean color of pixel
    vec2 uv = (gl_FragCoord.xy)/resolution.xy;
    vec3 samples_sum = vec3(0.0);
    for(int i = 0; i<int(spp); i++){
        Ray r = get_ray(uv);
        samples_sum += cast_ray(r);
    }
    outColor = vec4(samples_sum/float(spp),1.0);

    // Post processing
    outColor.xyz = gamma_correct(clamp_color(aces_film(outColor.xyz)));
    //outColor.xyz = gamma_correct(clamp_color(outColor.xyz));

    // Alpha channel correction
    outColor.a = 1.0; 

    // Random test
    //outColor.rgb = vec3(random()); 

    // Frame acummulation
    if (frames_acummulated > 0u) {
        vec3 last_color = texture(last_frame_buffer, uv).rgb;
        float f = float(frames_acummulated);
        // Linear mean
        outColor.rgb = (last_color * (f - 1.0) + outColor.rgb) / f;
        // Exponetianl mean
        //outColor.rgb = mix(last_color, outColor.rgb, 1.0 / float(frames_acummulated + 1u));
    }

}

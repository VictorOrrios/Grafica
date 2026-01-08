#version 300 es
precision mediump float;
precision highp usampler2D;
precision mediump sampler2DArray;
//===========================
// On load constants
//===========================
#define NUM_MATERIALS __NUM_MATERIALS__
#define NUM_SPHERES __NUM_SPHERES__
#define NUM_PLANES __NUM_PLANES__
#define NUM_TRIS __NUM_TRIANGLES__
#define NUM_POINT_LIGHTS __NUM_POINT_LIGHTS__
#define NUM_MESHES __NUM_MESHES__
#define SKYBOX_TYPE __SKYBOX_TYPE__

//===========================
// Global constants
//===========================
// TODO: Fine tune to float precision limit when system is more advanced
#define ray_min_distance 0.001
#define ray_max_distance 10000.0
#define bounce_hard_limit 200
#define minimun_atenuation 0.001
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
                                            // w = f0 dielectric = 0.16*reflectance² | reflectance => 0.0 = low / 0.5 = normal / 1.0 = high
    vec4 F0_alpha;                          // xyz = precomputed F0 = mix(0.16*reflectance²,albedo,metalness)
                                            // w = precomputed alpha = roughness*roughness
    ivec4 albedoTA_normalTA;                // Values for albedo tex, normal map and roughness/metalness map
    ivec4 rmTA_emissionTA;                  // T value indicates which texture index on the array
                                            // A value indicates which texture array to use: 1=512, 2=1024, 3=2048
                                            // If A = 0 then theres is no texture attached
};

struct Sphere {
    vec4 center_radius;     // xyz = center, w = radius
    int mat;
    vec3 u;
    vec3 v;
    vec3 w;
    vec4 tiling;            // xy = uv offset, zw = tiling size
};

struct Plane {
    vec4 normal_distance;   // xyz = The normal of the plane, w = Distance from 0,0,0
    vec4 tiling_mat;        // xy = uv offset, z = tiling size, w = material index
};

struct Triangle {
    vec3 v0;            // Vertex 0
    vec3 v1;            // Vertex 1
    vec3 v2;            // Vertex 2
    vec3 normal;        // xyz = The normal of the triangle
    vec3 tangent;       // xyz = The tangent of the triangle
    vec3 bitangent;     // xyz = The bitanget of the triangle
    vec4 uv0_uv1;       // xy = uv of vertex 0, zw = uv of vertex 1
    vec4 uv2_mat;       // xy = uv of vertex 2, w = material index
};

struct MeshTriangleInfo {
    ivec4 indices;      // xyz = position indices, w = mat index
    vec3 uvw;           // Barycentric coordinates
    vec3 edge1;         // v1 - v0
    vec3 edge2;         // v2 - v0
};

struct MeshInfo {
    int startTriangle;
    int triangleCount;
    // TODO, remove and implement full material system for meshes
    int materialIndex;
    int normalStrategy; // 0 = Interpolated, 1 = Geometric
    int normalOffset;   // sum of vertices from prior GEOMETRIC meshes
    int bvhOffset;      // Index of the root node in u_bvh_tex
    // NOTE: padding is REQUIRED for alignment
    int pad2, pad3;
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
struct Hit {
    vec3 p;                 // Where it happend
    vec3 normal;            // The normal where it hit
    Material mat;           // Material of the object it hit
    float t;                // The distance from the ray origin to the hit
    bool front_face;        // True if hit is to a front facing surface
    vec2 uv;                // Texture uv where it hit. (-1,-1) = It doesn't have uvs
    vec3 emission_color;    // Color of the emission, if the point has one
};


//===========================
// Global variables
//===========================
uint seed;
int bounce_count;
int spp_real;
float rr_chance_real;

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
uniform uint fast_mode;         // Render with minimal setting when frame_count == 0

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

uniform sampler2D u_positions_tex;
uniform sampler2D u_normals_tex;
uniform usampler2D u_sharedVertexMatIndices_tex;
uniform sampler2D u_uvs_tex;
uniform sampler2D u_bvh_tex;    // RGBA32F: BVH nodes (minX, minY, minZ, maxX, maxY, maxZ, left, right)
uniform int u_vertex_count;

// Albedo
uniform sampler2DArray albedo_512;
uniform sampler2DArray albedo_1024;
uniform sampler2DArray albedo_2048;

// Normal
uniform sampler2DArray normal_512;
uniform sampler2DArray normal_1024;
uniform sampler2DArray normal_2048;

// Roughness metalness
uniform sampler2DArray rm_512;
uniform sampler2DArray rm_1024;
uniform sampler2DArray rm_2048;

// Emission
uniform sampler2DArray emission_512;
uniform sampler2DArray emission_1024;
uniform sampler2DArray emission_2048;


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

vec3 get_normal(Material mat, vec2 uv){
    switch(mat.albedoTA_normalTA.w){
        case 1:
            return texture(normal_512, vec3(uv.x, uv.y, mat.albedoTA_normalTA.z)).rgb * 2.0 - vec3(1.0);
        case 2:
            return texture(normal_1024, vec3(uv.x, uv.y, mat.albedoTA_normalTA.z)).rgb * 2.0 - vec3(1.0);
        case 3:
            return texture(normal_2048, vec3(uv.x, uv.y, mat.albedoTA_normalTA.z)).rgb * 2.0 - vec3(1.0);
    }
}

void set_mat_tex_params(inout Material mat, vec2 uv, out vec3 emission_color){
    bool calculate_F0 = false;

    if (mat.rmTA_emissionTA.y != 0) {
        calculate_F0 = true;
        vec2 data;
        switch(mat.rmTA_emissionTA.y){
            case 1: data = texture(rm_512, vec3(uv, mat.rmTA_emissionTA.x)).rg; break;
            case 2: data = texture(rm_1024, vec3(uv, mat.rmTA_emissionTA.x)).rg; break;
            case 3: data = texture(rm_2048, vec3(uv, mat.rmTA_emissionTA.x)).rg; break;
        }
        mat.F0_alpha.w = data.x * data.x;
        mat.rou_met_trs_ref.y = data.y;
    }

    if(mat.albedoTA_normalTA.y != 0){
        calculate_F0 = true;
        switch(mat.albedoTA_normalTA.y){
            case 1: mat.albedo_emission.rgb = texture(albedo_512, vec3(uv, mat.albedoTA_normalTA.x)).rgb; break;
            case 2: mat.albedo_emission.rgb = texture(albedo_1024, vec3(uv, mat.albedoTA_normalTA.x)).rgb; break;
            case 3: mat.albedo_emission.rgb = texture(albedo_2048, vec3(uv, mat.albedoTA_normalTA.x)).rgb; break;
        }
    }

    if(calculate_F0){
        mat.F0_alpha.xyz = mix(vec3(mat.rou_met_trs_ref.w),
                                    mat.albedo_emission.xyz,
                                    mat.rou_met_trs_ref.y);
    }

    if(mat.albedo_emission.a > 0.0 && mat.rmTA_emissionTA.w != 0){
        switch(mat.rmTA_emissionTA.y){
            case 1: emission_color = texture(emission_512, vec3(uv, mat.rmTA_emissionTA.z)).rgb; break;
            case 2: emission_color = texture(emission_1024, vec3(uv, mat.rmTA_emissionTA.z)).rgb; break;
            case 3: emission_color = texture(emission_2048, vec3(uv, mat.rmTA_emissionTA.z)).rgb; break;
        }
    }else{
        emission_color = mat.albedo_emission.xyz;
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
    return apply_gaussian_kernel(color, t);
}

//===========================
// Sphere functions
//===========================
#if NUM_SPHERES > 0

    // PRE: r.dir is already normalized
    bool hit_sphere(const Sphere s, const Ray r, out float d){
        vec3 oc =  r.orig - s.center_radius.xyz;
        
        float half_b = dot(r.dir,oc);
        float c = dot(oc,oc)-s.center_radius.a*s.center_radius.w;

        float discriminant = half_b*half_b - c;
        // If < 0.0 then no solution exists
        if(discriminant < 0.0) return false;

        float sq_disc = sqrt(discriminant);
        d = -half_b - sq_disc;
        if (d < ray_min_distance || d > ray_max_distance){
            d = -half_b + sq_disc;
            if (d < ray_min_distance || d > ray_max_distance)
                return false;
        }

        return true;
    }

    Hit fill_sphere_record(const int s_i, const Ray r, const float t){
        Hit h;
        Sphere s = spheres[s_i];

        h.t = t;
        h.p = r.orig+r.dir*t;
        h.mat = materials[s.mat];

        vec3 s_normal = (h.p-s.center_radius.xyz)/s.center_radius.w;
        set_front_face(s_normal,r.dir,h);
        h.normal = s_normal;

        float v = -0.5 - 0.5 * dot(h.normal, s.v);

        float x = dot(h.normal, s.u);
        float y = dot(h.normal, s.w);

        float u = atan(y, x) * INV_TWO_PI;
        u = u < 0.0 ? u + 1.0 : u;

        h.uv = fract(vec2(u, v) * s.tiling.zw + s.tiling.xy);

        if(h.mat.albedoTA_normalTA.w > 0){
            vec3 n_map = get_normal(h.mat, h.uv);
            vec3 T = normalize(cross(s.v, h.normal));
            vec3 B = normalize(cross(h.normal,T));
            mat3 TBN = mat3(T,B,h.normal);
            h.normal = normalize(TBN * n_map); 
        }

        set_mat_tex_params(h.mat,h.uv,h.emission_color);

        return h;
    }

#endif

//===========================
// Plane functions
//===========================
#if NUM_PLANES > 0

    bool hit_plane(const Plane p, const Ray r, out float t){
        float denom = dot(p.normal_distance.xyz, r.dir);
        if(abs(denom) > 0.0001){
            t = dot((p.normal_distance.xyz*-p.normal_distance.w) - r.orig, p.normal_distance.xyz) / denom;
            return t >= ray_min_distance && t <= ray_max_distance;
        }
        return false;
    }

    Hit fill_plane_record(const int p_i, const Ray r, const float t){
        Hit h;
        Plane p = planes[p_i];

        h.t = t;
        h.p = r.orig + r.dir * t;
        h.mat = materials[int(p.tiling_mat.w)];
        set_front_face(p.normal_distance.xyz,r.dir,h);

        vec3 tangent   = normalize(abs(p.normal_distance.x) > 0.5 ? vec3(0,1,0) : vec3(1,0,0));
        vec3 bitangent = normalize(cross(p.normal_distance.xyz, tangent));

        float u = dot(h.p, tangent);
        float v = dot(h.p, bitangent);

        h.uv = fract(vec2(u, v) * p.tiling_mat.z + p.tiling_mat.xy);

        if(h.mat.albedoTA_normalTA.w > 0){
            vec3 n_map = get_normal(h.mat, h.uv);
            mat3 TBN = mat3(tangent,bitangent,h.normal);
            h.normal = normalize(TBN * n_map); 
        }

        set_mat_tex_params(h.mat,h.uv,h.emission_color);

        return h;
    }

#endif

//===========================
// Triangle functions
//===========================
#if NUM_TRIS > 0

    bool hit_triangle(Triangle tri, const Ray r, out float t, out vec2 uv){
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

        t = dot(edge2, qvec) * invDet;
        if(t < ray_min_distance || t > ray_max_distance) return false;

        float w = 1.0 - u - v;
        uv = tri.uv0_uv1.xy * w + tri.uv0_uv1.zw * u + tri.uv2_mat.xy * v;

        return true;
    }

    Hit fill_tri_record(const int t_i, const Ray r, const float t, const vec2 uv){
        Hit h;
        Triangle tri = triangles[t_i];

        h.t = t;
        h.p = r.orig + r.dir * t;
        h.uv = uv;

        vec3 normal = tri.normal.xyz;
        h.mat = materials[int(tri.uv2_mat.w)];
        set_front_face(normal, r.dir, h);

        if(h.mat.albedoTA_normalTA.w > 0){
            vec3 n_map = get_normal(h.mat, h.uv);
            mat3 TBN = mat3(tri.tangent,tri.bitangent,h.normal);
            h.normal = normalize(TBN * n_map); 
        }

        set_mat_tex_params(h.mat,h.uv,h.emission_color);

        return h;
    }

#endif

//===========================
// Mesh functions
//===========================

// Helper to fetch from 2D texture as if it were 1D
// Assumes texture width is 2048
#define TEX_WIDTH 2048
#define TEX_WIDTH_BITS 11

vec4 fetchTexelFloat(sampler2D tex, int index) {
    ivec2 tex_coord = ivec2(index & (TEX_WIDTH-1), index >> 11);
    return texelFetch(tex, tex_coord, 0);
}

uvec4 fetchTexelUint(usampler2D tex, int index) {
    ivec2 tex_coord = ivec2(index & (TEX_WIDTH-1), index >> 11);
    return texelFetch(tex, tex_coord, 0);
}


bool hit_mesh_triangle(int triIndex, const Ray r, out float t, out MeshTriangleInfo mti){
    // Indices for postions and material
    mti.indices = ivec4(fetchTexelUint(u_sharedVertexMatIndices_tex,triIndex));

    // Reconstruct triangle vertices from positions texture (RGB32F)
    vec3 v0 = fetchTexelFloat(u_positions_tex, mti.indices.r).xyz;
    vec3 v1 = fetchTexelFloat(u_positions_tex, mti.indices.g).xyz;
    vec3 v2 = fetchTexelFloat(u_positions_tex, mti.indices.b).xyz;

    // Moller-Trumbore intersection
    mti.edge1 = v1 - v0;
    mti.edge2 = v2 - v0;
    vec3 pvec = cross(r.dir, mti.edge2);
    float det = dot(mti.edge1, pvec);
    if(abs(det) < 1e-6) return false; // Parallel or nearly parallel

    float invDet = 1.0 / det;
    vec3 tvec = r.orig - v0;
    float u = dot(tvec, pvec) * invDet;
    if(u < 0.0 || u > 1.0) return false;

    vec3 qvec = cross(tvec, mti.edge1);
    float v = dot(r.dir, qvec) * invDet;
    if(v < 0.0 || u + v > 1.0) return false;

    t = dot(mti.edge2, qvec) * invDet;
    if(t < ray_min_distance || t > ray_max_distance) return false;

    mti.uvw = vec3(u,v,1.0 - u - v);

    return true;
}

Hit fill_tri_mesh_record(const MeshTriangleInfo mti, const Ray r, const float t, const int normalStrategy, const int normalOffset){
    
    Hit h;

    h.t = t;
    h.p = r.orig + r.dir * t;
    
    // Get the per vertex uvs
    vec2 uv0 = fetchTexelFloat(u_uvs_tex,mti.indices.r).xy;
    vec2 uv1 = fetchTexelFloat(u_uvs_tex,mti.indices.g).xy;
    vec2 uv2 = fetchTexelFloat(u_uvs_tex,mti.indices.b).xy;

    h.uv = uv0 * mti.uvw.z + uv1 * mti.uvw.x + uv2 * mti.uvw.y;

    h.mat = materials[mti.indices.w];

    // Calculate normal
    if (normalStrategy == 1) {
        // GEOMETRIC (Flat shading)
        h.normal = normalize(cross(mti.edge1, mti.edge2));
    } else {
        // INTERPOLATED (Smooth shading)
        // Fetch vertex normals from texture using normalOffset
        vec3 n0 = fetchTexelFloat(u_normals_tex, mti.indices.r - normalOffset).xyz;
        vec3 n1 = fetchTexelFloat(u_normals_tex, mti.indices.g - normalOffset).xyz;
        vec3 n2 = fetchTexelFloat(u_normals_tex, mti.indices.b - normalOffset).xyz;

        // Interpolate normal using barycentric coordinates
        h.normal = normalize(n0 * mti.uvw.z + n1 * mti.uvw.x + n2 * mti.uvw.y);
    }
    set_front_face(h.normal, r.dir, h);

    // Add normal mapping if aplicable
    if(h.mat.albedoTA_normalTA.w > 0){
        vec3 n_map = get_normal(h.mat, h.uv);

        vec2 deltaUV1 = uv1 - uv0;
        vec2 deltaUV2 = uv2 - uv0;
        float f = 1.0 / (deltaUV1.x * deltaUV2.y - deltaUV2.x * deltaUV1.y);

        vec3 tangent;
        tangent.x = f * (deltaUV2.y * mti.edge1.x - deltaUV1.y * mti.edge2.x);
        tangent.y = f * (deltaUV2.y * mti.edge1.y - deltaUV1.y * mti.edge2.y);
        tangent.z = f * (deltaUV2.y * mti.edge1.z - deltaUV1.y * mti.edge2.z);

        tangent = normalize(tangent);

        tangent = normalize(tangent - dot(tangent, h.normal) * h.normal);

        vec3 bitangent = normalize(cross(h.normal, tangent));

        mat3 TBN = mat3(tangent,bitangent,h.normal);
        h.normal = normalize(TBN * n_map); 
    }

    set_mat_tex_params(h.mat,h.uv,h.emission_color);

    return h;
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
bool hit_mesh_with_bvh(MeshInfo mesh, const Ray r, const float min_t, out float t, out MeshTriangleInfo mti) {
    // Stack for traversal
    // Stack for BVH traversal (max depth 64)
    const int BVH_STACK_DEPTH = 64;
    int stack[BVH_STACK_DEPTH];
    int stackPtr = 0;
    // mesh.bvhOffset is in nodes, but we need to convert to child index (also in nodes)
    // The root node index for this mesh is mesh.bvhOffset
    stack[stackPtr++] = mesh.bvhOffset; // Push root node index
    
    float triangleDistance = min_t;
    bool found = false;
    t = min_t;
    
    while (stackPtr > 0) {
        int currNodeIndex = stack[--stackPtr];
        
        int texelIndex = currNodeIndex * 2;
        vec4 t0 = fetchTexelFloat(u_bvh_tex, texelIndex);
        vec4 t1 = fetchTexelFloat(u_bvh_tex, texelIndex + 1);
        
        vec3 boundsMin = t0.xyz;
        vec3 boundsMax = t1.xyz;
        float data1 = t0.w;
        float data2 = t1.w;
        
        float boundsHitDistance;
        if (!intersectsBounds(r.orig, r.dir, boundsMin, boundsMax, boundsHitDistance) 
            || boundsHitDistance > triangleDistance) {
            continue;
        }
        
        // Leaf detection: data2 is negative for leaves
        bool isLeaf = data2 < 0.0;
        
        if (isLeaf) {
            float t;
            MeshTriangleInfo mti_aux;

            // Leaf node: test triangles
            int count = int(-data2);
            int offset = int(data1);
            
            // Test all triangles in this leaf
            for (int i = 0; i < count; i++) {
                // offset is local to the mesh (from BVH), so we need mesh.startTriangle
                int triIdx = mesh.startTriangle + (offset + i);
                
                if(hit_mesh_triangle(triIdx,r,t,mti_aux)){
                    if(t < triangleDistance){
                        triangleDistance = t;
                        mti = mti_aux;
                        found = true;
                    }
                }
            }

        } else {
            // Internal node - child indices are LOCAL to this mesh (in nodes)
            int leftIndex = int(data1);
            int rightIndex = int(data2);
            
            // Convert to GLOBAL node indices by adding mesh.bvhOffset
            int globalLeft = mesh.bvhOffset + leftIndex;
            int globalRight = mesh.bvhOffset + rightIndex;
            
            // Determine split axis dynamically based on bounds shape
            vec3 size = boundsMax - boundsMin;
            int axis = 0;
            if (size.y > size.x) axis = 1;
            if (size.z > (axis == 0 ? size.x : size.y)) axis = 2;
            
            // Determine traversal order
            bool leftToRight = r.dir[axis] >= 0.0;
            int c1 = leftToRight ? globalLeft : globalRight;
            int c2 = leftToRight ? globalRight : globalLeft;
            
            // Push children to stack (far child first, near child second)
            if (stackPtr + 1 < BVH_STACK_DEPTH) {
                stack[stackPtr++] = c2;
                stack[stackPtr++] = c1;
            }
        }
    }

    t = triangleDistance;

    /* if(found){
        h = fill_tri_mesh_record(mti,r,triangleDistance,
                mesh.normalStrategy,mesh.normalOffset);
    } */
    
    return found;
}

// Brute-force version, check all tris 
bool hit_mesh_bruteforce(MeshInfo mesh, const Ray r, const float min_t, out float t, out MeshTriangleInfo mti){
    bool has_hit = false;

    float t_aux = ray_max_distance;
    MeshTriangleInfo mti_aux;


    for(int i = 0; i < mesh.triangleCount; i++){
        int triIdx = mesh.startTriangle + i;
        if(hit_mesh_triangle(triIdx,r,t_aux,mti_aux)){
            if(t_aux < t){
                t = t_aux;
                mti = mti_aux;
                has_hit = true;
            }
        }
    }


    return has_hit;
}

// Main hit_mesh function
bool hit_mesh(MeshInfo mesh, const Ray r, const float min_t, out float t, out MeshTriangleInfo mti){
    return hit_mesh_with_bvh(mesh, r, min_t, t, mti);
    //return hit_mesh_bruteforce(mesh, r, min_t, t, mti);
}

//===========================
// Scene functions
//===========================
bool hit_scene(Ray r, out Hit h){
    float aux_t;
    int primitive_type = 0;
    int primitive_index = 0;
    vec2 aux_uv, uv;
    MeshTriangleInfo mti, mti_aux;

    h.t = ray_max_distance;


    // Check for sphere hits
    #if NUM_SPHERES > 0
        for(int s_i = 0; s_i < NUM_SPHERES; s_i++){
            Sphere s = spheres[s_i];
            if(hit_sphere(s,r,aux_t)){
                if(aux_t < h.t){
                    h.t = aux_t;
                    primitive_type = 1;
                    primitive_index = s_i;
                }
            }
        }
    #endif

    // Check for plane hits
    #if NUM_PLANES > 0
        for(int p_i = 0; p_i < NUM_PLANES; p_i++) {
            Plane p = planes[p_i];
            if(hit_plane(p,r,aux_t)){
                if(aux_t<h.t){
                    h.t = aux_t;
                    primitive_type = 2;
                    primitive_index = p_i;
                }
            }
        }
    #endif

    // Check for UBO triangle hits
    #if NUM_TRIS > 0
        for(int t_i = 0; t_i < NUM_TRIS; t_i++) {
            Triangle tri = triangles[t_i];
            if(hit_triangle(tri, r, aux_t, aux_uv)){
                if(aux_t < h.t){
                    h.t = aux_t;
                    uv = aux_uv;
                    primitive_type = 3;
                    primitive_index = t_i;
                }
            }
        }
    #endif

    #if NUM_MESHES > 0
        for(int m_i = 0; m_i < NUM_MESHES; m_i++) {
            MeshInfo mesh = meshInfos[m_i];
            if(hit_mesh(mesh, r, h.t, aux_t, mti_aux)){
                if(aux_t < h.t){
                    h.t = aux_t;
                    mti = mti_aux;
                    primitive_type = 4;
                    primitive_index = m_i;
                }
            }
        }
    #endif

    switch(primitive_type){
        #if NUM_SPHERES > 0
            case 1:
                h = fill_sphere_record(primitive_index,r,h.t);break;
        #endif
        #if NUM_PLANES > 0
            case 2:
                h = fill_plane_record(primitive_index,r,h.t);break;
        #endif
        #if NUM_TRIS > 0
            case 3:
                h = fill_tri_record(primitive_index,r,h.t,uv);break;
        #endif
        #if NUM_MESHES > 0
            case 4:
                MeshInfo mesh = meshInfos[primitive_index];
                h = fill_tri_mesh_record(mti,r,h.t,
                        mesh.normalStrategy,mesh.normalOffset);break;
        #endif
    }

    return primitive_type != 0;
}

// Check if ray hits anything before reaching max_t
bool shadow_ray(Ray r, const float d){
    float aux_t;
    vec2 aux_uv;
    MeshTriangleInfo mti_aux;

    // Check for sphere hits
    #if NUM_SPHERES > 0
        for(int s_i = 0; s_i < NUM_SPHERES; s_i++){
            Sphere s = spheres[s_i];
            if(hit_sphere(s,r,aux_t)){
                if(aux_t <= d){
                    return true;
                }
            }
        }
    #endif

    // Check for plane hits
    #if NUM_PLANES > 0
        for(int p_i = 0; p_i < NUM_PLANES; p_i++) {
            Plane p = planes[p_i];
            if(hit_plane(p,r,aux_t)){
                if(aux_t <= d){
                    return true;
                }
            }
        }
    #endif

    // Check for UBO triangle hits
    #if NUM_TRIS > 0
        for(int t_i = 0; t_i < NUM_TRIS; t_i++) {
            Triangle tri = triangles[t_i];
            if(hit_triangle(tri, r, aux_t, aux_uv)){
                if(aux_t <= d){
                    return true;
                }
            }
        }
    #endif

    #if NUM_MESHES > 0
        for(int m_i = 0; m_i < NUM_MESHES; m_i++) {
            MeshInfo mesh = meshInfos[m_i];
            if(hit_mesh(mesh, r, d, aux_t, mti_aux)){
                if(aux_t <= d){
                    return true;
                }
            }
        }
    #endif

    return false;
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
    #if SKYBOX_TYPE == 0
        return skybox_color_image(r);
    #elif SKYBOX_TYPE == 1
        return skybox_color_black(r);
    #else
        return skybox_color_day(r);
    #endif
}

//===========================
// Material functions
//===========================

// Fresnel-Schlick aproximation to reflectance
vec3 reflectance(float cos_theta, vec3 F0) {
    return F0 + (1.0 - F0) * pow(1.0 - cos_theta, 5.0);
}

// Normal distribution function. GGX
float ggx_distribution(float NoH, float alpha2){
    float b = NoH * NoH * (alpha2 - 1.0) + 1.0;
    return alpha2 * INV_PI / (b * b);
}

float lambda_GGX(float cos_theta, float alpha2) {
    if(cos_theta <= 1e-5) return 0.0;
    
    float cos2 = cos_theta * cos_theta;
    float sin2 = 1.0 - cos2;
    float tan2 = sin2 / cos2;
    
    return (-1.0 + sqrt(1.0 + alpha2 * tan2)) * 0.5;
}

float G_Smith_Full(float NoV, float NoL, float alpha2) {
    float lambda_i = lambda_GGX(abs(NoL), alpha2);
    float lambda_o = lambda_GGX(abs(NoV), alpha2);
    
    return 1.0 / (1.0 + lambda_i + lambda_o);
}

float G1_GGX_Schlick(float AoB, float k) {
    return max(AoB, 1e-5) / (AoB * (1.0 - k) + k);
}

float G_Smith_Fast(float NoV, float NoL, float alpha) {
    float k = alpha * 0.5;
    float one_k = 1.0 - k;
    // In line G1_GGX_Schlick
    float g1_v = max(NoV,1e-5) / (NoV * one_k + k);
    float g1_l = max(NoL,1e-5) / (NoL * one_k + k);
    return g1_v * g1_l;

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



vec3 eval_mat(Hit h, vec3 Vin, out vec3 Vout){

    if(rr_chance_real < random()) return vec3(0.0);

    // Uv check
    //if(h.uv.x >= 0.0) return vec3(h.uv.x,h.uv.y,0.0);

    vec3 V = -Vin;
    vec3 N = h.normal;
    vec3 F0 = h.mat.F0_alpha.xyz;
    vec3 albedo = h.mat.albedo_emission.rgb;
    float alpha = h.mat.F0_alpha.w;

    float alpha2 = alpha*alpha;
    vec3 H = sample_ggx(alpha,V,N);
    
    float eta = h.front_face? 1.0/h.mat.subsurface_color_ior.w : h.mat.subsurface_color_ior.w;
    
    float NoV = dot(N, V);
    float NoVabs = abs(NoV);
    float NoH = dot(N, H);
    float VoH = dot(V, H);

    bool transmissive = h.mat.rou_met_trs_ref.z > random();

    vec3 F = reflectance(VoH, F0);
    
    bool transmited;
    if(transmissive){
        float sin_theta = sqrt(1.0 - VoH*VoH);
        bool cannot_refract = eta * sin_theta > 1.0;

        if(cannot_refract || F.x > random()){
            Vout = reflect(-V,H);
            transmited = false;
        }else{
            Vout = refract(-V,H,eta);
            transmited = true;
        }
    }else{
        Vout = reflect(-V,H);
        transmited = false;
    }

    float LoH = dot(Vout, H);
    float LoN = dot(Vout, N);
    float LoNabs = abs(LoN);

    float D = ggx_distribution(NoH,alpha2);
    float pdf_ggx = (D * abs(NoH)) / (4.0 * max(NoVabs, 1e-5));

    if(transmited){
        float G = G_Smith_Full(NoVabs, LoNabs, alpha2);

        vec3 T = vec3(1.0) - F;
        
        float denom = VoH + eta * LoH;
        float denom2 = max(denom * denom, 1e-10);
        float jacobian = (eta * eta * abs(LoH * VoH)) / denom2;

        vec3 btdf = (T * D * G * jacobian) / 
                    (4.0 * max(NoVabs, 1e-5) * max(LoNabs, 1e-5));

        return h.mat.subsurface_color_ior.rgb * btdf * LoNabs / max(pdf_ggx*jacobian, 1e-5);

    }else{
        float G = G_Smith_Fast(NoV,LoN,alpha);

        vec3 f_specular = h.mat.specular_color * (F*D*G) / (4.0 *  max(NoV * LoN, 1e-5));

        albedo *= vec3(1.0) - F;
        albedo *= (1.0 - h.mat.rou_met_trs_ref.y);

        vec3 f_diffuse = albedo * INV_PI;

        vec3 fr = f_diffuse + f_specular;

        return fr * max(LoN,1e-5) / max(pdf_ggx, 1e-5);
    }
        
}


//===========================
// Main functions
//===========================

vec3 get_direct_light(Hit h, Ray r, float total_t){
    //if(h.mat.rou_met_trs_ref.z > random()) return vec3(0.0,0.0,0.0);
    Hit aux;
    vec3 ret = vec3(0);

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
            Ray r_pl = Ray(h.p,normalize(l.position-h.p));
            //if(!hit_scene(r_pl,aux) || aux.t >= d){
            if(!shadow_ray(r_pl,d)){
                vec3 F0 = h.mat.F0_alpha.rgb;
                float alpha = h.mat.F0_alpha.w;
                float alpha2 = alpha*alpha;
                vec3 V = -r.dir;
                vec3 H = normalize(V+r_pl.dir);
                float NoV = dot(h.normal, V);
                float NoH = dot(h.normal, H);
                float NoVabs = abs(NoV);
                float VoH = dot(V, H);
                float LoN = dot(r_pl.dir, h.normal);

                vec3  F = reflectance(VoH, F0);
                float D = ggx_distribution(NoH,alpha2);
                float G = G_Smith_Fast(NoV,LoN,alpha);

                vec3 f_specular = h.mat.specular_color * (F*D*G) / (4.0 *  max(NoV * LoN, 1e-5));

                vec3 radiance = h.mat.albedo_emission.xyz * l.color_power.xyz * l.color_power.w / d2;

                vec3 rhoD = h.mat.albedo_emission.xyz;
                rhoD *= vec3(1.0) - F;
                rhoD *= (1.0 - h.mat.rou_met_trs_ref.y) * (1.0 - h.mat.rou_met_trs_ref.z);

                vec3 f_diffuse = rhoD * INV_PI;

                vec3 fr = f_diffuse + f_specular;
                
                ret += apply_kernel(
                    radiance * fr * max(LoN,1e-5),
                    total_plus_pl);
            }
        }
    #endif

    return ret;
}

// Cast the given ray and returns the computed color
vec3 cast_ray(Ray r){
    vec3 color = vec3(0.0);
    Hit h;
    vec3 atenuation = vec3(1.0);
    vec3 new_direction;
    float rr_inv = 1.0 / rr_chance_real;
    float total_t = 0.0;
    float prev_hit_ior = 1.0;

    bounce_count = 0;
    for(int i = 0; i < bounce_hard_limit; i++) {
        
        if(hit_scene(r,h)){

            // Add path length and adjust for ior of last hit
            total_t += h.t * prev_hit_ior;
            prev_hit_ior = h.mat.subsurface_color_ior.w;

            // Max distance check
            if(total_t > ray_range.y) break;

            // Emissive material & Min distance check
            if(h.mat.albedo_emission.a > 0.0 && 
                any(greaterThan(h.emission_color, vec3(0.0)))){
                // Min distance check
                if(total_t < ray_range.x) break;

                color += apply_kernel(
                    atenuation * h.emission_color.rgb*h.mat.albedo_emission.a,
                    total_t);
                break; 
            }

            // Get light from all light sources
            //if(bounce_count == 0){
            if(bounce_count < 2){
                vec3 direct_light = get_direct_light(h,r,total_t);
                color += direct_light*atenuation;
            }

            atenuation *= eval_mat(h,r.dir,new_direction) * rr_inv;
            //return atenuation;
            
            // 0 atennuation check for termination
            if(length(atenuation) <= minimun_atenuation) break;

            r.dir = new_direction;
            r.orig = h.p;
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
    vec2 ndc;
    if(length(resolution.xy)>0.0){
        ndc = 2.0*(uv + sample_square() / resolution.xy) -1.0;
    }else{
        ndc = 2.0*(uv) -1.0;
    }
    //vec2 aperture = sample_square()*cam.thin_lense.x;
    vec2 aperture = sample_disc()/2.0*cam.thin_lense.x;

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

    // Check for fast mode
    spp_real = (fast_mode == 1u && frames_acummulated == 0u)? 1 : int(spp);
    rr_chance_real = (fast_mode == 1u && frames_acummulated == 0u)? 0.0 : rr_chance;

    // Calculate mean color of pixel
    vec2 uv = (gl_FragCoord.xy)/resolution.xy;
    vec3 samples_sum = vec3(0.0);
    for(int i = 0; i<spp_real; i++){
        Ray r = get_ray(uv);
        samples_sum += cast_ray(r);
    }
    outColor = vec4(samples_sum/float(spp_real),1.0);

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
        // Linear mean
        float f = float(frames_acummulated);
        outColor.rgb = (last_color * (f - 1.0) + outColor.rgb) / f;
        // Exponetianl mean
        //outColor.rgb = mix(last_color, outColor.rgb, 1.0 / float(frames_acummulated + 1u));
        // Mix
        //float inv_f = 1.0/float(frames_acummulated);
        //outColor.rgb = mix(last_color,outColor.rgb,inv_f);
    }

}

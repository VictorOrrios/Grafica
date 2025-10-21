/**
 * Mesh Loading Examples
 * 
 * This file demonstrates how to load and use meshes in your scene
 * All loading is synchronous using XMLHttpRequest (works in browser only)
 */

import { Scene } from "./scene";
import { MeshLoader, OBJLoader, FBXLoader } from "./loaders/MeshLoader";
import { Material } from "./Primitives/Material";
import { Vector3 } from "math.gl";

/**
 * Example 1: Load a single OBJ file (synchronous)
 */
export function loadSingleMesh(scene: Scene) {
    try {
        // Load and parse mesh (fully sync in browser)
        const mesh = MeshLoader.load("/models/mymodel.obj", "MyModel");
        
        // Create a material for it
        const material = new Material(new Vector3(0.8, 0.8, 0.8));
        const materialIndex = (scene as any)["addMaterial"](material);
        
        // Add to scene
        scene.addMesh(mesh, materialIndex);
        
        console.log(`Added ${mesh.toString()} to scene`);
    } catch (error) {
        console.error("Failed to load mesh:", error);
    }
}

/**
 * Example 2: Load mesh by parsing content directly (fully synchronous)
 */
export function loadWithContent(scene: Scene, content: string) {
    try {
        // Parse mesh (sync)
        const mesh = OBJLoader.parse(content, "MyModel");
        
        // Add to scene
        const material = new Material(new Vector3(1, 0, 0));
        const materialIndex = (scene as any)["addMaterial"](material);
        scene.addMesh(mesh, materialIndex);
    } catch (error) {
        console.error("Failed to load mesh:", error);
    }
}

/**
 * Example 3: Load multiple meshes (fully synchronous)
 */
export function loadMultipleMeshes(scene: Scene) {
    try {
        // Load all files (sync - from cache)
        const meshes = MeshLoader.loadMultiple([
            "/models/model1.obj",
            "/models/model2.fbx",
            "/models/model3.obj"
        ]);
        
        // Create materials
        const red = new Material(new Vector3(1, 0, 0));
        const green = new Material(new Vector3(0, 1, 0));
        const blue = new Material(new Vector3(0, 0, 1));
        
        const materials = [red, green, blue];
        
        // Add each mesh with different material
        meshes.forEach((mesh, i) => {
            const matIndex = (scene as any)["addMaterial"](materials[i % materials.length]);
            scene.addMesh(mesh, matIndex);
        });
    } catch (error) {
        console.error("Failed to load meshes:", error);
    }
}

/**
 * Example 4: Load and transform a mesh (fully synchronous)
 */
export function loadTransformedMesh(scene: Scene) {
    try {
        // Load and parse (sync - from cache)
        const mesh = MeshLoader.load("/models/model.obj", "TransformedModel");
        
        // Transform it
        mesh.translate(new Vector3(2, 0, 0));    // Move right
        mesh.scale(new Vector3(0.5, 0.5, 0.5)); // Scale down
        
        // Add to scene
        const material = new Material(new Vector3(1, 1, 0));
        const matIndex = (scene as any)["addMaterial"](material);
        scene.addMesh(mesh, matIndex);
    } catch (error) {
        console.error("Failed to load mesh:", error);
    }
}

/**
 * Example 5: Load mesh with error handling (fully synchronous)
 */
export function loadMeshSafe(scene: Scene, url: string) {
    try {
        const mesh = MeshLoader.load(url);
        
        if (mesh.getTriangleCount() === 0) {
            console.warn(`Mesh ${mesh.name} has no triangles!`);
            return;
        }
        
        const material = new Material(new Vector3(0.7, 0.7, 0.7));
        const matIndex = (scene as any)["addMaterial"](material);
        scene.addMesh(mesh, matIndex);
        
        console.log(`✓ Successfully loaded and added ${mesh.toString()}`);
    } catch (error) {
        console.error(`✗ Failed to load mesh from ${url}:`, error);
    }
}

/**
 * Example 6: Create a scene with meshes (fully synchronous)
 */
export function createMeshScene(scene: Scene) {
    // Create materials
    const white = new Material(new Vector3(1, 1, 1));
    const yellow = new Material(new Vector3(1, 1, 0));
    const cyan = new Material(new Vector3(0, 1, 1));
    
    const whiteIdx = (scene as any)["addMaterial"](white);
    const yellowIdx = (scene as any)["addMaterial"](yellow);
    const cyanIdx = (scene as any)["addMaterial"](cyan);
    
    // Load meshes (all sync - from cache)
    try {
        const model1 = MeshLoader.load("/models/teapot.obj", "Teapot");
        model1.translate(new Vector3(-2, 0, 0));
        scene.addMesh(model1, yellowIdx);
        
        const model2 = MeshLoader.load("/models/bunny.obj", "Bunny");
        model2.translate(new Vector3(2, 0, 0));
        scene.addMesh(model2, cyanIdx);
        
        const model3 = MeshLoader.load("/models/dragon.obj", "Dragon");
        model3.scale(new Vector3(0.5, 0.5, 0.5));
        scene.addMesh(model3, whiteIdx);
        
        console.log('✓ Mesh scene created successfully');
    } catch (error) {
        console.error('✗ Failed to create mesh scene:', error);
    }
}

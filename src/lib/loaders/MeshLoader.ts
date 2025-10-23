import { Mesh } from "../Primitives/Mesh";
import { OBJLoader } from "./OBJLoader";
import { FBXLoader } from "./FBXLoader";
import { SyncFileLoader } from "./SyncFileLoader";

/**
 * Unified Mesh Loader
 * Asynchronous API for loading from URLs
 */
export class MeshLoader {
    /**
     * Load a mesh from file content (synchronous)
     * @param content - File content as string
     * @param format - File format ('obj' or 'fbx')
     * @param name - Optional name for the mesh
     * @returns Mesh object
     */
    public static parse(content: string, format: 'obj' | 'fbx', name?: string): Mesh {
        switch (format) {
            case 'obj':
                return OBJLoader.parse(content, name || 'mesh');
            
            case 'fbx':
                return FBXLoader.parse(content, name || 'mesh');
            
            default:
                throw new Error(`Unsupported mesh format: ${format}`);
        }
    }

    /**
     * Load a mesh from URL (asynchronous)
     * @param url - URL to the mesh file
     * @param name - Optional name for the mesh
     * @returns Promise resolving to Mesh object
     */
    public static async load(url: string, name?: string): Promise<Mesh> {
        const content = await SyncFileLoader.loadText(url);
        const format = this.detectFormat(url);
        
        if (!format) {
            throw new Error(`Cannot detect format from URL: ${url}`);
        }
        
        return this.parse(content, format, name || this.extractName(url));
    }

    /**
     * Load multiple meshes from URLs (asynchronous)
     * @param urls - Array of URLs to mesh files
     * @returns Promise resolving to array of Mesh objects
     */
    public static async loadMultiple(urls: string[]): Promise<Mesh[]> {
        return Promise.all(urls.map(url => this.load(url)));
    }

    /**
     * Parse multiple meshes from content (synchronous)
     * @param files - Array of {content, format, name}
     * @returns Array of Mesh objects
     */
    public static parseMultiple(files: Array<{content: string, format: 'obj' | 'fbx', name?: string}>): Mesh[] {
        return files.map(file => this.parse(file.content, file.format, file.name));
    }

    /**
     * Detect format from file extension
     */
    public static detectFormat(filename: string): 'obj' | 'fbx' | null {
        const ext = filename.split('.').pop()?.toLowerCase();
        if (ext === 'obj') return 'obj';
        if (ext === 'fbx') return 'fbx';
        return null;
    }

    /**
     * Extract mesh name from URL
     */
    private static extractName(url: string): string {
        const parts = url.split('/');
        const filename = parts[parts.length - 1];
        return filename.replace(/\.(obj|fbx|OBJ|FBX)$/, '');
    }
}

// Re-export individual loaders for direct use
export { OBJLoader } from "./OBJLoader";
export { FBXLoader } from "./FBXLoader";
export { SyncFileLoader } from "./SyncFileLoader";

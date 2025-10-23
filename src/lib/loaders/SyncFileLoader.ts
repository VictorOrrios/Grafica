/**
 * Asynchronous file loader using fetch
 * Works in browser environment
 */
export class SyncFileLoader {
    /**
     * Load text file asynchronously using fetch
     * @param url - The URL to load
     * @returns Promise resolving to the file content as text
     * @throws Error if the request fails
     */
    static async loadText(url: string): Promise<string> {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to load ${url}: HTTP ${response.status}`);
        }
        return await response.text();
    }
}

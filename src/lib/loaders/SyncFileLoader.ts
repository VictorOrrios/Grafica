/**
 * Synchronous file loader using XMLHttpRequest
 * Only works in browser environment
 */
export class SyncFileLoader {
    /**
     * Load text file synchronously using XMLHttpRequest
     * @param url - The URL to load
     * @returns The file content as text
     * @throws Error if the request fails or if not in browser environment
     */
    static loadText(url: string): string {
        // Check if we're in a browser environment
        if (typeof XMLHttpRequest === 'undefined') {
            throw new Error(
                `XMLHttpRequest is not available (likely running in Node.js/SSR context).\n` +
                `File: ${url}\n` +
                `This error occurs during build/SSR but won't affect browser runtime.`
            );
        }

        const xhr = new XMLHttpRequest();
        xhr.open('GET', url, false); // false = synchronous
        xhr.send();

        if (xhr.status === 200) {
            return xhr.responseText;
        } else {
            throw new Error(`Failed to load ${url}: HTTP ${xhr.status}`);
        }
    }
}

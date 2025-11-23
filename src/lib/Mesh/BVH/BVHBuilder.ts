export interface BVHNode {
    min: Float32Array; // [x, y, z]
    max: Float32Array; // [x, y, z]
    isLeaf: boolean;
    // For leaf:
    triangleOffset: number;
    triangleCount: number;
    // For internal:
    left: BVHNode | null;
    right: BVHNode | null;
}

export class BVHBuilder {
    // Configuration
    private static readonly MAX_TRIANGLES_PER_LEAF = 4;
    private static readonly MAX_DEPTH = 40;
    private static readonly EPSILON = 0.001; // Padding for AABBs

    public static build(
        positions: Float32Array,
        indices: Uint32Array
    ): { root: BVHNode, sortedTriangleIndices: Uint32Array } {
        const numTriangles = indices.length / 3;
        const triangleIndices = new Uint32Array(numTriangles);
        for (let i = 0; i < numTriangles; i++) triangleIndices[i] = i;

        // Pre-compute centroids and bounds for all triangles to speed up build
        const centroids = new Float32Array(numTriangles * 3);
        const triBounds = new Float32Array(numTriangles * 6); // minXYZ, maxXYZ

        for (let i = 0; i < numTriangles; i++) {
            const i3 = i * 3;
            const idx0 = indices[i3] * 3;
            const idx1 = indices[i3 + 1] * 3;
            const idx2 = indices[i3 + 2] * 3;

            const v0x = positions[idx0], v0y = positions[idx0 + 1], v0z = positions[idx0 + 2];
            const v1x = positions[idx1], v1y = positions[idx1 + 1], v1z = positions[idx1 + 2];
            const v2x = positions[idx2], v2y = positions[idx2 + 1], v2z = positions[idx2 + 2];

            // Centroid
            centroids[i3] = (v0x + v1x + v2x) / 3;
            centroids[i3 + 1] = (v0y + v1y + v2y) / 3;
            centroids[i3 + 2] = (v0z + v1z + v2z) / 3;

            // Bounds
            triBounds[i * 6] = Math.min(v0x, v1x, v2x);
            triBounds[i * 6 + 1] = Math.min(v0y, v1y, v2y);
            triBounds[i * 6 + 2] = Math.min(v0z, v1z, v2z);
            triBounds[i * 6 + 3] = Math.max(v0x, v1x, v2x);
            triBounds[i * 6 + 4] = Math.max(v0y, v1y, v2y);
            triBounds[i * 6 + 5] = Math.max(v0z, v1z, v2z);
        }

        const root = this.split(triangleIndices, 0, numTriangles, centroids, triBounds, 0);

        return { root, sortedTriangleIndices: triangleIndices };
    }

    private static split(
        triIndices: Uint32Array,
        offset: number,
        count: number,
        centroids: Float32Array,
        triBounds: Float32Array,
        depth: number
    ): BVHNode {
        const node: BVHNode = {
            min: new Float32Array([Infinity, Infinity, Infinity]),
            max: new Float32Array([-Infinity, -Infinity, -Infinity]),
            isLeaf: false,
            triangleOffset: offset,
            triangleCount: count,
            left: null,
            right: null
        };

        // Calculate bounds of this node
        for (let i = 0; i < count; i++) {
            const triIdx = triIndices[offset + i];
            const base = triIdx * 6;
            node.min[0] = Math.min(node.min[0], triBounds[base]);
            node.min[1] = Math.min(node.min[1], triBounds[base + 1]);
            node.min[2] = Math.min(node.min[2], triBounds[base + 2]);
            node.max[0] = Math.max(node.max[0], triBounds[base + 3]);
            node.max[1] = Math.max(node.max[1], triBounds[base + 4]);
            node.max[2] = Math.max(node.max[2], triBounds[base + 5]);
        }

        // CRITICAL: Pad bounds to prevent zero-thickness AABBs
        for (let i = 0; i < 3; i++) {
            node.min[i] -= this.EPSILON;
            node.max[i] += this.EPSILON;
        }

        // Leaf criteria
        if (count <= this.MAX_TRIANGLES_PER_LEAF || depth >= this.MAX_DEPTH) {
            node.isLeaf = true;
            return node;
        }

        // Split strategy: Midpoint of Centroids along longest axis
        const size = [
            node.max[0] - node.min[0],
            node.max[1] - node.min[1],
            node.max[2] - node.min[2]
        ];
        let axis = 0;
        if (size[1] > size[0]) axis = 1;
        if (size[2] > size[axis]) axis = 2;

        // Calculate centroid bounds to find midpoint
        let minC = Infinity, maxC = -Infinity;
        for (let i = 0; i < count; i++) {
            const triIdx = triIndices[offset + i];
            const c = centroids[triIdx * 3 + axis];
            minC = Math.min(minC, c);
            maxC = Math.max(maxC, c);
        }

        const mid = (minC + maxC) / 2;

        // Partition triangles
        let left = offset;
        let right = offset + count - 1;

        while (left <= right) {
            const triIdx = triIndices[left];
            const c = centroids[triIdx * 3 + axis];
            if (c < mid) {
                left++;
            } else {
                // Swap
                const temp = triIndices[left];
                triIndices[left] = triIndices[right];
                triIndices[right] = temp;
                right--;
            }
        }

        const leftCount = left - offset;

        // Check for failed split (all triangles on one side)
        if (leftCount === 0 || leftCount === count) {
            node.isLeaf = true;
            return node;
        }

        node.left = this.split(triIndices, offset, leftCount, centroids, triBounds, depth + 1);
        node.right = this.split(triIndices, left, count - leftCount, centroids, triBounds, depth + 1);

        return node;
    }

    public static flatten(root: BVHNode): Float32Array {
        const flatNodes: number[] = [];
        this.flattenRecursive(root, flatNodes);
        return new Float32Array(flatNodes);
    }

    private static flattenRecursive(node: BVHNode, buffer: number[]) {
        const nodeIndex = buffer.length / 8;

        // Placeholder for node data
        // Layout: [minX, minY, minZ, data1, maxX, maxY, maxZ, data2]
        // data1: leftChildIndex (internal) OR triangleOffset (leaf)
        // data2: rightChildIndex (internal) OR -triangleCount (leaf)

        // Push 8 zeros
        for (let i = 0; i < 8; i++) buffer.push(0);

        buffer[nodeIndex * 8 + 0] = node.min[0];
        buffer[nodeIndex * 8 + 1] = node.min[1];
        buffer[nodeIndex * 8 + 2] = node.min[2];
        buffer[nodeIndex * 8 + 4] = node.max[0];
        buffer[nodeIndex * 8 + 5] = node.max[1];
        buffer[nodeIndex * 8 + 6] = node.max[2];

        if (node.isLeaf) {
            buffer[nodeIndex * 8 + 3] = node.triangleOffset; // data1
            buffer[nodeIndex * 8 + 7] = -node.triangleCount; // data2 (negative = leaf)
        } else {
            // Internal node
            // Recursively flatten left
            const leftIndex = (buffer.length / 8);
            this.flattenRecursive(node.left!, buffer);

            // Recursively flatten right
            const rightIndex = (buffer.length / 8);
            this.flattenRecursive(node.right!, buffer);

            // Update current node with child indices
            buffer[nodeIndex * 8 + 3] = leftIndex;  // data1
            buffer[nodeIndex * 8 + 7] = rightIndex; // data2
        }
    }
}

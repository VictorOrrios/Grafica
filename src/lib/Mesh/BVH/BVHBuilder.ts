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

        const root = this.split_bin_sah(triangleIndices, 0, numTriangles, centroids, triBounds, 0);

        return { root, sortedTriangleIndices: triangleIndices };
    }

    private static split_middle(
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
            this.expandBounds(node.min,node.max,triBounds,base)
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

        node.left = this.split_middle(triIndices, offset, leftCount, centroids, triBounds, depth + 1);
        node.right = this.split_middle(triIndices, left, count - leftCount, centroids, triBounds, depth + 1);

        return node;
    }

    private static split_bin_sah(
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

        
        const BINS = 12; // Num of bins (check cuts) to use 
        const TRAVERSAL_COST = 1.0;
        const INTERSECTION_COST = 5.0;

        // Calculate bounds of this node
        for (let i = 0; i < count; i++) {
            const triIdx = triIndices[offset + i];
            const base = triIdx * 6;
            this.expandBounds(node.min,node.max,triBounds,base)
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

        // Calculate node surface area (cube)
        const nodeSize = [
            node.max[0] - node.min[0],
            node.max[1] - node.min[1],
            node.max[2] - node.min[2]
        ];
        const nodeArea = this.getArea(node.min,node.max)

        let bestAxis = -1;
        let bestBin = -1;
        let bestCost = Infinity;
        let bestSplitPos = 0;


        for (let axis = 0; axis < 3; axis++) {

            const axisRange = nodeSize[axis];
            if (axisRange <= 0) continue;

            const binBounds: Array<{
                min: Float32Array,
                max: Float32Array,
                count: number
            }> = [];

            for (let b = 0; b < BINS; b++) {
                binBounds.push({
                    min: new Float32Array([Infinity, Infinity, Infinity]),
                    max: new Float32Array([-Infinity, -Infinity, -Infinity]),
                    count: 0
                });
            }

            // Fill bins with tris based on centroids
            for (let i = 0; i < count; i++) {
                const triIdx = triIndices[offset + i];
                const c = centroids[triIdx * 3 + axis];

                // Calculate best closest bin
                let binIdx = Math.floor(BINS * (c - node.min[axis]) / axisRange);
                binIdx = Math.max(0, Math.min(BINS - 1, binIdx));

                const bin = binBounds[binIdx];
                bin.count++;

                const base = triIdx * 6;
                this.expandBounds(bin.min,bin.max,triBounds,base);
            }

            // Accumulation from left to right
            const leftAccum: Array<{
                min: Float32Array,
                max: Float32Array,
                count: number
            }> = [];

            let leftMin = new Float32Array([Infinity, Infinity, Infinity]);
            let leftMax = new Float32Array([-Infinity, -Infinity, -Infinity]);
            let leftCount = 0;

            for (let bin = 0; bin < BINS; bin++) {
                if (binBounds[bin].count > 0) {
                    for (let j = 0; j < 3; j++) {
                        leftMin[j] = Math.min(leftMin[j], binBounds[bin].min[j]);
                        leftMax[j] = Math.max(leftMax[j], binBounds[bin].max[j]);
                    }
                    leftCount += binBounds[bin].count;
                }
                
                leftAccum.push({
                    min: new Float32Array(leftMin),
                    max: new Float32Array(leftMax),
                    count: leftCount
                });
            }

            // Accumulation from right to left
            const rightAccum: Array<{
                min: Float32Array,
                max: Float32Array,
                count: number
            }> = [];

            let rightMin = new Float32Array([Infinity, Infinity, Infinity]);
            let rightMax = new Float32Array([-Infinity, -Infinity, -Infinity]);
            let rightCount = 0;

            for (let bin = BINS - 1; bin >= 0; bin--) {
                if (binBounds[bin].count > 0) {
                    for (let j = 0; j < 3; j++) {
                        rightMin[j] = Math.min(rightMin[j], binBounds[bin].min[j]);
                        rightMax[j] = Math.max(rightMax[j], binBounds[bin].max[j]);
                    }
                    rightCount += binBounds[bin].count;
                }
                
                rightAccum[bin] = {
                    min: new Float32Array(rightMin),
                    max: new Float32Array(rightMax),
                    count: rightCount
                };
            }

            // Evaluate splits between bins
            for (let split = 0; split < BINS - 1; split++) {
                const leftInfo = leftAccum[split];
                const rightInfo = rightAccum[split + 1];
                
                if (leftInfo.count === 0 || rightInfo.count === 0) {
                    continue;
                }

                // Calculate surface areas
                const leftArea = this.getArea(leftInfo.min,leftInfo.max)
                const rightArea = this.getArea(rightInfo.min,rightInfo.max)

                // Calculate SAH cost
                const cost = TRAVERSAL_COST +
                    (leftArea / nodeArea) * INTERSECTION_COST * leftInfo.count +
                    (rightArea / nodeArea) * INTERSECTION_COST * rightInfo.count;

                if (cost < bestCost) {
                    bestCost = cost;
                    bestAxis = axis;
                    bestBin = split;
                    bestSplitPos = node.min[axis] + ((split + 1) * axisRange) / BINS;
                }
            }
        }

        // If no good split found, create leaf
        if (bestAxis === -1 || bestCost >= INTERSECTION_COST * count) {
            node.isLeaf = true;
            return node;
        }

        // Partition triangles based on best split
        let left = offset;
        let right = offset + count - 1;

        while (left <= right) {
            const triIdx = triIndices[left];
            const c = centroids[triIdx * 3 + bestAxis];
            
            if (c < bestSplitPos) {
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

        // Check for failed split
        if (leftCount === 0 || leftCount === count) {
            node.isLeaf = true;
            return node;
        }

        // Recursively build children
        node.left = this.split_bin_sah(triIndices, offset, leftCount, centroids, triBounds, depth + 1);
        node.right = this.split_bin_sah(triIndices, left, count - leftCount, centroids, triBounds, depth + 1);

        return node;
    }

    private static getArea(min:Float32Array,max:Float32Array):number{
        const boundSize = [
            max[0] - min[0],
            max[1] - min[1],
            max[2] - min[2]
        ];
        return 2 * (boundSize[0] * boundSize[1] + boundSize[1] * boundSize[2] + boundSize[2] * boundSize[0]);
    }

    private static expandBounds(min:Float32Array,max:Float32Array,bounds:Float32Array,offset:number){
        for (let i = 0; i < 3; i++) {
            min[i] = Math.min(min[i],bounds[offset+i])
            max[i] = Math.max(max[i],bounds[offset+3+i])
        }
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

# Path Tracing and Transient Rendering Engine

This project is a high-performance web-based rendering engine implemented using WebGL 2.0. It features a Physically Based Rendering (PBR) pipeline with support for both standard path tracing and advanced transient rendering, allowing for the visualization of light propagation over time.

## Main Dependencies

The core functionality of the project relies on the following libraries:

- **Svelte 5 & Vite**: Frontend framework and build tool for the user interface and development environment.
- **Three.js**: Used for utility functions, math operations, and as a foundation for complex geometry loaders (OBJ, GLTF).
- **math.gl**: High-performance math library for vector and matrix operations.
- **GLSL (WebGL 2.0)**: The core rendering logic is implemented in fragment shaders for GPU-accelerated computing.
- **Jimp**: Used for image processing and texture preparation on the CPU.

## Getting Started

### Compilation and Execution

To run the project locally, ensure you have Node.js installed on your system. Follow these steps:

1.  **Install dependencies**:
    ```bash
    npm install
    ```

2.  **Start the development server**:
    ```bash
    npm run dev
    ```

3.  **Build for production**:
    ```bash
    npm run build
    ```

Once the development server is running, the application will be accessible at `http://localhost:5173`.

## Scene Modification

The engine allows for complex scene configurations, including geometry, materials, and lighting. Scene definitions are managed within `src/lib/scene.ts`.

To modify a scene or create a new one:

1.  **Define Materials**: Use the `Material` class to specify albedo, roughness, metalness, and emission properties.
2.  **Add Geometry**: Utilize methods like `addSphere`, `addPlane`, or `addGLTFModel` to populate the 3D environment.
3.  **Configure Lighting**: Add point lights via `PointLight` or create area lights by assigning emissive materials to geometric primitives.
4.  **Set Initial Parameters**: Adjust camera position, FOV, and rendering settings (such as sample count or transient ranges) in the `initialParams` object.

## Credits

### Authors
- **Víctor Orrios Barón**
- **José Miguel Quílez Vergara**

## License

This work is licensed under a [Creative Commons Attribution 4.0 International License](https://creativecommons.org/licenses/by/4.0/).

Individual components and libraries integrated into this project remain under their respective original licenses.

# High-Quality IFC to GLB Converter

This Node.js utility provides a robust pipeline for converting **IFC (Industry Foundation Classes)** building models into **GLB (GL Transmission Format)** for high-performance web rendering. 

It is specifically designed to work with the [ifcLiteViewer](https://github.com/textonym/ifcLiteViewer) for Power BI, ensuring optimal geometry tessellation and material adherence.

## Workflow

The conversion process utilizes a headless 3D environment to process and export the geometry:

```mermaid
sequenceDiagram
    participant FS as File System
    participant IFC as web-ifc (WASM)
    participant T3 as Three.js Scene
    participant JSDOM as JSDOM (Headless)
    participant EXP as GLTFExporter
    
    FS->>IFC: Read model.ifc
    IFC->>IFC: Process Geometries (64 segments)
    IFC->>T3: Stream All Meshes
    T3->>T3: Map Materials & Colors
    JSDOM->>EXP: Provide Browser Polyfills
    EXP->>FS: Export model.glb
```

## Features

- **High-Precision Tessellation**: Configurable circle segments (default 64) for smooth architectural curves.
- **Material Preservation**: Accurately maps IFC colors and transparency settings to PBR materials.
- **Headless Execution**: Uses `JSDOM` to enable `Three.js` exporters to run directly in Node.js.
- **WASM Powered**: Leverages `web-ifc`'s WASM engine for high-speed parsing of large IFC files.

## Usage

### 1. Preparation
Place your `model.ifc` file in the root of the converter directory.

### 2. Installation
```bash
npm install
```

### 3. Run Conversion
```bash
npm run convert
```

The output `model.glb` will be generated in the same directory, ready for use in any GLTF-compatible viewer.

## Technical Details

- **Core Engine**: `web-ifc`
- **Tuning**: Geometry quality is set via `CIRCLE_SEGMENTS: 64` in `convert.mjs`.
- **Environment**: Node.js with `JSDOM` polyfills for `Blob`, `FileReader`, and `URL`.

## Credits & Acknowledgements

This project leverages several open-source libraries and community patterns:

- **[ThatOpenCompany](https://github.com/ThatOpenCompany)** (formerly IFC.js) — For the powerful `web-ifc` engine and WASM binaries that handle complex IFC geometry parsing.
- **[IFC-Lite](https://github.com/louistrue/ifc-lite)** by **Louis True** — For the original architecture, research, and patterns that inspired this high-quality conversion pipeline.
- **[Three.js Authors](https://threejs.org/)** — For the industry-standard 3D engine and the `GLTFExporter` used to generate the final models.
- **[jsdom Authors](https://github.com/jsdom/jsdom)** — For providing the DOM environment necessary to run Three.js exporters in a headless Node.js context.
- **Three.js Community & Examples** — For the established patterns used to implement headless exports in server-side environments.

## License
MIT

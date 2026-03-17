import fs from 'fs';
import path from 'path';
import { JSDOM } from 'jsdom';
import WebIFC from 'web-ifc';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

// Setup JSDOM environment for THREE.GLTFExporter
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.window = dom.window;
global.document = dom.window.document;
global.self = global.window;
global.Blob = dom.window.Blob;
global.FileReader = dom.window.FileReader;
global.TextEncoder = dom.window.TextEncoder;
global.TextDecoder = dom.window.TextDecoder;
global.URL = dom.window.URL;

const IFCPATH = './model.ifc';
const GLBPATH = './model.glb';

async function convert() {
    console.log('--- Initializing web-ifc ---');
    const ifcApi = new WebIFC.IfcAPI();
    await ifcApi.Init();
    
    console.log('Reading IFC file...');
    const buffer = fs.readFileSync(IFCPATH);
    const data = new Uint8Array(buffer);
    
    // Settings for improved visual quality
    const settings = {
        COORDINATE_TO_ORIGIN: true,
        CIRCLE_SEGMENTS: 64 
    };
    
    const modelID = ifcApi.OpenModel(data, settings);
    console.log(`Model opened with ID: ${modelID}`);

    if (modelID < 0) {
        throw new Error('Failed to open model.');
    }

    const scene = new THREE.Scene();
    const materials = new Map();

    console.log('Starting geometry extraction with StreamAllMeshes...');
    
    let elementCount = 0;
    let geometryCount = 0;

    ifcApi.StreamAllMeshes(modelID, (mesh) => {
        elementCount++;
        const geometries = mesh.geometries;
        for (let i = 0; i < geometries.size(); i++) {
            const placedGeometry = geometries.get(i);
            const geometryExpressID = placedGeometry.geometryExpressID;
            
            const ifcGeometry = ifcApi.GetGeometry(modelID, geometryExpressID);
            const vertexDataSize = ifcGeometry.GetVertexDataSize();
            if (vertexDataSize === 0) {
                ifcGeometry.delete();
                continue;
            }

            geometryCount++;
            const threeGeometry = new THREE.BufferGeometry();
            const vertexData = ifcApi.GetVertexArray(ifcGeometry.GetVertexData(), vertexDataSize);
            const indexData = ifcApi.GetIndexArray(ifcGeometry.GetIndexData(), ifcGeometry.GetIndexDataSize());
            
            const stride = 6; 
            const pos = [];
            const norm = [];
            
            for (let j = 0; j < vertexData.length; j += stride) {
                pos.push(vertexData[j], vertexData[j + 1], vertexData[j + 2]);
                norm.push(vertexData[j + 3], vertexData[j + 4], vertexData[j + 5]);
            }
            
            threeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
            threeGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(norm, 3));
            threeGeometry.setIndex(Array.from(indexData));
            
            // Map IFC color to PBR material
            const color = placedGeometry.color;
            const key = `${color.x},${color.y},${color.z},${color.w}`;
            
            let material = materials.get(key);
            if (!material) {
                material = new THREE.MeshStandardMaterial({
                    color: new THREE.Color(color.x, color.y, color.z),
                    opacity: color.w,
                    transparent: color.w < 1.0,
                    roughness: 0.5,
                    metalness: 0.1,
                    side: THREE.DoubleSide
                });
                materials.set(key, material);
            }
            
            const threeMesh = new THREE.Mesh(threeGeometry, material);
            const matrix = new THREE.Matrix4().fromArray(placedGeometry.flatTransformation);
            threeMesh.applyMatrix4(matrix);
            
            // Add metadata for potential interaction
            threeMesh.userData = { expressId: mesh.expressID };
            
            scene.add(threeMesh);
            ifcGeometry.delete();
        }
        
        if (elementCount % 1000 === 0) {
            console.log(`Processed ${elementCount} elements...`);
        }
    });

    console.log(`Extraction complete. Elements: ${elementCount}, Geometries: ${geometryCount}`);
    console.log(`Total objects in scene: ${scene.children.length}`);

    if (scene.children.length === 0) {
        ifcApi.CloseModel(modelID);
        throw new Error('No geometry was extracted. Aborting export.');
    }

    console.log('Exporting to GLB (this can take a moment)...');
    const exporter = new GLTFExporter();
    
    await new Promise((resolve, reject) => {
        try {
            exporter.parse(scene, (gltf) => {
                console.log('GLB generation success!');
                const output = gltf instanceof ArrayBuffer ? new Uint8Array(gltf) : gltf;
                fs.writeFileSync(GLBPATH, Buffer.from(output));
                console.log(`Successfully saved to ${GLBPATH} (${(Buffer.from(output).length / 1024 / 1024).toFixed(2)} MB)`);
                ifcApi.CloseModel(modelID);
                resolve();
            }, (err) => {
                console.error('GLTF Export failed:', err);
                reject(err);
            }, { 
                binary: true,
                embedImages: true
            });
        } catch (e) {
            console.error('GLTF Export exception:', e);
            reject(e);
        }
    });
}

console.log('Starting High-Quality IFC Conversion...');
convert().then(() => {
    console.log('Conversion finished successfully.');
    process.exit(0);
}).catch(err => {
    console.error('CRITICAL: Conversion failed:', err);
    process.exit(1);
});

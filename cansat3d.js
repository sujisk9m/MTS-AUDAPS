/* =====================================================
   CANSAT 3D SIMULATION – FINAL VERSION (JSON INTEGRATED)
===================================================== */

console.log("✅ CANSAT 3D SCRIPT LOADED");

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

/* =======================
   CONTAINER
======================= */

const container = document.getElementById("cansat-3d");
if (!container) {
   console.error("❌ #cansat-3d container not found");
}

 
/* =======================
   SCENE
======================= */

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xADD8E6);
scene.fog = new THREE.Fog(0x020b1a, 5, 35);

/* ======================= 
   CAMERA
======================= */

const camera = new THREE.PerspectiveCamera(
   60,
   container.clientWidth / container.clientHeight,
   0.1,
   100
);
camera.position.set(0, 4, 10);
camera.lookAt(0, 0, 0);

/* =======================
   RENDERER
======================= */

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(window.devicePixelRatio);
container.appendChild(renderer.domElement);

/* =======================
   LIGHTING
======================= */

scene.add(new THREE.AmbientLight(0x406080, 1.2));
const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(5, 10, 5);
scene.add(dirLight);

/* =======================
   WATER SURFACE
======================= */

const waterGeometry = new THREE.PlaneGeometry(50, 50, 64, 64);
const waterMaterial = new THREE.MeshStandardMaterial({
   color: 0x041a3d,
   transparent: true,
   opacity: 0.6,
   side: THREE.DoubleSide
});

const waterSurface = new THREE.Mesh(waterGeometry, waterMaterial);
waterSurface.rotation.x = -Math.PI / 2;
scene.add(waterSurface);

/* =======================
   CANSAT OBJECT
======================= */

const canSat = new THREE.Mesh(
   new THREE.CylinderGeometry(1.2, 1.2, 3.3, 40),
   new THREE.MeshStandardMaterial({
      color: 0x000000,
      emissive: 0x332200,
      emissiveIntensity: 0.6
   })
);
scene.add(canSat);

/* =======================
   UTILITIES
======================= */

function mapRange(v, inMin, inMax, outMin, outMax) {
   if (v == null) return 0;
   return ((v - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
}

const targetPosition = new THREE.Vector3();
const targetRotation = new THREE.Euler();

/* =======================
   🔗 WEBSOCKET + JSON
======================= */

const ws = null; // new WebSocket("ws://localhost:8080"); // DISABLED

/* ... */



// Initial render to show the static model
renderer.render(scene, camera);

/* 🌊 WATER WAVES */
let waveTime = 0;
let floatTime = 0;

function animate() {
   requestAnimationFrame(animate);

   waveTime += 0.03;
   const pos = waterSurface.geometry.attributes.position;
   for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      // Simple wave effect
      const y = Math.sin(x * 0.2 + waveTime) * 0.15 + Math.cos(z * 0.2 + waveTime) * 0.15;
      pos.setY(i, y);
   }
   pos.needsUpdate = true;
   waterSurface.geometry.computeVertexNormals();

   /* 🚢 FLOAT + MOVE */
   floatTime += 0.02;
   const floatOffset = Math.sin(floatTime) * 0.05;

   canSat.position.lerp(targetPosition, 0.1);

 // Apply floating on top of acceleration
   canSat.position.y = targetPosition.y + floatOffset;



   /* 🧭 GYRO SMOOTHING */
   canSat.rotation.x += (targetRotation.x - canSat.rotation.x) * 0.1;
   canSat.rotation.y += (targetRotation.y - canSat.rotation.y) * 0.1;
   canSat.rotation.z += (targetRotation.z - canSat.rotation.z) * 0.1;

   renderer.render(scene, camera);
}

animate();

/* =======================
   RESIZE HANDLING
======================= */

window.addEventListener("resize", () => {
   camera.aspect = container.clientWidth / container.clientHeight;
   camera.updateProjectionMatrix();
   renderer.setSize(container.clientWidth, container.clientHeight);
});

// Link to Global Scope for appp.js
window.updateCansatPosition = function (data) {
   // data: { pressure, salinity, turbidity }
   // Map these to 3D positions if needed
   // Example: targetPosition.y = mapRange(data.pressure, 100, 115, 2, -4);
};

window.updateOrientation = function (roll, pitch, yaw) {
   targetRotation.set(
      THREE.MathUtils.degToRad(roll || 0),
      THREE.MathUtils.degToRad(pitch || 0), // Yaw maps to Y often
      THREE.MathUtils.degToRad(yaw || 0)
   );
};

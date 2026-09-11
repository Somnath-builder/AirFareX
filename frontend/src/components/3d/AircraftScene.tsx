import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, PerspectiveCamera, Environment, ContactShadows, useGLTF } from '@react-three/drei';
import * as THREE from 'three';

// Fallback geometric cyberpunk aircraft if no GLTF is provided
function CyberpunkJet() {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (groupRef.current) {
      // Subtle hovering and pitch based on mouse position
      groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, (state.mouse.x * Math.PI) / 10, 0.05);
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, (state.mouse.y * Math.PI) / 10, 0.05);
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime) * 0.2;
    }
  });

  // Futuristic dark metallic material with glowing cyan edges
  const hullMaterial = new THREE.MeshStandardMaterial({ 
    color: '#0B1728', 
    roughness: 0.2, 
    metalness: 0.8,
    wireframe: false 
  });
  
  const neonCyan = new THREE.MeshBasicMaterial({ color: '#06b6d4' });
  const neonMagenta = new THREE.MeshBasicMaterial({ color: '#ec4899' });

  return (
    <group ref={groupRef} scale={0.5} position={[0, 0, 0]} rotation={[0, -Math.PI / 4, 0]}>
      {/* Fuselage */}
      <mesh material={hullMaterial}>
        <cylinderGeometry args={[0.5, 0.5, 6, 16]} />
      </mesh>
      
      {/* Nose */}
      <mesh material={hullMaterial} position={[0, 3.5, 0]}>
        <coneGeometry args={[0.5, 1, 16]} />
      </mesh>
      
      {/* Wings */}
      <mesh material={hullMaterial} position={[0, -0.5, 0]} rotation={[0, 0, Math.PI / 2]}>
        <boxGeometry args={[0.1, 8, 1.5]} />
      </mesh>
      
      {/* Tail */}
      <mesh material={hullMaterial} position={[0, -2.5, 0.8]} rotation={[Math.PI / 8, 0, 0]}>
        <boxGeometry args={[0.1, 1.5, 1.5]} />
      </mesh>
      
      {/* Engines */}
      <mesh material={hullMaterial} position={[1.5, -0.5, 0.2]}>
        <cylinderGeometry args={[0.4, 0.4, 1.2, 16]} />
      </mesh>
      <mesh material={hullMaterial} position={[-1.5, -0.5, 0.2]}>
        <cylinderGeometry args={[0.4, 0.4, 1.2, 16]} />
      </mesh>

      {/* Neon Accents */}
      <mesh material={neonCyan} position={[4, -0.5, 0]}>
        <boxGeometry args={[0.1, 0.1, 1.6]} />
      </mesh>
      <mesh material={neonCyan} position={[-4, -0.5, 0]}>
        <boxGeometry args={[0.1, 0.1, 1.6]} />
      </mesh>
      
      {/* Engine Glow */}
      <mesh material={neonMagenta} position={[1.5, -1.1, 0.2]}>
        <cylinderGeometry args={[0.3, 0.3, 0.1, 16]} />
      </mesh>
      <mesh material={neonMagenta} position={[-1.5, -1.1, 0.2]}>
        <cylinderGeometry args={[0.3, 0.3, 0.1, 16]} />
      </mesh>
    </group>
  );
}

// Try to load a real Boeing model if a URL is provided, otherwise fallback to procedural
function AircraftModel({ url }: { url?: string }) {
  if (!url) return <CyberpunkJet />;
  
  try {
    const { scene } = useGLTF(url);
    const groupRef = useRef<THREE.Group>(null);
    
    useFrame((state) => {
      if (groupRef.current) {
        groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, (state.mouse.x * Math.PI) / 10, 0.05);
        groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, (state.mouse.y * Math.PI) / 10, 0.05);
      }
    });
    
    return (
      <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
        <primitive object={scene} ref={groupRef} scale={0.8} />
      </Float>
    );
  } catch (e) {
    return <CyberpunkJet />;
  }
}

export function AircraftScene() {
  return (
    <div className="w-full h-full absolute inset-0 z-0 pointer-events-none">
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[5, 2, 8]} fov={45} />
        <ambientLight intensity={0.5} />
        
        {/* Cyberpunk Lighting */}
        <directionalLight 
          position={[10, 10, 5]} 
          intensity={1.5} 
          color="#06b6d4" 
          castShadow 
        />
        <spotLight 
          position={[-10, -10, 10]} 
          angle={0.15} 
          penumbra={1} 
          intensity={2} 
          color="#ec4899" 
        />
        <pointLight position={[0, -5, 5]} intensity={1} color="#0B1728" />

        <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
          <AircraftModel />
        </Float>

        <Environment preset="night" />
        <ContactShadows 
          position={[0, -4, 0]} 
          opacity={0.4} 
          scale={20} 
          blur={2} 
          far={4.5} 
          color="#06b6d4" 
        />
      </Canvas>
    </div>
  );
}

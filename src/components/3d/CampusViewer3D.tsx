import React, { Suspense, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment, ContactShadows } from '@react-three/drei';

function CampusModel() {
  const { scene } = useGLTF('/models/MNMJEC_Campus_Web.glb');
  return <primitive object={scene} scale={0.018} position={[0, -1.2, 0]} />;
}

function CampusFallback() {
  return (
    <mesh>
      <boxGeometry args={[4, 0.5, 3]} />
      <meshStandardMaterial color="#E6E9FF" />
    </mesh>
  );
}

export default function CampusViewer3D({ height = '100%' }: { height?: string }) {
  return (
    <div style={{ width: '100%', height }}>
      <Canvas
        camera={{ position: [8, 6, 10], fov: 42 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={1.4} />
        <directionalLight position={[10, 12, 8]} intensity={1.6} castShadow />
        <directionalLight position={[-6, 4, -6]} intensity={0.4} color="#E9DDFB" />
        <Suspense fallback={<CampusFallback />}>
          <CampusModel />
          <ContactShadows
            position={[0, -1.4, 0]}
            opacity={0.25}
            scale={28}
            blur={2.5}
            far={4}
            color="#24283B"
          />
          <Environment preset="city" />
        </Suspense>
        <OrbitControls
          autoRotate
          autoRotateSpeed={0.45}
          enablePan={false}
          minDistance={6}
          maxDistance={24}
          maxPolarAngle={Math.PI / 2.1}
        />
      </Canvas>
    </div>
  );
}


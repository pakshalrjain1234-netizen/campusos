import React, { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { Html, OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useCampus } from '../../context/CampusContext';
import { Incident } from '../../types';
import {
  THREE_BUILDING_COORDINATES,
  resolveBuildingCode,
  parseFloorLevel,
  getFloorsForBuilding,
} from '../../utils/campus3dMapping';
import { resolveIncidentLocalization } from '../../utils/incidentRoomLocalization';
import { BuildingClusterBadge, IncidentPinMarker } from './CampusIncidentMarker3D';

interface CampusModelProps {
  onSelectBuilding?: (buildingCodeOrId: string) => void;
  selectedBuildingId?: string | null;
  occupancyHighlightMap?: Record<string, string>; // building/room code -> hex color
  activeBuildingIncidentCounts?: Record<string, number>;
}

function CampusOpsMasterModel({
  onSelectBuilding,
  selectedBuildingId,
  occupancyHighlightMap = {},
  activeBuildingIncidentCounts = {},
}: CampusModelProps) {
  // Load the authoritative CampusOps master 3D model
  const { scene } = useGLTF('/models/campusops_master.glb');

  const model = useMemo(() => {
    const cloned = scene.clone(true);
    cloned.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(cloned);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.z) || 400;

    // Normalize model scale so its footprint spans ~18 units in 3D canvas
    const scale = 18 / maxDim;
    cloned.scale.setScalar(scale);

    // Center model at origin: ground level at y = 0, X/Z centered at 0
    cloned.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);

    // Clone materials so we can independently modulate emissive red pulse without altering source GLB
    cloned.traverse((obj) => {
      // The GLB contains text laid flat on the ground, where labels collide with
      // the wrong buildings in the operational view. The viewer overlays labels
      // from the measured building bounds below instead.
      if (obj.name.toLowerCase().startsWith('label_')) {
        obj.visible = false;
      }

      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        if (mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material = mesh.material.map((m) => m.clone());
          } else {
            mesh.material = mesh.material.clone();
          }

          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          mats.forEach((m: any) => {
            if (m && typeof m === 'object') {
              if ('roughness' in m) m.roughness = 0.72;
              if ('metalness' in m) m.metalness = 0.04;
            }
          });
        }
      }
    });

    return cloned;
  }, [scene]);

  // Index meshes belonging to each building code
  const buildingMeshesMap = useMemo(() => {
    const map: Record<string, THREE.Mesh[]> = {};
    model.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        let curr: THREE.Object3D | null = mesh;
        while (curr && curr !== model) {
          const name = curr.name || '';
          if (name.startsWith('building_')) {
            const code = name.replace('building_', '').toUpperCase();
            if (!map[code]) map[code] = [];
            map[code].push(mesh);
            break;
          }
          curr = curr.parent;
        }
      }
    });
    return map;
  }, [model]);

  // Anchor labels to each building's actual transformed GLB mesh bounds rather
  // than relying on a second hand-maintained coordinate table.
  const buildingLabelAnchors = useMemo(() => {
    const anchors: Record<string, [number, number, number]> = {};
    model.updateWorldMatrix(true, true);

    Object.entries(buildingMeshesMap).forEach(([code, meshes]) => {
      const bounds = new THREE.Box3();
      meshes.forEach((mesh) => {
        if (!mesh.visible) return;
        mesh.updateWorldMatrix(true, false);
        bounds.union(new THREE.Box3().setFromObject(mesh));
      });

      if (!bounds.isEmpty()) {
        const center = bounds.getCenter(new THREE.Vector3());
        anchors[code] = [center.x, bounds.max.y + 0.18, center.z];
      }
    });

    return anchors;
  }, [model, buildingMeshesMap]);

  const selectedBuildingCode = selectedBuildingId
    ? resolveBuildingCode(selectedBuildingId)
    : null;

  // Animate pulsing red emission visual effect on buildings with active incidents
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    // Smooth 4.5Hz pulsation
    const pulse = (Math.sin(t * 4.5) + 1) * 0.5;

    Object.entries(buildingMeshesMap).forEach(([bCode, meshes]) => {
      const activeCount = activeBuildingIncidentCounts[bCode] || 0;
      const isSelected = selectedBuildingCode === bCode;

      meshes.forEach((mesh) => {
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((mat: any) => {
          if (mat && 'emissive' in mat) {
            if (activeCount > 0) {
              // Red emission pulse without permanently modifying base texture or geometry
              const intensity = isSelected ? 0.45 + 0.55 * pulse : 0.2 + 0.45 * pulse;
              mat.emissive.setRGB(0.95 * intensity, 0.08 * intensity, 0.08 * intensity);
              mat.emissiveIntensity = 1.0;
            } else {
              // Clear emissive highlight for buildings without active incidents
              mat.emissive.setRGB(0, 0, 0);
              mat.emissiveIntensity = 0;
            }
          }
        });
      });
    });
  });

  // Handle click on model mesh nodes
  const handleClick = (e: any) => {
    e.stopPropagation();
    let current = e.object;
    let targetCode: string | null = null;

    // Traverse upwards to check for building or room name
    while (current && current !== model) {
      const name: string = current.name || '';
      if (name.startsWith('building_')) {
        targetCode = name.replace('building_', '');
        break;
      }
      if (name.startsWith('room_')) {
        targetCode = name;
        break;
      }
      if (name === 'sports_pitch') {
        targetCode = 'SPG';
        break;
      }
      if (name === 'parking_lot') {
        targetCode = 'PRK';
        break;
      }
      current = current.parent;
    }

    if (targetCode && onSelectBuilding) {
      onSelectBuilding(targetCode);
    }
  };

  return (
    <group>
      <primitive object={model} onClick={handleClick} />
      {Object.entries(THREE_BUILDING_COORDINATES).map(([code, coords]) => {
        const anchor = buildingLabelAnchors[code] || [
          coords.center[0],
          coords.roofY + 0.18,
          coords.center[2],
        ];
        // Keep neighboring Academic and Science labels from touching.
        const offset: [number, number, number] = code === 'ACB' ? [-0.7, 0, -0.5] : [0, 0, 0];
        return (
          <Html
            key={`building-label-${code}`}
            position={[anchor[0] + offset[0], anchor[1] + offset[1], anchor[2] + offset[2]]}
            center
            occlude={false}
            zIndexRange={[10, 0]}
          >
            <button
              type="button"
              title={`Focus ${coords.name}`}
              onClick={(event) => {
                event.stopPropagation();
                onSelectBuilding?.(code);
              }}
              className="flex items-center gap-1.5 rounded-md border border-white/90 bg-white/95 px-2 py-1 text-slate-800 shadow-md hover:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, lineHeight: '14px', whiteSpace: 'nowrap' }}
            >
              <span className="rounded bg-indigo-100 px-1 font-bold text-indigo-700">{code}</span>
              <span className="font-semibold">{coords.label}</span>
            </button>
          </Html>
        );
      })}
    </group>
  );
}

function CampusFallback() {
  return (
    <group position={[0, 0, 0]}>
      <mesh position={[0, 0.2, 0]}>
        <boxGeometry args={[4, 0.4, 3]} />
        <meshStandardMaterial color="#E6E9FF" roughness={0.6} />
      </mesh>
      <mesh position={[-1.2, 0.7, -0.6]}>
        <boxGeometry args={[1.2, 0.8, 1]} />
        <meshStandardMaterial color="#E9DDFB" roughness={0.5} />
      </mesh>
      <mesh position={[1, 0.9, 0.4]}>
        <boxGeometry args={[1.4, 1.2, 1.2]} />
        <meshStandardMaterial color="#D5F3E8" roughness={0.5} />
      </mesh>
      <mesh position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[6, 32]} />
        <meshStandardMaterial color="#FAF7F1" roughness={0.9} />
      </mesh>
    </group>
  );
}

// Camera controller that smoothly focuses on selected building and zooms cleanly
function SmoothCameraController({
  targetFocus,
  autoRotate,
}: {
  targetFocus: [number, number, number] | null;
  autoRotate: boolean;
}) {
  const controlsRef = useRef<any>(null);
  const transitionRef = useRef<{
    position: THREE.Vector3;
    target: THREE.Vector3;
  } | null>(null);
  const { camera } = useThree();

  const focusKey = targetFocus ? targetFocus.join(',') : 'overview';
  useEffect(() => {
    const focus = targetFocus || [0, 0.4, 0];
    // Shift focused buildings into the clear area to the right of the detail card,
    // and leave enough distance to see the full structure and nearby context.
    const focusTarget = targetFocus
      ? new THREE.Vector3(focus[0] - 2.05, focus[1], focus[2] + 1.65)
      : new THREE.Vector3(focus[0], focus[1], focus[2]);
    transitionRef.current = {
      target: focusTarget,
      position: targetFocus
        ? new THREE.Vector3(focusTarget.x + 5.5, Math.max(4.5, focusTarget.y + 4.5), focusTarget.z + 6.5)
        : new THREE.Vector3(16, 13, 18),
    };
  // focusKey tracks the tuple values while avoiding a new transition on each render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusKey]);

  useFrame((_, delta) => {
    const transition = transitionRef.current;
    if (controlsRef.current && transition) {
      const target = controlsRef.current.target as THREE.Vector3;
      target.x = THREE.MathUtils.damp(target.x, transition.target.x, 4, delta);
      target.y = THREE.MathUtils.damp(target.y, transition.target.y, 4, delta);
      target.z = THREE.MathUtils.damp(target.z, transition.target.z, 4, delta);
      camera.position.x = THREE.MathUtils.damp(camera.position.x, transition.position.x, 3.5, delta);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, transition.position.y, 3.5, delta);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, transition.position.z, 3.5, delta);

      if (
        camera.position.distanceToSquared(transition.position) < 0.0025 &&
        target.distanceToSquared(transition.target) < 0.0025
      ) {
        camera.position.copy(transition.position);
        target.copy(transition.target);
        transitionRef.current = null;
      }
      controlsRef.current.update();
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      autoRotate={autoRotate && !targetFocus}
      autoRotateSpeed={0.35}
      enableDamping={true}
      dampingFactor={0.08}
      enablePan={true}
      minDistance={4}
      maxDistance={40}
      zoomSpeed={0.9}
      onStart={() => { transitionRef.current = null; }}
      maxPolarAngle={Math.PI / 2.15}
    />
  );
}

// Preload the correct CampusOps master model
useGLTF.preload('/models/campusops_master.glb');

export interface CampusViewer3DProps {
  height?: string;
  onSelectBuilding?: (buildingId: string) => void;
  selectedBuildingId?: string | null;
  occupancyHighlightMap?: Record<string, string>;
  incidents?: Incident[];
  selectedIncidentId?: string | null;
  onSelectIncident?: (incident: Incident) => void;
  priorityFilter?: 'all' | 'critical' | 'high' | 'medium' | 'low';
  showResolved?: boolean;
  autoRotate?: boolean;
}

export default function CampusViewer3D({
  height = '100%',
  onSelectBuilding,
  selectedBuildingId,
  occupancyHighlightMap,
  incidents: propIncidents,
  selectedIncidentId: propSelectedIncidentId,
  onSelectIncident,
  priorityFilter = 'all',
  showResolved = false,
  autoRotate = false,
}: CampusViewer3DProps) {
  const {
    setSelectedBuildingId,
    selectedBuildingId: contextBuildingId,
    incidents: contextIncidents,
    selectedIncidentId: contextIncidentId,
    setSelectedIncidentId,
  } = useCampus();

  const activeSelectedBuildingId =
    selectedBuildingId !== undefined ? selectedBuildingId : contextBuildingId;
  const activeSelectedIncidentId =
    propSelectedIncidentId !== undefined ? propSelectedIncidentId : contextIncidentId;
  const activeIncidents = propIncidents || contextIncidents || [];

  const handleBuildingSelect = (codeOrId: string) => {
    if (onSelectBuilding) {
      onSelectBuilding(codeOrId);
    } else {
      setSelectedBuildingId(codeOrId);
    }
  };

  const handleIncidentSelect = (incident: Incident) => {
    if (onSelectIncident) {
      onSelectIncident(incident);
    } else {
      setSelectedIncidentId(incident.id);
    }
  };

  // Filter incidents: strictly exclude resolved / closed incidents from active counts
  const filteredIncidents = useMemo(() => {
    return activeIncidents.filter((inc) => {
      const isResolved =
        inc.lifecycleStatus === 'closed' ||
        inc.lifecycleStatus === 'resolved' ||
        inc.status === 'resolved' ||
        inc.status === 'closed';
      if (!showResolved && isResolved) return false;

      if (priorityFilter !== 'all' && inc.severity !== priorityFilter) return false;

      return true;
    });
  }, [activeIncidents, priorityFilter, showResolved]);

  // Group filtered incidents by canonical building code
  const buildingIncidentsMap = useMemo(() => {
    const map: Record<string, Incident[]> = {};
    for (const inc of filteredIncidents) {
      const rawBldg = inc.buildingId || inc.building || inc.location || 'ACB';
      const code = resolveBuildingCode(rawBldg);
      if (!map[code]) map[code] = [];
      map[code].push(inc);
    }
    return map;
  }, [filteredIncidents]);

  // Active counts by building for Three.js emission pulse
  const activeBuildingIncidentCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.entries(buildingIncidentsMap).forEach(([code, incs]) => {
      counts[code] = incs.length;
    });
    return counts;
  }, [buildingIncidentsMap]);

  // Determine camera focus position based on selected building
  const cameraTargetFocus = useMemo<[number, number, number] | null>(() => {
    if (!activeSelectedBuildingId) return null;
    const code = resolveBuildingCode(activeSelectedBuildingId);
    const coords = THREE_BUILDING_COORDINATES[code];
    if (coords) {
      return [coords.center[0], coords.roofY * 0.55, coords.center[2]];
    }
    return null;
  }, [activeSelectedBuildingId]);

  const selectedBuildingCode = activeSelectedBuildingId
    ? resolveBuildingCode(activeSelectedBuildingId)
    : null;

  // Selected incident details for exact room localization pin
  const selectedIncident = useMemo(() => {
    if (!activeSelectedIncidentId) return null;
    return activeIncidents.find((i) => i.id === activeSelectedIncidentId) || null;
  }, [activeSelectedIncidentId, activeIncidents]);

  const selectedLocalization = useMemo(() => {
    if (!selectedIncident) return null;
    return resolveIncidentLocalization(selectedIncident);
  }, [selectedIncident]);

  return (
    <div style={{ width: '100%', height }} className="absolute inset-0 select-none">
      <Canvas
        camera={{ position: [16, 13, 18], fov: 38, near: 0.1, far: 1000 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        {/* Soft pastel architectural lighting */}
        <ambientLight intensity={1.2} color="#F6F0E5" />
        <hemisphereLight args={['#E6E9FF', '#F6F0E5', 0.9]} />
        <directionalLight
          position={[22, 26, 16]}
          intensity={1.7}
          color="#FFFBF5"
          castShadow
          shadow-mapSize={[1024, 1024]}
        />
        <directionalLight position={[-14, 12, -12]} intensity={0.6} color="#E9DDFB" />

        {/* Grounding Pedestal */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
          <circleGeometry args={[13.5, 64]} />
          <meshStandardMaterial color="#E6E9FF" opacity={0.6} transparent roughness={0.95} />
        </mesh>

        <Suspense fallback={<CampusFallback />}>
          <CampusOpsMasterModel
            onSelectBuilding={handleBuildingSelect}
            selectedBuildingId={activeSelectedBuildingId}
            occupancyHighlightMap={occupancyHighlightMap}
            activeBuildingIncidentCounts={activeBuildingIncidentCounts}
          />

          {/* Pulsing ground aura beneath buildings with active incidents */}
          {Object.entries(buildingIncidentsMap).map(([bCode, bIncidents]) => {
            const coords = THREE_BUILDING_COORDINATES[bCode];
            if (!coords || bIncidents.length === 0) return null;
            return (
              <mesh
                key={`ground-aura-${bCode}`}
                rotation={[-Math.PI / 2, 0, 0]}
                position={[coords.center[0], 0.015, coords.center[2]]}
              >
                <ringGeometry args={[1.4, 2.0, 32]} />
                <meshBasicMaterial color="#ef4444" transparent opacity={0.35} side={THREE.DoubleSide} />
              </mesh>
            );
          })}

          {/* 3D Incident Indicators */}
          {Object.entries(buildingIncidentsMap).map(([bCode, bIncidents]) => {
            const coords = THREE_BUILDING_COORDINATES[bCode];
            if (!coords || bIncidents.length === 0) return null;

            const isBuildingSelected = selectedBuildingCode === bCode;
            const roofPos: [number, number, number] = [
              coords.center[0],
              coords.roofY + (isBuildingSelected ? 0.55 : 1.2),
              coords.center[2],
            ];

            return (
              <group key={`cluster-${bCode}`}>
                {/* Building Roof Macro Badge */}
                <BuildingClusterBadge
                  buildingCode={bCode}
                  buildingName={coords.name}
                  position={roofPos}
                  incidents={bIncidents}
                  isSelected={isBuildingSelected}
                  onSelect={() => handleBuildingSelect(bCode)}
                />

                {/* Micro Incident Pins when building is selected or focused */}
                {isBuildingSelected &&
                  bIncidents.map((incident, idx) => {
                    const total = bIncidents.length;
                    const angle = (idx / Math.max(1, total)) * Math.PI * 2 + 0.3;
                    const radius = 1.35;
                    const floorNum = parseFloorLevel(incident.room || incident.floor);
                    const mappedFloorCount = Math.max(
                      1,
                      getFloorsForBuilding(bCode).filter((floor) => floor.floorLevel >= 0).length
                    );
                    const safeFloorIndex = Math.min(mappedFloorCount - 1, Math.max(0, floorNum));
                    const floorHeight = Math.max(
                      0.04,
                      (coords.roofY * (safeFloorIndex + 0.5)) / mappedFloorCount
                    );

                    const pinPos: [number, number, number] = [
                      coords.center[0] + Math.cos(angle) * radius,
                      floorHeight,
                      coords.center[2] + Math.sin(angle) * radius,
                    ];

                    const isPinSelected = activeSelectedIncidentId === incident.id;
                    const roomForPin =
                      isPinSelected && selectedLocalization?.hasExactRoom
                        ? selectedLocalization.room
                        : incident.room;

                    return (
                      <IncidentPinMarker
                        key={`pin-${incident.id}`}
                        incident={incident}
                        position={pinPos}
                        isSelected={isPinSelected}
                        targetRoom={roomForPin}
                        onSelect={() => handleIncidentSelect(incident)}
                      />
                    );
                  })}
              </group>
            );
          })}
        </Suspense>

        <SmoothCameraController targetFocus={cameraTargetFocus} autoRotate={autoRotate} />
      </Canvas>
    </div>
  );
}

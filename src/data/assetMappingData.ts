import { MappedAsset } from '../types';

export const CAMPUS_ASSETS_REGISTRY: MappedAsset[] = [
  {
    id: 'asset-acb-201-fan-02',
    name: 'Ceiling Fan 02',
    category: 'HVAC / Ventilation',
    buildingId: 'A1',
    buildingName: 'Academic Block',
    floor: 'Floor 2',
    room: 'Room 201',
    photoUrl: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=1200&q=80',
    annotationCoordinates: { x: 58.4, y: 24.2 },
    position3D: [-145, 7.5, 82],
    serialNumber: 'HAV-BLDC-4421',
    installDate: '2024-03-15',
    lastServicedDate: '2026-08-10',
    maintenanceHistory: [
      {
        date: '2026-08-10',
        action: 'Bearing lubrication and speed controller calibration',
        technician: 'Vikram Sundaram',
        notes: 'Operational at all speed steps.',
      },
      {
        date: '2025-11-04',
        action: 'Capacitor replacement',
        technician: 'Arun Karthik',
        notes: 'Replaced faulty 2.5uF capacitor.',
      },
    ],
  },
  {
    id: 'asset-acb-201-fan-01',
    name: 'Ceiling Fan 01',
    category: 'HVAC / Ventilation',
    buildingId: 'A1',
    buildingName: 'Academic Block',
    floor: 'Floor 2',
    room: 'Room 201',
    photoUrl: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=1200&q=80',
    annotationCoordinates: { x: 31.6, y: 22.8 },
    position3D: [-149, 7.5, 82],
    serialNumber: 'HAV-BLDC-4420',
    installDate: '2024-03-15',
    lastServicedDate: '2026-08-10',
    maintenanceHistory: [
      {
        date: '2026-08-10',
        action: 'Standard periodic check',
        technician: 'Vikram Sundaram',
        notes: 'Good condition.',
      },
    ],
  },
  {
    id: 'asset-acb-101-proj-01',
    name: 'Dual HD Laser Projector 01',
    category: 'IT / AV Equipment',
    buildingId: 'A1',
    buildingName: 'Academic Block',
    floor: 'Ground Floor',
    room: 'Smart Lecture Hall 101',
    photoUrl: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80',
    annotationCoordinates: { x: 49.5, y: 35.8 },
    position3D: [-145, 3.2, 82],
    serialNumber: 'EPS-EB-L630U-90',
    installDate: '2023-09-01',
    lastServicedDate: '2026-09-12',
    maintenanceHistory: [
      {
        date: '2026-09-12',
        action: 'Dust filter purge and HDMI sync calibration',
        technician: 'Dinesh Kumar',
        notes: 'Laser engine at 18% life elapsed.',
      },
    ],
  },
  {
    id: 'asset-acb-101-light-03',
    name: 'Ceiling LED Troffer Light 03',
    category: 'Electrical Fixtures',
    buildingId: 'A1',
    buildingName: 'Academic Block',
    floor: 'Ground Floor',
    room: 'Smart Lecture Hall 101',
    photoUrl: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80',
    annotationCoordinates: { x: 72.1, y: 18.5 },
    position3D: [-142, 3.8, 80],
    serialNumber: 'PHI-TRO-36W-881',
    installDate: '2024-01-20',
    lastServicedDate: '2026-07-05',
    maintenanceHistory: [
      {
        date: '2026-07-05',
        action: 'Driver module inspected',
        technician: 'Arun Karthik',
        notes: 'Optimal lumen output.',
      },
    ],
  },
  {
    id: 'asset-itb-401-hvac-01',
    name: 'Belimo 24V Modulating Actuator Loop #4',
    category: 'HVAC Machinery',
    buildingId: 'A9',
    buildingName: 'IT Block',
    floor: 'Floor 4',
    room: 'Server Annex 401',
    photoUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80',
    annotationCoordinates: { x: 53.2, y: 46.5 },
    position3D: [126, 15.2, -4],
    serialNumber: 'BEL-NMV24A-SR-004',
    installDate: '2022-06-10',
    lastServicedDate: '2026-10-15',
    maintenanceHistory: [
      {
        date: '2026-10-15',
        action: 'Differential pressure feedback calibration',
        technician: 'Vikram Sundaram',
        notes: 'Actuator reported minor valve resistance.',
      },
    ],
  },
  {
    id: 'asset-lib-archives-valve-02',
    name: 'Water Riser Isolation Valve 2B',
    category: 'Plumbing Utilities',
    buildingId: 'A4',
    buildingName: 'Central Library',
    floor: 'Basement',
    room: 'Archives Special Collection',
    photoUrl: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1200&q=80',
    annotationCoordinates: { x: 42.0, y: 56.4 },
    position3D: [98, -2.5, 85],
    serialNumber: 'VAL-ISO-COPPER-2B',
    installDate: '2021-08-14',
    lastServicedDate: '2026-05-20',
    maintenanceHistory: [
      {
        date: '2026-05-20',
        action: 'Packing nut tightened and seal checked',
        technician: 'Priya Narayanan',
        notes: 'Seals showed initial condensation signs.',
      },
    ],
  },
  {
    id: 'asset-wsh-substation-b',
    name: 'Substation B Phase Voltage Stabilizer',
    category: 'Electrical Switchgear',
    buildingId: 'A11',
    buildingName: 'Workshop & Mechanical Systems',
    floor: 'Ground Floor',
    room: 'Heavy Machinery Lab',
    photoUrl: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=1200&q=80',
    annotationCoordinates: { x: 61.5, y: 39.2 },
    position3D: [15, 2.0, -80],
    serialNumber: 'ABB-STAB-415V-B',
    installDate: '2020-11-05',
    lastServicedDate: '2026-09-02',
    maintenanceHistory: [
      {
        date: '2026-09-02',
        action: 'Thermographic infrared scan and relay test',
        technician: 'Arun Karthik',
        notes: 'Phase B contactor exhibits mild heat rise under 180A load.',
      },
    ],
  },
  {
    id: 'asset-aud-sound-rack',
    name: 'Main Stage Audio Mixer & Ground Isolator Rack',
    category: 'IT / AV Equipment',
    buildingId: 'A3',
    buildingName: 'Main Auditorium',
    floor: 'Floor 1',
    room: 'Sri Ramanujam Auditorium',
    photoUrl: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=1200&q=80',
    annotationCoordinates: { x: 47.8, y: 44.0 },
    position3D: [26, 4.2, 86],
    serialNumber: 'YAM-TF5-DANTE-01',
    installDate: '2023-01-18',
    lastServicedDate: '2026-10-01',
    maintenanceHistory: [
      {
        date: '2026-10-01',
        action: 'Audio hum debugging and transformer ground test',
        technician: 'Dinesh Kumar',
        notes: 'Hum eliminated with balanced DI isolation transformer.',
      },
    ],
  },
  {
    id: 'asset-scb-fume-hood-01',
    name: 'Chemical Fume Hood Exhaust Fan 01',
    category: 'HVAC / Safety',
    buildingId: 'A2',
    buildingName: 'Science Block',
    floor: 'Floor 2',
    room: 'Organic Chemistry Lab 201',
    photoUrl: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=1200&q=80',
    annotationCoordinates: { x: 55.0, y: 32.5 },
    position3D: [-58, 7.8, 86],
    serialNumber: 'LAB-EXH-FH-101',
    installDate: '2023-05-11',
    lastServicedDate: '2026-09-18',
    maintenanceHistory: [
      {
        date: '2026-09-18',
        action: 'Airflow velocity measurement (100 FPM target verified)',
        technician: 'Vikram Sundaram',
        notes: 'Sash sensor operational.',
      },
    ],
  },
];

export function getAssetsByRoom(buildingId: string, room: string): MappedAsset[] {
  const normB = buildingId.toLowerCase();
  const normR = room.toLowerCase();
  return CAMPUS_ASSETS_REGISTRY.filter((a) => {
    const matchBuilding = a.buildingId.toLowerCase() === normB || a.buildingName.toLowerCase().includes(normB);
    const matchRoom = a.room.toLowerCase() === normR || normR.includes(a.room.toLowerCase());
    return matchBuilding && matchRoom;
  });
}

export function getAssetsByBuilding(buildingId: string): MappedAsset[] {
  const normB = buildingId.toLowerCase();
  return CAMPUS_ASSETS_REGISTRY.filter(
    (a) => a.buildingId.toLowerCase() === normB || a.buildingName.toLowerCase().includes(normB)
  );
}

export function getAssetById(id: string): MappedAsset | undefined {
  return CAMPUS_ASSETS_REGISTRY.find((a) => a.id === id);
}


import * as THREE from 'three';
import { CAMPUS_BUILDINGS } from '../data/buildingsData';

// Normalize building codes & aliases across the application
export const BUILDING_CODE_MAP: Record<string, string> = {
  // Aliases to canonical codes
  'it-block': 'ITB',
  'itb': 'ITB',
  'a9': 'ITB',
  'mechanical-block': 'WSH',
  'workshop': 'WSH',
  'wsh': 'WSH',
  'a11': 'WSH',
  'central-library': 'LIB',
  'library': 'LIB',
  'lib': 'LIB',
  'a4': 'LIB',
  'academic-block': 'ACB',
  'architecture-block': 'ACB',
  'acb': 'ACB',
  'a1': 'ACB',
  'science-block': 'SCB',
  'scb': 'SCB',
  'a2': 'SCB',
  'main-auditorium': 'AUD',
  'auditorium': 'AUD',
  'aud': 'AUD',
  'a3': 'AUD',
  'admin-block': 'ADM',
  'administrative-block': 'ADM',
  'administrative block': 'ADM',
  'administrative': 'ADM',
  'administration': 'ADM',
  'administration block': 'ADM',
  'main-block': 'ADM',
  'adm': 'ADM',
  'a5': 'ADM',
  'hostel': 'HST',
  'hst': 'HST',
  'a7': 'HST',
  'cafeteria': 'CAF',
  'caf': 'CAF',
  'a8': 'CAF',
  'health-centre': 'HEC',
  'hec': 'HEC',
  'a10': 'HEC',
  'mess': 'MES',
  'mes': 'MES',
  'a12': 'MES',
  'canteen': 'CAN',
  'can': 'CAN',
  'a13': 'CAN',
  'sports-ground': 'SPG',
  'sports ground': 'SPG',
  'central sports ground': 'SPG',
  a6: 'SPG',
  'spg': 'SPG',
  'a14': 'SPG',
  'parking': 'PRK',
  'campus parking': 'PRK',
  'central campus parking': 'PRK',
  p1: 'PRK',
  'prk': 'PRK',
  'a15': 'PRK',
};

export function resolveBuildingCode(idOrCodeOrAlias: string): string {
  if (!idOrCodeOrAlias) return 'ACB';
  const norm = idOrCodeOrAlias.toLowerCase().trim();
  return BUILDING_CODE_MAP[norm] || idOrCodeOrAlias.toUpperCase();
}

/**
 * Building centers and roof heights measured from the named objects in the
 * CampusOps GLB after applying the same 18-unit footprint normalization used
 * by CampusOpsMasterModel. Keep these aligned with the shipped GLB asset.
 */
export const THREE_BUILDING_COORDINATES: Record<string, { center: [number, number, number]; roofY: number; name: string; label: string }> = {
  ACB: { center: [-5.94, 0, -3.96], roofY: 0.88, name: 'Academic Block', label: 'Academic' },
  SCB: { center: [-2.34, 0, -3.96], roofY: 0.70, name: 'Science Block', label: 'Science' },
  AUD: { center: [1.26, 0, -3.96], roofY: 0.52, name: 'Main Auditorium', label: 'Auditorium' },
  LIB: { center: [4.54, 0, -3.96], roofY: 0.52, name: 'Central Library', label: 'Library' },
  ADM: { center: [7.47, 0, -3.96], roofY: 0.52, name: 'Administration Block', label: 'Admin' },
  HST: { center: [-2.79, 0, 0], roofY: 0.88, name: 'Student Residence Hostel', label: 'Hostel' },
  CAF: { center: [1.75, 0, 0], roofY: 0.34, name: 'Campus Cafeteria', label: 'Cafeteria' },
  ITB: { center: [5.98, 0, 0], roofY: 0.70, name: 'IT Block', label: 'IT' },
  HEC: { center: [-4.23, 0, 3.73], roofY: 0.34, name: 'Health Centre', label: 'Health' },
  WSH: { center: [-1.62, 0, 3.73], roofY: 0.34, name: 'Workshop & Mechanical Systems', label: 'Workshop' },
  MES: { center: [2.16, 0, 3.73], roofY: 0.34, name: 'Dining Mess Complex', label: 'Mess' },
  CAN: { center: [4.09, 0, 3.73], roofY: 0.34, name: 'Campus Canteen', label: 'Canteen' },
  SPG: { center: [-6.52, 0, 0], roofY: 0.11, name: 'Central Sports Ground', label: 'Sports' },
  PRK: { center: [6.97, 0, 3.78], roofY: 0.10, name: 'Central Campus Parking', label: 'Parking' },
};

export function getBuilding3DPosition(buildingCodeOrId: string): [number, number, number] {
  const code = resolveBuildingCode(buildingCodeOrId);
  const info = THREE_BUILDING_COORDINATES[code];
  if (info) {
    return [info.center[0], info.roofY, info.center[2]];
  }
  return [0, 1.5, 0];
}

export function parseFloorLevel(floorStr?: string): number {
  if (!floorStr) return 0;
  const s = floorStr.toLowerCase().trim();

  if (s.includes('basement') || s.startsWith('b')) return -1;
  if (s.includes('ground') || s === 'g' || s === '0' || s.startsWith('floor 0') || s.startsWith('gr')) return 0;

  // Check for explicit "floor N" or "level N"
  const floorMatch = s.match(/(?:floor|level)\s*([0-9]+)/i);
  if (floorMatch) {
    return parseInt(floorMatch[1], 10);
  }

  // Check room number leading digit: e.g. Room 201 -> floor 2, Room 304 -> floor 3, Room 102 -> floor 1
  const roomMatch = s.match(/([0-9]{3,4})/);
  if (roomMatch) {
    const num = parseInt(roomMatch[1], 10);
    return Math.floor(num / 100);
  }

  if (s.includes('first') || s.includes('1st')) return 1;
  if (s.includes('second') || s.includes('2nd')) return 2;
  if (s.includes('third') || s.includes('3rd')) return 3;
  if (s.includes('fourth') || s.includes('4th')) return 4;

  return 0;
}

export interface BuildingFloorInfo {
  floorLevel: number;
  floorLabel: string;
  rooms: string[];
}

export function getFloorsForBuilding(buildingCodeOrId: string): BuildingFloorInfo[] {
  const code = resolveBuildingCode(buildingCodeOrId);

  // Common campus floor layouts
  switch (code) {
    case 'ACB': // 4 floors
      return [
        { floorLevel: 0, floorLabel: 'Ground Floor', rooms: ['Smart Lecture Hall 101', 'Interactive Classroom 102', 'General Lecture Room 103'] },
        { floorLevel: 1, floorLabel: 'Floor 1', rooms: ['Applied Electronics Lab 104', 'Mechatronics Systems Lab 105'] },
        { floorLevel: 2, floorLabel: 'Floor 2', rooms: ['Room 201', 'Room 202', 'Architecture Design Studio 204'] },
        { floorLevel: 3, floorLabel: 'Floor 3', rooms: ['Faculty Suites 301', 'Restroom 302', 'Seminar Hall 305'] },
      ];
    case 'SCB': // 3 floors
      return [
        { floorLevel: 0, floorLabel: 'Ground Floor', rooms: ['Physics Optics Lab 101', 'General Science Hall 102'] },
        { floorLevel: 1, floorLabel: 'Floor 1', rooms: ['Organic Chemistry Lab 201', 'Microbiology Research Lab 202'] },
        { floorLevel: 2, floorLabel: 'Floor 2', rooms: ['Optics & Laser Lab 203', 'Biochemistry Instrumentation Lab 205'] },
      ];
    case 'ITB': // 3 floors + roof
      return [
        { floorLevel: 0, floorLabel: 'Ground Floor', rooms: ['Advanced Computing Lab 101', 'Network NOC 102'] },
        { floorLevel: 1, floorLabel: 'Floor 1', rooms: ['Data Science Lab 201', 'AI & Robotics Lab 203'] },
        { floorLevel: 2, floorLabel: 'Floor 2', rooms: ['Cybersecurity Cyber-Range 301', 'Faculty Lounge 304'] },
        { floorLevel: 3, floorLabel: 'Floor 4 / Rooftop', rooms: ['Server Annex 401', 'Rooftop HVAC Chiller Deck'] },
      ];
    case 'LIB': // 2 floors + basement
      return [
        { floorLevel: -1, floorLabel: 'Basement', rooms: ['Archives Special Collection', 'Historical Periodicals Vault'] },
        { floorLevel: 0, floorLabel: 'Ground Floor', rooms: ['Digital Research & Study Suite 102', 'Circulation Desk'] },
        { floorLevel: 1, floorLabel: 'Floor 1', rooms: ['e-Learning Lab 103', 'Quiet Reading Wing 201'] },
      ];
    case 'ADM': // Administrative Block floors
      return [
        { floorLevel: 0, floorLabel: 'Ground Floor', rooms: ['Registrar Office', 'Cash & Accounts Counter', 'Reception A-001'] },
        { floorLevel: 1, floorLabel: 'Floor 1', rooms: ['Room A-102', 'Dean Academic Office', 'Executive Conference Suite 101'] },
        { floorLevel: 2, floorLabel: 'Floor 2', rooms: ['Room A-204', 'Finance & Operations Wing', 'Faculty Records A-201'] },
        { floorLevel: 3, floorLabel: 'Floor 3', rooms: ['Room A-305', 'Chancellor Suite', 'Boardroom A-301'] },
      ];
    case 'AUD':
      return [
        { floorLevel: 0, floorLabel: 'Ground Floor', rooms: ['Sri Ramanujam Auditorium Stage', 'Control Booth A'] },
        { floorLevel: 1, floorLabel: 'Balcony / Gallery', rooms: ['Upper Gallery Seating', 'Green Room Suite'] },
      ];
    case 'WSH':
      return [
        { floorLevel: 0, floorLabel: 'Ground Floor', rooms: ['Heavy Machinery Lab', 'Substation B Switchgear', 'CNC Machining Bay'] },
        { floorLevel: 1, floorLabel: 'Mezzanine', rooms: ['Tool Crib Bay C-14', 'Supervisor Cabin'] },
      ];
    default:
      return [
        { floorLevel: 0, floorLabel: 'Ground Floor', rooms: ['Main Facility Space'] },
        { floorLevel: 1, floorLabel: 'Floor 1', rooms: ['Upper Service Level'] },
      ];
  }
}


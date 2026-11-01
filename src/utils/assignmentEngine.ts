import { EngineerProfile, IncidentCategory } from '../types';

export const CAMPUS_ENGINEERS: EngineerProfile[] = [
  {
    id: 'eng-001',
    name: 'Vikram Sundaram',
    email: 'vikram.s@campusops.edu',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
    department: 'Facility Engineering (HVAC & Mechanical)',
    specialties: ['HVAC', 'Plumbing', 'General'],
    activeTicketCount: 2,
    maxCapacity: 5,
    availability: 'available',
    rating: 4.9,
  },
  {
    id: 'eng-002',
    name: 'Arun Karthik',
    email: 'arun.k@campusops.edu',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80',
    department: 'Power & High Voltage Systems',
    specialties: ['Electrical', 'Safety', 'General'],
    activeTicketCount: 1,
    maxCapacity: 4,
    availability: 'available',
    rating: 4.8,
  },
  {
    id: 'eng-003',
    name: 'Rajesh G.',
    email: 'rajesh.g@campusops.edu',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80',
    department: 'Civil Infrastructure & Structural Works',
    specialties: ['Structural', 'Furniture & Fixtures', 'Landscaping'],
    activeTicketCount: 3,
    maxCapacity: 5,
    availability: 'available',
    rating: 4.7,
  },
  {
    id: 'eng-004',
    name: 'Dinesh Kumar',
    email: 'dinesh.k@campusops.edu',
    avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=120&q=80',
    department: 'Computing Services & IT Infrastructure',
    specialties: ['IT / Network', 'Electrical'],
    activeTicketCount: 1,
    maxCapacity: 4,
    availability: 'available',
    rating: 4.9,
  },
  {
    id: 'eng-005',
    name: 'Meenakshi Sundaram',
    email: 'meenakshi.s@campusops.edu',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=120&q=80',
    department: 'Environmental Health & Campus Sanitation',
    specialties: ['Sanitation', 'Pest Control', 'Safety', 'General'],
    activeTicketCount: 1,
    maxCapacity: 5,
    availability: 'available',
    rating: 4.8,
  },
  {
    id: 'eng-006',
    name: 'Sanjay Verma',
    email: 'sanjay.v@campusops.edu',
    avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=120&q=80',
    department: 'Quick Response Operations Unit',
    specialties: ['General', 'Plumbing', 'Electrical', 'Furniture & Fixtures'],
    activeTicketCount: 0,
    maxCapacity: 6,
    availability: 'available',
    rating: 4.6,
  },
];

export interface EngineerRecommendation {
  engineer: EngineerProfile;
  matchScore: number;
  isRecommended: boolean;
  matchReasons: string[];
}

/**
 * Smart Engineer Assignment Engine
 * Evaluates skill specialty match, current workload capacity, availability, and rating.
 */
export function rankEngineersForIncident(
  category: IncidentCategory,
  engineers: EngineerProfile[] = CAMPUS_ENGINEERS
): EngineerRecommendation[] {
  const ranked = engineers.map((eng) => {
    let score = 0;
    const reasons: string[] = [];

    // 1. Specialty Match (up to 50 pts)
    const isPrimarySpecialty = eng.specialties[0] === category;
    const isSpecialty = eng.specialties.includes(category);

    if (isPrimarySpecialty) {
      score += 50;
      reasons.push(`Primary specialist in ${category}`);
    } else if (isSpecialty) {
      score += 35;
      reasons.push(`Certified in ${category}`);
    } else if (eng.specialties.includes('General')) {
      score += 15;
      reasons.push('General campus maintenance qualified');
    }

    // 2. Capacity & Workload Balance (up to 30 pts)
    const remainingCapacity = eng.maxCapacity - eng.activeTicketCount;
    const capacityRatio = Math.max(0, remainingCapacity / eng.maxCapacity);
    const capacityScore = Math.round(capacityRatio * 30);
    score += capacityScore;

    if (eng.activeTicketCount === 0) {
      reasons.push('Zero active tickets · Immediate availability');
    } else if (remainingCapacity > 1) {
      reasons.push(`${eng.activeTicketCount} active tickets (${remainingCapacity} slots free)`);
    } else {
      reasons.push(`Near capacity (${eng.activeTicketCount}/${eng.maxCapacity} active)`);
    }

    // 3. Availability status (up to 12 pts)
    if (eng.availability === 'available') {
      score += 12;
    } else if (eng.availability === 'busy') {
      score += 4;
      reasons.push('Currently on active dispatch');
    } else {
      score -= 40;
      reasons.push('On scheduled leave');
    }

    // 4. Performance Rating (up to 8 pts)
    const ratingScore = Math.round((eng.rating / 5) * 8);
    score += ratingScore;

    return {
      engineer: eng,
      matchScore: Math.min(100, Math.max(0, score)),
      isRecommended: false,
      matchReasons: reasons,
    };
  });

  // Sort descending by score
  ranked.sort((a, b) => b.matchScore - a.matchScore);

  // Mark the top candidate as recommended
  if (ranked.length > 0) {
    ranked[0].isRecommended = true;
  }

  return ranked;
}


// Safe storage helper compatible with both browser localStorage and Node.js test harness
export const safeAuthStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof localStorage !== 'undefined') return localStorage.getItem(key);
      if (typeof globalThis !== 'undefined' && (globalThis as any).__mockStorage) {
        return (globalThis as any).__mockStorage[key] || null;
      }
      return null;
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, value);
        return;
      }
      if (typeof globalThis !== 'undefined') {
        if (!(globalThis as any).__mockStorage) (globalThis as any).__mockStorage = {};
        (globalThis as any).__mockStorage[key] = value;
      }
    } catch {}
  },
  removeItem: (key: string): void => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(key);
        return;
      }
      if (typeof globalThis !== 'undefined' && (globalThis as any).__mockStorage) {
        delete (globalThis as any).__mockStorage[key];
      }
    } catch {}
  },
};
import { supabase, isSupabaseConfigured } from './supabase';
import { AppRole, UserProfileData, AuthSession } from '../types/auth';
import { normalizeRole } from '../utils/permissions';

export const DEMO_TEMP_PASSWORD = 'DemoPassword2026!';

export interface DemoCredentialSpec {
  role: AppRole;
  roleLabel: string;
  email: string;
  password: string;
  fullName: string;
  departmentName: string;
  avatarUrl?: string;
  phone?: string;
}

export const SIX_DEMO_CREDENTIALS: DemoCredentialSpec[] = [
  {
    role: 'student_faculty',
    roleLabel: 'Student / Faculty',
    email: 'student@campusops.demo',
    password: DEMO_TEMP_PASSWORD,
    fullName: 'Anita Patel (Student Rep)',
    departmentName: 'Department of Computing & IT Services',
    avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=160&q=80',
    phone: '+91 98401 22304',
  },
  {
    role: 'technician',
    roleLabel: 'Technician',
    email: 'technician@campusops.demo',
    password: DEMO_TEMP_PASSWORD,
    fullName: 'Vikram Sundaram (HVAC Tech)',
    departmentName: 'Facility Engineering & Maintenance',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=80',
    phone: '+91 98401 22303',
  },
  {
    role: 'department_manager',
    roleLabel: 'Department Manager',
    email: 'manager@campusops.demo',
    password: DEMO_TEMP_PASSWORD,
    fullName: 'Prof. Marcus Vance (Dept Head)',
    departmentName: 'Department of Computing & IT Services',
    avatarUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=160&q=80',
    phone: '+91 98401 22302',
  },
  {
    role: 'facilities_administrator',
    roleLabel: 'Facilities Administrator',
    email: 'facilities@campusops.demo',
    password: DEMO_TEMP_PASSWORD,
    fullName: 'Dr. Jennifer Rao (Facilities Lead)',
    departmentName: 'Office of Campus Infrastructure & Strategic Operations',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=160&q=80',
    phone: '+91 98401 22301',
  },
  {
    role: 'procurement_approver',
    roleLabel: 'Procurement Approver',
    email: 'procurement@campusops.demo',
    password: DEMO_TEMP_PASSWORD,
    fullName: 'Sunita Deshmukh (Procurement Lead)',
    departmentName: 'Office of Campus Infrastructure & Strategic Operations',
    avatarUrl: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=160&q=80',
    phone: '+91 98401 22305',
  },
  {
    role: 'system_administrator',
    roleLabel: 'System Administrator',
    email: 'admin@campusops.demo',
    password: DEMO_TEMP_PASSWORD,
    fullName: 'Rajesh Varma (System Admin)',
    departmentName: 'Central Information Technology Systems',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=160&q=80',
    phone: '+91 98401 22306',
  },
];

export const DEMO_ACCOUNTS: Record<string, UserProfileData> = {
  // Official PS2 Roles (Matches Supabase Demo Accounts)
  student_faculty: {
    id: 'demo-student-001',
    email: 'student@campusops.demo',
    fullName: 'Anita Patel (Student Rep)',
    role: 'student_faculty',
    departmentName: 'Department of Computing & IT Services',
    avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=160&q=80',
    phone: '+91 98401 22304',
    isActive: true,
  },
  technician: {
    id: 'demo-technician-002',
    email: 'technician@campusops.demo',
    fullName: 'Vikram Sundaram (HVAC Tech)',
    role: 'technician',
    departmentName: 'Facility Engineering & Maintenance',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=80',
    phone: '+91 98401 22303',
    isActive: true,
  },
  department_manager: {
    id: 'demo-manager-003',
    email: 'manager@campusops.demo',
    fullName: 'Prof. Marcus Vance (Dept Head)',
    role: 'department_manager',
    departmentName: 'Department of Computing & IT Services',
    avatarUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=160&q=80',
    phone: '+91 98401 22302',
    isActive: true,
  },
  facilities_administrator: {
    id: 'demo-facilities-004',
    email: 'facilities@campusops.demo',
    fullName: 'Dr. Jennifer Rao (Facilities Lead)',
    role: 'facilities_administrator',
    departmentName: 'Office of Campus Infrastructure & Strategic Operations',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=160&q=80',
    phone: '+91 98401 22301',
    isActive: true,
  },
  procurement_approver: {
    id: 'demo-procurement-005',
    email: 'procurement@campusops.demo',
    fullName: 'Sunita Deshmukh (Procurement Lead)',
    role: 'procurement_approver',
    departmentName: 'Office of Campus Infrastructure & Strategic Operations',
    avatarUrl: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=160&q=80',
    phone: '+91 98401 22305',
    isActive: true,
  },
  system_administrator: {
    id: 'demo-admin-006',
    email: 'admin@campusops.demo',
    fullName: 'Rajesh Varma (System Admin)',
    role: 'system_administrator',
    departmentName: 'Central Information Technology Systems',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=160&q=80',
    phone: '+91 98401 22306',
    isActive: true,
  },

  // Backward Compatibility Aliases
  coo: {
    id: 'demo-coo-001',
    email: 'coo@campusops.edu',
    fullName: 'Dr. Jennifer Rao',
    role: 'facilities_administrator',
    departmentName: 'Strategic Operations & Campus Facilities',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=160&q=80',
    phone: '+91 98401 22301',
    isActive: true,
  },
  director: {
    id: 'demo-director-002',
    email: 'director@campusops.edu',
    fullName: 'Marcus Vance',
    role: 'department_manager',
    departmentName: 'Computing Services & IT',
    avatarUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=160&q=80',
    phone: '+91 98401 22302',
    isActive: true,
  },
  engineer: {
    id: 'demo-engineer-003',
    email: 'engineer@campusops.edu',
    fullName: 'Vikram Sundaram',
    role: 'technician',
    departmentName: 'HVAC & Electrical Operations',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=80',
    phone: '+91 98401 22303',
    isActive: true,
  },
  liaison: {
    id: 'demo-liaison-004',
    email: 'liaison@campusops.edu',
    fullName: 'Anita Patel',
    role: 'student_faculty',
    departmentName: 'Student Affairs & Campus Liaison',
    avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=160&q=80',
    phone: '+91 98401 22304',
    isActive: true,
  },
};

export interface AuthResponse {
  user: UserProfileData;
  session: AuthSession;
  isDemo: boolean;
}

export const authService = {
  /**
   * Authenticate user via Supabase Auth or fallback demo account
   */
  signIn: async (email: string, password: string): Promise<AuthResponse> => {
    const trimmedEmail = email.trim().toLowerCase();

    // 1. Check for quick demo login fallback
    const matchingDemoRole = (Object.keys(DEMO_ACCOUNTS) as AppRole[]).find(
      (role) => DEMO_ACCOUNTS[role].email === trimmedEmail
    );

    // Look up specification by exact email
    const matchingSpec = SIX_DEMO_CREDENTIALS.find((c) => c.email.toLowerCase() === trimmedEmail);

    if (!isSupabaseConfigured) {
      if (!matchingSpec && !matchingDemoRole) {
        throw new Error('Invalid login credentials. No campus account found with this email address.');
      }
      if (password !== DEMO_TEMP_PASSWORD && password !== 'demo1234') {
        throw new Error('Invalid login credentials. Incorrect password.');
      }
      const role = matchingSpec?.role || matchingDemoRole || 'student_faculty';
      const demoUser = DEMO_ACCOUNTS[role] || DEMO_ACCOUNTS.student_faculty;
      const demoSession: AuthSession = {
        accessToken: `demo-token-${role}-${Date.now()}`,
        expiresAt: Date.now() + 86400000,
      };
      safeAuthStorage.setItem('campusops_demo_auth', JSON.stringify({ user: demoUser, session: demoSession }));
      return { user: demoUser, session: demoSession, isDemo: true };
    }

    // 2. Real Supabase Auth authentication
    const { data, error } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    });

    if (error || !data.user || !data.session) {
      throw new Error(error?.message || 'Authentication failed. Please verify your credentials.');
    }

    // 3. Retrieve TRUSTED database profile (never trust client metadata)
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, department_id, avatar_url, phone, is_active')
      .eq('id', data.user.id)
      .single();

    if (profileError || !profileData) {
      // Profile fallback if newly registered
      const fallbackProfile: UserProfileData = {
        id: data.user.id,
        email: data.user.email || trimmedEmail,
        fullName: data.user.user_metadata?.full_name || trimmedEmail.split('@')[0],
        role: 'liaison', // Safe default
        isActive: true,
      };
      return {
        user: fallbackProfile,
        session: {
          accessToken: data.session.access_token,
          refreshToken: data.session.refresh_token,
          expiresAt: data.session.expires_at,
        },
        isDemo: false,
      };
    }

    if (!profileData.is_active) {
      await supabase.auth.signOut();
      throw new Error('This account has been deactivated. Please contact your Campus Operations Administrator.');
    }

    const verifiedProfile: UserProfileData = {
      id: profileData.id,
      email: profileData.email,
      fullName: profileData.full_name,
      role: normalizeRole(profileData.role),
      departmentId: profileData.department_id,
      avatarUrl: profileData.avatar_url,
      phone: profileData.phone,
      isActive: profileData.is_active,
    };

    return {
      user: verifiedProfile,
      session: {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: data.session.expires_at,
      },
      isDemo: false,
    };
  },

  /**
   * Sign out
   */
  signOut: async (): Promise<void> => {
    safeAuthStorage.removeItem('campusops_demo_auth');
    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('Supabase sign out error:', err);
      }
    }
  },

  /**
   * Request password reset email
   */
  resetPasswordForEmail: async (email: string): Promise<void> => {
    if (!isSupabaseConfigured) {
      // Simulated response in demo mode
      await new Promise((r) => setTimeout(r, 400));
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      throw new Error(error.message);
    }
  },

  /**
   * Update password for authenticated user (after clicking reset link)
   */
  updatePassword: async (newPassword: string): Promise<void> => {
    if (!isSupabaseConfigured) {
      await new Promise((r) => setTimeout(r, 400));
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      throw new Error(error.message);
    }
  },

  /**
   * Restore current session and fetch trusted profile
   */
  restoreSession: async (): Promise<AuthResponse | null> => {
    // 1. Check local demo session
    const savedDemo = safeAuthStorage.getItem('campusops_demo_auth');
    if (savedDemo) {
      try {
        const parsed = JSON.parse(savedDemo);
        return { user: parsed.user, session: parsed.session, isDemo: true };
      } catch {
        safeAuthStorage.removeItem('campusops_demo_auth');
      }
    }

    if (!isSupabaseConfigured) {
      // Default to demo COO account during local preview if not signed in
      const defaultUser = DEMO_ACCOUNTS.coo;
      const demoSession: AuthSession = {
        accessToken: `demo-token-coo-${Date.now()}`,
        expiresAt: Date.now() + 86400000,
      };
      return { user: defaultUser, session: demoSession, isDemo: true };
    }

    // 2. Query Supabase Auth session
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session?.user) {
      return null;
    }

    // 3. Fetch trusted profile from DB
    const { data: profileData } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, department_id, avatar_url, phone, is_active')
      .eq('id', data.session.user.id)
      .single();

    if (!profileData || !profileData.is_active) {
      return null;
    }

    return {
      user: {
        id: profileData.id,
        email: profileData.email,
        fullName: profileData.full_name,
        role: normalizeRole(profileData.role),
        departmentId: profileData.department_id,
        avatarUrl: profileData.avatar_url,
        phone: profileData.phone,
        isActive: profileData.is_active,
      },
      session: {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: data.session.expires_at,
      },
      isDemo: false,
    };
  },
};


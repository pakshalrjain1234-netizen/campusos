import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { config } from '../config';

export interface DemoAccountSpec {
  role:
    | 'student_faculty'
    | 'technician'
    | 'department_manager'
    | 'facilities_administrator'
    | 'procurement_approver'
    | 'system_administrator';
  roleLabel: string;
  email: string;
  password: string;
  fullName: string;
  departmentCode?: string;
  phone?: string;
}

export const DEMO_TEMP_PASSWORD = 'DemoPassword2026!';

export const SIX_DEMO_SPECIFICATIONS: DemoAccountSpec[] = [
  {
    role: 'student_faculty',
    roleLabel: 'Student / Faculty',
    email: 'student@campusops.demo',
    password: DEMO_TEMP_PASSWORD,
    fullName: 'Anita Patel (Student Rep)',
    departmentCode: 'ITS',
    phone: '+91 98401 22304',
  },
  {
    role: 'technician',
    roleLabel: 'Technician',
    email: 'technician@campusops.demo',
    password: DEMO_TEMP_PASSWORD,
    fullName: 'Vikram Sundaram (HVAC Tech)',
    departmentCode: 'FAC-ENG',
    phone: '+91 98401 22303',
  },
  {
    role: 'department_manager',
    roleLabel: 'Department Manager',
    email: 'manager@campusops.demo',
    password: DEMO_TEMP_PASSWORD,
    fullName: 'Prof. Marcus Vance (Dept Head)',
    departmentCode: 'ITS',
    phone: '+91 98401 22302',
  },
  {
    role: 'facilities_administrator',
    roleLabel: 'Facilities Administrator',
    email: 'facilities@campusops.demo',
    password: DEMO_TEMP_PASSWORD,
    fullName: 'Dr. Jennifer Rao (Facilities Lead)',
    departmentCode: 'INFRA',
    phone: '+91 98401 22301',
  },
  {
    role: 'procurement_approver',
    roleLabel: 'Procurement Approver',
    email: 'procurement@campusops.demo',
    password: DEMO_TEMP_PASSWORD,
    fullName: 'Sunita Deshmukh (Procurement Lead)',
    departmentCode: 'INFRA',
    phone: '+91 98401 22305',
  },
  {
    role: 'system_administrator',
    roleLabel: 'System Administrator',
    email: 'admin@campusops.demo',
    password: DEMO_TEMP_PASSWORD,
    fullName: 'Rajesh Varma (System Admin)',
    departmentCode: 'ITS',
    phone: '+91 98401 22306',
  },
];

async function runProvisioning() {
  console.log('======================================================================');
  console.log('   CAMPUSOPS — SIX OFFICIAL DEMO ACCOUNTS PROVISIONING SCRIPT         ');
  console.log('======================================================================\n');

  const supabaseUrl = process.env.SUPABASE_URL || config.supabaseUrl;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || config.supabaseServiceRoleKey;

  if (!supabaseUrl || !serviceRoleKey) {
    console.warn('[NOTICE] Supabase connection is currently NOT configured in local environment.');
    console.warn('  SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required to execute remote Supabase Admin operations.\n');
    console.log('Prepared specification of six official demo accounts:');
    SIX_DEMO_SPECIFICATIONS.forEach((s) => {
      console.log(`  • ${s.roleLabel.padEnd(26)} | Email: ${s.email.padEnd(28)} | Role: ${s.role}`);
    });
    console.log(`\nTemporary Secure Password for All Demo Accounts: "${DEMO_TEMP_PASSWORD}"`);
    console.log('\nTo execute against live Supabase:');
    console.log('  1. Populate SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
    console.log('  2. Run: npx tsx server/scripts/seed_demo_users.ts');
    return;
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  console.log(`Target Supabase Host: ${new URL(supabaseUrl).host}`);

  // 1. Fetch valid departments to link foreign keys correctly
  const { data: deptRows, error: deptErr } = await supabaseAdmin
    .from('departments')
    .select('id, code, name');

  if (deptErr) {
    console.warn('Could not query departments:', deptErr.message);
  }

  const deptMap: Record<string, string> = {};
  if (deptRows) {
    deptRows.forEach((d: any) => {
      if (d.code) deptMap[d.code.toUpperCase()] = d.id;
    });
  }

  // 2. Fetch existing auth users to prevent duplicates
  const { data: existingUsersData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
  if (listError) {
    console.error('Failed to list existing Supabase users:', listError.message);
    process.exit(1);
  }

  const existingByEmail: Record<string, any> = {};
  existingUsersData.users.forEach((u) => {
    if (u.email) existingByEmail[u.email.toLowerCase()] = u;
  });

  console.log(`Found ${existingUsersData.users.length} existing users in Supabase Auth.\n`);

  // 3. Provision or Update each of the 6 demo users
  for (const spec of SIX_DEMO_SPECIFICATIONS) {
    const emailNorm = spec.email.toLowerCase();
    const existing = existingByEmail[emailNorm];
    let userId: string;

    if (existing) {
      console.log(`[EXISTS] User ${spec.email} already exists (ID: ${existing.id}). Updating password & confirmation...`);
      const { data: updated, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        existing.id,
        {
          password: spec.password,
          email_confirm: true,
          user_metadata: {
            full_name: spec.fullName,
            role: spec.role,
          },
        }
      );
      if (updateError) {
        console.error(`  ❌ Failed to update auth user ${spec.email}:`, updateError.message);
        continue;
      }
      userId = updated.user.id;
    } else {
      console.log(`[CREATE] Creating Supabase Auth user: ${spec.email}...`);
      const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: spec.email,
        password: spec.password,
        email_confirm: true,
        user_metadata: {
          full_name: spec.fullName,
          role: spec.role,
        },
      });
      if (createError || !created.user) {
        console.error(`  ❌ Failed to create auth user ${spec.email}:`, createError?.message);
        continue;
      }
      userId = created.user.id;
    }

    // 4. Upsert corresponding public.profiles row
    const targetDeptId = spec.departmentCode ? deptMap[spec.departmentCode.toUpperCase()] || null : null;
    const { error: profError } = await supabaseAdmin.from('profiles').upsert(
      {
        id: userId,
        email: spec.email,
        full_name: spec.fullName,
        role: spec.role,
        department_id: targetDeptId,
        phone: spec.phone || null,
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

    if (profError) {
      console.error(`  ❌ Failed to upsert profile for ${spec.email}:`, profError.message);
    } else {
      console.log(`  ✅ Profile upserted successfully with role '${spec.role}'`);
    }
  }

  console.log('\n======================================================================');
  console.log('   PROVISIONING COMPLETED FOR ALL SIX OFFICIAL DEMO ACCOUNTS          ');
  console.log('======================================================================');
}

runProvisioning().catch((err) => {
  console.error('Fatal error during provisioning:', err);
  process.exit(1);
});


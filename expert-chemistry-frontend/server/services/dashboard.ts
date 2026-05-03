import { pool } from '../db.ts';
import type { AuthUser } from '../types/auth.ts';
import type { CompoundRow } from '../types/chemistry.ts';
import { parseChemicalNumber } from '../utils/chemistry.ts';

interface DashboardUserRow {
  id: number;
  user_id: string;
  full_name: string;
  created_at: string;
  role: 'admin' | 'user';
}

function mapCompoundPreview(row: CompoundRow) {
  return {
    cas: row.cas,
    nome: row.nome,
    epsilon_m_cm: parseChemicalNumber(row.epsilon_m_cm),
    lambda_max: row.lambda_max || 'N/A',
    fonte: row.fonte || 'Manual'
  };
}

function mapUserPreview(row: DashboardUserRow) {
  return {
    id: row.id,
    userId: row.user_id,
    fullName: row.full_name,
    createdAt: row.created_at,
    role: row.role
  };
}

export async function getDashboardSummary(currentUser: AuthUser) {
  const [
    savedCompoundsCountResult,
    spectralRecordsCountResult,
    usersCountResult,
    adminUsersCountResult,
    savedCompoundsPreviewResult,
    recentUsersResult
  ] = await Promise.all([
    pool.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM compounds'),
    pool.query<{ count: string }>(`
      SELECT COUNT(*)::text AS count
      FROM spectral_data
      WHERE molar_extinction_coefficient IS NOT NULL
        AND compound_name IS NOT NULL
    `),
    pool.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM users'),
    pool.query<{ count: string }>("SELECT COUNT(*)::text AS count FROM users WHERE role = 'admin'"),
    pool.query<CompoundRow>(`
      SELECT cas, nome, epsilon_m_cm, lambda_max, fonte
      FROM compounds
      ORDER BY nome ASC
      LIMIT 5
    `),
    currentUser.role === 'admin'
      ? pool.query<DashboardUserRow>(`
          SELECT id, user_id, full_name, created_at, role
          FROM users
          ORDER BY created_at DESC
          LIMIT 5
        `)
      : Promise.resolve({ rows: [] } as { rows: DashboardUserRow[] })
  ]);

  return {
    stats: {
      savedCompounds: Number(savedCompoundsCountResult.rows[0]?.count || '0'),
      spectralRecords: Number(spectralRecordsCountResult.rows[0]?.count || '0'),
      registeredUsers: Number(usersCountResult.rows[0]?.count || '0'),
      adminUsers: Number(adminUsersCountResult.rows[0]?.count || '0'),
      currentRole: currentUser.role
    },
    savedCompoundsPreview: savedCompoundsPreviewResult.rows.map(mapCompoundPreview),
    recentUsers: recentUsersResult.rows.map(mapUserPreview)
  };
}

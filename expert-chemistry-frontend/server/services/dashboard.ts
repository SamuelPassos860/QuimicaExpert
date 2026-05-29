import { pool } from '../db.js';
import type { AuthUser } from '../types/auth.js';
import type { CompoundRow } from '../types/chemistry.js';
import type { ReportRow } from '../types/reports.js';
import { parseChemicalNumber } from '../utils/chemistry.js';
import { initializeReportsSchema } from './reports.js';

interface DashboardUserRow {
  id: number;
  user_id: string;
  full_name: string;
  created_at: string;
  role: 'admin' | 'user';
}

interface ResultTrendRow {
  period: string;
  reports: string;
  avg_absorbance: string | number | null;
  avg_concentration: string | number | null;
}

interface UserResultRow {
  owner_user_identifier: string;
  owner_full_name: string;
  reports: string;
  avg_absorbance: string | number | null;
  avg_concentration: string | number | null;
  last_generated_at: string;
}

interface SourceBreakdownRow {
  source: string;
  reports: string;
  avg_absorbance: string | number | null;
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
  await initializeReportsSchema();

  const [
    savedCompoundsCountResult,
    spectralRecordsCountResult,
    usersCountResult,
    adminUsersCountResult,
    savedCompoundsPreviewResult,
    recentUsersResult,
    reportsCountResult,
    recentReportsResult,
    resultTrendResult,
    userResultBreakdownResult,
    sourceBreakdownResult
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
      : Promise.resolve({ rows: [] } as { rows: DashboardUserRow[] }),
    pool.query<{ count: string }>(
      'SELECT COUNT(*)::text AS count FROM reports WHERE ($1::boolean = true OR owner_user_id = $2)',
      [currentUser.role === 'admin', currentUser.id]
    ),
    pool.query<ReportRow>(`
      SELECT
        id,
        report_id,
        owner_user_id,
        owner_user_identifier,
        owner_full_name,
        compound_name,
        cas_id,
        lambda_max,
        solvent,
        source,
        epsilon_value,
        path_length_value,
        concentration_value,
        absorbance,
        generated_at,
        created_at
      FROM reports
      WHERE ($1::boolean = true OR owner_user_id = $2)
      ORDER BY created_at DESC, id DESC
      LIMIT 8
    `, [currentUser.role === 'admin', currentUser.id]),
    pool.query<ResultTrendRow>(`
      SELECT
        date_trunc('day', created_at)::date::text AS period,
        COUNT(*)::text AS reports,
        AVG(absorbance) AS avg_absorbance,
        AVG(concentration_value) AS avg_concentration
      FROM reports
      WHERE ($1::boolean = true OR owner_user_id = $2)
        AND created_at >= NOW() - INTERVAL '13 days'
      GROUP BY date_trunc('day', created_at)::date
      ORDER BY period ASC
    `, [currentUser.role === 'admin', currentUser.id]),
    pool.query<UserResultRow>(`
      SELECT
        owner_user_identifier,
        owner_full_name,
        COUNT(*)::text AS reports,
        AVG(absorbance) AS avg_absorbance,
        AVG(concentration_value) AS avg_concentration,
        MAX(created_at)::text AS last_generated_at
      FROM reports
      WHERE ($1::boolean = true OR owner_user_id = $2)
      GROUP BY owner_user_identifier, owner_full_name
      ORDER BY COUNT(*) DESC, MAX(created_at) DESC
      LIMIT 6
    `, [currentUser.role === 'admin', currentUser.id]),
    pool.query<SourceBreakdownRow>(`
      SELECT
        source,
        COUNT(*)::text AS reports,
        AVG(absorbance) AS avg_absorbance
      FROM reports
      WHERE ($1::boolean = true OR owner_user_id = $2)
      GROUP BY source
      ORDER BY COUNT(*) DESC, source ASC
      LIMIT 5
    `, [currentUser.role === 'admin', currentUser.id])
  ]);

  return {
    stats: {
      savedCompounds: Number(savedCompoundsCountResult.rows[0]?.count || '0'),
      spectralRecords: Number(spectralRecordsCountResult.rows[0]?.count || '0'),
      registeredUsers: Number(usersCountResult.rows[0]?.count || '0'),
      adminUsers: Number(adminUsersCountResult.rows[0]?.count || '0'),
      generatedReports: Number(reportsCountResult.rows[0]?.count || '0'),
      currentRole: currentUser.role
    },
    savedCompoundsPreview: savedCompoundsPreviewResult.rows.map(mapCompoundPreview),
    recentUsers: recentUsersResult.rows.map(mapUserPreview),
    recentReports: recentReportsResult.rows.map((row) => ({
      id: Number(row.id),
      reportId: row.report_id,
      compoundName: row.compound_name,
      source: row.source,
      absorbance: parseChemicalNumber(row.absorbance),
      concentrationValue: parseChemicalNumber(row.concentration_value),
      generatedAt: row.generated_at,
      createdAt: row.created_at,
      generatedByName: row.owner_full_name,
      generatedByUserId: row.owner_user_identifier
    })),
    resultTrend: resultTrendResult.rows.map((row) => ({
      period: row.period,
      reports: Number(row.reports || '0'),
      avgAbsorbance: parseChemicalNumber(row.avg_absorbance),
      avgConcentration: parseChemicalNumber(row.avg_concentration)
    })),
    userResultBreakdown: userResultBreakdownResult.rows.map((row) => ({
      userId: row.owner_user_identifier,
      fullName: row.owner_full_name,
      reports: Number(row.reports || '0'),
      avgAbsorbance: parseChemicalNumber(row.avg_absorbance),
      avgConcentration: parseChemicalNumber(row.avg_concentration),
      lastGeneratedAt: row.last_generated_at
    })),
    sourceBreakdown: sourceBreakdownResult.rows.map((row) => ({
      source: row.source || 'Manual',
      reports: Number(row.reports || '0'),
      avgAbsorbance: parseChemicalNumber(row.avg_absorbance)
    }))
  };
}

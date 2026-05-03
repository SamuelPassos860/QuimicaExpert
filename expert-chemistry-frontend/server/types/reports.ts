export interface ReportRow {
  id: number;
  report_id: string;
  owner_user_id: number;
  owner_user_identifier: string;
  owner_full_name: string;
  compound_name: string;
  cas_id: string;
  lambda_max: string;
  source: string;
  epsilon_value: string | number;
  path_length_value: string | number;
  concentration_value: string | number;
  absorbance: string | number;
  generated_at: string;
  created_at: string;
}

export interface CreateReportBody {
  reportId?: string;
  compoundName?: string;
  casId?: string;
  lambdaMax?: string;
  source?: string;
  epsilonValue?: number | string | null;
  pathLengthValue?: number | string | null;
  concentrationValue?: number | string | null;
  absorbance?: number | string | null;
  generatedAt?: string;
  generatedByName?: string;
  generatedByUserId?: string;
}

export interface CreateReportInput {
  reportId: string;
  ownerUserId: number;
  ownerUserIdentifier: string;
  ownerFullName: string;
  compoundName: string;
  casId: string;
  lambdaMax: string;
  source: string;
  epsilonValue: number;
  pathLengthValue: number;
  concentrationValue: number;
  absorbance: number;
  generatedAt: string;
}

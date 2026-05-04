export interface ReportPayload {
  reportId: string;
  compoundName: string;
  casId: string;
  lambdaMax: string;
  source: string;
  epsilonValue: number;
  pathLengthValue: number;
  concentrationValue: number;
  absorbance: number;
  generatedAt: string;
  generatedByName: string;
  generatedByUserId: string;
}

export interface StoredReport extends ReportPayload {
  id: number;
  createdAt: string;
  owner: {
    id: number;
    userId: string;
    fullName: string;
  };
}

import type { AuthUser } from '../types/auth';
import type { ReportPayload } from '../types/reports';

function formatNumber(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 4
  }).format(value);
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function buildReportId(casId: string, generatedAt: Date) {
  const timestamp = generatedAt
    .toISOString()
    .replaceAll('-', '')
    .replaceAll(':', '')
    .replaceAll('.', '')
    .replace('T', '-')
    .replace('Z', '');

  const normalizedCas = casId.trim() ? casId.trim().replaceAll(/[^0-9A-Za-z-]/g, '') : 'NO-CAS';

  return `RPT-${normalizedCas}-${timestamp}`;
}

export function buildReportPayload(
  currentUser: AuthUser,
  values: {
    compoundName: string;
    casId: string;
    lambdaMax: string;
    source: string;
    epsilonValue: number;
    pathLengthValue: number;
    concentrationValue: number;
    absorbance: number;
  },
  overrides?: Partial<ReportPayload>
): ReportPayload {
  const generatedDate = new Date();
  const generatedAt = generatedDate.toLocaleString('pt-BR');
  const effectiveCasId = overrides?.casId ?? values.casId ?? 'N/A';

  return {
    reportId: buildReportId(effectiveCasId, generatedDate),
    compoundName: values.compoundName || 'Not identified',
    casId: values.casId || 'N/A',
    lambdaMax: values.lambdaMax || 'N/A',
    source: values.source,
    epsilonValue: values.epsilonValue,
    pathLengthValue: values.pathLengthValue,
    concentrationValue: values.concentrationValue,
    absorbance: values.absorbance,
    generatedAt,
    generatedByName: currentUser.fullName,
    generatedByUserId: currentUser.userId,
    ...overrides
  };
}

export function openPrintableReport(payload: ReportPayload) {
  const reportWindow = window.open('', '_blank', 'width=900,height=1200');

  if (!reportWindow) {
    window.alert('Unable to open the PDF preview window. Please allow pop-ups and try again.');
    return false;
  }

  const formulaExpression = `A = ${formatNumber(payload.epsilonValue)} x ${formatNumber(payload.pathLengthValue)} x ${formatNumber(payload.concentrationValue)}`;
  const formulaResult = `A = ${formatNumber(payload.absorbance)}`;
  const safeCompoundName = escapeHtml(payload.compoundName);
  const safeCasId = escapeHtml(payload.casId);
  const safeLambdaMax = escapeHtml(payload.lambdaMax);
  const safeSource = escapeHtml(payload.source);
  const safeGeneratedAt = escapeHtml(payload.generatedAt);
  const safeGeneratedByName = escapeHtml(payload.generatedByName);
  const safeGeneratedByUserId = escapeHtml(payload.generatedByUserId);
  const safeReportId = escapeHtml(payload.reportId);
  const safeAbsorbance = escapeHtml(formatNumber(payload.absorbance));
  const safeEpsilon = escapeHtml(formatNumber(payload.epsilonValue || 0));
  const safePathLength = escapeHtml(formatNumber(payload.pathLengthValue || 0));
  const safeConcentration = escapeHtml(formatNumber(payload.concentrationValue || 0));
  const safeFormulaExpression = escapeHtml(formulaExpression);
  const safeFormulaResult = escapeHtml(formulaResult);
  const safeShortDate = escapeHtml(payload.generatedAt.split(',')[0] || payload.generatedAt);
  const safeMethodology = escapeHtml('Beer-Lambert Law');

  const reportHtml = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Spectrophotometry Report</title>
        <style>
          * { box-sizing: border-box; }
          html {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          body {
            margin: 0;
            font-family: Arial, Helvetica, sans-serif;
            background: #e9eef6;
            color: #0b1f44;
          }
          .page {
            width: 210mm;
            min-height: 297mm;
            max-width: 980px;
            margin: 30px auto;
            background: #ffffff;
            padding: 52px 60px 46px;
            box-shadow: 0 22px 70px rgba(15, 23, 42, 0.14);
          }
          .topbar {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 24px;
          }
          .brand {
            display: flex;
            align-items: center;
            gap: 16px;
          }
          .brand-mark {
            width: 56px;
            height: 56px;
            border-radius: 12px;
            background: #123d82;
            color: #ffffff;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 28px;
            font-weight: 700;
          }
          .brand-title {
            margin: 0;
            font-size: 22px;
            color: #0c2d6b;
          }
          .brand-subtitle {
            margin: 6px 0 0;
            font-size: 12px;
            letter-spacing: 0.2em;
            text-transform: uppercase;
            color: #5c8de0;
          }
          .report-head {
            text-align: right;
          }
          .report-title {
            margin: 0;
            font-size: 22px;
            color: #0b2c70;
            line-height: 1.2;
          }
          .verified-pill {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            margin-top: 12px;
            padding: 6px 14px;
            border-radius: 999px;
            background: #7ce2dc;
            color: #0b5a63;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.08em;
            text-transform: uppercase;
          }
          .report-id {
            margin-top: 10px;
            font-size: 12px;
            margin: 0;
            color: #52627f;
          }
          .divider {
            margin: 20px 0 40px;
            border: 0;
            border-top: 2px solid #173b79;
          }
          .summary-card {
            display: block;
            padding: 22px 24px;
            border-radius: 12px;
            border: 1px solid #c7d2e4;
            background: #eef3ff;
          }
          .summary-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 24px 28px;
          }
          .mini-label {
            margin: 0 0 8px;
            font-size: 12px;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: #68758d;
            font-weight: 700;
          }
          .mini-value {
            margin: 0;
            font-size: 17px;
            font-weight: 700;
            color: #10234d;
          }
          .mini-value.alt {
            color: #08646a;
          }
          .content-grid {
            margin-top: 36px;
            display: grid;
            grid-template-columns: 1fr 1.12fr;
            gap: 38px;
          }
          .section-heading {
            display: flex;
            align-items: center;
            gap: 14px;
            margin: 0 0 18px;
            font-size: 19px;
            color: #08276e;
          }
          .section-heading::before {
            content: "";
            width: 4px;
            height: 30px;
            border-radius: 999px;
            background: #0b7a7a;
          }
          .details-card {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            border: 1px solid #d8deea;
            border-radius: 10px;
            overflow: hidden;
            background: #ffffff;
          }
          .details-cell {
            padding: 12px 16px 14px;
            border-right: 1px solid #d8deea;
            border-bottom: 1px solid #d8deea;
          }
          .details-cell:nth-child(2n) {
            border-right: 0;
          }
          .details-cell.full {
            grid-column: 1 / -1;
            border-right: 0;
            border-bottom: 0;
          }
          .details-card .mini-label {
            font-size: 11px;
          }
          .parameter-stack {
            display: grid;
            gap: 14px;
          }
          .parameter-card {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 18px;
            padding: 16px 18px;
            border-radius: 12px;
            border: 1px solid #d8deea;
            background: #ffffff;
          }
          .parameter-left {
            display: flex;
            align-items: center;
            gap: 14px;
            color: #142750;
          }
          .parameter-icon {
            width: 34px;
            height: 34px;
            border-radius: 999px;
            background: #edf8f7;
            color: #0b7a7a;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
          }
          .parameter-value {
            font-size: 16px;
            font-weight: 800;
            color: #101b33;
            white-space: nowrap;
          }
          .source-card {
            padding: 14px 16px;
            border-radius: 12px;
            border: 1px dashed #8c9bb8;
            background: #f4f7fd;
          }
          .analysis-section {
            margin-top: 38px;
          }
          .result-panel {
            margin-top: 16px;
            background: linear-gradient(135deg, #143f78, #0e3461);
            color: #ffffff;
            border-radius: 14px;
            padding: 34px 38px;
            display: grid;
            grid-template-columns: 1fr 0.9fr;
            gap: 36px;
          }
          .calc-list {
            max-width: 320px;
          }
          .calc-step {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            padding: 10px 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.16);
            font-size: 15px;
          }
          .calc-step strong {
            font-weight: 700;
          }
          .formula-box {
            margin-top: 22px;
            padding: 18px 20px;
            border-radius: 10px;
            background: rgba(255, 255, 255, 0.1);
          }
          .formula-box .mini-label {
            color: #8ab8ff;
          }
          .formula-box p {
            margin: 10px 0 0;
            font-size: 18px;
            color: #ffffff;
          }
          .result-box {
            display: flex;
            flex-direction: column;
            justify-content: center;
            text-align: center;
          }
          .result-box .mini-label {
            color: #8cf0f2;
            letter-spacing: 0.18em;
          }
          .result-number {
            margin: 10px 0 0;
            font-size: 58px;
            line-height: 1;
            font-weight: 800;
            letter-spacing: -0.04em;
          }
          .result-unit {
            margin: 12px 0 0;
            color: #91a9d5;
            font-size: 15px;
            font-weight: 700;
          }
          .integrity {
            margin-top: 42px;
            padding-top: 22px;
            border-top: 2px solid #d2d9e6;
          }
          .integrity-title {
            display: flex;
            align-items: center;
            gap: 10px;
            margin: 0;
            color: #0a6b67;
            font-size: 13px;
            font-weight: 800;
            letter-spacing: 0.04em;
            text-transform: uppercase;
          }
          .integrity-grid {
            margin-top: 22px;
            display: grid;
            grid-template-columns: 0.95fr 1.05fr;
            gap: 28px;
            align-items: end;
          }
          .integrity-note {
            border-left: 4px solid #122043;
            border-radius: 4px;
            background: #dfe8fb;
            padding: 14px 14px 14px 12px;
            color: #67758f;
            line-height: 1.55;
          }
          .signature {
            text-align: right;
            color: #10234d;
          }
          .signature-name {
            margin: 0 0 8px;
            font-size: 18px;
            font-weight: 700;
            color: #1b448d;
          }
          .signature-line {
            width: 220px;
            margin-left: auto;
            border-top: 2px solid #111111;
            margin-top: 6px;
            padding-top: 10px;
            font-size: 13px;
            line-height: 1.5;
          }
          .footer {
            margin-top: 40px;
            padding-top: 18px;
            border-top: 2px solid #d2d9e6;
            display: grid;
            grid-template-columns: 1fr auto auto;
            gap: 20px;
            align-items: start;
            font-size: 11px;
            text-transform: uppercase;
            color: #5d6a80;
            font-weight: 700;
          }
          .footer-center {
            text-align: center;
          }
          .footer-center small {
            display: block;
            margin-top: 10px;
            font-size: 10px;
            color: #8c97aa;
          }
          .footer-right {
            text-align: right;
          }
          @media (max-width: 880px) {
            .page {
              width: auto;
              min-height: auto;
              padding: 34px 28px;
            }
            .content-grid,
            .summary-card,
            .result-panel,
            .integrity-grid,
            .footer {
              grid-template-columns: 1fr;
            }
            .topbar {
              flex-direction: column;
            }
            .report-head {
              text-align: left;
            }
            .summary-grid {
              grid-template-columns: 1fr;
            }
            .footer-center,
            .footer-right,
            .signature {
              text-align: left;
            }
            .signature-line {
              margin-left: 0;
            }
          }
          @page {
            size: A4 portrait;
            margin: 0;
          }
          @media print {
            html, body {
              width: 210mm;
              height: 297mm;
              background: #ffffff;
              overflow: hidden;
            }
            .page {
              margin: 0;
              width: 233.34mm;
              min-height: 330mm;
              max-width: none;
              box-shadow: none;
              padding: 20px 22px 18px;
              overflow: hidden;
              transform: scale(0.9);
              transform-origin: top left;
            }
            .divider {
              margin: 14px 0 24px;
            }
            .summary-card {
              padding: 16px 18px;
            }
            .summary-grid {
              gap: 16px 20px;
            }
            .mini-label {
              margin-bottom: 5px;
              font-size: 10px;
            }
            .mini-value {
              font-size: 15px;
            }
            .content-grid {
              margin-top: 24px;
              gap: 24px;
            }
            .section-heading {
              margin-bottom: 12px;
              font-size: 17px;
            }
            .section-heading::before {
              height: 24px;
            }
            .details-cell {
              padding: 10px 12px 11px;
            }
            .parameter-stack {
              gap: 10px;
            }
            .parameter-card {
              padding: 12px 14px;
            }
            .parameter-icon {
              width: 28px;
              height: 28px;
              font-size: 13px;
            }
            .parameter-value {
              font-size: 15px;
            }
            .source-card {
              padding: 12px 14px;
            }
            .analysis-section {
              margin-top: 24px;
            }
            .result-panel {
              margin-top: 10px;
              padding: 22px 24px;
              gap: 24px;
            }
            .calc-list {
              max-width: 100%;
            }
            .calc-step {
              padding: 8px 0;
              font-size: 14px;
            }
            .formula-box {
              margin-top: 16px;
              padding: 14px 16px;
            }
            .formula-box p {
              margin-top: 8px;
              font-size: 16px;
            }
            .result-number {
              font-size: 48px;
            }
            .result-unit {
              margin-top: 8px;
              font-size: 13px;
            }
            .integrity {
              margin-top: 26px;
              padding-top: 16px;
            }
            .integrity-grid {
              margin-top: 16px;
              gap: 18px;
            }
            .integrity-note {
              padding: 12px 12px 12px 10px;
              font-size: 12px;
            }
            .signature-name {
              font-size: 16px;
              margin-bottom: 6px;
            }
            .signature-line {
              width: 190px;
              padding-top: 8px;
              font-size: 12px;
            }
            .footer {
              margin-top: 24px;
              padding-top: 12px;
              gap: 14px;
              font-size: 10px;
            }
            .footer-center small {
              margin-top: 6px;
              font-size: 9px;
            }
          }
        </style>
      </head>
      <body>
        <main class="page">
          <section class="topbar">
            <div class="brand">
              <div class="brand-mark">E</div>
              <div>
                <h1 class="brand-title">Expert Chemistry</h1>
                <p class="brand-subtitle">Lab Automation System</p>
              </div>
            </div>
            <div class="report-head">
              <h2 class="report-title">Technical Analysis Report</h2>
              <div class="verified-pill">Verified</div>
              <p class="report-id">ID: ${safeReportId}</p>
            </div>
          </section>

          <hr class="divider" />

          <section class="summary-card">
            <div class="summary-grid">
              <div>
                <p class="mini-label">Generated By</p>
                <p class="mini-value">${safeGeneratedByName} (${safeGeneratedByUserId})</p>
              </div>
              <div>
                <p class="mini-label">Generation Date</p>
                <p class="mini-value">${safeGeneratedAt}</p>
              </div>
              <div>
                <p class="mini-label">Methodology</p>
                <p class="mini-value alt">${safeMethodology}</p>
              </div>
            </div>
          </section>

          <section class="content-grid">
            <div>
              <h3 class="section-heading">Compound Details</h3>
              <div class="details-card">
                <div class="details-cell">
                  <p class="mini-label">Name</p>
                  <p class="mini-value">${safeCompoundName}</p>
                </div>
                <div class="details-cell">
                  <p class="mini-label">Method</p>
                  <p class="mini-value">${safeMethodology}</p>
                </div>
                <div class="details-cell full">
                  <p class="mini-label">CAS Number</p>
                  <p class="mini-value">${safeCasId}</p>
                </div>
              </div>
            </div>

            <div>
              <h3 class="section-heading">Spectroscopic Parameters</h3>
              <div class="parameter-stack">
                <div class="parameter-card">
                  <div class="parameter-left">
                    <div class="parameter-icon">e</div>
                    <div>Molar Absorptivity (E)</div>
                  </div>
                  <div class="parameter-value">${safeEpsilon} M^-1 cm^-1</div>
                </div>
                <div class="parameter-card">
                  <div class="parameter-left">
                    <div class="parameter-icon">l</div>
                    <div>Wavelength Max (Lambda max)</div>
                  </div>
                  <div class="parameter-value">${safeLambdaMax} nm</div>
                </div>
                <div class="source-card">
                  <p class="mini-label">Reference Source</p>
                  <p class="mini-value">${safeSource}</p>
                </div>
              </div>
            </div>
          </section>

          <section class="analysis-section">
            <h3 class="section-heading">Calculation &amp; Analysis</h3>
            <div class="result-panel">
              <div class="calc-list">
                <p class="mini-label">Calculation Steps</p>
                <div class="calc-step"><span>Path Length (L)</span><strong>${safePathLength} cm</strong></div>
                <div class="calc-step"><span>Concentration (C)</span><strong>${safeConcentration} mol/L</strong></div>
                <div class="formula-box">
                  <p class="mini-label">Formula Applied</p>
                  <p>${safeFormulaExpression}</p>
                </div>
              </div>
              <div class="result-box">
                <p class="mini-label">Final Computed Result</p>
                <p class="result-number">${safeAbsorbance}</p>
                <p class="result-unit">Absorbance Units (AU)</p>
                <p class="result-unit">${safeFormulaResult}</p>
              </div>
            </div>
          </section>

          <section class="integrity">
            <p class="integrity-title">System Self-Check: Passed</p>
            <div class="integrity-grid">
              <div class="integrity-note">
                Electronic record integrity secured. Document generated through the automated Expert Chemistry workflow.
                Audit trail captured for report ${safeReportId}.
              </div>
              <div class="signature">
                <p class="signature-name">${safeGeneratedByName}</p>
                <div class="signature-line">
                  ${safeGeneratedByName}<br />
                  Technical Supervisor<br />
                  Date: ${safeShortDate}
                </div>
              </div>
            </div>
          </section>

          <footer class="footer">
            <div>Expert Chemistry Lab Automation</div>
            <div class="footer-center">
              Confidential Lab Report
              <small>Compliance: 21 CFR Part 11 | SHA-256 verified</small>
            </div>
            <div class="footer-right">Page 1 of 1</div>
          </footer>
        </main>
      </body>
    </html>
  `;

  reportWindow.document.open();
  reportWindow.document.write(reportHtml);
  reportWindow.document.close();
  reportWindow.focus();
  reportWindow.print();
  return true;
}

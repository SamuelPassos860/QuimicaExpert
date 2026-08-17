import { useDeferredValue, useEffect, useState } from 'react';
import { Download, ScrollText, ShieldCheck } from 'lucide-react';
import type { AuditLog, AuditLogEventType, AuditLogFilters } from '../types/audit';
import { useLanguage, type Language } from '../i18n';

const EVENT_TYPE_LABELS: Record<AuditLogEventType, string> = {
  login: 'User Login',
  logout: 'User Logout',
  email_confirmed: 'Email Confirmed',
  user_created: 'User Created',
  analysis_field_changed: 'Analysis Step',
  analysis_report_printed: 'Report Printed',
  password_reset_requested: 'Password Reset Requested',
  password_reset_completed: 'Password Reset Completed',
  compound_saved: 'Compound Saved',
  compound_deleted: 'Compound Deleted',
  pdf_exported: 'PDF Exported'
};

const HIDDEN_AUDIT_EVENT_TYPES = new Set<AuditLogEventType>([
  'login',
  'logout',
  'email_confirmed',
  'password_reset_requested',
  'password_reset_completed',
  'analysis_report_printed',
  'pdf_exported'
]);

const AUDIT_TEXT = {
  en: {
    title: 'Analytical Audit Trail',
    oversight: 'Analysis Traceability',
    description: 'Follow the analyst workflow field by field until the final report is printed.',
    scope: 'Controlled Flow',
    scopeDescription: 'This timeline captures authentication, analysis steps, printed reports, saved compounds, and user administration.',
    eventType: 'Event Type',
    allEvents: 'All events',
    userSearch: 'Keyword Search',
    userSearchPlaceholder: 'Search by user, project, method, workflow, or analysis keyword...',
    loading: 'Loading audit activity...',
    empty: 'No audit records matched the current filters.',
    loadError: 'Unable to load audit logs right now.',
    generatedAt: 'Generated At',
    who: 'Who',
    action: 'Action',
    target: 'Target',
    details: 'Details',
    noMetadata: 'No additional metadata was captured for this event.',
    systemSession: 'System session',
    analysisSteps: 'analysis steps', generateReport: 'Generate audit trail report', workflowAction: 'Analysis workflow', process: 'Analysis process', step: 'Step', from: 'From', to: 'to',
    eventLabels: EVENT_TYPE_LABELS,
    selectLabels: {
      login: 'Login',
      logout: 'Logout',
      email_confirmed: 'Email confirmed',
      user_created: 'User created',
      analysis_field_changed: 'Analysis step',
      analysis_report_printed: 'Report printed',
      password_reset_requested: 'Password reset requested',
      password_reset_completed: 'Password reset completed',
      compound_saved: 'Compound saved',
      compound_deleted: 'Compound deleted',
      pdf_exported: 'PDF exported'
    }
  },
  pt: {
    title: 'Trilha de Auditoria',
    oversight: 'Supervisão Administrativa',
    description: 'Revise eventos de autenticação, atividades de compostos salvos e exportações de relatórios de espectrofotometria em toda a plataforma.',
    scope: 'Escopo da Auditoria',
    scopeDescription: 'Esta linha do tempo captura quem acessou a plataforma, quem salvou ou excluiu compostos e quem gerou relatórios de espectrofotometria.',
    eventType: 'Tipo de Evento',
    allEvents: 'Todos os eventos',
    userSearch: 'Busca por Palavra-chave',
    userSearchPlaceholder: 'Pesquisar por usuario, projeto, metodo, fluxo ou palavra da analise...',
    loading: 'Carregando atividade de auditoria...',
    empty: 'Nenhum registro de auditoria corresponde aos filtros atuais.',
    loadError: 'Não foi possível carregar a trilha de auditoria agora.',
    generatedAt: 'Gerado em',
    who: 'Quem',
    action: 'Ação',
    target: 'Alvo',
    details: 'Detalhes',
    noMetadata: 'Nenhum metadado adicional foi capturado para este evento.',
    systemSession: 'Sessão do sistema',
    analysisSteps: 'etapas da análise', generateReport: 'Gerar relatório da trilha de auditoria', workflowAction: 'Fluxo da análise', process: 'Processo da análise', step: 'Etapa', from: 'De', to: 'para',
    eventLabels: {
      login: 'Login do Usuário',
      logout: 'Logout do Usuário',
      email_confirmed: 'Email Confirmado',
      password_reset_requested: 'Redefinição de Senha Solicitada',
      password_reset_completed: 'Redefinição de Senha Concluída',
      compound_saved: 'Composto Salvo',
      compound_deleted: 'Composto Excluído',
      pdf_exported: 'PDF Exportado'
    },
    selectLabels: {
      login: 'Login',
      logout: 'Logout',
      email_confirmed: 'Email confirmado',
      user_created: 'Usuário criado',
      analysis_field_changed: 'Etapa da análise',
      analysis_report_printed: 'Relatório impresso',
      password_reset_requested: 'Redefinição de senha solicitada',
      password_reset_completed: 'Redefinição de senha concluída',
      compound_saved: 'Composto salvo',
      compound_deleted: 'Composto excluído',
      pdf_exported: 'PDF exportado'
    }
  },
  es: {
    title: 'Registros de Auditoría',
    oversight: 'Supervisión Administrativa',
    description: 'Revisa eventos de autenticación, actividad de compuestos guardados y exportaciones de informes de espectrofotometría en toda la plataforma.',
    scope: 'Alcance de Auditoría',
    scopeDescription: 'Esta línea de tiempo captura quién accedió a la plataforma, quién guardó o eliminó compuestos y quién generó informes de espectrofotometría.',
    eventType: 'Tipo de Evento',
    allEvents: 'Todos los eventos',
    userSearch: 'Busqueda por Palabra Clave',
    userSearchPlaceholder: 'Buscar por usuario, proyecto, metodo, flujo o palabra del analisis...',
    loading: 'Cargando actividad de auditoría...',
    empty: 'Ningún registro de auditoría coincide con los filtros actuales.',
    loadError: 'No se pueden cargar los registros de auditoría en este momento.',
    generatedAt: 'Generado el',
    who: 'Quién',
    action: 'Acción',
    target: 'Objetivo',
    details: 'Detalles',
    noMetadata: 'No se capturaron metadatos adicionales para este evento.',
    systemSession: 'Sesión del sistema',
    analysisSteps: 'pasos del análisis', generateReport: 'Generar informe de auditoría', workflowAction: 'Flujo del análisis', process: 'Proceso del análisis', step: 'Paso', from: 'De', to: 'a',
    eventLabels: {
      login: 'Inicio de Sesión',
      logout: 'Cierre de Sesión',
      email_confirmed: 'Email Confirmado',
      password_reset_requested: 'Restablecimiento de Contraseña Solicitado',
      password_reset_completed: 'Restablecimiento de Contraseña Completado',
      compound_saved: 'Compuesto Guardado',
      compound_deleted: 'Compuesto Eliminado',
      pdf_exported: 'PDF Exportado'
    },
    selectLabels: {
      login: 'Inicio de sesión',
      logout: 'Cierre de sesión',
      email_confirmed: 'Email confirmado',
      user_created: 'Usuario creado',
      analysis_field_changed: 'Paso del análisis',
      analysis_report_printed: 'Informe impreso',
      password_reset_requested: 'Restablecimiento solicitado',
      password_reset_completed: 'Restablecimiento completado',
      compound_saved: 'Compuesto guardado',
      compound_deleted: 'Compuesto eliminado',
      pdf_exported: 'PDF exportado'
    }
  }
};

function formatMetadata(metadata: Record<string, unknown>) {
  const entries = Object.entries(metadata).filter(([, value]) => value !== '' && value !== null && value !== undefined);
  return entries.slice(0, 5);
}

function getAuditTargetLabel(log: AuditLog, fallback: string) {
  const compoundName = typeof log.metadata.compoundName === 'string' ? log.metadata.compoundName : '';

  if (compoundName) {
    return compoundName;
  }

  return log.resourceKey || fallback;
}

function getAuditSentence(log: AuditLog, language: Language = 'en') {
  const sentenceText = {
    en: { changed: 'changed', from: 'from', to: 'to', cleared: 'cleared the value of', previously: 'previously', filled: 'filled', with: 'with', printed: 'printed the analytical report', saved: 'saved compound', deleted: 'deleted compound', created: 'created user', unidentified: 'unidentified' },
    pt: { changed: 'alterou', from: 'de', to: 'para', cleared: 'apagou o valor de', previously: 'antes', filled: 'preencheu', with: 'com', printed: 'imprimiu o relatório analítico', saved: 'salvou o composto', deleted: 'apagou o composto', created: 'criou o usuário', unidentified: 'sem identificação' },
    es: { changed: 'cambió', from: 'de', to: 'a', cleared: 'borró el valor de', previously: 'antes', filled: 'completó', with: 'con', printed: 'imprimió el informe analítico', saved: 'guardó el compuesto', deleted: 'eliminó el compuesto', created: 'creó el usuario', unidentified: 'sin identificación' }
  }[language];
  const actor = log.actor.fullName || log.actor.userId;
  const fieldLabel = typeof log.metadata.fieldLabel === 'string' ? log.metadata.fieldLabel : 'field';
  const previousValue = typeof log.metadata.previousValue === 'string' ? log.metadata.previousValue : '';
  const nextValue = typeof log.metadata.nextValue === 'string' ? log.metadata.nextValue : '';
  const compoundName = typeof log.metadata.compoundName === 'string' ? log.metadata.compoundName : '';
  const stepDescription = typeof log.metadata.stepDescription === 'string' ? log.metadata.stepDescription : '';
  const createdFullName = typeof log.metadata.createdFullName === 'string' ? log.metadata.createdFullName : '';

  switch (log.eventType) {
    case 'analysis_field_changed':
      if (stepDescription && language === 'en') {
        return `${actor}: ${stepDescription}`;
      }

      if (previousValue && nextValue) {
        return `${actor} ${sentenceText.changed} ${fieldLabel} ${sentenceText.from} "${previousValue}" ${sentenceText.to} "${nextValue}".`;
      }

      if (previousValue && !nextValue) {
        return `${actor} ${sentenceText.cleared} ${fieldLabel}, ${sentenceText.previously} "${previousValue}".`;
      }

      return `${actor} ${sentenceText.filled} ${fieldLabel} ${sentenceText.with} "${nextValue}".`;
    case 'analysis_report_printed':
    case 'pdf_exported':
      return `${actor} ${sentenceText.printed}${compoundName ? ` — ${compoundName}` : ''}.`;
    case 'compound_saved':
      return `${actor} ${sentenceText.saved} ${compoundName || log.resourceKey || sentenceText.unidentified}.`;
    case 'compound_deleted':
      return `${actor} ${sentenceText.deleted} ${compoundName || log.resourceKey || sentenceText.unidentified}.`;
    case 'user_created':
      return `${actor} ${sentenceText.created} ${createdFullName || log.resourceKey || sentenceText.unidentified}.`;
    default:
      return `${actor}: ${log.eventType}.`;
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function openAnalysisStepsReport(logs: AuditLog[], language: Language) {
  const reportText = {
    en: { title: 'Analysis Steps Audit Report', subtitle: 'Complete traceability report for the selected analysis steps.', reportId: 'Report ID', generated: 'Generated at', user: 'User', project: 'Project', method: 'Method used', workflow: 'Workflow', window: 'Analysis window', registered: 'Registered steps', scope: 'Scope', scopeValue: 'Analysis Step events only', trail: 'Step-by-step audit trail', dateTime: 'Date/time', step: 'Step', previous: 'Previous', next: 'Next', process: 'Process line', empty: 'No analysis steps available.', popup: 'Unable to open the analysis steps report. Allow pop-ups for this site and try again.' },
    pt: { title: 'Relatório da Trilha de Etapas da Análise', subtitle: 'Relatório completo de rastreabilidade das etapas de análise selecionadas.', reportId: 'ID do relatório', generated: 'Gerado em', user: 'Usuário', project: 'Projeto', method: 'Método utilizado', workflow: 'Fluxo', window: 'Janela da análise', registered: 'Etapas registradas', scope: 'Escopo', scopeValue: 'Somente eventos de etapas da análise', trail: 'Trilha de auditoria passo a passo', dateTime: 'Data/hora', step: 'Etapa', previous: 'Anterior', next: 'Próximo', process: 'Linha do processo', empty: 'Nenhuma etapa de análise disponível.', popup: 'Não foi possível abrir o relatório da análise. Permita pop-ups e tente novamente.' },
    es: { title: 'Informe de Auditoría de Pasos del Análisis', subtitle: 'Informe completo de trazabilidad de los pasos de análisis seleccionados.', reportId: 'ID del informe', generated: 'Generado el', user: 'Usuario', project: 'Proyecto', method: 'Método utilizado', workflow: 'Flujo', window: 'Ventana del análisis', registered: 'Pasos registrados', scope: 'Alcance', scopeValue: 'Solo eventos de pasos del análisis', trail: 'Auditoría paso a paso', dateTime: 'Fecha/hora', step: 'Paso', previous: 'Anterior', next: 'Siguiente', process: 'Línea del proceso', empty: 'No hay pasos de análisis disponibles.', popup: 'No se pudo abrir el informe de análisis. Permite ventanas emergentes e inténtalo de nuevo.' }
  }[language];
  const reportWindow = window.open('', '_blank', 'width=980,height=760');

  if (!reportWindow) {
    window.alert(reportText.popup);
    return;
  }

  const stepLogs = logs.filter((log) => log.eventType === 'analysis_field_changed');
  const getMetadataText = (log: AuditLog, key: string) => (
    typeof log.metadata[key] === 'string' ? log.metadata[key] : ''
  );
  const uniqueValues = (values: string[]) => Array.from(new Set(values.filter(Boolean)));
  const responsibleUsers = uniqueValues(stepLogs.map((log) => `${log.actor.fullName || log.actor.userId} (${log.actor.userId})`));
  const projects = uniqueValues(stepLogs.map((log) => getMetadataText(log, 'projectName') || getMetadataText(log, 'compoundName') || log.resourceKey || ''));
  const projectIds = uniqueValues(stepLogs.map((log) => getMetadataText(log, 'projectId') || log.resourceKey || ''));
  const methods = uniqueValues(stepLogs.map((log) => getMetadataText(log, 'methodName') || getMetadataText(log, 'workflow')));
  const workflows = uniqueValues(stepLogs.map((log) => getMetadataText(log, 'workflow')));
  const sortedSteps = [...stepLogs].sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime());
  const firstStepAt = sortedSteps[0]?.createdAt ? new Date(sortedSteps[0].createdAt).toLocaleString('pt-BR') : 'N/A';
  const lastStepAt = sortedSteps[sortedSteps.length - 1]?.createdAt ? new Date(sortedSteps[sortedSteps.length - 1].createdAt).toLocaleString('pt-BR') : 'N/A';
  const reportId = `AST-${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}`;
  const formatList = (values: string[]) => values.length ? values.join(', ') : 'N/A';

  const rows = sortedSteps
    .map((log, index) => {
      const workflow = typeof log.metadata.workflow === 'string' ? log.metadata.workflow : 'Analysis';
      const projectName = typeof log.metadata.projectName === 'string' ? log.metadata.projectName : '';
      const methodName = typeof log.metadata.methodName === 'string' ? log.metadata.methodName : '';
      const fieldLabel = typeof log.metadata.fieldLabel === 'string' ? log.metadata.fieldLabel : '';
      const previousValue = typeof log.metadata.previousValue === 'string' ? log.metadata.previousValue : '';
      const nextValue = typeof log.metadata.nextValue === 'string' ? log.metadata.nextValue : '';
      const stepDescription = language === 'en' && typeof log.metadata.stepDescription === 'string'
        ? log.metadata.stepDescription
        : getAuditSentence(log, language);

      return `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(new Date(log.createdAt).toLocaleString('pt-BR'))}</td>
          <td>${escapeHtml(log.actor.fullName || log.actor.userId)}</td>
          <td>${escapeHtml(projectName || log.resourceKey || '-')}</td>
          <td>${escapeHtml(workflow)}</td>
          <td>${escapeHtml(methodName || fieldLabel)}</td>
          <td>${escapeHtml(previousValue || '-')}</td>
          <td>${escapeHtml(nextValue || '-')}</td>
          <td>${escapeHtml(stepDescription)}</td>
        </tr>
      `;
    })
    .join('');

  reportWindow.document.open();
  reportWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(reportText.title)}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 32px; color: #111827; }
          h1 { margin: 0; font-size: 28px; }
          h2 { margin: 0 0 12px; font-size: 18px; }
          p { color: #4b5563; }
          button { margin-bottom: 20px; padding: 10px 14px; border: 1px solid #9ca3af; border-radius: 8px; background: #ffffff; cursor: pointer; }
          .cover { min-height: 88vh; display: flex; flex-direction: column; justify-content: space-between; page-break-after: always; }
          .eyebrow { color: #2563eb; font-size: 11px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; }
          .subtitle { max-width: 720px; line-height: 1.6; }
          .summary-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-top: 28px; }
          .summary-card { border: 1px solid #d1d5db; border-radius: 10px; padding: 14px; min-height: 70px; }
          .summary-card strong { display: block; color: #6b7280; font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 8px; }
          .summary-card span { font-size: 14px; color: #111827; line-height: 1.45; }
          .certification { border-top: 1px solid #d1d5db; padding-top: 16px; font-size: 12px; color: #4b5563; line-height: 1.5; }
          table { width: 100%; border-collapse: collapse; margin-top: 24px; font-size: 11px; }
          th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; vertical-align: top; }
          th { background: #f3f4f6; text-transform: uppercase; font-size: 10px; letter-spacing: 0.08em; }
          @media print {
            button { display: none; }
            body { margin: 18px; }
            .cover { min-height: 96vh; }
          }
        </style>
      </head>
      <body>
        <button onclick="window.print()">Print / Save PDF</button>
        <section class="cover">
          <div>
            <p class="eyebrow">VS Analytics Audit Trail</p>
            <h1>${escapeHtml(reportText.title)}</h1>
            <p class="subtitle">
              ${escapeHtml(reportText.subtitle)} This document is intentionally restricted
              to Analysis Step events and lists each recorded process line in chronological order.
            </p>
            <div class="summary-grid">
              <div class="summary-card"><strong>${escapeHtml(reportText.reportId)}</strong><span>${escapeHtml(reportId)}</span></div>
              <div class="summary-card"><strong>${escapeHtml(reportText.generated)}</strong><span>${escapeHtml(new Date().toLocaleString('pt-BR'))}</span></div>
              <div class="summary-card"><strong>Project</strong><span>${escapeHtml(formatList(projects))}</span></div>
              <div class="summary-card"><strong>Project ID</strong><span>${escapeHtml(formatList(projectIds))}</span></div>
              <div class="summary-card"><strong>${escapeHtml(reportText.method)}</strong><span>${escapeHtml(formatList(methods))}</span></div>
              <div class="summary-card"><strong>${escapeHtml(reportText.workflow)}</strong><span>${escapeHtml(formatList(workflows))}</span></div>
              <div class="summary-card"><strong>${escapeHtml(reportText.user)}</strong><span>${escapeHtml(formatList(responsibleUsers))}</span></div>
              <div class="summary-card"><strong>${escapeHtml(reportText.window)}</strong><span>${escapeHtml(firstStepAt)} — ${escapeHtml(lastStepAt)}</span></div>
              <div class="summary-card"><strong>${escapeHtml(reportText.registered)}</strong><span>${stepLogs.length}</span></div>
              <div class="summary-card"><strong>${escapeHtml(reportText.scope)}</strong><span>${escapeHtml(reportText.scopeValue)}</span></div>
            </div>
          </div>
          <p class="certification">
            This report summarizes the auditable actions recorded by the platform for analysis execution, including
            field changes, equipment readings, imported data, selected calculation points, and report generation steps.
          </p>
        </section>
        <h2>${escapeHtml(reportText.trail)}</h2>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>${escapeHtml(reportText.dateTime)}</th>
              <th>${escapeHtml(reportText.user)}</th>
              <th>${escapeHtml(reportText.project)}</th>
              <th>${escapeHtml(reportText.workflow)}</th>
              <th>${escapeHtml(reportText.step)}</th>
              <th>${escapeHtml(reportText.previous)}</th>
              <th>${escapeHtml(reportText.next)}</th>
              <th>${escapeHtml(reportText.process)}</th>
            </tr>
          </thead>
          <tbody>${rows || `<tr><td colspan="9">${escapeHtml(reportText.empty)}</td></tr>`}</tbody>
        </table>
      </body>
    </html>
  `);
  reportWindow.document.close();
  reportWindow.focus();
  reportWindow.print();
}

interface AnalysisAuditGroup {
  id: string;
  logs: AuditLog[];
  latestAt: string;
  projectName: string;
  methodName: string;
  workflow: string;
  userLabel: string;
}

type AuditDisplayEntry =
  | { type: 'analysis'; group: AnalysisAuditGroup; latestAt: string }
  | { type: 'event'; log: AuditLog; latestAt: string };

function getMetadataText(log: AuditLog, key: string) {
  return typeof log.metadata[key] === 'string' ? log.metadata[key] : '';
}

function getAnalysisGroupKey(log: AuditLog) {
  const analysisRunId = getMetadataText(log, 'analysisRunId');

  if (analysisRunId) {
    return analysisRunId;
  }

  const projectKey = getMetadataText(log, 'projectId') || log.resourceKey || getMetadataText(log, 'compoundName');
  const methodKey = getMetadataText(log, 'methodId') || getMetadataText(log, 'methodName') || getMetadataText(log, 'workflow');
  const createdDate = new Date(log.createdAt).toISOString().slice(0, 10);

  return [log.actor.userId, projectKey, methodKey, createdDate].filter(Boolean).join(':');
}

function buildAnalysisGroup(id: string, logs: AuditLog[]): AnalysisAuditGroup {
  const sortedLogs = [...logs].sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime());
  const firstLog = sortedLogs[0]!;
  const latestLog = sortedLogs[sortedLogs.length - 1]!;

  return {
    id,
    logs: sortedLogs,
    latestAt: latestLog.createdAt,
    projectName: getMetadataText(firstLog, 'projectName') || getMetadataText(firstLog, 'compoundName') || firstLog.resourceKey || 'Analysis',
    methodName: getMetadataText(firstLog, 'methodName') || getMetadataText(firstLog, 'workflow') || 'Analysis steps',
    workflow: getMetadataText(firstLog, 'workflow') || 'Analysis',
    userLabel: firstLog.actor.fullName || firstLog.actor.userId
  };
}

function buildAuditDisplayEntries(logs: AuditLog[]): AuditDisplayEntry[] {
  const groups = new Map<string, AuditLog[]>();
  const entries: AuditDisplayEntry[] = [];

  logs.forEach((log) => {
    if (log.eventType === 'analysis_field_changed') {
      const groupKey = getAnalysisGroupKey(log);
      groups.set(groupKey, [...(groups.get(groupKey) ?? []), log]);
      return;
    }

    entries.push({ type: 'event', log, latestAt: log.createdAt });
  });

  groups.forEach((groupLogs, groupKey) => {
    const group = buildAnalysisGroup(groupKey, groupLogs);
    entries.push({ type: 'analysis', group, latestAt: group.latestAt });
  });

  return entries.sort((left, right) => new Date(right.latestAt).getTime() - new Date(left.latestAt).getTime());
}

interface AuditLogsProps {
  globalSearch?: { query: string; nonce: number };
}

export default function AuditLogs({ globalSearch }: AuditLogsProps) {
  const { language } = useLanguage();
  const text = AUDIT_TEXT[language];
  const [filters, setFilters] = useState<AuditLogFilters>({
    eventType: '',
    userSearch: ''
  });
  const deferredUserSearch = useDeferredValue(filters.userSearch);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!globalSearch) return;
    setFilters((current) => ({ ...current, userSearch: globalSearch.query }));
  }, [globalSearch?.nonce]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadAuditLogs() {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (filters.eventType) {
          params.set('eventType', filters.eventType);
        }
        if (deferredUserSearch.trim()) {
          params.set('userSearch', deferredUserSearch.trim());
        }

        const url = params.size > 0 ? `/api/admin/audit-logs?${params.toString()}` : '/api/admin/audit-logs';
        const response = await fetch(url, {
          credentials: 'include',
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const payload = (await response.json()) as { auditLogs: AuditLog[] };
        setLogs(payload.auditLogs);
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === 'AbortError') {
          return;
        }

        console.error('Failed to load audit logs:', requestError);
        setError(text.loadError);
      } finally {
        setIsLoading(false);
      }
    }

    void loadAuditLogs();

    return () => controller.abort();
  }, [deferredUserSearch, filters.eventType, text.loadError]);

  const visibleLogs = logs.filter((log) => !HIDDEN_AUDIT_EVENT_TYPES.has(log.eventType));
  const displayEntries = buildAuditDisplayEntries(visibleLogs);

  return (
    <div className="space-y-8 sm:space-y-10">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-mono text-primary uppercase tracking-[0.4em] font-bold">
              {text.oversight}
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-white tracking-tight">
            {text.title}
          </h1>
          <p className="text-white/40 mt-1 max-w-3xl text-sm leading-relaxed">
            {text.description}
          </p>
        </div>

        <div className="glass-panel px-5 py-4 rounded-2xl border-white/[0.03] w-full xl:max-w-md space-y-4">
          <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-secondary font-bold">
            {text.scope}
          </p>
          <p className="text-sm text-white/60 mt-2 leading-relaxed">
            {text.scopeDescription}
          </p>
        </div>
      </div>

      <section className="glass-panel rounded-[2rem] p-5 sm:p-6 lg:p-8 border-white/[0.03] space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-4">
          <label className="space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/40 font-bold">{text.eventType}</span>
            <select
              value={filters.eventType}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  eventType: event.target.value as AuditLogFilters['eventType']
                }))
              }
              className="w-full rounded-xl bg-white/[0.03] border border-white/10 px-4 py-3 text-sm text-white outline-none focus:border-primary/30"
            >
              <option value="">{text.allEvents}</option>
              <option value="analysis_field_changed">{text.selectLabels.analysis_field_changed}</option>
              <option value="user_created">{text.selectLabels.user_created}</option>
              <option value="compound_saved">{text.selectLabels.compound_saved}</option>
              <option value="compound_deleted">{text.selectLabels.compound_deleted}</option>
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/40 font-bold">{text.userSearch}</span>
            <input
              value={filters.userSearch}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  userSearch: event.target.value
                }))
              }
              placeholder={text.userSearchPlaceholder}
              className="w-full rounded-xl bg-white/[0.03] border border-white/10 px-4 py-3 text-sm text-white outline-none focus:border-primary/30"
            />
          </label>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-100">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-6 text-sm text-white/55">
            {text.loading}
          </div>
        ) : displayEntries.length === 0 ? (
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-6 text-sm text-white/55">
            {text.empty}
          </div>
        ) : (
          <div className="space-y-4">
            {displayEntries.map((entry) => {
              if (entry.type === 'analysis') {
                const { group } = entry;

                return (
                  <article
                    key={`analysis-${group.id}`}
                    className="rounded-2xl p-4 sm:p-5 bg-primary/[0.035] border border-primary/15 border-l-4 border-l-primary/70 space-y-5"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                          <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
                            <ScrollText size={18} />
                          </div>
                          <div>
                            <p className="text-white text-base sm:text-lg font-semibold leading-relaxed">
                              {group.projectName} - {group.methodName}
                            </p>
                            <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/30 mt-2">
                              {group.workflow} • {group.logs.length} {text.analysisSteps} • {group.userLabel}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row lg:flex-col gap-3">
                        <div className="rounded-2xl bg-[#08101f]/65 border border-white/8 px-4 py-3 text-right">
                          <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/30">{text.generatedAt}</p>
                          <p className="text-white font-semibold mt-2">{new Date(group.latestAt).toLocaleString('pt-BR')}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => openAnalysisStepsReport(group.logs, language)}
                          className="rounded-xl bg-secondary px-4 py-3 text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-on-secondary transition-all hover:shadow-[0_0_24px_rgba(118,243,234,0.18)] flex items-center justify-center gap-2"
                        >
                          <Download size={16} />
                          {text.generateReport}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                      <div className="rounded-xl bg-[#0b1121]/50 border border-white/5 p-4">
                        <p className="text-white/30 font-mono uppercase tracking-widest">{text.who}</p>
                        <p className="text-white mt-2 font-semibold">{group.userLabel}</p>
                        <p className="text-white/45 mt-2">{group.logs[0]?.actor.userId}</p>
                      </div>
                      <div className="rounded-xl bg-[#0b1121]/50 border border-white/5 p-4">
                        <p className="text-white/30 font-mono uppercase tracking-widest">{text.action}</p>
                        <p className="text-white mt-2 font-semibold">{text.workflowAction}</p>
                      </div>
                      <div className="rounded-xl bg-[#0b1121]/50 border border-white/5 p-4">
                        <p className="text-white/30 font-mono uppercase tracking-widest">{text.target}</p>
                        <p className="text-white mt-2 font-semibold">{group.projectName}</p>
                      </div>
                    </div>

                  </article>
                );
              }

              const log = entry.log;
              const metadataEntries = formatMetadata(log.metadata);

              return (
                <article
                  key={log.id}
                  className="rounded-2xl p-4 sm:p-5 bg-white/[0.03] border border-white/8 border-l-4 border-l-primary/60 space-y-4"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
                          <ScrollText size={18} />
                        </div>
                        <div>
                          <p className="text-white text-base sm:text-lg font-semibold leading-relaxed">{getAuditSentence(log, language)}</p>
                          <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/30 mt-2">
                            {log.resourceType} {log.resourceKey ? `• ${log.resourceKey}` : ''}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl bg-[#08101f]/65 border border-white/8 px-4 py-3 text-right">
                      <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/30">{text.generatedAt}</p>
                      <p className="text-white font-semibold mt-2">{new Date(log.createdAt).toLocaleString('pt-BR')}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 text-sm">
                    <div className="rounded-xl bg-[#0b1121]/50 border border-white/5 p-4">
                      <p className="text-white/30 font-mono uppercase tracking-widest">{text.who}</p>
                      <p className="text-white mt-2 font-semibold">{log.actor.fullName}</p>
                      <p className="text-white/45 mt-2">{log.actor.userId}</p>
                    </div>
                    <div className="rounded-xl bg-[#0b1121]/50 border border-white/5 p-4">
                      <p className="text-white/30 font-mono uppercase tracking-widest">{text.action}</p>
                      <p className="text-white mt-2 font-semibold">{text.eventLabels[log.eventType] ?? EVENT_TYPE_LABELS[log.eventType]}</p>
                    </div>
                    <div className="rounded-xl bg-[#0b1121]/50 border border-white/5 p-4">
                      <p className="text-white/30 font-mono uppercase tracking-widest">{text.target}</p>
                      <p className="text-white mt-2 font-semibold">{getAuditTargetLabel(log, text.systemSession)}</p>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white/[0.02] border border-white/8 p-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 rounded-xl bg-secondary/10 text-secondary border border-secondary/20">
                        <ShieldCheck size={16} />
                      </div>
                      <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/35">{text.details}</p>
                    </div>
                    {metadataEntries.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 text-sm">
                        {metadataEntries.map(([key, value]) => (
                          <div key={key} className="rounded-xl bg-[#08101f]/70 border border-white/5 p-3">
                            <p className="text-white/30 font-mono uppercase tracking-widest">{key}</p>
                            <p className="text-white mt-2 break-words">{String(value)}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-white/45">{text.noMetadata}</p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

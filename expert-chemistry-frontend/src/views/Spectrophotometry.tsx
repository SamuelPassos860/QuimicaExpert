import { useDeferredValue, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, FlaskConical, Search, Sigma, Trash2, Waves } from 'lucide-react';
import type { ReportExportAuditPayload } from '../types/audit';
import type { AuthUser } from '../types/auth';
import { useLanguage } from '../i18n';
import { buildReportPayload, openPrintableReport } from '../utils/reportExport';

type SourceType = 'Bank' | 'PhotochemCAD' | 'Manual';
type TabType = 'calculate' | 'saved';

interface SavedCompoundRecord {
  id: string;
  cas: string;
  name: string;
  epsilon: number;
  lambdaMax: string;
  solvent: string;
  source: SourceType;
  pathLength: number;
  concentration: number;
  absorbance: number;
  savedAt: string;
}

interface SpectralRecord {
  id: string;
  name: string;
  cas: string;
  epsilon: number;
  lambdaMax: string;
  solvent: string;
  source: SourceType;
}

interface ApiCompoundRecord {
  cas: string;
  nome: string;
  epsilon_m_cm: number | string | null;
  lambda_max: string | null;
  solvent?: string | null;
  fonte: string | null;
  path_length_cm?: number | string | null;
  concentration_mol_l?: number | string | null;
  absorbance?: number | string | null;
  saved_at?: string | null;
}

interface ApiSpectralRecord {
  compound_name: string;
  cas?: string | null;
  absorption_wavelength_nm: number | string | null;
  molar_extinction_coefficient: number | string | null;
  absorption_solvent: string | null;
}

interface SpectrophotometryProps {
  currentUser: AuthUser;
  initialTab?: TabType;
  globalSearch?: { query: string; nonce: number };
}

const SPECTRO_TEXT = {
  en: {
    workflow: 'Beer-Lambert Workflow',
    title: 'Spectrophotometry Console',
    introStart: 'Calculation input now comes from',
    introMiddle: 'while saved compound results live in',
    dataFlow: 'Data Flow',
    dataFlowDescription: 'Use the calculation tab to pull epsilon and lambda max from spectral measurements, then switch to saved compounds when you want to review entries that are already stored.',
    calculate: 'Calculate',
    savedCompounds: 'Saved Compounds',
    step1: 'Step 1',
    selectCompound: 'Select a compound',
    chooseRecord: 'Choose a record from the spectral library.',
    step2: 'Step 2',
    enterValues: 'Enter experiment values',
    provideValues: 'Provide path length and concentration to complete the equation.',
    step3: 'Step 3',
    reviewAbsorbance: 'Review absorbance',
    saveOrExport: 'Save the result or export the session report when it looks right.',
    spectralLookup: 'Spectral Lookup',
    pullInputs: 'Pull inputs from spectral_data',
    libraryOrderedStart: 'The library is ordered from',
    libraryOrderedEnd: 'so you can scan compounds more quickly.',
    clearEntry: 'Clear Entry',
    searchSpectral: 'Search spectral_data by compound name or CAS...',
    refreshingLibrary: 'Refreshing spectral library...',
    compoundsAvailable: 'compounds available in the current view',
    searchSupports: 'Search supports compound names and CAS values',
    loadingSpectral: 'Loading spectral data...',
    noSpectralRecords: 'No spectral records found for this search.',
    spectralSource: 'Spectral source',
    epsilon: 'epsilon',
    lambdaMax: 'lambda max',
    solvent: 'solvent',
    analyticalInput: 'Analytical Input',
    calculateAbsorbance: 'Calculate absorbance',
    findAbsorbance: 'Find Absorbance',
    findConcentration: 'Find Concentration',
    currentCompound: 'Current Compound',
    selectFromLibrary: 'Select a compound from the spectral library',
    source: 'source',
    pathLength: 'Optical Path Length (cm)',
    concentration: 'Concentration (mol/L)',
    sampleAbsorbance: 'Sample Absorbance',
    blank: 'Blank (Baseline)',
    result: 'Result',
    targetAbsorbance: 'Target: Absorbance (A)',
    targetConcentration: 'Target: Concentration (c)',
    liveFormula: 'Live Formula Preview',
    saving: 'Saving...',
    saveToSaved: 'Save To Saved Compounds',
    enterCompound: 'Enter or select a compound before saving.',
    savedMessage: 'Compound saved to Saved Compounds.',
    saveError: 'Unable to save this compound right now.',
    spectralError: 'Unable to load spectral data right now.',
    savedError: 'Unable to load saved compounds right now.',
    deleteError: 'Unable to delete this saved compound right now.',
    chooseProjectAlert: 'Choose the project where this result should be placed before generating the report.',
    deleteTitle: 'Delete Saved Compound',
    deleteHeading: 'Remove this record from the saved library?',
    deletePrefix: 'This will permanently delete',
    deleteMiddle: 'with CAS',
    deleteSuffix: 'from the saved compounds list.',
    savedRecord: 'Saved record',
    absorbance: 'Absorbance',
    cancel: 'Cancel',
    deleting: 'Deleting...',
    deleteRecord: 'Delete Record'
    , sessionReport: 'Session Report',
    technicalReport: 'Technical analysis report',
    printPdf: 'Print PDF Report',
    projectDestination: 'Project destination',
    chooseDestination: 'Choose where this result will be placed',
    projectsLoaded: 'Projects are loaded automatically from the project library as new ones are created.',
    project: 'Project',
    notSelected: 'Not selected',
    generatedBy: 'Generated by',
    formula: 'Formula',
    compound: 'Compound',
    notIdentified: 'Not identified',
    finalReport: 'FINAL REPORT',
    savedResults: 'Saved Results',
    storedDatabase: 'Compounds already stored in the database',
    savedDescription: 'This tab is for reviewing compounds that already have stored calculation data in the compounds table.',
    searchSaved: 'Search saved compounds by CAS or name...',
    loadingSaved: 'Loading saved compounds...',
    noSaved: 'No saved compounds found.',
    saved: 'Saved',
    recently: 'recently',
    deleteSavedTitle: 'Delete saved compound',
    generatePdfTitle: 'Generate report PDF',
    pathLengthShort: 'path length'
  },
  pt: {
    workflow: 'Fluxo Beer-Lambert',
    title: 'Console de Espectrofotometria',
    introStart: 'A entrada de cálculo agora vem de',
    introMiddle: 'enquanto os resultados salvos ficam em',
    dataFlow: 'Fluxo de Dados',
    dataFlowDescription: 'Use a aba de cálculo para puxar epsilon e lambda max das medições espectrais, depois alterne para compostos salvos quando quiser revisar entradas já armazenadas.',
    calculate: 'Calcular',
    savedCompounds: 'Compostos Salvos',
    step1: 'Etapa 1',
    selectCompound: 'Selecione um composto',
    chooseRecord: 'Escolha um registro da biblioteca espectral.',
    step2: 'Etapa 2',
    enterValues: 'Insira os valores do experimento',
    provideValues: 'Informe caminho óptico e concentração para completar a equação.',
    step3: 'Etapa 3',
    reviewAbsorbance: 'Revise a absorbância',
    saveOrExport: 'Salve o resultado ou exporte o relatório quando estiver correto.',
    spectralLookup: 'Busca Espectral',
    pullInputs: 'Puxar entradas de spectral_data',
    libraryOrderedStart: 'A biblioteca está ordenada de',
    libraryOrderedEnd: 'para você localizar compostos mais rapidamente.',
    clearEntry: 'Limpar Entrada',
    searchSpectral: 'Pesquisar spectral_data por nome do composto ou CAS...',
    refreshingLibrary: 'Atualizando biblioteca espectral...',
    compoundsAvailable: 'compostos disponíveis na visualização atual',
    searchSupports: 'A busca aceita nomes de compostos e valores CAS',
    loadingSpectral: 'Carregando dados espectrais...',
    noSpectralRecords: 'Nenhum registro espectral encontrado para esta busca.',
    spectralSource: 'Fonte espectral',
    epsilon: 'epsilon',
    lambdaMax: 'lambda max',
    solvent: 'solvente',
    analyticalInput: 'Entrada Analítica',
    calculateAbsorbance: 'Calcular absorbância',
    findAbsorbance: 'Encontrar Absorbância',
    findConcentration: 'Encontrar Concentração',
    currentCompound: 'Composto Atual',
    selectFromLibrary: 'Selecione um composto da biblioteca espectral',
    source: 'fonte',
    pathLength: 'Caminho Óptico (cm)',
    concentration: 'Concentração (mol/L)',
    sampleAbsorbance: 'Absorbância da Amostra',
    blank: 'Branco (Linha de Base)',
    result: 'Resultado',
    targetAbsorbance: 'Alvo: Absorbância (A)',
    targetConcentration: 'Alvo: Concentração (c)',
    liveFormula: 'Prévia da Fórmula em Tempo Real',
    saving: 'Salvando...',
    saveToSaved: 'Salvar em Compostos Salvos',
    enterCompound: 'Insira ou selecione um composto antes de salvar.',
    savedMessage: 'Composto salvo em Compostos Salvos.',
    saveError: 'Não foi possível salvar este composto agora.',
    spectralError: 'Não foi possível carregar os dados espectrais agora.',
    savedError: 'Não foi possível carregar os compostos salvos agora.',
    deleteError: 'Não foi possível excluir este composto salvo agora.',
    chooseProjectAlert: 'Escolha o projeto onde este resultado deve ser colocado antes de gerar o relatório.',
    deleteTitle: 'Excluir Composto Salvo',
    deleteHeading: 'Remover este registro da biblioteca salva?',
    deletePrefix: 'Isso excluirá permanentemente',
    deleteMiddle: 'com CAS',
    deleteSuffix: 'da lista de compostos salvos.',
    savedRecord: 'Registro salvo',
    absorbance: 'Absorbância',
    cancel: 'Cancelar',
    deleting: 'Excluindo...',
    deleteRecord: 'Excluir Registro'
    , sessionReport: 'Relatório da Sessão',
    technicalReport: 'Relatório técnico de análise',
    printPdf: 'Imprimir Relatório PDF',
    projectDestination: 'Destino do projeto',
    chooseDestination: 'Escolha onde este resultado será colocado',
    projectsLoaded: 'Os projetos são carregados automaticamente da biblioteca conforme são criados.',
    project: 'Projeto',
    notSelected: 'Não selecionado',
    generatedBy: 'Gerado por',
    formula: 'Fórmula',
    compound: 'Composto',
    notIdentified: 'Não identificado',
    finalReport: 'RELATÓRIO FINAL',
    savedResults: 'Resultados Salvos',
    storedDatabase: 'Compostos já armazenados no banco de dados',
    savedDescription: 'Esta aba serve para revisar compostos que já possuem dados de cálculo armazenados na tabela compounds.',
    searchSaved: 'Pesquisar compostos salvos por CAS ou nome...',
    loadingSaved: 'Carregando compostos salvos...',
    noSaved: 'Nenhum composto salvo encontrado.',
    saved: 'Salvo',
    recently: 'recentemente',
    deleteSavedTitle: 'Excluir composto salvo',
    generatePdfTitle: 'Gerar relatório PDF',
    pathLengthShort: 'caminho óptico'
  },
  es: {
    workflow: 'Flujo Beer-Lambert',
    title: 'Consola de Espectrofotometría',
    introStart: 'La entrada de cálculo ahora viene de',
    introMiddle: 'mientras que los resultados guardados viven en',
    dataFlow: 'Flujo de Datos',
    dataFlowDescription: 'Usa la pestaña de cálculo para tomar epsilon y lambda max de las mediciones espectrales, luego cambia a compuestos guardados cuando quieras revisar entradas ya almacenadas.',
    calculate: 'Calcular',
    savedCompounds: 'Compuestos Guardados',
    step1: 'Paso 1',
    selectCompound: 'Selecciona un compuesto',
    chooseRecord: 'Elige un registro de la biblioteca espectral.',
    step2: 'Paso 2',
    enterValues: 'Ingresa valores del experimento',
    provideValues: 'Proporciona longitud de camino y concentración para completar la ecuación.',
    step3: 'Paso 3',
    reviewAbsorbance: 'Revisa la absorbancia',
    saveOrExport: 'Guarda el resultado o exporta el informe cuando esté correcto.',
    spectralLookup: 'Búsqueda Espectral',
    pullInputs: 'Tomar entradas de spectral_data',
    libraryOrderedStart: 'La biblioteca está ordenada de',
    libraryOrderedEnd: 'para encontrar compuestos más rápido.',
    clearEntry: 'Limpiar Entrada',
    searchSpectral: 'Buscar spectral_data por nombre del compuesto o CAS...',
    refreshingLibrary: 'Actualizando biblioteca espectral...',
    compoundsAvailable: 'compuestos disponibles en la vista actual',
    searchSupports: 'La búsqueda admite nombres de compuestos y valores CAS',
    loadingSpectral: 'Cargando datos espectrales...',
    noSpectralRecords: 'No se encontraron registros espectrales para esta búsqueda.',
    spectralSource: 'Fuente espectral',
    epsilon: 'epsilon',
    lambdaMax: 'lambda max',
    solvent: 'solvente',
    analyticalInput: 'Entrada Analítica',
    calculateAbsorbance: 'Calcular absorbancia',
    findAbsorbance: 'Encontrar Absorbancia',
    findConcentration: 'Encontrar Concentración',
    currentCompound: 'Compuesto Actual',
    selectFromLibrary: 'Selecciona un compuesto de la biblioteca espectral',
    source: 'fuente',
    pathLength: 'Longitud de Camino Óptico (cm)',
    concentration: 'Concentración (mol/L)',
    sampleAbsorbance: 'Absorbancia de Muestra',
    blank: 'Blanco (Línea Base)',
    result: 'Resultado',
    targetAbsorbance: 'Objetivo: Absorbancia (A)',
    targetConcentration: 'Objetivo: Concentración (c)',
    liveFormula: 'Vista Previa de Fórmula en Vivo',
    saving: 'Guardando...',
    saveToSaved: 'Guardar en Compuestos Guardados',
    enterCompound: 'Ingresa o selecciona un compuesto antes de guardar.',
    savedMessage: 'Compuesto guardado en Compuestos Guardados.',
    saveError: 'No se puede guardar este compuesto en este momento.',
    spectralError: 'No se pueden cargar los datos espectrales en este momento.',
    savedError: 'No se pueden cargar los compuestos guardados en este momento.',
    deleteError: 'No se puede eliminar este compuesto guardado en este momento.',
    chooseProjectAlert: 'Elige el proyecto donde se colocará este resultado antes de generar el informe.',
    deleteTitle: 'Eliminar Compuesto Guardado',
    deleteHeading: '¿Eliminar este registro de la biblioteca guardada?',
    deletePrefix: 'Esto eliminará permanentemente',
    deleteMiddle: 'con CAS',
    deleteSuffix: 'de la lista de compuestos guardados.',
    savedRecord: 'Registro guardado',
    absorbance: 'Absorbancia',
    cancel: 'Cancelar',
    deleting: 'Eliminando...',
    deleteRecord: 'Eliminar Registro'
    , sessionReport: 'Informe de Sesión',
    technicalReport: 'Informe técnico de análisis',
    printPdf: 'Imprimir Informe PDF',
    projectDestination: 'Destino del proyecto',
    chooseDestination: 'Elige dónde se colocará este resultado',
    projectsLoaded: 'Los proyectos se cargan automáticamente desde la biblioteca a medida que se crean.',
    project: 'Proyecto',
    notSelected: 'No seleccionado',
    generatedBy: 'Generado por',
    formula: 'Fórmula',
    compound: 'Compuesto',
    notIdentified: 'No identificado',
    finalReport: 'INFORME FINAL',
    savedResults: 'Resultados Guardados',
    storedDatabase: 'Compuestos ya almacenados en la base de datos',
    savedDescription: 'Esta pestaña sirve para revisar compuestos que ya tienen datos de cálculo almacenados en la tabla compounds.',
    searchSaved: 'Buscar compuestos guardados por CAS o nombre...',
    loadingSaved: 'Cargando compuestos guardados...',
    noSaved: 'No se encontraron compuestos guardados.',
    saved: 'Guardado',
    recently: 'recientemente',
    deleteSavedTitle: 'Eliminar compuesto guardado',
    generatePdfTitle: 'Generar informe PDF',
    pathLengthShort: 'longitud de camino'
  }
};

function formatNumber(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 4
  }).format(value);
}

function formatWavelengthMax(value: string) {
  const trimmed = value.trim();

  if (!trimmed || trimmed === 'N/A') {
    return 'N/A';
  }

  return /\bnm\b/i.test(trimmed) || /nanometer/i.test(trimmed)
    ? trimmed.replace(/\bnm\b/gi, 'nanometers (nm)')
    : `${trimmed} nanometers (nm)`;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('pt-BR');
}

function normalizeSource(value: string | null): SourceType {
  if (value === 'PhotochemCAD' || value === 'Manual') {
    return value;
  }

  return 'Bank';
}

function getSpectralSortKey(value: string) {
  const normalized = value
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}]+/gu, '')
    .toLowerCase();

  return normalized || value.toLowerCase();
}

function getSpectralSortPriority(value: string) {
  const normalized = getSpectralSortKey(value);

  if (!normalized) {
    return 2;
  }

  const firstCharacter = normalized[0];

  if (/[a-z]/.test(firstCharacter)) {
    return 0;
  }

  if (/[0-9]/.test(firstCharacter)) {
    return 1;
  }

  return 2;
}

export default function Spectrophotometry({ currentUser, initialTab = 'calculate', globalSearch }: SpectrophotometryProps) {
  const { language } = useLanguage();
  const text = SPECTRO_TEXT[language];
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [query, setQuery] = useState('');
  const [savedQuery, setSavedQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const deferredSavedQuery = useDeferredValue(savedQuery);

  const [spectralLibrary, setSpectralLibrary] = useState<SpectralRecord[]>([]);
  const [savedCompounds, setSavedCompounds] = useState<SavedCompoundRecord[]>([]);
  const [selectedSpectralRecordId, setSelectedSpectralRecordId] = useState<string | null>(null);
  const [isLoadingSpectral, setIsLoadingSpectral] = useState(true);
  const [isLoadingSaved, setIsLoadingSaved] = useState(true);
  const [isSavingCompound, setIsSavingCompound] = useState(false);
  const [spectralError, setSpectralError] = useState<string | null>(null);
  const [savedError, setSavedError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pendingDeleteCas, setPendingDeleteCas] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SavedCompoundRecord | null>(null);

  useEffect(() => {
    if (!globalSearch) return;
    setActiveTab('calculate');
    setQuery(globalSearch.query);
  }, [globalSearch?.nonce]);

  const [compoundName, setCompoundName] = useState('');
  const [casId, setCasId] = useState('');
  const [epsilon, setEpsilon] = useState('0');
  const [lambdaMax, setLambdaMax] = useState('N/A');
  const [solvent, setSolvent] = useState('N/A');
  const [source, setSource] = useState<SourceType>('Manual');
  const [pathLength, setPathLength] = useState('1');
  const [concentration, setConcentration] = useState('0');
  const [calcMode, setCalcMode] = useState<'absorbance' | 'concentration'>('absorbance');
  const [sampleAbsorbance, setSampleAbsorbance] = useState('0');
  const [blankAbsorbance, setBlankAbsorbance] = useState('0');
  const analysisFieldStartValues = useRef<Record<string, string>>({});

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadSpectralData() {
      setIsLoadingSpectral(true);
      setSpectralError(null);

      try {
        const params = new URLSearchParams();
        if (deferredQuery.trim()) {
          params.set('search', deferredQuery.trim());
        }

        const url = params.size > 0 ? `/api/spectral-data?${params.toString()}` : '/api/spectral-data';
        const response = await fetch(url, { signal: controller.signal });

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const payload = (await response.json()) as { spectralData: ApiSpectralRecord[] };
        const normalized = payload.spectralData
          .map((record) => ({
            id: `${record.compound_name}-${record.absorption_wavelength_nm ?? 'na'}`,
            name: record.compound_name,
            cas: record.cas || '',
            epsilon: Number(record.molar_extinction_coefficient ?? 0),
            lambdaMax: record.absorption_wavelength_nm ? String(record.absorption_wavelength_nm) : 'N/A',
            solvent: record.absorption_solvent || 'N/A',
            source: 'PhotochemCAD' as const
          }))
          .sort((left, right) => {
            const priorityDifference = getSpectralSortPriority(left.name) - getSpectralSortPriority(right.name);

            if (priorityDifference !== 0) {
              return priorityDifference;
            }

            return getSpectralSortKey(left.name).localeCompare(getSpectralSortKey(right.name));
          });

        setSpectralLibrary(normalized);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }

        setSpectralError(text.spectralError);
      } finally {
        setIsLoadingSpectral(false);
      }
    }

    loadSpectralData();

    return () => controller.abort();
  }, [deferredQuery, text.spectralError]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadSavedCompounds() {
      setIsLoadingSaved(true);
      setSavedError(null);

      try {
        const params = new URLSearchParams();
        if (deferredSavedQuery.trim()) {
          params.set('search', deferredSavedQuery.trim());
        }

        const url = params.size > 0 ? `/api/compounds?${params.toString()}` : '/api/compounds';
        const response = await fetch(url, { signal: controller.signal });

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const payload = (await response.json()) as { compounds: ApiCompoundRecord[] };
        const normalized = payload.compounds.map((compound) => ({
          id: compound.cas,
          cas: compound.cas,
          name: compound.nome,
          epsilon: Number(compound.epsilon_m_cm ?? 0),
          lambdaMax: compound.lambda_max || 'N/A',
          solvent: compound.solvent || 'N/A',
          source: normalizeSource(compound.fonte),
          pathLength: Number(compound.path_length_cm ?? 0),
          concentration: Number(compound.concentration_mol_l ?? 0),
          absorbance: Number(compound.absorbance ?? 0),
          savedAt: compound.saved_at || ''
        }));

        setSavedCompounds(normalized);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }

        setSavedError(text.savedError);
      } finally {
        setIsLoadingSaved(false);
      }
    }

    loadSavedCompounds();

    return () => controller.abort();
  }, [deferredSavedQuery, text.savedError]);

  async function refreshSavedCompounds(searchValue = deferredSavedQuery) {
    setIsLoadingSaved(true);
    setSavedError(null);

    try {
      const params = new URLSearchParams();
      if (searchValue.trim()) {
        params.set('search', searchValue.trim());
      }

      const url = params.size > 0 ? `/api/compounds?${params.toString()}` : '/api/compounds';
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const payload = (await response.json()) as { compounds: ApiCompoundRecord[] };
      const normalized = payload.compounds.map((compound) => ({
        id: compound.cas,
        cas: compound.cas,
        name: compound.nome,
        epsilon: Number(compound.epsilon_m_cm ?? 0),
        lambdaMax: compound.lambda_max || 'N/A',
        solvent: compound.solvent || 'N/A',
        source: normalizeSource(compound.fonte),
        pathLength: Number(compound.path_length_cm ?? 0),
        concentration: Number(compound.concentration_mol_l ?? 0),
        absorbance: Number(compound.absorbance ?? 0),
        savedAt: compound.saved_at || ''
      }));

      setSavedCompounds(normalized);
    } catch (_error) {
      setSavedError(text.savedError);
    } finally {
      setIsLoadingSaved(false);
    }
  }

  const epsilonValue = Number.parseFloat(epsilon) || 0;
  const pathLengthValue = Number.parseFloat(pathLength) || 0;
  const concentrationValue = Number.parseFloat(concentration) || 0;
  const sampleAbsValue = Number.parseFloat(sampleAbsorbance) || 0;
  const blankAbsValue = Number.parseFloat(blankAbsorbance) || 0;

  // Lógica da Lei de Beer-Lambert
  const effectiveAbsorbance = calcMode === 'absorbance' 
    ? epsilonValue * pathLengthValue * concentrationValue 
    : sampleAbsValue - blankAbsValue;

  const calculatedConcentration = (calcMode === 'concentration' && epsilonValue * pathLengthValue !== 0)
    ? effectiveAbsorbance / (epsilonValue * pathLengthValue)
    : concentrationValue;

  const absorbance = effectiveAbsorbance;
  const formulaPreview = calcMode === 'absorbance'
    ? `${formatNumber(epsilonValue)} x ${formatNumber(pathLengthValue)} x ${formatNumber(concentrationValue)}`
    : `(${formatNumber(sampleAbsValue)} - ${formatNumber(blankAbsValue)}) / (${formatNumber(epsilonValue)} x ${formatNumber(pathLengthValue)})`;

  const hasSelectedCompound = compoundName.trim().length > 0;
  const hasCalculationInputs = calcMode === 'absorbance' 
    ? (pathLengthValue > 0 && concentrationValue > 0)
    : (pathLengthValue > 0 && sampleAbsValue > 0);

  const applySpectralRecord = (record: SpectralRecord) => {
    void recordAnalysisChange('compound', text.compound, compoundName || text.notIdentified, record.name);
    setSelectedSpectralRecordId(record.id);
    setCompoundName(record.name);
    setCasId(record.cas);
    setEpsilon(String(record.epsilon));
    setLambdaMax(record.lambdaMax);
    setSolvent(record.solvent);
    setSource(record.source);
  };

  const applySavedCompound = (compound: SavedCompoundRecord) => {
    void recordAnalysisChange('compound', text.compound, compoundName || text.notIdentified, compound.name);
    setSelectedSpectralRecordId(null);
    setCompoundName(compound.name);
    setCasId(compound.cas);
    setEpsilon(String(compound.epsilon));
    setLambdaMax(compound.lambdaMax);
    setSolvent(compound.solvent);
    setSource(compound.source);
    setPathLength(String(compound.pathLength || 0));
    setConcentration(String(compound.concentration || 0));
    setActiveTab('calculate');
  };

  const createCurrentReportPayload = (overrides?: Partial<ReportExportAuditPayload>): ReportExportAuditPayload =>
    buildReportPayload(
      currentUser,
      {
        compoundName: compoundName || 'Not identified',
        casId: casId || 'N/A',
        lambdaMax: lambdaMax || 'N/A',
        solvent: solvent || 'N/A',
        source,
        epsilonValue,
        pathLengthValue,
        concentrationValue: calcMode === 'concentration' ? calculatedConcentration : concentrationValue,
        absorbance: effectiveAbsorbance
      },
      {
        ...overrides
      }
    );

  const getAnalysisAction = (previousValue: string, nextValue: string) => {
    if (previousValue && !nextValue) return 'cleared';
    if (!previousValue && nextValue) return 'filled';
    return 'changed';
  };

  const recordAnalysisChange = async (fieldKey: string, fieldLabel: string, previousValue: string, nextValue: string) => {
    const normalizedPreviousValue = String(previousValue ?? '').trim();
    const normalizedNextValue = String(nextValue ?? '').trim();

    if (normalizedPreviousValue === normalizedNextValue) return;

    try {
      await fetch('/api/audit/analysis-events', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fieldKey,
          fieldLabel,
          previousValue: normalizedPreviousValue,
          nextValue: normalizedNextValue,
          compoundName: compoundName || 'Not identified',
          casId: casId || 'N/A',
          action: getAnalysisAction(normalizedPreviousValue, normalizedNextValue)
        })
      });
    } catch (error) {
      console.warn('Failed to record analysis audit event:', error);
    }
  };

  const markAnalysisFieldStart = (fieldKey: string, value: string) => {
    analysisFieldStartValues.current[fieldKey] = value;
  };

  const commitAnalysisFieldChange = (fieldKey: string, fieldLabel: string, nextValue: string) => {
    const previousValue = analysisFieldStartValues.current[fieldKey] ?? '';
    delete analysisFieldStartValues.current[fieldKey];
    void recordAnalysisChange(fieldKey, fieldLabel, previousValue, nextValue);
  };

  const resetManualEntry = () => {
    setSelectedSpectralRecordId(null);
    setCompoundName('');
    setCasId('');
    setEpsilon('0');
    setLambdaMax('N/A');
    setSolvent('N/A');
    setSource('Manual');
    setSaveMessage(null);
    setSaveError(null);
  };

  const saveCompound = async () => {
    setSaveMessage(null);
    setSaveError(null);

    if (!compoundName.trim()) {
      setSaveError(text.enterCompound);
      return;
    }

    setIsSavingCompound(true);

    try {
      const response = await fetch('/api/compounds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          cas: casId.trim() || 'S/CAS',
          nome: compoundName.trim(),
          epsilon_m_cm: epsilonValue,
          lambda_max: lambdaMax.trim() || 'N/A',
          solvent: solvent.trim() || 'N/A',
          fonte: source,
          path_length_cm: pathLengthValue,
          concentration_mol_l: calcMode === 'concentration' ? calculatedConcentration : concentrationValue,
          absorbance
        })
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      setSaveMessage(text.savedMessage);
      await refreshSavedCompounds(savedQuery);
    } catch (_error) {
      setSaveError(text.saveError);
    } finally {
      setIsSavingCompound(false);
    }
  };

  const logReportExport = async (payload: ReportExportAuditPayload) => {
    try {
      const response = await fetch('/api/audit/report-exports', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        console.warn(`Failed to record PDF export audit log: ${response.status}`);
      }
    } catch (error) {
      console.warn('Failed to record PDF export audit log:', error);
    }
  };

  const saveReportSnapshot = async (payload: ReportExportAuditPayload) => {
    const response = await fetch('/api/reports', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }
  };

  const exportReportPdf = async (payload = createCurrentReportPayload(), options?: { skipSnapshotSave?: boolean }) => {
    if (!payload.projectId && !payload.projectName) {
      window.alert(text.chooseProjectAlert);
      return;
    }

    if (!options?.skipSnapshotSave) {
      try {
        await saveReportSnapshot(payload);
      } catch (error) {
        console.error('Failed to save report snapshot:', error);
      }
    }

    await logReportExport(payload);
    openPrintableReport(payload);
  };

  const printCurrentReport = async () => {
    const payload = createCurrentReportPayload();
    await logReportExport(payload);
    openPrintableReport(payload);
  };

  const exportSavedCompoundReport = (compound: SavedCompoundRecord) => {
    applySavedCompound(compound);

    void exportReportPdf(
      createCurrentReportPayload({
        compoundName: compound.name,
        casId: compound.cas || 'N/A',
        lambdaMax: compound.lambdaMax || 'N/A',
        solvent: compound.solvent || 'N/A',
        source: compound.source,
        epsilonValue: compound.epsilon,
        pathLengthValue: compound.pathLength,
        concentrationValue: compound.concentration,
        absorbance: compound.absorbance
      })
    );
  };

  const requestDeleteSavedCompound = (compound: SavedCompoundRecord) => {
    setDeleteTarget(compound);
  };

  const confirmDeleteSavedCompound = async () => {
    if (!deleteTarget) {
      return;
    }

    setPendingDeleteCas(deleteTarget.cas);
    setSavedError(null);

    try {
      const response = await fetch(`/api/compounds/${encodeURIComponent(deleteTarget.cas)}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      await refreshSavedCompounds(savedQuery);
      setDeleteTarget(null);
    } catch (_error) {
      setSavedError(text.deleteError);
    } finally {
      setPendingDeleteCas(null);
    }
  };

  const deleteModal = deleteTarget ? (
    <div className="fixed inset-0 z-[120] flex items-center justify-center px-4">
      <button
        type="button"
        aria-label={text.deleteHeading}
        onClick={() => setDeleteTarget(null)}
        className="absolute inset-0 bg-[#020617]/80 backdrop-blur-sm"
      />
      <div className="relative w-full max-w-md rounded-[2rem] border border-red-400/20 bg-[#0b1121] p-6 sm:p-7 shadow-[0_24px_80px_rgba(2,6,23,0.65)]">
        <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-red-200 font-bold">
          {text.deleteTitle}
        </p>
        <h3 className="text-2xl font-display font-bold text-white mt-4">
          {text.deleteHeading}
        </h3>
        <p className="text-sm text-white/60 leading-relaxed mt-4">
          {text.deletePrefix} <span className="text-white font-semibold">{deleteTarget.name}</span> {text.deleteMiddle}{' '}
          <span className="text-white font-semibold">{deleteTarget.cas}</span> {text.deleteSuffix}
        </p>
        <div className="mt-6 rounded-2xl border border-white/8 bg-white/[0.03] p-4 text-sm">
          <p className="text-white/30 font-mono uppercase tracking-widest">{text.savedRecord}</p>
          <p className="text-white font-semibold mt-2">{deleteTarget.name}</p>
          <p className="text-white/55 mt-2">{text.absorbance} {formatNumber(deleteTarget.absorbance)}</p>
        </div>
        <div className="mt-7 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => setDeleteTarget(null)}
            className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-semibold text-white/75 hover:bg-white/[0.07] transition-all"
          >
            {text.cancel}
          </button>
          <button
            type="button"
            onClick={confirmDeleteSavedCompound}
            disabled={pendingDeleteCas === deleteTarget.cas}
            className="flex-1 rounded-xl border border-red-400/20 bg-red-500/90 px-5 py-3 text-sm font-semibold text-white hover:bg-red-500 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {pendingDeleteCas === deleteTarget.cas ? text.deleting : text.deleteRecord}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 sm:space-y-10">
      {deleteModal && createPortal(deleteModal, document.body)}

      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-mono text-primary uppercase tracking-[0.4em] font-bold">
              {text.workflow}
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-white tracking-tight">
            {text.title}
          </h1>
          <p className="text-white/40 mt-1 max-w-3xl text-sm leading-relaxed">
            {text.introStart} <span className="text-white/80">spectral_data</span>, {text.introMiddle}{' '}
            <span className="text-white/80">compounds</span>.
          </p>
        </div>

        <div className="glass-panel px-5 py-4 rounded-2xl border-white/[0.03] w-full xl:max-w-md">
          <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-secondary font-bold">
            {text.dataFlow}
          </p>
          <p className="text-sm text-white/60 mt-2 leading-relaxed">
            {text.dataFlowDescription}
          </p>
        </div>
      </div>

      <div className="relative z-10 flex flex-wrap gap-3">
        <button
          onClick={() => setActiveTab('calculate')}
          className={`px-5 py-3 rounded-xl border text-[10px] font-mono uppercase tracking-[0.25em] transition-all ${
            activeTab === 'calculate'
              ? 'bg-primary text-on-primary border-primary shadow-[0_0_30px_rgba(167,200,255,0.2)]'
              : 'bg-white/[0.03] text-white/70 border-white/10 hover:bg-white/[0.08]'
          }`}
        >
          {text.calculate}
        </button>
        <button
          onClick={() => setActiveTab('saved')}
          className={`px-5 py-3 rounded-xl border text-[10px] font-mono uppercase tracking-[0.25em] transition-all ${
            activeTab === 'saved'
              ? 'bg-primary text-on-primary border-primary shadow-[0_0_30px_rgba(167,200,255,0.2)]'
              : 'bg-white/[0.03] text-white/70 border-white/10 hover:bg-white/[0.08]'
          }`}
        >
          {text.savedCompounds}
        </button>
      </div>

      {activeTab === 'calculate' ? (
        <div className="grid grid-cols-1 xl:grid-cols-[1.45fr_0.55fr] gap-6 lg:gap-8">
          <section className="glass-panel rounded-[2rem] p-5 sm:p-6 lg:p-8 border-white/[0.03] space-y-8 flex flex-col h-full">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className={`rounded-2xl border p-4 ${hasSelectedCompound ? 'border-primary/30 bg-primary/10' : 'border-white/8 bg-white/[0.03]'}`}>
                <p className="text-[10px] font-mono uppercase tracking-[0.24em] font-bold text-white/35">{text.step1}</p>
                <p className="text-white font-semibold mt-2">{text.selectCompound}</p>
                <p className="text-sm text-white/50 mt-2">
                  {hasSelectedCompound ? compoundName : text.chooseRecord}
                </p>
              </div>
              <div className={`rounded-2xl border p-4 ${hasCalculationInputs ? 'border-secondary/30 bg-secondary/10' : 'border-white/8 bg-white/[0.03]'}`}>
                <p className="text-[10px] font-mono uppercase tracking-[0.24em] font-bold text-white/35">{text.step2}</p>
                <p className="text-white font-semibold mt-2">{text.enterValues}</p>
                <p className="text-sm text-white/50 mt-2">
                  {text.provideValues}
                </p>
              </div>
              <div className={`rounded-2xl border p-4 ${hasSelectedCompound ? 'border-white/12 bg-white/[0.04]' : 'border-white/8 bg-white/[0.03]'}`}>
                <p className="text-[10px] font-mono uppercase tracking-[0.24em] font-bold text-white/35">{text.step3}</p>
                <p className="text-white font-semibold mt-2">{text.reviewAbsorbance}</p>
                <p className="text-sm text-white/50 mt-2">
                  {text.saveOrExport}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/30 font-bold">
                  {text.spectralLookup}
                </p>
                <h2 className="text-2xl font-display font-bold text-white mt-2">
                  {text.pullInputs}
                </h2>
                <p className="text-sm text-white/45 mt-2">
                  {text.libraryOrderedStart} <span className="text-white/80">A to Z</span> {text.libraryOrderedEnd}
                </p>
              </div>
              <button
                onClick={resetManualEntry}
                className="px-4 py-3 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] transition-all text-[10px] font-mono uppercase tracking-[0.25em] text-white/70"
              >
                {text.clearEntry}
              </button>
            </div>

            <div className="relative group">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25 group-focus-within:text-primary transition-colors" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={text.searchSpectral}
                className="w-full rounded-2xl bg-white/[0.03] border border-white/10 pl-12 pr-4 py-4 text-sm text-white outline-none transition-all focus:border-primary/30 focus:bg-white/[0.06]"
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-white/8 bg-[#08101f]/55 px-4 py-3">
              <p className="text-sm text-white/65">
                {isLoadingSpectral ? text.refreshingLibrary : `${spectralLibrary.length} ${text.compoundsAvailable}`}
              </p>
              <p className="text-[10px] font-mono uppercase tracking-[0.24em] text-white/30">
                {text.searchSupports}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto custom-scrollbar pr-0 sm:pr-2 flex-1 min-h-[750px] xl:max-h-[1800px] content-start">
              {isLoadingSpectral && (
                <div className="md:col-span-2 rounded-2xl border border-white/8 bg-white/[0.03] p-6 text-sm text-white/55">
                  {text.loadingSpectral}
                </div>
              )}

              {!isLoadingSpectral && spectralError && (
                <div className="md:col-span-2 rounded-2xl border border-red-400/20 bg-red-500/10 p-6 text-sm text-red-100">
                  {spectralError}
                </div>
              )}

              {!isLoadingSpectral && !spectralError && spectralLibrary.length === 0 && (
                <div className="md:col-span-2 rounded-2xl border border-white/8 bg-white/[0.03] p-6 text-sm text-white/55">
                  {text.noSpectralRecords}
                </div>
              )}

              {!isLoadingSpectral && !spectralError && spectralLibrary.map((record) => (
                <button
                  key={record.id}
                  onClick={() => applySpectralRecord(record)}
                  className={`text-left rounded-2xl p-5 border transition-all group ${
                    selectedSpectralRecordId === record.id
                      ? 'bg-primary/12 border-primary/40 shadow-[0_0_40px_rgba(167,200,255,0.18)]'
                      : 'bg-white/[0.03] border-white/8 hover:border-primary/25 hover:bg-primary/5'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p
                        className={`font-semibold truncate transition-colors ${
                          selectedSpectralRecordId === record.id ? 'text-primary' : 'text-white group-hover:text-primary'
                        }`}
                        title={record.name}
                      >
                        {record.name}
                      </p>
                      <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/30 mt-2">
                        {text.spectralSource}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full border text-[9px] font-mono uppercase tracking-[0.18em] font-bold ${
                        selectedSpectralRecordId === record.id
                          ? 'border-primary/25 bg-primary/15 text-primary'
                          : 'border-white/10 bg-white/[0.03] text-secondary'
                      }`}
                    >
                      {record.source}
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="rounded-xl bg-[#0b1121]/50 border border-white/5 p-4 min-w-0">
                      <p className="text-white/30 font-mono uppercase tracking-widest">{text.epsilon}</p>
                      <p className="text-white mt-1 font-semibold">{formatNumber(record.epsilon)}</p>
                    </div>
                    <div className="rounded-xl bg-[#0b1121]/50 border border-white/5 p-4 min-w-0">
                      <p className="text-white/30 font-mono uppercase tracking-widest">{text.lambdaMax}</p>
                      <p className="text-white mt-1 font-semibold leading-relaxed break-words">{formatWavelengthMax(record.lambdaMax)}</p>
                    </div>
                    <div className="rounded-xl bg-[#0b1121]/50 border border-white/5 p-4 min-w-0 sm:col-span-2">
                      <p className="text-white/30 font-mono uppercase tracking-widest">{text.solvent}</p>
                      <p className="text-white mt-1 font-semibold leading-relaxed break-words">{record.solvent}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

          </section>

          <section className="space-y-6">
            <div className="glass-panel rounded-[2rem] p-5 sm:p-6 lg:p-8 border-white/[0.03]">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-2xl bg-primary/10 text-primary border border-primary/20">
                  <Sigma size={22} />
                </div>
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/30 font-bold">
                    {text.analyticalInput}
                  </p>
                  <h2 className="text-2xl font-display font-bold text-white mt-1">
                    {text.calculateAbsorbance}
                  </h2>
                </div>
              </div>

              <div className="flex p-1 rounded-xl bg-white/[0.03] border border-white/10 mb-6">
                <button
                  onClick={() => {
                    void recordAnalysisChange('calculation_mode', 'Calculation mode', calcMode, 'absorbance');
                    setCalcMode('absorbance');
                  }}
                  className={`flex-1 py-2 text-[10px] font-mono uppercase tracking-widest rounded-lg transition-all ${
                    calcMode === 'absorbance' ? 'bg-primary text-on-primary shadow-lg' : 'text-white/40 hover:text-white'
                  }`}
                >
                  {text.findAbsorbance}
                </button>
                <button
                  onClick={() => {
                    void recordAnalysisChange('calculation_mode', 'Calculation mode', calcMode, 'concentration');
                    setCalcMode('concentration');
                  }}
                  className={`flex-1 py-2 text-[10px] font-mono uppercase tracking-widest rounded-lg transition-all ${
                    calcMode === 'concentration' ? 'bg-primary text-on-primary shadow-lg' : 'text-white/40 hover:text-white'
                  }`}
                >
                  {text.findConcentration}
                </button>
              </div>

              <div className="space-y-5">
                <div className="rounded-2xl border border-primary/20 bg-primary/8 px-4 py-4">
                  <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-primary font-bold">
                    {text.currentCompound}
                  </p>
                  <p className="text-xl font-display font-bold text-white mt-2">
                    {compoundName || text.selectFromLibrary}
                  </p>
                  <p className="text-sm text-white/50 mt-2 leading-relaxed break-words">
                    CAS {casId || 'N/A'} - {text.lambdaMax} {formatWavelengthMax(lambdaMax)}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 text-sm">
                    <div className="rounded-xl bg-[#08101f]/65 border border-white/8 p-3">
                      <p className="text-white/30 font-mono uppercase tracking-widest">{text.epsilon}</p>
                      <p className="text-white mt-2 font-semibold">{formatNumber(epsilonValue)} M^-1 cm^-1</p>
                    </div>
                    <div className="rounded-xl bg-[#08101f]/65 border border-white/8 p-3">
                      <p className="text-white/30 font-mono uppercase tracking-widest">{text.source}</p>
                      <p className="text-white mt-2 font-semibold">{source}</p>
                    </div>
                    <div className="rounded-xl bg-[#08101f]/65 border border-white/8 p-3 sm:col-span-2">
                      <p className="text-white/30 font-mono uppercase tracking-widest">{text.lambdaMax}</p>
                      <p className="text-white mt-2 font-semibold leading-relaxed break-words">{formatWavelengthMax(lambdaMax)}</p>
                    </div>
                    <div className="rounded-xl bg-[#08101f]/65 border border-white/8 p-3 sm:col-span-2">
                      <p className="text-white/30 font-mono uppercase tracking-widest">{text.solvent}</p>
                      <p className="text-white mt-2 font-semibold leading-relaxed break-words">{solvent}</p>
                    </div>
                  </div>
                </div>

                <label className="space-y-2 block">
                  <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/40 font-bold">{text.pathLength}</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={pathLength}
                    onFocus={() => markAnalysisFieldStart('path_length', pathLength)}
                    onChange={(event) => setPathLength(event.target.value)}
                    onBlur={(event) => commitAnalysisFieldChange('path_length', text.pathLength, event.target.value)}
                    className="w-full rounded-xl bg-white/[0.03] border border-white/10 px-4 py-3 text-sm text-white outline-none focus:border-primary/30"
                  />
                </label>

                {calcMode === 'absorbance' ? (
                  <label className="space-y-2 block">
                    <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/40 font-bold">{text.concentration}</span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={concentration}
                      onFocus={() => markAnalysisFieldStart('concentration', concentration)}
                      onChange={(event) => setConcentration(event.target.value)}
                      onBlur={(event) => commitAnalysisFieldChange('concentration', text.concentration, event.target.value)}
                      className="w-full rounded-xl bg-white/[0.03] border border-white/10 px-4 py-3 text-sm text-white outline-none focus:border-primary/30"
                    />
                  </label>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className="space-y-2 block">
                      <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/40 font-bold">{text.sampleAbsorbance}</span>
                      <input
                        type="number"
                        step="any"
                        value={sampleAbsorbance}
                        onFocus={() => markAnalysisFieldStart('sample_absorbance', sampleAbsorbance)}
                        onChange={(event) => setSampleAbsorbance(event.target.value)}
                        onBlur={(event) => commitAnalysisFieldChange('sample_absorbance', text.sampleAbsorbance, event.target.value)}
                        className="w-full rounded-xl bg-white/[0.03] border border-white/10 px-4 py-3 text-sm text-white outline-none focus:border-primary/30"
                      />
                    </label>
                    <label className="space-y-2 block">
                      <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/40 font-bold">{text.blank}</span>
                      <input
                        type="number"
                        step="any"
                        value={blankAbsorbance}
                        onFocus={() => markAnalysisFieldStart('blank_absorbance', blankAbsorbance)}
                        onChange={(event) => setBlankAbsorbance(event.target.value)}
                        onBlur={(event) => commitAnalysisFieldChange('blank_absorbance', text.blank, event.target.value)}
                        className="w-full rounded-xl bg-white/[0.03] border border-white/10 px-4 py-3 text-sm text-white outline-none focus:border-primary/30"
                      />
                    </label>
                  </div>
                )}
              </div>

              <div className="mt-8 rounded-[1.5rem] p-6 bg-gradient-to-br from-primary/12 via-white/[0.02] to-secondary/10 border border-white/10">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-secondary font-bold">
                      {text.result}
                    </p>
                    <p className="text-4xl font-display font-bold text-white mt-2">
                      {calcMode === 'absorbance' ? formatNumber(effectiveAbsorbance) : formatNumber(calculatedConcentration)}
                    </p>
                    <p className="text-sm text-white/45 mt-2">
                      {calcMode === 'absorbance' ? text.targetAbsorbance : text.targetConcentration}
                    </p>
                  </div>
                  <div className="p-4 sm:p-5 rounded-3xl bg-[#0b1121]/40 border border-white/10 text-secondary self-start sm:self-auto">
                    <Waves size={34} />
                  </div>
                </div>

                <div className="mt-5 rounded-2xl bg-[#08101f]/60 border border-white/8 p-4">
                  <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/30">{text.liveFormula}</p>
                  {calcMode === 'absorbance' ? (
                    <p className="text-white font-semibold mt-3 break-words">
                      A = {formatNumber(epsilonValue)} × {formatNumber(pathLengthValue)} × {formatNumber(concentrationValue)} = {formatNumber(effectiveAbsorbance)}
                    </p>
                  ) : (
                    <p className="text-white font-semibold mt-3 break-words">
                      c = ({formatNumber(sampleAbsValue)} - {formatNumber(blankAbsValue)}) / ({formatNumber(epsilonValue)} × {formatNumber(pathLengthValue)}) = {formatNumber(calculatedConcentration)} mol/L
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-4">
                <button
                  onClick={saveCompound}
                  disabled={isSavingCompound}
                  className="px-6 py-3 rounded-xl bg-secondary text-on-secondary text-[10px] font-mono uppercase tracking-[0.25em] font-bold hover:shadow-[0_0_30px_rgba(118,243,234,0.22)] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSavingCompound ? text.saving : text.saveToSaved}
                </button>
                <button
                  onClick={() => {
                    void printCurrentReport();
                  }}
                  className="inline-flex items-center justify-center gap-3 px-6 py-3 rounded-xl bg-primary text-on-primary text-[10px] font-mono uppercase tracking-[0.25em] font-bold hover:shadow-[0_0_30px_rgba(167,200,255,0.28)] transition-all"
                >
                  <Download size={16} />
                  {text.printPdf}
                </button>
                {saveMessage && <p className="text-sm text-secondary">{saveMessage}</p>}
                {saveError && <p className="text-sm text-red-300">{saveError}</p>}
              </div>
            </div>
          </section>
        </div>
      ) : (
        <section className="glass-panel -mt-6 rounded-[2rem] p-5 pt-11 sm:p-6 sm:pt-12 lg:p-8 lg:pt-14 border-white/[0.03] space-y-8">
          <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/30 font-bold">
                {text.savedResults}
              </p>
              <h2 className="text-2xl font-display font-bold text-white mt-2">
                {text.storedDatabase}
              </h2>
              <p className="text-sm text-white/50 mt-2 max-w-2xl leading-relaxed">
                {text.savedDescription}
              </p>
            </div>
            <div className="relative group w-full xl:w-[420px]">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25 group-focus-within:text-primary transition-colors" />
              <input
                value={savedQuery}
                onChange={(event) => setSavedQuery(event.target.value)}
                placeholder={text.searchSaved}
                className="w-full rounded-2xl bg-white/[0.03] border border-white/10 pl-12 pr-4 py-4 text-sm text-white outline-none transition-all focus:border-primary/30 focus:bg-white/[0.06]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {isLoadingSaved && (
              <div className="md:col-span-2 lg:col-span-3 2xl:col-span-5 rounded-2xl border border-white/8 bg-white/[0.03] p-6 text-sm text-white/55">
                {text.loadingSaved}
              </div>
            )}

            {!isLoadingSaved && savedError && (
              <div className="md:col-span-2 lg:col-span-3 2xl:col-span-5 rounded-2xl border border-red-400/20 bg-red-500/10 p-6 text-sm text-red-100">
                {savedError}
              </div>
            )}

            {!isLoadingSaved && !savedError && savedCompounds.length === 0 && (
              <div className="md:col-span-2 rounded-2xl border border-white/8 bg-white/[0.03] p-6 text-sm text-white/55">
                {text.noSaved}
              </div>
            )}

            {!isLoadingSaved && !savedError && savedCompounds.map((compound) => (
              <div
                key={compound.id}
                className="w-full rounded-[1.6rem] p-5 sm:p-6 bg-white/[0.03] border border-white/8 hover:border-primary/20 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-white font-semibold truncate" title={compound.name}>{compound.name}</p>
                    <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/30 mt-2">
                      CAS {compound.cas}
                    </p>
                    <p className="text-xs text-white/45 mt-2">
                      {text.saved} {compound.savedAt ? formatDateTime(compound.savedAt) : text.recently}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                    <span className="px-2 py-1 rounded-full border border-white/10 bg-white/[0.03] text-[9px] font-mono uppercase tracking-[0.18em] text-secondary font-bold">
                      {compound.source}
                    </span>
                    <button
                      onClick={() => requestDeleteSavedCompound(compound)}
                      disabled={pendingDeleteCas === compound.cas}
                      className="p-2.5 rounded-xl bg-red-500/10 text-red-200 border border-red-400/20 hover:bg-red-500 hover:text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                      title={text.deleteSavedTitle}
                    >
                      <Trash2 size={16} />
                    </button>
                    <button
                      onClick={() => exportSavedCompoundReport(compound)}
                      className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-on-primary transition-all"
                      title={text.generatePdfTitle}
                    >
                      <Download size={16} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5 text-sm">
                  <div className="rounded-xl bg-[#0b1121]/50 border border-white/5 p-4">
                    <p className="text-white/30 font-mono uppercase tracking-widest">{text.epsilon}</p>
                    <p className="text-white mt-2 font-semibold">{formatNumber(compound.epsilon)}</p>
                  </div>
                  <div className="rounded-xl bg-[#0b1121]/50 border border-white/5 p-4 sm:col-span-2">
                    <p className="text-white/30 font-mono uppercase tracking-widest">{text.lambdaMax}</p>
                    <p className="text-white mt-2 font-semibold leading-relaxed break-words">{formatWavelengthMax(compound.lambdaMax)}</p>
                  </div>
                  <div className="rounded-xl bg-[#0b1121]/50 border border-white/5 p-4">
                    <p className="text-white/30 font-mono uppercase tracking-widest">{text.pathLengthShort}</p>
                    <p className="text-white mt-2 font-semibold">{formatNumber(compound.pathLength)} cm</p>
                  </div>
                  <div className="rounded-xl bg-[#0b1121]/50 border border-white/5 p-4">
                    <p className="text-white/30 font-mono uppercase tracking-widest">{text.concentration}</p>
                    <p className="text-white mt-2 font-semibold">{formatNumber(compound.concentration)} mol/L</p>
                  </div>
                  <div className="rounded-xl bg-[#0b1121]/50 border border-white/5 p-4 sm:col-span-2">
                    <p className="text-white/30 font-mono uppercase tracking-widest">{text.solvent}</p>
                    <p className="text-white mt-2 font-semibold">{compound.solvent}</p>
                  </div>
                  <div className="rounded-xl bg-[#0b1121]/50 border border-white/5 p-4 sm:col-span-2">
                    <p className="text-white/30 font-mono uppercase tracking-widest">{text.absorbance}</p>
                    <p className="text-white mt-2 font-semibold">{formatNumber(compound.absorbance)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

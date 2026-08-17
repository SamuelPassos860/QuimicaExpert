import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type Language = 'en' | 'pt' | 'es';

type TranslationKey =
  | 'app.loadingView.title'
  | 'app.loadingView.message'
  | 'app.checkingSession.title'
  | 'app.checkingSession.message'
  | 'layout.logo.subtitle'
  | 'layout.search.placeholder'
  | 'layout.help.quick'
  | 'layout.help.title'
  | 'layout.help.close'
  | 'layout.language.title'
  | 'layout.language.english'
  | 'layout.language.portuguese'
  | 'layout.language.spanish'
  | 'layout.logout'
  | 'layout.sidebar.close'
  | 'nav.dashboard'
  | 'nav.spectrophotometry'
  | 'nav.reports'
  | 'nav.methods'
  | 'nav.user-management'
  | 'nav.audit-logs'
  | 'faq.reports.question'
  | 'faq.reports.answer'
  | 'faq.result.question'
  | 'faq.result.answer'
  | 'faq.search.question'
  | 'faq.search.answer'
  | 'faq.pdf.question'
  | 'faq.pdf.answer';

type TranslationDictionary = Record<TranslationKey, string>;

const STORAGE_KEY = 'vsanalytics:language';
const LEGACY_STORAGE_KEY = ['quimica', 'expert:language'].join('');

export const LANGUAGE_OPTIONS: Array<{ id: Language; labelKey: TranslationKey; shortLabel: string }> = [
  { id: 'en', labelKey: 'layout.language.english', shortLabel: 'EN' },
  { id: 'pt', labelKey: 'layout.language.portuguese', shortLabel: 'PT' },
  { id: 'es', labelKey: 'layout.language.spanish', shortLabel: 'ES' }
];

const TRANSLATIONS: Record<Language, TranslationDictionary> = {
  en: {
    'app.loadingView.title': 'Loading View',
    'app.loadingView.message': 'Preparing the selected workspace...',
    'app.checkingSession.title': 'Checking Session',
    'app.checkingSession.message': 'Validating the active lab account...',
    'layout.logo.subtitle': 'Automation Core',
    'layout.search.placeholder': 'Search molecular data or protocols...',
    'layout.help.quick': 'Quick Help',
    'layout.help.title': 'Frequently asked questions',
    'layout.help.close': 'Close help',
    'layout.language.title': 'Language',
    'layout.language.english': 'English',
    'layout.language.portuguese': 'Portuguese',
    'layout.language.spanish': 'Spanish',
    'layout.logout': 'System Logout',
    'layout.sidebar.close': 'Close sidebar overlay',
    'nav.dashboard': 'Dashboard',
    'nav.spectrophotometry': 'Spectrophotometry',
    'nav.reports': 'Reports',
    'nav.methods': 'Methods',
    'nav.user-management': 'User Management',
    'nav.audit-logs': 'Audit Logs',
    'faq.reports.question': 'I cannot see the generated reports. What should I do?',
    'faq.reports.answer': 'Open Reports and check that the correct project is selected. On the Dashboard, use the project cards to filter results before opening the reports view.',
    'faq.result.question': 'The spectrophotometry result looks incorrect.',
    'faq.result.answer': 'Review epsilon, optical path length, concentration, and calculation mode. If you are using a saved compound, apply the record again to refill the fields.',
    'faq.search.question': 'I cannot find a compound in search.',
    'faq.search.answer': 'Try searching with a shorter part of the compound name or by CAS. If it is not available in the spectral database, use manual entry in Spectrophotometry.',
    'faq.pdf.question': 'The PDF opened with outdated data.',
    'faq.pdf.answer': 'Generate the report again after adjusting the fields, and confirm that a project is selected before exporting.'
  },
  pt: {
    'app.loadingView.title': 'Carregando Tela',
    'app.loadingView.message': 'Preparando o espaço de trabalho selecionado...',
    'app.checkingSession.title': 'Verificando Sessão',
    'app.checkingSession.message': 'Validando a conta ativa do laboratório...',
    'layout.logo.subtitle': 'Núcleo de Automação',
    'layout.search.placeholder': 'Pesquisar dados moleculares ou protocolos...',
    'layout.help.quick': 'Ajuda Rápida',
    'layout.help.title': 'Perguntas frequentes',
    'layout.help.close': 'Fechar ajuda',
    'layout.language.title': 'Idioma',
    'layout.language.english': 'Inglês',
    'layout.language.portuguese': 'Português',
    'layout.language.spanish': 'Espanhol',
    'layout.logout': 'Sair do sistema',
    'layout.sidebar.close': 'Fechar sobreposição da barra lateral',
    'nav.dashboard': 'Dashboard',
    'nav.spectrophotometry': 'Espectrofotometria',
    'nav.reports': 'Relatórios',
    'nav.methods': 'Métodos',
    'nav.user-management': 'Gerenciamento de Usuários',
    'nav.audit-logs': 'Registros de Auditoria',
    'faq.reports.question': 'Não consigo ver os relatórios gerados. O que devo fazer?',
    'faq.reports.answer': 'Abra Relatórios e confira se o projeto correto está selecionado. Na Dashboard, use os cards de projeto para filtrar os resultados antes de abrir a tela de relatórios.',
    'faq.result.question': 'O resultado da espectrofotometria parece incorreto.',
    'faq.result.answer': 'Revise epsilon, caminho óptico, concentração e modo de cálculo. Se estiver usando um composto salvo, aplique o registro novamente para preencher os campos.',
    'faq.search.question': 'Não encontro um composto na busca.',
    'faq.search.answer': 'Tente buscar por uma parte menor do nome do composto ou pelo CAS. Se ele não estiver na base espectral, use a entrada manual em Espectrofotometria.',
    'faq.pdf.question': 'O PDF abriu com dados desatualizados.',
    'faq.pdf.answer': 'Gere o relatório novamente depois de ajustar os campos e confirme que um projeto está selecionado antes de exportar.'
  },
  es: {
    'app.loadingView.title': 'Cargando Vista',
    'app.loadingView.message': 'Preparando el espacio de trabajo seleccionado...',
    'app.checkingSession.title': 'Verificando Sesión',
    'app.checkingSession.message': 'Validando la cuenta activa del laboratorio...',
    'layout.logo.subtitle': 'Núcleo de Automatización',
    'layout.search.placeholder': 'Buscar datos moleculares o protocolos...',
    'layout.help.quick': 'Ayuda Rápida',
    'layout.help.title': 'Preguntas frecuentes',
    'layout.help.close': 'Cerrar ayuda',
    'layout.language.title': 'Idioma',
    'layout.language.english': 'Inglés',
    'layout.language.portuguese': 'Portugués',
    'layout.language.spanish': 'Español',
    'layout.logout': 'Cerrar sesión',
    'layout.sidebar.close': 'Cerrar superposición de barra lateral',
    'nav.dashboard': 'Dashboard',
    'nav.spectrophotometry': 'Espectrofotometría',
    'nav.reports': 'Informes',
    'nav.methods': 'Métodos',
    'nav.user-management': 'Gestión de Usuarios',
    'nav.audit-logs': 'Registros de Auditoría',
    'faq.reports.question': 'No puedo ver los informes generados. ¿Qué debo hacer?',
    'faq.reports.answer': 'Abre Informes y verifica que el proyecto correcto esté seleccionado. En Dashboard, usa las tarjetas de proyecto para filtrar los resultados antes de abrir la vista de informes.',
    'faq.result.question': 'El resultado de espectrofotometría parece incorrecto.',
    'faq.result.answer': 'Revisa epsilon, longitud del camino óptico, concentración y modo de cálculo. Si usas un compuesto guardado, aplica el registro nuevamente para rellenar los campos.',
    'faq.search.question': 'No encuentro un compuesto en la búsqueda.',
    'faq.search.answer': 'Intenta buscar con una parte más corta del nombre del compuesto o por CAS. Si no está disponible en la base espectral, usa la entrada manual en Espectrofotometría.',
    'faq.pdf.question': 'El PDF abrió con datos desactualizados.',
    'faq.pdf.answer': 'Genera el informe nuevamente después de ajustar los campos y confirma que un proyecto esté seleccionado antes de exportar.'
  }
};

interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function getStoredLanguage(): Language {
  if (typeof window === 'undefined') return 'en';

  const storedValue = window.localStorage.getItem(STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_STORAGE_KEY);
  return storedValue === 'pt' || storedValue === 'es' ? storedValue : 'en';
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(getStoredLanguage);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo<LanguageContextValue>(() => ({
    language,
    setLanguage: setLanguageState,
    t: (key) => TRANSLATIONS[language][key] ?? TRANSLATIONS.en[key]
  }), [language]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error('useLanguage must be used inside LanguageProvider');
  }

  return context;
}

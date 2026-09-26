// Kastbar navigationsstudie på befintlig ingång, ?prototype=navigation&variant=A/B/C.
// B prövar fria paneler inom godkända D. A/C är jämförelser. Påhittat innehåll i minnet.
import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { useSearchParams } from 'react-router';
import { MapStudyLab, MapStudyMap, MapStudyPages, useMapStudy } from './MapStudy.js';
import {
  navObjects as defaultNavObjects,
  NavigationPrototypePages,
  type NavPage,
  pageTitles,
} from './NavigationPrototypePages.js';
import {
  NavigationPrototypeTheme,
  type ThemeMode,
  usePrototypeTheme,
} from './NavigationPrototypeTheme.js';
import { NavigationPrototypeWindows } from './NavigationPrototypeWindows.js';
import { PrototypeIcon } from './VisualPrototype.js';
import { VisualPrototypeDFrame } from './VisualPrototypeDFrame.js';
import { VisualPrototypeMap } from './VisualPrototypeMap.js';
import './visual-prototype-d.css';
import './navigation-prototype.css';

const variants = {
  A: {
    name: 'Byt panel',
    description:
      'Samtalet ersätter redigeringen i samma panel. Du byter tillbaka för att fortsätta.',
  },
  B: {
    name: 'Fria paneler',
    description:
      'Öppna flera objekt och samtalet. Flytta panelerna var för sig. På mobil väljer du bland öppna paneler.',
  },
  C: {
    name: 'Flikar i panelen',
    description: 'Redigering och samtal får varsin flik i samma panel. Du växlar med flikarna.',
  },
};
type Variant = keyof typeof variants;
type WorkWindow = { id: string; page: NavPage; objectId?: string };
type Scenario =
  | 'normal'
  | 'empty'
  | 'no-graphics'
  | 'no-voice'
  | 'network'
  | 'loading'
  | 'missing'
  | 'access'
  | 'signin'
  | 'setup';
const scenarios: Record<Scenario, string> = {
  normal: 'Befolkad karta',
  empty: 'Tom karta',
  'no-graphics': 'Grafik saknas',
  'no-voice': 'Tal saknas',
  network: 'Nätfel',
  loading: 'Laddning',
  missing: 'Saknad sida',
  access: 'Förlorad åtkomst',
  signin: 'Inloggning',
  setup: 'Första användning',
};
const utilityPages: NavPage[] = [
  'settings',
  'help',
  'login-methods',
  'invitations',
  'assistants',
  'consent',
  'administration',
  'members',
  'owners',
  'export',
  'import',
  'erasure',
  'costs',
];
const restricted: NavPage[] = [
  'administration',
  'export',
  'import',
  'erasure',
  'owners',
  'members',
];

function Panel({
  page,
  children,
  onClose,
  onBack,
  extra,
  className = '',
  style,
}: {
  page: NavPage;
  children: ReactNode;
  onClose: () => void;
  onBack?: () => void;
  extra?: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (title.current?.id === `np-title-${page}`) title.current.focus({ preventScroll: true });
  }, [page]);
  return (
    <section className={`np-panel ${className}`} aria-labelledby={`np-title-${page}`} style={style}>
      {extra}
      <header className="np-panel-header">
        {onBack && (
          <button type="button" onClick={onBack} aria-label="Tillbaka till föregående verktyg">
            <PrototypeIcon name="back" />
          </button>
        )}
        <h2 ref={title} tabIndex={-1} id={`np-title-${page}`}>
          {pageTitles[page]}
        </h2>
        <button type="button" onClick={onClose} aria-label={`Stäng ${pageTitles[page]}`}>
          <PrototypeIcon name="close" />
        </button>
      </header>
      <div className="np-panel-body">{children}</div>
    </section>
  );
}

export function NavigationPrototype() {
  const study = useMapStudy();
  const navObjects = study?.objects ?? defaultNavObjects;
  const [params, setParams] = useSearchParams();
  const candidate = params.get('variant') ?? 'B';
  const variant: Variant = study ? 'B' : candidate in variants ? (candidate as Variant) : 'B';
  const candidatePage = params.get('view') ?? 'map';
  const page: NavPage = candidatePage in pageTitles ? (candidatePage as NavPage) : 'map';
  const themeCandidate = params.get('theme');
  const themeMode: ThemeMode =
    themeCandidate === 'light' || themeCandidate === 'dark' ? themeCandidate : 'system';
  const theme = usePrototypeTheme(themeMode);
  const [scenario, setScenario] = useState<Scenario>('normal');
  const [role, setRole] = useState<
    'member' | 'administrator' | 'operator' | 'administrator-operator'
  >('administrator-operator');
  const utilityCandidate = params.get('panel') as NavPage | null;
  const utility =
    utilityCandidate && utilityPages.includes(utilityCandidate) ? utilityCandidate : null;
  const [utilityTrail, setUtilityTrail] = useState<NavPage[]>([]);
  const [statusOpen, setStatusOpen] = useState(false);
  const [guide, setGuide] = useState<'compare' | 'settings' | null>(null);
  const [guideStep, setGuideStep] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState('subscription');
  const [camera, setCamera] = useState<'overview' | 'focus'>('overview');
  const [query, setQuery] = useState('');
  const [buffers, setBuffers] = useState<Record<string, string>>({});
  const [staged, setStaged] = useState<Record<string, string>>({});
  const [savedNames, setSavedNames] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [transcript, setTranscript] = useState<string[]>([
    'Skyttel: Berätta vad du vill lägga till eller hitta.',
  ]);
  const [voice, setVoice] = useState(false);
  const initialWindow: WorkWindow | null =
    page !== 'map' && !utilityPages.includes(page)
      ? {
          id: page === 'edit' || page === 'detail' ? 'object-subscription' : page,
          page,
          objectId: page === 'edit' || page === 'detail' ? 'subscription' : undefined,
        }
      : null;
  const [windows, setWindows] = useState<WorkWindow[]>(() =>
    initialWindow ? [initialWindow] : [],
  );
  const [activeWindow, setActiveWindow] = useState<string | null>(initialWindow?.id ?? null);
  const [layoutVersion, setLayoutVersion] = useState(0);
  const [tabs, setTabs] = useState<NavPage[]>([]);
  const [trail, setTrail] = useState<NavPage[]>([]);
  const [saveState, setSaveState] = useState<'idle' | 'pending' | 'saved' | 'failed'>('idle');
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const [popupStyle, setPopupStyle] = useState<CSSProperties>({});
  const [inspector, setInspector] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<HTMLElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const ready = !['access', 'signin', 'setup', 'loading', 'missing'].includes(scenario);
  const administrator = role === 'administrator' || role === 'administrator-operator';
  const operator = role === 'operator' || role === 'administrator-operator';
  const baseObject = navObjects.find((object) => object.id === selected) ?? navObjects[0];
  const currentObject = { ...baseObject, name: savedNames[selected] ?? baseObject.name };
  const hasStudyProposals = study?.proposals ?? false;
  const draftCount = Object.keys(staged).length + (hasStudyProposals ? 4 : 0);
  const unsentCount = Object.keys(buffers).filter(
    (id) =>
      buffers[id] !==
      (staged[id] ?? savedNames[id] ?? navObjects.find((object) => object.id === id)?.name),
  ).length;
  const showConversation = variant === 'B' && windows.some((item) => item.page === 'conversation');
  const mainPage = page === 'conversation' && variant === 'B' ? 'map' : page;
  const displayedPage = utility ?? mainPage;
  const permitted =
    (!restricted.includes(displayedPage) || administrator) &&
    (displayedPage !== 'costs' || operator);
  const personalPage = ['login-methods', 'invitations', 'costs'].includes(displayedPage);
  const showPanel =
    (variant !== 'B' || !!utility) &&
    displayedPage !== 'map' &&
    (ready || (scenario === 'access' && personalPage));

  function updateParams(updates: Record<string, string>, replace = false) {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(updates)) next.set(key, value);
    setParams(next, { replace });
  }
  function restoreFocus() {
    requestAnimationFrame(() => {
      const target = returnFocus.current;
      if (target?.isConnected && target.getClientRects().length && !target.closest('[inert]'))
        target.focus({ preventScroll: true });
      else rootRef.current?.querySelector<HTMLButtonElement>('[data-tool="list"]')?.focus();
    });
  }
  function openWindow(next: NavPage, objectId = selected) {
    if (next === 'map') return;
    const objectPage = next === 'edit' || next === 'detail';
    const id = objectPage ? `object-${objectId}` : next;
    setWindows((previous) => {
      const existing = previous.find((item) => item.id === id);
      if (existing) {
        // Att återöppna objektet ska inte dölja dess pågående redigering.
        if (next === 'detail' && existing.page === 'edit') return previous;
        return previous.map((item) => (item.id === id ? { ...item, page: next } : item));
      }
      return [...previous, { id, page: next, objectId: objectPage ? objectId : undefined }];
    });
    setActiveWindow(id);
  }
  function closeWindow(id: string) {
    const remaining = windows.filter((item) => item.id !== id);
    setWindows(remaining);
    if (activeWindow === id) setActiveWindow(remaining.at(-1)?.id ?? null);
    if (!remaining.length) restoreFocus();
  }
  function go(next: NavPage, objectId = selected) {
    returnFocus.current = document.activeElement as HTMLElement;
    setExpanded(false);
    setAnchor(null);
    setStatusOpen(false);
    if (utilityPages.includes(next)) {
      if (utility) setUtilityTrail((previous) => [...previous, utility]);
      updateParams({ panel: next });
      return;
    }
    if (variant === 'B') {
      openWindow(next, objectId);
      updateParams({ panel: '' });
      return;
    }
    if (next !== page) setTrail((previous) => [...previous, page]);
    if (next !== 'map' && next !== 'more')
      setTabs((previous) => (previous.includes(next) ? previous : [...previous, next]));
    updateParams({ view: next, panel: '' });
  }
  function closeUtility() {
    setUtilityTrail([]);
    updateParams({ panel: '' });
    requestAnimationFrame(() => {
      const root = rootRef.current;
      const target =
        root?.querySelector<HTMLElement>('.np-window[data-active="true"]:not([hidden]) h2') ??
        root?.querySelector<HTMLElement>('.np-panel-host:not([hidden]) h2') ??
        root?.querySelector<HTMLElement>('[data-tool="settings"]');
      target?.focus({ preventScroll: true });
    });
  }
  function closePanel() {
    if (utility) {
      closeUtility();
      return;
    }
    setAnchor(null);
    setTabs((previous) => previous.filter((tab) => tab !== page));
    setTrail([]);
    updateParams({ view: 'map' });
    restoreFocus();
  }
  function goBack() {
    if (utility) {
      const previous = utilityTrail.at(-1);
      if (!previous) {
        closeUtility();
        return;
      }
      setUtilityTrail((items) => items.slice(0, -1));
      updateParams({ panel: previous });
      return;
    }
    const target = trail.at(-1) ?? 'map';
    setTrail((previous) => previous.slice(0, -1));
    setAnchor(null);
    updateParams({ view: target });
    if (target === 'map') restoreFocus();
  }
  function showComparisonStep(step: number, nextVariant = variant) {
    setGuide('compare');
    setGuideStep(step);
    setSelected('subscription');
    setScenario('normal');
    setStatusOpen(false);
    setBuffers((previous) => ({
      ...previous,
      subscription: previous.subscription ?? 'Familjens musik',
    }));
    setMessage((previous) => previous || 'Vilka använder tjänsten?');
    setTabs(step === 0 ? ['edit'] : ['edit', 'conversation']);
    if (nextVariant === 'B') {
      setWindows((previous) => {
        const others = previous.filter((item) => item.id !== 'object-subscription');
        return [{ id: 'object-subscription', page: 'edit', objectId: 'subscription' }, ...others];
      });
      openWindow('edit', 'subscription');
      if (step === 1) openWindow('conversation');
    }
    setTrail([]);
    setAnchor(null);
    updateParams(
      {
        variant: nextVariant,
        panel: '',
        view: step === 1 && nextVariant !== 'B' ? 'conversation' : 'edit',
      },
      true,
    );
  }
  function chooseVariant(next: Variant) {
    if (guide === 'compare') {
      showComparisonStep(guideStep, next);
      return;
    }
    setAnchor(null);
    if (next === 'B' && page !== 'map') openWindow(page);
    updateParams({ variant: next }, true);
  }
  function switchVariant(direction: number) {
    const keys = Object.keys(variants) as Variant[];
    chooseVariant(keys[(keys.indexOf(variant) + direction + keys.length) % keys.length]);
  }
  function showSettingsExample() {
    setGuide('settings');
    setRole('administrator-operator');
    setVoice(true);
    setBuffers((previous) => ({
      ...previous,
      subscription: previous.subscription ?? 'Familjens musik',
    }));
    setSelected('subscription');
    setExpanded(window.innerWidth > 600);
    if (variant === 'B') openWindow('edit', 'subscription');
    updateParams({ view: 'edit', panel: 'settings' });
  }
  function showFreePanels() {
    setGuide(null);
    setScenario('normal');
    setStatusOpen(false);
    setExpanded(false);
    openWindow('edit', 'subscription');
    openWindow('edit', 'music');
    openWindow('conversation');
    updateParams({ variant: 'B', view: 'map', panel: '' });
  }
  function selectObject(id: string) {
    setSelected(id);
    go('detail', id);
  }
  function resetSession(next: Scenario) {
    setScenario(next);
    setAnchor(null);
    if (['access', 'signin', 'setup'].includes(next)) {
      setVoice(false);
      setWindows([]);
      setActiveWindow(null);
      setMessage('');
      setBuffers({});
      setStaged({});
      study?.resetProposals();
      setSavedNames({});
      setTranscript([]);
      setQuery('');
      setSaveState('idle');
      setTabs([]);
      setTrail([]);
      setSelected('subscription');
      setCamera('overview');
      updateParams({ view: 'map', panel: '' }, true);
      setStatusOpen(false);
    }
    if (['no-voice', 'network', 'missing', 'loading'].includes(next)) setVoice(false);
  }
  function toggleVoice() {
    if (scenario === 'no-voice' || scenario === 'network') {
      go('conversation');
      return;
    }
    setVoice((previous) => !previous);
  }
  function stage(objectId = selected) {
    if (saveState === 'pending') return;
    const value =
      buffers[objectId] ??
      staged[objectId] ??
      savedNames[objectId] ??
      navObjects.find((item) => item.id === objectId)?.name ??
      '';
    setStaged((previous) => ({ ...previous, [objectId]: value }));
    setSaveState('idle');
    setBuffers((previous) => {
      const next = { ...previous };
      delete next[objectId];
      return next;
    });
    go('draft');
  }
  function save() {
    if (draftCount > 0) setSaveState(scenario === 'network' ? 'failed' : 'pending');
  }
  function resolveSave(success: boolean) {
    if (saveState !== 'pending') return;
    if (success) {
      setSavedNames((previous) => ({ ...previous, ...staged }));
      setStaged({});
      study?.commitProposals();
    }
    setSaveState(success ? 'saved' : 'failed');
  }

  useEffect(() => {
    if (hasStudyProposals) setSaveState('idle');
  }, [hasStudyProposals]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const lab = root.querySelector<HTMLElement>('.np-lab');
    const toolbox = root.querySelector<HTMLElement>('.vp-d-toolbox');
    const summary = root.querySelector<HTMLElement>('.vp-d-status');
    const measure = () => {
      const labHeight = lab?.getBoundingClientRect().height ?? 140;
      root.style.setProperty('--np-lab-height', `${labHeight}px`);
      root.style.setProperty('--vp-switcher-clearance', `${labHeight + 36}px`);
      root.style.setProperty(
        '--np-top-clearance',
        `${(toolbox?.getBoundingClientRect().bottom ?? 70) + 30}px`,
      );
      root.style.setProperty(
        '--np-status-height',
        `${summary?.getBoundingClientRect().height ?? 60}px`,
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    for (const node of [lab, toolbox, summary]) if (node) observer.observe(node);
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);
  useEffect(() => {
    if (statusOpen)
      rootRef.current
        ?.querySelector<HTMLElement>('#np-status-title')
        ?.focus({ preventScroll: true });
  }, [statusOpen]);
  useEffect(() => {
    if (!ready && !showPanel && scenario in scenarios)
      rootRef.current?.querySelector<HTMLElement>('#np-gate-title')?.focus();
  }, [ready, showPanel, scenario]);
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    // Bara kartobjekt som faktiskt skyms undantas från pek- och tangentbordsordningen.
    const surfaces = [
      ...root.querySelectorAll<HTMLElement>(
        '.vp-d-toolbox, .vp-d-status, .np-panel, .np-lab, .np-map-controls',
      ),
    ];
    const updateCoveredObjects = () => {
      const covers = surfaces
        .filter((surface) => surface.getClientRects().length)
        .map((surface) => surface.getBoundingClientRect());
      for (const node of root.querySelectorAll<HTMLElement>('.vp-map-node')) {
        const rect = node.getBoundingClientRect();
        node.inert = covers.some(
          (cover) =>
            rect.left < cover.right &&
            rect.right > cover.left &&
            rect.top < cover.bottom &&
            rect.bottom > cover.top,
        );
      }
    };
    updateCoveredObjects();
    const observer = new ResizeObserver(updateCoveredObjects);
    const movement = new MutationObserver(updateCoveredObjects);
    for (const surface of surfaces) observer.observe(surface);
    for (const surface of surfaces)
      movement.observe(surface, { attributes: true, attributeFilter: ['style', 'hidden'] });
    window.addEventListener('resize', updateCoveredObjects);
    root.addEventListener('scroll', updateCoveredObjects);
    return () => {
      observer.disconnect();
      movement.disconnect();
      window.removeEventListener('resize', updateCoveredObjects);
      root.removeEventListener('scroll', updateCoveredObjects);
    };
  });
  useEffect(() => {
    function keyboard(event: KeyboardEvent) {
      if (event.defaultPrevented) return;
      const target = event.target as HTMLElement;
      if (event.key === 'Escape' && !target.closest('.np-lab')) {
        if (statusOpen) {
          setStatusOpen(false);
          rootRef.current?.querySelector<HTMLElement>('[data-tool="status"]')?.focus();
          return;
        }
        if (utility) {
          closeUtility();
          return;
        }
        if (expanded) {
          setExpanded(false);
          return;
        }
        if (variant === 'B' && activeWindow) {
          closeWindow(activeWindow);
          return;
        }
        if (page !== 'map') closePanel();
      }
      if (
        target.closest(
          'input, textarea, select, [contenteditable="true"], [role="tablist"], .np-windows, .np-theme',
        )
      )
        return;
      if (!study && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
        event.preventDefault();
        switchVariant(event.key === 'ArrowLeft' ? -1 : 1);
      }
    }
    window.addEventListener('keydown', keyboard);
    return () => window.removeEventListener('keydown', keyboard);
  });
  useLayoutEffect(() => {
    if (variant === 'B' || !anchor || page !== 'detail') return;
    const position = () => {
      const area = workspaceRef.current?.getBoundingClientRect();
      if (!area) return;
      const width = Math.min(340, area.width - 16);
      const height = Math.min(360, area.height - 16);
      let left = Math.max(area.left + 8, Math.min(anchor.right + 12, area.right - width - 8));
      const conversation = rootRef.current
        ?.querySelector<HTMLElement>('.np-conversation-host:not([hidden])')
        ?.getBoundingClientRect();
      if (conversation && left + width > conversation.left && left < conversation.right) {
        left = Math.max(area.left + 8, anchor.left - width - 12);
      }
      const top = Math.max(area.top + 8, Math.min(anchor.top, area.bottom - height - 8));
      setPopupStyle({
        position: 'fixed',
        width,
        maxHeight: height,
        left,
        top,
        right: 'auto',
        bottom: 'auto',
      });
    };
    position();
    const observer = new ResizeObserver(position);
    if (workspaceRef.current) observer.observe(workspaceRef.current);
    window.addEventListener('resize', position);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', position);
    };
  }, [anchor, page, variant]);
  useEffect(() => {
    if (variant === 'B' || !anchor) return;
    const dismiss = (event: PointerEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest('.np-panel, .vp-d-toolbox, .np-lab, .vp-d-status, .vp-map-node')) return;
      closePanel();
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  });

  function contents(contentPage: NavPage, objectId = selected) {
    if (study && (contentPage === 'list' || contentPage === 'detail')) {
      return (
        <MapStudyPages
          page={contentPage}
          selectedId={objectId}
          onSelect={selectObject}
          onEdit={() => go('edit', objectId)}
          names={savedNames}
          staged={staged}
        />
      );
    }
    const value =
      buffers[objectId] ??
      staged[objectId] ??
      savedNames[objectId] ??
      navObjects.find((item) => item.id === objectId)?.name ??
      '';
    return (
      <NavigationPrototypePages
        objects={navObjects}
        page={contentPage}
        go={(next) => go(next, objectId)}
        selected={objectId}
        selectObject={selectObject}
        query={query}
        setQuery={setQuery}
        buffer={value}
        setBuffer={(value) => setBuffers((previous) => ({ ...previous, [objectId]: value }))}
        staged={staged}
        additionalDraftCount={hasStudyProposals ? 4 : 0}
        additionalDraft={
          hasStudyProposals ? (
            <ul>
              <li>Familjeabonnemang: priset ändras från 189 till 199 kr per månad.</li>
              <li>
                Betalningssambandet ändras från Gemensamt bankkonto till Kort ·· 4242. Den tidigare
                kopplingen visas i kartan.
              </li>
              <li>Ny tjänst: Filmlyktan.</li>
              <li>Nytt samband: Lo använder Filmlyktan.</li>
            </ul>
          ) : undefined
        }
        savedNames={savedNames}
        stage={() => stage(objectId)}
        message={message}
        setMessage={setMessage}
        transcript={transcript}
        send={() => {
          if (!message.trim()) return;
          setTranscript((previous) => [
            ...previous,
            `Du: ${message}`,
            'Skyttel: Jag har tagit emot din text. Detta är ett simulerat svar.',
          ]);
          setMessage('');
        }}
        save={save}
        saving={saveState === 'pending'}
        empty={scenario === 'empty'}
        administrator={administrator}
        operator={operator}
        logout={() => resetSession('signin')}
      />
    );
  }

  let status = 'Hushållets gemensamma karta';
  if (voice) status = 'Lyssnar · talet är simulerat';
  if (draftCount)
    status += ` · Privat utkast: ${draftCount} ändring${draftCount === 1 ? '' : 'ar'}`;
  if (unsentCount) status += ` · ${unsentCount} oskickad redigering`;
  if (message) status += ' · Oskickad text';
  if (saveState === 'pending') status += ' · Sparar hela utkastet… väntar på resultat';
  if (saveState === 'saved') status += ' · Senaste utkastet sparat (simulerat kvitto)';
  if (saveState === 'failed') status += ' · Kunde inte spara · ditt privata utkast finns kvar';
  if (scenario === 'network')
    status = 'Nätanslutningen saknas · kontrollera anslutningen. Oskickat arbete finns kvar.';
  if (scenario === 'no-voice') status = 'Tal är inte tillgängligt · skriv i samtalet';
  if (!ready) status = scenarios[scenario];
  const panelHidden = statusOpen;

  const statusTitle =
    saveState === 'pending'
      ? 'Sparar hela utkastet…'
      : saveState === 'failed'
        ? 'Kunde inte spara'
        : saveState === 'saved'
          ? 'Hela utkastet sparat'
          : voice
            ? 'Lyssnar'
            : draftCount
              ? 'Ditt privata utkast'
              : unsentCount || message
                ? 'Pågående arbete'
                : 'Din gemensamma karta';
  const statusSubtitle =
    saveState === 'pending'
      ? 'Väntar på resultat.'
      : saveState === 'failed'
        ? 'Ditt utkast finns kvar.'
        : saveState === 'saved'
          ? 'Simulerat kvitto · se Aktuell status.'
          : voice
            ? 'Talet är simulerat.'
            : draftCount
              ? `${draftCount} ändringar · ännu inte sparade`
              : unsentCount || message
                ? 'Oskickat innehåll finns kvar.'
                : 'Inga osparade ändringar';
  function toolbarButton(
    name: string,
    label: string,
    action: () => void,
    key: string,
    active = false,
  ) {
    return (
      <button
        type="button"
        className="vp-d-action np-tool"
        data-tool={key}
        aria-label={label}
        title={label}
        aria-expanded={active}
        onClick={action}
      >
        <PrototypeIcon name={name} />
        <span className="vp-d-label">{label}</span>
      </button>
    );
  }
  return (
    <div
      ref={rootRef}
      className={`vp-root vp-variant-D np-root${study ? ' map-study' : ''}`}
      data-theme={theme}
      data-variant={variant}
      data-expanded={expanded}
    >
      <a className="np-skip" href="#np-tools">
        Till verktygen
      </a>
      <a className="np-skip" href="#np-work">
        Till arbetsytan
      </a>
      <VisualPrototypeDFrame
        expanded={expanded}
        className="np-d-navigation"
        context={ready ? undefined : <>Skyttel</>}
        actions={
          ready && (
            <>
              <button
                type="button"
                className={`vp-d-action vp-d-talk${voice ? ' vp-d-talk-active' : ''}`}
                aria-label={voice ? 'Stoppa tal' : 'Starta tal'}
                title={voice ? 'Stoppa tal' : 'Starta tal'}
                aria-pressed={voice}
                onClick={toggleVoice}
              >
                {voice ? (
                  <svg
                    className="vp-icon vp-d-stop-icon"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <rect
                      x="8"
                      y="8"
                      width="8"
                      height="8"
                      rx="1"
                      fill="currentColor"
                      stroke="none"
                    />
                  </svg>
                ) : (
                  <PrototypeIcon name="mic" />
                )}
                <span className="vp-d-label">{voice ? 'Stoppa tal' : 'Prata med Skyttel'}</span>
              </button>
              {toolbarButton(
                'text',
                'Samtal och text',
                () => go('conversation'),
                'conversation',
                page === 'conversation' || showConversation,
              )}
              {toolbarButton(
                'list',
                'Objekt och samband',
                () => go('list'),
                'list',
                page === 'list' ||
                  (variant === 'B' && windows.some((item) => item.page === 'list')),
              )}
            </>
          )
        }
        footer={
          ready && (
            <>
              <NavigationPrototypeTheme
                mode={themeMode}
                onChange={(mode) => updateParams({ theme: mode }, true)}
                expanded={expanded}
              />
              {toolbarButton(
                'settings',
                'Inställningar',
                () => (utility === 'settings' ? closeUtility() : go('settings')),
                'settings',
                utility === 'settings',
              )}
              {toolbarButton(
                'info',
                'Information',
                () => (utility === 'help' ? closeUtility() : go('help')),
                'information',
                utility === 'help',
              )}
              {toolbarButton(
                'activity',
                'Aktuell status',
                () => setStatusOpen((previous) => !previous),
                'status',
                statusOpen,
              )}
              {toolbarButton(
                expanded ? 'back' : 'arrow',
                expanded ? 'Dölj verktygsnamn' : 'Visa verktygsnamn',
                () => setExpanded((previous) => !previous),
                'expand',
                expanded,
              )}
            </>
          )
        }
        status={
          <>
            <div className="vp-status" role="status" aria-live="polite">
              <span className="vp-status-symbol">
                <PrototypeIcon
                  name={
                    saveState === 'failed' || scenario === 'network'
                      ? 'alert'
                      : voice
                        ? 'mic'
                        : 'check'
                  }
                />
              </span>
              <div>
                <strong>{ready ? statusTitle : scenarios[scenario]}</strong>
                <span>
                  {scenario === 'network'
                    ? 'Nätanslutningen saknas. Ditt arbete finns kvar.'
                    : statusSubtitle}
                </span>
              </div>
            </div>
            {voice && (
              <div className="vp-d-audio-feedback">
                <span className="vp-d-waveform" aria-hidden="true">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((bar) => (
                    <i key={bar} />
                  ))}
                </span>
                <p className="vp-d-sound-status">Tyst just nu · Lyssnar fortfarande</p>
              </div>
            )}
            <span className="np-sr-status" role="status">
              {status}
            </span>
          </>
        }
        map={
          <div
            className="np-map-backdrop"
            data-camera={camera}
            inert={!ready || scenario === 'no-graphics' || scenario === 'empty'}
          >
            {ready &&
              scenario !== 'no-graphics' &&
              scenario !== 'empty' &&
              (study ? (
                <MapStudyMap
                  selectedId={selected}
                  onSelect={selectObject}
                  onList={() => go('list')}
                  theme={theme}
                  names={savedNames}
                  staged={staged}
                />
              ) : (
                <VisualPrototypeMap
                  variant="A"
                  selectedId={selected}
                  names={savedNames}
                  onSelect={() => selectObject('subscription')}
                  onSelectObject={(object, origin) => {
                    selectObject(object.id);
                    setAnchor(origin);
                  }}
                />
              ))}
          </div>
        }
      >
        <main className="np-workspace" id="np-work" tabIndex={-1} ref={workspaceRef}>
          {variant === 'B' && ready && (
            <NavigationPrototypeWindows
              windows={windows.map((item) => ({
                id: item.id,
                title: item.objectId
                  ? `${pageTitles[item.page]} · ${savedNames[item.objectId] ?? navObjects.find((object) => object.id === item.objectId)?.name}`
                  : pageTitles[item.page],
                content: contents(item.page, item.objectId),
              }))}
              activeId={activeWindow}
              onActivate={setActiveWindow}
              onClose={closeWindow}
              hidden={!!utility || statusOpen}
              layoutVersion={layoutVersion}
            />
          )}
          {ready && variant === 'C' && !utility && page === 'map' && tabs.length > 0 && (
            <nav className="np-return-tabs np-tabs" aria-label="Öppna verktyg">
              <span>Karta</span>
              {tabs.map((tab) => (
                <button type="button" key={tab} onClick={() => go(tab)}>
                  {pageTitles[tab]}
                </button>
              ))}
            </nav>
          )}
          {!study &&
            ready &&
            camera === 'focus' &&
            !showPanel &&
            !showConversation &&
            !(variant === 'B' && windows.length) && (
              <nav className="np-map-controls" aria-label="Kartans vy">
                <button
                  type="button"
                  onClick={() => {
                    setCamera('overview');
                    if (page !== 'map') closePanel();
                  }}
                >
                  Överblick
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setCamera((previous) => (previous === 'focus' ? 'overview' : 'focus'))
                  }
                  aria-pressed={camera === 'focus'}
                >
                  Fokus: {currentObject.name}
                </button>
              </nav>
            )}
          {ready &&
            !showPanel &&
            !showConversation &&
            !(variant === 'B' && windows.length) &&
            ['empty', 'no-graphics'].includes(scenario) && (
              <section className="np-empty">
                <p className="np-kicker">
                  {scenario === 'empty' ? 'Börja med något du känner till' : 'Samma arbete i text'}
                </p>
                <h1>
                  {scenario === 'empty' ? 'Vad hör ihop hemma hos er?' : 'Kartan kan inte visas'}
                </h1>
                <p>
                  {scenario === 'empty'
                    ? 'Berätta om en tjänst, en bostad eller ett avtal. Kartan växer när du väljer att spara.'
                    : 'Du kan hitta objekt, läsa samband och ändra uppgifter i listan.'}
                </p>
                <button
                  className="np-primary"
                  type="button"
                  onClick={scenario === 'empty' ? toggleVoice : () => go('list')}
                >
                  {scenario === 'empty' ? 'Börja prata' : 'Öppna objekt och samband'}
                </button>
                <button type="button" onClick={() => go('conversation')}>
                  Skriv i stället
                </button>
                {scenario === 'empty' && (
                  <button type="button" onClick={() => go('new-object')}>
                    Lägg till manuellt
                  </button>
                )}
              </section>
            )}
          {showPanel && (
            <div className="np-panel-host" hidden={panelHidden}>
              <Panel
                page={displayedPage}
                onClose={closePanel}
                onBack={utility || trail.length ? goBack : undefined}
                className={anchor && !utility && mainPage === 'detail' ? 'np-anchored-detail' : ''}
                style={anchor && !utility && mainPage === 'detail' ? popupStyle : undefined}
                extra={
                  variant === 'C' &&
                  !utility && (
                    <nav className="np-tabs" aria-label="Öppna verktyg">
                      <button
                        type="button"
                        onClick={() => {
                          go('map');
                          restoreFocus();
                        }}
                      >
                        Karta
                      </button>
                      {tabs.map((tab) => (
                        <button
                          type="button"
                          key={tab}
                          aria-current={page === tab ? 'page' : undefined}
                          onClick={() => go(tab)}
                        >
                          {pageTitles[tab]}
                        </button>
                      ))}
                    </nav>
                  )
                }
              >
                {utility && (
                  <p className="np-temporary-note">
                    Tillfällig vy · ditt pågående arbete finns kvar.
                  </p>
                )}
                {permitted ? (
                  contents(displayedPage)
                ) : (
                  <p>
                    Du saknar behörighet till den här delen. Hushållets karta är fortfarande
                    tillgänglig.
                  </p>
                )}
                {utility && (
                  <button className="np-return-work" type="button" onClick={closeUtility}>
                    Tillbaka till arbetet
                  </button>
                )}
              </Panel>
            </div>
          )}
          {!ready && !showPanel && (
            <section className="np-gate np-stack" aria-labelledby="np-gate-title">
              <p className="np-kicker">Skyttel</p>
              <h1 id="np-gate-title" tabIndex={-1}>
                {scenario === 'signin' ? 'Välkommen hem till din karta' : scenarios[scenario]}
              </h1>
              {scenario === 'signin' && (
                <>
                  <p>Logga in för att öppna hushållets karta.</p>
                  <button
                    className="np-primary"
                    type="button"
                    onClick={() => setScenario('normal')}
                  >
                    Fortsätt med Google · prov
                  </button>
                  <button type="button" onClick={() => setScenario('setup')}>
                    Fortsätt med Microsoft · ny användare i provet
                  </button>
                </>
              )}
              {scenario === 'setup' && (
                <>
                  <p>Välkommen, Alex. Ge hushållets karta ett namn för att börja.</p>
                  <label htmlFor="np-household">Hushållets namn</label>
                  <input id="np-household" defaultValue="Hushållet Lind" />
                  <button className="np-primary" type="button" onClick={() => setScenario('empty')}>
                    Öppna hushållets karta
                  </button>
                </>
              )}
              {scenario === 'loading' && (
                <p role="status">
                  Öppnar hushållets karta… välj ett annat provläge för att fortsätta.
                </p>
              )}
              {scenario === 'access' && (
                <>
                  <p>
                    Du har inte längre tillgång till hushållet. Samtalet har stoppats och
                    hushållsinnehållet har dolts.
                  </p>
                  <button type="button" onClick={() => go('login-methods')}>
                    Inloggningssätt
                  </button>
                  <button type="button" onClick={() => go('invitations')}>
                    Inbjudan och användar-ID
                  </button>
                  <button type="button" onClick={() => resetSession('signin')}>
                    Till inloggning
                  </button>
                </>
              )}
              {scenario === 'missing' && (
                <>
                  <p>Adressen leder inte till någon vy. Ditt pågående arbete finns kvar.</p>
                  <button type="button" onClick={() => setScenario('normal')}>
                    Tillbaka till kartan
                  </button>
                </>
              )}
              {operator && scenario === 'access' && (
                <button
                  type="button"
                  onClick={() => {
                    go('costs');
                  }}
                >
                  Öppna kostnadsöversikt
                </button>
              )}
            </section>
          )}
        </main>

        {statusOpen && ready && (
          <section className="np-panel np-status-panel" aria-labelledby="np-status-title">
            <header className="np-panel-header">
              <h2 id="np-status-title" tabIndex={-1}>
                Aktuell status
              </h2>
              <button
                type="button"
                aria-label="Stäng aktuell status"
                onClick={() => {
                  setStatusOpen(false);
                  rootRef.current?.querySelector<HTMLElement>('[data-tool="status"]')?.focus();
                }}
              >
                <PrototypeIcon name="close" />
              </button>
            </header>
            <div className="np-panel-body np-stack">
              <p>{status}</p>
              <p className="np-muted">
                Här ser du pågående arbete och resultat. Hjälp finns under Information; val och
                administration under Inställningar.
              </p>
              {ready && (
                <div className="np-status-actions">
                  {voice && (
                    <button type="button" onClick={() => setVoice(false)}>
                      Stoppa tal
                    </button>
                  )}
                  {draftCount > 0 && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setStatusOpen(false);
                          go('draft');
                        }}
                      >
                        Visa utkast
                      </button>
                      <button type="button" onClick={save} disabled={saveState === 'pending'}>
                        Spara hela utkastet
                      </button>
                    </>
                  )}
                  {unsentCount > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelected(Object.keys(buffers)[0]);
                        go('edit', Object.keys(buffers)[0]);
                      }}
                    >
                      Fortsätt redigera
                    </button>
                  )}
                  {message && (
                    <button type="button" onClick={() => go('conversation')}>
                      Fortsätt skriva
                    </button>
                  )}
                  {scenario === 'network' && (
                    <button type="button" onClick={() => setScenario('normal')}>
                      Försök ansluta igen
                    </button>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setStatusOpen(false);
                  go('save-attempts');
                }}
              >
                Sparförsök och kvitton
              </button>
            </div>
          </section>
        )}
      </VisualPrototypeDFrame>
      {study ? (
        <MapStudyLab
          selectedId={selected}
          onList={() => go('list')}
          onSelect={selectObject}
          savePending={saveState === 'pending'}
          onResolveSave={resolveSave}
        />
      ) : (
        <aside className="np-lab" aria-label="Prototypens provverktyg">
          <div className="np-lab-row">
            <strong>Navigation på prototyp D</strong>
            <span>Påhittat innehåll · inget sparas</span>
            <a
              href={`/?prototype=visual&variant=D&theme=${theme}`}
              target="_blank"
              rel="noreferrer"
            >
              Öppna ursprungliga D
            </a>
          </div>
          <div className="np-lab-row np-variant-choices">
            {(Object.keys(variants) as Variant[]).map((key) => (
              <button
                type="button"
                key={key}
                aria-pressed={variant === key}
                onClick={() => chooseVariant(key)}
              >
                {key} · {variants[key].name}
              </button>
            ))}
          </div>
          <p className="np-lab-description">{variants[variant].description}</p>
          <div className="np-lab-row">
            <button type="button" onClick={showFreePanels}>
              Öppna två objekt och samtalet
            </button>
            {variant === 'B' && windows.length > 0 && (
              <button type="button" onClick={() => setLayoutVersion((previous) => previous + 1)}>
                Ordna paneler
              </button>
            )}
          </div>
          <div className="np-lab-row">
            <button type="button" onClick={() => showComparisonStep(0)}>
              Jämför samma arbetsflöde
            </button>
            <button type="button" onClick={showSettingsExample}>
              Visa administration och kostnader
            </button>
            <button
              type="button"
              onClick={() => setInspector((previous) => !previous)}
              aria-expanded={inspector}
            >
              Provlägen och tillstånd
            </button>
          </div>
          {guide === 'compare' && (
            <section className="np-guide" aria-label="Guidad jämförelse">
              <p>
                <strong>Steg {guideStep + 1} av 3:</strong>{' '}
                {guideStep === 0
                  ? 'Du redigerar namnet. Lägg ändringen i utkastet när du är klar.'
                  : guideStep === 1
                    ? `Nu öppnas samtalet. ${variants[variant].description}`
                    : 'Du är tillbaka i redigeringen. Texten finns kvar i alla tre alternativ.'}
              </p>
              <div className="np-lab-row">
                <button
                  type="button"
                  disabled={guideStep === 0}
                  onClick={() => showComparisonStep(guideStep - 1)}
                >
                  Föregående steg
                </button>
                <button
                  type="button"
                  disabled={guideStep === 2}
                  onClick={() => showComparisonStep(guideStep + 1)}
                >
                  {guideStep === 0 ? 'Öppna samtalet' : 'Återgå till redigeringen'}
                </button>
                <button type="button" onClick={() => setGuide(null)}>
                  Stäng jämförelsen
                </button>
              </div>
              <p>B är godkänd. A och C finns kvar som jämförelse.</p>
            </section>
          )}
          {guide === 'settings' && (
            <section className="np-guide" aria-label="Administration och kostnader">
              <p>
                <strong>Inställningar öppnas tillfälligt ovanpå ditt arbete.</strong> Administration
                gäller vem som får använda hushållet och export/radering. Driftens kostnader gäller
                vad det kostar att köra Skyttel.
              </p>
              <div className="np-lab-row">
                <button type="button" onClick={() => go('administration')}>
                  Öppna administration
                </button>
                <button type="button" onClick={() => go('costs')}>
                  Öppna driftens kostnader
                </button>
                <button
                  type="button"
                  onClick={() => {
                    closeUtility();
                    setGuide(null);
                  }}
                >
                  Tillbaka till redigeringen
                </button>
              </div>
              <p>
                Provpersonen har båda behörigheterna. Exemplet startar simulerat tal. Panelbyten
                behåller mikrofonens tillstånd.
              </p>
            </section>
          )}
          {saveState === 'pending' && (
            <div className="np-lab-row">
              <span>Sparandet väntar på simulerat svar:</span>
              <button type="button" onClick={() => resolveSave(true)}>
                Simulera kvitto
              </button>
              <button type="button" onClick={() => resolveSave(false)}>
                Simulera sparfel
              </button>
            </div>
          )}
          {inspector && (
            <div className="np-inspector">
              <div className="np-lab-row">
                <label>
                  Provläge
                  <select
                    value={scenario}
                    onChange={(event) => resetSession(event.target.value as Scenario)}
                  >
                    {Object.entries(scenarios).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Behörighet
                  <select
                    value={role}
                    onChange={(event) => setRole(event.target.value as typeof role)}
                  >
                    <option value="member">Medlem</option>
                    <option value="administrator">Administratör</option>
                    <option value="operator">Driftansvarig och medlem</option>
                    <option value="administrator-operator">Administratör och driftansvarig</option>
                  </select>
                </label>
                <button
                  type="button"
                  onClick={() => updateParams({ theme: theme === 'dark' ? 'light' : 'dark' }, true)}
                >
                  {theme === 'dark' ? 'Ljust tema' : 'Mörkt tema'}
                </button>
              </div>
              <dl>
                <dt>Öppet verktyg</dt>
                <dd>{pageTitles[page]}</dd>
                <dt>Urval och kamera</dt>
                <dd>
                  {currentObject.name} · {camera === 'overview' ? 'överblick' : 'fokus'}
                </dd>
                <dt>Samtal</dt>
                <dd>
                  {voice ? 'Lyssnar' : 'Stoppat'} · {transcript.length} textrader · {message.length}{' '}
                  oskickade tecken
                </dd>
                <dt>Arbete</dt>
                <dd>
                  {unsentCount} oskickade redigeringar · {draftCount} ändringar i privat utkast
                </dd>
              </dl>
              <p>
                Byten bevarar innehållet i minnet. Inloggning och förlorad åtkomst tömmer
                provsessionen. Omladdning börjar om. Kartans fokus är schematiskt.
              </p>
            </div>
          )}
        </aside>
      )}
    </div>
  );
}

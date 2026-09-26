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
import { DetailStudyPanel, type DetailStudyVariant } from './DetailStudyPanel.js';
import { factText, useDetailStudy } from './detail-study-model.js';
import { IconStudyDraft, IconStudyPanel } from './IconStudyPanel.js';
import { findIconStudyIcon } from './icon-study-catalog.js';
import { useIconStudy } from './icon-study-model.js';
import {
  initialListStudyBrowseState,
  ListStudyList,
  type ListStudyVariant,
} from './ListStudyList.js';
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
import {
  NavigationPrototypeWindows,
  type PrototypeWindowAnchor,
} from './NavigationPrototypeWindows.js';
import { ProfileStudyDraft, ProfileStudyPanel } from './ProfileStudyPanel.js';
import profileExample from './profile-study-assets/provbild-musik.png';
import { useProfileStudy } from './profile-study-model.js';
import { RelationshipStudyPanel, useRelationshipStudy } from './RelationshipStudy.js';
import { TypeStudySettings } from './TypeStudySettings.js';
import { useTypeStudy } from './type-study-model.js';
import { PrototypeIcon } from './VisualPrototype.js';
import { VisualPrototypeDFrame } from './VisualPrototypeDFrame.js';
import { VisualPrototypeMap } from './VisualPrototypeMap.js';
import {
  useVoiceStudy,
  VoiceStudyConversation,
  VoiceStudyFeedback,
  VoiceStudyLab,
  type VoiceStudySaveState,
  type VoiceStudyVariant,
} from './VoiceStudy.js';
import './visual-prototype-d.css';
import './navigation-prototype.css';
import './voice-study-layout.css';
import './list-study-layout.css';
import {
  AdminGate,
  AdminStudyPage,
  type AdminVariant,
  adminPages,
  useAdminStudy,
  wideAdminPages,
} from './AdminStudy.js';
import { AdminStudyLab } from './AdminStudyLab.js';

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
type WorkWindow = { id: string; page: NavPage; objectId?: string; anchor?: PrototypeWindowAnchor };
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
  locked = false,
}: {
  page: NavPage;
  children: ReactNode;
  onClose: () => void;
  onBack?: () => void;
  extra?: ReactNode;
  className?: string;
  style?: CSSProperties;
  locked?: boolean;
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
          <button
            type="button"
            disabled={locked}
            onClick={onBack}
            aria-label="Tillbaka till föregående verktyg"
          >
            <PrototypeIcon name="back" />
          </button>
        )}
        <h2 ref={title} tabIndex={-1} id={`np-title-${page}`}>
          {pageTitles[page]}
        </h2>
        <button
          type="button"
          disabled={locked}
          onClick={onClose}
          aria-label={`Stäng ${pageTitles[page]}`}
        >
          <PrototypeIcon name="close" />
        </button>
      </header>
      <div className="np-panel-body">{children}</div>
    </section>
  );
}

export function NavigationPrototype() {
  const study = useMapStudy();
  const [params, setParams] = useSearchParams();
  const adminMode = params.get('prototype') === 'administration';
  const adminModel = useAdminStudy();
  const adminVariant: AdminVariant =
    params.get('variant') === 'B' ? 'B' : params.get('variant') === 'C' ? 'C' : 'A';
  const [welcome, setWelcome] = useState(false);
  const iconsMode = params.get('prototype') === 'icons' || adminMode;
  const imagesMode = params.get('prototype') === 'images' || iconsMode;
  const objectsMode = params.get('prototype') === 'objects' || imagesMode;
  const typesMode = params.get('prototype') === 'types' || objectsMode;
  const activeUtilityPages = typesMode ? [...utilityPages, 'types' as const] : utilityPages;
  const detailsMode = params.get('prototype') === 'details' || typesMode;
  const listsMode = params.get('prototype') === 'lists' || detailsMode;
  const detailVariant: DetailStudyVariant = typesMode
    ? 'B'
    : params.get('variant') === 'B'
      ? 'B'
      : params.get('variant') === 'C'
        ? 'C'
        : 'A';
  const voiceMode = params.get('prototype') === 'voice' || listsMode;
  const listVariant: ListStudyVariant = detailsMode
    ? 'B'
    : params.get('variant') === 'A'
      ? 'A'
      : params.get('variant') === 'C'
        ? 'C'
        : 'B';
  const typeModel = useTypeStudy(study?.objects ?? [], study?.relationships ?? []);
  const relationshipModel = useRelationshipStudy(study?.relationships ?? [], typeModel);
  const detailModel = useDetailStudy(
    study?.objects ?? [],
    detailsMode && params.get('changes') === 'example',
    typesMode ? typeModel : undefined,
  );
  const profileModel = useProfileStudy();
  const iconModel = useIconStudy();
  const profileBusy = imagesMode && profileModel.loadingIds.length > 0;
  const projectedRelationships = typesMode
    ? relationshipModel.relationships
    : (study?.relationships ?? []);
  const projectedObjects = (objectsMode ? detailModel.objects : (study?.objects ?? [])).map(
    (object) =>
      imagesMode
        ? {
            ...object,
            profileImageUrl: profileModel.current(object.id)?.url,
            iconId: iconsMode ? iconModel.current(object.id) : undefined,
            change:
              object.change ??
              (Object.hasOwn(profileModel.staged, object.id) ||
              (iconsMode && Object.hasOwn(iconModel.staged, object.id))
                ? ('changed' as const)
                : undefined),
          }
        : object,
  );
  const navObjects = study ? projectedObjects : defaultNavObjects;
  const objectTypeNames = Object.fromEntries(
    projectedObjects.map((object) => [
      object.id,
      (objectsMode
        ? detailModel.typeDefinition(object.id)?.name
        : typeModel.get(typeModel.objectTypeId(object))?.name) ?? object.type,
    ]),
  );
  const [browse, setBrowse] = useState(initialListStudyBrowseState);
  const [typeSettingsId, setTypeSettingsId] = useState<string | undefined>();
  const listMemory = useRef({ scrollTop: 0, focusId: null as string | null });
  const feedbackVariant: VoiceStudyVariant = listsMode
    ? 'D'
    : params.get('variant') === 'A'
      ? 'A'
      : params.get('variant') === 'B'
        ? 'B'
        : params.get('variant') === 'C'
          ? 'C'
          : 'D';
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
    utilityCandidate && activeUtilityPages.includes(utilityCandidate) ? utilityCandidate : null;
  const [utilityTrail, setUtilityTrail] = useState<NavPage[]>([]);
  const previousAdminPage = useRef(utility);
  const utilityFocusPending = useRef(false);
  useLayoutEffect(() => {
    if (utility || !utilityFocusPending.current) return;
    utilityFocusPending.current = false;
    const root = rootRef.current;
    const target =
      root?.querySelector<HTMLElement>('.np-window[data-active="true"]:not([hidden]) h2') ??
      root?.querySelector<HTMLElement>('[data-tool="settings"]');
    target?.focus({ preventScroll: true });
  });
  useEffect(() => {
    if (!adminMode || previousAdminPage.current === utility) return;
    if (previousAdminPage.current === 'members' && adminModel.values.code) {
      adminModel.value('code', '');
      adminModel.step('members', 0);
    }
    if (
      previousAdminPage.current === 'export' &&
      (adminModel.exportReady || (adminModel.operation?.page === 'export' && adminModel.busy))
    ) {
      adminModel.cancelExport();
    }
    previousAdminPage.current = utility;
  });
  const [statusOpen, setStatusOpen] = useState(false);
  const [guide, setGuide] = useState<'compare' | 'settings' | null>(null);
  const [guideStep, setGuideStep] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [selection, setSelection] = useState({
    primaryId: 'subscription',
    ids: ['subscription'],
  });
  const selected = selection.primaryId;
  function setSelected(id: string) {
    setSelection({ primaryId: id, ids: [id] });
  }
  const [camera, setCamera] = useState<'overview' | 'focus'>('overview');
  const [query, setQuery] = useState('');
  const [buffers, setBuffers] = useState<Record<string, string>>({});
  const [staged, setStaged] = useState<Record<string, string>>({});
  const [savedNames, setSavedNames] = useState<Record<string, string>>({});
  const displayedNames = detailsMode ? detailModel.names.saved : savedNames;
  const displayedStaged = detailsMode ? detailModel.names.staged : staged;
  const [message, setMessage] = useState('');
  const [transcript, setTranscript] = useState<string[]>([
    'Skyttel: Berätta vad du vill lägga till eller hitta.',
  ]);
  const [legacyVoice, setVoice] = useState(false);
  const initialWindow: WorkWindow | null =
    page !== 'map' && !activeUtilityPages.includes(page)
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
  const [compactWindows, setCompactWindows] = useState(
    () => window.matchMedia('(max-width: 1000px)').matches,
  );
  const [layoutVersion, setLayoutVersion] = useState(0);
  const [tabs, setTabs] = useState<NavPage[]>([]);
  const [trail, setTrail] = useState<NavPage[]>([]);
  const [saveState, setSaveState] = useState<VoiceStudySaveState>('idle');
  const [identitySaveBlocked, setIdentitySaveBlocked] = useState(false);
  const [receipt, setReceipt] = useState<string[]>([]);
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const [popupStyle, setPopupStyle] = useState<CSSProperties>({});
  const [inspector, setInspector] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<HTMLElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const ready = !['access', 'signin', 'setup', 'loading', 'missing'].includes(scenario);
  const workVisible = ready && !utility && !statusOpen && windows.length > 0;
  const visibleWindowId = windows.some((item) => item.id === activeWindow)
    ? activeWindow
    : windows[0]?.id;
  const selectedDetailsVisible =
    workVisible &&
    selection.ids.length > 0 &&
    windows.some(
      (item) => item.objectId === selected && (!compactWindows || item.id === visibleWindowId),
    );
  const hiddenProfileError = imagesMode
    ? Object.entries(profileModel.errors).find(
        ([id]) =>
          !workVisible ||
          !windows.some(
            (item) =>
              item.objectId === id &&
              item.page === 'edit' &&
              (!compactWindows || item.id === visibleWindowId),
          ),
      )
    : undefined;
  const administrator = role === 'administrator' || role === 'administrator-operator';
  const operator = role === 'operator' || role === 'administrator-operator';
  const baseObject = navObjects.find((object) => object.id === selected) ?? navObjects[0];
  const currentObject = {
    ...baseObject,
    name: displayedStaged[selected] ?? displayedNames[selected] ?? baseObject.name,
  };
  const hasStudyProposals = study?.proposals ?? false;
  const draftCount = detailsMode
    ? new Set([
        ...Object.keys(detailModel.staged),
        ...(imagesMode ? Object.keys(profileModel.staged) : []),
        ...(iconsMode ? Object.keys(iconModel.staged) : []),
      ]).size +
      (hasStudyProposals ? 3 : 0) +
      (typesMode ? typeModel.draftCount + relationshipModel.draftCount : 0)
    : Object.keys(staged).length + (hasStudyProposals ? 4 : 0);
  const voiceStudy = useVoiceStudy({
    enabled: voiceMode && ready,
    currentPrice: detailsMode
      ? factText(detailModel.current('subscription').facts.price)
      : undefined,
    draftCount,
    saveState,
    saveBlocked: profileBusy,
    onPropose: () => {
      if (detailsMode) detailModel.proposeVoicePrice();
      study?.setProposals(true);
      setSaveState('idle');
    },
    onSave: beginSave,
    onResolveSave: resolveVoiceSave,
    onReviewConflict: () => setSaveState('idle'),
  });
  const voice = voiceMode ? voiceStudy.micActive : legacyVoice;
  const unsentIds = detailsMode
    ? detailModel.unsentIds
    : Object.keys(buffers).filter(
        (id) =>
          buffers[id] !==
          (staged[id] ?? savedNames[id] ?? navObjects.find((object) => object.id === id)?.name),
      );
  const unsentCount =
    unsentIds.length + (typesMode ? typeModel.unsentIds.length + relationshipModel.unsentCount : 0);
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
  function openVoicePage(next: 'conversation' | 'draft' | 'save-attempts') {
    go(next);
    requestAnimationFrame(() => {
      rootRef.current
        ?.querySelector<HTMLElement>(`.np-window[data-window-id="${next}"]:not([hidden]) h2`)
        ?.focus({ preventScroll: true });
    });
  }
  function returnToList() {
    go('list');
    requestAnimationFrame(() => {
      const list = rootRef.current?.querySelector<HTMLElement>('[data-window-id="list"]');
      const id = listMemory.current.focusId;
      const target = id
        ? list?.querySelector<HTMLElement>(`[data-list-object="${CSS.escape(id)}"]`)
        : null;
      (target ?? list?.querySelector<HTMLElement>('h2'))?.focus({ preventScroll: true });
    });
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
    const marker =
      study && objectPage
        ? rootRef.current?.querySelector<HTMLElement>(
            `.ms-marker[data-object-id="${CSS.escape(objectId)}"]`,
          )
        : null;
    const markerBounds = marker?.getBoundingClientRect();
    const objectAnchor =
      markerBounds &&
      markerBounds.width > 0 &&
      markerBounds.height > 0 &&
      markerBounds.right > 0 &&
      markerBounds.left < window.innerWidth &&
      markerBounds.bottom > 0 &&
      markerBounds.top < window.innerHeight
        ? {
            left: markerBounds.left,
            right: markerBounds.right,
            top: markerBounds.top,
            bottom: markerBounds.bottom,
          }
        : undefined;
    setWindows((previous) => {
      const existing = previous.find((item) => item.id === id);
      if (existing) {
        // Att återöppna objektet ska inte dölja dess pågående redigering.
        if (next === 'detail' && existing.page === 'edit') return previous;
        return previous.map((item) => (item.id === id ? { ...item, page: next } : item));
      }
      return [
        ...previous,
        { id, page: next, objectId: objectPage ? objectId : undefined, anchor: objectAnchor },
      ];
    });
    setActiveWindow(id);
  }
  function closeWindow(id: string) {
    const remaining = windows.filter((item) => item.id !== id);
    setWindows(remaining);
    if (activeWindow === id) setActiveWindow(remaining.at(-1)?.id ?? null);
    if (!remaining.length) restoreFocus();
  }
  const adminContentLocked =
    adminMode &&
    adminModel.busy &&
    ['import', 'erasure'].includes(adminModel.operation?.page ?? '') &&
    (adminModel.steps[adminModel.operation?.page ?? ''] ?? 0) === 1;
  function go(next: NavPage, objectId = selected) {
    if (adminContentLocked && next !== adminModel.operation?.page) return;
    returnFocus.current = document.activeElement as HTMLElement;
    if (next !== 'detail' && next !== 'edit') study?.setNavigationOpen(false);
    setExpanded(false);
    setAnchor(null);
    setStatusOpen(false);
    if (activeUtilityPages.includes(next)) {
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
    if (adminContentLocked) return;
    utilityFocusPending.current = true;
    setUtilityTrail([]);
    updateParams({ panel: '' });
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
    if (adminContentLocked) return;
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
    if (study) {
      setSelection((previous) => ({
        primaryId: id,
        ids: previous.ids.includes(id) ? previous.ids : [...previous.ids, id],
      }));
    } else setSelected(id);
    go('detail', id);
  }
  function markObject(id: string, additive = false) {
    setSelection((previous) => {
      const included = previous.ids.includes(id);
      if (!additive) {
        return { primaryId: id, ids: included ? previous.ids : [id] };
      }
      const ids = included ? previous.ids.filter((value) => value !== id) : [...previous.ids, id];
      return {
        primaryId: included ? (ids.at(-1) ?? id) : id,
        ids,
      };
    });
  }
  function clearSelection() {
    setSelection((previous) => ({ ...previous, ids: [] }));
    study?.setSelectedEdge(null);
    study?.setFocusId(null);
  }
  function revealStudyObject(id: string) {
    setSelected(id);
    study?.setFocusId(null);
    if (!study || study.noGraphics) return;
    const neighbors = projectedRelationships
      .filter((edge) => edge.from === id || edge.to === id)
      .flatMap((edge) => [edge.from, edge.to]);
    study.cameraRef.current?.frame([...new Set([id, ...neighbors])]);
    closeWindow('list');
    requestAnimationFrame(() => {
      rootRef.current
        ?.querySelector<HTMLElement>(`.ms-marker[data-object-id="${CSS.escape(id)}"]`)
        ?.focus({ preventScroll: true });
    });
  }
  function focusStudySelection() {
    if (!study || !selection.ids.length) return;
    const selectedIds = new Set(selection.ids);
    const visibleIds = new Set(selectedIds);
    for (const edge of projectedRelationships) {
      if (selectedIds.has(edge.from)) visibleIds.add(edge.to);
      if (selectedIds.has(edge.to)) visibleIds.add(edge.from);
    }
    study.cameraRef.current?.focusSelection(
      projectedObjects.filter((object) => visibleIds.has(object.id)).map((object) => object.id),
    );
  }
  function resetSession(next: Scenario) {
    if (adminMode && ['access', 'signin', 'setup'].includes(next)) adminModel.clearSession();
    setScenario(next);
    setAnchor(null);
    if (['access', 'signin', 'setup'].includes(next)) {
      if (voiceMode) voiceStudy.resetSession();
      setReceipt([]);
      setVoice(false);
      setWindows([]);
      setActiveWindow(null);
      setMessage('');
      setBuffers({});
      if (detailsMode) detailModel.reset();
      if (imagesMode) profileModel.reset();
      if (iconsMode) iconModel.reset();
      if (typesMode) {
        typeModel.reset();
        relationshipModel.reset();
      }
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
    if (adminContentLocked) return;
    if (voiceMode) {
      if (!voiceStudy.sessionActive) openVoicePage('conversation');
      voiceStudy.toggleMic();
      return;
    }
    if (scenario === 'no-voice' || scenario === 'network') {
      go('conversation');
      return;
    }
    setVoice((previous) => !previous);
  }
  function stage(objectId = selected) {
    if (saveState === 'pending' || saveState === 'unknown' || saveState === 'conflict') return;
    const value =
      buffers[objectId] ??
      staged[objectId] ??
      savedNames[objectId] ??
      navObjects.find((item) => item.id === objectId)?.name ??
      '';
    setStaged((previous) => ({ ...previous, [objectId]: value }));
    if (voiceMode) voiceStudy.noteManualChange();
    setSaveState('idle');
    setBuffers((previous) => {
      const next = { ...previous };
      delete next[objectId];
      return next;
    });
    go('draft');
  }
  function save() {
    if (voiceMode) voiceStudy.saveDraft();
    else beginSave();
  }
  function beginSave() {
    if (adminContentLocked) return;
    if (profileBusy) return;
    if (objectsMode && detailModel.unresolvedIds.length > 0) {
      setIdentitySaveBlocked(true);
      return;
    }
    setIdentitySaveBlocked(false);
    if (draftCount > 0 && !['pending', 'unknown', 'conflict'].includes(saveState))
      setSaveState(scenario === 'network' ? 'failed' : 'pending');
  }
  function resolveVoiceSave(outcome: 'saved' | 'failed' | 'unknown' | 'conflict') {
    if (!['pending', 'unknown', 'conflict'].includes(saveState)) return;
    if (outcome === 'saved') {
      setReceipt([
        ...(detailsMode ? detailModel.receiptLines() : []),
        ...(imagesMode ? profileModel.receiptLines(projectedObjects) : []),
        ...(iconsMode
          ? iconModel.receiptLines(projectedObjects, (id) => findIconStudyIcon(id)?.label ?? id)
          : []),
        ...(typesMode
          ? [
              ...typeModel.receiptLines(),
              ...relationshipModel.receiptLines(
                projectedObjects.map((object) => ({
                  ...object,
                  name: detailModel.current(object.id).name,
                })),
              ),
            ]
          : []),
        ...Object.entries(staged).map(
          ([id, name]) =>
            `${navObjects.find((item) => item.id === id)?.name ?? id}: namn ändrat till ${name}.`,
        ),
        ...(hasStudyProposals
          ? [
              ...(detailsMode ? [] : ['Familjeabonnemang: 189 → 199 kr per månad.']),
              'Betalning: Gemensamt bankkonto → Kort ·· 4242.',
              'Ny tjänst: Filmlyktan.',
              'Nytt samband: Lo använder Filmlyktan.',
            ]
          : []),
      ]);
      setSavedNames((previous) => ({ ...previous, ...staged }));
      setStaged({});
      if (detailsMode) detailModel.commit();
      if (imagesMode) profileModel.commit();
      if (iconsMode) iconModel.commit();
      if (typesMode) {
        typeModel.commit();
        relationshipModel.commit();
      }
      study?.commitProposals();
    }
    setSaveState(outcome);
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

  useEffect(() => {
    const media = window.matchMedia('(max-width: 1000px)');
    const update = () => setCompactWindows(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const lab = root.querySelector<HTMLElement>('.ad-switcher, .np-lab');
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
        '.vp-d-toolbox, .vp-d-status, .np-panel, .np-lab, .np-map-controls, .voice-map-key, .ad-lab, .ad-lab-panel, .ad-welcome',
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
    if (adminMode && adminPages.includes(contentPage))
      return (
        <AdminStudyPage
          page={contentPage}
          model={adminModel}
          variant={adminVariant}
          administrator={administrator}
          operator={operator}
          go={go}
          logout={() => resetSession('signin')}
          onEnter={() => {
            setRole('member');
            setScenario('normal');
            setWelcome(true);
            closeUtility();
          }}
          mapSettings={
            study ? (
              <div className="ad-section">
                <button
                  type="button"
                  aria-pressed={study.stars}
                  onClick={() => study.setStars(!study.stars)}
                >
                  {study.stars ? 'Dölj stjärnhimmel' : 'Visa stjärnhimmel'}
                </button>
                <p className="ad-muted">
                  Systemets minskade rörelse stänger av stjärnhimlen. Temavalet finns i
                  verktygslådan.
                </p>
              </div>
            ) : undefined
          }
        />
      );
    const blocked = ['pending', 'unknown', 'conflict'].includes(saveState) || profileBusy;
    const noteChange = () => {
      voiceStudy.noteManualChange();
      setSaveState('idle');
    };
    const stageDetails = (id: string) => {
      if (blocked) return;
      let valid = false;
      if (id === 'new-object') {
        const created = detailModel.stageCreation();
        if (created) {
          valid = true;
          noteChange();
          setWindows((previous) => previous.filter((entry) => entry.page !== 'new-object'));
          selectObject(created);
        }
      } else if (detailModel.stage(id)) {
        valid = true;
        noteChange();
      }
      if (!valid)
        requestAnimationFrame(() => {
          const windowId = id === 'new-object' ? id : `object-${id}`;
          rootRef.current
            ?.querySelector<HTMLElement>(`[data-window-id="${CSS.escape(windowId)}"] .ds-errors`)
            ?.focus();
        });
    };
    const profile = (id: string, creation = false) =>
      imagesMode ? (
        <>
          <ProfileStudyPanel
            objectId={id}
            name={detailModel.current(id).name || 'det nya objektet'}
            model={profileModel}
            fallback={
              iconsMode
                ? {
                    iconId: iconModel.current(id),
                    typeName: detailModel.typeDefinition(id)?.name ?? '',
                  }
                : undefined
            }
            creation={creation}
            unsent={detailModel.unsentIds.includes(id)}
            editing={creation || contentPage === 'edit'}
            blocked={blocked}
            onStageText={() => stageDetails(id)}
            onEdit={() => go('edit', id)}
            onChange={noteChange}
          />
          {iconsMode && (
            <IconStudyPanel
              objectId={id}
              name={detailModel.current(id).name || 'det nya objektet'}
              model={iconModel}
              creation={creation}
              unsent={detailModel.unsentIds.includes(id)}
              editing={creation || contentPage === 'edit'}
              hasImage={Boolean(profileModel.current(id))}
              blocked={blocked}
              onStageText={() => stageDetails(id)}
              onEdit={() => go('edit', id)}
              onChange={noteChange}
            />
          )}
        </>
      ) : undefined;
    if (objectsMode && contentPage === 'new-object')
      return (
        <DetailStudyPanel
          variant="B"
          creation
          types={typeModel}
          object={detailModel.creationObject}
          model={detailModel}
          editing
          blocked={blocked}
          profile={profile('new-object', true)}
          onEdit={() => {}}
          onRead={() => {}}
          onStage={() => stageDetails('new-object')}
          onTypes={() => {
            setTypeSettingsId(detailModel.buffer('new-object').typeId || undefined);
            go('types');
          }}
          onList={returnToList}
          onMap={() => closeWindow('new-object')}
          onRelated={selectObject}
          relationships={[]}
          objects={projectedObjects}
        />
      );
    if (typesMode && contentPage === 'types')
      return (
        <TypeStudySettings
          key={typeSettingsId ?? 'catalog'}
          initialTypeId={typeSettingsId}
          model={typeModel}
          blocked={blocked}
          onStage={noteChange}
          onOpenObject={() => selectObject('subscription')}
        />
      );
    if (typesMode && contentPage === 'new-relationship' && study)
      return (
        <RelationshipStudyPanel
          model={relationshipModel}
          types={typeModel}
          objects={projectedObjects.map((object) => ({
            ...object,
            name: detailModel.current(object.id).name,
            type: objectTypeNames[object.id],
          }))}
          blocked={blocked}
          onStage={noteChange}
          onTypes={() => go('types')}
          onOpenObject={selectObject}
        />
      );
    if (detailsMode && study && (contentPage === 'detail' || contentPage === 'edit')) {
      const subject = projectedObjects.find((object) => object.id === objectId);
      if (!subject) return <p>Objektet ingår inte i det valda provhushållet.</p>;
      return (
        <DetailStudyPanel
          variant={detailVariant}
          object={subject}
          model={detailModel}
          profile={profile(objectId)}
          types={objectsMode ? typeModel : undefined}
          definition={typesMode ? typeModel.get(typeModel.objectTypeId(subject)) : undefined}
          onTypes={
            typesMode
              ? () => {
                  setTypeSettingsId(
                    objectsMode
                      ? detailModel.buffer(objectId).typeId
                      : typeModel.objectTypeId(subject),
                  );
                  go('types');
                }
              : undefined
          }
          onRelationship={
            typesMode
              ? (id) => {
                  relationshipModel.select(id);
                  go('new-relationship');
                }
              : undefined
          }
          editing={contentPage === 'edit'}
          blocked={blocked}
          onEdit={() => go('edit', objectId)}
          onRead={() => {
            setWindows((previous) =>
              previous.map((entry) =>
                entry.objectId === objectId ? { ...entry, page: 'detail' } : entry,
              ),
            );
          }}
          onStage={() => stageDetails(objectId)}
          onList={returnToList}
          onMap={() => revealStudyObject(objectId)}
          onRelated={selectObject}
          relationships={projectedRelationships}
          reverseLabels={
            typesMode
              ? Object.fromEntries(
                  projectedRelationships.map((edge) => {
                    const value = relationshipModel.current(edge.id);
                    const label = typeModel.get(value.typeId)?.reverseLabel;
                    return [
                      edge.id,
                      label ? `${label}${value.knowledge === 'uncertain' ? ' (osäkert)' : ''}` : '',
                    ];
                  }),
                )
              : undefined
          }
          objects={projectedObjects}
        />
      );
    }
    if (listsMode && study && contentPage === 'list')
      return (
        <>
          {study.listKind === 'objects' ? (
            <>
              <nav className="ls-content-kind" aria-label="Listans innehåll">
                <span>Objekt</span>
                <button type="button" onClick={() => study.setListKind('relationships')}>
                  Visa samband som lista
                </button>
              </nav>
              <ListStudyList
                variant={listVariant}
                objects={
                  detailsMode
                    ? projectedObjects.map((object) => ({
                        ...object,
                        description: detailModel.descriptions[object.id] ?? object.description,
                        type: typesMode ? objectTypeNames[object.id] : object.type,
                        change:
                          object.id === 'subscription' && !imagesMode ? undefined : object.change,
                      }))
                    : projectedObjects
                }
                relationships={projectedRelationships}
                names={displayedNames}
                staged={displayedStaged}
                stagedLabel={detailsMode ? '✎ Ändringsförslag' : undefined}
                selectedIds={selection.ids}
                state={browse}
                onState={setBrowse}
                memory={listMemory.current}
                onMark={(id) => {
                  study.setSelectedEdge(null);
                  study.setFocusId(null);
                  markObject(id, true);
                }}
                onClearSelection={clearSelection}
                onReveal={(id) => {
                  study.setSelectedEdge(null);
                  revealStudyObject(id);
                }}
                onDetails={(id) => {
                  study.setSelectedEdge(null);
                  selectObject(id);
                }}
                noGraphics={study.noGraphics}
              />
            </>
          ) : (
            <MapStudyPages
              page="list"
              selectedId={selected}
              selectedIds={selection.ids}
              onToggleSelection={(id) => markObject(id, true)}
              onClearSelection={clearSelection}
              onReveal={revealStudyObject}
              onOpenDetails={selectObject}
              onEdit={() => go('edit', objectId)}
              names={displayedNames}
              staged={displayedStaged}
              objectOverrides={typesMode ? projectedObjects : undefined}
              relationshipOverrides={typesMode ? projectedRelationships : undefined}
            />
          )}
        </>
      );
    if (voiceMode && contentPage === 'conversation')
      return <VoiceStudyConversation model={voiceStudy} onDraft={() => openVoicePage('draft')} />;
    if (voiceMode && contentPage === 'draft')
      return (
        <div className="np-stack">
          <p>
            Ditt privata utkast · {draftCount} {draftCount === 1 ? 'ändring' : 'ändringar'}.
            Hushållets karta ändras när du sparar.
          </p>
          {hasStudyProposals && (
            <ul>
              {!detailsMode && <li>Familjeabonnemang: 189 → 199 kr per månad.</li>}
              <li>Betalning: Gemensamt bankkonto → Kort ·· 4242.</li>
              <li>Ny tjänst: Filmlyktan.</li>
              <li>Nytt samband: Lo använder Filmlyktan.</li>
            </ul>
          )}
          {detailsMode && detailModel.receiptLines().length > 0 && (
            <ul>
              {detailModel.receiptLines().map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          )}
          {imagesMode && <ProfileStudyDraft model={profileModel} objects={projectedObjects} />}
          {iconsMode && <IconStudyDraft model={iconModel} objects={projectedObjects} />}
          {typesMode && (
            <ul>
              {[
                ...typeModel.receiptLines(),
                ...relationshipModel.receiptLines(
                  projectedObjects.map((object) => ({
                    ...object,
                    name: detailModel.current(object.id).name,
                  })),
                ),
              ].map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          )}
          {Object.entries(staged).map(([id, name]) => (
            <p key={id}>
              {navObjects.find((item) => item.id === id)?.name}: namn ändras till{' '}
              <strong>{name}</strong>.
            </p>
          ))}
          {unsentCount > 0 && (
            <p>
              {unsentCount} oskickade redigeringar finns kvar i sina fönster och ingår ännu inte i
              utkastet.
            </p>
          )}
          <button
            type="button"
            className="np-primary"
            disabled={!voiceStudy.canSave}
            onClick={save}
          >
            {saveState === 'pending' ? 'Sparar hela utkastet…' : 'Spara hela utkastet'}
          </button>
          {!voiceStudy.canSave && draftCount > 0 && saveState !== 'pending' && (
            <p>Öppna samtalet för att hantera frågan eller kontrollera sparresultatet.</p>
          )}
          <button type="button" onClick={() => go('conversation')}>
            Öppna samtalet
          </button>
          <button type="button" onClick={() => go('save-attempts')}>
            Sparförsök och kvitton
          </button>
        </div>
      );
    if (voiceMode && contentPage === 'save-attempts')
      return (
        <div className="np-stack">
          <h3>{saveState === 'unknown' ? 'Sparresultatet är oklart' : 'Senaste sparförsök'}</h3>
          <p>
            {saveState === 'unknown'
              ? 'Kontrollera samma försök innan du ändrar något eller försöker spara igen.'
              : saveState === 'pending'
                ? 'Sparandet pågår. Ett kvitto visas först när resultatet har bekräftats.'
                : saveState === 'conflict'
                  ? 'Hushållets uppgifter har ändrats. Hantera konflikten före ett nytt sparbesked.'
                  : saveState === 'failed'
                    ? 'Försöket sparade inget. Ditt privata utkast finns kvar.'
                    : receipt.length
                      ? 'Verifierat resultat i provet. Kvittot gäller följande ändringar.'
                      : 'Inget sparande är bekräftat i den här provomgången.'}
          </p>
          {receipt.length > 0 && (
            <section aria-label="Senaste simulerade kvitto">
              <h4>
                {saveState === 'saved' ? 'Senaste kvitto' : 'Kvitto från föregående sparförsök'} ·
                simulerat
              </h4>
              <ul>
                {receipt.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </section>
          )}
          <button type="button" onClick={() => go('conversation')}>
            Öppna samtalet
          </button>
        </div>
      );
    if (study && (contentPage === 'list' || contentPage === 'detail')) {
      return (
        <>
          {listsMode && (
            <button type="button" className="ls-return" onClick={returnToList}>
              ← Tillbaka till listan
            </button>
          )}
          <MapStudyPages
            page={contentPage}
            selectedId={objectId}
            selectedIds={selection.ids}
            onToggleSelection={(id) => markObject(id, true)}
            onClearSelection={clearSelection}
            onReveal={revealStudyObject}
            onOpenDetails={selectObject}
            onEdit={() => go('edit', objectId)}
            names={savedNames}
            staged={staged}
          />
        </>
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
        mapSettings={
          study ? (
            <>
              {typesMode && (
                <section className="np-stack">
                  <h3>Hushållets typer</h3>
                  <p>
                    Alla medlemmar kan ändra objekttyper, sambandstyper, avsnitt och egenskaper.
                  </p>
                  <button type="button" onClick={() => go('types')}>
                    Objekt- och sambandstyper
                  </button>
                </section>
              )}
              <section className="np-stack" aria-labelledby="mp-map-settings-title">
                <h3 id="mp-map-settings-title">Rymdkartan</h3>
                <button
                  type="button"
                  aria-pressed={study.stars}
                  onClick={() => study.setStars(!study.stars)}
                >
                  <PrototypeIcon name="stars" />
                  {study.stars ? 'Dölj stjärnhimmel' : 'Visa stjärnhimmel'}
                </button>
                <p className="np-muted">Systemets minskade rörelse stänger av stjärnhimlen.</p>
              </section>
            </>
          ) : undefined
        }
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
        saving={['pending', 'unknown', 'conflict'].includes(saveState)}
        empty={scenario === 'empty'}
        administrator={administrator}
        operator={operator}
        logout={() => resetSession('signin')}
      />
    );
  }

  let status = voiceMode ? voiceStudy.statusText : 'Hushållets gemensamma karta';
  if (voice && !voiceMode) status = 'Lyssnar · talet är simulerat';
  if (draftCount)
    status += ` · Privat utkast: ${draftCount} ändring${draftCount === 1 ? '' : 'ar'}`;
  if (unsentCount) status += ` · ${unsentCount} oskickad redigering`;
  if (message) status += ' · Oskickad text';
  if (saveState === 'pending') status += ' · Sparar hela utkastet… väntar på resultat';
  if (saveState === 'saved') status += ' · Senaste utkastet sparat (simulerat kvitto)';
  if (saveState === 'failed') status += ' · Kunde inte spara · ditt privata utkast finns kvar';
  if (saveState === 'unknown') status += ' · Sparresultatet är oklart · kontrollera samma försök';
  if (saveState === 'conflict') status += ' · Konflikt · inget sparat från det här försöket';
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
    disabled = false,
  ) {
    return (
      <button
        type="button"
        className="vp-d-action np-tool"
        data-tool={key}
        aria-label={label}
        title={label}
        aria-expanded={active}
        disabled={disabled}
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
      className={`vp-root vp-variant-D np-root${study ? ' map-study' : ''}${voiceMode ? ' voice-study-host' : ''}${listsMode ? ' list-study-host' : ''}${adminMode ? ' ad-host' : ''}`}
      data-list-variant={listsMode ? listVariant : undefined}
      data-feedback-variant={voiceMode ? feedbackVariant : undefined}
      data-theme={theme}
      data-variant={variant}
      data-expanded={expanded}
      data-navigation-open={study?.navigationOpen ?? false}
      data-open-work={workVisible}
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
        context={
          ready ? (
            adminMode ? (
              <>
                {adminModel.values.household}
                <span>Gemensam karta</span>
              </>
            ) : undefined
          ) : (
            <>Skyttel</>
          )
        }
        actions={
          ready && (
            <>
              <button
                type="button"
                className={`vp-d-action vp-d-talk${voice ? ' vp-d-talk-active' : ''}`}
                aria-label={voiceMode ? voiceStudy.micLabel : voice ? 'Stoppa tal' : 'Starta tal'}
                title={voiceMode ? voiceStudy.micLabel : voice ? 'Stoppa tal' : 'Starta tal'}
                aria-pressed={voice}
                onClick={toggleVoice}
              >
                {voice && !voiceMode ? (
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
                <span className="vp-d-label">
                  {voiceMode ? voiceStudy.micLabel : voice ? 'Stoppa tal' : 'Prata med Skyttel'}
                </span>
              </button>
              {toolbarButton(
                'text',
                'Samtal och text',
                () => go('conversation'),
                'conversation',
                page === 'conversation' || showConversation,
              )}
              {toolbarButton(
                study ? 'search' : 'list',
                study ? 'Sök i kartan' : 'Objekt och samband',
                () => go('list'),
                'list',
                page === 'list' ||
                  (variant === 'B' && windows.some((item) => item.page === 'list')),
              )}
              {study && (
                <>
                  {toolbarButton(
                    'details',
                    selection.ids.length
                      ? `Visa detaljer för ${currentObject.name}`
                      : 'Markera ett objekt för att visa detaljer',
                    () => selectObject(selected),
                    'details',
                    selectedDetailsVisible,
                    !selection.ids.length,
                  )}
                  <button
                    type="button"
                    className="vp-d-action np-tool"
                    data-tool="navigate"
                    aria-label="Navigera"
                    title="Navigera"
                    aria-controls="mp-navigation"
                    aria-expanded={study.navigationOpen}
                    onClick={() => {
                      setExpanded(false);
                      setStatusOpen(false);
                      if (!study.navigationOpen && utility) {
                        setUtilityTrail([]);
                        updateParams({ panel: '' });
                      }
                      study.setNavigationOpen(!study.navigationOpen);
                    }}
                  >
                    <PrototypeIcon name="compass" />
                    <span className="vp-d-label">Navigera</span>
                  </button>
                  <button
                    type="button"
                    className="vp-d-action np-tool"
                    data-tool="focus-selection"
                    aria-label="Fokusera markering"
                    title="Fokusera markering och direkt kopplade objekt"
                    disabled={study.noGraphics || !selection.ids.length}
                    onClick={focusStudySelection}
                  >
                    <PrototypeIcon name="focus-selection" />
                    <span className="vp-d-label">Fokusera markering</span>
                  </button>
                  <button
                    type="button"
                    className="vp-d-action np-tool"
                    data-tool="overview"
                    aria-label={
                      study.canReturnFromOverview ? 'Återgå till föregående vy' : 'Visa hela kartan'
                    }
                    title={
                      study.canReturnFromOverview ? 'Återgå till föregående vy' : 'Visa hela kartan'
                    }
                    disabled={study.noGraphics}
                    onClick={() => study.cameraRef.current?.toggleOverview()}
                  >
                    <PrototypeIcon name={study.canReturnFromOverview ? 'restore-view' : 'frame'} />
                    <span className="vp-d-label">
                      {study.canReturnFromOverview
                        ? 'Återgå till föregående vy'
                        : 'Visa hela kartan'}
                    </span>
                  </button>
                </>
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
          voiceMode && ready ? (
            <>
              <VoiceStudyFeedback
                model={voiceStudy}
                variant={feedbackVariant}
                onConversation={() => openVoicePage('conversation')}
                onDraft={() => openVoicePage(saveState === 'saved' ? 'save-attempts' : 'draft')}
                onSave={beginSave}
              />
              {profileBusy && (
                <p className="vs-unsent" role="status">
                  Förbereder profilbilden. Vänta innan du sparar.
                </p>
              )}
              {hiddenProfileError && (
                <div className="os-save-error" role="alert">
                  <p>
                    {detailModel.current(hiddenProfileError[0]).name}: {hiddenProfileError[1]}
                  </p>
                  <button type="button" onClick={() => go('edit', hiddenProfileError[0])}>
                    Visa bildfelet
                  </button>
                </div>
              )}
              {objectsMode && identitySaveBlocked && detailModel.unresolvedIds.length > 0 && (
                <div className="os-save-error" role="alert">
                  <p>
                    Inget sparades. Ange om {detailModel.current(detailModel.unresolvedIds[0]).name}{' '}
                    är identifierat eller ospecificerat före sparandet.
                  </p>
                  <button type="button" onClick={() => go('edit', detailModel.unresolvedIds[0])}>
                    Besvara identitetsfrågan
                  </button>
                </div>
              )}
              {unsentCount > 0 && (
                <p className="vs-unsent" role="status">
                  {unsentCount}{' '}
                  {unsentCount === 1 ? 'oskickad redigering' : 'oskickade redigeringar'} · finns
                  kvar i sina fönster
                </p>
              )}
            </>
          ) : (
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
          )
        }
        map={
          <div
            className="np-map-backdrop"
            data-camera={camera}
            inert={
              !ready || scenario === 'no-graphics' || scenario === 'empty' || adminContentLocked
            }
          >
            {ready &&
              scenario !== 'no-graphics' &&
              scenario !== 'empty' &&
              (study ? (
                <MapStudyMap
                  selectedId={selected}
                  selectedIds={selection.ids}
                  onSelect={markObject}
                  onClearSelection={clearSelection}
                  onOpenDetails={selectObject}
                  showSelectionActions={!windows.length && !utility && !statusOpen}
                  onList={() => go('list')}
                  theme={theme}
                  names={displayedNames}
                  staged={displayedStaged}
                  descriptions={detailsMode ? detailModel.descriptions : undefined}
                  objectChanges={
                    detailsMode
                      ? {
                          subscription:
                            (imagesMode && Object.hasOwn(profileModel.staged, 'subscription')) ||
                            (iconsMode && Object.hasOwn(iconModel.staged, 'subscription'))
                              ? 'changed'
                              : undefined,
                        }
                      : undefined
                  }
                  objectTypeNames={typesMode ? objectTypeNames : undefined}
                  objectOverrides={objectsMode ? projectedObjects : undefined}
                  relationshipOverrides={typesMode ? projectedRelationships : undefined}
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
                  ? `${pageTitles[item.page]} · ${displayedStaged[item.objectId] ?? displayedNames[item.objectId] ?? navObjects.find((object) => object.id === item.objectId)?.name}`
                  : pageTitles[item.page],
                content: contents(item.page, item.objectId),
                anchor: item.anchor,
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
            (!adminMode || scenario !== 'empty' || welcome) &&
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
                  <button type="button" onClick={() => go(adminMode ? 'list' : 'new-object')}>
                    {adminMode ? 'Öppna listan' : 'Lägg till manuellt'}
                  </button>
                )}
                {adminMode && (
                  <button type="button" onClick={() => setWelcome(false)}>
                    Stäng vägledningen
                  </button>
                )}
              </section>
            )}
          {showPanel && (
            <div
              className={`np-panel-host${adminMode && wideAdminPages.includes(displayedPage) ? ' ad-wide' : ''}${adminMode && displayedPage === 'settings' ? ` ad-settings-${adminVariant}` : ''}`}
              hidden={panelHidden}
            >
              <Panel
                page={displayedPage}
                locked={adminContentLocked}
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
                  <button
                    className="np-return-work"
                    type="button"
                    disabled={adminContentLocked}
                    onClick={closeUtility}
                  >
                    Tillbaka till arbetet
                  </button>
                )}
              </Panel>
            </div>
          )}
          {adminMode &&
            !ready &&
            !showPanel &&
            ['signin', 'setup', 'access'].includes(scenario) && (
              <AdminGate
                scenario={scenario}
                model={adminModel}
                operator={operator}
                go={go}
                enter={(empty) => {
                  setScenario(empty ? 'empty' : 'normal');
                  if (empty) setRole('administrator');
                  setWelcome(true);
                }}
                setup={() => resetSession('setup')}
                logout={() => resetSession('signin')}
              />
            )}
          {adminMode &&
            ready &&
            welcome &&
            !utility &&
            windows.length === 0 &&
            scenario !== 'empty' && (
              <aside className="ad-welcome">
                <h2>Vad vill du börja med?</h2>
                <p>
                  Tala, skriv eller använd listan. Dina förslag blir gemensamma först när du sparar
                  hela utkastet.
                </p>
                <div className="ad-actions">
                  <button
                    type="button"
                    onClick={() => {
                      setWelcome(false);
                      toggleVoice();
                    }}
                  >
                    Tala
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setWelcome(false);
                      go('conversation');
                    }}
                  >
                    Skriv
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setWelcome(false);
                      go('list');
                    }}
                  >
                    Öppna listan
                  </button>
                  <button type="button" onClick={() => setWelcome(false)}>
                    Stäng vägledningen
                  </button>
                </div>
              </aside>
            )}
          {!ready &&
            !showPanel &&
            !(adminMode && ['signin', 'setup', 'access'].includes(scenario)) && (
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
                    <button
                      className="np-primary"
                      type="button"
                      onClick={() => setScenario('empty')}
                    >
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
                    <button
                      type="button"
                      onClick={() => (voiceMode ? voiceStudy.endVoice() : setVoice(false))}
                    >
                      Stäng av rösten
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
                      <button
                        type="button"
                        onClick={save}
                        disabled={voiceMode ? !voiceStudy.canSave : saveState === 'pending'}
                      >
                        Spara hela utkastet
                      </button>
                    </>
                  )}
                  {unsentCount > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (unsentIds.length) {
                          if (objectsMode && unsentIds[0] === 'new-object') go('new-object');
                          else {
                            setSelected(unsentIds[0]);
                            go('edit', unsentIds[0]);
                          }
                        } else if (typeModel.unsentIds.length) go('types');
                        else {
                          relationshipModel.select(relationshipModel.unsentIds[0]);
                          go('new-relationship');
                        }
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
      {voiceMode && ready && feedbackVariant === 'D' && draftCount > 0 && (
        <aside className="voice-map-key" aria-label="Markeringar för privata förslag">
          <strong>
            {saveState === 'unknown'
              ? 'Sparresultat oklart · markeringarna finns kvar'
              : saveState === 'pending'
                ? 'Sparar · väntar på bekräftelse'
                : 'Privata förslag · inte sparat'}
          </strong>
          <div>
            <span className="voice-map-added">
              <b aria-hidden="true">+</b> Nytt
            </span>
            <span className="voice-map-changed">
              <b aria-hidden="true">✎</b> Ändrat
            </span>
            <span className="voice-map-removed">
              <b aria-hidden="true">×</b> Tas bort
            </span>
          </div>
        </aside>
      )}
      {adminMode ? (
        <AdminStudyLab
          model={adminModel}
          variant={adminVariant}
          onVariant={(next) => {
            if (!adminContentLocked) updateParams({ variant: next, panel: 'settings' }, true);
          }}
          role={role}
          onRole={(next) => {
            adminModel.clearSession();
            setRole(next as typeof role);
          }}
          onScenario={(next) => {
            resetSession(next as Scenario);
            setWelcome(next === 'empty');
          }}
          go={go}
          panel={utility}
          scenario={scenario}
        >
          <details>
            <summary>Kartans provverktyg</summary>
            <div className="ad-actions">
              <button
                type="button"
                disabled={voiceStudy.mic !== 'connecting'}
                onClick={voiceStudy.finishConnection}
              >
                Anslutning klar
              </button>
              <button
                type="button"
                disabled={voiceStudy.mic !== 'listening'}
                onClick={voiceStudy.proposeExample}
              >
                Tal klart: familjeabonnemang
              </button>
              <button
                type="button"
                disabled={voiceStudy.assistant !== 'working'}
                onClick={voiceStudy.finishWork}
              >
                Arbete klart
              </button>
              <button
                type="button"
                disabled={voiceStudy.assistant !== 'speaking'}
                onClick={voiceStudy.finishSpeech}
              >
                Svar klart
              </button>
              <button
                type="button"
                disabled={!voiceStudy.sessionActive}
                onClick={() => voiceStudy.simulateFailure('microphone')}
              >
                Mikrofon nekad
              </button>
              <button
                type="button"
                disabled={!voiceStudy.sessionActive}
                onClick={() => voiceStudy.simulateFailure('network')}
              >
                Nätet bryts
              </button>
              <button type="button" onClick={() => resolveVoiceSave('saved')}>
                Kvitto: sparat
              </button>
              <button type="button" onClick={() => resolveVoiceSave('unknown')}>
                Kvitto: okänt
              </button>
              <button type="button" onClick={() => study?.setNoGraphics(!study.noGraphics)}>
                Växla grafik
              </button>
            </div>
          </details>
        </AdminStudyLab>
      ) : voiceMode && ready ? (
        <VoiceStudyLab
          model={voiceStudy}
          variant={feedbackVariant}
          onVariant={(next) => updateParams({ variant: next }, true)}
          onNoGraphics={() => study?.setNoGraphics(!study.noGraphics)}
          comparison={
            listsMode && study
              ? {
                  label: iconsMode
                    ? 'Kastbart prov: bild och ikon'
                    : imagesMode
                      ? 'Kastbart prov: profilbilder'
                      : objectsMode
                        ? 'Kastbart prov: skapa och byta typ'
                        : typesMode
                          ? 'Kastbar typprototyp'
                          : detailsMode
                            ? 'Kastbar detaljprototyp'
                            : undefined,
                  fixed: typesMode,
                  key: detailsMode ? detailVariant : listVariant,
                  name: iconsMode
                    ? 'Profilbild med valfri ikon'
                    : imagesMode
                      ? 'Profilbild i samma utkast'
                      : objectsMode
                        ? 'Skapa objekt och byta typ'
                        : typesMode
                          ? 'Avsnitt från hushållets typer'
                          : detailsMode
                            ? { A: 'Läs och ändra', B: 'Avsnitt', C: 'Flikar' }[detailVariant]
                            : { A: 'Kompakt lista', B: 'Typkatalog', C: 'Sök och inspektera' }[
                                listVariant
                              ],
                  description: detailsMode
                    ? 'Detaljer och redigering · godkänd lista B och talåterkoppling D'
                    : 'Hitta rätt objekt · godkänd karta och talåterkoppling D',
                  state: `${projectedObjects.length} objekt · ${selection.ids.length} markerade · ${unsentCount} oskickade redigeringar · ${draftCount} förslag`,
                  onCycle: (direction) => {
                    if (typesMode) return;
                    const keys: ListStudyVariant[] = ['A', 'B', 'C'];
                    updateParams(
                      {
                        variant:
                          keys[
                            (keys.indexOf(detailsMode ? detailVariant : listVariant) +
                              direction +
                              3) %
                              3
                          ],
                      },
                      true,
                    );
                  },
                  controls: (
                    <div className="voice-study-lab-group">
                      <strong>
                        {detailsMode ? 'Pröva uppgifter och redigering' : 'Hitta och välj i listan'}
                      </strong>
                      {typesMode && (
                        <button type="button" onClick={() => go('settings')}>
                          Öppna Inställningar
                        </button>
                      )}
                      {imagesMode && (
                        <button
                          type="button"
                          disabled={
                            profileBusy ||
                            ['pending', 'unknown', 'conflict'].includes(saveState) ||
                            detailModel.unsentIds.includes('subscription')
                          }
                          onClick={async () => {
                            const response = await fetch(profileExample);
                            const file = new File([await response.blob()], 'provbild-musik.png', {
                              type: 'image/png',
                            });
                            if (await profileModel.pick('subscription', file)) {
                              voiceStudy.noteManualChange();
                              setSaveState('idle');
                              go('edit', 'subscription');
                            }
                          }}
                        >
                          Använd provbild på Familjeabonnemang
                        </button>
                      )}
                      {objectsMode && (
                        <button type="button" onClick={() => go('new-object')}>
                          Pröva nytt objekt
                        </button>
                      )}
                      {detailsMode && (
                        <button type="button" onClick={() => selectObject('subscription')}>
                          Öppna Familjeabonnemang
                        </button>
                      )}
                      <button type="button" onClick={returnToList}>
                        Öppna listan
                      </button>
                      <label>
                        Påhittat hushåll
                        <select
                          value={study.density === 'large' ? 'large' : 'sparse'}
                          onChange={(event) => {
                            study.setDensity(event.target.value as 'large' | 'sparse');
                            setBrowse((previous) => ({ ...previous, page: 0 }));
                            listMemory.current.scrollTop = 0;
                            updateParams(
                              { size: event.target.value === 'large' ? 'large' : 'small' },
                              true,
                            );
                          }}
                        >
                          <option value="sparse">Litet · 8 objekt</option>
                          <option value="large">Stort · 500 objekt</option>
                        </select>
                      </label>
                      <p>
                        Sökning: {browse.query || 'ingen'} · typer:{' '}
                        {browse.types.join(', ') || 'alla'} · sortering:{' '}
                        {browse.sort === 'name' ? 'namn' : 'typ'} · urval:{' '}
                        {browse.onlySelected ? 'markerade' : 'alla'}.
                      </p>
                      <p>
                        {iconsMode ? (
                          'B ligger fast. Alla objekt kan ha en profilbild eller logotyp och en valfri ikon. Sök efter en ikon i detaljerna. Bilden visas först, sedan ditt ikonval och annars typens standardikon. Allt delar samma utkast och kvitto och finns bara i minnet.'
                        ) : imagesMode ? (
                          'B ligger fast. Pröva att lägga till, byta och ta bort profilbild. Bild och text delar samma utkast och kvitto. Allt finns bara i minnet; ingen fil laddas upp. Bilder granskas i webbläsaren i detta prov.'
                        ) : objectsMode ? (
                          'B ligger fast. Pröva ett nytt objekt eller byt typ på Familjeabonnemang. Egna fält från den tidigare typen visas för hantering. Bilder, historik och fullständiga konfliktval återstår. Allt provtillstånd finns bara i minnet.'
                        ) : typesMode ? (
                          'B ligger fast. Pröva redigerbara typer, avsnitt och egenskaper i Inställningar. Samband kan koppla vilka objekt som helst. Allt sparande är simulerat i samma privata utkast.'
                        ) : detailsMode ? (
                          'Denna omgång prövar namn, beskrivning, ekonomiska uppgifter och osäkerhet. Sambandsredigering, egna typer, fält, bilder, historik och fler konfliktval återstår. Listan använder godkända B.'
                        ) : (
                          <>
                            Denna omgång prövar listans struktur och vägen till detaljer. Redigering
                            visar ännu bara den godkända grundens namnprov. Täta formulär och fler
                            konfliktval följer efter återkopplingen.
                          </>
                        )}
                      </p>
                    </div>
                  ),
                }
              : undefined
          }
        />
      ) : study ? (
        <MapStudyLab
          selectedId={selected}
          onList={() => go('list')}
          onSelect={revealStudyObject}
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

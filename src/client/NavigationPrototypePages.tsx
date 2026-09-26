import { type ReactNode, useId } from 'react';

export type NavPage =
  | 'map'
  | 'list'
  | 'new-object'
  | 'new-relationship'
  | 'detail'
  | 'edit'
  | 'conversation'
  | 'draft'
  | 'more'
  | 'settings'
  | 'login-methods'
  | 'invitations'
  | 'types'
  | 'history'
  | 'assistants'
  | 'consent'
  | 'save-attempts'
  | 'administration'
  | 'export'
  | 'import'
  | 'erasure'
  | 'owners'
  | 'members'
  | 'costs'
  | 'help';

export const pageTitles: Record<NavPage, string> = {
  map: 'Hushållets karta',
  list: 'Alla objekt',
  'new-object': 'Nytt objekt',
  'new-relationship': 'Nytt samband',
  detail: 'Objektets uppgifter',
  edit: 'Ändra uppgifter',
  conversation: 'Samtal',
  draft: 'Mitt utkast',
  more: 'Mer',
  settings: 'Inställningar',
  'login-methods': 'Inloggningssätt',
  invitations: 'Inbjudan och användar-ID',
  types: 'Objekt- och sambandstyper',
  history: 'Ändringshistorik',
  assistants: 'Assistenter',
  consent: 'Assistentens åtkomst',
  'save-attempts': 'Sparförsök och kvitton',
  administration: 'Hushållets administration',
  export: 'Exportera hushållet',
  import: 'Återimportera hushållet',
  erasure: 'Permanent radering',
  owners: 'Koppla historiskt innehåll',
  members: 'Medlemmar och inbjudningar',
  costs: 'Driftens kostnader',
  help: 'Information',
};

export const navObjects = [
  {
    id: 'alex',
    name: 'Alex',
    type: 'Person',
    description: 'En person i hushållet.',
    relation: 'Står på familjeabonnemanget och använder Alex musikkonto.',
  },
  {
    id: 'lo',
    name: 'Lo',
    type: 'Person',
    description: 'En person i hushållet.',
    relation: 'Använder Musikgläntan.',
  },
  {
    id: 'music',
    name: 'Musikgläntan',
    type: 'Musiktjänst',
    description: 'Hushållets påhittade musiktjänst.',
    relation: 'Lo använder tjänsten. Familjeabonnemanget ger tillgång till den.',
  },
  {
    id: 'subscription',
    name: 'Familjeabonnemang',
    type: 'Abonnemang',
    description: 'Musik för hushållet, 189 kr per månad.',
    relation:
      'Alex står på avtalet. Ger tillgång till Musikgläntan och betalas från Gemensamt bankkonto.',
  },
  {
    id: 'account',
    name: 'Alex musikkonto',
    type: 'Tjänstekonto',
    description: 'Alex tjänstekonto hos Musikgläntan.',
    relation: 'Används av Alex, med alex@example.test som inloggningsadress.',
  },
  {
    id: 'email',
    name: 'alex@example.test',
    type: 'E-postadress',
    description: 'En påhittad e-postadress som Alex använder.',
    relation: 'Inloggningsadress för Alex musikkonto.',
  },
  {
    id: 'bank',
    name: 'Gemensamt bankkonto',
    type: 'Bankkonto',
    description: 'Ett bankkonto för hushållets betalningar.',
    relation: 'Familjeabonnemanget betalas från bankkontot. Kort ·· 4242 är kopplat till det.',
  },
  {
    id: 'card',
    name: 'Kort ·· 4242',
    type: 'Betalkort',
    description: 'Ett påhittat betalkort.',
    relation: 'Kopplat till Gemensamt bankkonto.',
  },
];

type Props = {
  objects?: typeof navObjects;
  page: NavPage;
  go: (page: NavPage) => void;
  selected: string;
  selectObject: (id: string) => void;
  query: string;
  setQuery: (value: string) => void;
  buffer: string;
  setBuffer: (value: string) => void;
  staged: Record<string, string>;
  additionalDraft?: ReactNode;
  additionalDraftCount?: number;
  mapSettings?: ReactNode;
  savedNames: Record<string, string>;
  stage: () => void;
  message: string;
  setMessage: (value: string) => void;
  transcript: string[];
  send: () => void;
  save: () => void;
  saving: boolean;
  empty: boolean;
  administrator: boolean;
  operator: boolean;
  logout: () => void;
};

const administrativePages: NavPage[] = [
  'administration',
  'export',
  'import',
  'erasure',
  'owners',
  'members',
];
const laterDecision = <p className="np-muted">Innehållets detaljer prövas i ett annat beslut.</p>;

export function NavigationPrototypePages(props: Props) {
  const nameId = useId();
  const {
    objects = navObjects,
    page,
    go,
    selected,
    selectObject,
    query,
    setQuery,
    buffer,
    setBuffer,
    staged,
    additionalDraft,
    additionalDraftCount = 0,
    savedNames,
    stage,
    message,
    setMessage,
    transcript,
    send,
    save,
    saving,
    empty,
    administrator,
    operator,
    logout,
  } = props;
  const displayedObjects = objects.map((item) => ({
    ...item,
    name: savedNames[item.id] ?? item.name,
  }));
  const object = displayedObjects.find((item) => item.id === selected) ?? displayedObjects[3];
  const changes = Object.entries(staged);
  const draftCount = changes.length + additionalDraftCount;
  const menu = (pages: NavPage[]) => (
    <div className="np-menu">
      {pages.map((target) => (
        <button key={target} type="button" onClick={() => go(target)}>
          <span>{pageTitles[target]}</span>
          <span aria-hidden="true">→</span>
        </button>
      ))}
    </div>
  );

  if (administrativePages.includes(page) && !administrator) {
    return <p>Den här sidan är tillgänglig för hushållets administratörer.</p>;
  }
  if (page === 'costs' && !operator) {
    return <p>Den här sidan är tillgänglig för installationens driftansvariga.</p>;
  }
  if (page === 'map') return null;
  if (page === 'list') {
    const needle = query.trim().toLocaleLowerCase('sv');
    const matches = empty
      ? []
      : displayedObjects.filter((item) =>
          `${item.name} ${item.type}`.toLocaleLowerCase('sv').includes(needle),
        );
    return (
      <div className="np-stack">
        {menu(['new-object', 'new-relationship'])}
        <label className="np-fields" htmlFor="np-object-search">
          Sök objekt
          <input
            id="np-object-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Namn eller objekttyp"
          />
        </label>
        <p className="np-muted" role="status">
          {matches.length} objekt
        </p>
        {matches.map((item) => (
          <button
            className="np-item"
            key={item.id}
            type="button"
            onClick={() => selectObject(item.id)}
          >
            <span>
              <span className="np-kicker">{item.type}</span>
              <strong>{item.name}</strong>
            </span>
            <span aria-hidden="true">→</span>
          </button>
        ))}
        {matches.length === 0 && (
          <p>
            {empty
              ? 'Hushållets karta är tom. Lägg till ett objekt eller börja med att berätta om något i samtalet.'
              : 'Inga objekt matchar sökningen.'}
          </p>
        )}
        {empty && (
          <button type="button" className="np-primary" onClick={() => go('conversation')}>
            Öppna samtal
          </button>
        )}
        {menu(['types', 'history'])}
      </div>
    );
  }
  if (page === 'detail')
    return (
      <div className="np-stack">
        <p className="np-kicker">{object.type}</p>
        <p>
          <strong>{object.name}</strong>
        </p>
        <p>{object.description}</p>
        <dl className="np-facts">
          <dt>Samband</dt>
          <dd>{object.relation}</dd>
        </dl>
        {staged[object.id] && (
          <p className="np-message">Du har en ändring av namnet i ditt utkast.</p>
        )}
        <button type="button" className="np-primary" onClick={() => go('edit')}>
          Ändra uppgifter
        </button>
        <p className="np-muted">
          Här hör också samband, bilder och ekonomiska uppgifter hemma, tillsammans med att ange att
          något upphört, ta bort, återställa och slå samman objekt. Dessa flöden prövas i ett
          separat beslut.
        </p>
      </div>
    );
  if (page === 'edit')
    return (
      <form
        className="np-stack"
        onSubmit={(event) => {
          event.preventDefault();
          stage();
        }}
      >
        <p className="np-kicker">
          {object.type} · {object.name}
        </p>
        <label className="np-fields" htmlFor={nameId}>
          Namn
          <input
            id={nameId}
            value={buffer}
            disabled={saving}
            onChange={(event) => setBuffer(event.target.value)}
            autoComplete="off"
          />
        </label>
        <p className="np-muted">
          Ändringen läggs i ditt privata utkast. Du sparar sedan hela utkastet till hushållets
          karta.
        </p>
        <button type="submit" className="np-primary" disabled={!buffer.trim() || saving}>
          Lägg i utkast
        </button>
      </form>
    );
  if (page === 'draft')
    return (
      <div className="np-stack">
        <p>Bara du ser ditt utkast. Sparade ändringar blir synliga för hela hushållet.</p>
        {draftCount === 0 && <p className="np-message">Ditt utkast är tomt.</p>}
        {additionalDraft}
        {changes.map(([id, name]) => (
          <div className="np-item" key={id}>
            <div>
              <span className="np-kicker">Ändrat namn</span>
              <strong>{displayedObjects.find((item) => item.id === id)?.name}</strong>
              <p>Föreslaget namn: {name}</p>
            </div>
          </div>
        ))}
        <button
          type="button"
          className="np-primary"
          disabled={!draftCount || saving}
          onClick={save}
        >
          {saving ? 'Sparar hela utkastet…' : 'Spara hela utkastet'}
        </button>
        <p className="np-muted">
          I den här skissen sker sparandet bara under den pågående visningen.
        </p>
        {menu(['save-attempts'])}
      </div>
    );
  if (page === 'conversation')
    return (
      <div className="np-stack">
        <p className="np-muted">
          Berätta, fråga eller föreslå en ändring. Samtalet följer med när du byter vy.
        </p>
        <div className="np-stack" role="log" aria-label="Samtalets meddelanden" aria-live="polite">
          {(transcript.length
            ? transcript
            : ['Skyttel: Vad vill du undersöka i hushållets karta?']
          ).map((line, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: Prototypens samtal växer bara i slutet.
            <p className="np-message" key={`${index}-${line}`}>
              {line}
            </p>
          ))}
        </div>
        <form
          className="np-stack"
          onSubmit={(event) => {
            event.preventDefault();
            send();
          }}
        >
          <label className="np-fields" htmlFor="np-conversation-input">
            Ditt meddelande
            <textarea
              id="np-conversation-input"
              rows={3}
              value={message}
              disabled={saving}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Vad hör till vårt familjeabonnemang?"
            />
          </label>
          <button type="submit" className="np-primary" disabled={!message.trim() || saving}>
            Skicka
          </button>
        </form>
        {draftCount > 0 && (
          <button type="button" onClick={() => go('draft')}>
            Visa mitt utkast ({draftCount})
          </button>
        )}
      </div>
    );
  if (page === 'more')
    return <div className="np-stack">{menu(['types', 'history', 'save-attempts'])}</div>;
  if (page === 'settings')
    return (
      <div className="np-stack">
        <p>Du kan återgå till arbetet när som helst. Oskickad text och redigering finns kvar.</p>
        {props.mapSettings}
        <details className="np-personal-settings">
          <summary>Dina inställningar</summary>
          <div className="np-stack">
            {menu(['login-methods', 'invitations', 'assistants'])}
            <button type="button" onClick={logout}>
              Logga ut
            </button>
          </div>
        </details>
        <section className="np-stack" aria-labelledby="np-household-administration">
          <h3 id="np-household-administration">Hushållets administration</h3>
          <p>
            Hantera vilka som har tillgång till hushållet samt export, återimport och permanent
            radering av hushållets information.
          </p>
          {administrator ? (
            menu(['administration'])
          ) : (
            <p className="np-muted">Tillgängligt för hushållets administratörer.</p>
          )}
        </section>
        <section className="np-stack" aria-labelledby="np-operation-costs">
          <h3 id="np-operation-costs">Driftens kostnader</h3>
          <p>Följ kostnaderna för att köra Skyttel, till exempel användningen av assistenten.</p>
          <p className="np-muted">Hushållets abonnemang och avtal hör till kartan och listan.</p>
          {operator ? (
            menu(['costs'])
          ) : (
            <p className="np-muted">Tillgängligt för installationens driftansvariga.</p>
          )}
        </section>
      </div>
    );
  if (page === 'administration')
    return (
      <div className="np-stack">
        <p>
          Här hanterar hushållets administratörer medlemskap, inbjudningar, export, återimport och
          permanent radering av hushållets information.
        </p>
        {menu(['members', 'owners', 'export', 'import', 'erasure'])}
        <p className="np-muted">
          Alla hushållets medlemmar kan arbeta med hela den gemensamma kartan.
        </p>
      </div>
    );
  if (page === 'help')
    return (
      <div className="np-stack">
        <h3>Hjälp och information om Skyttel</h3>
        <p>
          Skyttel hjälper hushållet att hålla ihop personer, saker, tjänster och avtal i en gemensam
          karta.
        </p>
        <section className="np-stack" aria-labelledby="np-help-map">
          <h4 id="np-help-map">Karta och lista</h4>
          <p>
            Kartan ger en rumslig överblick. Listan visar samma information och låter dig söka efter
            objekt. Välj ett objekt för att se dess uppgifter och samband.
          </p>
        </section>
        <section className="np-stack" aria-labelledby="np-help-conversation">
          <h4 id="np-help-conversation">Tala eller skriv</h4>
          <p>
            Använd mikrofonen för att tala med Skyttel eller öppna Samtal för att skriva. Där kan du
            fråga om kartan och föreslå ändringar.
          </p>
        </section>
        <section className="np-stack" aria-labelledby="np-help-draft">
          <h4 id="np-help-draft">Ditt privata utkast</h4>
          <p>
            Dina förslag samlas i Mitt utkast. Bara du ser dem tills du sparar hela utkastet till
            hushållets gemensamma karta.
          </p>
        </section>
        <section className="np-stack" aria-labelledby="np-help-settings">
          <h4 id="np-help-settings">Tillfälligt i inställningarna</h4>
          <p>
            Öppna inställningarna när du behöver ändra något. När du stänger dem fortsätter du där
            du var, med oskickad text, redigering, urval och sökning kvar.
          </p>
        </section>
      </div>
    );

  const examples: Partial<Record<NavPage, { introduction: string; facts: [string, string][] }>> = {
    'new-object': {
      introduction: 'Lägg till en person, sak eller annan företeelse i hushållets karta.',
      facts: [
        ['Objekttyp och namn', 'Ange vad objektet är och vilket namn det ska ha.'],
        [
          'Mitt utkast',
          'Det nya objektet blir ett förslag att granska innan hela utkastet sparas.',
        ],
      ],
    },
    'new-relationship': {
      introduction: 'Skapa ett samband mellan två objekt i hushållets karta.',
      facts: [
        ['Objekt', 'Välj de två objekt som hör ihop. En tom karta behöver först objekt.'],
        ['Sambandstyp', 'Ange kopplingens betydelse, exempelvis använder eller äger.'],
        [
          'Mitt utkast',
          'Det nya sambandet blir ett förslag att granska innan hela utkastet sparas.',
        ],
      ],
    },
    'login-methods': {
      introduction: 'Här hanterar du sätten att logga in på ditt eget Skyttel-konto.',
      facts: [
        ['Dina inloggningar', 'Se vilka inloggningssätt som är kopplade till dig.'],
        ['Personligt', 'Tillgängligt när du är inloggad, även innan du tillhör ett hushåll.'],
      ],
    },
    invitations: {
      introduction: 'Här hittar du ditt användar-ID och inbjudningar till hushåll.',
      facts: [
        ['Användar-ID', 'Kan delas med den som ska ge dig tillgång till ett hushåll.'],
        ['Inbjudningar', 'Granska en inbjudan även om du ännu inte tillhör något hushåll.'],
      ],
    },
    consent: {
      introduction: 'En extern assistent ber om ditt medgivande till åtkomst genom Skyttel.',
      facts: [
        ['Granska förfrågan', 'Se vilken assistent som frågar och vilken åtkomst den begär.'],
        ['Separat steg', 'Medgivandet sker när du ansluter den externa assistenten.'],
      ],
    },
    'save-attempts': {
      introduction: 'Följ dina sparförsök och se kvittot på resultatet.',
      facts: [
        ['Sparförsök', 'Visar om ett försök pågår, lyckades eller behöver hanteras.'],
        ['Kvitto', 'Visar resultatet av ett avslutat sparförsök.'],
      ],
    },
    types: {
      introduction:
        'Hushållet delar sina objekt- och sambandstyper. Alla medlemmar kan arbeta med dem.',
      facts: [
        ['Objekttyper', 'Person, tjänst, tjänstekonto, abonnemang, bankkonto'],
        ['Sambandstyper', 'Använder, står på avtalet, betalar'],
        ['Egna typer', 'Typer som hushållet definierar tillsammans'],
      ],
    },
    history: {
      introduction: 'Här finns tidigare sparade ändringar för hela hushållets karta.',
      facts: [
        [
          'I dag, 10.42 · Alex',
          'Familjeabonnemangets pris ändrades från 179 till 189 kr per månad.',
        ],
        ['I går, 18.10 · Lo', 'Sambandet Lo använder Musikgläntan lades till.'],
      ],
    },
    assistants: {
      introduction:
        'Här hittar hushållets medlemmar sina assistenter och deras tillgång till kartan.',
      facts: [
        ['Skyttels assistent', 'Används genom Samtal.'],
        ['Andra assistenter', 'Anslutningar och deras behörigheter visas här.'],
      ],
    },
    members: {
      introduction:
        'Administratörer hanterar vilka Skyttel-användare som har tillgång till hushållet.',
      facts: [
        ['Alex', 'Administratör'],
        ['Lo', 'Medlem'],
        ['Gemensam insyn', 'Båda kan se och arbeta med hela kartan.'],
      ],
    },
    owners: {
      introduction: 'En administratör kan koppla historiskt innehåll till rätt Skyttel-användare.',
      facts: [
        ['Historiskt innehåll', 'Privata utkast och personliga vyer från en importerad identitet.'],
        ['Koppling', 'Välj en identifierad medlem som redan har tillgång till hushållet.'],
      ],
    },
    export: {
      introduction: 'En administratör kan exportera hushållets information.',
      facts: [
        ['Omfattning', 'Hushållets information samlas i en export.'],
        ['Nästa steg', 'Granska innehåll och format innan exporten skapas.'],
      ],
    },
    import: {
      introduction: 'En administratör kan återimportera hushållets information.',
      facts: [
        ['Underlag', 'En tidigare export från Skyttel.'],
        ['Nästa steg', 'Välj underlag och granska hur hushållets information påverkas.'],
      ],
    },
    erasure: {
      introduction: 'Permanent radering hanteras av hushållets administratörer.',
      facts: [
        ['Konsekvens', 'Permanent raderad information kan inte återställas i Skyttel.'],
        ['Nästa steg', 'Omfattning och bekräftelse behöver granskas i ett särskilt flöde.'],
      ],
    },
    costs: {
      introduction:
        'Här följer installationens driftansvariga kostnaderna för att köra Skyttel. Hushållets abonnemang och avtal finns i kartan och listan.',
      facts: [
        ['Samtal denna månad', '12,40 kr · påhittat exempel'],
        ['Fördelning', 'Kostnader kan följas över tid.'],
        [
          'Behörighet',
          'Rollen som driftansvarig är fristående från hushållets administratörsroll.',
        ],
      ],
    },
  };
  const example = examples[page];
  return example ? (
    <div className="np-stack">
      <p>{example.introduction}</p>
      <dl className="np-facts">
        {example.facts.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      {page === 'assistants' && menu(['consent'])}
      {page === 'new-relationship' && empty && menu(['new-object'])}
      {laterDecision}
    </div>
  ) : null;
}

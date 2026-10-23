# gh-stack och ett gemensamt införande av hela batchen

Underlaget riktar sig till den som väljer PR-flöde för `implement-batch`.
Det jämför granskning per lager med en gemensam PR utan att välja lösning.
Hela specifikationen ska kunna införas i `main` genom en enda operation.

## Omfattning och viktigaste resultat

Gh-stack v0.2.0 stöder enligt sin dokumentation **atomisk direkt
sammanslagning av en hel stack**. Flera PR:er behöver alltså inte medföra
flera separata införanden. En operation är inte samma sak som en commit.
Den skillnaden behöver hållas tydlig i det fortsatta beslutet.
[Kommandots kontrakt](https://github.com/github/gh-stack/blob/d4ab7ab47e5b3e3708a27c8c42abcdf4bc321419/cmd/merge.go#L40-L64)

Versionspåståenden avser v0.2.0, commit
`d4ab7ab47e5b3e3708a27c8c42abcdf4bc321419`. Nuvarande GitHub-dokumentation
och skrivskyddade API-observationer avser 2026-10-23. Ingen PR skapas,
staplas eller slås samman i undersökningen. Ingen inställning ändras.
Verklig publicering och sammanslagning är därför inte verifierade.

## Vanliga PR:er och inbyggda stackar är skilda mekanismer

En vanlig PR kan rikta sig till en annan gren. En inbyggd GitHub-stack
har dessutom ett serverobjekt som binder ihop en ordnad kedja av PR:er.
I v0.2.0 skapas det via `POST /repos/{owner}/{repo}/stacks` med minst två
PR-nummer och en giltig kedja mellan bas- och huvudgrenar. Lokal
stackmetadata ensam skapar inte detta objekt.
[Klientens stackoperationer](https://github.com/github/gh-stack/blob/d4ab7ab47e5b3e3708a27c8c42abcdf4bc321419/internal/github/github.go#L488-L560)

GitHubs nuvarande dokumentation anger att stackens rotgren styr regler
och Actions-utlösning för alla lager. Ett `pull_request`-flöde filtrerat
till `main` gäller därför även högre inbyggda stacklager. Det skiljer
sig från slutsatser baserade enbart på vanliga PR:ers direkta basgrenar.
[Regler och Actions för stackar](https://docs.github.com/en/pull-requests/reference/stacked-pull-requests)

## Observerad tillgång och regler för Skyttel

Följande läsanrop använder den konfigurerade `gh`-klienten, omkring
18:24 UTC den 2026-10-23:

```sh
gh api 'repos/viscalyx/skyttel/stacks?per_page=100'
gh api repos/viscalyx/skyttel
gh api repos/viscalyx/skyttel/rules/branches/main
gh api repos/viscalyx/skyttel/rulesets/23556762
gh api graphql -f query='query {
  repository(owner:"viscalyx",name:"skyttel") {
    mergeQueue(branch:"main") { id }
  }
}'
```

- Stacklistan svarar HTTP 200 med `[]`. Detta är samma läsoperation som
  v0.2.0 använder för tillgänglighetskontrollen före `submit`. Lässtödet
  finns för denna klient och detta repository; det bevisar inte att en
  framtida mutation godkänns.
- Repositoryt tillåter merge, squash och rebase. Den aktiva regeln för
  `main` begränsar däremot till `squash` och `rebase`.
- `main` kräver PR samt aktuella `application`- och `security-gate`-
  kontroller från GitHub Actions. Regeln har inga bypass-aktörer.
- Ingen regel för merge queue finns i svaret och GraphQL ger
  `mergeQueue: null`.
- `delete_branch_on_merge` är `false`. `allow_auto_merge` är `true`,
  vilket avviker från repositoryts drifttext om avstängd automatisk merge.
  Ingen ändring av inställningarna ingår här.

Primärkällor för de observerade svaren är
[repository-API:t](https://api.github.com/repos/viscalyx/skyttel),
[stacklistan](https://api.github.com/repos/viscalyx/skyttel/stacks),
[reglerna för main](https://api.github.com/repos/viscalyx/skyttel/rules/branches/main)
och [regeluppsättningen](https://api.github.com/repos/viscalyx/skyttel/rulesets/23556762).
Svaren är föränderliga. Tillgänglighetskontrollen finns i
[submit-koden](https://github.com/github/gh-stack/blob/d4ab7ab47e5b3e3708a27c8c42abcdf4bc321419/cmd/submit.go#L121-L145).
Drifttexten finns i
[security-checks.md](../operations/security-checks.md).

## Ett atomiskt införande med flera PR:er

V0.2.0 beskriver direkt stackmerge som allt eller inget. Vald PR och alla
ännu osammanslagna PR:er under den införs tillsammans. För hela batchen
måste alltså den översta PR:en omfatta alla avsedda lager. Kommandot
kontrollerar enkla PR-tillstånd; servern bedömer regler vid körningen.
[Versionslåst merge-beskrivning](https://github.com/github/gh-stack/blob/d4ab7ab47e5b3e3708a27c8c42abcdf4bc321419/docs/src/content/docs/guides/workflows.md#merging-your-stack)

API:t är asynkront: begäran följs av avläsning tills slutstatus finns.
`pending` bevisar inget införande. `enqueued` anger köplacering, inte
sammanslagning. Inbyggda stackar kräver detta API; vanliga synkrona
merge-endpoints är inte ett alternativ.
[Versionslåst API-kontrakt](https://github.com/github/gh-stack/blob/d4ab7ab47e5b3e3708a27c8c42abcdf4bc321419/docs/src/content/docs/reference/merge-api.md)

Nuvarande GitHub-dokumentation säger att stackens squash-metod ger en
commit per PR och att rebase bevarar en linjär följd av commits. Båda
inför gruppen atomiskt. Kravet på ett införande utesluter därför inte
dessa metoder; ett separat krav på exakt en commit skulle vara strängare.
[Nuvarande merge-metoder](https://docs.github.com/en/pull-requests/reference/stacked-pull-requests#merge-methods)

### Korrigering av bilden av merge queue

V0.2.0:s FAQ säger att en stor stack kan delas över flera kögrupper.
Nuvarande GitHub-dokumentation säger i stället att en stack som inte
ryms i gruppens utökade gräns flyttas till nästa grupp som en hel enhet.
Den äldre uppgiften ska alltså inte presenteras som dagens generella
GitHub-beteende. Serverns beteende är inte låst av CLI-versionen.
[Äldre FAQ](https://github.com/github/gh-stack/blob/d4ab7ab47e5b3e3708a27c8c42abcdf4bc321419/docs/src/content/docs/faq.md#do-stacked-prs-support-merge-queue)
och [nuvarande köbeskrivning](https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/merging-stacked-pull-requests#merging-using-a-merge-queue).
Skyttel har enligt läsprovet ingen merge queue. Direkt stackmerge har
tydligt stöd för atomiskt införande i både den låsta och aktuella källan.

## En extra gemensam PR kan störa PR-avstämningen

V0.2.0 söker en öppen PR med huvudgrenens namn och `first: 1`, utan
filter på basgren. `submit` använder detta resultat som lagrets PR och
rättar basen till föregående lager när stacken ännu saknar server-id.
När en serverstack finns varnar den vid fel bas i stället för att ändra
basen direkt. Det är verifierat källbeteende, inte ett genomfört försök.
[PR-sökningen](https://github.com/github/gh-stack/blob/d4ab7ab47e5b3e3708a27c8c42abcdf4bc321419/internal/github/github.go#L98-L145)
och [avstämningen](https://github.com/github/gh-stack/blob/d4ab7ab47e5b3e3708a27c8c42abcdf4bc321419/cmd/submit.go#L360-L435).

Slutsats: en extra PR från samma stackspets till `main` kan bli förväxlad
med det översta lagrets PR. Kombinationen är inte ett verifierat
standardflöde. En separat publiceringsgren skulle skilja huvudgrenarna,
men tillför samordning och behöver egen prövning. Native stackmerge
behöver ingen sådan extra PR för atomiskt införande.

Lokal stackhantering plus endast en gemensam PR är ett annat alternativ.
PR:en bär hela ändringen från stackspetsen till `main`; separata
agentsessioner kan fortfarande granskas innan integration. Kommandon som
registrerar den gemensamma PR:en som ett stacklager eller ändrar dess bas
måste då undvikas eller prövas. Detta är ett förslag, inte verifierad
kommandosekvens.

## Ändringar efter granskningen och slutkontroll

Det versionslåsta API-kontraktet har `sha` för förväntad huvudcommit.
V0.2.0:s `MergeStackAsync` skickar bara `merge_method` och `merge_action`;
CLI:t uttrycker inte granskningens förväntade SHA i begäran. Det finns
inte heller någon förväntad bascommit i detta kontrakt.
[API-fälten](https://github.com/github/gh-stack/blob/d4ab7ab47e5b3e3708a27c8c42abcdf4bc321419/docs/src/content/docs/reference/merge-api.md#submit-a-merge-request)
och [klientens begäran](https://github.com/github/gh-stack/blob/d4ab7ab47e5b3e3708a27c8c42abcdf4bc321419/internal/github/merge_async.go#L209-L244).

Följande är rekommenderade prototypkrav, inte befintlig automation:

- Bind batchens godkännande till exakt rotcommit, stackordning och
  huvudcommits. Kontrollera samtliga mot servern före införande.
- Om `main` eller något lager ändras, ompröva granskning och verifiering.
  Aktuella statuskontroller är inte bevis för full specifikationsgranskning.
- Prova SHA-villkoret i ett separat asynkront API-anrop om den verifierade
  huvudcommitten måste skyddas även under tiden mellan kontroll och merge.
- Avvakta terminalt resultat. Vid avbrott, läs fjärrstatus och faktisk
  införandekommit före återförsök. Ett nätverksfel bevisar inte utebliven
  sammanslagning.
- Kontrollera att samtliga avsedda PR:er är införda och att det införda
  innehållet motsvarar den verifierade batchen före städning.

## PR-status, städning och jämförelse

Vid inbyggd stackmerge ingår de valda PR:erna i samma operation. Vid en
gemensam vanlig PR kan andra PR:er endast få indirekt merge-status under
GitHubs villkor om nåbara commits. Squash eller rebase kan ändra
commit-identiteter; automatisk stängning av andra PR:er ska inte antas.
[Indirekta sammanslagningar](https://docs.github.com/en/pull-requests/reference/pull-request-merges#indirect-merges)

V0.2.0:s `sync --prune` kan rensa lokala grenar för sammanslagna PR:er,
men behåller grenar som är utcheckade i andra worktrees. Det ersätter
inte orkestratorns överlämning, kontroll och städning av worktrees.
[Prune-koden](https://github.com/github/gh-stack/blob/d4ab7ab47e5b3e3708a27c8c42abcdf4bc321419/cmd/sync.go#L350-L475)

<!-- markdownlint-disable MD013 -->
| Alternativ | Möjlig nytta | Kostnad eller återstående prov |
| :-- | :-- | :-- |
| Inbyggda staplade PR:er | Diff och diskussion per lager; atomiskt införande av helheten. | PR- och CI-arbete per lager; full batchgranskning krävs ändå. |
| Lokal stack och gemensam PR | En samlad granskningsyta och ett införande. | Separata sessioners bevis behöver egna referenser; PR-avstämningen behöver avgränsas. |
| Lager-PR:er och extra gemensam PR | Både lagerdiskussioner och samlad PR. | Tvetydig sökning på samma huvudgren och extra status-/städarbete. |
<!-- markdownlint-enable MD013 -->

En praktisk prototyp behöver fortfarande visa rätt PR-koppling, komplett
stack efter reparationer, CI-kostnad och återupptagning. Läsprovet ger
inte rätt att påstå att skrivbehörighet, servermerge eller städning är
provade. Valet mellan alternativen återstår hos användaren.

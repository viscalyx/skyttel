# gh-stack v0.2.0 för parallella agenter i worktrees

Underlaget riktar sig till den som beslutar om arbetsflödet för
`implement-batch`. Det beskriver verifierade verktygsfakta och vilka
följdfrågor som behöver prövas före ett införandebeslut. Det väljer inget
arbetsflöde.

## Omfattning och källor

Granskningen gäller taggen `v0.2.0`, commit
`d4ab7ab47e5b3e3708a27c8c42abcdf4bc321419`, kontrollerad 2026-10-23.
Underlaget bygger på officiell dokumentation och källkod i den versionen.
Källkodens kontroller visar avsett beteende; de utgör inte ett genomfört
belastningsprov eller ett prov av Skyttels agentflöde.

[Versionskällan](https://github.com/github/gh-stack/tree/d4ab7ab47e5b3e3708a27c8c42abcdf4bc321419)
är en separat lokal klon vid granskningen. Inga gh-stack-kommandon körs
mot Skyttels ordinarie arbetskatalog eller dess stackmetadata.

## Installation och version

Versionen kräver Git 2.36+ och GitHub CLI 2.0+. Normal installation är
`gh extension install github/gh-stack`.
[README](https://github.com/github/gh-stack/blob/d4ab7ab47e5b3e3708a27c8c42abcdf4bc321419/README.md#installation)

GitHub CLI kan låsa en binär utökning till en tagg med `--pin`.
För ett reproducerbart försök är kommandot därför
`gh extension install github/gh-stack --pin v0.2.0`.
Detta är en installationsanvisning, inte en installation utförd i miljön.
[GitHub CLI:s installationsmanual](https://cli.github.com/manual/gh_extension_install)

Den senaste stabila releasen vid kontrollen är v0.2.1, publicerad
2026-10-09. Den lägger till stöd för `api_host` och rättar identifiering
av repositoryn med egna SSH-värdalias. Dessa förbättringar får inte
tillskrivas v0.2.0.
[Release v0.2.1](https://github.com/github/gh-stack/releases/tag/v0.2.1)

Installationer av stabila releaser utan versionslås kan kontrollera
uppdateringar i bakgrunden och skriva en notis till stderr. De uppdateras
inte automatiskt. `GH_STACK_NO_UPDATE_NOTIFIER=1` stänger av funktionen;
låsta installationer är undantagna.
[Uppdateringskoden](https://github.com/github/gh-stack/blob/d4ab7ab47e5b3e3708a27c8c42abcdf4bc321419/internal/update/update.go)

## Stackmodellen och delad metadata

En stack har en trunk och en ordnad lista av grenar. En grens bas är
föregående gren i listan, eller trunk för den första grenen. Modellen
innehåller ingen allmän beroendegraf med flera föräldrar för samma lager.
Trunk kan delas mellan flera stackar.
[Stackmodellen](https://github.com/github/gh-stack/blob/d4ab7ab47e5b3e3708a27c8c42abcdf4bc321419/internal/stack/stack.go)

Katalogen `<common-dir>/gh-stack` delas mellan länkade worktrees.
Återupptagningsjournalerna `gh-stack-rebase-state` och
`gh-stack-modify-state` finns också i den gemensamma Git-katalogen.
Git behåller eget HEAD, index och pågående Git-operationer per worktree.
Äldre kataloger migreras när definitionerna går att förena, med bevarade
säkerhetskopior; motstridiga definitioner stoppar migreringen. Blanda inte
äldre och nya versioner i samma klon.
[Dokumenterat worktree-stöd](https://github.com/github/gh-stack/blob/d4ab7ab47e5b3e3708a27c8c42abcdf4bc321419/README.md#local-tracking)
och [migreringskoden](https://github.com/github/gh-stack/blob/d4ab7ab47e5b3e3708a27c8c42abcdf4bc321419/internal/stack/migration.go)

Katalogfiler publiceras genom en färdigskriven temporär fil som ersätter
målet. Atomisk filpublicering förhindrar halvskrivna katalogläsningar;
den gör inte en hel operation över flera Git-grenar atomisk.
[Atomiska filskrivningar](https://github.com/github/gh-stack/blob/d4ab7ab47e5b3e3708a27c8c42abcdf4bc321419/internal/stack/atomic.go)

## Registrera agenternas befintliga grenar

`init --base <gren> <gren...>` tar uttryckliga grennamn utan dialog.
Befintliga grenar registreras, saknade skapas. Varje registrerad gren får
en sparad bas från dess merge-base mot föregående lager.

Om den sista grenen redan är utcheckad i en annan worktree rapporteras
dess plats och den anropande arbetskatalogens checkout bevaras. Om den
inte är upptagen kan kommandot byta checkout. Registrering är alltså inte
ett generellt löfte om oförändrad checkout, och är inte samma operation
som att rebase:a oberoende grenar till en verklig kedja.
[Init-koden](https://github.com/github/gh-stack/blob/d4ab7ab47e5b3e3708a27c8c42abcdf4bc321419/cmd/init.go)

`add <gren>` kan registrera en befintlig gren som ägs av en annan
worktree. Genvägar för staging och commit får inte användas vid sådan
registrering. Kommandot arbetar från stackens översta lager; det är inte
en allmän operation för att ansluta godtyckliga noder i en beroendegraf.
[Add-koden](https://github.com/github/gh-stack/blob/d4ab7ab47e5b3e3708a27c8c42abcdf4bc321419/cmd/add.go)

## Operationer över flera worktrees

`rebase` kaskaderar genom stacken och kör ändringar i worktreen som äger
respektive gren. `--upstack`, `--downstack` och ett uttryckligt grennamn
avgränsar vilka lager som berörs. `--no-trunk` hoppar över fetch och
ombasering mot trunk; den första stackgrenen lämnas som ankare för högre
lager. Kommandot flyttar inte automatiskt integrationsgrenens spets till
det översta lagrets resultat.
[Rebase-koden](https://github.com/github/gh-stack/blob/d4ab7ab47e5b3e3708a27c8c42abcdf4bc321419/cmd/rebase.go)

`sync` omfattar fetch, avstämning mot en eventuell fjärrstack,
uppdatering av trunk där det går, ombasering när trunk flyttas, push och
PR-avstämning. Den kan länka befintliga PR:er men skapar inte nya.
Vid ombaseringskonflikt försöker den återställa grenarna och lämnar
konflikten till ett separat `rebase`-flöde. Misslyckad återställning
rapporteras som fel. `sync` är därför mer omfattande än lokal integration.
[Sync-koden](https://github.com/github/gh-stack/blob/d4ab7ab47e5b3e3708a27c8c42abcdf4bc321419/cmd/sync.go)

`modify` kan flytta, vika ihop, lägga till, ta bort och döpa om lager
över worktrees. Ändringar sker hos berörda ägare; andra worktrees byter
inte gren. Borttagna eller hopvikta grenar och deras worktrees bevaras.
Nya ändringsplaner kräver en interaktiv terminal: koden avvisar
icke-interaktiva anrop. Endast `--continue` och `--abort` har egna
återupptagningsvägar utan den inledande terminalkontrollen. Det finns
inget dokumenterat deklarativt gränssnitt för att skicka en ändringsplan.
[Modify-koden](https://github.com/github/gh-stack/blob/d4ab7ab47e5b3e3708a27c8c42abcdf4bc321419/cmd/modify.go)

## Samordning, konflikter och återupptagning

Mutationer tar ett gemensamt operationslås; katalogskrivningar har också
ett eget lås. Låsväntan är normalt fem sekunder. Låsen samordnar
gh-stack-processer, inte agenternas editorer, filskrivningar eller andra
Git-kommandon.
[Låskoden](https://github.com/github/gh-stack/blob/d4ab7ab47e5b3e3708a27c8c42abcdf4bc321419/internal/stack/lock.go)
och [worktree-dokumentationen](https://github.com/github/gh-stack/blob/d4ab7ab47e5b3e3708a27c8c42abcdf4bc321419/README.md#git-worktrees)

Förkontroller stoppar berörda worktrees med osparade ändringar eller
pågående rebase, cherry-pick, merge eller sequencer-operation.
Återupptagning kontrollerar worktree-identitet, ägarskap och kända
referenser. En ren worktree kan fortfarande ha en aktiv agent; verktyget
kan inte bevisa att agenten förblir inaktiv efter kontrollen.
[Worktree-kontexten](https://github.com/github/gh-stack/blob/d4ab7ab47e5b3e3708a27c8c42abcdf4bc321419/internal/worktree/context.go)
och [modify-förkontrollerna](https://github.com/github/gh-stack/blob/d4ab7ab47e5b3e3708a27c8c42abcdf4bc321419/internal/modify/preconditions.go)

En pausad operation blockerar andra mutationer tills den fortsätts eller
avbryts. Konfliktlösning och staging ska göras i den rapporterade
worktreen. `rebase --continue/--abort` och
`modify --continue/--abort` kan anropas från en annan worktree och
använder den registrerade platsen. Journaler ska inte raderas för att
kringgå spärren. Ingen automatisk stash eller skapande/borttagning av
worktrees ingår.
[Operations- och journalspärrar](https://github.com/github/gh-stack/blob/d4ab7ab47e5b3e3708a27c8c42abcdf4bc321419/cmd/worktree_utils.go)
och [återupptagning av rebase](https://github.com/github/gh-stack/blob/d4ab7ab47e5b3e3708a27c8c42abcdf4bc321419/cmd/rebase_worktree.go)

## Automation och observerbart resultat

Särskilda felkoder omfattar 2 för saknad stack, 3 för konflikt,
4 för API-fel, 5 för ogiltiga argument, 6 för tvetydigt val,
7 för pågående rebase, 8 för låsfel, 9 för otillgängliga staplade PR:er
och 10 för en modify-session som kräver återupptagning.
Generella fel kan ge 1. Alla avbrutna eller ofullständiga arbetsflöden
ger emellertid inte en särskild felkod.

Ett viktigt undantag är fjärrstackar som divergerar från den lokala
stacken: icke-interaktiv `sync` rapporterar avbrott men returnerar
framgång. Exit 0 räcker därför inte som bevis för slutförd synkronisering.
[Felkoder och avstämningslogik](https://github.com/github/gh-stack/blob/d4ab7ab47e5b3e3708a27c8c42abcdf4bc321419/cmd/utils.go)

`view --json` ger bland annat trunk, aktuell gren, ordnade lager,
basreferenser, behov av ombasering och PR-status. Det är användbart för
avstämning men verifierar inte acceptanskriterier eller tester.
[JSON-utmatningen](https://github.com/github/gh-stack/blob/d4ab7ab47e5b3e3708a27c8c42abcdf4bc321419/cmd/view.go)

`push` använder explicita `--force-with-lease` per gren. Uppdateringen
är inte atomisk: vissa grenar kan publiceras även om andra avvisas.
Återförsök och avstämning måste hantera detta.
[Push-koden](https://github.com/github/gh-stack/blob/d4ab7ab47e5b3e3708a27c8c42abcdf4bc321419/cmd/push.go)

## Lokalt flöde och valfria pull requests

Lokal stackregistrering kräver inte att en PR skapas. `init` och
`rebase` kan försöka läsa PR-information när en GitHub-klient finns.
Ett lokalt flöde ska därför inte automatiskt beskrivas som nätverksfritt.
[Init-koden](https://github.com/github/gh-stack/blob/d4ab7ab47e5b3e3708a27c8c42abcdf4bc321419/cmd/init.go)
och [PR-avstämningen](https://github.com/github/gh-stack/blob/d4ab7ab47e5b3e3708a27c8c42abcdf4bc321419/cmd/utils.go)

`submit --auto` publicerar och skapar PR:er utan editorn. Nya PR:er blir
utkast om inte `--open` anges. Det är en uttrycklig publiceringsoperation.
`link` kan länka grenar eller befintliga PR:er utan lokal stackmetadata,
men kan också pusha grenar, skapa PR:er och rätta deras basgrenar.
[Submit-koden](https://github.com/github/gh-stack/blob/d4ab7ab47e5b3e3708a27c8c42abcdf4bc321419/cmd/submit.go)
och [link-koden](https://github.com/github/gh-stack/blob/d4ab7ab47e5b3e3708a27c8c42abcdf4bc321419/cmd/link.go)

Staplade PR:er måste vara tillgängliga för aktuellt repository och den
autentiserade klienten. `submit` kontrollerar stödet innan publicering.
Om kontrollen misslyckas stoppar ett icke-interaktivt anrop med kod 9;
interaktiv körning kan erbjuda vanliga PR:er i stället. Denna granskning
fastställer inte tillgången för Skyttels repository.
[Tillgänglighetskontrollen](https://github.com/github/gh-stack/blob/d4ab7ab47e5b3e3708a27c8c42abcdf4bc321419/cmd/submit.go#L121-L145)

`merge --yes` är en separat fjärroperation. GitHub tillämpar
repositoryts regler; en merge queue kan behandla de valda PR:erna i
separata grupper. Verktygets PR-status ersätter därför inte Skyttels
krav på verifiering av det integrerade resultatet före ärendestängning.
[Merge-koden](https://github.com/github/gh-stack/blob/d4ab7ab47e5b3e3708a27c8c42abcdf4bc321419/cmd/merge.go)

## Slutsatser för kommande beslut

Följande är slutsatser från fakta ovan, inte ett införandebeslut:

- Worktree-stödet tar bort kravet att samla alla stackgrenar i samma
  checkout. Det tar inte över planering av beroendegrafen.
- Två syskongrenar från samma bas och ett gemensamt efterföljande steg
  kräver ett uttryckligt integrationsval. En linjär stack avgör inte
  hur resultaten ska förenas på integrationsgrenen.
- Agenternas överlämning och vila behöver ett eget protokoll.
  Verktygslås och rena arbetskataloger räcker inte som agentlås.
- En kandidat som kräver `modify` för löpande automatisk omstrukturering
  behöver hantera dess terminalkrav eller välja en annan väg.
- Utförda tester och granskningar måste knytas till de commits som faktiskt
  integreras. gh-stack kör inga av Skyttels acceptanskontroller.
- PR-spåret kan bedömas separat från lokal stackhantering.

Nyttan i färre konflikter, färre manuella steg eller lättare återställning
är ännu inte uppmätt. Nästa försök behöver jämföra samma scenario mot
cherry-pick-baslinjen och omfatta konflikter, agentaktivitet och avbrott.
Källkodskontrollen ger inget påstående om att den praktiska jämförelsen
är genomförd.

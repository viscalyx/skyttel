# GitHubs garantier vid manuell sammanslagning av en PR-stack

Underlaget riktar sig till den som beslutar om ett nytt arbetsflöde för
`implement-batch`. Det bedömer om manuell sammanslagning genom GitHubs
webbgränssnitt eller verktyg kan skydda en granskad batch fram till
införandet, utan eget mergekommando eller skrivpaus.

## Bedömning

Tillräckligt skydd för **hela det granskade underlaget** kan inte beläggas
i de undersökta primärkällorna. GitHub dokumenterar skydd av den begärda
PR:ens huvudcommit under den asynkrona operationen, även när klienten
utelämnar `sha`. Det är starkare än enbart en förkontroll. Det dokumenterar
däremot inte att den granskade målcommitten, varje lägre grentopp och
stackens medlemskap förblir bundna till godkännandet. Frånvaro av sådan
dokumentation bevisar inte att servern saknar ytterligare skydd.
[Asynkront API][async]

GitHubs egna texter ger dessutom motstridiga besked om ett misslyckat
stackinförande kan lämna lägre lager införda. Referensen och API-guiden
beskriver atomiskt införande; felsökningsguiden beskriver ett delresultat
som blir kvar. Den motsägelsen måste klaras ut innan atomisk synlighet
kan behandlas som en entydigt dokumenterad garanti för kandidaten.
[Referens][reference], [API-guide][api-guide], [felsökning][troubleshooting]

## Omfattning, krav och källversioner

Hela batchen ska granskas och verifieras innan någon del förs in i
`main`. Användaren utför slutlig sammanslagning av hela stacken.
Ändrad målcommit eller ändrat batchunderlag kräver ny bedömning före
införande. En efterkontroll får upptäcka avvikelser men ersätter inte
skyddet före införandet. Detta är bedömningskrav, inte påståenden om
GitHubs befintliga funktioner.

Undersökningen använder läsning av dokumentation, versionslåst klientkod
och publicerade API-scheman. Inga muterande mergeprov, ändrade
repositoryinställningar eller kontakter med utomstående ingår.

- GitHub Docs avläses 2026-10-24. Källtexterna kontrolleras även i
  `github/docs`, revision
  `02c25d16369fe27f9bdb28d1201f6b452f0d21dd`. De länkar som heter
  källtext eller schema pekar på den revisionen. Dokumentationen
  beskriver en föränderlig tjänst, inte en versionslåst server.
- REST-schemat gäller `fpt-2026-03-10`, det vill säga GitHub.com och
  API-version `2026-03-10`. [Publicerat schema][schema]
- Klientpåståenden gäller gh-stack v0.2.0, commit
  `d4ab7ab47e5b3e3708a27c8c42abcdf4bc321419`. Senare klientversioner
  ingår inte. [Klientkod][client]

## Vad som skyddas vid olika tidpunkter

Med **granskat underlag** avses målcommit, ordnad lista av PR:er och
deras grentoppar samt tillhörande granskning och verifiering. Det är
skilt från serverns aktuella stack och en enskild PR:s aktuella diff.

En skrivskyddad förkontroll kan jämföra detta underlag med serverns
läge. Den genomför ingen villkorad skrivning och ger därför i sig ingen
garanti om senare ändringar. Detta är en slutsats om kontrollens
omfattning, inte ett observerat fel i GitHub.

### Det asynkrona API:t

Native stackmerge använder `PUT .../pulls/{pull_number}/merge-async`.
Begäran omfattar den valda PR:en och dess öppna lägre lager.
Grundtillstånd kontrolleras vid mottagandet; grenregler bedöms när
operationen körs. [API-guide][api-guide]

Fältet `sha` anger den huvudcommit som den begärda PR:en måste ha.
Om fältet saknas används dess huvudcommit vid begäran; en push till
den PR:en före körningen avbryter sammanslagningen enligt dokumentationen.
Det skyddar alltså tiden från begäran till körning. Det binder inte
automatiskt begäran till den commit som granskades tidigare.
[Asynkront API][async], [publicerat schema][schema]

Det publicerade schemat erbjuder inget separat villkor för förväntad
målcommit, lista av alla grentoppar eller stackversion. `expected_head_sha`
i det väntande svaret avser den begärda PR:ens huvudcommit. Schemat
anger inte om lägre lager och medlemskap låses, avläses en gång eller
omprövas under operationen. Slutsatsen är **ej belagt**, inte omöjligt.
[Publicerat schema][schema]

### Webbgränssnitt och gh-stack v0.2.0

GitHubs mergepanel visar hela stackens status. Valet av översta PR
tar med de osammanslagna lagren under den. Webbvägledningen beskriver
ingen kontroll där användaren anger granskad mål-SHA eller en bestämd
lista av lager. Vilka ytterligare villkor webbläsaren skickar och hur
servern binder dem är inte dokumenterat där. [Webbflödet][web]

V0.2.0 skickar endast `merge_method` och `merge_action` i
`MergeStackAsync`. Klienten överför alltså inte en tidigare granskad
huvudcommit som `sha`. Detta betyder inte att serverns dokumenterade
standardvillkor under körningen försvinner. [Klientkod][client]

Den versionens direkta flöde skickar **en** asynkron begäran för den
valda översta PR:en och läser sedan resultatet. Det är ingen klientloop
som slår samman varje lager separat. Kodens meddelande om atomiskt
införande är ett klientantagande, inte insyn i serverimplementationen.
[Mergekommandot][command]

## Grenregler, kontroller och godkännanden

GitHub utvärderar rotgrenens regler för varje lager. Högre PR:er kräver
att lägre lager också uppfyller reglerna och att stackens historia är
linjär. En ändrad lägre gren eller målgren kan kräva ombasering.
[Stackreferens][reference]

Obligatoriska kontroller med strikt uppdateringskrav hindrar införande
av en gren som ligger efter sin bas. Ogiltigförklaring av gamla
godkännanden följer ändringar i granskad diff och mergebas.
Regler kan kräva nya godkännanden och kontroller; de uttrycker inte
automatiskt den här batchens fullständiga specifikationsgranskning.
[Skyddade grenar][protection]

För stackar behålls godkännanden vid ombasering när diffen inte ändras,
även med regeln för ogiltigförklaring aktiverad. Oförändrad diff är
därför skild från oförändrad målcommit. [Ombasering][reference]

En egen obligatorisk kontroll skulle kunna läsa ett registrerat
batchunderlag, men dess lyckade avläsning är inte ensam ett skydd mot
senare ändringar. Källorna belägger inte att en sådan kontroll automatiskt
ogiltigförklaras för varje relevant ändring av mål eller medlemskap
under körningen. Någon färdig rekommenderad kontroll följer därför inte
av undersökningen. Detta är en avgränsning av bevisläget.

## Motsägelsen om atomiskt införande

Den versionslåsta stackreferensen säger
“land as a single atomic operation”. Den separata API-guiden beskriver
också allt eller inget för den asynkrona serveroperationen.
[Referensens källtext][reference-source], [API-guidens källtext][api-source]

Felsökningsguidens avsnitt om avbruten sammanslagning säger samtidigt
“Pull requests below it that merged successfully remain landed on the base branch.”
Det beskriver misslyckat införande med kvarvarande lägre lager och råder
till nytt försök för resten. [Felsökningens källtext][troubleshooting-source]

Avsnittet anger inte att det bara gäller separata användarinitierade
delmerger, en sekventiell extern klient eller mergekö. Texten är ett
allmänt avsnitt om inbyggda stackar. Att tolka bort motsägelsen med någon
av dessa förklaringar saknar därför stöd i de undersökta texterna.
Även köbeskrivningarna skiljer sig: referensen flyttar en för stor stack
som en helhet, medan felsökningen tillåter uppdelning mellan grupper.
[Referens][reference], [felsökning][troubleshooting]

Direkt sammanslagning och köläggning måste följaktligen bedömas var för
sig. Ett atomiskt beslut att lägga gruppen i kö bevisar inte i sig
atomisk synlighet när kön senare inför resultatet. De lästa källorna
räcker inte för ett entydigt besked om samtliga felutfall.

## Om mergesvaret saknas

Med känt UUID kan resultatet läsas via
`GET .../merge-async/{uuid}`. `pending` kräver fortsatt avläsning.
`enqueued` avslutar begäran men bevisar bara köläggning; PR:ernas slutliga
merge måste följas separat. Resultatet finns kvar i 24 timmar efter
senaste uppdateringen. Ett senare `404` bevisar därför inte att inget
infördes. [Resultat-API][result]

Om en begäran redan pågår returnerar ett nytt anrop `409` med den
befintliga operationens UUID och alternativ. Det är inte dokumenterat
som en allmän idempotensnyckel för batchunderlaget. Utan första svaret
kan ett nytt muterande anrop därför inte behandlas som en ofarlig
läsning. [Asynkront API][async]

Resultatets dokumenterade läsanrop kräver UUID. De undersökta API-texterna
beskriver inget särskilt läsanrop som hittar en pågående operation från
enbart PR-numret när UUID saknas. PR:ernas merge-status och målgrenens
innehåll kan fortfarande undersökas, men ett ännu öppet tillstånd
fastställer inte att ingen serveroperation pågår. [Resultat-API][result]

V0.2.0 omvandlar `409` till fel och återvinner inte UUID från felsvaret.
Vid fel under avläsning eller när väntan tar slut bekräftar klienten
inte att serveroperationen avbryts. [Felhantering][client],
[väntan i mergekommandot][command]

Rekommenderad återupptagning är därför att bevara känt UUID och
granskningsunderlag, läsa operationens status när det går och stämma av
samtliga PR:er samt faktiskt målresultat före återförsök eller städning.
Vid okänt resultat behövs utredning; varken nätverksfel eller ett
felmeddelande från klienten bevisar att målet är oförändrat. Denna
efterkontroll upptäcker fel och avgör fortsatt arbete, men förebygger
inte ett redan felaktigt införande.

## Återstående besked och isolerade prov

För att rekommendera kandidaten med de oförändrade kraven behövs ett
entydigt officiellt besked om:

1. Vilken text som gäller för direkt atomisk stackmerge vid serverfel,
   och om fel kan lämna några av de valda lagren införda.
2. Om den asynkrona begäran låser eller villkorar målcommit, lägre
   grentoppar och ordnad medlemslista, samt vid vilka tidpunkter.
3. Vilka av dessa villkor det manuella webbflödet använder och om de
   binds till granskat underlag eller enbart aktuellt läge vid klicket.

En framtida, separat godkänd prototyp kan visa observerat beteende i
ett isolerat testrepository. För varje variant behövs exakt före- och
efterläge samt serveroperationens identitet och utfall:

- Flytta målet efter granskning respektive efter accepterad begäran.
- Ändra översta grentoppen före begäran respektive medan den väntar.
- Ändra en lägre grentopp utan att ändra den översta.
- Lägg till, ta bort eller ordna om lager mellan granskning och merge;
  undersök särskilt om ett tillagt lager ovanför vald PR utesluts.
- Prova ombasering med oförändrad diff men ny målcommit och observera
  vilka godkännanden och kontroller som fortfarande räknas.
- Tappa svaret efter skickad begäran och efter accepterat UUID; följ
  resultatet utan blind upprepning. Köutfall prövas separat.

Ett lyckat prov ger observationer för just dessa förlopp. Det bevisar
inte att alla kapplöpningar är uteslutna. Om tillräckligt skydd fortsatt
saknar stöd måste den begränsningen följa med till införandebeslutet;
kraven får inte tyst ersättas med enbart för- och efterkontroll.

[async]: https://docs.github.com/en/rest/pulls/pulls?apiVersion=2026-03-10#merge-a-pull-request-asynchronously
[result]: https://docs.github.com/en/rest/pulls/pulls?apiVersion=2026-03-10#get-the-result-of-an-asynchronous-merge
[schema]: https://github.com/github/docs/blob/02c25d16369fe27f9bdb28d1201f6b452f0d21dd/src/rest/data/fpt-2026-03-10/pulls.json
[reference]: https://docs.github.com/en/pull-requests/reference/stacked-pull-requests
[reference-source]: https://github.com/github/docs/blob/02c25d16369fe27f9bdb28d1201f6b452f0d21dd/content/pull-requests/reference/stacked-pull-requests.md
[api-guide]: https://docs.github.com/en/pull-requests/reference/stacked-pull-requests-apis-and-webhooks#merge-api
[api-source]: https://github.com/github/docs/blob/02c25d16369fe27f9bdb28d1201f6b452f0d21dd/content/pull-requests/reference/stacked-pull-requests-apis-and-webhooks.md
[troubleshooting]: https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/troubleshooting-stacked-pull-requests#merging-stopped-partway-through-the-stack
[troubleshooting-source]: https://github.com/github/docs/blob/02c25d16369fe27f9bdb28d1201f6b452f0d21dd/content/pull-requests/how-tos/merge-and-close-pull-requests/troubleshooting-stacked-pull-requests.md
[protection]: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches
[web]: https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/merging-stacked-pull-requests
[client]: https://github.com/github/gh-stack/blob/d4ab7ab47e5b3e3708a27c8c42abcdf4bc321419/internal/github/merge_async.go#L207-L253
[command]: https://github.com/github/gh-stack/blob/d4ab7ab47e5b3e3708a27c8c42abcdf4bc321419/cmd/merge.go#L378-L451

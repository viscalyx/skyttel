# Verifieringsrapport för hushållets nya arbetsytor

Rapporten hjälper testare och granskare att följa de 25 beslutade
kravområdena och de åtta fullständiga arbetskedjorna i
[specifikation #244](https://github.com/viscalyx/skyttel/issues/244) och
[slutverifiering #259](https://github.com/viscalyx/skyttel/issues/259).
Den länkar faktisk kod, offentliga provgränser och befintliga manuella fall.
Den ersätter inte de bindande besluten eller områdesfallens körbara steg.

**Status: förberett granskningsunderlag, inte slutlig acceptans.**
Slutlig källversion, hela kontrollkörningen, nya visuella jämförelser,
prestandabedömning och oberoende slutgranskningar **VÄNTAR**.
Fysiska hjälpmedels-, telefon- och förstoringstester är **INTE UTFÖRDA**.

## Provdata, miljö och metod

- Kravkartans kod och fall motsvarar
  `b4b379e4b1ef902d5f56f11122958c6b0467105c`.
  Filernas existens samt samtliga 33 primärtitlars exakta överensstämmelse
  med testupptäckt och manuella hänvisningar är kontrollerade.
- [Provinstallationen](../../tests/support/installation.ts) ger riktig
  SQLite och offentlig HTTP i en isolerad databas. Syntetisk extern
  inloggning går genom riktiga återanrop och beständiga sessioner.
  Alex och Robin har de roller och hushåll som respektive områdesfall anger.
  Fullständig export, återimport och radering använder administratörsåtkomst.
- Modell-, mikrofon- och medieleverantörer ersätts endast vid sina externa
  gränser. Hållna och tappade HTTP-svar kontrollerar verklig lagring och
  återhämtning. Inga komponenttillstånd eller direkta databasändringar
  används som ersättning för arbetsflödenas observerbara utfall.
- Den dokumenterade grundkörningen på
  `4ecb6444cbf79985b3348139be5a991285a98ed6` omfattar 713 integrationstest:
  **689 godkända och 24 underkända**. Det är inte ett godkänt slutprov.
  Tabellens resultatkolumn avser endast det namngivna primärfallet i
  denna körning; ett godkänt primärfall betyder inte att hela kravområdet
  eller den slutliga sammanfogade versionen är godkänd.
- Grundmiljön är Linux med Playwright 1.63.0, dess Chromium,
  Node 24.21.0, npm 12.0.2 och två arbetare. En separat mätning anger
  Chromium 153.0.8010.12. Slutkörningens exakta webbläsare och byggversion
  **VÄNTAR**. Prov med Chromium är inte fysiska Chrome-prov.
- Använd [testguiden](../development/testing.md) för körning och rapporter.
  Följ områdesfallens angivna användare, förberedelser och återställning;
  [utvecklingsguiden](../development/devcontainer.md) ger provinstallationen.
  Använd syntetiska personuppgifter och separata provdatabaser.

## De 25 beslutade kravområdena

Varje primärfall är en ingång till underlaget, inte en ensam bevisning av
hela området. Kolumnen med omfattning anger även kompletterande fall.
Exakta engelska testtitlar behålls för att kunna återfinna körningarna.
Slutligt sammanlagt resultat för varje rad **VÄNTAR**.

<!-- markdownlint-disable MD013 -->
| Beslutsområde | Exakt primärfall | Faktiska filer och manuella fall | Omfattning och grundresultat |
| --- | --- | --- | --- |
| 1. Samlat införande och ansvar | [workspace-shell.spec.ts](../../tests/integration/workspace-shell.spec.ts) — “YTA-01: map tools protect unsent object loss and preserve staged work when closed” | Provgränser: [installation.ts](../../tests/support/installation.ts), [client.ts](../../tests/support/client.ts); Kod: [HouseholdMap.tsx](../../src/client/HouseholdMap.tsx), [WorkspaceTools.tsx](../../src/client/WorkspaceTools.tsx), [App.tsx](../../src/client/App.tsx); Manuella fall: [workspace-shell.md](workspace-shell.md), [workspace-panels.md](workspace-panels.md) | Ny nåbar plats för behållna funktioner; Inställningar innehåller typdefinitioner. Avvecklade paneler har inga produktionsingångar. Primärfallet är godkänt i grundkörningen. |
| 2. Moduler och bevarat hushållsarbete | [household-work.spec.ts](../../tests/integration/household-work.spec.ts) — “ARBETE-02: conversation and microphone survive navigation and end on logout” | Provgränser: [installation.ts](../../tests/support/installation.ts), [live-browser.ts](../../tests/support/live-browser.ts), [live-provider.ts](../../tests/support/live-provider.ts); Kod: [HouseholdMap.tsx](../../src/client/HouseholdMap.tsx), [use-household-work.ts](../../src/client/use-household-work.ts), [use-conversation.ts](../../src/client/use-conversation.ts), [SpatialMap.tsx](../../src/client/SpatialMap.tsx); Manuella fall: [household-work.md](household-work.md), [personal-view.md](personal-view.md) | En ägare behåller utkast, samtal, oskickad text, urval och kamera. Även ARBETE-05/06, PANEL-01–05/08 och TEXT-08 ingår. Primärfallet är godkänt i grundkörningen. |
| 3. Befintlig domän och persistens | [draft-save.spec.ts](../../tests/integration/draft-save.spec.ts) — “UTKAST-38: a lost save response keeps proposals until the same durable attempt is checked from the table” | Provgränser: [installation.ts](../../tests/support/installation.ts), [draft-save.ts](../../tests/support/draft-save.ts); Kod: [server/map.ts](../../src/server/map.ts), [server/map-routes.ts](../../src/server/map-routes.ts), [server/map-operations.ts](../../src/server/map-operations.ts), [shared/map.ts](../../src/shared/map.ts); Manuella fall: [save-check.md](save-check.md), [drafts.md](drafts.md), [household-recovery.md](household-recovery.md) | Serverns åtkomst, ägare, versioner och domänvillkor; hela utkastet sparas atomiskt med ett beständigt försök och kvitto. Primärfallet är godkänt i grundkörningen. |
| 4. Bindande designreferenser | [draft-review.spec.ts](../../tests/integration/draft-review.spec.ts) — “UTKAST-31: long unbroken field labels wrap in full draft reading at 320 CSS pixels” | Provgränser: [installation.ts](../../tests/support/installation.ts), [draft-review.ts](../../tests/support/draft-review.ts), [conflict-special.ts](../../tests/support/conflict-special.ts); Kod: [ObjectDialog.tsx](../../src/client/ObjectDialog.tsx), [HouseholdTable.tsx](../../src/client/HouseholdTable.tsx), [ConflictDialog.tsx](../../src/client/ConflictDialog.tsx), [DraftReview.tsx](../../src/client/DraftReview.tsx); Manuella fall: [map.md](map.md), [object-lists.md](object-lists.md), [drafts.md](drafts.md) | Bindande A/C/D jämförs separat. Formulär, tabell, fulla läsare, fyra utkastkolumner och stödmodaler ingår. Primärfallet är godkänt i grundkörningen. |
| 5. Tabellens läsläge | [household-table.spec.ts](../../tests/integration/household-table.spec.ts) — “TABELL-02: full saved and proposed details distinguish every lifecycle and proposal status” | Provgränser: [installation.ts](../../tests/support/installation.ts), [household-table.ts](../../tests/support/household-table.ts); Kod: [HouseholdTable.tsx](../../src/client/HouseholdTable.tsx), [ObjectReadDetails.tsx](../../src/client/ObjectReadDetails.tsx), [read-field-values.ts](../../src/client/read-field-values.ts); Manuella fall: [object-lists.md#tabell-02-sparade-och-föreslagna-värden-har-tydliga-skilda-statusar](object-lists.md#tabell-02-sparade-och-föreslagna-värden-har-tydliga-skilda-statusar) | Sparat och föreslaget värde, bilder, dolda fält, ekonomiska uppgifter, status och skillnaden mellan okänt och saknat. Primärfallet är godkänt i grundkörningen. |
| 6. Tabellens ordning och återgång | [household-table.spec.ts](../../tests/integration/household-table.spec.ts) — “TABELL-01: Swedish natural sorting, pagination and expanded rows survive map visits” | Provgränser: [installation.ts](../../tests/support/installation.ts), [household-table.ts](../../tests/support/household-table.ts), [workspace-browser.ts](../../tests/support/workspace-browser.ts); Kod: [HouseholdTable.tsx](../../src/client/HouseholdTable.tsx), [HouseholdMap.tsx](../../src/client/HouseholdMap.tsx); Manuella fall: [object-lists.md](object-lists.md) | Svensk naturlig ordning, 50 rader per sida, öppna rader, rullning och användbar återgång. LISTA-05 täcker Inställningar. Primärfallet är godkänt i grundkörningen. |
| 7. Visa i kartan | [map-exploration.spec.ts](../../tests/integration/map-exploration.spec.ts) — “SÖK-06: map search shows direct context and exploration preserves hits through return and table visits” | Provgränser: [installation.ts](../../tests/support/installation.ts), [map-exploration.ts](../../tests/support/map-exploration.ts); Kod: [HouseholdMap.tsx](../../src/client/HouseholdMap.tsx), [SpatialMap.tsx](../../src/client/SpatialMap.tsx), [map-search-context.ts](../../src/client/map-search-context.ts); Manuella fall: [object-lists.md](object-lists.md), [spatial-map.md](spatial-map.md) | Endast uttrycklig visning återställer kartans filter och kamera. SÖK-08 täcker vybredder; LISTA-04 verklig grafikförlust. Primärfallet är godkänt i grundkörningen. |
| 8. Sökningens kontrakt | [object-search.spec.ts](../../tests/integration/object-search.spec.ts) — “SÖK-01: own detail fields, every word and Swedish normalization find objects” | Provgränser: [installation.ts](../../tests/support/installation.ts), [object-search.ts](../../tests/support/object-search.ts); Kod: [ObjectSearch.tsx](../../src/client/ObjectSearch.tsx), [ObjectReadDetails.tsx](../../src/client/ObjectReadDetails.tsx), [HouseholdMap.tsx](../../src/client/HouseholdMap.tsx); Manuella fall: [object-lists.md](object-lists.md) | Egna sparade och föreslagna fält, ekonomisk text, alla ord och svensk normalisering; andra objekts uppgifter ger inga falska träffar. Primärfallet är godkänt i grundkörningen. |
| 9. Filter | [object-search.spec.ts](../../tests/integration/object-search.spec.ts) — “SÖK-04: the last proposal resets only draft filters in both views and type-only proposals expose them” | Provgränser: [installation.ts](../../tests/support/installation.ts), [object-search.ts](../../tests/support/object-search.ts); Kod: [HouseholdMap.tsx](../../src/client/HouseholdMap.tsx), [HouseholdTable.tsx](../../src/client/HouseholdTable.tsx), [ObjectSearch.tsx](../../src/client/ObjectSearch.tsx); Manuella fall: [object-lists.md](object-lists.md), [drafts.md](drafts.md) | Oberoende filter, även förslag som bara ändrar typer. Sista förslagets bortfall återställer endast utkastfiltret. Primärfallet är godkänt i grundkörningen. |
| 10. Sökingångar | [object-search.spec.ts](../../tests/integration/object-search.spec.ts) — “SÖK-03: map-only character and composition entry preserve separate searches and Escape restrictions” | Provgränser: [installation.ts](../../tests/support/installation.ts), [object-search.ts](../../tests/support/object-search.ts); Kod: [SpatialMap.tsx](../../src/client/SpatialMap.tsx), [HouseholdMap.tsx](../../src/client/HouseholdMap.tsx), [ObjectSearch.tsx](../../src/client/ObjectSearch.tsx); Manuella fall: [object-lists.md](object-lists.md) | Tecken och komposition från kartan, åtskilda sökningar, formulär och meddelanden, Escape och behållna filter. Primärfallet är underkänt i grundkörningen; slutligt omprov VÄNTAR. |
| 11. Kartutforskning | [map-exploration.spec.ts](../../tests/integration/map-exploration.spec.ts) — “SÖK-07: direct context ignores hit filters while ended objects and edges require inclusion” | Provgränser: [installation.ts](../../tests/support/installation.ts), [map-exploration.ts](../../tests/support/map-exploration.ts); Kod: [map-search-context.ts](../../src/client/map-search-context.ts), [HouseholdMap.tsx](../../src/client/HouseholdMap.tsx), [SpatialMap.tsx](../../src/client/SpatialMap.tsx); Manuella fall: [object-lists.md](object-lists.md) | En direkt länk från träffarna, tidigare ändpunkter, upphörda uppgifter och upprepad utforskning; SÖK-06–09 ingår. Primärfallet är underkänt i grundkörningen; slutligt omprov VÄNTAR. |
| 12. Objektdialoger | [object-dialog.spec.ts](../../tests/integration/object-dialog.spec.ts) — “KARTA-11: closed-section errors preserve all fields and focus the linked correction” | Provgränser: [installation.ts](../../tests/support/installation.ts), [client.ts](../../tests/support/client.ts); Kod: [ObjectDialog.tsx](../../src/client/ObjectDialog.tsx), [object-editor.ts](../../src/client/object-editor.ts), [form-validation.ts](../../src/client/form-validation.ts); Manuella fall: [map.md](map.md), [object-types.md](object-types.md), [profile-images.md](profile-images.md) | Hela objektformuläret, slutna avsnitt, länkade valideringsfel, egna fält, typförlust, profilbilder och atomiskt tillägg. KARTA-10–19 ingår. Primärfallet är godkänt i grundkörningen. |
| 13. Sambandsdialogen | [relationship-dialog.spec.ts](../../tests/integration/relationship-dialog.spec.ts) — “SAMBAND-05: full relationship values survive canceled type loss and absent targets keep their distinct meanings” | Provgränser: [installation.ts](../../tests/support/installation.ts), [relationship-fixture.ts](../../tests/support/relationship-fixture.ts); Kod: [HouseholdReadDialog.tsx](../../src/client/HouseholdReadDialog.tsx), [RelationshipForm.tsx](../../src/client/RelationshipForm.tsx), [RelationshipReadDetails.tsx](../../src/client/RelationshipReadDetails.tsx); Manuella fall: [relationships.md](relationships.md), [relationship-types.md](relationship-types.md) | Fullständiga ändpunkter, typ, riktning, kännedom, egna fält och giltighet. Samma ordinarie dialog från objekt och tabell. Primärfallet är godkänt i grundkörningen. |
| 14. Ett samband åt gången | [relationship-dialog.spec.ts](../../tests/integration/relationship-dialog.spec.ts) — “SAMBAND-01: separate complete objects connect and remain independently editable in the shared dialog” | Provgränser: [installation.ts](../../tests/support/installation.ts), [relationship-fixture.ts](../../tests/support/relationship-fixture.ts); Kod: [RelationshipForm.tsx](../../src/client/RelationshipForm.tsx), [server/map.ts](../../src/server/map.ts), [shared/relationship-label.ts](../../src/shared/relationship-label.ts); Manuella fall: [relationships.md](relationships.md) | Två separata objekt före sambandet. SAMBAND-02–04/07/10 täcker oberoende förslag, dubbletter, borttagning och upphörande. Primärfallet är godkänt i grundkörningen. |
| 15. Läsning utan kartgrafik | [household-reading.spec.ts](../../tests/integration/household-reading.spec.ts) — “LÄS-01: keyboard follows Alex to bicycle to garage and back without graphics or lost table state” | Provgränser: [installation.ts](../../tests/support/installation.ts), [household-reading.ts](../../tests/support/household-reading.ts); Kod: [HouseholdReadDialog.tsx](../../src/client/HouseholdReadDialog.tsx), [ObjectReadDetails.tsx](../../src/client/ObjectReadDetails.tsx), [RelationshipReadDetails.tsx](../../src/client/RelationshipReadDetails.tsx); Manuella fall: [object-lists.md](object-lists.md) | Alex → cykel → garage och tillbaka utan grafik; saknat mål ger ingen falsk länk. LISTA-07 täcker textuell borttagning. Primärfallet är godkänt i grundkörningen. |
| 16. Formulärförlust och oklart tillägg | [relationship-outcome-absence.spec.ts](../../tests/integration/relationship-outcome-absence.spec.ts) — “SAMBAND-15: absent stale editing cannot overwrite or remove a later same-owner relationship proposal” | Provgränser: [installation.ts](../../tests/support/installation.ts), [relationship-fixture.ts](../../tests/support/relationship-fixture.ts); Kod: [FormLeave.tsx](../../src/client/FormLeave.tsx), [ObjectDialog.tsx](../../src/client/ObjectDialog.tsx), [RelationshipForm.tsx](../../src/client/RelationshipForm.tsx), [App.tsx](../../src/client/App.tsx), [server/relationship-form-attempts.ts](../../src/server/relationship-form-attempts.ts); Manuella fall: [relationships.md](relationships.md), [map.md](map.md), [household-work.md](household-work.md) | Endast oskickade formulärändringar får kastas. KARTA-15–18 och SAMBAND-06–10/14/15 täcker väntan, oklart utfall och nyare oberoende förslag. Primärfallet är godkänt i grundkörningen. |
| 17. Utkastets ingång och utseende | [draft-review.spec.ts](../../tests/integration/draft-review.spec.ts) — “UTKAST-91: empty and type-only drafts preserve unsent text and first send asks consent once” | Provgränser: [installation.ts](../../tests/support/installation.ts), [draft-review.ts](../../tests/support/draft-review.ts), [text-model.ts](../../tests/support/text-model.ts); Kod: [DraftReview.tsx](../../src/client/DraftReview.tsx), [ConversationDraft.tsx](../../src/client/ConversationDraft.tsx), [WorkspaceTools.tsx](../../src/client/WorkspaceTools.tsx), [HouseholdMap.tsx](../../src/client/HouseholdMap.tsx); Manuella fall: [drafts.md](drafts.md), [conversation-consent.md](conversation-consent.md) | Tomt utkast och enbart typförslag; UTKAST-90 visar fyra kolumner och ikoner. Textingången startar inte AI eller medgivande. Primärfallet är godkänt i grundkörningen. |
| 18. Granskning och borttagning i utkastet | [draft-removal.spec.ts](../../tests/integration/draft-removal.spec.ts) — “UTKAST-41: independent removal preserves other proposals and history and focuses the next control” | Provgränser: [installation.ts](../../tests/support/installation.ts), [draft-review.ts](../../tests/support/draft-review.ts), [draft-removal.ts](../../tests/support/draft-removal.ts); Kod: [DraftReview.tsx](../../src/client/DraftReview.tsx), [DraftProposalDetails.tsx](../../src/client/DraftProposalDetails.tsx), [DraftDiscardDialog.tsx](../../src/client/DraftDiscardDialog.tsx), [server/map.ts](../../src/server/map.ts); Manuella fall: [drafts.md](drafts.md), [object-types.md](object-types.md) | Alla fyra förslagskategorier läses fullständigt. UTKAST-27/90, 42–44 och 47/48 täcker beroenden, avbrott och aktuellt underlag; TYP-12 täcker ordning, 0 och Nej. Primärfallet är godkänt i grundkörningen. |
| 19. Sparmodal och återhämtning | [draft-save.spec.ts](../../tests/integration/draft-save.spec.ts) — “UTKAST-40: a verified receipt closes the save dialog despite a failed map refresh and never repeats its announcement” | Provgränser: [installation.ts](../../tests/support/installation.ts), [draft-save.ts](../../tests/support/draft-save.ts), [scripts/manual-transport.ts](../../scripts/manual-transport.ts); Kod: [DraftSaveDialog.tsx](../../src/client/DraftSaveDialog.tsx), [use-household-work.ts](../../src/client/use-household-work.ts), [use-save-toast.ts](../../src/client/use-save-toast.ts), [server/map-operations.ts](../../src/server/map-operations.ts); Manuella fall: [drafts.md](drafts.md), [operations.md](operations.md), [save-check.md](save-check.md) | UTKAST-36–40 skiljer väntande, oklart, avvisat och genomfört utfall; samma beständiga försök, tresekunderstoast, hämtningsfel efter framgång och ingen dubbel historik. Primärfallet är godkänt i grundkörningen. |
| 20. Konfliktingång och egenskapsval | [conflict-properties.spec.ts](../../tests/integration/conflict-properties.spec.ts) — “UTKAST-29: invalid relationship property combinations keep every choice until corrected” | Provgränser: [installation.ts](../../tests/support/installation.ts), [conflict-properties.ts](../../tests/support/conflict-properties.ts); Kod: [ConflictDialog.tsx](../../src/client/ConflictDialog.tsx), [shared/conflict-properties.ts](../../src/shared/conflict-properties.ts), [server/map.ts](../../src/server/map.ts); Manuella fall: [drafts.md](drafts.md) | UTKAST-28–30/34/35 täcker blandade val, ogiltiga kombinationer, nytt underlag, faktiska fältnamn och verkliga aktörer per egenskap. Primärfallet är godkänt i grundkörningen. |
| 21. Konflikternas specialfall | [conflict-external-corrections.spec.ts](../../tests/integration/conflict-external-corrections.spec.ts) — “UTKAST-65: an incompatible historical field is corrected in the ordinary object form before fresh conflict assessment” | Provgränser: [installation.ts](../../tests/support/installation.ts), [conflict-special.ts](../../tests/support/conflict-special.ts), [conflict-archive.ts](../../tests/support/conflict-archive.ts); Kod: [SpecialConflictDetails.tsx](../../src/client/SpecialConflictDetails.tsx), [ConflictDialog.tsx](../../src/client/ConflictDialog.tsx), [shared/conflict-special.ts](../../src/shared/conflict-special.ts), [shared/conflict-effects.ts](../../src/shared/conflict-effects.ts), [server/map.ts](../../src/server/map.ts); Manuella fall: [drafts.md](drafts.md), [object-types.md](object-types.md), [relationship-types.md](relationship-types.md) | UTKAST-57–78, TYP-03 och STY-05 täcker borttagning, dubbletter, saknade referenser och typer, datatyper, vanlig rättelse och samtidiga hinder. Återställning kräver faktisk borttagen definition. Primärfallet är godkänt i grundkörningen. |
| 22. Konfliktlösningens serverkontrakt | [conflict-continuity.spec.ts](../../tests/integration/conflict-continuity.spec.ts) — “UTKAST-50: refreshed conflict data clears only choices for properties that actually changed” | Provgränser: [installation.ts](../../tests/support/installation.ts), [conflict-continuity.ts](../../tests/support/conflict-continuity.ts), [conflict-special.ts](../../tests/support/conflict-special.ts); Kod: [use-conflict-resolution.ts](../../src/client/use-conflict-resolution.ts), [ConflictDialog.tsx](../../src/client/ConflictDialog.tsx), [server/map.ts](../../src/server/map.ts), [shared/conflict-effects.ts](../../src/shared/conflict-effects.ts); Manuella fall: [drafts.md](drafts.md) | UTKAST-49–56 behåller opåverkade val och kontrollerar faktisk effekt efter tappat svar. Ägare, generation och versioner förhindrar gammal begäran; löst namn, typ och nästa konflikt ingår. Primärfallet är godkänt i grundkörningen. |
| 23. Rapporter och avvecklade funktioner | [history.spec.ts](../../tests/integration/history.spec.ts) — “HISTORIK-10: a direct save link reads historical types after their definitions change” | Provgränser: [installation.ts](../../tests/support/installation.ts), [client.ts](../../tests/support/client.ts); Kod: [Reports.tsx](../../src/client/Reports.tsx), [HouseholdMap.tsx](../../src/client/HouseholdMap.tsx), [server/map.ts](../../src/server/map.ts), [server/text-assistant.ts](../../src/server/text-assistant.ts), [server/assistant-instructions.ts](../../src/server/assistant-instructions.ts); Manuella fall: [history.md](history.md), [operations.md](operations.md), [docs/adr/0005-utkast-sparas-samlat.md](../../docs/adr/0005-utkast-sparas-samlat.md) | HISTORIK-01/10–13 täcker senaste först, exakt kvitto, direktlänkar, historiska typer och ikoner samt bevarad återgång. Historisk ångring och objektsammanslagning är avvecklade. Primärfallet är godkänt i grundkörningen. |
| 24. Fokus, fel och semantik | [relationship-dialog-accessibility.spec.ts](../../tests/integration/relationship-dialog-accessibility.spec.ts) — “SAMBAND-13: staging cancel and explicit outcome checks retain meaningful focus without stealing later reading focus” | Provgränser: [installation.ts](../../tests/support/installation.ts), [relationship-fixture.ts](../../tests/support/relationship-fixture.ts), [workspace-browser.ts](../../tests/support/workspace-browser.ts); Kod: [modal-focus.ts](../../src/client/modal-focus.ts), [HouseholdTable.tsx](../../src/client/HouseholdTable.tsx), [HouseholdReadDialog.tsx](../../src/client/HouseholdReadDialog.tsx), [FormLeave.tsx](../../src/client/FormLeave.tsx), [DraftSaveDialog.tsx](../../src/client/DraftSaveDialog.tsx); Manuella fall: [relationships.md](relationships.md), [object-lists.md](object-lists.md), [workspace-panels.md](workspace-panels.md), [drafts.md](drafts.md) | Modalfokus, Escape, länkad rättelse, försvunnen öppningskontroll och skydd för senare fokus. Fysisk hjälpmedels- och pekverifiering ingår inte i automatiken. Primärfallet är godkänt i grundkörningen. |
| 25. Dokumentation och data i samma PR | [transport-controls.spec.ts](../../tests/integration/transport-controls.spec.ts) — “SPAR-05: scoped transport holds real staging, rejects stale saves and recovers a lost committed receipt” | Provgränser: [installation.ts](../../tests/support/installation.ts), [client.ts](../../tests/support/client.ts), [scripts/manual-transport.ts](../../scripts/manual-transport.ts), [scripts/manual-transport-control.ts](../../scripts/manual-transport-control.ts); Kod: [scripts/seeds/demo.ts](../../scripts/seeds/demo.ts), [scripts/setup-database.ts](../../scripts/setup-database.ts), [scripts/manual-transport.ts](../../scripts/manual-transport.ts), [scripts/manual-transport-control.ts](../../scripts/manual-transport-control.ts); Manuella fall: [operations.md](operations.md), [docs/development/testing.md](../../docs/development/testing.md), [användarguider](../user-guide/README.md), [docs/operations/operator-upgrade-notes.md](../../docs/operations/operator-upgrade-notes.md) | DEMO-01 med båda konfigurerade administratörsleverantörerna; 16 objekt, 23 samband, Alex-kedjan, alla fältbetydelser, konflikt och två tillskrivna sparanden. Guider och stabila fall-ID:n ingår. Primärfallet är godkänt i grundkörningen. |
<!-- markdownlint-enable MD013 -->

## Åtta fullständiga arbetskedjor

Samtliga kedjor behöver godkännas på den slutliga sammanfogade versionen.
Länkarna anger verkliga primärfall; fall-ID:n och ytterligare steg finns
i motsvarande områdesmanual ovan. Slutligt resultat **VÄNTAR**.

<!-- markdownlint-disable MD013 -->
| Kedja | Exakt primärfall | Krav på det fullständiga utfallet |
| --- | --- | --- |
| 1 | [household-reading.spec.ts](../../tests/integration/household-reading.spec.ts) — “LÄS-01: keyboard follows Alex to bicycle to garage and back without graphics or lost table state” | Hitta och läsa Alex → cykel → garage utan kartgrafik, återgå med tabellens sökning, sida, öppna rader, rullning och fokus kvar. |
| 2 | [relationship-dialog.spec.ts](../../tests/integration/relationship-dialog.spec.ts) — “SAMBAND-01: separate complete objects connect and remain independently editable in the shared dialog” | Skapa två fullständiga objekt separat, koppla ihop dem och redigera objekt och samband; giltiga och ogiltiga värden prövas. |
| 3 | [relationship-dialog.spec.ts](../../tests/integration/relationship-dialog.spec.ts) — “SAMBAND-02: invalid next input and canceled form loss retain previous complete relationship proposals” | Lägga tidigare förslag i utkastet, fortsätta redigera eller uttryckligen kasta endast oskickad formulärtext; nyare förslag får inte skrivas över. |
| 4 | [draft-removal.spec.ts](../../tests/integration/draft-removal.spec.ts) — “UTKAST-41: independent removal preserves other proposals and history and focuses the next control” | Läsa alla fyra förslag med dolda fält, bilder och ekonomi; ta bort oberoende förslag och bekräfta eller avbryta beroenden och hela utkastet. |
| 5 | [draft-save.spec.ts](../../tests/integration/draft-save.spec.ts) — “UTKAST-38: a lost save response keeps proposals until the same durable attempt is checked from the table” | Spara med framgång, avvisning, väntan och oklart utfall; kontrollera samma försök efter omladdning, få ett kvitto och en toast utan fokusstöld. |
| 6 | [conflict-continuity.spec.ts](../../tests/integration/conflict-continuity.spec.ts) — “UTKAST-49: switching conflicts and reopening preserves choices and never clears another conflict’s stale guard” | Lösa från båda vyerna med blandade val, specialfall, vanliga rättelser och samtidiga hinder; nytt underlag, tappat svar, nästa konflikt och försvunnen öppnare ingår. |
| 7 | [history.spec.ts](../../tests/integration/history.spec.ts) — “HISTORIK-01: Reports preserves table work and lists only completed saves latest first” | Läsa gemensam historik utan samtal, AI eller kartgrafik; följa exakt sparlänk och återgå med tabellsökning och oskickad text kvar. |
| 8 | [household-work.spec.ts](../../tests/integration/household-work.spec.ts) — “ARBETE-06: selection and personal map view survive navigation and resizing” | Byta arbetsyta och stänga stödytor med utkast, samtal, text, separata sökningar och filter, urval, kamera och utforskning kvar. |
<!-- markdownlint-enable MD013 -->

## Avgränsade rättelser och faktiskt utförda prov

Följande prov ger kompletterande underlag. De gör inte grundkörningens
24 fel till godkända resultat och ersätter inte det nya hela slutprovet.

- Läsrättelsen på `06acac51435df6817054add7da8070a5987c3dc7` ger tre
  godkända TABELL-01–03 med historiska fältnamn, nytt dolt textfält,
  värdet 0 och Nej. Slutlig visuell jämförelse av läsarna **VÄNTAR**.
- Filterrättelsen har fem godkända SÖK-01–05 på sin avgränsade källversion,
  inklusive teckeningång och mobil stängning. Det ersätter inte ett
  nytt samlat sök- och utforskningsprov på slutversionen.
- Spar- och mikrofonnotiser har 17 godkända offentliga prov på
  `63ad005d321533c238ae71ad318ace0dddbd74cd`.
  Den borttagna visuella notisen skiljs från klippt tillgänglig
  uppläsningstext. Samma försök, medgivande, kvitto, historik,
  oskickad text och faktisk mikrofonfångst kontrolleras fortfarande.
- Historiken har elva godkända offentliga prov på
  `5437bcc58d60bff11ea736548422b7a9bd08c271`, inklusive HISTORIK-12 vid
  1280, 390 och 320 CSS-pixlar. Ett faktiskt pekhinder på dator rättas;
  mobilfallen är bevarandekontroller, inte påstådda tidigare produktfel.
  Notisen är läsbar medan pekaren når återgången, och sökning, fokus,
  oskickad text och serverns hela karttillstånd är oförändrade.
- Hållen mikrofon har 104 godkända enhetstest och nio offentliga
  mikrofonprov för `1555046f4fb880639dcda5b6331c6f1eef2e7737`.
  Ett verkligt fönsteravbrott vid påslagen indikator stoppar fångsten
  direkt; väntande effekter får inte slå på den igen.
- Navigationen har fem godkända offentliga prov och tre enhetstest på
  `230b36a536ff2518976f0745a17d7737e7542316`. Riktade samband,
  oskickade formulär, placering och personliga vyändringar ingår.
  Notisens överlappning med nedre läsuppgifter i kort vy behöver fortfarande
  bedömas separat. Slutlig sammanfogad verifiering **VÄNTAR**.

## Bindande beslut och låsta referenser

Den [samlade acceptansen #240](https://github.com/viscalyx/skyttel/issues/240#issuecomment-6001123613)
och senare åtkomst-, toast- och fokusbeslut har företräde vid överlappning.
Varje länk nedan gäller hela sitt beslut, inte bara tabellens sammanfattning.

<!-- markdownlint-disable MD013 -->
| Beslut | Bindande underlag | Omfattning |
| --- | --- | --- |
| #233 | [Resolution](https://github.com/viscalyx/skyttel/issues/233#issuecomment-5983625269) | Ansvar, benämningar och fullständig ersättning |
| #234 | [Resolution](https://github.com/viscalyx/skyttel/issues/234#issuecomment-5992067749) | Tabellens innehåll, ordning och återgång |
| #235 | [Resolution](https://github.com/viscalyx/skyttel/issues/235#issuecomment-5992675307) | Objektsökning, filter och kartutforskning |
| #236 | [Resolution](https://github.com/viscalyx/skyttel/issues/236#issuecomment-5993075064) | Fullständiga formulär, förlustskydd och utfall |
| #237 | [Resolution](https://github.com/viscalyx/skyttel/issues/237#issuecomment-5996549961) | Hela A:s obligatoriska konflikt- och specialfall |
| #238 | [Resolution](https://github.com/viscalyx/skyttel/issues/238#issuecomment-5997784333) | C:s tabell, sökytor och formulär på dator och mobil |
| #239 | [Resolution](https://github.com/viscalyx/skyttel/issues/239#issuecomment-6000865493) | Fullständiga tillgängliga kedjor, toast och fokus |
| #240 | [Resolution](https://github.com/viscalyx/skyttel/issues/240#issuecomment-6001123613) | Samlad acceptans och uppdaterade provdata |
| #241 | [Resolution](https://github.com/viscalyx/skyttel/issues/241#issuecomment-5983454336) | Beständiga försök, historik och avveckling |
| #242 | [Resolution](https://github.com/viscalyx/skyttel/issues/242#issuecomment-5999761900) | D:s utkastlayout och ingång |
| #243 | [Resolution](https://github.com/viscalyx/skyttel/issues/243#issuecomment-6000149599) | Full läsning, sparande och beroende borttagning |
| #243 | [Resolution](https://github.com/viscalyx/skyttel/issues/243#issuecomment-6000553942) | Aktuellt fullständigt implementationsunderlag för D |
<!-- markdownlint-enable MD013 -->

- [Låst A](https://github.com/viscalyx/skyttel/tree/d28a1f94b10d3d5dc98410933667ab320be5d908)
  gäller konfliktformuläret och varje obligatorisk checkpunkt.
- [Låst C](https://github.com/viscalyx/skyttel/tree/cc0410566b7056bcd6b1fec2d940620a0eab3be7)
  gäller tabell, sökytor och objekt- och sambandsformulär.
- [Låst D](https://github.com/viscalyx/skyttel/tree/19f18f7ecaafbe87b6944284992402d8abdd46b0)
  gäller utkastets fyra kolumner, ikoner, fulla förslag och stödmodaler.

Prototypgrenarna bevaras. Simuleringar och exempeldata i prototyperna
är inte produktionsbevis. De ursprungliga visuella observationerna omfattar
A:s 14 exempel, C:s 33 referenstillstånd, D:s 52 referenstillstånd och
87 produktionstillstånd för C/D på en tidigare källa. Nya läs- och
filterrättelser kräver korrigerade slutbilder på dator och mobil.

**Slutlig källversion, bilder, exakta texter, interaktioner och jämförelse
för A/C/D: VÄNTAR.** Dator, mobil och kort liggande vy ska redovisas
separat. En granskad prototypbild betyder inte godkänd fysisk användning.

## Demodata, prestanda och kvarstående mänskliga prov

[DEMO-01](operations.md#demo-01-utvecklingshushållet-har-verkliga-uppgifter-och-läsbara-samband)
och [databasproven](../../tests/integration/database-setup.spec.ts)
kontrollerar båda konfigurerade administratörsleverantörerna, återställning,
återstart, hushållstillgång och privata uppgifter. Fem riktade demoprov är
godkända. [Demodata](../../scripts/seeds/demo.ts) omfattar 16 objekt och
23 samband, hela Alex-kedjan, dolda egna fält och två tillskrivna sparanden.
Slutligt prov av dessa data på den accepterade byggversionen **VÄNTAR**.

En avgränsad tidigare mätning använder 1440 × 1000 CSS-pixlar, 40 ms
latens, 2,5 MB/s ned och 625 kB/s upp. Den redovisar 23 etiketter utan
överlappning samt faktiskt kvitto och beständigt tillstånd efter återstart.
Kall öppning/sökning/sparande är 3638,27/30,49/230,25 ms; varm körning
är 3451,50/27,12/226,65 ms. Mätningen anger commit `077d665` och
uttryckligen lokala ändringar.
Den är inte en ren slutversionsmätning.
[Stora kartors mätplan](large-map-performance.md) och
[separata resultat](large-map-results.md) gäller sina angivna miljöer.
**Slutlig prestandakälla, representativt urval och acceptans: VÄNTAR.**

Följ områdesmanualernas verkliga inloggning, administratörs- och
medlemsåtkomst samt syntetiska provdata. De kontrollerade transportproven
behöver redan konfigurerad HTTPS-ingång och uttryckliga hållna eller tappade
svar. Vanlig nätfrånkoppling bevisar inte att lagring sker före ett tappat
svar. Rapporten innebär ingen exponering av testserver eller publicering.

Följande är **INTE UTFÖRT** och får inte räknas som godkänt:

- Installerad Chrome på Windows, macOS, iPhone och iPad.
- NVDA på Windows och VoiceOver på macOS, iPhone och iPad.
- Fysisk touch och skärmtangentbord i fullständiga arbetskedjor.
- Verklig webbläsarförstoring på 200 och 400 procent för samtliga kedjor.
- Fullständig kontrast-, läsordnings-, fokus-, omflödes- och
  pekmålsbedömning, inklusive alternativ till dragning.

Automatiska tangentbords-, DOM-, bild-, medie- och fönsterprov är separat
underlag. De fastställer inte fullständig WCAG-överensstämmelse.
[Familjeflödenas rapport](connected-experience-verification.md) skiljer
aktuella funktionella prov från sina uttryckligen äldre bilder och
begränsade miljöobservationer; äldre bilder ommärks inte som slutbevis.

## Fält som slutförs efter hela verifieringen

<!-- markdownlint-disable MD013 -->
| Fält | Status |
| --- | --- |
| Slutlig kod- och byggversion, webbläsare och provmiljö | VÄNTAR |
| Hela `npm run check`: typkontroll, lint, dokumentation, grindar, bygge, täckning och integration | VÄNTAR |
| Slutlig primärkörning, antal godkända/underkända och verifierade rättelser | VÄNTAR |
| Oberoende Standards- och Spec-granskningar samt omprov av deras rättelser | VÄNTAR |
| Slutlig A/C/D-jämförelse på dator och mobil | VÄNTAR |
| Slutlig prestandabedömning och representativt urval | VÄNTAR |
| Fysiska hjälpmedels-, telefon- och förstoringstester | INTE UTFÖRDA |
<!-- markdownlint-enable MD013 -->

Slutresultaten ska ange samma oförändrade källversion som sina prov.
Först då kan varje beslutad punkt och varje fullständig kedja bedömas.
Rapporten gör inget påstående om godkänd fullsvit eller fullständig
fysisk tillgänglighet medan dessa fält återstår.

# Pröva inloggning, inställningar och administration

Kastbart beslutsunderlag för
[Hur får inloggning, inställningar och administration samma genomarbetade upplevelse?](https://github.com/viscalyx/skyttel/issues/108).
Underlaget inväntar beställarens återkoppling.

## Grund och fastställda val

Grenen `prototype/skyttel-administration` börjar på godkända
[`2662ff9096516fe8a297d4ca39adedb3585ff47c`](https://github.com/viscalyx/skyttel/tree/2662ff9096516fe8a297d4ca39adedb3585ff47c).
Kartan A, fria paneler, listmönster B, bild/ikonval och
D · Kartan berättar ligger fast.

Beställaren godkänner större fokuserade paneler för omfattande
administration, direkt öppning av kartan med stängbar vägledning och
en stegvis inbjudningsguide. Se
[delbeslutet och prototypstarten](https://github.com/viscalyx/skyttel/issues/108#issuecomment-5848466538).

## Öppna och jämför

```sh
npm run prototype:administration
```

[Öppna A på port 4183](http://localhost:4183/?prototype=administration&variant=A&panel=settings&theme=light).
Den gemensamma förhandsvisningen finns på
[port 5173](http://localhost:5173/?prototype=administration&variant=B&panel=settings&theme=light).

Pilarna i den flytande nederkanten byter utformning. Adressens
`variant=A`, `variant=B` eller `variant=C` bevarar valet vid omladdning.

- **A · Grupperade avsnitt:** alla ingångar i en smal, rullbar panel.
- **B · Sidomeny:** välj ett avsnitt och se dess innehåll bredvid.
  Mobil placerar avsnittsvalen ovanför innehållet.
- **C · Vad vill du göra?:** en sökbar uppgiftslista med ansvarsnivån
  vid varje uppgift.

De tre utformningarna använder samma administrativa flöden. Temat väljs
i den befintliga verktygslådan. Provlägen ligger separat från appens
verktyg och innehåller situation, behörighet och nästa simulerade svar.

## Pröva flödena

1. Öppna **Provlägen** och välj **Inloggning** under **Situation**.
   Prova Google eller Microsoft. Övergången till den externa tjänsten
   visas utan att någon riktig tjänst kontaktas.
2. Välj **Första administratören**. Skapa ett namngivet hushåll och
   pröva kartans stängbara vägledning. Vanliga inbjudna användare får
   ingen möjlighet att skapa hushåll genom detta flöde.
3. Välj **Saknad eller återkallad tillgång**. Öppna inbjudan och
   användar-ID. Prova fel kod och sedan `PROV-LIND-4826`. Inloggningssätt
   och behörig kostnadsöversikt går att nå utan medlemskap.
4. Öppna **Medlemmar och inbjudningar**. Följ de tre stegen och använd
   exempelvis `sky-sam-305`. Koden försvinner när sidan lämnas.
   Pröva rolländring och återkallelse för Lo. Egna kontroller är inaktiva.
5. Öppna **Inloggningssätt**. Verifiera Google och koppla Microsoft.
   Prova ett nekat svar eller en utgången verifiering via provverktygen.
6. Öppna **Assistentanslutningar** och anslutningsförfrågan. Välj extern
   klients begäran i provverktygen. AI-behandling och kartarbete har
   separata, omarkerade medgivanden. Återkalla sedan anslutningen.
7. Pröva **Fullständig export**. Läs omfattningen, förbered och hämta.
   Att lämna panelen avbryter en förberedd export. Ingen ZIP-fil skapas.
8. Pröva **Återimportera hushållet**. Välj provfil, kontrollera, granska
   ersättningen och bekräfta. Nuvarande medlemskap och inloggningar
   bevaras. Historiska identiteter ger ingen ny tillgång.
9. Pröva **Koppla historiskt innehåll**. Välj en verifierad medlem eller
   ingen aktuell ägare. Granskningen visar konsekvensen för tidigare
   privat arbete; privata texter visas inte.
10. Pröva **Permanent radering**. Välj exempelavtalet och granska hela
    omfattningen. Skriv `RADERA PERMANENT` för att aktivera åtgärden.
11. Välj **Svaret försvinner**, **Underlaget ändras** eller väntande
    rensning före en åtgärd. Okänt resultat följs genom samma försök.
    Ändrat underlag tar bort bekräftelsen. Kartarbetet väntar medan en
    ersättning eller radering har okänt resultat eller väntar på rensning.
12. Pröva **Driftens kostnader**. Byt månad, ändra antaganden och
    uppdatera underlaget. Månadens sparade antaganden bevaras i minnet.
    Saknade mätvärden visas som okända belopp. Byt till rollen Medlem
    och kontrollera att kostnader och administration blir otillgängliga.

Öppna gärna ett objekt och skriv en oskickad ändring före besöket i
inställningarna. Tillbaka till arbetet återger panelen och dess innehåll.
Mikrofonens tillstånd består vid vanliga panelbyten. Kartans simulerade
kvitton och alternativ utan grafik finns också under Provlägen.
Välj **Anslutning klar** där efter **Starta talsamtal** för att slutföra
den simulerade anslutningen.

## Produktunderlag

Flöden och behörigheter utgår från befintliga guider:

- [Inloggning och tillgång](../../../docs/user-guide/access.md)
- [Första användningen](../../../docs/user-guide/getting-started.md)
- [Assistenter](../../../docs/user-guide/assistants.md)
- [Export](../../../docs/user-guide/household-export.md)
- [Återimport](../../../docs/user-guide/household-import.md)
- [Historiskt innehåll](../../../docs/user-guide/household-recovery.md)
- [Permanent radering](../../../docs/user-guide/household-erasure.md)
- [Driftens kostnader](../../../docs/user-guide/costs.md)

## Verifiering och begränsningar

Chromium-prov omfattar de tre utformningarna, inbjudan och kodens
försvinnande, okänt raderingsresultat, ändrat importunderlag, separata
assistentmedgivanden, roller, kostnader utan hushållsmedlemskap och
inloggning. Inställningar, medlemmar, import, medgivande och kostnader
ryms vid 390 och 320 pixlars bredd utan horisontellt överflöde.
Ytterligare prov omfattar väntande rensning, avbruten export,
antaganden per månad, bevarat mikrofontillstånd, tangentbordets
fokusåtergång och stängning av första vägledningen. Mörkt tema granskas
visuellt. Förstorad rottext ger inget sidspill; detta ersätter inte
prov med verklig webbläsarzoom.

Typkontroll och riktad Biome passerar. Produktionsbygget utesluter
prototypen. Projektets befintliga varning om stort klientpaket kvarstår.

Allt provtillstånd finns i minnet och återställs vid omladdning. Inga
verkliga inloggningar, medgivanden, filer, kostnadspriser eller
administrativa ändringar används. Importens återinläsning illustreras
med samma påhittade karta; den byter inte hela kartans datamodell.
Raderingens exempelavtal är separat från kartans åtta provobjekt.
Resultatkontrollen väljer ett simulerat lyckat utfall. Riktiga kvitton,
samtidiga användare, låsning över flera klienter, utgångstider,
leverantörsspecifika fel och beständig återhämtning kräver implementation.
Kostnadernas fullständiga prisdetaljer och versionshistorik följer det
befintliga produktunderlaget och återges inte fullständigt i skissen.

WCAG 2.2 AA är designkrav. Detta är ingen fullständig verifiering.
Fysiska målplattformar, skärmläsare, extern autentisering och hela
återhämtningsflöden behöver prövas i den fungerande applikationen.

## Bilder

- [A på dator](A-dator.png)
- [B på dator](B-dator.png)
- [B i mörkt tema](B-morkt.png)
- [C på dator](C-dator.png)
- [Inställningar på mobil](settings-mobil.png)
- [Inbjudan på dator](inbjudan-dator.png)
- [Import på dator](import-dator.png)
- [Import på mobil](import-mobil.png)
- [Kostnader på mobil](costs-mobil.png)
- [Första användningen på mobil](forsta-anvandningen-mobil.png)

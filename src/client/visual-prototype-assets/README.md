# Fyra visuella riktningar för Skyttel

Kastbar prototyp för beslutet
[Vilket visuellt uttryck gör hela Skyttel professionellt och sammanhållet?](https://github.com/viscalyx/skyttel/issues/103)
i kartan
[Gör rymdkartan och tal till grunden för Skyttels UI/UX](https://github.com/viscalyx/skyttel/issues/101).

Underlaget är till för beställaren och kommande designarbete. Alternativen
är förslag för återkoppling. Ingen riktning är godkänd ännu.

## Öppna och jämför

Kör `npm run prototype:visual` på grenen
`prototype/skyttel-visuellt-uttryck`. Projektets beroenden måste finnas.
Öppna sedan någon av följande adresser:

- [A · Nattljus](http://localhost:4173/?prototype=visual&variant=A)
- [B · Dagsljus](http://localhost:4173/?prototype=visual&variant=B)
- [C · Horisont](http://localhost:4173/?prototype=visual&variant=C)
- [D · Fri rymd, mörk](http://localhost:4173/?prototype=visual&variant=D&theme=dark)
- [D · Fri rymd, ljus](http://localhost:4173/?prototype=visual&variant=D&theme=light)

Använd pilarna längst ned för att växla riktning. Tangentbordets höger- och
vänsterpil fungerar också, utom när ett inmatningsfält har fokus.
Riktningen finns kvar i adressen vid omladdning.
Panelen längst ned med A–D är provets verktyg och ingår inte i Skyttels
föreslagna gränssnitt.

Välj **Visa formulär** i A–C eller **Visa detaljer** i D för att öppna
detaljvyn. Du kan också välja objekt direkt i kartan.
På mobil rullar prototypen till formuläret. Stäng det med krysset för att
återgå till kartan. Välj **Tillstånd** för att jämföra lyssnande, privat
utkast, pågående sparande, sparbesked och fel.

## Alternativens avsikt

### A · Nattljus

Sammanhängande mörka ytor med lågmälda djupmarkeringar, mjukt rundade
objekt och turkos accent. Logotypens färger får synas mot en återhållen
bakgrund. Sans serif används genomgående. Kartan fyller arbetsytan;
detaljpanelen fortsätter samma mörka färgskala.

Pröva om helheten känns lugn och tydlig även vid läsning och redigering
av många uppgifter.

- [Dator: karta](A-dator-karta.png)
- [Dator: karta och formulär](A-dator-formular.png)
- [Mobil: karta](A-mobil-karta.png)
- [Mobil: formulär](A-mobil-formular.png)

### B · Dagsljus

Ljus, varm grund med gröna accenter, tunna avdelare och öppna ytor.
Runda objektsymboler och diskreta samband ger kartan ett lättare uttryck.
En större redaktionell rubrik i Georgia kompletterar ett systemtypsnitt
i kontroller och information. Tal och kartstatus har en egen ljus yta.

Pröva om ljusheten underlättar vardagsbruk och om rubrikens personlighet
tillför något till arbetsytan.

- [Dator: karta](B-dator-karta.png)
- [Dator: karta och formulär](B-dator-formular.png)
- [Mobil: karta](B-mobil-karta.png)
- [Mobil: formulär](B-mobil-formular.png)

### C · Horisont

En mörkblå karta ligger i en ljus ram. Ljusa informationsytor med blå
handlingsknappar skiljer läsning och redigering från den rumsliga
överblicken. Samma sans serif, linjeikoner och avstånd binder ihop
ytorna. Kartobjekten har rakare hörn än arbetsytornas större rundningar.

Pröva särskilt om övergången mellan ljust och mörkt känns sammanhållen
och behaglig.

- [Dator: karta](C-dator-karta.png)
- [Dator: karta och formulär](C-dator-formular.png)
- [Mobil: karta](C-mobil-karta.png)
- [Mobil: formulär](C-mobil-formular.png)

### D · Fri rymd

Beställarens riktning för fortsatt prövning utgår från Nattljus: kartan
fyller hela den synliga webbläsarytan. Logotypen är mindre framträdande
och verktygen ligger i en flytande verktygslåda. Den kan expanderas för
att visa namn och fler förklaringar. Både ljust och mörkt tema ingår.

Starta det simulerade samtalet med mikrofonknappen. Knappen blir då en
cirklad stoppikon. Vågformen visas i rutan med samtalets status tills
röstläget stoppas. Välj **Simulera hörbart tal** i prototypkontrollerna
för rörelse
och **Simulera tystnad** för stillhet. Med minskad rörelse förblir
vågformen stilla och status visas med text. Ingen riktig mikrofon används.

Temat väljs i verktygslådan och finns kvar i adressen vid omladdning.
Alla synliga kartobjekt kan öppnas. Detaljrutan visar det valda objektet
nära punkten där du klickar, med placeringen begränsad av skärmens kanter.
Klick utanför rutan eller Escape stänger den. Verktygslådans placering,
expansion och samtalsmarkering är hypoteser att reagera på; de är inte
ett slutligt navigations- eller talbeslut.
På mobil prövas en vågrät kompakt verktygsrad; expanderad visar den
verktygen med namn under logotypen.

- [Mörkt, dator: karta](D-dark-dator-karta.png)
- [Mörkt, dator: formulär](D-dark-dator-formular.png)
- [Mörkt, mobil: karta](D-dark-mobil-karta.png)
- [Mörkt, mobil: formulär](D-dark-mobil-formular.png)
- [Ljust, dator: karta](D-light-dator-karta.png)
- [Ljust, dator: formulär](D-light-dator-formular.png)
- [Ljust, mobil: karta](D-light-mobil-karta.png)
- [Ljust, mobil: formulär](D-light-mobil-formular.png)
- [Mörkt: expanderade verktyg och simulerat samtal](D-dark-dator-samtal.png)
- [Ljust: expanderade verktyg och simulerat samtal](D-light-dator-samtal.png)
- [Mörkt, dator: detaljruta nära Alex](D-dark-dator-objekt.png)
- [Ljust, dator: detaljruta nära Alex](D-light-dator-objekt.png)
- [Mörkt, mobil: detaljruta nära Alex](D-dark-mobil-objekt.png)
- [Ljust, mobil: detaljruta nära Alex](D-light-mobil-objekt.png)
- [Mörkt, mobil: vågform i samtalsstatus](D-dark-mobil-samtal.png)
- [Ljust, mobil: vågform i samtalsstatus](D-light-mobil-samtal.png)

## Gemensamma utgångspunkter att bedöma

- De angivna stora och små logotypfilerna används oförändrade. Symbolen
  får en lugn plats bredvid namnet i sidhuvudet.
- Rubrik, objektnamn, belopp och kompletterande text har skilda nivåer.
  Formulären har synliga etiketter. Pröva även de mindre karttexterna.
- Ikoner har samma linjekaraktär. Ikonknappar har tillgängliga namn.
  Synlig status använder text och symbol, inte enbart färg.
- Avstånd bygger främst på steg om fyra eller åtta pixlar.
  Handlingsknappar i arbetsytan är minst 44 pixlar höga.
- Rörelse begränsas till en diskret markering i simulerat samtalsläge
  och liten återkoppling vid objektfokus. Minskad rörelse stänger av
  animation och övergång. Ingen automatisk kamerarörelse ingår.
- Mobilskissen visar färre objekt för att ge plats åt kartan, status och
  tal. Detta är en komposition för jämförelsen, inte ett beslut om hur
  produktens karta ska filtreras.

## Omfattning och begränsningar

Alla hushållsuppgifter är påhittade. Kartan är en illustrerad rumslig
skiss. Ingen mikrofon, modell, databas eller sparfunktion används.
Formulärvärden finns bara i minnet. Ett visat sparbesked är ett valt
tillståndsexempel, inte ett påstående om faktiskt sparad information.

Prototypen gäller uttryck och visuella principer. Navigation, faktisk
3D-interaktion, samtalets tillståndsmodell och detaljerade
redigeringsbeteenden avgörs i andra beslutsärenden. Alla kompletterande
vyer är exempel. A–C visar bara familjeabonnemangets detaljvy. D har
detaljer för alla objekt; familjeabonnemanget visar också ett formulär.

Beställaren vill pröva ljust och mörkt temaval i D. När riktningen är
vald behöver användarens återkoppling precisera vilka
ytor, typsnitt, storlekar, färger och rörelser som ska ligga till grund
för fortsatt designarbete.

## Kontroll av underlaget

TypeScript och Biome kontrollerar prototypens kod. Ett lokalt
webbläsarprov i Chromium omfattar A, B och C vid 1440 × 1000
och 390 × 844 pixlar: vybyte, formulär, sparstatus, felstatus,
kontrollernas namn samt pilknappar som inte tar över inmatningsfält.
Kartan och talhandlingen ryms utan horisontell rullning i dessa storlekar.

D är prövad i båda teman vid samma storlekar: kartans yta motsvarar hela
viewporten; expansion, temabyte, formulär och synlig sparstatus fungerar
i skissen. Vågformen är stilla vid simulerad tystnad, rör sig vid
simulerat hörbart tal och stannar vid minskad rörelse. Ett produktionsbygge
och kodkontroller går igenom.

Skärmbilderna visar dessa två storlekar. Detta är en lokal designkontroll,
inte verifiering på fysiska enheter, med hjälpmedel eller med verkligt tal.

Alla åtta objekt på dator och de sex synliga mobilobjekten är prövade med
rätt detaljrubrik, placering inom skärmen och stängning vid klick utanför.
De två övriga objekten finns i mobilens lista. Escape stänger även när
ett formulärfält har fokus. I båda teman förblir stängknappen nåbar vid
320 pixlars bredd, dubblerad text och synligt privat utkast.

## Tillgänglighetsbedömning av skissen

[Vilken WCAG-version och nivå ska hela Skyttel uppfylla?](https://github.com/viscalyx/skyttel/issues/110#issuecomment-5843998158)
fastställer WCAG 2.2 AA för hela produkten. Det gäller fortsatt även om
den här skissen bara prövar visuella principer.

Bedömningen utgår bland annat från W3C:s vägledning om
[textförstoring](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html),
[omflöde](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) och
[kontrast för annat än text](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html).

- Vid 320 pixlars bredd har alla alternativ plats utan horisontell
  sidrullning, även i ett prov där beräknade teckenstorlekar dubbleras.
  Rubriker bryts och jämförelsepanelen övergår till sidflödet när dess
  höjd annars skulle skymma innehåll.
- Fält och formulärknapp kan fokuseras utan att täckas i samma prov.
  När detaljer öppnas flyttas fokus till rubriken. Vid stängning återgår
  fokus till kontrollen som öppnar dem.
- Provtagna kärntexter har minst 4,87:1 i kontrast. Fältgränser och
  sambandens linjer använder separata färger med minst 3:1 mot sina
  bakgrunder. Dekorativa avdelare och rutnät är svagare.
- Status har text och symbol. Minskad rörelse stänger av animationer.
  Text- och listknappar är namngivna och åtkomliga från kartans grundläge.

**Kvarstående hinder:** kartans illustrerade objektplaceringar ger
överlappande etiketter och nodrutor vid dubblerad textstorlek. Denna
komposition ska därför inte låsas som en tillgänglig kartlösning.
Fortsatt design måste pröva läsbara etiketter vid förstoring och ett
likvärdigt text- och listalternativ för allt hushållsarbete. Skissens
begränsade lista och enda detaljvy visar inte detta fullständiga flöde.

Textprovet ändrar teckenstorlekar i sidan; det ersätter inte prov med
verklig webbläsarzoom. Fullständiga flöden, samtliga tillstånd,
skärmläsare och fysiska enheter återstår att bedöma inom respektive
beslut och produktverifiering. Underlaget påstår inte att skissen eller
produkten uppfyller WCAG.

# Tre visuella riktningar för Skyttel

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

Använd pilarna längst ned för att växla riktning. Tangentbordets höger- och
vänsterpil fungerar också, utom när ett inmatningsfält har fokus.
Riktningen finns kvar i adressen vid omladdning.

Välj **Visa formulär** eller familjeabonnemanget för att öppna detaljvyn.
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

Detta är agentens rekommendation att pröva vidare. Det är en hypotes,
inte ett beslut. Pröva särskilt om övergången mellan ljust och mörkt
känns sammanhållen och behaglig.

- [Dator: karta](C-dator-karta.png)
- [Dator: karta och formulär](C-dator-formular.png)
- [Mobil: karta](C-mobil-karta.png)
- [Mobil: formulär](C-mobil-formular.png)

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
vyer är exempel; endast familjeabonnemanget har en detaljvy.

Skisserna innebär inte att ljust/mörkt temaval är en ny produktförmåga.
När riktningen är vald behöver användarens återkoppling precisera vilka
ytor, typsnitt, storlekar, färger och rörelser som ska ligga till grund
för fortsatt designarbete.

## Kontroll av underlaget

TypeScript och Biome kontrollerar prototypens kod. Ett lokalt
webbläsarprov i Chromium omfattar alla tre riktningarna vid 1440 × 1000
och 390 × 844 pixlar: vybyte, formulär, sparstatus, felstatus,
kontrollernas namn samt pilknappar som inte tar över inmatningsfält.
Kartan och talhandlingen ryms utan horisontell rullning i dessa storlekar.

Skärmbilderna visar dessa två storlekar. Detta är en lokal designkontroll,
inte verifiering på fysiska enheter, med hjälpmedel eller med verkligt tal.

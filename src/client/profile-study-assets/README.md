# Pröva profilbilder inom B

Kastbart underlag för
[Hur utformas listor, detaljer och redigering som öppnas vid behov?](https://github.com/viscalyx/skyttel/issues/107).
Frågan är hur bildval, byte, borttagning och återkoppling fungerar inom
B:s detaljer och samma privata utkast som text, typer och samband.

## Godkänd grund

Grenen `prototype/skyttel-profile-images` börjar på godkända
[`38daabd568401c7f06fc52e2343bdd0ac5bb1a1e`](https://github.com/viscalyx/skyttel/tree/38daabd568401c7f06fc52e2343bdd0ac5bb1a1e).
Se [godkännandet av skapande och typbyte inom B](https://github.com/viscalyx/skyttel/issues/107#issuecomment-5847984799).
Startversionen ingår i historiken. Typinställningar, skapande, typbyte,
karta A, fria paneler, lista B och D:s talåterkoppling består.
Ingen ny detaljvariant introduceras i detta prov.

## Öppna

På prototypgrenen med projektets beroenden tillgängliga:

```sh
npm run prototype:images
```

[Profilbilder på port 4181](http://localhost:4181/?prototype=images&variant=B&view=edit&theme=light).
Den delade förhandsvisningen finns också på
[port 5173](http://localhost:5173/?prototype=images&variant=B&view=edit&theme=light).

Öppna **Prova tillstånd → Använd provbild på Familjeabonnemang** för att
prova utan egen bildfil. Alternativt används **Välj profilbild** i
objektets redigering. Den påhittade musikbilden finns som
[PNG](provbild-musik.png) och [redigerbar SVG](provbild-musik.svg).

## Pröva bild och text tillsammans

1. Ändra namnet till **Familjens musik**. Bildvalet visar att oskickade
   uppgifter först behöver läggas i utkastet. Välj **Lägg uppgifterna i
   utkastet först**.
2. Välj en bild. Den blir direkt ett privat förslag och syns i detaljer,
   karta och lista. Bild och namn räknas som samma objektförslag.
3. Öppna **Visa hela utkastet**. Där visas bilderna i den gemensamma
   kartan och i ditt utkast bredvid varandra. Denna vy är valfri.
4. Välj **Spara hela utkastet** och **Prova tillstånd → Kvitto: sparat**.
   Namn och profilbild ingår i samma kvitto. Först då visas bilden som
   delad och kartans förslagsmarkering försvinner.
5. Välj en annan bild och prova sedan en ogiltig fil. Den senast giltiga
   bilden och andra ändringar ska finnas kvar. Fel får fokus och går att
   nå även om detaljpanelen stängs under bildinläsningen.
6. Välj **Ta bort profilbild**. Utkastet visar den delade bilden och ett
   förslag utan bild. Detta återställer inte en tidigare bild. Spara
   hela utkastet och jämför med kvittot.

Pröva också att skapa ett objekt, lägga det i utkastet och välja bild
innan något sparas gemensamt. Stängning behåller förslaget. Att avbryta
filväljaren ändrar ingenting. Typbyte behåller objektets profilbild.

Under bildbehandlingen visas status och sparandet är blockerat tills
bilden är färdig. **Kvittot saknas** behåller bildförslag och spärrar
vidare ändring. **Kontrollera sparresultat** kontrollerar samma försök;
ett bekräftat kvitto avslutar det gemensamma sparandet.

## Befintliga produktregler

Originalversionen
[`466f5df`](https://github.com/viscalyx/skyttel/tree/466f5dfb33fc70114587f36360bd0ed406a3e208)
stöder redan profilbilder. Se
[bildguiden](https://github.com/viscalyx/skyttel/blob/466f5dfb33fc70114587f36360bd0ed406a3e208/docs/user-guide/profile-images.md),
[bildförslag i utkastet](https://github.com/viscalyx/skyttel/blob/466f5dfb33fc70114587f36360bd0ed406a3e208/src/server/map.ts)
och [bildbehandlingen](https://github.com/viscalyx/skyttel/blob/466f5dfb33fc70114587f36360bd0ed406a3e208/src/server/profile-images.ts).

- Alla aktuella hushållsmedlemmar kan ändra profilbilder.
- Nytt objekt och oskickad text läggs först i utkastet. Ett befintligt
  objekt utan oskickad text behöver inget extra sådant steg.
- Bildval och borttagning blir direkt privata förslag. Ingen separat
  knapp för att verkställa bilden eller något extra sparande införs.
- JPEG, PNG och WebP tillåts, högst 10 MB och 40 miljoner bildpunkter.
  Bilden förminskas proportionerligt till högst 300 × 300 utan förstoring.
  En animerad bild blir en stillbild.

## Skärmbilder

[Profilbild på dator](images-dator.png) och [på mobil](images-mobil.png).
[Jämförelse före borttagning i utkastet](utkast-dator.png).

## Verifiering och begränsningar

Chromium-prov omfattar val, byte, borttagning, ogiltiga bildfiler,
avbruten filväljare, oskickad text, nya objekt, typbyte, kart- och
listvisning samt gemensamt utkast. Fokus vid bildfel och formulärfel,
bevarande över stängning och synligt fel efter stängd panel ingår.
Mobilbredder 390 och 320 passerar utan horisontellt överflöde. Inga
okontrollerade sidfel upptäcks i dessa prov.

Text och bild räknas som ett objektförslag. Gemensamt kvitto, okänt
sparresultat med kontroll av samma försök samt jämförelse före och efter
bildborttagning passerar. Typkontroll, riktad Biome, Markdown, stavning
och produktionsbygget passerar. Prototypen ingår inte i produktionspaketet;
bygget visar projektets befintliga varning om ett stort klientpaket.

Tillstånd finns bara i minnet. Omladdning tömmer bilder och övriga
provuppgifter. Bilderna läses och förminskas i webbläsaren; ingen fil
laddas upp. Provet ersätter inte serverns fullständiga bildkontroller,
behörighetskontroller eller beständighet. Animationer, bildmetadata,
ovanliga färgprofiler och skillnader mellan webbläsarnas bildbehandling
är inte verifierade här. Tal och sparresultat är simulerade.

Fullständiga konfliktval, historik, ångring, borttagning och återställning
av objekt samt sammanslagning återstår i designarbetet. Bildförslag
har ingen separat ångring i detta prov.

WCAG 2.2 AA är designkrav. Provet fastställer inte fullständig
överensstämmelse. Fysiska enheter, skärmläsare, verkligt tal och verklig
webbläsarzoom behöver verifieras separat.

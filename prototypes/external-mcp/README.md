# Kastbart prov av en extern assistent

Provet undersöker om en separat assistent kan läsa Skyttels karta, arbeta
med ett privat utkast, invänta ett sparbesked och spara rätt version genom
en faktisk MCP-anslutning. Det hör till
[Kan en extern assistent genomföra Skyttels gemensamma MCP-flöde?](https://github.com/viscalyx/skyttel/issues/15).

## Vad som prövas

Codex CLI körs som separat assistentprocess. Den startar `server.py` genom
MCP:s stdio-transport. `client.py` förmedlar text och samlar verktygsanrop
och svar för granskning. Varje samtalsomgång avslutas när assistenten
svarar. Nästa omgång återupptar samma samtal med ett uttryckligt sessions-ID.
Denna startare ändrar inte användarens beständiga Codex-konfiguration.

Assistenten får uttryckliga instruktioner om Skyttels gransknings- och
sparregler. Ett lyckat prov gäller denna konfigurerade klient. Det visar
inte att varje MCP-klient följer reglerna utan sådana instruktioner.

Endast påhittade hushållsuppgifter får användas. Prototypen använder en
lokal scratchfil som simulerar gemensam lagring mellan samtalsomgångar.
Användaren väljs av startkommandot. Det simulerar identifierad åtkomst,
utan att verifiera riktig inloggning eller behörighetskontroll i drift.

## Körning

Python 3 och en installerad, redan inloggad Codex CLI behövs. Ingen separat
modell-API-nyckel används av startaren. Codex-körningen använder den
befintliga klientens konto och förbrukar dess användning.

Kör från denna katalog. Första kommandot skapar provets syntetiska data:

```sh
python3 server.py --state .runtime/PROTOTYPE-state.json --reset
python3 client.py 'Vad finns i min karta och mitt utkast?'
```

Fortsätt med den verkliga användarens svar:

```sh
python3 client.py --resume 'Användarens meddelande'
```

Skriv inte ett påhittat spargodkännande åt beställaren i det gemensamma
provet. Tekniska kontrollanrop hålls skilda från människans bedömning.

## Scenarier

1. Läs ett redan befintligt eget utkast; den andra användarens utkast
   ska inte följa med.
2. Lägg till en person där namnet ger flera möjliga träffar. Assistenten
   behöver ett förtydligande innan ett bestämt samband kan föreslås.
3. Rätta förslaget. Läs hela sammanställningen, inklusive det tidigare
   utkastet. Spara först efter beställarens besked.
4. Ändra utkastet genom en annan klient mellan granskning och sparande.
   Det gamla sparbeskedet ska inte gälla den nya versionen.
5. Låt en annan användare spara en motstridig ändring. Granska konflikten
   och kontrollera att den inte skrivs över tyst.
6. Simulera ett förlorat sparkvitto. Kontrollera utfallet innan ett nytt
   försök; samma begäran får inte skapa ytterligare historik.
7. Föreslå ångring av en hel spargrupp. Granska och spara på nytt, med
   hänsyn till senare ändringar.
8. Kontrollera verktygslistans administrativa gräns och återkopplingen
   när en sådan åtgärd efterfrågas.

## Resultat och begränsningar

Förberedelser är inte ett godkänt användarprov. Observerade resultat och
beställarens återkoppling dokumenteras separat när de finns.

Ingen riktig hushållsdata, webbkarta, driftdatabas, OAuth, mobilanslutning
eller talbehandling ingår i denna lokala prototyp. Ett stdio-prov på Mac
bevisar inte att en fjärranslutning fungerar på andra målplattformar.
Codex CLI:s textkörning prövar inte desktopappens godkännandedialoger.

Prototypen finns på en separat kastbar Git-gren. Den ska inte användas som
produktionsimplementation eller som bevis för produktionsgarantier.

# Åtkomst efter fullständig återställning

## Förutsättningar

Använd endast den isolerade förberedelsen med påhittade personer. Den skapar
ett hushåll med Alex som administratör och Robin som medlem, tar en kopia,
återkallar Robin och återställer kopian med en ny generation. Inga verkliga
leverantörer anropas. Granskningen kan behålla Robin endast när scenariot
uttryckligen anger att personen ska ha aktuell åtkomst.

```sh
npm run build
npm run test:env -- tsx scripts/manual-installation-recovery.ts
```

Öppna den utskrivna adressen. Välj Google och fortsätt till Google för att
logga in. Kommandot `member` väljer Robin inför nästa inloggning, `owner`
väljer Alex och `recovery` väljer den utsedda personen. Använd separata
webbläsarprofiler för personer som ska vara inloggade samtidigt.
`restart` startar om samma installation. Avsluta med `quit` och kör om
kommandot för nästa fall; den tillfälliga databasen tas bort vid avslut.

För RESTORE-03, starta i stället med:

```sh
npm run test:env -- tsx scripts/manual-installation-recovery.ts --new-administrator
```

Då utses Lo, som saknas i kopian, till återställningsadministratör.
Testa på dator och vid 390 pixlars bredd. Använd tangentbord för formuläret.
Kontrollera synligt fokus och läsbarhet i ljust och mörkt tema.

## Testfall

### RESTORE-01: Återkallad medlem utesluts innan åtkomsten öppnas

**Motsvarighet:**
[installation-recovery.spec.ts](../../tests/integration/installation-recovery.spec.ts).

<!--
```manual-mapping
{
  "counterpart": {
    "runner": "playwright",
    "suite": "integration",
    "spec": "tests/integration/installation-recovery.spec.ts",
    "caseId": "RESTORE-01"
  },
  "reference": "390 pixlars bredd, tangentbord, två personer och omstart.",
  "outcomes": [
    "Robin är spärrad under och efter granskning.",
    "Alex kan öppna hushållet efter bekräftelse och omstart."
  ]
}
```
-->

1. Logga in som Alex. Kontrollera att rubriken för granskningen får fokus
   och att hela medlemslistan med roller visas.
2. Välj `member` och logga in som Robin i en separat profil. Kontrollera
   beskedet om spärren och att Robin inte kan bekräfta listan.
3. Hos Alex, använd tangentbordet för att välja **Ingen åtkomst** för Robin.
   Tabba till **Bekräfta hela listan och öppna åtkomsten** och tryck Retur.
4. Kontrollera att Alex ser hushållet. Ladda om Robins sida och kontrollera
   att Robin saknar tillgång.
5. Kör `restart` och ladda om båda sidorna.

**Förväntat resultat:** Spärren består tills Alex bekräftar. Därefter har
Alex tillgång och Robin saknar tillgång, även efter omstart.

### RESTORE-02: En korrekt oförändrad lista bekräftas i en handling

**Motsvarighet:**
[installation-recovery.spec.ts](../../tests/integration/installation-recovery.spec.ts).

<!--
```manual-mapping
{
  "counterpart": {
    "runner": "playwright",
    "suite": "integration",
    "spec": "tests/integration/installation-recovery.spec.ts",
    "caseId": "RESTORE-02"
  },
  "reference": "Datorvy; båda personerna behålls utan ändringar.",
  "outcomes": [
    "Hela listan kan bekräftas utan individuella godkännanden.",
    "Båda behållna personerna får tillgång."
  ]
}
```
-->

1. För detta fall anger aktuella oberoende uppgifter att både Alex och Robin
   ska ha tillgång med kopians roller. Logga in som Alex.
2. Kontrollera **Administratör** för Alex och **Medlem** för Robin. Låt
   valen vara oförändrade och bekräfta hela listan.
3. Kontrollera att hushållet öppnas. Välj `member` och logga in som Robin
   i en annan profil.

**Förväntat resultat:** Båda personerna har tillgång. Ingen kvarvarande
person behöver godkännas individuellt.

### RESTORE-03: En ny utsedd person behöver uttryckligen utse administratör

**Motsvarighet:**
[installation-recovery.spec.ts](../../tests/integration/installation-recovery.spec.ts).

<!--
```manual-mapping
{
  "counterpart": {
    "runner": "playwright",
    "suite": "integration",
    "spec": "tests/integration/installation-recovery.spec.ts",
    "caseId": "RESTORE-03"
  },
  "reference": "Ny person; avvisat försök utan administratör och egen utnämning.",
  "outcomes": [
    "Listan kan inte öppnas utan administratör.",
    "Lo kan uttryckligen utse sig själv.",
    "Alex har därefter medlemsåtkomst utan administration."
  ]
}
```
-->

1. Använd förberedelsen med `--new-administrator` och logga in som Lo.
2. Ändra Alex till **Medlem** och försök bekräfta hela listan.
3. Kontrollera felbeskedet om minst en administratör och att granskningen
   är kvar. Välj **Utse mig till administratör i Hushållet Linden**.
4. Kontrollera Los roll och att rollfältet får fokus. Bekräfta hela listan.
   Hushållet ska öppnas. Öppna **Inställningar → Administrera tillgång**
   som Lo och kopiera sidans adress.
5. Välj `owner` och logga in som Alex i en annan profil. Kontrollera att
   hushållet öppnas och öppna sedan den kopierade administrationsadressen.

**Förväntat resultat:** Det misslyckade försöket lämnar åtkomsten spärrad.
Lo får vanligt medlemskap först genom sitt uttryckliga val och lyckad
bekräftelse. Alex kan därefter läsa hushållet men saknar administration.

HTTP-underlag för identitetskontroll, äldre kopior, gamla inbjudningar och
bevarat innehåll finns i
[restore-access-http.test.ts](../../tests/unit/server/restore-access-http.test.ts)
och
[database-restore-http.test.ts](../../tests/unit/server/database-restore-http.test.ts).
Detta underlag verifierar inte en produktionsinstallations rutiner eller
verkliga skärmläsarbesked.

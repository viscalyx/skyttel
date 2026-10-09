# Manuella testfall för {{område}}

{{Beskriv vilka arbetsflöden testfallen omfattar.}}
Anteckna commit, webbläsare och godkänt eller underkänt resultat vid körning.

## Konfigurerade användare

{{Ange testanvändare, roller, tillgång till hushållet och hur de loggar in.}}

## Allmän förberedelse

1. {{Ange testmiljö, testdata och nödvändiga förberedelser.}}
2. {{Beskriv återställning mellan körningar och vad som ska behållas.}}

## {{Delområde}}

### {{OMRÅDE-01}}: {{arbetsflöde och förväntat utfall}}

**Syfte:** {{Beskriv beteendet som testfallet ska verifiera.}}

**Användare:** {{Ange användare och roller från förberedelsen.}}

**Förutsättningar:** {{Ange testfallets utgångsläge och särskilda testdata.}}

**Separat förberedelse:**

1. {{Ange körbart kommando eller länk till förberedelsen, nödvändiga indata
   och det förväntade utgångsläget. Ange återställning efter felet.}}

{{Välj antingen Automatiskt motsvarande test med counterpart eller Kräver
mänsklig observation med humanObservation. Ta bort hela den andra grenen,
inklusive dess textfält och metadata. Fyll i vald referens och skyddade
resultat.
Använd title i stället för caseId om namnet behövs för att entydigt välja
ett upptäckt test.}}

**Automatiskt motsvarande test (integration eller webbläsare):**
[{{filnamn}}.spec.ts](../../tests/integration/{{filnamn}}.spec.ts),
{{identifierande namn eller stabilt ID för exakt ett motsvarande test}}.

<!--
```manual-mapping
{
  "counterpart": {
    "runner": "playwright",
    "suite": "integration",
    "spec": "tests/integration/{{filnamn}}.spec.ts",
    "caseId": "{{OMRÅDE-01}}"
  },
  "reference": "{{vald bredd, tema och motiverade varianter}}",
  "outcomes": ["{{observerbart skyddat resultat}}"]
}
```
-->

{{För ett motsvarande Chromium-test: använd runner vitest, suite browser och
en länk till tests/browser/{{filnamn}}.test.tsx. Beskriv synligt vilka svar som
är kontrollerade och vilket beständigt sparande som verifieras separat mot
verklig server. Behåll testfallets ID vid flytt mellan sviter.}}

**Kräver mänsklig observation:** {{Ange den faktiska observationen,
utrustningen eller den externa klienten. Ange eventuellt närliggande
automatiskt underlag separat; det utför inte denna observation.}}

<!--
```manual-mapping
{
  "humanObservation": {
    "kind": "{{screen-reader eller annan namngiven observationskategori}}",
    "observation": "{{det som människan måste höra, göra eller känna igen}}"
  },
  "reference": "{{vald utrustning, klient och motiverade varianter}}",
  "outcomes": ["{{observerbart skyddat resultat}}"]
}
```
-->

**Ytterligare underlag:** {{Ange vid behov separat tekniskt underlag,
överlappande test eller verklig leverantörsverifiering med dess syfte.
Lägg referenser i metadatafältet evidence med kind, spec, title eller caseId
samt purpose. Ange runner och suite för upptäckt underlag; utelämna dem för
real-provider. För serverunderlag används runner vitest, suite server och
en länk till tests/unit/server/{{filnamn}}.test.ts.
Ange verklig körning separat från mänsklig observation.}}

**Steg:**

1. {{Beskriv en handling genom det publika användargränssnittet.}}
2. {{Beskriv nästa handling och vad användaren ska kontrollera.}}

**Förväntat resultat:**

- {{Ange observerbart resultat för respektive steg.}}
- {{Ange slutligt tillstånd och relevanta åtkomstgränser.}}

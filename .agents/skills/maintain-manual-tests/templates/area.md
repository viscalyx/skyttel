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

**Integrationstest:**
[{{filnamn}}.spec.ts](../../tests/integration/{{filnamn}}.spec.ts),
{{identifierande namn eller stabilt ID för exakt ett motsvarande test}}.

{{Välj en av följande två grenar och ta bort den andra. Fyll i vald
referens och skyddade resultat. Använd title i stället för caseId om namnet
behövs för att entydigt välja ett upptäckt test.}}

```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/{{filnamn}}.spec.ts",
    "caseId": "{{OMRÅDE-01}}"
  },
  "reference": "{{vald bredd, tema och motiverade varianter}}",
  "outcomes": ["{{observerbart skyddat resultat}}"]
}
```

**Kräver mänsklig observation:** {{Ange den faktiska observationen,
utrustningen eller den externa klienten. Ange eventuellt närliggande
automatiskt underlag separat; det utför inte denna observation.}}

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

**Ytterligare underlag:** {{Ange vid behov separat tekniskt underlag,
överlappande test eller verklig leverantörsverifiering med dess syfte.
Lägg referenser i metadatafältet evidence med kind, spec, title eller
caseId samt purpose. Ange verklig körning separat från mänsklig observation.}}

**Steg:**

1. {{Beskriv en handling genom det publika användargränssnittet.}}
2. {{Beskriv nästa handling och vad användaren ska kontrollera.}}

**Förväntat resultat:**

- {{Ange observerbart resultat för respektive steg.}}
- {{Ange slutligt tillstånd och relevanta åtkomstgränser.}}

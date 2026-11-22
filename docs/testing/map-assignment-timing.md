# Väntetid för ett kartuppdrag

Jämför integrationsgrenens version med jämförelseversion
`713f4074a976d7865c0a7a6a3404c877faa487ce`. Öppna jämförelseversionen
i en separat arbetskopia.

```sh
baslinje=713f4074a976d7865c0a7a6a3404c877faa487ce
git worktree add --detach ../skyttel-baslinje "$baslinje"
```

Kör varje version med samma installationstyp, webbläsare och modellåtkomst.
Verkliga anrop kräver uttryckligt godkännande.

1. Börja med ett nytt samtal, en tom hushållskarta och ett tomt utkast.
   Välj GPT-6.1 Terra och hög resonemangsnivå. Öppna textvyn och starta
   nätverksinspelning i webbläsarens utvecklarverktyg.
2. Skicka ”Lägg till ett objekt av typen Fordon med namnet Blå cykeln i
   mitt utkast. Lämna det i utkastet.” Mät från början av meddelandets
   POST till slutet av första statussvaret med den färdiga ändringen.
   Kontrollera att beskedet gäller Blå cykeln och att den finns en gång i
   utkastet. Anteckna dess id från utkastet i statussvaret.
3. Skicka ”Vad ändrade du precis? Ange objektets namn och id.” Mät från
   början av denna POST till slutet av första statussvaret med det färdiga
   svaret. Kontrollera namnet och id:t mot utkastet samt att kartan
   fortfarande är tom och utkastets version densamma.
4. Anteckna gitrevision, modell, resonemangsnivå och millisekunder per
   meddelande. Redovisa uteblivet eller felaktigt besked som ett sådant
   utfall. Upprepa med ett nytt tomt hushåll för varje mätning.

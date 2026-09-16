# En portabel appcontainer med SQLite och små bilder i databasen

Första Skyttel använder en vanlig Node-appcontainer på Render med
SQLite på beständig disk och små omkodade bildversioner i databasen,
vilket ger en sammanhängande server- och lagringsmodell och förenklar
framtida flytt.
Detta väljs framför det billigare Cloudflare-alternativets större
beroende av leverantörens körmodell och lagringsgränssnitt; SQLite körs
som bibliotek i appen och behöver ingen separat databasserver.
En enda appinstans och korta uppdateringsavbrott accepteras, och
hushållets planerade flyttväg är fullständig export och återimport.

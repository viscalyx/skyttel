# Arbeta med kartan genom en extern assistent

Skyttels anslutning ger en extern textassistent tillgång till ett valt
hushålls sparade karta och ditt eget privata utkast. Personer i kartan
ger aldrig inloggning. Du kan välja en läsanslutning eller uttryckligen
tillåta förslag och sparande. Äldre läsanslutningar förblir läsande.

## Anslut och välj AI-behandling

1. Öppna **Assistentanslutningar** från hushållets karta och kopiera
   MCP-adressen. Den slutar med `/mcp`.
2. Lägg till adressen i din textklient med OAuth. Logga in i Skyttel
   med ditt vanliga inloggningssätt när anslutningen ber om det.
3. Kontrollera ditt namn, Skyttel-användar-ID och klientens namn.
   Klientnamnet är klientens egen uppgift. Välj rätt hushåll.
4. Läs informationen om extern AI-behandling och välj om du tillåter
   behandlingen. Rutan är inte markerad från början. Välj därefter
   **Godkänn läsåtkomst**, eller **Nej, anslut inte**. Om klienten begär
   kartarbete behöver du också markera det separata valet om förslag
   och sparande och välja **Godkänn kartarbete**. Det medgivandet sparar
   inga kartuppgifter och ersätter inte ditt besked för varje sparande.

AI-valet är skilt från cookies och annan lagring. Ett nej lämnar
formulär och manuellt kartarbete tillgängliga. Den externa tjänsten
behandlar de hämtade uppgifterna enligt ditt avtal och dina inställningar
där. En databas i EU garanterar inte att all AI-behandling sker i EU.
Lägg inte lösenord eller andra hemligheter i kartan.

Be assistenten läsa det som behövs för frågan, exempelvis ett visst
objekt eller ditt utkast. En avgränsad objektläsning visar objektets
direkta inkommande och utgående samband. Andra ändpunkter visas med
namn, ID och typ, utan sina övriga uppgifter eller samband. Be om en
ny avgränsad läsning om även deras detaljer behövs. Bara berörda
typdefinitioner följer med; en sökning utan träffar lämnar inget
kartinnehåll. Andra medlemmars privata utkast ingår inte.
Om resultatet uteblir ska assistenten inte påstå sig ha läst informationen.

## Förslag, rättelser och sparande

Be assistenten återuppta ditt utkast och beskriva hela skillnaden mot
den sparade kartan. Tidigare förslag från webbläsaren följer med.
Nya uppgifter och rättelser ändrar bara ditt privata utkast. Du kan
be assistenten kasta ett förslag eller hela utkastet; det ångrar inte
tidigare sparanden. Vanlig borttagning är också ett utkastförslag.

Använd aktuella typer och tydliga identiteter. Om flera personer kan avses
ska assistenten fråga. En olöst identitet stoppar hela sparandet. Du kan
uttryckligen välja ett ospecificerat objekt när det är det du menar.
Okänt, uttryckligen inget och osäkert uppgivet behåller olika betydelser.

”Spara” gäller hela ditt aktuella utkast, även förslag från andra klienter.
En tydlig rättelse och ”spara” i samma meddelande kan utföras utan ett
extra ja bara för att rättelsen ger en ny utkastversion. ”Spara inte”
och hypotetiska frågor ska inte spara något. Om underlaget oväntat ändras
eller en konflikt uppstår ska assistenten beskriva det aktuella utkastet
och invänta ett nytt sparbesked. Oberoende delar sparas inte var för sig.
Du behöver inte besöka kartan eller gå igenom ett extra granskningssteg.

Assistenten ska ge ett kort besked utifrån Skyttels beständiga kvitto.
Kvitto och detaljer kan begäras vid behov. Om svaret försvinner är utfallet
okänt: be assistenten kontrollera sparförsöket innan något nytt görs.
Ett väntande försök kan återförsökas med samma identitet och innehåll;
ett genomfört försök ska bara återge det befintliga kvittot. Även
**Mina sparförsök** i kartan visar resultatet. Avbrutet samtal betyder
inte att ett genomfört sparande är återställt.

Assistenten ansvarar för tolkningen av ditt besked. Servern kontrollerar
åtkomst, versioner och kartans regler. De kontrollerna bevisar inte
oberoende vad du faktiskt har sagt eller hört. Skyttel lagrar inte hela
samtalet som hushållsinnehåll.

## Återkalla anslutningen

Öppna **Assistentanslutningar** och välj **Återkalla anslutning** för
klienten. Du kan återkalla dina egna anslutningar. Administratören kan
också återkalla medlemmarnas anslutningar i sitt hushåll. Återkallat
medlemskap stoppar alla berörda anslutningar, även redan öppna klienter.
En ny anslutning kräver ett nytt medgivande.

Återkallelsen stoppar nya läsningar, förslag och sparanden. Den raderar
inte information som den externa klienten redan har fått. Hantera den
informationen hos klienten enligt dess villkor och inställningar.

Användarhantering, fullständig export, återimport och permanent radering
görs genom Skyttels inloggade administrationssidor när funktionerna är
tillgängliga. Inte heller administratörens assistent har sådana verktyg.

## Textklienter och verifiering

Målet är ChatGPT på webben och Codex-appen. För ChatGPT anger OpenAI att
MCP-appar läggs till genom utvecklarläge med OAuth; kontot och arbetsytans
policy måste tillåta funktionen.
[OpenAI: utvecklarläge](https://developers.openai.com/api/docs/guides/developer-mode).

Codex kan använda Streamable HTTP och OAuth. MCP-inställningar delas av
de lokala klienter som OpenAI beskriver; webbklienten har egen installation.
[OpenAI: MCP](https://learn.chatgpt.com/docs/extend/mcp).

De automatiska proven använder riktig Skyttel, OAuth, MCP och SQLite
med påhittade identiteter. De bevisar inte en anslutning från ett riktigt
inloggat ChatGPT- eller Codex-konto. Verkliga klientprov och resultat
hanteras enligt [integrationsguiden](../development/assistants.md) efter
hela specifikationens implementation, i den separata [restlistan #97](https://github.com/viscalyx/skyttel/issues/97).
Extern röst ingår inte.

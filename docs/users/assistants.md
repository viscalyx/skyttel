# Läs kartan med en extern assistent

Skyttels anslutning ger en extern textassistent tillgång till ett valt
hushålls sparade karta och ditt eget privata utkast. Personer i kartan
ger aldrig inloggning. Anslutningen är läsande: ändringsförslag och
sparande genom assistenten ingår inte ännu.

## Anslut och välj AI-behandling

1. Öppna **Assistentanslutningar** från hushållets karta och kopiera
   MCP-adressen. Den slutar med `/mcp`.
2. Lägg till adressen i din textklient med OAuth. Logga in i Skyttel
   med ditt vanliga inloggningssätt när anslutningen ber om det.
3. Kontrollera ditt namn, Skyttel-användar-ID och klientens namn.
   Klientnamnet är klientens egen uppgift. Välj rätt hushåll.
4. Läs informationen om extern AI-behandling och välj om du tillåter
   behandlingen. Rutan är inte markerad från början. Välj därefter
   **Godkänn läsåtkomst**, eller **Nej, anslut inte**.

AI-valet är skilt från cookies och annan lagring. Ett nej lämnar
formulär och manuellt kartarbete tillgängliga. Den externa tjänsten
behandlar de hämtade uppgifterna enligt ditt avtal och dina inställningar
där. En databas i EU garanterar inte att all AI-behandling sker i EU.
Lägg inte lösenord eller andra hemligheter i kartan.

Be assistenten läsa det som behövs för frågan, exempelvis ett visst
objekt eller ditt utkast. Andra medlemmars privata utkast ingår inte.
Om resultatet uteblir ska assistenten inte påstå sig ha läst informationen.

## Återkalla anslutningen

Öppna **Assistentanslutningar** och välj **Återkalla anslutning** för
klienten. Du kan återkalla dina egna anslutningar. Administratören kan
också återkalla medlemmarnas anslutningar i sitt hushåll. Återkallat
medlemskap stoppar alla berörda anslutningar, även redan öppna klienter.
En ny anslutning kräver ett nytt medgivande.

Återkallelsen stoppar nya hämtningar. Den raderar inte information som
den externa klienten redan har fått. Hantera den informationen hos
klienten enligt dess villkor och inställningar.

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
hanteras enligt [integrationsguiden](../development/assistants.md).
Extern röst ingår inte.

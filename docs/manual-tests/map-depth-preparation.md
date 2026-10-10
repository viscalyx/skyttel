# Förbered djupöverlappning i rymdkartan

Använd ett nytt, isolerat provhushåll med bara de sparade personerna
Lo Exempel och Kim Exempel, tjänsten Molnmusik och sambandet
Lo Exempel → Använder → Molnmusik. Lämna utkastet tomt.
Använd ett datorfönster på minst 1280 × 1000 CSS-pixlar.

Öppna hushållet och kör koden i webbläsarens utvecklarkonsol. Den ändrar
bara den inloggade användarens personliga placeringar. Hushållets uppgifter
och utkast ändras inte. Stäng konsolen och ladda om efter varje variant;
öppna sedan Karta. Använd samma inloggning genom hela provet.

```javascript
async function skyttelDepth(variant) {
  const household = location.pathname.match(/^\/households\/([^/]+)$/)?.[1];
  if (!household) throw new Error('Öppna hushållets sida.');
  const path = `/api/households/${household}/map`;
  const map = await (await fetch(path)).json();
  const view = await (await fetch(`${path}/view`)).json();
  const layouts = {
    behind: [
      [-7.701, 0.797, 8.065],
      [11.086, 0.797, 1.207],
      [-1.693, -0.797, -4.636],
    ],
    ahead: [
      [-7.701, 0.797, 8.065],
      [11.086, 0.797, 1.207],
      [5.078, 2.39, 13.908],
    ],
    sloping: [
      [-6.008, 1.593, 12.701],
      [6.008, -1.593, -12.701],
      [0, 0, 0],
    ],
  };
  if (!layouts[variant]) throw new Error('Välj behind, ahead eller sloping.');
  const names = ['Lo Exempel', 'Molnmusik', 'Kim Exempel'];
  for (const [index, name] of names.entries()) {
    const object = map.objects.find((item) => item.name === name);
    if (!object) throw new Error(`Skapa och spara ${name}.`);
    const [x, y, z] = layouts[variant][index];
    const savedPosition = view.positions.find((item) => item.id === object.id);
    const response = await fetch(`${path}/view/position`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: object.id,
        contentVersion: view.contentVersion,
        version: savedPosition?.version ?? 0,
        position: { x, y, z },
      }),
    });
    if (!response.ok) throw new Error(`Placering misslyckades: ${response.status}`);
  }
}
await skyttelDepth('behind');
```

Första varianten placerar Kim bakom linjen. Inför nästa variant kör du
hela kodblocket igen med sista raden ändrad till
`await skyttelDepth('ahead')` för att placera Kim framför linjen, eller
`await skyttelDepth('sloping')` för en linje med ändpunkter på olika djup.
Vid den sneda linjen går djupordningen från framför till bakom inom Kims
runda symbol. Kör förberedelsen på nytt om flyttning gör överlappningen
svår att se. Avsluta provinstallationen och ta bort dess provdata när
provet är klart enligt installationens vanliga städrutin.

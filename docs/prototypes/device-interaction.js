// Throwaway device/keyboard study. No server state, storage or real speech.
// Reuse the approved spatial view; compare presentation modes, not new designs.
document.title='Skyttel · Pröva enheter och tillgängliga alternativ';
const mobileStart=matchMedia('(max-width: 1100px), (pointer: coarse)').matches;
let presentation=mobileStart?'list':'combined';
const motionPreference=matchMedia('(prefers-reduced-motion: reduce)');
document.body.insertAdjacentHTML('afterbegin','<a class="skip" href="#listHeading">Hoppa till objektlistan</a>');
document.querySelector('header h1').textContent='Samma karta. Flera sätt att arbeta.';
document.querySelector('header p').textContent='Kan du läsa, ändra och spara genom listan och i en karta som fyller webbytan?';
document.querySelector('.tasks').outerHTML=`<details class="panel tasks"><summary>Provuppgifter och gränser</summary><ol><li>Sök efter Tonmoln familj. Följ sambandet som anger vem som betalar och byt Alex till Kim.</li><li>Lägg till den påhittade tjänsten Bokljus och en koppling från Lo som använder den. Granska ändringslistan, spara allt och ångra.</li><li>Öppna kartan, flytta ett objekt och återgå till listan. Kontrollera att utkast och placering ligger kvar.</li><li>På fysisk pekskärm: välj objekt och samband, rotera, nypzooma och panorera med två fingrar. Håll ett objekt med första fingret och lägg till ett stilla ankarfinger. Dra första fingret uppåt och nedåt för höjdled. Flytta sedan även ankaret för kameran. Lyft ett finger och fortsätt; objektet ska inte följa med.</li><li>Pröva kartan på liggande telefon och båda riktningarna på iPad. Öppna redigering och skärmtangentbordet.</li><li>Använd bara tangentbord och därefter verklig skärmläsare genom listan. Pröva namn, samband, borttagning, sparande och ångring.</li></ol><p>Påhittade data och enbart minnestillstånd. Ingen mikrofon eller AI-tjänst. Skärmstorlek och programstyrda gester bevisar inte stöd på en fysisk enhet. Använd inga verkliga hushållsuppgifter.</p></details>`;
const nav=document.createElement('nav');nav.className='device-nav';nav.setAttribute('aria-label','Arbetsvy');
nav.innerHTML='<button id="listMode">Lista och detaljer</button><button id="combinedMode">Samlad vy</button><button id="openMap" class="primary">Öppna karta över hela webbytan</button><button id="reviewDraft">Granska ändringar</button>';
$('status').before(nav);$('status').tabIndex=-1;$('status').setAttribute('aria-atomic','true');
document.querySelector('.layout').prepend($('listPanel'));
$('listPanel').classList.add('panel');
$('listPanel').querySelector('h3').outerHTML='<h2 id="listHeading" tabindex="-1">Hitta och välj objekt <span id="count" class="badge"></span></h2>';
$('detailPanel').querySelector('h2').id='detailHeading';$('detailHeading').tabIndex=-1;
$('detailPanel').querySelector(':scope > h3').id='changesHeading';$('changesHeading').tabIndex=-1;
$('detailPanel').setAttribute('aria-labelledby','detailHeading');
$('listPanel').insertAdjacentHTML('beforeend',`<div class="quick-actions"><details id="addObjectDetails"><summary>Lägg till objekt</summary><form id="newObject"><label>Namn<input name="name" required placeholder="Exempel: Bokljus" autocomplete="off"></label><label>Typ<select name="type">${['Person','Tjänst','Abonnemang','Tjänstekonto','Kort','Bankkonto','E-postadress'].map(t=>'<option>'+t+'</option>').join('')}</select></label><button class="primary">Föreslå nytt objekt</button></form></details><details id="addRelationDetails"><summary>Lägg till samband</summary><form id="newRelation"><label>Från<select name="from"></select></label><label>Samband<select name="kind">${['använder','betalar','äger','betalas med','hör till','gäller tjänstekonto','inloggningsadress','kontaktadress','ger tillgång till'].map(t=>'<option>'+t+'</option>').join('')}</select></label><label>Till<select name="to"></select></label><button class="primary">Föreslå nytt samband</button></form><p class="hint">Provet erbjuder exempel på samband. Det prövar redigeringen, inte hela domänens regler.</p></details></div>`);
// Search belongs to the list route and remains available without spatial navigation.
const toolbar=$('search').closest('.toolbar');
const searchRow=document.createElement('div');searchRow.className='row toolbar';
searchRow.append($('search').closest('label'),$('type').closest('label'));
$('objects').before(searchRow);
$('narrow').closest('label').remove();
// render() still reads this original option; keep it outside the UI.
const narrowInput=document.createElement('input');narrowInput.type='checkbox';narrowInput.id='narrow';narrowInput.hidden=true;toolbar.append(narrowInput);
const cameraTools=document.createElement('div');cameraTools.id='cameraTools';
let cameraChild=$('viewControls');while(cameraChild){const next=cameraChild.nextSibling;cameraTools.append(cameraChild);cameraChild=next;}
$('spaceArea').append(cameraTools);
$('viewControls').insertAdjacentHTML('beforeend','<button data-pan="left">Panorera ←</button><button data-pan="right">Panorera →</button><button data-pan="up">Panorera ↑</button><button data-pan="down">Panorera ↓</button>');
cameraTools.insertAdjacentHTML('beforeend','<p>Håll fingret stilla på ett objekt i drygt en halv sekund för att öppna menyn. Lyft fingret och välj Redigera objekt, Visa kopplingar eller Ta bort objekt. På datorn kan du högerklicka.</p><p id="motionNote">Kameran byter läge direkt, utan animation. Listläget kräver ingen rumslig navigering.</p>');
const shellBar=document.createElement('div');shellBar.id='mapShellBar';
shellBar.innerHTML='<button id="backToList">Till listan</button><button id="editMapSelection">Redigera val</button><button id="toggleCamera" aria-expanded="false">Kartreglage</button><button id="mapReview">Ändringar</button><span id="mapSelection"></span>';
$('mapPanel').prepend(shellBar);
document.body.insertAdjacentHTML('beforeend','<dialog id="editorDialog" aria-labelledby="detailHeading"><div class="dialog-bar"><button id="closeEditor">Tillbaka till kartan</button></div><p id="dialogStatus" class="notice" role="status" aria-live="polite" aria-atomic="true"></p></dialog>');
document.body.insertAdjacentHTML('beforeend','<dialog id="objectActions" aria-labelledby="objectActionsTitle" aria-describedby="objectActionsHint"><h2 id="objectActionsTitle"></h2><p id="objectActionsHint">Välj vad du vill göra med objektet.</p><button id="actionEdit">Redigera objekt</button><button id="actionFocus">Visa kopplingar</button><button id="actionRemove" class="remove-action">Ta bort objekt…</button><button id="actionCancel">Avbryt</button></dialog>');
let objectActionsNode=null;
function closeObjectActions(restoreFocus=true){
 if(typeof cancelMapLongPress==='function')cancelMapLongPress();
 if(!$('objectActions').open)return;
 $('objectActions').close();objectActionsNode=null;
 if(restoreFocus){
  const target=presentation==='map'?$('editMapSelection'):$('detailHeading');
  if(!target.disabled)target.focus({preventScroll:true});
 }
}
function openObjectActions(id){
 if(!draft.objects[id]||$('editorDialog').open||presentation==='list')return;
 objectActionsNode=id;selected={node:id};render();
 $('objectActionsTitle').textContent=name(id);
 if(!$('objectActions').open)$('objectActions').showModal();
 $('actionEdit').focus({preventScroll:true});
}
function chooseObjectAction(action){
 const id=objectActionsNode;closeObjectActions(false);
 if(!id||!draft.objects[id])return;
 selected={node:id};render();
 if(action==='focus'){focusNode(id);(presentation==='map'?$('editMapSelection'):$('detailHeading')).focus({preventScroll:true});return;}
 openEditor();
 if(action==='remove'){
  const button=$('removeNode'),section=button.closest('details');
  section.open=true;section.querySelector('summary').focus({preventScroll:true});
  queueEditorFocusVisibility();
 }
}
$('actionEdit').onclick=()=>chooseObjectAction('edit');$('actionFocus').onclick=()=>chooseObjectAction('focus');$('actionRemove').onclick=()=>chooseObjectAction('remove');$('actionCancel').onclick=()=>closeObjectActions();
$('objectActions').addEventListener('cancel',e=>{e.preventDefault();closeObjectActions();});
$('objectActions').addEventListener('click',e=>{if(e.target!==$('objectActions'))return;const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeObjectActions();});
const originalNotice=notice;
notice=function(message){originalNotice(message);$('dialogStatus').textContent=message;};
// The list/detail route supplies all content to keyboard and screen-reader users.
// Keep the redrawn SVG out of the tab order and the accessibility tree.
$('space').setAttribute('aria-hidden','true');
let lastDetailReturn=null;
function openEditor(review=false){
 closeObjectActions(false);
 if(presentation==='map'){
  lastDetailReturn=document.activeElement;
  $('editorDialog').append($('detailPanel'));
  $('dialogStatus').textContent=$('status').textContent;
  if(!$('editorDialog').open)$('editorDialog').showModal();
 }
 (review?$('changesHeading'):$('detailHeading')).focus();
 queueEditorFocusVisibility();
}
function closeEditor(){if($('editorDialog').open)$('editorDialog').close();}
$('editorDialog').addEventListener('close',()=>{document.querySelector('.layout').append($('detailPanel'));if(lastDetailReturn?.isConnected&&!lastDetailReturn.disabled&&lastDetailReturn.getClientRects().length)lastDetailReturn.focus();else if(presentation==='map')$('backToList').focus();});
$('closeEditor').onclick=closeEditor;
function setPresentation(mode){
 closeObjectActions(false);
 closeEditor();presentation=mode;
 document.body.classList.toggle('list-mode',mode==='list');document.body.classList.toggle('map-mode',mode==='map');
 $('listMode').setAttribute('aria-pressed',String(mode==='list'));$('combinedMode').setAttribute('aria-pressed',String(mode==='combined'));
 cameraTools.hidden=mode==='map';$('toggleCamera').setAttribute('aria-expanded','false');
 render();
 if(mode==='map')$('backToList').focus();else if(mode==='combined'){$('viewTitle').tabIndex=-1;$('viewTitle').focus();}else $('listHeading').focus();
}
$('listMode').onclick=()=>setPresentation('list');$('combinedMode').onclick=()=>setPresentation('combined');$('openMap').onclick=()=>setPresentation('map');$('backToList').onclick=()=>setPresentation('list');
$('editMapSelection').onclick=()=>openEditor();$('reviewDraft').onclick=()=>openEditor(true);$('mapReview').onclick=()=>openEditor(true);
$('toggleCamera').onclick=()=>{cameraTools.hidden=!cameraTools.hidden;$('toggleCamera').setAttribute('aria-expanded',String(!cameraTools.hidden));};
cameraTools.querySelectorAll('[data-pan]').forEach(b=>b.onclick=()=>{const a=b.dataset.pan;view.panX+=a==='left'?-50:a==='right'?50:0;view.panY+=a==='up'?-50:a==='down'?50:0;notice('Kartan är panorerad. Objektens placeringar är oförändrade.');render();});
function populateRelationForm(){for(const field of ['from','to']){const el=$('newRelation').elements[field],value=el.value;el.innerHTML=options(value);}}
function focusKey(el){
 if(!el||el===document.body)return null;
 if(el.id)return '#'+CSS.escape(el.id);
 for(const key of ['move','portrait','id','link','go','camera'])if(el.dataset?.[key]!==undefined)return '[data-'+key+'="'+CSS.escape(el.dataset[key])+'"]';
 if(el.name&&el.form?.id)return '#'+el.form.id+' [name="'+CSS.escape(el.name)+'"]';
 if(el.tagName==='BUTTON'&&el.form?.id)return '#'+el.form.id+' button';
 return null;
}
const originalRender=render, originalDraw=draw;
let lastRenderedSelection=JSON.stringify(selected);
draw=function(){
 if(!$('space').clientWidth||!$('space').clientHeight)return;
 originalDraw();$('space').querySelectorAll('[tabindex]').forEach(el=>el.tabIndex=-1);
};
render=function(){
 const active=document.activeElement,key=focusKey(active),hadDetail=$('detail').contains(active),sameSelection=lastRenderedSelection===JSON.stringify(selected);
 const open=sameSelection?[...$('detail').querySelectorAll('details[open]')].map(d=>d.querySelector('summary').textContent):[];
 const fields=sameSelection?[...$('detail').querySelectorAll('input[name],select[name]')].map(el=>({form:el.form.id,name:el.name,value:el.value})):[];
 originalRender();
 for(const field of fields){const el=$(field.form)?.elements[field.name];if(el)el.value=field.value;}
 lastRenderedSelection=JSON.stringify(selected);
 for(const d of $('detail').querySelectorAll('details'))d.open=open.includes(d.querySelector('summary').textContent);
 populateRelationForm();
 $('editMapSelection').disabled=!selected.node&&!selected.edge;
 $('mapSelection').textContent=selected.node?name(selected.node):selected.edge?'Samband valt':'Inget valt';
 if(key&&!active.isConnected){const next=document.querySelector(key);if(next&&!next.disabled)next.focus({preventScroll:true});else if(hadDetail)$('detailHeading').focus({preventScroll:true});}
 $('state').textContent=JSON.stringify({presentation,historyCount:history.length,...JSON.parse($('state').textContent)},null,2);
};
const originalSelectNode=selectNode,originalSelectEdge=selectEdge;
selectNode=function(id){originalSelectNode(id);notice(name(id)+' är valt. Detaljer och samband finns i redigeringspanelen.');if(presentation!=='map')$('detailHeading').focus();};
selectEdge=function(id,removed=false){originalSelectEdge(id,removed);notice('Valt samband: '+describe((removed?saved:draft).relations[id])+'.');if(presentation!=='map')$('detailHeading').focus();};
$('newObject').onsubmit=e=>{e.preventDefault();const values=new FormData(e.target),objectName=values.get('name').trim();if(!objectName)return;const id='added'+(++counter);draft.objects[id]={name:objectName,type:values.get('type')};positions[id]=[100,0,0];selected={node:id};$('search').value='';$('type').value='';focus=null;types();render();notice(objectName+' finns nu som ett nytt förslag. Inget är sparat.');$('detailHeading').focus();};
$('newRelation').onsubmit=e=>{e.preventDefault();const values=new FormData(e.target),r=Object.fromEntries(values);if(!r.from||!r.to)return;if(Object.values(draft.relations).some(x=>same(x,r))){notice('Sambandet finns redan.');$('status').focus();return;}const id='addedRelation'+(++counter);draft.relations[id]=r;selected={edge:id};render();notice('Nytt samband föreslås: '+describe(r)+'.');$('detailHeading').focus();};
for(const id of ['save','discard','undo']){const action=$(id).onclick;$(id).onclick=()=>{action();if($('editorDialog').open)$('changesHeading').focus();else $('status').focus();};}
// Escape inside a form or modal must not discard field text or reset map selection.
const originalKeydown=window.onkeydown;
window.onkeydown=e=>{if(e.key==='Escape'&&($('editorDialog').open||$('objectActions').open||e.target.closest('form,input,textarea,select,[contenteditable]')))return;originalKeydown(e);};
function applyMotionPreference(){if(motionPreference.matches)$('universe').checked=false;$('universe').disabled=motionPreference.matches;$('motionNote').textContent=motionPreference.matches?'Minskad rörelse är på i systemet. Stjärnbakgrunden är avstängd. Kameran byter läge utan animation; allt kartarbete går via listan.':'Kameran byter läge direkt, utan animation. Listläget kräver ingen rumslig navigering.';draw();}
motionPreference.addEventListener('change',applyMotionPreference);
let editorFocusFrame;
function queueEditorFocusVisibility(){
 cancelAnimationFrame(editorFocusFrame);
 editorFocusFrame=requestAnimationFrame(()=>{
  const dialog=$('editorDialog'),active=document.activeElement;
  if(!dialog.open||!dialog.contains(active)||active===dialog)return;
  const rect=dialog.getBoundingClientRect(),bar=dialog.querySelector('.dialog-bar');
  // Scroll this dialog only; scrolling the document can fight iOS keyboard panning.
  const top=rect.top+5+(dialog.classList.contains('compact-editor')||bar.contains(active)?0:bar.offsetHeight),bottom=rect.bottom-5;
  let target=active.getBoundingClientRect();
  const label=active.closest('label')?.getBoundingClientRect();
  if(label&&label.height<=bottom-top)target=label;
  const section=active.matches('summary')&&active.closest('details[open]')?.getBoundingClientRect();
  if(section&&section.height<=bottom-top)target=section;
  if(target.top<top)dialog.scrollTop+=target.top-top;
  else if(target.bottom>bottom)dialog.scrollTop+=target.bottom-bottom;
 });
}
$('editorDialog').addEventListener('focusin',queueEditorFocusVisibility);
function syncViewport(){
 const viewport=window.visualViewport,height=viewport?.height||innerHeight,style=document.documentElement.style;
 style.setProperty('--visual-height',height+'px');style.setProperty('--visual-top',(viewport?.offsetTop||0)+'px');
 style.setProperty('--visual-width',(viewport?.width||innerWidth)+'px');style.setProperty('--visual-left',(viewport?.offsetLeft||0)+'px');
 $('editorDialog').classList.toggle('compact-editor',height<260);
 queueEditorFocusVisibility();
}
window.visualViewport?.addEventListener('resize',syncViewport);window.visualViewport?.addEventListener('scroll',syncViewport);window.addEventListener('resize',syncViewport);
syncViewport();applyMotionPreference();
new ResizeObserver(()=>document.documentElement.style.setProperty('--map-bar-height',shellBar.getBoundingClientRect().height+'px')).observe(shellBar);
document.body.classList.toggle('list-mode',presentation==='list');$('listMode').setAttribute('aria-pressed',String(presentation==='list'));$('combinedMode').setAttribute('aria-pressed',String(presentation==='combined'));render();

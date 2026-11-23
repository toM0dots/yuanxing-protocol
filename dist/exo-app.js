/* Game-owned UI lifecycle. The Academy is a separate document and is never
   loaded, mounted, or consulted by this entry point. */
const ExoApp=(()=>{
  let returnFocus=null;
  const dialog=()=>document.getElementById('modal');
  function open(title,html){
    const d=dialog();if(!d.open)returnFocus=document.activeElement;
    d.classList.toggle('exo-diary-modal',html.includes('class="field-diary"'));
    d.classList.toggle('exo-terminal',html.includes('class="exo-shell"'));
    d.classList.toggle('exo-object-dialog',html.includes('exo-object-panel'));
    d.setAttribute('aria-label',title);
    d.innerHTML='<div class="modalhead"><h2></h2><button aria-label="关闭对话框" onclick="closeModal()">×</button></div>'+html;
    d.querySelector('.modalhead h2').textContent=title;
    if(!d.open)d.showModal();else (d.querySelector('.primary:not(:disabled)')||d.querySelector('.modalhead button'))?.focus();
  }
  function close(){const d=dialog();if(!d?.open)return;d.close();const target=document.getElementById('exo-world')||(returnFocus?.isConnected?returnFocus:null);target?.focus({preventScroll:true});returnFocus=null;}
  dialog().addEventListener('cancel',e=>{e.preventDefault();close();});
  dialog().addEventListener('click',e=>{const d=dialog();if(e.target!==d)return;const b=d.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)close();});
  addEventListener('error',()=>{const status=document.getElementById('exo-boot-status');if(status){status.textContent='启动未完成。请重新加载游戏。';document.getElementById('exo-boot-retry').hidden=false;}},true);
  return {open,close};
})();
function modal(title,html){ExoApp.open(title,html);}
function closeModal(){ExoApp.close();}

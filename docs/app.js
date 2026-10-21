(() => {
  'use strict';
  const D=window.XIANGYU_DATA,KEY='xiangyu-zhuanghe-v1';
  const $=(s,p=document)=>p.querySelector(s),$$=(s,p=document)=>[...p.querySelectorAll(s)];
  const ids=D.stops.map(s=>s.id),byId=id=>D.stops.find(s=>s.id===id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const paths={
    'arrow-right':'<path d="M4 12h15m-6-6 6 6-6 6"/>',
    info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.1"/>',
    search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/>',
    bookmark:'<path d="M6 4h12v17l-6-4-6 4z"/>',
    sliders:'<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="2" fill="currentColor"/><circle cx="15" cy="17" r="2" fill="currentColor"/>',
    lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/>',
    download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
    book:'<path d="M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1zm0 0v15"/>',
    home:'<path d="m3 11 9-8 9 8M6 9v12h12V9m-9 12v-7h6v7"/>',
    route:'<circle cx="6" cy="5" r="2"/><circle cx="18" cy="19" r="2"/><path d="M8 5h7a4 4 0 0 1 0 8H9a3 3 0 0 0 0 6h7"/>',
    close:'<path d="m6 6 12 12M6 18 18 6"/>',
    pin:'<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0z"/><circle cx="12" cy="10" r="2.5"/>',
    volume:'<path d="m11 4-6 5H2v6h3l6 5zM15 8c3 2 3 6 0 8m3-11c5 4 5 10 0 14"/>',
    check:'<path d="m5 12 4 4L19 6"/>'
  };
  const icon=n=>`<span class="icon" aria-hidden="true"><svg viewBox="0 0 24 24">${paths[n]||paths.info}</svg></span>`;
  function paintIcons(p=document){$$('[data-icon]',p).forEach(el=>{el.setAttribute('aria-hidden','true');el.innerHTML=`<svg viewBox="0 0 24 24">${paths[el.dataset.icon]||paths.info}</svg>`;});}
  let storageReady=true,state={route:'whole',custom:[],completed:[],favorites:[],note:'',checks:[]};
  try{
    const stored=JSON.parse(localStorage.getItem(KEY)||'null');
    if(stored&&typeof stored==='object'){
      ['completed','favorites','custom'].forEach(k=>{if(Array.isArray(stored[k]))state[k]=[...new Set(stored[k].filter(id=>ids.includes(id)))];});
      if(D.routes.some(r=>r.id===stored.route)||stored.route==='custom')state.route=stored.route;
      if(state.route==='custom'&&!state.custom.length)state.route='whole';
      if(typeof stored.note==='string')state.note=stored.note.slice(0,300);
      if(Array.isArray(stored.checks))state.checks=[...new Set(stored.checks.filter(id=>D.checklist.some(c=>c.id===id)))];
    }
  }catch{storageReady=false;}
  let category='全部',query='',favoritesOnly=false,currentStop=null,answer=null,routeDraft=[],toastTimer,saveTimer;
  function save(){try{localStorage.setItem(KEY,JSON.stringify(state));storageReady=true;return true;}catch{storageReady=false;return false;}}
  function toast(message){clearTimeout(toastTimer);$('#toast').textContent=message;$('#toast').classList.add('show');toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),3000);}
  const selectedIds=()=>state.route==='custom'?state.custom:D.routes.find(r=>r.id===state.route).stops;
  const currentRoute=()=>state.route==='custom'?{name:'我的乡土路线',intro:'按你的兴趣，给乡土故事排一个顺序。',minutes:state.custom.length*3}:D.routes.find(r=>r.id===state.route);
  function renderRoutes(){
    $('#route-options').innerHTML=D.routes.map(r=>`<button class="route-option" data-route="${r.id}" aria-pressed="${state.route===r.id}"><span><strong>${r.name}</strong><small>${r.label}</small></span><span class="route-meta">${r.stops.length} 站 · 线上约 ${r.minutes} 分钟 <i class="route-radio" aria-hidden="true"></i></span></button>`).join('');
    const r=currentRoute();$('#route-title').textContent=r.name;$('#route-description').textContent=r.intro;
    $('#route-line').innerHTML=selectedIds().map((id,i)=>{const s=byId(id),done=state.completed.includes(id);return `<li><button class="route-point ${done?'done':''}" data-open-stop="${s.id}" aria-label="第${i+1}站：${s.title}${done?'，已探索':''}"><span class="route-number">${done?'✓':String(i+1).padStart(2,'0')}</span><strong>${s.title}</strong><small>${s.category}${done?' · 已探索':' · 点开故事'}</small></button></li>`;}).join('');
    $('#start-route').innerHTML=(selectedIds().every(id=>state.completed.includes(id))?'再读一遍旅程':'从'+(state.completed.some(id=>selectedIds().includes(id))?'下一站':'第一站')+'开始')+icon('arrow-right');
  }
  function renderFilters(){
    $('#category-filters').innerHTML=['全部',...new Set(D.stops.map(s=>s.category))].map(c=>`<button class="filter-chip" data-category="${c}" aria-pressed="${category===c}">${c}</button>`).join('');
    $('#favorite-filter').setAttribute('aria-pressed',String(favoritesOnly));$('#favorite-count').textContent=state.favorites.length;
  }
  function renderPlaces(){
    const matches=D.stops.filter(s=>(category==='全部'||s.category===category)&&(!favoritesOnly||state.favorites.includes(s.id))&&[s.title,s.place,s.category,s.lead,s.observation,...s.paragraphs].join(' ').toLowerCase().includes(query.toLowerCase().trim()));
    $('#places-grid').innerHTML=matches.map(s=>`<article class="place-card" data-stop-card="${s.id}"><div class="place-photo-wrap"><button class="place-image-button" data-open-stop="${s.id}" aria-label="阅读${s.title}"><img src="${s.image}" alt="${esc(s.imageAlt)}" loading="lazy" width="400" height="320"></button><span class="place-number">${s.number}</span><button class="bookmark-button" data-bookmark="${s.id}" aria-pressed="${state.favorites.includes(s.id)}" aria-label="${state.favorites.includes(s.id)?'取消收藏':'收藏'}${s.title}">${icon('bookmark')}</button></div><div class="card-category"><span>${s.category}</span>${state.completed.includes(s.id)?'<span class="completed-label">✓ 已探索</span>':''}</div><h3><button data-open-stop="${s.id}">${s.title}</button></h3><p class="place-location">${icon('pin')}${s.place}</p><p class="card-lead">${s.lead}</p><div class="card-footer"><span>${s.tag}</span><button class="card-read" data-open-stop="${s.id}">翻开这一页 ${icon('arrow-right')}</button></div></article>`).join('');
    $('#empty-state').hidden=matches.length>0;$('#places-grid').hidden=matches.length===0;renderFilters();
  }
  function renderJournal(){
    const count=state.completed.length;$('#completed-count').textContent=count;$('#progress-fill').style.width=`${count/ids.length*100}%`;
    $('#journal-stamps').innerHTML=D.stops.map(s=>`<button class="stamp ${state.completed.includes(s.id)?'unlocked':''}" data-open-stop="${s.id}" aria-label="${s.stamp}：${s.title}，${state.completed.includes(s.id)?'已收下':'待探索'}"><span class="stamp-mark">${s.stamp}</span><small>${s.category}</small></button>`).join('');
    $('#note-counter').textContent=`${state.note.length} / 300`;
  }
  function renderChecklist(){
    $('#travel-checklist').innerHTML=D.checklist.map(c=>`<label class="checklist-item"><input type="checkbox" data-check="${c.id}" ${state.checks.includes(c.id)?'checked':''}><span><strong>${c.title}</strong><small>${c.text}</small></span></label>`).join('');
  }
  function renderAll(){renderRoutes();renderPlaces();renderJournal();renderChecklist();}
  function stopVoice(){if('speechSynthesis'in window)window.speechSynthesis.cancel();const btn=$('#story-voice');if(btn){btn.setAttribute('aria-pressed','false');btn.innerHTML=icon('volume')+' 听一听';}}
  function openStop(id){
    const s=byId(id);if(!s)return;stopVoice();currentStop=s;answer=state.completed.includes(id)?s.answer:null;
    $('#story-topline').textContent=`${s.number} / ${s.category} · 庄河乡土旅程`;
    $('#story-content').innerHTML=`<div class="story-hero"><img src="${s.image}" alt="${esc(s.imageAlt)}"><span class="story-hero-caption">${s.place}</span></div><div class="story-body"><div class="story-subline"><p class="section-kicker">${s.tag}</p><button class="story-voice" id="story-voice" aria-pressed="false">${icon('volume')} 听一听</button></div><h2 id="story-title">${s.title}</h2><p class="story-lead">${s.lead}</p>${s.paragraphs.map(p=>`<p class="story-paragraph">${p}</p>`).join('')}<div class="observation"><strong>这一站，留意一个细节</strong><p>${s.observation}</p></div><img class="story-secondary" src="${s.secondImage}" alt="${s.category}主题的前期资料影像" loading="lazy"><p class="source-caption">前期资料影像 · ${s.id==='field'?'R1 第 6 页':s.id==='folk'?'P1 第 6 页':s.id==='berry'?'R1 第 5 页':'P1 第 15 页'}</p><section class="quiz" aria-labelledby="quiz-title"><p class="quiz-kicker">小小发现任务</p><h3 id="quiz-title">${s.prompt}</h3><div id="quiz-options"></div><p class="quiz-feedback" id="quiz-feedback" role="status"></p><div class="story-action"><button class="button primary" id="complete-stop">收下「${s.stamp}」印记 ${icon('check')}</button><button class="text-button" id="story-next"></button></div></section><div class="visit-info"><h3>${icon('pin')} 想在线下继续探索？</h3><p>${s.visit}</p></div><details class="story-sources"><summary>这段故事的资料来源</summary><ul>${s.sources.map(x=>`<li>${x.id} · ${x.page}：${x.detail}</li>`).join('')}</ul></details></div>`;
    renderQuiz();const dialog=$('#story-dialog');if(!dialog.open)dialog.showModal();dialog.scrollTop=0;paintIcons(dialog);
  }
  function renderQuiz(){
    const s=currentStop;if(!s)return;
    $('#quiz-options').innerHTML=s.options.map((o,i)=>`<button class="quiz-option ${answer===i?'selected '+(i===s.answer?'correct':'wrong'):''}" data-answer="${i}" aria-pressed="${answer===i}"><span>${String.fromCharCode(65+i)}</span>${o}</button>`).join('');
    const right=answer===s.answer,done=state.completed.includes(s.id),feedback=$('#quiz-feedback');feedback.textContent=answer===null?'选一个答案，把这一站的发现带走。':right?s.explanation:'再想一想，可以回看上面的故事与观察提示。';feedback.classList.toggle('wrong',answer!==null&&!right);
    $('#complete-stop').disabled=!right;$('#complete-stop').innerHTML=(done?'已收下「'+s.stamp+'」印记':'收下「'+s.stamp+'」印记')+icon('check');
    const list=selectedIds(),index=list.indexOf(s.id),next=index>=0?list[index+1]:null;
    $('#story-next').textContent=next?'下一站：'+byId(next).category+' ↗':'去看看旅行手账 ↗';$('#story-next').dataset.next=next||'';
  }
  function editRoute(){
    routeDraft=[...selectedIds().map(id=>({id,checked:true})),...ids.filter(id=>!selectedIds().includes(id)).map(id=>({id,checked:false}))];
    renderEditor();$('#route-dialog').showModal();
  }
  function renderEditor(){
    $('#route-editor').innerHTML=routeDraft.map((item,i)=>`<div class="route-edit-item"><label><input type="checkbox" data-route-check="${item.id}" ${item.checked?'checked':''}><span>${byId(item.id).title}</span></label><button class="icon-button" data-move="up" data-id="${item.id}" ${i===0?'disabled':''} aria-label="上移${byId(item.id).title}">↑</button><button class="icon-button" data-move="down" data-id="${item.id}" ${i===routeDraft.length-1?'disabled':''} aria-label="下移${byId(item.id).title}">↓</button></div>`).join('');
  }
  function download(filename,content,type){const blob=new Blob([content],{type});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);}
  function dateString(){return new Date().toLocaleDateString('zh-CN',{year:'numeric',month:'2-digit',day:'2-digit'});}
  function exportNotes(){
    const out=['乡遇一线 · 我的庄河手记',dateString(),'','本次路线：'+currentRoute().name,...selectedIds().map((id,i)=>`${i+1}. ${byId(id).title} ${state.completed.includes(id)?'[已探索]':'[待探索]'}`),'','我的发现：',state.note||'还没有写下文字记录。','','主题印记：'+state.completed.map(id=>byId(id).stamp).join('、'),'','说明：本手账记录线上探索。实际到访前，请核实地址、开放与接待条件。'].join('\n');
    download('乡遇一线_我的庄河手记.txt','\uFEFF'+out,'text/plain;charset=utf-8');toast('文字手账已导出。');
  }
  function textLines(s,size=19){const out=[];for(let i=0;i<s.length;i+=size)out.push(s.slice(i,i+size));return out;}
  function exportCard(){
    const done=state.completed.length,lines=textLines(state.note||'让一次发现，连起土地、劳动与生活。',21).slice(0,5);
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1440" viewBox="0 0 1080 1440"><rect width="1080" height="1440" fill="#f6f3eb"/><rect x="48" y="48" width="984" height="1344" rx="12" fill="none" stroke="#b5c1a5" stroke-width="2"/><path d="M96 210h888M96 1220h888" stroke="#c8d0bc"/><text x="96" y="140" font-family="serif" font-size="43" fill="#234c3a">乡遇一线</text><text x="984" y="138" text-anchor="end" font-family="sans-serif" font-size="21" fill="#7c856f">${esc(dateString())}</text><text x="96" y="309" font-family="serif" font-size="63" fill="#234c3a">我的庄河手记</text><text x="96" y="367" font-family="sans-serif" font-size="23" fill="#a86b4b">一颗草莓的乡土旅程</text><text x="96" y="459" font-family="sans-serif" font-size="23" fill="#6a795b">${esc(currentRoute().name)} · 线上探索 ${done} / 4</text>${D.stops.map((s,i)=>{const x=190+i*230,on=state.completed.includes(s.id);return `<g><circle cx="${x}" cy="608" r="77" fill="${on?'#f6eade':'#eff1e7'}" stroke="${on?'#b86b4c':'#c4cdb7'}" stroke-width="${on?3:1}"/><circle cx="${x}" cy="608" r="65" fill="none" stroke="${on?'#b86b4c':'#c4cdb7'}"/><text x="${x}" y="623" text-anchor="middle" font-family="serif" font-size="39" fill="${on?'#b86b4c':'#9ba48d'}">${s.stamp}</text><text x="${x}" y="735" text-anchor="middle" font-family="sans-serif" font-size="21" fill="#778368">${s.category}</text></g>`;}).join('')}<text x="96" y="845" font-family="serif" font-size="31" fill="#234c3a">今天，我想记住……</text>${lines.map((l,i)=>`<text x="96" y="${917+i*43}" font-family="sans-serif" font-size="25" fill="#607155">${esc(l)}</text>`).join('')}<text x="96" y="1285" font-family="serif" font-size="29" fill="#234c3a">沿着故事，读懂乡土。</text><text x="96" y="1335" font-family="sans-serif" font-size="19" fill="#89937a">本卡记录线上探索进度。线下到访前请核实接待信息。</text></svg>`;
    download('乡遇一线_我的庄河旅行卡.svg',svg,'image/svg+xml;charset=utf-8');toast('旅行卡已导出，可用浏览器打开或打印。');
  }
  function exportChecklist(){download('乡遇一线_行前清单.txt','\uFEFF'+['乡遇一线 · 庄河行前清单','',...D.checklist.map(c=>`${state.checks.includes(c.id)?'☑':'☐'} ${c.title}\n   ${c.text}`),'','前期资料中的场景可能分布在不同区域；页面连线表示文化体验顺序。','场馆、农田与经营主体的地址、开放、交通和预约信息需逐项确认。'].join('\n'),'text/plain;charset=utf-8');toast('行前清单已导出。');}
  document.addEventListener('click',event=>{
    const target=event.target.closest('button');if(!target)return;
    if(target.dataset.closeDialog){$('#'+target.dataset.closeDialog).close();return;}
    if(target.dataset.openStop){openStop(target.dataset.openStop);return;}
    if(target.dataset.route){state.route=target.dataset.route;save();renderRoutes();return;}
    if(target.dataset.category){category=target.dataset.category;renderPlaces();return;}
    if(target.dataset.bookmark){const id=target.dataset.bookmark,index=state.favorites.indexOf(id);if(index>=0)state.favorites.splice(index,1);else state.favorites.push(id);save();renderPlaces();toast(index>=0?'已取消收藏。':'已收藏这段乡土故事。');return;}
    if(target.dataset.answer!==undefined){answer=Number(target.dataset.answer);renderQuiz();return;}
    if(target.dataset.move){const i=routeDraft.findIndex(x=>x.id===target.dataset.id),j=i+(target.dataset.move==='up'?-1:1);if(j>=0&&j<routeDraft.length){[routeDraft[i],routeDraft[j]]=[routeDraft[j],routeDraft[i]];renderEditor();}return;}
    switch(target.id){
      case 'open-info':case 'open-sources':$('#info-dialog').showModal();break;
      case 'edit-route':editRoute();break;
      case 'save-route':{const chosen=routeDraft.filter(x=>x.checked).map(x=>x.id);if(!chosen.length){toast('请至少保留一个想探索的点位。');break;}state.route='custom';state.custom=chosen;save();renderRoutes();$('#route-dialog').close();toast('你的路线已保存。');break;}
      case 'start-route':openStop(selectedIds().find(id=>!state.completed.includes(id))||selectedIds()[0]);break;
      case 'favorite-filter':favoritesOnly=!favoritesOnly;renderPlaces();break;
      case 'reset-filters':favoritesOnly=false;category='全部';query='';$('#search-input').value='';renderPlaces();break;
      case 'complete-stop':if(currentStop&&answer===currentStop.answer){if(!state.completed.includes(currentStop.id))state.completed.push(currentStop.id);save();renderAll();renderQuiz();toast('已收下「'+currentStop.stamp+'」印记。');}break;
      case 'story-next':{const id=target.dataset.next;if(id)openStop(id);else{$('#story-dialog').close();location.hash='journal';$('#journal-title').setAttribute('tabindex','-1');$('#journal-title').focus({preventScroll:true});}break;}
      case 'story-voice':{
        if(!('speechSynthesis'in window)){toast('当前浏览器暂不支持朗读，可阅读图文故事。');break;}
        if(window.speechSynthesis.speaking){stopVoice();break;}
        const utterance=new SpeechSynthesisUtterance(currentStop.title+'。'+currentStop.lead+'。'+currentStop.paragraphs.join('。'));utterance.lang='zh-CN';utterance.rate=.9;utterance.onend=stopVoice;utterance.onerror=()=>{stopVoice();toast('朗读暂时不可用，可继续阅读故事。');};target.innerHTML=icon('volume')+' 停止朗读';target.setAttribute('aria-pressed','true');window.speechSynthesis.speak(utterance);break;
      }
      case 'export-card':exportCard();break;
      case 'export-notes':exportNotes();break;
      case 'download-checklist':exportChecklist();break;
    }
  });
  document.addEventListener('change',event=>{if(event.target.dataset.check){const id=event.target.dataset.check;state.checks=event.target.checked?[...new Set([...state.checks,id])]:state.checks.filter(x=>x!==id);save();}if(event.target.dataset.routeCheck){const item=routeDraft.find(x=>x.id===event.target.dataset.routeCheck);if(item)item.checked=event.target.checked;}});
  $('#search-input').addEventListener('input',event=>{query=event.target.value;renderPlaces();});
  $('#journal-note').value=state.note;$('#journal-note').addEventListener('input',event=>{state.note=event.target.value.slice(0,300);$('#note-counter').textContent=`${state.note.length} / 300`;$('#note-status').textContent='正在保存……';clearTimeout(saveTimer);saveTimer=setTimeout(()=>{$('#note-status').textContent=save()?'已保存在当前浏览器':'浏览器未允许保存，请导出手账留存';},350);});
  $('#journal-date').textContent=dateString();
  $$('dialog').forEach(dialog=>{dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});});
  $('#story-dialog').addEventListener('close',stopVoice);
  document.addEventListener('keydown',event=>{if(event.key==='/'&&!['INPUT','TEXTAREA'].includes(document.activeElement.tagName)&&!$('dialog[open]')){event.preventDefault();$('#search-input').focus();}});
  window.addEventListener('pagehide',()=>{clearTimeout(saveTimer);save();});
  if('IntersectionObserver'in window){const observer=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting)$$('.mobile-nav a').forEach(a=>a.classList.toggle('active',a.hash==='#'+entry.target.id));});},{rootMargin:'-10% 0px -65% 0px'});['home','journey','places','journal'].forEach(id=>observer.observe($('#'+id)));}
  paintIcons();renderAll();if(!storageReady)$('#note-status').textContent='浏览器未允许保存，请导出手账留存';
})();

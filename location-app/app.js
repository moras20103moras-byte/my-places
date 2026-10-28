'use strict';
const $=s=>document.querySelector(s);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);
const FIELDS=[['building','اسم المبنى أو المنشأة','text'],['floor','رقم الدور','text'],['unit','رقم الشقة أو الوحدة','text'],['entrance','وصف الباب أو المدخل','area'],['access','تعليمات الوصول','area'],['notes','ملاحظات إضافية','area']];
const LABELS={building:'المبنى',floor:'الدور',unit:'رقم الشقة',entrance:'المدخل',access:'تعليمات الوصول',notes:'ملاحظات'};
const sorts={new:(a,b)=>b.updated-a.updated,old:(a,b)=>a.created-b.created,name:(a,b)=>a.name.localeCompare(b.name,'ar')};
const store={get:k=>{try{return localStorage.getItem(k)}catch(e){return null}},set:(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}}};
let places=[],urls=[],q='',sort=store.get('sort')in sorts?store.get('sort'):'new',draft=null,tt;
const app=$('#app');
const ext=t=>/png/.test(t)?'png':/webp/.test(t)?'webp':/gif/.test(t)?'gif':'jpg';
const fname=n=>(n||'location').replace(/[\\/:*?"<>|\s]+/g,'-').slice(0,40);
const U=b=>{const u=URL.createObjectURL(b);urls.push(u);return u};
const clean=()=>{urls.forEach(u=>URL.revokeObjectURL(u));urls=[]};
function toast(m,err){const t=$('#toast');t.textContent=m;t.className='on'+(err?' err':'');clearTimeout(tt);tt=setTimeout(()=>t.className='',3200)}
function title(t,back){$('#ttl').textContent=t;$('#bk').hidden=!!back}
function buildText(p){
  const L=[p.name];
  if((p.mapUrl||'').trim())L.push(p.mapUrl.trim());
  const V=k=>(p[k]||'').trim();
  const D=[];
  if(V('building'))D.push(V('building'));
  if(V('floor'))D.push('الدور: '+V('floor'));
  if(V('unit'))D.push('الشقة: '+V('unit'));
  if(V('entrance'))D.push(V('entrance'));
  if(V('access'))D.push(V('access'));
  if(V('notes'))D.push(V('notes'));
  return L.join('\n')+(D.length?'\n\n'+D.join('\n'):'');
}
async function copy(text){
  try{await navigator.clipboard.writeText(text);return true}catch(e){}
  try{const a=document.createElement('textarea');a.value=text;a.style.cssText='position:fixed;opacity:0';document.body.appendChild(a);a.focus();a.select();const ok=document.execCommand('copy');a.remove();return ok}catch(e){return false}
}
async function doCopy(p){(await copy(buildText(p)))?toast('تم نسخ التفاصيل'):toast('تعذر النسخ. حدد النص يدويًا من صفحة التفاصيل.',1)}
function sheet(html,onclick){const m=$('#modal');m.hidden=false;m.innerHTML=html;m.onclick=e=>{const b=e.target.closest('button');if(e.target===m||(b&&b.dataset.k==='x')){m.hidden=true;m.innerHTML=''}else if(b&&onclick)onclick(b.dataset.k,m)}}
function closeSheet(){const m=$('#modal');m.hidden=true;m.innerHTML=''}
async function share(p){
  const text=buildText(p);
  const files=p.photos.map((x,i)=>new File([x.blob],fname(p.name)+'-'+(i+1)+'.'+ext(x.type),{type:x.type||'image/jpeg'}));
  const canF=files.length&&navigator.canShare&&navigator.canShare({files});
  const cp=files.length?copy(text):null;
  const done=async()=>toast(files.length&&cp&&await cp?'تمت المشاركة. التفاصيل منسوخة: الصقها في خانة الرسالة إن لم تظهر.':'تمت المشاركة');
  try{
    if(!navigator.share)return fallback(p,text,files,'هذا المتصفح لا يدعم قائمة المشاركة.',canF);
    if(!files.length){await navigator.share({title:p.name,text});return toast('تمت المشاركة')}
    if(canF&&navigator.canShare({files,text})){await navigator.share({title:p.name,text,files});return done()}
    return fallback(p,text,files,'جهازك لا يدعم مشاركة النص والصور معًا في خطوة واحدة.',canF);
  }catch(e){
    if(e&&e.name==='AbortError')return;
    fallback(p,text,files,'تعذرت المشاركة ('+(e&&e.name||'خطأ')+').',canF);
  }
}
function shareMenu(p){
  if(!p.photos.length)return share(p);
  const text=buildText(p);
  const files=p.photos.map((x,i)=>new File([x.blob],fname(p.name)+'-'+(i+1)+'.'+ext(x.type),{type:x.type||'image/jpeg'}));
  const canF=navigator.canShare&&navigator.canShare({files});
  sheet('<div class="box"><b>اختر طريقة الإرسال</b><p class="note">واتساب وبعض التطبيقات تتجاهل النص عند إرسال الصور معًا، والأضمن إرسالهما بخطوتين. ابقَ على هذه الشاشة بين الخطوتين.</p><button data-k="txt">1) مشاركة النص</button>'+(canF?'<button data-k="img">2) مشاركة الصور ('+files.length+')</button>':'')+'<button class="sec" data-k="all">مشاركة النص والصور معًا</button><button class="ghost" data-k="x">إغلاق</button></div>',async k=>{
    try{
      if(k==='txt'){if(!navigator.share)return doCopy(p);await navigator.share({title:p.name,text})}
      else if(k==='img')await navigator.share({files});
      else if(k==='all'){closeSheet();share(p)}
    }catch(e){if(!e||e.name!=='AbortError')toast('تعذرت المشاركة.',1)}
  });
}
function fallback(p,text,files,why,canF){
  sheet('<div class="box"><b>'+esc(why)+'</b><p class="note">اختر طريقة بديلة:</p><button data-k="copy">نسخ النص</button>'+
   (navigator.share?'<button class="sec" data-k="txt">مشاركة النص فقط</button>':'')+
   (canF?'<button class="sec" data-k="img">مشاركة الصور فقط</button>':'')+
   (files.length?'<button class="sec" data-k="save">تنزيل الصور</button>':'')+
   '<button class="ghost" data-k="x">إغلاق</button></div>',async k=>{
    try{
      if(k==='copy')await doCopy(p);
      if(k==='txt'){await navigator.share({title:p.name,text});closeSheet()}
      if(k==='img'){await navigator.share({files});closeSheet()}
      if(k==='save'){files.forEach(f=>dl(f));toast('جارٍ تنزيل الصور')}
    }catch(e){if(!e||e.name!=='AbortError')toast('لم تنجح العملية.',1)}
  });
}
function dl(file){const a=document.createElement('a');a.href=URL.createObjectURL(file);a.download=file.name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},4000)}
async function shrink(f){
  try{
    const b=await createImageBitmap(f),s=Math.min(1,1600/Math.max(b.width,b.height));
    const c=document.createElement('canvas');c.width=Math.round(b.width*s);c.height=Math.round(b.height*s);
    c.getContext('2d').drawImage(b,0,0,c.width,c.height);
    const o=await new Promise(r=>c.toBlob(r,'image/jpeg',.85));if(o)return o;
  }catch(e){}
  return f;
}
/* ---------- views ---------- */
function home(){
  clean();draft=null;title('مواقعي');
  app.innerHTML='<div class="bar"><input id="q" type="search" placeholder="ابحث باسم الموقع" value="'+esc(q)+'" aria-label="بحث"><select id="s" aria-label="الترتيب"><option value="new">الأحدث</option><option value="old">الأقدم</option><option value="name">الاسم</option></select></div><div id="cards"></div><button class="big fab" data-act="add">+ إضافة موقع</button>';
  $('#s').value=sort;cards();
}
function cards(){
  clean();
  const t=q.trim().toLowerCase();
  const r=places.filter(p=>!t||p.name.toLowerCase().includes(t)||(p.building||'').toLowerCase().includes(t)).sort(sorts[sort]);
  $('#cards').innerHTML=r.length?r.map(p=>{
    const sub=[p.building,p.floor&&'الدور '+p.floor,p.unit&&'شقة '+p.unit].filter(Boolean).join(' - ');
    return '<div class="card"><div class="top" data-act="open" data-id="'+p.id+'"><div class="th"'+(p.photos[0]?' style="background-image:url('+U(p.photos[0].blob)+')"':'')+'>'+(p.photos[0]?'':'بلا صور')+'</div><div><h3>'+esc(p.name)+'</h3><p class="meta">'+esc(sub||'بدون تفاصيل')+'</p><p class="meta">'+p.photos.length+' صور</p></div></div><div class="bar"><button class="sec" data-act="copy" data-id="'+p.id+'">نسخ التفاصيل</button><button data-act="share" data-id="'+p.id+'">مشاركة مع الصور</button></div></div>';
  }).join(''):'<div class="empty">'+(places.length?'لا توجد نتائج مطابقة للبحث.':'لا توجد مواقع محفوظة بعد.<br>اضغط «إضافة موقع» للبدء.')+'</div>';
}
function detail(p){
  clean();title('تفاصيل الموقع',1);
  const rows=(p.mapUrl?'<p><b>رابط Google Maps</b><a href="'+esc(p.mapUrl)+'" target="_blank" rel="noopener" dir="ltr">فتح في الخرائط</a></p>':'')+
    FIELDS.filter(f=>(p[f[0]]||'').trim()).map(f=>'<p><b>'+f[1]+'</b>'+esc(p[f[0]])+'</p>').join('');
  app.innerHTML='<h2>'+esc(p.name)+'</h2><div class="stack"><button class="big sec" data-act="copy" data-id="'+p.id+'">نسخ التفاصيل</button><button class="big" data-act="share" data-id="'+p.id+'">مشاركة التفاصيل والصور</button><button class="big sec" data-act="txt" data-id="'+p.id+'">مشاركة النص فقط</button></div>'+
   (rows?'<div class="kv">'+rows+'</div>':'')+
   (p.photos.length?'<h3>الصور</h3><div class="grid">'+p.photos.map((x,i)=>'<div class="ph" role="button" data-act="view" data-i="'+i+'" data-id="'+p.id+'" style="background-image:url('+U(x.blob)+')"></div>').join('')+'</div>':'')+
   '<p class="note">أنشئ: '+fmt(p.created)+' - آخر تعديل: '+fmt(p.updated)+'</p><div class="row"><button class="sec" data-act="edit" data-id="'+p.id+'">تعديل</button><button class="danger" data-act="del" data-id="'+p.id+'">حذف</button></div><p></p><button class="ghost big" data-act="home">رجوع للقائمة</button>';
}
const fmt=d=>new Date(d).toLocaleDateString('ar',{year:'numeric',month:'short',day:'numeric'});
function form(p){
  clean();
  draft=p?{...p,photos:[...p.photos]}:{id:uid(),name:'',mapUrl:'',photos:[],created:Date.now(),updated:Date.now(),isNew:true};
  FIELDS.forEach(f=>{if(draft[f[0]]==null)draft[f[0]]=''});
  title(p?'تعديل الموقع':'موقع جديد',1);
  app.innerHTML='<label>اسم الموقع (مطلوب)<input id="f_name" value="'+esc(draft.name)+'" maxlength="120"></label><label>رابط Google Maps<input id="f_map" dir="ltr" inputmode="url" placeholder="https://maps.app.goo.gl/..." value="'+esc(draft.mapUrl)+'"></label>'+
   FIELDS.map(f=>'<label>'+f[1]+(f[2]==='area'?'<textarea id="f_'+f[0]+'" rows="3">'+esc(draft[f[0]])+'</textarea>':'<input id="f_'+f[0]+'" value="'+esc(draft[f[0]])+'">')+'</label>').join('')+
   '<h3>الصور</h3><div id="pg" class="grid"></div><div class="row" style="margin-top:10px"><button class="sec" data-act="pick">من المكتبة</button><button class="sec" data-act="cam">التقاط صورة</button></div><input id="pick" type="file" accept="image/*" multiple hidden><input id="cam" type="file" accept="image/*" capture="environment" hidden>'+
   '<div class="stack"><button class="big" data-act="save">حفظ</button><button class="ghost big" data-act="cancel">إلغاء</button></div>';
  pg();
}
function pg(){
  $('#pg').innerHTML=draft.photos.map((x,i)=>'<div class="ph" style="background-image:url('+U(x.blob)+')"><div class="tools"><button data-act="pl" data-i="'+i+'" aria-label="تقديم">&rarr;</button><button data-act="pd" data-i="'+i+'" aria-label="حذف الصورة">&times;</button><button data-act="pr" data-i="'+i+'" aria-label="تأخير">&larr;</button></div></div>').join('')||'<p class="note" style="grid-column:1/-1">لم تضف صورًا بعد.</p>';
}
function sync(){draft.name=$('#f_name').value.trim();draft.mapUrl=$('#f_map').value.trim();FIELDS.forEach(f=>draft[f[0]]=$('#f_'+f[0]).value)}
async function save(){
  sync();
  if(!draft.name)return toast('اكتب اسم الموقع أولًا.',1);
  if(draft.mapUrl&&!/^https?:\/\//i.test(draft.mapUrl))return toast('رابط الخرائط يجب أن يبدأ بـ https://',1);
  const o={...draft};delete o.isNew;o.updated=Date.now();
  try{await DB.put(o);const i=places.findIndex(x=>x.id===o.id);i<0?places.push(o):places[i]=o;toast('تم الحفظ');detail(o)}
  catch(e){toast(e&&e.name==='QuotaExceededError'?'مساحة التخزين ممتلئة. احذف صورًا أو مواقع قديمة.':'تعذر الحفظ على هذا الجهاز.',1)}
}
function viewer(p,i){
  const x=p.photos[i];
  sheet('<img src="'+U(x.blob)+'" alt="">'+'<div class="row" style="width:100%;max-width:420px;margin-top:10px">'+(p.photos.length>1?'<button class="sec" data-k="n">التالية</button>':'')+'<button data-k="x">إغلاق</button></div>',(k)=>{if(k==='n')viewer(p,(i+1)%p.photos.length)});
}
async function backupView(){
  clean();title('النسخ الاحتياطي',1);
  app.innerHTML='<h2>النسخ الاحتياطي</h2><p class="note">يحفظ ملف ZIP واحد جميع المواقع والصور. احتفظ به في تطبيق «الملفات» أو iCloud.</p><div class="stack"><button class="big" data-act="exp">تصدير (حفظ أو مشاركة الملف)</button><button class="big sec" data-act="expdl">تنزيل الملف مباشرة</button><button class="big sec" data-act="imp">استيراد نسخة احتياطية</button></div><input id="impf" type="file" accept=".zip,application/zip" hidden><p class="note" id="est"></p><p class="note">يستبدل الاستيراد كل البيانات الحالية، ولا يتم إلا بعد تأكيدك وبعد التحقق من الملف. يحذف iOS أحيانًا بيانات المواقع غير المستخدمة أو عند مسح بيانات Safari، فاحتفظ بنسخة حديثة دائمًا.</p><button class="ghost big" data-act="home">رجوع</button>';
  try{const e=await navigator.storage.estimate();$('#est').textContent='المساحة المستخدمة تقريبًا: '+(e.usage/1048576).toFixed(1)+' ميغابايت'}catch(e){}
}
async function exportZip(mode){
  if(!places.length)return toast('لا توجد مواقع لتصديرها.',1);
  try{
    toast('جارٍ تجهيز النسخة...');
    const ents=[],out=[];
    for(const p of places){const ph=[];for(const x of p.photos){const f='photos/'+x.id+'.'+ext(x.type);ents.push({name:f,data:new Uint8Array(await x.blob.arrayBuffer())});ph.push({id:x.id,name:x.name,type:x.type,file:f})}out.push({...p,photos:ph})}
    ents.unshift({name:'data.json',data:new TextEncoder().encode(JSON.stringify({app:'my-places',version:1,exported:new Date().toISOString(),places:out}))});
    const file=new File([ZIP.create(ents)],'places-backup-'+new Date().toISOString().slice(0,10)+'.zip',{type:'application/zip'});
    if(mode==='share'&&navigator.canShare&&navigator.canShare({files:[file]})){
      try{await navigator.share({files:[file]});return toast('تم تجهيز النسخة، اختر «حفظ في الملفات».')}catch(e){if(e&&e.name==='AbortError')return}
    }
    dl(file);toast('تم تنزيل النسخة الاحتياطية');
  }catch(e){toast('تعذر إنشاء النسخة الاحتياطية.',1)}
}
async function importZip(f){
  try{
    const m=ZIP.read(await f.arrayBuffer()),d=m['data.json'];
    if(!d)throw new Error('format');
    const j=JSON.parse(new TextDecoder().decode(d));
    if(j.app!=='my-places'||j.version!==1||!Array.isArray(j.places))throw new Error('format');
    const list=j.places.map(p=>{
      if(!p||typeof p.id!=='string'||typeof p.name!=='string'||!p.name.trim())throw new Error('format');
      const photos=(Array.isArray(p.photos)?p.photos:[]).map(x=>{const b=m[x.file];if(!b)throw new Error('format');const t=/^image\//.test(x.type)?x.type:'image/jpeg';return{id:String(x.id),name:String(x.name||''),type:t,blob:new Blob([b],{type:t})}});
      const o={id:p.id,created:+p.created||Date.now(),updated:+p.updated||Date.now(),photos,mapUrl:typeof p.mapUrl==='string'?p.mapUrl:''};
      FIELDS.forEach(f=>o[f[0]]=typeof p[f[0]]==='string'?p[f[0]]:'');o.name=p.name;return o;
    });
    if(!confirm('سيتم استبدال جميع المواقع الحالية ('+places.length+') بـ '+list.length+' موقعًا من النسخة. هل تريد المتابعة؟'))return;
    await DB.replaceAll(list);places=list;home();toast('تمت الاستعادة بنجاح');
  }catch(e){toast(e&&e.name==='QuotaExceededError'?'لا توجد مساحة كافية للاستعادة. بياناتك لم تتغير.':'الملف غير صالح أو تالف. لم تتغير بياناتك.',1)}
}
/* ---------- events ---------- */
const byId=id=>places.find(p=>p.id===id);
const H={
  home,add:()=>form(),backup:backupView,cancel:()=>draft&&!draft.isNew&&byId(draft.id)?detail(byId(draft.id)):home(),
  open:id=>detail(byId(id)),copy:id=>doCopy(byId(id)),txt:async id=>{const p=byId(id);try{if(!navigator.share)return doCopy(p);await navigator.share({title:p.name,text:buildText(p)})}catch(e){if(!e||e.name!=='AbortError')toast('تعذرت المشاركة.',1)}},share:id=>shareMenu(byId(id)),edit:id=>form(byId(id)),
  del:async id=>{const p=byId(id);if(!confirm('حذف «'+p.name+'» مع صوره؟ لا يمكن التراجع.'))return;try{await DB.del(id);places=places.filter(x=>x.id!==id);home();toast('تم الحذف')}catch(e){toast('تعذر الحذف.',1)}},
  view:(id,b)=>viewer(byId(id),+b.dataset.i),save,pick:()=>$('#pick').click(),cam:()=>$('#cam').click(),
  pd:(id,b)=>{sync();draft.photos.splice(+b.dataset.i,1);pg()},
  pl:(id,b)=>{const i=+b.dataset.i;if(i>0){const a=draft.photos;[a[i-1],a[i]]=[a[i],a[i-1]];pg()}},
  pr:(id,b)=>{const i=+b.dataset.i,a=draft.photos;if(i<a.length-1){[a[i+1],a[i]]=[a[i],a[i+1]];pg()}},
  exp:()=>exportZip('share'),expdl:()=>exportZip('dl'),imp:()=>$('#impf').click()
};
document.addEventListener('click',e=>{const b=e.target.closest('[data-act]');if(!b)return;const f=H[b.dataset.act];if(f)f(b.dataset.id,b)});
app.addEventListener('input',e=>{if(e.target.id==='q'){q=e.target.value;cards()}});
app.addEventListener('change',async e=>{
  const t=e.target;
  if(t.id==='s'){sort=t.value;store.set('sort',sort);cards()}
  if(t.id==='pick'||t.id==='cam'){
    const fs=[...t.files];t.value='';if(!fs.length)return;
    toast('جارٍ تجهيز الصور...');sync();
    for(const f of fs){if(!/^image\//.test(f.type)&&f.type)continue;const b=await shrink(f);draft.photos.push({id:uid(),name:f.name||'photo.jpg',type:b.type||'image/jpeg',blob:b})}
    pg();toast('تمت إضافة الصور. اضغط «حفظ» لتثبيتها.');
  }
  if(t.id==='impf'){const f=t.files[0];t.value='';if(f)importZip(f)}
});
(async function init(){
  try{
    places=await DB.all();home();
    if(navigator.storage&&navigator.storage.persist)navigator.storage.persist().catch(()=>{});
  }catch(e){app.innerHTML='<div class="empty">تعذر فتح التخزين المحلي. قد تكون في وضع التصفح الخاص أو أن المتصفح لا يدعم IndexedDB.</div>'}
  if('serviceWorker' in navigator)navigator.serviceWorker.register('service-worker.js').catch(()=>{});
})();

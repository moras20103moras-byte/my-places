const DB=(()=>{
  let db;
  const open=()=>db?Promise.resolve(db):new Promise((res,rej)=>{
    if(!window.indexedDB)return rej(new Error('no-idb'));
    const r=indexedDB.open('my-places',1);
    r.onupgradeneeded=()=>r.result.createObjectStore('places',{keyPath:'id'});
    r.onsuccess=()=>{db=r.result;db.onversionchange=()=>db.close();res(db)};
    r.onerror=()=>rej(r.error);
  });
  const tx=async(mode,fn)=>{const d=await open();return new Promise((res,rej)=>{
    const t=d.transaction('places',mode);const q=fn(t.objectStore('places'));
    t.oncomplete=()=>res(q&&q.result);t.onerror=()=>rej(t.error);t.onabort=()=>rej(t.error||new Error('abort'));
  })};
  return{
    all:()=>tx('readonly',s=>s.getAll()),
    put:p=>tx('readwrite',s=>s.put(p)),
    del:id=>tx('readwrite',s=>s.delete(id)),
    replaceAll:l=>tx('readwrite',s=>{s.clear();l.forEach(p=>s.put(p))})
  };
})();

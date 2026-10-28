// Minimal ZIP (store, no compression) writer/reader - no dependencies.
(function(g){
const T=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;T[n]=c>>>0}
const crc=u=>{let c=0xFFFFFFFF;for(let i=0;i<u.length;i++)c=T[(c^u[i])&255]^(c>>>8);return(c^0xFFFFFFFF)>>>0};
const enc=new TextEncoder(),dec=new TextDecoder('utf-8',{fatal:true});
function create(entries){
  const parts=[],cd=[];let off=0;
  for(const e of entries){
    const nm=enc.encode(e.name),d=e.data,c=crc(d);
    const h=new DataView(new ArrayBuffer(30));
    h.setUint32(0,0x04034b50,true);h.setUint16(4,20,true);h.setUint16(6,0x0800,true);h.setUint16(12,0x21,true);
    h.setUint32(14,c,true);h.setUint32(18,d.length,true);h.setUint32(22,d.length,true);h.setUint16(26,nm.length,true);
    parts.push(h.buffer,nm,d);
    const k=new DataView(new ArrayBuffer(46));
    k.setUint32(0,0x02014b50,true);k.setUint16(4,20,true);k.setUint16(6,20,true);k.setUint16(8,0x0800,true);k.setUint16(14,0x21,true);
    k.setUint32(16,c,true);k.setUint32(20,d.length,true);k.setUint32(24,d.length,true);k.setUint16(28,nm.length,true);k.setUint32(42,off,true);
    cd.push(k.buffer,nm);
    off+=30+nm.length+d.length;
  }
  let cdSize=0;for(const x of cd)cdSize+=x.byteLength;
  const z=new DataView(new ArrayBuffer(22));
  z.setUint32(0,0x06054b50,true);z.setUint16(8,entries.length,true);z.setUint16(10,entries.length,true);z.setUint32(12,cdSize,true);z.setUint32(16,off,true);
  return new Blob([...parts,...cd,z.buffer],{type:'application/zip'});
}
function read(buf){
  const u=new Uint8Array(buf),n=u.length,dv=new DataView(buf);
  if(n<22)throw new Error('zip');
  let e=-1;for(let i=n-22;i>=Math.max(0,n-22-65535);i--){if(dv.getUint32(i,true)===0x06054b50){e=i;break}}
  if(e<0)throw new Error('zip');
  const cnt=dv.getUint16(e+10,true);let p=dv.getUint32(e+16,true);const out={};
  for(let i=0;i<cnt;i++){
    if(p+46>n||dv.getUint32(p,true)!==0x02014b50)throw new Error('zip');
    const method=dv.getUint16(p+10,true),cr=dv.getUint32(p+16,true),cs=dv.getUint32(p+20,true),nl=dv.getUint16(p+28,true),el=dv.getUint16(p+30,true),cl=dv.getUint16(p+32,true),lo=dv.getUint32(p+42,true);
    const name=dec.decode(u.subarray(p+46,p+46+nl));p+=46+nl+el+cl;
    if(name.endsWith('/'))continue;
    if(method!==0)throw new Error('unsupported');
    if(lo+30>n||dv.getUint32(lo,true)!==0x04034b50)throw new Error('zip');
    const s=lo+30+dv.getUint16(lo+26,true)+dv.getUint16(lo+28,true);
    if(s+cs>n)throw new Error('zip');
    const d=u.subarray(s,s+cs);if(crc(d)!==cr)throw new Error('crc');
    out[name]=d;
  }
  return out;
}
const API={create,read};
if(typeof module!=='undefined')module.exports=API;else g.ZIP=API;
})(typeof self!=='undefined'?self:globalThis);

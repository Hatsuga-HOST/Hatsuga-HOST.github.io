// worker.js — Obfuscation logic (ringan + cepat)

function progress(p){ postMessage({type:'progress',data:p}); }

function minifyLua(src){
  return src.replace(/--\[\[[\s\S]*?\]\]/g,'')
            .replace(/--.*$/gm,'')
            .replace(/\s+/g,' ')
            .trim();
}

function safeRename(code,key){
  return code.replace(/\b(var|foo|bar|test)\b/g, m=>'_'+(key||'k')+m.length);
}

function encodeStrings(code,key){
  return code.replace(/(["'])(.*?)\1/g,(m,q,s)=>{
    let btoaStr=btoa(s.split('').map(c=>String.fromCharCode(c.charCodeAt(0)^(key||'x').charCodeAt(0))).join(''));
    return `__DECODE("${btoaStr}")`;
  });
}

function runtimeDecoder(key){
  return `
local __K="${key||'x'}"
local function __DECODE(b64)
 local b='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
 b64=b64:gsub('[^'..b..'=]','')
 local t={}local p=1
 for i=1,#b64,4 do
  local c1,c2,c3,c4=b:find(b64:sub(i,i))or 0,b:find(b64:sub(i+1,i+1))or 0,b:find(b64:sub(i+2,i+2))or 0,b:find(b64:sub(i+3,i+3))or 0
  local n=(c1-1)*262144+(c2-1)*4096+(c3-1)*64+(c4-1)
  local a=math.floor(n/65536)%256;local b_=math.floor(n/256)%256;local c_=n%256
  if b64:sub(i+2,i+2)=='=' then t[p]=string.char(a);p=p+1
  elseif b64:sub(i+3,i+3)=='=' then t[p]=string.char(a);t[p+1]=string.char(b_);p=p+2
  else t[p]=string.char(a);t[p+1]=string.char(b_);t[p+2]=string.char(c_);p=p+3 end
 end
 local s=table.concat(t) local o={} for i=1,#s do
  o[i]=string.char(bit32 and bit32.bxor(string.byte(s,i),string.byte(__K,((i-1)%#__K)+1))or (string.byte(s,i)+string.byte(__K,1))%256)
 end return table.concat(o) end
`;
}

onmessage=(e)=>{
  const {src,level,key}=e.data;
  let out=src;
  progress(10);
  if(level>=1) out=minifyLua(out);
  progress(30);
  if(level>=2) out=safeRename(out,key);
  progress(60);
  if(level>=3) out=encodeStrings(out,key);
  progress(90);
  if(level>=3) out=runtimeDecoder(key)+"\n"+out;
  progress(100);
  postMessage({type:'done',data:out});
};

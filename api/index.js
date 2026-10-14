// MORE Templates — mini-site independente (não faz parte do website moreinternationalrealty).
// Lê o MLS via Supabase (somente leitura, RPC search_listings já existente). Não grava nada no banco.
'use strict';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://agippaaddhautvryjpze.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_3uAzyhRUWZoJylSmT8mqJw_C1ckPV01';
const AGENT = {
  phone: process.env.AGENT_PHONE || '+1 (305) 397-4726',
  email: process.env.AGENT_EMAIL || 'roberta@morelati.com',
};
const FONT = process.env.FONT_BASE || '/fonts/';
const fs = require('fs'); const path = require('path');

async function sb(p, opts = {}) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${p}`, { ...opts, headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', ...(opts.headers || {}) } });
  const t = await r.text(); let d = null; try { d = t ? JSON.parse(t) : null; } catch { d = t; }
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${typeof d === 'string' ? d : JSON.stringify(d)}`);
  return d;
}
const COLS = 'listing_id,standard_status,is_rental,list_price,bedrooms,bathrooms_total,living_area,unit_number,street_number,street_name,city,state,subdivision,building_name,public_remarks,photos,photos_count,year_built,list_office_name';
async function findListing(q) {
  q = (q || '').trim().toUpperCase();
  if (!/^[A-Z]{1,2}\d{5,}$/.test(q)) return null;
  const rows = await sb('rpc/search_listings?select=' + COLS, { method: 'POST', body: JSON.stringify({ q, p_rent: 'all', p_limit: 5 }) });
  return rows.find(l => l.listing_id === q) || null;
}

const json = (res, code, o) => { res.statusCode = code; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(o)); };
const html = (res, s) => { res.statusCode = 200; res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.setHeader('Cache-Control', 'public, max-age=300'); res.end(s); };

// ---------- página única: galeria + editor + renderizador canvas ----------
const PAGE = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>MORE Templates</title><link rel="icon" href="/logo-navy.png">
<style>
@font-face{font-family:'Trade Gothic';src:url('${FONT}tg-regular.woff2') format('woff2');font-weight:400;font-display:block}
@font-face{font-family:'Trade Gothic';src:url('${FONT}tg-bold.woff2') format('woff2');font-weight:700;font-display:block}
:root{--navy:#030E2E;--salmon:#F28F7B;--sand:#FAF7F2;--ice:#F2F3F2;--grey:#D1D2D1;--ink:#1b2236}
*{box-sizing:border-box}body{margin:0;font-family:'Trade Gothic',Helvetica,Arial,sans-serif;background:var(--sand);color:var(--navy)}
header{background:var(--navy);color:#fff;padding:16px 28px;display:flex;align-items:center;justify-content:space-between}
header img{height:34px}header a{color:#fff;text-decoration:none;font-size:12px;letter-spacing:.14em;text-transform:uppercase;opacity:.85}
h1{font-size:22px;font-weight:700;margin:0 0 6px}p.sub{margin:0 0 24px;color:#555;font-size:14px}
main{max-width:1240px;margin:0 auto;padding:28px 24px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:20px}
.card{background:#fff;border:1px solid var(--grey);border-radius:10px;overflow:hidden;cursor:pointer;transition:transform .15s,box-shadow .15s}
.card:hover{transform:translateY(-2px);box-shadow:0 10px 30px rgba(3,14,46,.12)}
.card .th{aspect-ratio:1;background:var(--ice);display:flex;align-items:center;justify-content:center;overflow:hidden}.card .th canvas{width:100%;height:100%}
.card .cb{padding:14px 16px}.card .num{font-size:11px;letter-spacing:.18em;color:var(--salmon);text-transform:uppercase}.card .nm{font-weight:700;font-size:15px;margin:3px 0}.card .ds{font-size:12px;color:#666}
.soon{opacity:.55;cursor:default}.soon:hover{transform:none;box-shadow:none}
/* editor */
.ed{display:grid;grid-template-columns:400px 1fr;gap:28px;align-items:start}
@media(max-width:900px){.ed{grid-template-columns:1fr}}
.panel{background:#fff;border:1px solid var(--grey);border-radius:10px;padding:18px}
.panel h3{margin:0 0 12px;font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:#555}
label{display:block;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#666;margin:10px 0 4px}
input[type=text],input[type=number],textarea,select{width:100%;padding:9px 11px;border:1px solid var(--grey);border-radius:6px;font:inherit;font-size:14px;background:#fff;color:var(--navy)}
textarea{min-height:64px;resize:vertical}
.row{display:flex;gap:10px}.row>*{flex:1}
.seg{display:flex;border:1px solid var(--grey);border-radius:6px;overflow:hidden}.seg button{flex:1;border:0;background:#fff;padding:8px;font:inherit;font-size:12px;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;color:#555}.seg button.on{background:var(--navy);color:#fff}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;border:0;border-radius:6px;padding:11px 16px;font:inherit;font-weight:700;font-size:13px;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;background:var(--navy);color:#fff}
.btn.sal{background:var(--salmon);color:var(--navy)}.btn.ghost{background:#fff;color:var(--navy);border:1px solid var(--grey)}
.btn:disabled{opacity:.5;cursor:default}
.mls{display:flex;gap:8px}.mls input{flex:1}
.photos{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:8px;max-height:220px;overflow:auto}.photos img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:4px;cursor:pointer;border:2px solid transparent}.photos img.on{border-color:var(--salmon)}
.prev{position:sticky;top:20px}.stage{background:var(--ice);border:1px solid var(--grey);border-radius:10px;padding:20px;display:flex;justify-content:center}
.stage canvas{max-width:100%;height:auto;box-shadow:0 20px 60px rgba(3,14,46,.18);background:#fff}
.acts{display:flex;gap:10px;margin-top:14px;flex-wrap:wrap}
.msg{font-size:12px;color:#8a3b2a;margin-top:6px;min-height:14px}
.chk{display:flex;align-items:center;gap:8px;font-size:13px;margin-top:10px;text-transform:none;letter-spacing:0;color:var(--navy)}
input[type=range]{width:100%}
.back{font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#555;text-decoration:none;display:inline-block;margin-bottom:14px}
.hidden{display:none}
</style></head><body>
<header><img src="/logo-white.png" alt="MORE International Realty"><a href="https://more-property-pages.vercel.app" target="_blank">Property Pages →</a></header>
<main>
<section id="gallery">
  <h1>Templates MORE</h1><p class="sub">Escolha um template, preencha pelo MLS ou manualmente, baixe a arte em PNG pronta para publicar.</p>
  <div class="grid" id="cards"></div>
</section>
<section id="editor" class="hidden">
  <a href="#" class="back" id="back">← Todos os templates</a>
  <div class="ed">
    <div>
      <div class="panel" id="form"></div>
    </div>
    <div class="prev">
      <div class="panel" style="padding:12px 18px;margin-bottom:12px"><div class="row">
        <div><label>Formato</label><div class="seg" id="fmt"><button data-v="feed" class="on">Feed 1080×1080</button><button data-v="story">Story 1080×1920</button></div></div>
        <div><label>Tema</label><div class="seg" id="theme"><button data-v="dark" class="on">Escuro</button><button data-v="light">Claro</button></div></div>
      </div></div>
      <div class="stage"><canvas id="cv" width="1080" height="1080"></canvas></div>
      <div class="acts"><button class="btn sal" id="dl">⬇ Baixar PNG</button><button class="btn ghost" id="dlall">Baixar os 4 (feed+story, escuro+claro)</button></div>
      <div class="msg" id="pmsg"></div>
    </div>
  </div>
</section>
</main>
<script>
const AGENT=${JSON.stringify(AGENT)};
const C={navy:'#030E2E',salmon:'#F28F7B',sand:'#FAF7F2',ice:'#F2F3F2',grey:'#D1D2D1',white:'#FFFFFF'};
const LOGOS={navy:'/logo-navy.png',white:'/logo-white.png'};
const imgCache={};
function loadImg(src){return new Promise((ok,err)=>{if(!src)return ok(null);if(imgCache[src])return ok(imgCache[src]);const i=new Image();i.crossOrigin='anonymous';i.onload=()=>{imgCache[src]=i;ok(i)};i.onerror=()=>ok(null);i.src=src;});}
const prox=u=>u&&/^https?:/.test(u)?'/api/img?u='+encodeURIComponent(u):u;
const fmtMoney=v=>{v=Number(v||0);return v?'US$ '+Math.round(v).toLocaleString('pt-BR'):'US$ 0.000.000'};
const fmtNum=v=>{v=Number(v||0);return v?Math.round(v).toLocaleString('pt-BR'):'0.000'};

// ---------- templates ----------
const TEMPLATES={
 t02:{num:'Template 02',name:'New Listing',desc:'Imóvel à venda ou locação — puxa do MLS',mls:true,
  fields:[
   ['badge','text','Selo','NEW LISTING'],['loc','text','Bairro · Cidade','BAIRRO · CIDADE, FL'],
   ['l1','text','Endereço (linha 1)','ENDEREÇO DO IMÓVEL'],['l2','text','Unidade (linha 2)','UNIT 0000'],
   ['phrase','textarea','Frase (só no Story)','Uma frase sobre o imóvel: vista, acabamento e o diferencial que justifica a visita.'],
   ['price','text','Preço','US$ 0.000.000'],['psf','text','Linha abaixo do preço','US$ 0.000 POR SQ FT'],
   ['beds','text','Dormitórios','0'],['baths','text','Banheiros','0'],['sqft','text','Sq Ft','0.000'],
   ['cta','text','Chamada','AGENDE SUA VISITA'],['phone','text','Telefone',AGENT.phone]],
  fromListing(l){const hide=document.getElementById('f_hide')?.checked;const bld=(l.building_name||l.subdivision||'').toUpperCase();
   const addr=[l.street_number,l.street_name].filter(Boolean).join(' ').toUpperCase();
   const psf=l.living_area&&l.list_price&&!l.is_rental?'US$ '+Math.round(l.list_price/l.living_area).toLocaleString('pt-BR')+' POR SQ FT':(l.is_rental?'LOCAÇÃO · POR MÊS':'');
   return {badge:l.is_rental?'FOR RENT':'NEW LISTING',loc:[bld,(l.city||'').toUpperCase()+', '+(l.state||'FL')].filter(Boolean).join(' · '),
    l1:hide?bld||addr:addr,l2:hide?(l.city||'').toUpperCase():(l.unit_number?'UNIT '+l.unit_number:(l.city||'').toUpperCase()),
    price:fmtMoney(l.list_price)+(l.is_rental?'/MÊS':''),psf,beds:String(l.bedrooms??0),baths:String(l.bathrooms_total??0).replace('.5',',5'),sqft:fmtNum(l.living_area),
    phrase:(l.public_remarks||'').split(/(?<=\\.)\\s/)[0].slice(0,140)};},
  draw:drawT02},
 t01:{num:'Template 01',name:'Coming Soon · Pré-construção',desc:'Lançamento — preencha e envie a foto',mls:false,
  fields:[
   ['tag','text','Linha superior','COMING SOON · BAIRRO, CIDADE'],['n1','text','Nome (linha 1)','NOME DO'],['n2','text','Nome (linha 2)','EMPREENDIMENTO'],
   ['meta','text','Linha de dados','PRÉ-LANÇAMENTO · ENTREGA 0000 · A PARTIR DE US$ 000.000'],
   ['phrase','textarea','Texto (só no Story)','Três frases sobre o empreendimento: localização e vista, assinatura de arquitetura e interiores, e o que torna a oportunidade única. Quem entra na lista agora escolhe antes.'],
   ['s1','text','Andares','00'],['s2','text','Residências','000'],['s3','text','Penthouses','0'],['s4','text','Início das vendas','0000'],
   ['cta','text','Chamada','LISTA DE PRIORIDADE ABERTA'],['contact','text','Contato','FALE COM A MORE · '+AGENT.phone+' · '+AGENT.email.toUpperCase()]],
  draw:drawT01},
};

// ---------- canvas helpers ----------
function font(ctx,w,px,ls){ctx.font=(w>=700?'700 ':'400 ')+px+'px "Trade Gothic", Helvetica, Arial, sans-serif';try{ctx.letterSpacing=(ls||0)+'px'}catch(e){}}
function fitText(ctx,txt,maxW,px,w,ls,min){min=min||px*0.5;font(ctx,w,px,ls);while(ctx.measureText(txt).width>maxW&&px>min){px-=2;font(ctx,w,px,ls);}return px;}
function wrap(ctx,txt,maxW){const out=[];for(const para of String(txt||'').split('\\n')){let line='';for(const w of para.split(' ')){const t=line?line+' '+w:w;if(ctx.measureText(t).width>maxW&&line){out.push(line);line=w;}else line=t;}out.push(line);}return out;}
function cover(ctx,img,x,y,w,h,fx,fy){if(!img){ctx.fillStyle='#8a94a8';ctx.fillRect(x,y,w,h);return;}const r=Math.max(w/img.width,h/img.height);const sw=w/r,sh=h/r;const sx=(img.width-sw)*(fx??.5),sy=(img.height-sh)*(fy??.5);ctx.drawImage(img,sx,sy,sw,sh,x,y,w,h);}
function icon(ctx,kind,x,y,s,color){ctx.save();ctx.strokeStyle=color;ctx.lineWidth=Math.max(2,s*.09);ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();
 if(kind==='bed'){ctx.moveTo(x,y+s*.75);ctx.lineTo(x+s,y+s*.75);ctx.moveTo(x,y+s*.9);ctx.lineTo(x,y+s*.45);ctx.lineTo(x+s,y+s*.45);ctx.lineTo(x+s,y+s*.9);ctx.moveTo(x+s*.12,y+s*.45);ctx.lineTo(x+s*.12,y+s*.25);ctx.lineTo(x+s*.5,y+s*.25);ctx.lineTo(x+s*.5,y+s*.45);}
 else if(kind==='bath'){ctx.moveTo(x,y+s*.55);ctx.lineTo(x+s,y+s*.55);ctx.lineTo(x+s*.9,y+s*.85);ctx.lineTo(x+s*.1,y+s*.85);ctx.closePath();ctx.moveTo(x+s*.15,y+s*.55);ctx.lineTo(x+s*.15,y+s*.2);ctx.quadraticCurveTo(x+s*.15,y+s*.08,x+s*.3,y+s*.08);ctx.lineTo(x+s*.38,y+s*.08);}
 else {ctx.rect(x+s*.1,y+s*.1,s*.8,s*.8);ctx.moveTo(x+s*.1,y+s*.3);ctx.lineTo(x+s*.3,y+s*.3);ctx.moveTo(x+s*.3,y+s*.1);ctx.lineTo(x+s*.3,y+s*.3);ctx.moveTo(x+s*.9,y+s*.7);ctx.lineTo(x+s*.7,y+s*.7);ctx.moveTo(x+s*.7,y+s*.9);ctx.lineTo(x+s*.7,y+s*.7);}
 ctx.stroke();ctx.restore();}
function footer(ctx,W,H,theme,logos,m){const ink=theme==='dark'?C.white:C.navy;const logo=theme==='dark'?logos.white:logos.navy;const lh=Math.round(W*.034);if(logo){const lw=lh*logo.width/logo.height;ctx.drawImage(logo,m,H-m-lh,lw,lh);}
 ctx.fillStyle=ink;ctx.textBaseline='alphabetic';ctx.textAlign='right';font(ctx,700,Math.round(W*.02),2);const more='MORE.';const mw=ctx.measureText(more).width;ctx.fillText(more,W-m,H-m-lh*.22);font(ctx,400,Math.round(W*.02),2);ctx.fillText('YOU DESERVE',W-m-mw-W*.016,H-m-lh*.22);ctx.textAlign='left';}
function photoBlock(ctx,W,H,theme,img,story,fx,fy){const y0=story?Math.round(H*.60):Math.round(H*.56);const ph=theme==='dark'?(story?Math.round(H*.66):Math.round(H*.66)):y0;cover(ctx,img,0,0,W,ph,fx,fy);
 if(theme==='dark'){const g=ctx.createLinearGradient(0,ph*.5,0,ph);g.addColorStop(0,'rgba(3,14,46,0)');g.addColorStop(1,'rgba(3,14,46,1)');ctx.fillStyle=g;ctx.fillRect(0,0,W,ph);}
 return y0;}
function pill(ctx,txt,x,y,color){font(ctx,700,20,3);const w=ctx.measureText(txt).width+56,h=48;ctx.strokeStyle=color;ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(x,y,w,h,24);ctx.stroke();ctx.fillStyle=C.white;ctx.textBaseline='middle';ctx.fillText(txt,x+28,y+h/2+1);ctx.textBaseline='alphabetic';}

// ---------- TEMPLATE 02 ----------
function drawT02(ctx,W,H,st,d,A){const story=H>W,dark=st.theme==='dark';const ink=dark?C.white:C.navy,sub=dark?'rgba(255,255,255,.72)':'#5b6273';const m=80;const v=(a,b)=>story?a:b;
 ctx.fillStyle=dark?C.navy:C.ice;ctx.fillRect(0,0,W,H);
 let y=photoBlock(ctx,W,H,st.theme,A.photo,story,st.fx,st.fy);
 pill(ctx,(d.badge||'').toUpperCase(),m,m,C.salmon);
 ctx.fillStyle=sub;font(ctx,400,22,4);y+=v(64,44);ctx.fillText((d.loc||'').toUpperCase(),m,y);
 ctx.fillStyle=ink;let px=fitText(ctx,(d.l1||'').toUpperCase(),W-2*m,66,700,1);y+=px+v(14,6);ctx.fillText((d.l1||'').toUpperCase(),m,y);
 px=fitText(ctx,(d.l2||'').toUpperCase(),W-2*m,56,400,1);y+=px+v(4,2);ctx.fillText((d.l2||'').toUpperCase(),m,y);
 if(story&&d.phrase){ctx.fillStyle=sub;font(ctx,400,22,0);y+=44;for(const ln of wrap(ctx,d.phrase,W-2*m).slice(0,3)){ctx.fillText(ln,m,y);y+=32;}y-=32;}
 y+=v(36,28);ctx.fillStyle=C.salmon;ctx.fillRect(m,y,W-2*m,2);
 const colX=W*.58;const top=y;y+=v(72,58);ctx.fillStyle=ink;font(ctx,700,46,1);ctx.fillText(d.price||'',m,y);
 ctx.fillStyle=sub;font(ctx,400,19,2);y+=v(34,30);ctx.fillText((d.psf||'').toUpperCase(),m,y);
 ctx.fillStyle=ink;font(ctx,700,19,2);y+=v(48,40);const cta=(d.cta||'').toUpperCase();ctx.fillText(cta,m,y);const cw=ctx.measureText(cta).width;font(ctx,400,19,2);ctx.fillText('·  '+(d.phone||''),m+cw+16,y);
 const stats=[['bed',d.beds,'DORMITÓRIOS'],['bath',d.baths,'BANHEIROS'],['sqft',d.sqft,'SQ FT']];let sy=top+v(46,36);
 for(const [k,val,l] of stats){icon(ctx,k,colX,sy,26,sub);ctx.fillStyle=ink;font(ctx,400,22,2);ctx.fillText((val||'0')+' '+l,colX+44,sy+22);sy+=v(44,40);}
 footer(ctx,W,H,st.theme,A,m);}

// ---------- TEMPLATE 01 ----------
function drawT01(ctx,W,H,st,d,A){const story=H>W,dark=st.theme==='dark';const ink=dark?C.white:C.navy,sub=dark?'rgba(255,255,255,.72)':'#5b6273';const m=80;const v=(a,b)=>story?a:b;
 ctx.fillStyle=dark?C.navy:C.ice;ctx.fillRect(0,0,W,H);
 const ph=story?Math.round(H*.56):Math.round(H*.46);cover(ctx,A.photo,0,0,W,ph,st.fx,st.fy);
 if(dark){const g=ctx.createLinearGradient(0,ph*.7,0,ph);g.addColorStop(0,'rgba(3,14,46,0)');g.addColorStop(1,'rgba(3,14,46,.55)');ctx.fillStyle=g;ctx.fillRect(0,0,W,ph);}
 let y=ph+v(64,48);ctx.fillStyle=sub;font(ctx,400,22,4);ctx.fillText((d.tag||'').toUpperCase(),m,y);
 ctx.fillStyle=ink;let px=fitText(ctx,(d.n1||'').toUpperCase(),W-2*m,70,700,1);y+=px+v(12,8);ctx.fillText((d.n1||'').toUpperCase(),m,y);
 px=fitText(ctx,(d.n2||'').toUpperCase(),W-2*m,62,400,1);y+=px+v(2,0);ctx.fillText((d.n2||'').toUpperCase(),m,y);
 ctx.fillStyle=sub;const mp=fitText(ctx,(d.meta||'').toUpperCase(),W-2*m,21,400,3,15);y+=mp+v(30,24);ctx.fillText((d.meta||'').toUpperCase(),m,y);
 if(story&&d.phrase){font(ctx,400,22,0);y+=42;for(const ln of wrap(ctx,d.phrase,W-2*m).slice(0,4)){ctx.fillText(ln,m,y);y+=32;}y-=32;}
 y+=v(30,26);ctx.fillStyle=C.salmon;ctx.fillRect(m,y,W-2*m,2);
 const stats=[[d.s1,'ANDARES'],[d.s2,'RESIDÊNCIAS'],[d.s3,'PENTHOUSES'],[d.s4,'INÍCIO DAS VENDAS']];const cw=(W-2*m)/4;y+=v(78,66);
 stats.forEach(([val,l],i)=>{const x=m+cw*i;ctx.fillStyle=ink;font(ctx,400,52,0);ctx.fillText(val||'0',x,y);ctx.fillStyle=sub;font(ctx,400,16,3);ctx.fillText(l,x,y+32);});
 y+=v(96,78);ctx.fillStyle=ink;font(ctx,700,22,2);ctx.fillText((d.cta||'').toUpperCase(),m,y);
 ctx.fillStyle=sub;const cp=fitText(ctx,(d.contact||'').toUpperCase(),W-2*m,18,400,2,13);y+=v(34,30);ctx.fillText((d.contact||'').toUpperCase(),m,y);
 footer(ctx,W,H,st.theme,A,m);}

// ---------- app ----------
const S={tpl:null,fmt:'feed',theme:'dark',photo:null,fx:.5,fy:.5,listing:null,data:{}};
let logos={};
async function boot(){await Promise.all([document.fonts.load('700 20px "Trade Gothic"'),document.fonts.load('400 20px "Trade Gothic"')]).catch(()=>{});
 logos={navy:await loadImg(LOGOS.navy),white:await loadImg(LOGOS.white)};
 const cards=document.getElementById('cards');
 for(const [id,t] of Object.entries(TEMPLATES)){const el=document.createElement('div');el.className='card';el.innerHTML='<div class="th"><canvas width="540" height="540"></canvas></div><div class="cb"><div class="num">'+t.num+'</div><div class="nm">'+t.name+'</div><div class="ds">'+t.desc+'</div></div>';
  const cv=el.querySelector('canvas');const d={};t.fields.forEach(f=>d[f[0]]=f[3]);const ctx=cv.getContext('2d');ctx.scale(.5,.5);t.draw(ctx,1080,1080,{theme:'dark',fx:.5,fy:.5},d,{...logos,photo:null});
  el.onclick=()=>openEditor(id);cards.appendChild(el);}
 for(const n of ['03 Open House','04 Just Sold','05 Price Improvement','06 Depoimento','07 Dica de mercado']){const el=document.createElement('div');el.className='card soon';el.innerHTML='<div class="th" style="font-size:12px;letter-spacing:.16em;color:#999">EM BREVE</div><div class="cb"><div class="num">Template '+n.slice(0,2)+'</div><div class="nm">'+n.slice(3)+'</div><div class="ds">ainda não criado</div></div>';cards.appendChild(el);}
 if(location.hash.startsWith('#t'))openEditor(location.hash.slice(1));}
function openEditor(id){const t=TEMPLATES[id];if(!t)return;S.tpl=id;S.data={};t.fields.forEach(f=>S.data[f[0]]=f[3]);S.photo=null;S.listing=null;location.hash=id;
 document.getElementById('gallery').classList.add('hidden');document.getElementById('editor').classList.remove('hidden');
 const f=document.getElementById('form');let h='<h3>'+t.num+' — '+t.name+'</h3>';
 if(t.mls)h+='<label>Puxar do MLS</label><div class="mls"><input type="text" id="mlsq" placeholder="Número do MLS, ex.: A11966986"><button class="btn" id="mlsgo">Buscar</button></div><label class="chk"><input type="checkbox" id="f_hide"> Ocultar endereço (usa o nome do prédio)</label><div class="msg" id="mmsg"></div><div class="photos" id="photos"></div>';
 h+='<label>Foto '+(t.mls?'(ou envie a sua)':'')+'</label><input type="file" id="up" accept="image/*"><div class="row"><div><label>Enquadrar horizontal</label><input type="range" id="fx" min="0" max="1" step=".01" value=".5"></div><div><label>Enquadrar vertical</label><input type="range" id="fy" min="0" max="1" step=".01" value=".5"></div></div>';
 for(const [k,ty,lb,def] of t.fields){h+='<label>'+lb+'</label>'+(ty==='textarea'?'<textarea data-k="'+k+'">'+def+'</textarea>':'<input type="text" data-k="'+k+'" value="'+String(def).replace(/"/g,'&quot;')+'">');}
 f.innerHTML=h;
 f.querySelectorAll('[data-k]').forEach(i=>i.oninput=()=>{S.data[i.dataset.k]=i.value;render();});
 document.getElementById('fx').oninput=e=>{S.fx=+e.target.value;render()};document.getElementById('fy').oninput=e=>{S.fy=+e.target.value;render()};
 document.getElementById('up').onchange=async e=>{const file=e.target.files[0];if(!file)return;const url=URL.createObjectURL(file);S.photo=await loadImg(url);document.querySelectorAll('#photos img').forEach(x=>x.classList.remove('on'));render();};
 if(t.mls){const go=async()=>{const q=document.getElementById('mlsq').value.trim();const msg=document.getElementById('mmsg');if(!q)return;msg.textContent='Buscando…';
   try{const r=await fetch('/api/listing?q='+encodeURIComponent(q));const j=await r.json();if(!j.ok||!j.listing){msg.textContent='Não encontrado no feed do MLS.';return;}
    S.listing=j.listing;applyListing();msg.textContent=j.listing.listing_id+' · '+(j.listing.standard_status||'')+' · '+(j.listing.list_office_name||'');}catch(err){msg.textContent='Erro: '+err.message;}};
  document.getElementById('mlsgo').onclick=go;document.getElementById('mlsq').onkeydown=e=>{if(e.key==='Enter')go();};
  document.getElementById('f_hide').onchange=()=>{if(S.listing)applyListing();};}
 render();}
async function applyListing(){const t=TEMPLATES[S.tpl],l=S.listing;const d=t.fromListing(l);Object.assign(S.data,d);
 document.querySelectorAll('#form [data-k]').forEach(i=>{if(d[i.dataset.k]!=null)i.value=d[i.dataset.k];});
 const ph=document.getElementById('photos');ph.innerHTML='';(l.photos||[]).slice(0,16).forEach((u,i)=>{const im=document.createElement('img');im.src=prox(u);im.crossOrigin='anonymous';if(i===0)im.classList.add('on');im.onclick=async()=>{ph.querySelectorAll('img').forEach(x=>x.classList.remove('on'));im.classList.add('on');S.photo=await loadImg(prox(u));render();};ph.appendChild(im);});
 if(l.photos&&l.photos[0]){S.photo=await loadImg(prox(l.photos[0]));}render();}
function paint(cv,fmt,theme){const W=1080,H=fmt==='story'?1920:1080;cv.width=W;cv.height=H;const ctx=cv.getContext('2d');TEMPLATES[S.tpl].draw(ctx,W,H,{theme,fx:S.fx,fy:S.fy},S.data,{...logos,photo:S.photo});}
function render(){if(!S.tpl)return;paint(document.getElementById('cv'),S.fmt,S.theme);}
function seg(id,key){document.querySelectorAll('#'+id+' button').forEach(b=>b.onclick=()=>{document.querySelectorAll('#'+id+' button').forEach(x=>x.classList.remove('on'));b.classList.add('on');S[key]=b.dataset.v;render();});}
seg('fmt','fmt');seg('theme','theme');
function fname(fmt,theme){const base=(S.data.l1||S.data.n1||'MORE').toString().replace(/[^\\w]+/g,'-').replace(/^-|-$/g,'').slice(0,30);return 'MORE-'+S.tpl.toUpperCase()+'-'+base+'-'+fmt+'-'+theme+'.png';}
function save(cv,name){return new Promise(ok=>cv.toBlob(b=>{const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=name;a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);ok();},400);},'image/png'));}
document.getElementById('dl').onclick=async()=>{const m=document.getElementById('pmsg');try{await save(document.getElementById('cv'),fname(S.fmt,S.theme));m.textContent='';}catch(e){m.textContent='Não foi possível exportar: '+e.message;}};
document.getElementById('dlall').onclick=async()=>{const off=document.createElement('canvas');for(const f of ['feed','story'])for(const th of ['dark','light']){paint(off,f,th);await save(off,fname(f,th));}};
document.getElementById('back').onclick=e=>{e.preventDefault();location.hash='';document.getElementById('editor').classList.add('hidden');document.getElementById('gallery').classList.remove('hidden');};
boot();
</script></body></html>`;

module.exports = async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname;
  try {
    if (p === '/' || p === '/index.html') return html(res, PAGE);
    if (/^\/(logo-navy|logo-white)\.png$/.test(p) || /^\/fonts\/tg-(regular|bold)\.woff2$/.test(p)) {
      const f = path.join(__dirname, '..', p.slice(1));
      if (!fs.existsSync(f)) { res.statusCode = 404; return res.end(); }
      res.setHeader('Content-Type', p.endsWith('.png') ? 'image/png' : 'font/woff2'); res.setHeader('Cache-Control', 'public, max-age=604800'); return res.end(fs.readFileSync(f));
    }
    if (p === '/api/listing') {
      const l = await findListing(url.searchParams.get('q'));
      return json(res, 200, { ok: true, listing: l });
    }
    if (p === '/api/img') {
      const u = url.searchParams.get('u') || '';
      let h; try { h = new URL(u).hostname; } catch { return json(res, 400, { ok: false }); }
      if (!/\.cloudfront\.net$|\.supabase\.co$|(^|\.)moreinternationalrealty\.com$/.test(h)) return json(res, 403, { ok: false, error: 'host não permitido' });
      const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!r.ok) { res.statusCode = r.status; return res.end(); }
      res.setHeader('Content-Type', r.headers.get('content-type') || 'image/jpeg');
      res.setHeader('Access-Control-Allow-Origin', '*'); res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.end(Buffer.from(await r.arrayBuffer()));
    }
    res.statusCode = 404; res.setHeader('Content-Type', 'text/plain; charset=utf-8'); res.end('Not found');
  } catch (e) {
    json(res, 500, { ok: false, error: String(e.message || e) });
  }
};

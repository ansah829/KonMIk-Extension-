// ID: ext_komikdewasa_direct_reader
// NAME: Komik Dewasa Direct Reader (ID)
// TYPE: comic
// VERSION: 5.0.0
// COLOR: #1E73BE
// ICON: https://komikdewasa.mom/wp-content/uploads/2024/11/KOMIKDEWASA-1-1.png
// REFERER: https://komikdewasa.mom/

var BASE='https://komikdewasa.mom';
var H={'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36','Referer':BASE+'/','Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8','Accept-Language':'id-ID,id;q=0.9,en-US;q=0.8'};
var HJSON={'User-Agent':'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/124.0 Mobile Safari/537.36','Referer':BASE+'/','Accept':'application/json, text/plain, */*','Accept-Language':'id-ID,id;q=0.9,en-US;q=0.8'};
async function getText(u){var r=await fetch(u,{headers:H});if(!r.ok)throw new Error('HTTP '+r.status);return await r.text();}
async function getJsonText(u){var r=await fetch(u,{headers:HJSON});if(!r.ok)throw new Error('HTTP '+r.status);return await r.text();}
function txt(v){return String(v||'').replace(/<br\s*\/?\s*>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&amp;|&#038;/gi,'&').replace(/&nbsp;/gi,' ').replace(/\s+/g,' ').trim();}
function abs(v,b){if(!v)return '';v=String(v).replace(/&amp;/g,'&').replace(/^http:\/\//i,'https://');if(/^https?:\/\//i.test(v))return v;if(v.charAt(0)=='/')return BASE+v;return (b||BASE)+'/'+v;}
function all(re,s){var a=[],m;re.lastIndex=0;while((m=re.exec(s))!==null)a.push(m);return a;}
function cards(html){var out=[],seen=[];var re=/<a[^>]+href=["']([^"']*\/komik\/[^"']+)["'][\s\S]{0,2400}?<div[^>]+class=["'][^"']*tt[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi;all(re,html).forEach(function(m){var id=abs(m[1]);if(seen.indexOf(id)>=0)return;seen.push(id);out.push({id:id,title:txt(m[2]),cover_url:'',rating:'10.0',views:'-'});});return out;}
function imgs(html){var out=[],seen=[],re=/<img\b([^>]+)>/gi;all(re,html).forEach(function(m){var x=m[1].match(/(?:src|data-src|data-lazy-src)=["']([^"']+)["']/i);if(!x)return;var u=abs(x[1]).split('?')[0];if(!/\/(?:uploads\/manga-images|manga-images)\//i.test(u)||!/\.(jpg|jpeg|png|webp|avif|gif)$/i.test(u)||/logo|avatar|banner|promo|sponsor|favicon|Biolink|go\.linksaya|KOMIKDEWASA/i.test(u)||seen.indexOf(u)>=0)return;seen.push(u);out.push(u);});return out;}

var KonmikExtension={
 getList:async function(page,query,filters){var u=BASE+'/?orderby=date';if(query)u=BASE+'/?s='+encodeURIComponent(String(query));var h=await getText(u);return{manga_list:cards(h)};},
 getDetail:async function(id){var h=await getText(abs(id)),tm=h.match(/<h1[^>]+class=["'][^"']*entry-title[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i)||h.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)/i),dm=h.match(/<meta[^>]+(?:name|property)=["']og:description["'][^>]+content=["']([^"']+)/i),cm=h.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)/i),cs=[],seen=[];var re=/<a[^>]+href=["']([^"']*(?:chapter|ch)[^"']*)["'][^>]*>([\s\S]{0,700}?)<\/a>/gi;all(re,h).forEach(function(m){var x=abs(m[1]);if(seen.indexOf(x)>=0)return;seen.push(x);cs.push({id:x,title:txt(m[2])||'Chapter',date:'-'});});return{title:txt(tm?tm[1]:'Komik Dewasa'),cover_url:cm?abs(cm[1]):'',description:dm?txt(dm[1]):'Tidak ada deskripsi.',rating:'10.0',views:'-',genres:['Manga'],author:'Kreator',artist:'Kreator',chapters:cs};},
 getChapterImages:async function(id){var m=String(id||'').match(/\/([^/?#]+)\/?$/);if(!m)return [];var slug=m[1].toLowerCase();var x=slug.match(/^(.*?)-(chapter|chap|ch)[-_]?(\d[\d-]*)$/i);if(!x)return [];var series=x[1];var folder=x[2].toLowerCase()+'-'+x[3];var base='https://img6.linksaya.com/uploads/manga-images/'+series.charAt(0)+'/'+series+'/'+folder+'/';var out=[];for(var i=1;i<=30;i++)out.push(base+i+'.jpg');return out;}
};

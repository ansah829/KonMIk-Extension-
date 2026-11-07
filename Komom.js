// ID: ext_komikdewasa_api_compact
// NAME: Komik Dewasa API (ID)
// TYPE: comic
// VERSION: 3.0.0
// COLOR: #1E73BE
// ICON: https://komikdewasa.mom/wp-content/uploads/2024/11/KOMIKDEWASA-1-1.png
// REFERER: https://komikdewasa.mom/

var BASE = 'https://komikdewasa.mom';
var API = BASE + '/wp-json/wp/v2/posts';
var headers = {'User-Agent':'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/124.0 Mobile Safari/537.36','Referer':BASE+'/','Accept':'application/json, text/plain, */*'};

async function getJson(url) {
    var r = await fetch(url, {headers:headers});
    if (!r.ok) throw new Error('HTTP ' + r.status);
    var body = await r.text();
    return JSON.parse(body);
}
function text(v) { return String(v || '').replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&#038;/g,'&').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim(); }
function slugOf(p) { return String(p.slug || '').toLowerCase(); }
function series(s) { return s.replace(/-(?:chapter|chap|ch)[-_]?\d+(?:[-_].*)?$/i,''); }
function titleOf(p) { return text(p.title && p.title.rendered); }
function imageOf(html) { var m=String(html||'').match(/<img\b[^>]*(?:src|data-src)=["']([^"']+)["']/i); return m ? String(m[1]).replace(/^http:\/\//i,'https://') : ''; }
function imagesOf(html) {
    var out=[],seen=[],re=/<img\b([^>]+)>/gi,m,x,u;
    while ((m=re.exec(String(html||''))) !== null) {
        x=m[1].match(/(?:src|data-src|data-lazy-src)=["']([^"']+)["']/i); if(!x) continue;
        u=String(x[1]).replace(/^http:\/\//i,'https://').split('?')[0];
        if(!/\.(jpg|jpeg|png|webp|avif|gif)$/i.test(u)||/logo|avatar|banner|promo|sponsor|favicon/i.test(u)||seen.indexOf(u)>=0) continue;
        seen.push(u); out.push(u);
    }
    return out;
}
function item(s,p) {
    var t=titleOf(p).replace(/\s+(chapter|chap|ch)[^\d]*[\d.\-]+.*$/i,'').trim();
    return {id:BASE+'/komik/'+s+'/',title:t||titleOf(p),cover_url:imageOf(p.content&&p.content.rendered),rating:'10.0',views:'-'};
}

var KonmikExtension = {
    getList: async function(page,query,filters) {
        var u=API+'?per_page=100&orderby=date&order=desc';
        if(query) u+='&search='+encodeURIComponent(String(query));
        var ps=await getJson(u),out=[],seen=[];
        if(!Array.isArray(ps)) ps=[];
        (ps||[]).forEach(function(p){var s=series(slugOf(p));if(s&&seen.indexOf(s)<0){seen.push(s);out.push(item(s,p));}});
        return {manga_list:out};
    },
    getDetail: async function(id) {
        var m=String(id||'').match(/\/komik\/([^/?#]+)/i),s=m?m[1]:'';
        var word=series(s).replace(/-/g,' ').split(/\s+/)[0]||s;
        var ps=await getJson(API+'?per_page=100&search='+encodeURIComponent(word)+'&orderby=date&order=desc');
        if(!Array.isArray(ps)) ps=[];
        ps=ps.filter(function(p){return series(slugOf(p))===series(s);});
        if(!ps.length){var recent=await getJson(API+'?per_page=100&orderby=date&order=desc');if(!Array.isArray(recent))recent=[];ps=recent.filter(function(p){return series(slugOf(p))===series(s);});}
        var first=ps[0]||{},cs=ps.map(function(p){return{id:p.link||BASE+'/'+p.slug+'/',title:titleOf(p),date:p.date||'-',n:(titleOf(p)+' '+slugOf(p)).match(/(?:chapter|chap|ch)[^0-9]*([0-9]+)/i)};});
        cs.forEach(function(c){c.n=c.n?parseFloat(c.n[1]):0;}); cs.sort(function(a,b){return b.n-a.n;}); cs.forEach(function(c){delete c.n;});
        return {title:titleOf(first).replace(/\s+(chapter|chap|ch)[^\d]*[\d.\-]+.*$/i,'')||text(s.replace(/-/g,' ')),cover_url:imageOf(first.content&&first.content.rendered),description:'Komik Dewasa Bahasa Indonesia.',rating:'10.0',views:'-',genres:['Manga'],author:'Kreator',artist:'Kreator',chapters:cs};
    },
    getChapterImages: async function(id) {
        var m=String(id||'').match(/\/([^/?#]+)\/?$/); if(!m)return [];
        var ps=await getJson(API+'?slug='+encodeURIComponent(m[1]));
        return Array.isArray(ps)&&ps[0]&&ps[0].content?imagesOf(ps[0].content.rendered):[];
    }
};

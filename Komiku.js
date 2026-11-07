// ID: ext_komiku_reader_v106
// NAME: Komiku Reader Lite (ID)
// TYPE: comic
// VERSION: 1.0.6
// COLOR: #4164B3
// ICON: https://komiku.org/asset/img/ico.ico
// REFERER: https://komiku.org/

const BASE = 'https://komiku.org';
const API = 'https://api.komiku.org';
const headers = {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/124.0 Mobile Safari/537.36',
    'Referer': BASE + '/',
    'Accept-Language': 'id-ID,id;q=0.9,en;q=0.8'
};

function absoluteUrl(value, base) {
    if (!value) return '';
    var clean = String(value).replace(/&amp;/g, '&').replace(/&#038;/g, '&').replace(/\\\//g, '/');
    if (/^https?:\/\//i.test(clean)) return clean;
    if (/^\/\//.test(clean)) return 'https:' + clean;
    if (clean.charAt(0) === '/') return BASE + clean;
    return (base || BASE).replace(/\/$/, '') + '/' + clean.replace(/^\//, '');
}

async function fetchText(url) {
    var response = await fetch(url, { headers: headers });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    return await response.text();
}

function allMatches(regex, text) {
    var output = [];
    var match;
    regex.lastIndex = 0;
    while ((match = regex.exec(text)) !== null) output.push(match);
    return output;
}

function cleanText(value) {
    return String(value || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
}

function imageListFromHtml(html) {
    var images = [];
    var seen = [];
    var imageRegex = /<img\b([^>]+)>/gi;
    allMatches(imageRegex, html).forEach(function (match) {
        var urlMatch = match[1].match(/(?:src|data-src|data-lazy-src)=["'](https?:\/\/img\.komiku\.org\/[^"']+\.(?:jpg|jpeg|png|webp|avif|gif)(?:\?[^"']*)?)["']/i);
        if (!urlMatch) return;
        var url = urlMatch[1].split('?')[0];
        if (/promosi|promo|logo|avatar|google|favicon|banner|iklan/i.test(url)) return;
        if (seen.indexOf(url) >= 0) return;
        seen.push(url);
        images.push(url);
    });
    return images;
}

function parseList(html) {
    var list = [];
    var seen = [];
    var cardRegex = /<a\s+href=["']([^"']*\/manga\/[^"']+)["'][\s\S]{0,1800}?<h3[^>]*>([\s\S]*?)<\/h3>/gi;
    allMatches(cardRegex, html).forEach(function (match) {
        var id = absoluteUrl(match[1]);
        if (seen.indexOf(id) >= 0) return;
        seen.push(id);
        list.push({ id: id, title: cleanText(match[2]), cover_url: '', rating: '10.0', views: '-' });
    });
    return list;
}

var KonmikExtension = {
    async getList(page, query, filters) {
        var p = parseInt(page || 1, 10);
        if (!p || p < 1) p = 1;
        var url = API + '/manga/?' + (query ? 's=' + encodeURIComponent(query) : 'orderby=date');
        if (p > 1) url += '&paged=' + p;
        return { manga_list: parseList(await fetchText(url)) };
    },

    async getDetail(urlPath) {
        var html = await fetchText(absoluteUrl(urlPath));
        var titleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)/i) || html.match(/<h1[^>]*>([\s\S]{0,500}?)<\/h1>/i);
        var imageMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)/i);
        var descMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)/i);
        var chapters = [];
        var seen = [];
        var chapterRegex = /<a\s+href=["']([^"']*chapter[^"']+)["'][^>]*>([\s\S]{0,500}?)<\/a>/gi;
        allMatches(chapterRegex, html).forEach(function (match) {
            var id = absoluteUrl(match[1]);
            if (seen.indexOf(id) >= 0) return;
            seen.push(id);
            var text = cleanText(match[2]);
            var n = text.match(/(?:chapter|ch)\s*([\d.\-]+)/i) || match[1].match(/(?:chapter|ch)[^\d]*([\d.\-]+)/i);
            chapters.push({ id: id, title: text || 'Chapter', date: '-', _n: n ? parseFloat(n[1]) : 0 });
        });
        chapters.sort(function (a, b) { return b._n - a._n; });
        chapters.forEach(function (chapter) { delete chapter._n; });
        return {
            title: cleanText(titleMatch ? titleMatch[1] : 'Unknown Title').replace(/^Komik\s+/i, ''),
            cover_url: imageMatch ? absoluteUrl(imageMatch[1]) : '',
            description: descMatch ? cleanText(descMatch[1]) : 'Tidak ada deskripsi.',
            rating: '10.0',
            views: '-',
            genres: ['Comic'],
            author: 'Kreator',
            artist: 'Kreator',
            chapters: chapters
        };
    },

    async getChapterImages(chapterUrl) {
        // Hanya satu request HTML. Timeout mencegah layar loading tanpa akhir.
        var html = await Promise.race([
            fetchText(absoluteUrl(chapterUrl)),
            new Promise(function (_, reject) { setTimeout(function () { reject(new Error('Timeout membaca chapter')); }, 15000); })
        ]);
        return imageListFromHtml(html);
    }
};

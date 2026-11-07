// ID: ext_komikdewasa_mom_v2
// NAME: Komik Dewasa (ID)
// TYPE: comic
// VERSION: 2.0.0
// COLOR: #1E73BE
// ICON: https://komikdewasa.mom/wp-content/uploads/2024/11/KOMIKDEWASA-1-1.png
// REFERER: https://komikdewasa.mom/

const BASE = 'https://komikdewasa.mom';
const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36',
    'Referer': BASE + '/',
    'Accept-Language': 'id-ID,id;q=0.9,en;q=0.8'
};

async function fetchHtml(url) {
    const res = await fetch(url, { headers: headers });
    if (!res.ok) throw new Error('HTTP ' + res.status + ': ' + url);
    return await res.text();
}

function absoluteUrl(value, base) {
    if (!value) return '';
    var clean = value
        .replace(/&#038;/g, '&')
        .replace(/&amp;/g, '&')
        .replace(/\\\//g, '/')
        .trim();
    if (/^https?:\/\//i.test(clean)) return clean;
    if (/^\/\//.test(clean)) return 'https:' + clean;
    if (clean.charAt(0) === '/') return BASE + clean;
    return (base || BASE).replace(/\/$/, '') + '/' + clean.replace(/^\//, '');
}

function textOnly(value) {
    return (value || '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;|&apos;/gi, "'")
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&amp;/gi, '&')
        .replace(/\s+/g, ' ')
        .trim();
}

function extractMatch(regex, html, fallback) {
    var match = html.match(regex);
    return match ? textOnly(match[1]) : (fallback || '');
}

function extractAll(regex, html) {
    var result = [];
    var match;
    regex.lastIndex = 0;
    while ((match = regex.exec(html)) !== null) result.push(match);
    return result;
}

function metaContent(html, key) {
    var first = extractMatch(new RegExp('<meta[^>]+(?:property|name)=["\']' + key + '["\'][^>]+content=["\']([^"\']+)', 'i'), html, '');
    if (first) return first;
    return extractMatch(new RegExp('<meta[^>]+content=["\']([^"\']+)["\'][^>]+(?:property|name)=["\']' + key + '["\']', 'i'), html, '');
}

function stripImageQuery(url) {
    return absoluteUrl(url).replace(/[?&](?:resize|fit|quality|ssl)=[^&]+/gi, '').replace(/[?&]$/, '');
}

function parseCards(html) {
    var list = [];
    var seen = {};
    var cardRegex = /<div[^>]+class=["'][^"']*bsx[^"']*["'][^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi;

    extractAll(cardRegex, html).forEach(function (card) {
        var body = card[1];
        var link = extractMatch(/<a[^>]+href=["']([^"']*\/komik\/[^"']+)["']/i, body, '');
        if (!link) return;
        var id = absoluteUrl(link);
        if (seen[id]) return;
        var title = extractMatch(/<div[^>]+class=["'][^"']*tt[^"']*["'][^>]*>([\s\S]*?)<\/div>/i, body, '');
        var image = extractMatch(/<img[^>]+(?:src|data-src)=["']([^"']+)["']/i, body, '');
        var score = extractMatch(/<div[^>]+class=["'][^"']*numscore[^"']*["'][^>]*>([\s\S]*?)<\/div>/i, body, '');
        if (!title) title = extractMatch(/<a[^>]+title=["']([^"']+)["']/i, body, 'Unknown Title');
        seen[id] = true;
        list.push({
            id: id,
            title: title,
            cover_url: stripImageQuery(image),
            rating: score || '10.0',
            views: '-'
        });
    });

    // Fallback bila class kartu berubah: cari link komik, gambar, dan title terdekat.
    if (!list.length) {
        var fallbackRegex = /<a[^>]+href=["']([^"']*\/komik\/[^"']+)["'][\s\S]{0,2500}?<img[^>]+(?:src|data-src)=["']([^"']+)["'][\s\S]{0,1800}?<div[^>]+class=["'][^"']*tt[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi;
        extractAll(fallbackRegex, html).forEach(function (m) {
            var id = absoluteUrl(m[1]);
            if (seen[id]) return;
            seen[id] = true;
            list.push({ id: id, title: textOnly(m[3]), cover_url: stripImageQuery(m[2]), rating: '10.0', views: '-' });
        });
    }
    return list;
}

var KonmikDewasaExtension = {
    async getList(page, query, filters) {
        var currentPage = Math.max(1, parseInt(page || 1, 10));
        var queryParts = [];
        if (query) queryParts.push('s=' + encodeURIComponent(query));
        if (currentPage > 1) queryParts.push('paged=' + encodeURIComponent(String(currentPage)));
        var url = BASE + '/?' + (queryParts.length ? queryParts.join('&') : 'orderby=date');
        var html = await fetchHtml(url);
        return { manga_list: parseCards(html) };
    },

    async getDetail(urlPath) {
        var detailUrl = absoluteUrl(urlPath);
        var html = await fetchHtml(detailUrl);
        var title = extractMatch(/<h1[^>]+class=["'][^"']*entry-title[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i, html, '') || metaContent(html, 'og:title').replace(/\s*-\s*komik Dewasa$/i, '');
        var description = extractMatch(/<div[^>]+class=["'][^"']*entry-content-single[^"']*["'][^>]*>([\s\S]*?)<\/div>/i, html, '') || metaContent(html, 'og:description') || 'Tidak ada deskripsi.';
        var cover = stripImageQuery(metaContent(html, 'og:image') || extractMatch(/<img[^>]+itemprop=["']image["'][^>]+src=["']([^"']+)["']/i, html, ''));
        var author = extractMatch(/<tr[^>]*>\s*<td>\s*Author\s*<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i, html, '') || extractMatch(/itemprop=["']name["'][^>]*>([^<]+)</i, html, 'Kreator');
        var genres = [];
        extractAll(/<div[^>]+class=["'][^"']*seriestugenre[^"']*["'][^>]*>([\s\S]*?)<\/div>/i, html).forEach(function (m) {
            extractAll(/<a[^>]*>([^<]+)<\/a>/gi, m[1]).forEach(function (g) { genres.push(textOnly(g[1])); });
        });
        if (!genres.length) genres.push('Manga');

        var chapters = [];
        // Parser dibatasi per tautan supaya HTML besar tidak memicu penggunaan memori berlebihan.
        var chapterLinkRegex = /<a\b[^>]*href=["']([^"']*(?:chapter|ch)[^"']*)["'][^>]*>([\s\S]{0,900}?)<\/a>/gi;
        extractAll(chapterLinkRegex, html).forEach(function (m) {
            var id = absoluteUrl(m[1]);
            var body = textOnly(m[2]);
            var numberMatch = body.match(/(?:chapter|ch)\s*([\d.\-]+)/i) || m[1].match(/(?:chapter|ch)[^\d]*([\d.\-]+)/i);
            var duplicate = chapters.some(function (c) { return c.id === id; });
            if (!duplicate) chapters.push({ id: id, title: body || (numberMatch ? 'Chapter ' + numberMatch[1] : 'Chapter'), date: '-', number: numberMatch ? parseFloat(numberMatch[1]) : 0 });
        });
        chapters.sort(function (a, b) { return b.number - a.number; });
        chapters.forEach(function (c) { delete c.number; });

        return {
            title: title || 'Unknown Title',
            cover_url: cover,
            description: description,
            rating: '10.0',
            views: '-',
            genres: genres,
            author: author || 'Kreator',
            artist: author || 'Kreator',
            chapters: chapters
        };
    },

    async getChapterImages(chapterUrl) {
        var html = await fetchHtml(absoluteUrl(chapterUrl));
        var images = [];
        var seen = {};
        var imageRegex = /<img\b([^>]+)>/gi;
        extractAll(imageRegex, html).forEach(function (m) {
            var attrs = m[1];
            var image = extractMatch(/(?:data-src|data-lazy-src|src)=["']([^"']+)["']/i, attrs, '');
            var url = absoluteUrl(image, chapterUrl);
            if (!url || seen[url]) return;
            if (/KOMIKDEWASA|Biolink|sponsor|btn_close|histats|avatar|logo/i.test(url)) return;
            if (!/chapter[-_\/]|manga-images|uploads/i.test(url)) return;
            seen[url] = true;
            images.push(url);
        });
        return images;
    }
};

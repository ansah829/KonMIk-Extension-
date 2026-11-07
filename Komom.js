// ID: ext_komikdewasa_wpapi_lite
// NAME: Komik Dewasa API Lite (ID)
// TYPE: comic
// VERSION: 2.0.0
// COLOR: #1E73BE
// ICON: https://komikdewasa.mom/wp-content/uploads/2024/11/KOMIKDEWASA-1-1.png
// REFERER: https://komikdewasa.mom/

const BASE = 'https://komikdewasa.mom';
const API = BASE + '/wp-json/wp/v2';
const headers = {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/124.0 Mobile Safari/537.36',
    'Referer': BASE + '/',
    'Accept': 'application/json, text/plain, */*'
};

async function fetchJson(url) {
    var response = await fetch(url, { headers: headers });
    if (!response.ok) throw new Error('HTTP ' + response.status + ': ' + url);
    return await response.json();
}

function htmlText(value) {
    return String(value || '')
        .replace(/<br\s*\/?\s*>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&#038;|&amp;/gi, '&')
        .replace(/&#039;|&#39;|&apos;/gi, "'")
        .replace(/&quot;/gi, '"')
        .replace(/&nbsp;/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function abs(value) {
    if (!value) return '';
    var url = String(value).replace(/&amp;/g, '&').replace(/^http:\/\//i, 'https://');
    if (/^https?:\/\//i.test(url)) return url;
    return BASE + '/' + url.replace(/^\/+/, '');
}

function postTitle(post) {
    return htmlText(post && post.title ? post.title.rendered : 'Unknown Title');
}

function postSlug(post) {
    return String(post && post.slug ? post.slug : '').toLowerCase();
}

function seriesSlug(slug) {
    return slug
        .replace(/-(?:chapter|chap|ch)[-_]?\d+(?:[-_].*)?$/i, '')
        .replace(/-(?:chapter|chap|ch)[-_]?\d+$/i, '');
}

function chapterNumber(title, slug) {
    var match = String(title + ' ' + slug).match(/(?:chapter|chap|ch)[^0-9]*([0-9]+)/i);
    return match ? parseFloat(match[1]) : 0;
}

function firstImage(html) {
    var match = String(html || '').match(/<img\b[^>]*(?:src|data-src)=["']([^"']+)["'][^>]*>/i);
    return match ? abs(match[1]) : '';
}

function allImages(html) {
    var result = [];
    var seen = [];
    var regex = /<img\b([^>]+)>/gi;
    var match;
    while ((match = regex.exec(String(html || ''))) !== null) {
        var src = match[1].match(/(?:src|data-src|data-lazy-src)=["']([^"']+)["']/i);
        if (!src) continue;
        var url = abs(src[1]).split('?')[0];
        if (!/\.(?:jpg|jpeg|png|webp|avif|gif)$/i.test(url)) continue;
        if (/logo|avatar|banner|sponsor|promosi|favicon/i.test(url)) continue;
        if (seen.indexOf(url) >= 0) continue;
        seen.push(url);
        result.push(url);
    }
    return result;
}

function makeItem(slug, post) {
    var title = postTitle(post).replace(/\s+(?:chapter|chap|ch)[^\d]*[\d.\-]+.*$/i, '').trim();
    return {
        id: BASE + '/komik/' + slug + '/',
        title: title || postTitle(post),
        cover_url: firstImage(post && post.content ? post.content.rendered : ''),
        rating: '10.0',
        views: '-'
    };
}

var KonmikExtension = {
    async getList(page, query, filters) {
        var currentPage = parseInt(page || 1, 10);
        if (!currentPage || currentPage < 1) currentPage = 1;
        var url = API + '/posts?per_page=100&page=' + currentPage + '&orderby=date&order=desc';
        if (query) url += '&search=' + encodeURIComponent(String(query));
        var posts = await fetchJson(url);
        var result = [];
        var seen = [];
        (Array.isArray(posts) ? posts : []).forEach(function (post) {
            var slug = seriesSlug(postSlug(post));
            if (!slug || seen.indexOf(slug) >= 0) return;
            seen.push(slug);
            result.push(makeItem(slug, post));
        });
        return { manga_list: result };
    },

    async getDetail(urlPath) {
        var raw = String(urlPath || '');
        var match = raw.match(/\/komik\/([^/?#]+)/i);
        var slug = match ? match[1] : raw.replace(/^https?:\/\/[^/]+\//, '').replace(/\/$/, '');
        var searchWords = seriesSlug(slug).replace(/-/g, ' ').trim().split(/\s+/);
        var search = searchWords[0] || seriesSlug(slug).replace(/-/g, ' ');
        var posts = await fetchJson(API + '/posts?per_page=100&search=' + encodeURIComponent(search) + '&orderby=date&order=desc');
        var filtered = (Array.isArray(posts) ? posts : []).filter(function (post) {
            return seriesSlug(postSlug(post)) === seriesSlug(slug);
        });
        if (!filtered.length) {
            var recent = await fetchJson(API + '/posts?per_page=100&orderby=date&order=desc');
            filtered = (Array.isArray(recent) ? recent : []).filter(function (post) {
                return seriesSlug(postSlug(post)) === seriesSlug(slug);
            });
        }
        var first = filtered[0] || {};
        var title = postTitle(first).replace(/\s+(?:chapter|chap|ch)[^\d]*[\d.\-]+.*$/i, '').trim() || htmlText(slug.replace(/-/g, ' '));
        var chapters = filtered.map(function (post) {
            return {
                id: post.link || (BASE + '/' + post.slug + '/'),
                title: postTitle(post),
                date: post.date || '-',
                _number: chapterNumber(postTitle(post), postSlug(post))
            };
        });
        chapters.sort(function (a, b) { return b._number - a._number; });
        chapters.forEach(function (chapter) { delete chapter._number; });
        return {
            title: title,
            cover_url: firstImage(first.content ? first.content.rendered : ''),
            description: 'Komik Dewasa Bahasa Indonesia.',
            rating: '10.0',
            views: '-',
            genres: ['Manga'],
            author: 'Kreator',
            artist: 'Kreator',
            chapters: chapters
        };
    },

    async getChapterImages(chapterUrl) {
        var slugMatch = String(chapterUrl || '').match(/\/([^/?#]+)\/?(?:[?#].*)?$/);
        var slug = slugMatch ? slugMatch[1] : '';
        if (!slug) return [];
        var posts = await fetchJson(API + '/posts?slug=' + encodeURIComponent(slug));
        var post = Array.isArray(posts) ? posts[0] : null;
        return post && post.content ? allImages(post.content.rendered) : [];
    }
};

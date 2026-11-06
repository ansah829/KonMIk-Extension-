// ID: ext_komiku_id
// NAME: Komiku (ID)
// TYPE: comic
// VERSION: 1.0.0
// COLOR: #4164B3
// ICON: https://komiku.org/asset/img/ico.ico
// REFERER: https://komiku.org/

const BASE = 'https://komiku.org';
const API = 'https://api.komiku.org';

const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
    'Referer': `${BASE}/`,
    'Accept-Language': 'id-ID,id;q=0.9,en;q=0.8'
};

async function fetchHtml(url) {
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
    return await res.text();
}

function absoluteUrl(value, base = BASE) {
    if (!value) return '';
    const clean = value
        .replace(/&#038;/g, '&')
        .replace(/&amp;/g, '&')
        .replace(/\\\//g, '/');
    try {
        return new URL(clean, base).href;
    } catch (_) {
        return clean;
    }
}

function decodeHtml(value = '') {
    return value
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;|&apos;/gi, "'")
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&amp;/gi, '&')
        .replace(/\s+/g, ' ')
        .trim();
}

function extractMatch(regex, str, defaultVal = '') {
    const m = str.match(regex);
    return m ? decodeHtml(m[1]) : defaultVal;
}

function extractAll(regex, str) {
    const matches = [];
    let m;
    regex.lastIndex = 0;
    while ((m = regex.exec(str)) !== null) matches.push(m);
    return matches;
}

function firstMeta(html, property) {
    const re = new RegExp(`<meta[^>]+(?:itemprop|property)=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i');
    const reverse = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:itemprop|property)=["']${property}["']`, 'i');
    return extractMatch(re, html) || extractMatch(reverse, html);
}

function allMeta(html, property) {
    const values = [];
    const re = new RegExp(`<meta[^>]+itemprop=["']${property}["'][^>]+content=["']([^"']+)["']`, 'gi');
    for (const m of extractAll(re, html)) values.push(decodeHtml(m[1]));
    return [...new Set(values)];
}

function cleanCover(url) {
    return absoluteUrl(url).replace(/[?&](?:resize|quality|w|h)=[^&]+/gi, '').replace(/[?&]$/, '');
}

function parseComicCards(html) {
    const mangaList = [];
    const seen = new Set();
    const cardRegex = /<div\s+class=["']bge["'][\s\S]*?<a\s+href=["']([^"']*\/manga\/[^"']+)["'][^>]*>[\s\S]*?<img\s+([^>]*?)(?:src|data-src)=["']([^"']+)["'][^>]*>[\s\S]*?<h3[^>]*>([\s\S]*?)<\/h3>[\s\S]*?<\/div>\s*<\/div>/gi;

    for (const m of extractAll(cardRegex, html)) {
        const id = absoluteUrl(m[1]);
        if (seen.has(id)) continue;
        seen.add(id);

        const imageAttrs = m[2] || '';
        const lazyImage = extractMatch(/data-src=["']([^"']+)["']/i, imageAttrs) || m[3];
        const title = decodeHtml(m[4]);

        if (!title || !id) continue;
        mangaList.push({
            id,
            title,
            cover_url: cleanCover(lazyImage),
            rating: '10.0',
            views: '-'
        });
    }

    // Fallback untuk markup yang berubah: pasangkan link manga dengan h3 terdekat.
    if (!mangaList.length) {
        const fallback = /<a\s+href=["']([^"']*\/manga\/[^"']+)["'][^>]*>[\s\S]{0,2500}?<h3[^>]*>([\s\S]*?)<\/h3>/gi;
        for (const m of extractAll(fallback, html)) {
            const id = absoluteUrl(m[1]);
            if (seen.has(id)) continue;
            seen.add(id);
            mangaList.push({ id, title: decodeHtml(m[2]), cover_url: '', rating: '10.0', views: '-' });
        }
    }

    return mangaList;
}

var KonmikExtension = {
    async getList(page, query, filters) {
        const currentPage = Math.max(1, parseInt(page || 1, 10));
        const params = [];
        if (query) params.push('s=' + encodeURIComponent(query));
        if (currentPage > 1) params.push('paged=' + encodeURIComponent(String(currentPage)));
        if (filters && filters.type) params.push('tipe=' + encodeURIComponent(filters.type));
        if (filters && filters.orderby) params.push('orderby=' + encodeURIComponent(filters.orderby));

        const queryString = params.length ? '?' + params.join('&') : '?orderby=date';
        const url = `${API}/manga/${queryString}`;
        const html = await fetchHtml(url);
        return { manga_list: parseComicCards(html) };
    },

    async getDetail(urlPath) {
        const detailUrl = absoluteUrl(urlPath);
        const html = await fetchHtml(detailUrl);

        const title = firstMeta(html, 'og:title')
            || extractMatch(/<h1[^>]*>[\s\S]*?<span[^>]*itemprop=["']name["'][^>]*>([\s\S]*?)<\/span>/i, html)
            || extractMatch(/<h1[^>]*>([\s\S]*?)<\/h1>/i, html, 'Unknown Title')
                .replace(/^Komik\s*/i, '').trim();
        const normalizedTitle = title.replace(/^Komik\s+/i, '').trim();

        const description = firstMeta(html, 'description')
            || extractMatch(/<p[^>]*class=["'][^"']*desc[^"']*["'][^>]*>([\s\S]*?)<\/p>/i, html, 'Tidak ada deskripsi.');

        const cover = cleanCover(firstMeta(html, 'og:image')
            || extractMatch(/<img[^>]+itemprop=["']image["'][^>]+src=["']([^"']+)["']/i, html));

        const author = extractMatch(/<span[^>]*itemprop=["']author["'][\s\S]*?<meta[^>]*itemprop=["']name["'][^>]*content=["']([^"']+)["']/i, html, 'Kreator');
        const genres = allMeta(html, 'genre');
        const type = extractMatch(/<td[^>]*>\s*Tipe:\s*<\/td>\s*<td[^>]*>(?:<strong>)?([^<]+)/i, html, 'Comic');

        const chapters = [];
        const chapterRegex = /<tr[^>]*itemprop=["']itemListElement["'][\s\S]*?<a\s+href=["']([^"']+)["'][^>]*>[\s\S]*?<span[^>]*itemprop=["']name["'][^>]*>[\s\S]*?<b>([^<]+)<\/b>[\s\S]*?<\/a>[\s\S]*?<td[^>]*class=["']tanggalseries["'][^>]*>([^<]*)<\/td>[\s\S]*?<\/tr>/gi;

        for (const m of extractAll(chapterRegex, html)) {
            const chapterTitle = decodeHtml(m[2]);
            const numberMatch = chapterTitle.match(/(?:chapter|ch)\s*([\d.\-]+)/i);
            chapters.push({
                id: absoluteUrl(m[1]),
                title: chapterTitle || 'Chapter',
                date: decodeHtml(m[3]) || '-',
                number: numberMatch ? parseFloat(numberMatch[1]) : 0
            });
        }

        // Fallback untuk halaman lama yang tidak memakai itemprop.
        if (!chapters.length) {
            const fallbackRegex = /<a\s+href=["']([^"']*chapter[^"']+)["'][^>]*[^>]*>\s*(?:<span[^>]*>[^<]*<\/span>)?\s*(?:<span[^>]*>)?([^<]+)(?:<\/span>)?\s*<\/a>/gi;
            const seen = new Set();
            for (const m of extractAll(fallbackRegex, html)) {
                const id = absoluteUrl(m[1]);
                if (seen.has(id)) continue;
                seen.add(id);
                const chapterTitle = decodeHtml(m[2]);
                const numberMatch = chapterTitle.match(/(?:chapter|ch)\s*([\d.\-]+)/i);
                chapters.push({ id, title: chapterTitle, date: '-', number: numberMatch ? parseFloat(numberMatch[1]) : 0 });
            }
        }

        chapters.sort((a, b) => b.number - a.number);
        chapters.forEach(chapter => delete chapter.number);

        return {
            title: normalizedTitle || title,
            cover_url: cover,
            description,
            rating: '10.0',
            views: '-',
            genres: genres.length ? genres : [type],
            author,
            artist: author,
            chapters
        };
    },

    async getChapterImages(chapterUrl) {
        const html = await fetchHtml(absoluteUrl(chapterUrl));
        const images = [];
        const seen = new Set();

        const imageRegex = /<img\b([^>]*?(?:class=["'][^"']*(?:klazy|ww)[^"']*|alt=["'][^"']*(?:gambar|image)[^"']*)[^>]*)>/gi;
        for (const m of extractAll(imageRegex, html)) {
            const attrs = m[1];
            const image = extractMatch(/(?:data-src|data-lazy-src|src)=["']([^"']+)["']/i, attrs);
            const url = absoluteUrl(image, chapterUrl);
            if (!url || /lazy\.jpg|promosi|avatar|google\.svg/i.test(url) || seen.has(url)) continue;
            seen.add(url);
            images.push(url);
        }

        // Fallback: chapterData menyediakan jumlah gambar, sedangkan URL gambar
        // tetap ditemukan dari markup img pada halaman pembaca.
        if (!images.length) {
            const genericImageRegex = /<img\b([^>]+)>/gi;
            for (const m of extractAll(genericImageRegex, html)) {
                const image = extractMatch(/(?:data-src|src)=["']([^"']+)["']/i, m[1]);
                const url = absoluteUrl(image, chapterUrl);
                if (url && /img\.komiku\./i.test(url) && !seen.has(url)) {
                    seen.add(url);
                    images.push(url);
                }
            }
        }

        return images;
    }
};

// ID: ext_24comic_id
// NAME: 24Comic (ID)
// TYPE: comic
// VERSION: 1.0.0
// COLOR: #2563EB
// ICON: https://www.24comic.com/logo.png
// REFERER: https://www.24comic.com/

const API = 'https://api.24comic.com';
const IMAGE_API = API + '/public/images/';
const headers = {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/124.0 Mobile Safari/537.36',
    'Referer': 'https://www.24comic.com/',
    'Accept': 'application/json'
};

async function fetchJson(url) {
    const res = await fetch(url, { headers: headers });
    if (!res.ok) throw new Error('HTTP ' + res.status + ': ' + url);
    return await res.json();
}

function imageUrl(value) {
    if (!value) return '';
    if (/^https?:\/\//i.test(String(value))) return String(value);
    return IMAGE_API + encodeURIComponent(String(value)).replace(/%2F/gi, '/');
}

function safeNumber(value, fallback) {
    var n = Number(value);
    return isNaN(n) ? (fallback || 0) : n;
}

function parseId(value) {
    if (value === null || value === undefined) return '';
    var raw = String(value);
    var match = raw.match(/(?:comic|chapter)[^0-9]*([0-9]+)/i);
    return match ? match[1] : raw.replace(/[^0-9]/g, '') || raw;
}

function asArray(value) {
    return Array.isArray(value) ? value : [];
}

function comicToItem(comic) {
    return {
        id: String(comic.comic_id),
        title: comic.title || 'Untitled',
        cover_url: imageUrl(comic.cover || comic.image),
        rating: comic.likes ? String(comic.likes) : '0',
        views: comic.views !== undefined ? String(comic.views) : '-'
    };
}

var KonmikExtension = {
    async getList(page, query, filters) {
        var currentPage = Math.max(1, parseInt(page || 1, 10));
        var skip = (currentPage - 1) * 50;
        var url = API + '/r/comics?skip=' + skip + '&limit=50&order_by=created_at::desc';
        var response = await fetchJson(url);
        var comics = asArray(response.data);
        var search = query ? String(query).toLowerCase().trim() : '';

        if (search) {
            comics = comics.filter(function (comic) {
                var haystack = [comic.title, comic.description, comic.genre, comic.subgenres].join(' ').toLowerCase();
                return haystack.indexOf(search) !== -1;
            });
        }

        if (filters && filters.genre) {
            var genre = String(filters.genre).toLowerCase();
            comics = comics.filter(function (comic) {
                return String(comic.genre || '').toLowerCase() === genre || String(comic.subgenres || '').toLowerCase().indexOf(genre) !== -1;
            });
        }

        return { manga_list: comics.map(comicToItem) };
    },

    async getDetail(comicId) {
        var id = parseId(comicId);
        if (!id) throw new Error('ID komik tidak ditemukan');

        var comicResponse = await fetchJson(API + '/r/comics/' + encodeURIComponent(id));
        var comic = comicResponse.data || {};
        var chapterResponse = await fetchJson(API + '/r/comics/' + encodeURIComponent(id) + '/chapters?skip=0&limit=100&order_by=created_at::desc');
        var chapterData = chapterResponse.data || {};
        var rawChapters = asArray(chapterData.results || chapterData);

        var chapters = rawChapters.map(function (chapter) {
            var chapterNo = chapter.chapter_no;
            var chapterTitle = chapter.title || (chapterNo !== null && chapterNo !== undefined ? 'Chapter ' + chapterNo : 'Chapter');
            return {
                id: String(chapter.chapter_id),
                title: chapterTitle,
                date: chapter.published_at || chapter.created_at || '-',
                number: chapterNo === null || chapterNo === undefined ? 0 : safeNumber(chapterNo, 0)
            };
        });

        chapters.sort(function (a, b) {
            if (a.number !== b.number) return b.number - a.number;
            return String(b.date).localeCompare(String(a.date));
        });
        chapters.forEach(function (chapter) { delete chapter.number; });

        var genres = [];
        if (comic.genre) genres.push(String(comic.genre));
        String(comic.subgenres || '').split(',').forEach(function (genre) {
            var value = genre.trim();
            if (value && genres.indexOf(value) === -1) genres.push(value);
        });
        if (!genres.length) genres.push('Comic');

        var author = comic.author && comic.author.fullname ? comic.author.fullname : 'Kreator';
        return {
            title: comic.title || 'Unknown Title',
            cover_url: imageUrl(comic.cover || comic.image),
            description: comic.description || 'Tidak ada deskripsi.',
            rating: comic.likes !== undefined ? String(comic.likes) : '0',
            views: comic.views !== undefined ? String(comic.views) : '-',
            genres: genres,
            author: author,
            artist: author,
            chapters: chapters
        };
    },

    async getChapterImages(chapterId) {
        var id = parseId(chapterId);
        if (!id) return [];
        var response = await fetchJson(API + '/r/chapters/' + encodeURIComponent(id));
        var chapter = response.data || {};
        var images = [];

        if (Array.isArray(chapter.images)) {
            images = chapter.images;
        } else if (Array.isArray(chapter.pages)) {
            images = chapter.pages;
        } else if (chapter.image) {
            images = [chapter.image];
        }

        return images.map(imageUrl).filter(function (url, index, array) {
            return url && array.indexOf(url) === index;
        });
    }
};

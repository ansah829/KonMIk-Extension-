// ID: ext_24comic_id_v2
// NAME: 24Comic (ID)
// TYPE: comic
// VERSION: 2.0.0
// COLOR: #2563EB
// ICON: https://www.24comic.com/logo.png
// REFERER: https://www.24comic.com/

const API = 'https://api.24comic.com';
const IMAGE_API = API + '/public/images/';
const headers = {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/124.0 Mobile Safari/537.36',
    'Referer': 'https://www.24comic.com/',
    'Accept': 'application/json, text/plain, */*'
};

async function fetchJson(url) {
    const response = await fetch(url, { headers: headers });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    return await response.json();
}

function imageUrl(value) {
    if (!value) return '';
    var valueText = String(value);
    if (/^https?:\/\//i.test(valueText)) return valueText;
    return IMAGE_API + encodeURIComponent(valueText).replace(/%2F/gi, '/');
}

function toArray(value) {
    if (Array.isArray(value)) return value;
    if (value && Array.isArray(value.results)) return value.results;
    if (value && Array.isArray(value.items)) return value.items;
    if (value && Array.isArray(value.comics)) return value.comics;
    return [];
}

function getComicId(value) {
    if (value === null || value === undefined) return '';
    var text = String(value);
    var match = text.match(/(?:comic|manga)[^0-9]*([0-9]+)/i);
    if (match) return match[1];
    return text.replace(/[^0-9]/g, '') || text;
}

function comicItem(comic) {
    var comicId = String(comic.comic_id || comic.id || comic._id || '');
    return {
        id: 'https://www.24comic.com/comics/' + comicId,
        title: String(comic.title || comic.name || 'Untitled'),
        cover_url: imageUrl(comic.cover || comic.image || comic.thumbnail),
        rating: String(comic.likes !== undefined ? comic.likes : (comic.rating || '0')),
        views: String(comic.views !== undefined ? comic.views : '-')
    };
}

function matchesSearch(comic, query) {
    if (!query) return true;
    var text = [comic.title, comic.name, comic.description, comic.genre, comic.subgenres].join(' ').toLowerCase();
    return text.indexOf(query) !== -1;
}

var KonmikExtension = {
    async getList(page, query, filters) {
        var pageNumber = parseInt(page, 10);
        if (!pageNumber || pageNumber < 1) pageNumber = 1;

        var searchText = typeof query === 'string' ? query.trim().toLowerCase() : '';
        var comics = [];

        // API 24Comic belum memiliki parameter search. Untuk pencarian, ambil beberapa
        // halaman katalog agar judul lama tetap bisa ditemukan.
        if (searchText) {
            var requests = [];
            for (var searchPage = 0; searchPage < 10; searchPage++) {
                requests.push(fetchJson(API + '/r/comics?skip=' + (searchPage * 100) + '&limit=100&order_by=created_at::desc'));
            }
            var responses = await Promise.all(requests);
            responses.forEach(function (payload) {
                comics = comics.concat(toArray(payload && payload.data));
            });
            comics = comics.filter(function (comic) { return matchesSearch(comic, searchText); });
        } else {
            var skip = (pageNumber - 1) * 100;
            var url = API + '/r/comics?skip=' + skip + '&limit=100&order_by=created_at::desc';
            var payload = await fetchJson(url);
            comics = toArray(payload && payload.data);
        }

        var genre = filters && typeof filters.genre === 'string' ? filters.genre.trim().toLowerCase() : '';
        if (genre) {
            comics = comics.filter(function (comic) {
                var genres = [comic.genre, comic.subgenres].join(',').toLowerCase();
                return genres.indexOf(genre) !== -1;
            });
        }

        var seen = {};
        var result = [];
        comics.forEach(function (comic) {
            var item = comicItem(comic);
            if (!item.id || seen[item.id]) return;
            seen[item.id] = true;
            result.push(item);
        });
        return { manga_list: result };
    },

    async getDetail(comicId) {
        var id = getComicId(comicId);
        if (!id) throw new Error('ID komik tidak ditemukan');

        var comicPayload = await fetchJson(API + '/r/comics/' + encodeURIComponent(id));
        var comic = comicPayload && comicPayload.data ? comicPayload.data : {};
        var chapterPayload = await fetchJson(API + '/r/comics/' + encodeURIComponent(id) + '/chapters?skip=0&limit=100&order_by=created_at::desc');
        var chapterList = toArray(chapterPayload && chapterPayload.data);

        var chapters = chapterList.map(function (chapter) {
            var chapterId = String(chapter.chapter_id || chapter.id || '');
            return {
                id: 'https://www.24comic.com/chapters/' + chapterId,
                title: String(chapter.title || chapter.subtitle || 'Chapter'),
                date: String(chapter.published_at || chapter.created_at || '-'),
                _number: chapter.chapter_no === null || chapter.chapter_no === undefined ? -1 : Number(chapter.chapter_no)
            };
        }).filter(function (chapter) { return chapter.id && chapter.id !== 'undefined'; });

        chapters.sort(function (a, b) {
            if (a._number !== b._number) return b._number - a._number;
            return b.date.localeCompare(a.date);
        });
        chapters.forEach(function (chapter) { delete chapter._number; });

        var genres = [];
        [comic.genre, comic.subgenres].forEach(function (value) {
            String(value || '').split(',').forEach(function (genre) {
                genre = genre.trim();
                if (genre && genres.indexOf(genre) < 0) genres.push(genre);
            });
        });
        if (!genres.length) genres.push('Comic');

        var author = comic.author && comic.author.fullname ? comic.author.fullname : 'Kreator';
        return {
            title: String(comic.title || 'Unknown Title'),
            cover_url: imageUrl(comic.cover || comic.image),
            description: String(comic.description || 'Tidak ada deskripsi.'),
            rating: String(comic.likes !== undefined ? comic.likes : '0'),
            views: String(comic.views !== undefined ? comic.views : '-'),
            genres: genres,
            author: author,
            artist: author,
            chapters: chapters
        };
    },

    async getChapterImages(chapterId) {
        var id = getComicId(chapterId);
        if (!id) return [];
        var payload = await fetchJson(API + '/r/chapters/' + encodeURIComponent(id));
        var chapter = payload && payload.data ? payload.data : {};
        var pages = Array.isArray(chapter.images) ? chapter.images : (Array.isArray(chapter.pages) ? chapter.pages : []);
        if (!pages.length && chapter.image) pages = [chapter.image];
        var seen = {};
        return pages.map(imageUrl).filter(function (url) {
            if (!url || seen[url]) return false;
            seen[url] = true;
            return true;
        });
    }
};

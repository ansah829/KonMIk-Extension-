// ID: ext_komiku_id
// NAME: komiku
// TYPE: comic
// VERSION: 1.0.0
// COLOR: #00D564
// ICON: icon.png
// REFERER: https://komiku.org/id/

const KomikuExtension = {
  name: "Komiku",
  baseUrl: "https://komiku.org",

  async getList(page = 1) {
    const url = `${this.baseUrl}/page/${page}/`;
    const response = await fetch(url);
    const html = await response.text();
    const doc = new DOMParser().parseFromString(html, "text/html");

    const list = [];
    const items = doc.querySelectorAll(".ls4w .ls4");

    items.forEach((item) => {
      const titleEl = item.querySelector(".ls4j h3 a");
      const imgEl = item.querySelector(".ls4v img");
      const linkEl = item.querySelector(".ls4j a");

      if (titleEl && linkEl) {
        list.push({
          title: titleEl.textContent.trim(),
          url: linkEl.getAttribute("href"),
          cover: imgEl ? imgEl.getAttribute("src") : ""
        });
      }
    });

    return list;
  },

  async getComicDetails(comicUrl) {
    const response = await fetch(comicUrl);
    const html = await response.text();
    const doc = new DOMParser().parseFromString(html, "text/html");

    const title = doc.querySelector("h1[itemprop='name']")?.textContent.trim();
    const cover = doc.querySelector(".ls2l img")?.getAttribute("src");
    const description = doc.querySelector("p[itemprop='description']")?.textContent.trim();

    const chapters = [];
    const chapterElements = doc.querySelectorAll("#Daftar_Chapter tr");

    chapterElements.forEach((el) => {
      const aTag = el.querySelector(".judulseries a");
      const dateTag = el.querySelector(".tglseries");

      if (aTag) {
        chapters.push({
          name: aTag.textContent.trim(),
          url: aTag.getAttribute("href"),
          releaseDate: dateTag ? dateTag.textContent.trim() : ""
        });
      }
    });

    return {
      title,
      cover,
      description,
      chapters
    };
  },

  async getChapterImages(chapterUrl) {
    const response = await fetch(chapterUrl);
    const html = await response.text();
    const doc = new DOMParser().parseFromString(html, "text/html");

    const images = [];
    const imgElements = doc.querySelectorAll("#Baca_Komik img");

    imgElements.forEach((img) => {
      const src = img.getAttribute("src");
      if (src) {
        images.push(src.trim());
      }
    });

    return images;
  }
};

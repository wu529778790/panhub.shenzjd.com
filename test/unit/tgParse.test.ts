import { describe, it, expect } from "vitest";
import { load } from "cheerio";
import { parseChannelPage } from "../../server/core/services/tg";

function wrapMessage(text: string, post = "chan/1"): string {
  return `
    <div class="tgme_widget_message_wrap">
      <div class="tgme_widget_message" data-post="${post}">
        <div class="tgme_widget_message_text">${text}</div>
      </div>
      <time datetime="2026-01-01T00:00:00.000Z"></time>
    </div>`;
}

describe("parseChannelPage 链接提取", () => {
  it("展开 t.me 分享链接里嵌套的真实网盘地址（不被整体当成 t.me 丢弃）", () => {
    const html = wrapMessage(
      "资源 https://t.me/share/url?url=https://pan.quark.cn/s/abcdef 提取码：1234"
    );
    const $ = load(html);
    const results = parseChannelPage($, "testchan", "", 10);

    expect(results).toHaveLength(1);
    const quarkLinks = results[0].links.filter((l) => l.type === "quark");
    expect(quarkLinks).toHaveLength(1);
    expect(quarkLinks[0].url).toBe("https://pan.quark.cn/s/abcdef");
  });

  it("仍然能直接提取普通网盘链接", () => {
    const html = wrapMessage("电影 https://pan.quark.cn/s/xyz");
    const $ = load(html);
    const results = parseChannelPage($, "testchan", "", 10);

    const quarkLinks = results[0].links.filter((l) => l.type === "quark");
    expect(quarkLinks).toHaveLength(1);
    expect(quarkLinks[0].url).toBe("https://pan.quark.cn/s/xyz");
  });

  it("识别 115 新分享域名并优先读取 URL 中的访问码", () => {
    const html = wrapMessage(
      '三体 <a href="https://115cdn.com/s/abc123?password=a1b2">115网盘</a>'
    );
    const $ = load(html);
    const results = parseChannelPage($, "gimy115", "三体", 10);

    expect(results).toHaveLength(1);
    expect(results[0].links).toEqual([
      {
        type: "115",
        url: "https://115cdn.com/s/abc123?password=a1b2",
        password: "a1b2",
      },
    ]);
  });

  it("清理 115 文本链接的伪 fragment，并与 a 标签链接去重", () => {
    const html = wrapMessage(
      '庆余年 https://115.com/s/swzrznr3wrb?password=sb72#Season 2' +
        '<a href="https://115.com/s/swzrznr3wrb?password=sb72#">115网盘</a>'
    );
    const $ = load(html);
    const results = parseChannelPage($, "Lsp115", "庆余年", 10);

    expect(results[0].links).toEqual([
      {
        type: "115",
        url: "https://115.com/s/swzrznr3wrb?password=sb72",
        password: "sb72",
      },
    ]);
  });

  it("把证书失效的 anxia 旧域名改写为 115 官方落地域名", () => {
    const html = wrapMessage(
      '<a href="https://anxia.com/s/swhk9933no3?password=1234">三体</a>'
    );
    const $ = load(html);
    const results = parseChannelPage($, "QukanMovie", "三体", 10);

    expect(results[0].links[0]).toEqual({
      type: "115",
      url: "https://115cdn.com/s/swhk9933no3?password=1234",
      password: "1234",
    });
  });

  it("优先使用 href，避免把链接后的英文标题粘进网盘地址", () => {
    const html = wrapMessage(
      '资源 https://pan.quark.cn/s/abcdef123456Season 2 ' +
        '<a href="https://pan.quark.cn/s/abcdef123456">夸克网盘</a>'
    );
    const $ = load(html);
    const results = parseChannelPage($, "testchan", "资源", 10);

    expect(results[0].links).toEqual([
      {
        type: "quark",
        url: "https://pan.quark.cn/s/abcdef123456",
        password: "",
      },
    ]);
  });

  it("识别 PikPak 跳转，并同时提取内嵌磁力链接", () => {
    const magnet = "magnet:?xt=urn:btih:582fc386d0087dcefe998b70d0bc6794c361e603";
    const pikpak = `https://toapp.mypikpak.com/toapp?__add_url=${encodeURIComponent(magnet)}&source=pptg`;
    const encodedPikpak = pikpak.replace(/&/g, "&amp;amp;");
    const html = wrapMessage(`<a href="${encodedPikpak}">流浪地球</a>`);
    const $ = load(html);
    const results = parseChannelPage($, "PikPak_Share_Channel", "流浪地球", 10);

    expect(results[0].links).toEqual([
      { type: "pikpak", url: pikpak, password: "" },
      { type: "magnet", url: magnet, password: "" },
    ]);
  });

  it("识别 123 网盘的新分享域名", () => {
    const html = wrapMessage(
      '<a href="https://www.123684.com/s/example">电子书</a>'
    );
    const $ = load(html);
    const results = parseChannelPage($, "xx123pan", "电子书", 10);

    expect(results[0].links[0].type).toBe("123");
  });

  it("识别 123865 新域名", () => {
    const html = wrapMessage(
      '<a href="https://www.123865.com/s/example-code">纪录片</a>'
    );
    const $ = load(html);
    const results = parseChannelPage($, "yp123pan", "纪录片", 10);

    expect(results[0].links[0]).toMatchObject({
      type: "123",
      url: "https://www.123865.com/s/example-code",
    });
  });

  it("提取消息按钮中的网盘链接", () => {
    const html = `
      <div class="tgme_widget_message_wrap">
        <div class="tgme_widget_message" data-post="button/1">
          <div class="tgme_widget_message_text">蓝光纪录片</div>
          <a class="tgme_widget_message_inline_button" href="https://pan.quark.cn/s/button-link">立即查看</a>
        </div>
        <time datetime="2026-07-22T12:00:00.000Z"></time>
      </div>`;
    const $ = load(html);
    const results = parseChannelPage($, "button", "纪录片", 10);

    expect(results[0].links).toContainEqual({
      type: "quark",
      url: "https://pan.quark.cn/s/button-link",
      password: "",
    });
  });

  it("为 Telegram 磁力补齐哈希、来源和内容维度", () => {
    const magnet =
      "magnet:?xt=urn:btih:582fc386d0087dcefe998b70d0bc6794c361e603" +
      "&tr=https%3A%2F%2Ftracker.one&tr=udp%3A%2F%2Ftracker.two";
    const html = wrapMessage(
      `电影 2026 4K REMUX H.265 大小：12.5 GB ` +
        `<a href="https://pan.quark.cn/s/movie">夸克</a> ${magnet}`,
      "magnet-film/9"
    );
    const $ = load(html);
    const results = parseChannelPage($, "magnet-film", "电影", 10);

    expect(results[0].links.some((link) => link.type === "magnet")).toBe(true);
    expect(results[0].source).toBe("Telegram @magnet-film");
    expect(results[0].metadata).toMatchObject({
      infoHash: "582fc386d0087dcefe998b70d0bc6794c361e603",
      trackerCount: 2,
      resolution: "4K",
      releaseType: "REMUX",
      videoCodec: "H.265",
      sizeBytes: 12_500_000_000,
      sources: ["Telegram @magnet-film"],
      originSource: "Telegram @magnet-film",
      lastSeenAt: "2026-01-01T00:00:00.000Z",
    });
  });

  it("截断标题时不会切断 emoji 形成非法 Unicode", () => {
    const title = `${"a".repeat(79)}😀后文`;
    const html = wrapMessage(
      `${title} <a href="https://pan.quark.cn/s/unicode">夸克网盘</a>`
    );
    const $ = load(html);
    const results = parseChannelPage($, "unicode", "后文", 10);

    expect(results[0].title.endsWith("😀")).toBe(true);
    expect(() => encodeURI(results[0].title)).not.toThrow();
  });
});

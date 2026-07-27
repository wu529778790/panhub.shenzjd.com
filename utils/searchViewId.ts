export function createSearchViewId(platform: string, url: string): string {
  let first = 0x811c9dc5;
  let second = 0x9e3779b9;

  for (let index = 0; index < url.length; index += 1) {
    const code = url.charCodeAt(index);
    first = Math.imul(first ^ code, 0x01000193);
    second = Math.imul(second ^ code, 0x85ebca6b);
    second ^= second >>> 13;
  }

  const digest = [first, second]
    .map((value) => (value >>> 0).toString(16).padStart(8, "0"))
    .join("");
  return `${platform.slice(0, 40)}:${digest}`;
}

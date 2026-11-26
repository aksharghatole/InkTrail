const test=require("node:test");const assert=require("node:assert/strict");const {detect,canonicalReaderUrl}=require("../extension/core.js");
const fixtures=[
  [
    {
      "url": "https://www.webtoons.com/en/fantasy/blue-moon/ep-17/viewer?title_no=42&episode_no=18&token=secret",
      "title": "Blue Moon Episode 17 | WEBTOON"
    },
    [
      "Blue Moon",
      "17",
      "https://www.webtoons.com/en/fantasy/blue-moon/ep-17/viewer?title_no=42&episode_no=18"
    ]
  ],
  [
    {
      "url": "https://www.webtoons.com/en/fantasy/blue-moon/list?title_no=42",
      "title": "Blue Moon Episode 17 | WEBTOON"
    },
    null
  ],
  [
    {
      "url": "https://mangadex.org/chapter/12345678-1234-1234-1234-123456789abc/4",
      "headings": [
        "Blue Moon",
        "Chapter 8.5"
      ]
    },
    [
      "Blue Moon",
      "8.5",
      "https://mangadex.org/chapter/12345678-1234-1234-1234-123456789abc/4"
    ]
  ],
  [
    {
      "url": "https://mangadex.org/title/12345678-1234-1234-1234-123456789abc",
      "headings": [
        "Blue Moon",
        "Chapter 8.5"
      ]
    },
    null
  ],
  [
    {
      "url": "https://example.org/manga/blue-moon/capitulo-12,5",
      "title": "Blue Moon Capítulo 12,5"
    },
    [
      "Blue Moon",
      "12.5",
      "https://example.org/manga/blue-moon/capitulo-12,5"
    ]
  ],
  [
    {
      "url": "https://example.org/series/blue-moon-chapter-17",
      "title": "Blue Moon Chapter 17",
      "readerImages": 10
    },
    [
      "Blue Moon",
      "17",
      "https://example.org/series/blue-moon-chapter-17"
    ]
  ],
  [
    {
      "url": "https://example.org/manga/blue-moon/chapter-17",
      "title": "Blue Moon Chapter 18"
    },
    null
  ],
  [
    {
      "url": "https://example.org/series/blue-moon-chapter-17",
      "title": "Blue Moon Chapter 17",
      "readerImages": 0
    },
    null
  ],
  [
    {
      "url": "https://example.org/manga/blue-moon/chapter-2",
      "title": "Blue Moon 第2話"
    },
    [
      "Blue Moon",
      "2",
      "https://example.org/manga/blue-moon/chapter-2"
    ]
  ]
];
for(const [input,expected] of fixtures)test(input.url,()=>{const r=detect(input);assert.deepEqual(r?[r.title,r.chapter,r.url]:null,expected);});
test("generic resume URL drops query and hash",()=>assert.equal(canonicalReaderUrl(new URL("https://example.org/read/1?token=123#panel")), "https://example.org/read/1"));

const test=require("node:test");const assert=require("node:assert/strict");const {detect,mergeEntry}=require("../extension/core.js");
const examples=[
  [
    {
      "url": "https://example.org/manga/blue-moon/chapter-12.5",
      "title": "Blue Moon Chapter 12.5 | Reader"
    },
    [
      "Blue Moon",
      "12.5"
    ]
  ],
  [
    {
      "url": "https://example.org/manhwa/ink-trail/chapter/007",
      "title": "Chapter 7",
      "headings": [
        "Ink Trail"
      ]
    },
    [
      "Ink Trail",
      "7"
    ]
  ],
  [
    {
      "url": "https://example.org/manga/blue-moon",
      "title": "Blue Moon Manga",
      "headings": [
        "Chapter 12"
      ]
    },
    null
  ],
  [
    {
      "url": "https://example.org/books/chapter-7",
      "title": "Physics Chapter 7"
    },
    null
  ],
  [
    {
      "url": "https://manga.example.org/read/abc",
      "title": "Moon Chapter 0"
    },
    [
      "Moon",
      "0"
    ]
  ],
  [
    {
      "url": "https://example.org/manga/a/chapter-3?token=secret#x",
      "title": "A Chapter 3"
    },
    [
      "A",
      "3"
    ]
  ]
];
for(const [input,expected] of examples)test(input.url,()=>{const got=detect(input);assert.deepEqual(got?[got.title,got.chapter]:null,expected);if(got)assert.doesNotMatch(got.url,/[?#]/);});
test("rereading preserves progress",()=>{const r={...detect(examples[0][0]),progress:95,completed:true};const s=mergeEntry(mergeEntry(null,r,1),{...r,progress:10,completed:false},2);assert.equal(s.chapters["12.5"].progress,95);assert.equal(s.chapters["12.5"].completed,true);});

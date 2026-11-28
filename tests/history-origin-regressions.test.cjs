const test = require('node:test');
const assert = require('node:assert/strict');
const {historyOrigin, historyCandidates, importHistory} = require('../extension/history-core.js');

test('history origin rejects credentials, paths and query strings', () => {
  for (const url of ['https://user:pass@example.org','https://example.org/chapter/1','https://example.org/?token=x','file:///tmp/book']) assert.throws(() => historyOrigin(url));
  assert.equal(historyOrigin('https://EXAMPLE.org:443/'),'https://example.org');
});
test('history candidates exclude other origins and malformed visits', () => {
  const now = Date.now();
  assert.deepEqual(historyCandidates([
    {url:'https://other.example/chapter/1',lastVisitTime:now},
    {url:'https://example.org/chapter/1',lastVisitTime:now+120000},
    {url:'https://example.org/chapter/1',lastVisitTime:NaN},
    null
  ],'https://example.org'),[]);
});
test('invalid history selection leaves existing library untouched', () => {
  const library = {existing:{title:'Existing'}};
  assert.throws(() => importHistory(library,[null]));
  assert.deepEqual(library,{existing:{title:'Existing'}});
});

test('valid exact-origin chapter remains importable alongside rejected private URLs', () => {
  const now = Date.now();
  const origin = 'https://example.org';
  const valid = {url:origin+'/manga/moon/chapter-2',title:'Moon Chapter 2',lastVisitTime:now};
  const rows = historyCandidates([
    {...valid,url:'https://user:pass@example.org/manga/moon/chapter-1'},
    {...valid,url:origin+'/manga/moon/chapter-3?token=secret'},
    valid
  ],origin);
  assert.equal(rows.length,1);
  assert.equal(rows[0].url,valid.url);
  assert.equal(importHistory({},rows).added,1);
});

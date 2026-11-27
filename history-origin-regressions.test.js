const test = require('node:test');
const assert = require('node:assert/strict');
const {historyOrigin, historyCandidates, importHistory} = require('./extension/history-core.js');

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

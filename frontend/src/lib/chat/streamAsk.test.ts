import test from 'node:test';
import assert from 'node:assert/strict';
import { streamAsk, stripProtocolTags, StreamAskError } from './streamAsk';

function sseResponse(body: string, status = 200): Response {
  return new Response(body, { status, headers: { 'content-type': 'text/event-stream' } });
}

test('stripProtocolTags removes complete and partial protocol tags', () => {
  assert.equal(stripProtocolTags('Answer<followups>["a","b"]</followups>'), 'Answer');
  assert.equal(stripProtocolTags('Answer<memory>exam on friday</memory>\nMore'), 'Answer\nMore');
  assert.equal(stripProtocolTags('Answer streaming <followups>["a",'), 'Answer streaming');
});

test('streamAsk collects deltas, handles reset, returns final payload', async () => {
  const body =
    'event: start\ndata: {"ok":true}\n\n' +
    'event: delta\ndata: {"t":"Hel"}\n\n' +
    'event: reset\ndata: {}\n\n' +
    'event: delta\ndata: {"t":"Hello"}\n\n' +
    'event: final\ndata: {"modelUsed":"x","followups":["q"]}\n\n';
  const original = globalThis.fetch;
  globalThis.fetch = (async () => sseResponse(body)) as typeof fetch;
  try {
    let acc = '';
    const final = await streamAsk(
      { feature: 'ai-tutor', payload: {} },
      {
        onDelta: (c) => (acc += c),
        onReset: () => (acc = ''),
      }
    );
    assert.equal(acc, 'Hello');
    assert.equal(final.modelUsed, 'x');
    assert.deepEqual(final.followups, ['q']);
  } finally {
    globalThis.fetch = original;
  }
});

test('streamAsk surfaces HTTP errors with status and code', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ error: 'No credits', code: 'INSUFFICIENT_CREDITS' }), {
      status: 402,
      headers: { 'content-type': 'application/json' },
    })) as typeof fetch;
  try {
    await assert.rejects(
      () => streamAsk({}),
      (err: unknown) =>
        err instanceof StreamAskError && err.status === 402 && err.code === 'INSUFFICIENT_CREDITS'
    );
  } finally {
    globalThis.fetch = original;
  }
});

test('streamAsk throws when the stream carries an error event', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async () =>
    sseResponse('event: error\ndata: {"error":"providers down"}\n\n')) as typeof fetch;
  try {
    await assert.rejects(() => streamAsk({}), /providers down/);
  } finally {
    globalThis.fetch = original;
  }
});

test('streamAsk throws if the stream ends with no final event', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async () => sseResponse('event: delta\ndata: {"t":"x"}\n\n')) as typeof fetch;
  try {
    await assert.rejects(() => streamAsk({}), /ended unexpectedly/);
  } finally {
    globalThis.fetch = original;
  }
});

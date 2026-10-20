// Independently scripted request identity. No imports from the production classifier/owner.
const scenario = process.argv[2];
if (scenario === 'code_mode_witness_pair') {
  process.argv[2] = 'environmentless_tools';
  const send = globalThis.fetch;
  globalThis.fetch = (url, options) => {
    const target = new URL(url);
    if (target.hostname !== '127.0.0.1') throw Error('fixture_nonlocal_request');
    if (options?.method === 'POST') {
      const body = JSON.parse(options.body);
      body.tools = [
        { type: 'custom', name: 'exec', format: { type: 'grammar', syntax: 'lark', definition: 'start: "fictional"' } },
        { type: 'function', name: 'wait', parameters: { type: 'object', properties: {} } },
      ];
      return send(url, { ...options, body: JSON.stringify(body) });
    }
    return send(url, options);
  };
}
await import('./codex-request-observer-peer.mjs');

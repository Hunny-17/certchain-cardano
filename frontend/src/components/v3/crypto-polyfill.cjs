function randomFillSync(buffer) {
  if (!globalThis.crypto?.getRandomValues) {
    throw new Error('Web Crypto getRandomValues is not available in this browser.');
  }

  const view = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const chunkSize = 65536;

  for (let offset = 0; offset < view.length; offset += chunkSize) {
    globalThis.crypto.getRandomValues(view.subarray(offset, offset + chunkSize));
  }

  return buffer;
}

module.exports = {
  randomFillSync,
};

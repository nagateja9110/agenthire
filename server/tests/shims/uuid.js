/**
 * CJS shim for the ESM-only uuid@14 package, used ONLY by Jest via
 * moduleNameMapper (Jest cannot require() ESM yet; Node itself can).
 * Implements the subset LangGraph uses: v4, v5, v6, parse, stringify, validate.
 */
const crypto = require('crypto');

function stringify(bytes) {
  const hex = Buffer.from(bytes).toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function parse(str) {
  return Uint8Array.from(Buffer.from(String(str).replace(/-/g, ''), 'hex'));
}

function validate(str) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(str));
}

function v4() {
  return crypto.randomUUID();
}

function v5(name, namespace) {
  const nsBytes =
    typeof namespace === 'string'
      ? Buffer.from(namespace.replace(/-/g, ''), 'hex')
      : Buffer.from(namespace);
  const nameBytes = typeof name === 'string' ? Buffer.from(name, 'utf8') : Buffer.from(name);
  const hash = crypto.createHash('sha1').update(Buffer.concat([nsBytes, nameBytes])).digest();
  const bytes = Buffer.from(hash.subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x50; // version 5
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // RFC variant
  return stringify(bytes);
}

const GREGORIAN_OFFSET_MS = 12219292800000n;

function v6(options = {}) {
  const msecs = options.msecs !== undefined ? options.msecs : Date.now();
  const nsecs = options.nsecs !== undefined ? options.nsecs : 0;
  const clockseq =
    options.clockseq !== undefined ? options.clockseq : crypto.randomInt(0, 1 << 14);

  // 60-bit timestamp in 100ns intervals since the Gregorian epoch,
  // laid out high-to-low so ids sort lexicographically by time.
  const ts = (BigInt(msecs) + GREGORIAN_OFFSET_MS) * 10000n + BigInt(nsecs);
  const bytes = Buffer.alloc(16);
  bytes.writeUInt32BE(Number((ts >> 28n) & 0xffffffffn), 0);
  bytes.writeUInt16BE(Number((ts >> 12n) & 0xffffn), 4);
  bytes.writeUInt16BE((Number(ts & 0xfffn) | 0x6000) & 0xffff, 6);
  bytes.writeUInt16BE(((clockseq & 0x3fff) | 0x8000) & 0xffff, 8);
  crypto.randomBytes(6).copy(bytes, 10);
  return stringify(bytes);
}

const NIL = '00000000-0000-0000-0000-000000000000';
const MAX = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

module.exports = { v4, v5, v6, parse, stringify, validate, NIL, MAX };

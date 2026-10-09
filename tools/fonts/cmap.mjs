/**
 * cmap-Leser fuer woff2, ohne Abhaengigkeit.
 *
 * WOFF2 = Header + Tabellenverzeichnis + EIN Brotli-Strom ueber alle Tabellen.
 * Die cmap-Tabelle wird nicht transformiert (nur glyf/loca/hmtx koennen es
 * sein), liegt also im dekomprimierten Strom unveraendert. Gelesen werden
 * cmap-Subtabellen Format 4 (BMP) und 12 (volle Unicode-Reichweite).
 */
import { brotliDecompressSync } from 'node:zlib';

const KNOWN_TAGS = [
  'cmap', 'head', 'hhea', 'hmtx', 'maxp', 'name', 'OS/2', 'post', 'cvt ', 'fpgm', 'glyf',
  'loca', 'prep', 'CFF ', 'VORG', 'EBDT', 'EBLC', 'gasp', 'hdmx', 'kern', 'LTSH', 'PCLT',
  'VDMX', 'vhea', 'vmtx', 'BASE', 'GDEF', 'GPOS', 'GSUB', 'EBSC', 'JSTF', 'MATH', 'CBDT',
  'CBLC', 'COLR', 'CPAL', 'SVG ', 'sbix', 'acnt', 'avar', 'bdat', 'bloc', 'bsln', 'cvar',
  'fdsc', 'feat', 'fmtx', 'fvar', 'gvar', 'hsty', 'just', 'lcar', 'mort', 'morx', 'opbd',
  'prop', 'trak', 'Zapf', 'Silf', 'Glat', 'Gloc', 'Feat', 'Sill',
];

function readBase128(buf, pos) {
  let value = 0;
  for (let i = 0; i < 5; i += 1) {
    const byte = buf[pos + i];
    value = value * 128 + (byte & 0x7f);
    if ((byte & 0x80) === 0) return [value, pos + i + 1];
  }
  throw new Error('UIntBase128 zu lang');
}

/** @returns {Set<number>} alle Codepoints, die die Schrift abbildet. */
export function readCmap(file) {
  if (file.toString('latin1', 0, 4) !== 'wOF2') throw new Error('kein woff2');
  const numTables = file.readUInt16BE(12);
  const totalCompressed = file.readUInt32BE(20);
  let pos = 48;
  const tables = [];
  for (let i = 0; i < numTables; i += 1) {
    const flags = file[pos]; pos += 1;
    const tagIndex = flags & 0x3f;
    let tag;
    if (tagIndex === 0x3f) { tag = file.toString('latin1', pos, pos + 4); pos += 4; }
    else tag = KNOWN_TAGS[tagIndex];
    const version = flags >> 6;
    let origLength; [origLength, pos] = readBase128(file, pos);
    // glyf/loca sind bei Version 0 transformiert und tragen transformLength;
    // alle anderen Tabellen nur bei Version != 0.
    const transformed = tag === 'glyf' || tag === 'loca' ? version === 0 : version !== 0;
    let length = origLength;
    if (transformed) { [length, pos] = readBase128(file, pos); }
    tables.push({ tag, length });
  }
  const data = brotliDecompressSync(file.subarray(pos, pos + totalCompressed));
  let offset = 0;
  let cmap = null;
  for (const t of tables) {
    if (t.tag === 'cmap') cmap = data.subarray(offset, offset + t.length);
    offset += t.length;
  }
  if (!cmap) throw new Error('keine cmap-Tabelle');
  return readCmapTable(cmap);
}

/** @returns {Set<number>} Codepoints einer rohen cmap-Tabelle (Format 4 und 12). */
export function readCmapTable(cmap) {
  const out = new Set();
  const records = cmap.readUInt16BE(2);
  for (let r = 0; r < records; r += 1) {
    const platform = cmap.readUInt16BE(4 + r * 8);
    const encoding = cmap.readUInt16BE(6 + r * 8);
    const sub = cmap.readUInt32BE(8 + r * 8);
    const unicode = platform === 0 || (platform === 3 && (encoding === 1 || encoding === 10));
    if (!unicode) continue;
    const format = cmap.readUInt16BE(sub);
    if (format === 4) {
      const segX2 = cmap.readUInt16BE(sub + 6);
      const endBase = sub + 14;
      const startBase = endBase + segX2 + 2;
      const deltaBase = startBase + segX2;
      const rangeBase = deltaBase + segX2;
      for (let s = 0; s < segX2 / 2; s += 1) {
        const end = cmap.readUInt16BE(endBase + s * 2);
        const start = cmap.readUInt16BE(startBase + s * 2);
        const delta = cmap.readInt16BE(deltaBase + s * 2);
        const rangeOffset = cmap.readUInt16BE(rangeBase + s * 2);
        for (let c = start; c <= end && c !== 0xffff; c += 1) {
          let glyph;
          if (rangeOffset === 0) glyph = (c + delta) & 0xffff;
          else {
            const at = rangeBase + s * 2 + rangeOffset + (c - start) * 2;
            glyph = cmap.readUInt16BE(at);
            if (glyph !== 0) glyph = (glyph + delta) & 0xffff;
          }
          if (glyph !== 0) out.add(c);
        }
      }
    } else if (format === 12) {
      const groups = cmap.readUInt32BE(sub + 12);
      for (let g = 0; g < groups; g += 1) {
        const at = sub + 16 + g * 12;
        const start = cmap.readUInt32BE(at);
        const end = cmap.readUInt32BE(at + 4);
        const glyph0 = cmap.readUInt32BE(at + 8);
        for (let c = start; c <= end; c += 1) if (glyph0 + (c - start) !== 0) out.add(c);
      }
    }
  }
  return out;
}

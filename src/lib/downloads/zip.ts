import "server-only";

const encoder = new TextEncoder();

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let index = 0; index < 8; index++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function concat(parts: Uint8Array[]) {
  const output = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) { output.set(part, offset); offset += part.length; }
  return output;
}

function header(size: number) {
  const bytes = new Uint8Array(size);
  return { bytes, view: new DataView(bytes.buffer) };
}

export function createZip(files: Array<{ name: string; bytes: Uint8Array }>) {
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let localOffset = 0;
  for (const file of files) {
    const name = encoder.encode(file.name);
    const crc = crc32(file.bytes);
    const local = header(30);
    local.view.setUint32(0, 0x04034b50, true); local.view.setUint16(4, 20, true); local.view.setUint16(6, 0x0800, true);
    local.view.setUint32(14, crc, true); local.view.setUint32(18, file.bytes.length, true); local.view.setUint32(22, file.bytes.length, true); local.view.setUint16(26, name.length, true);
    localParts.push(local.bytes, name, file.bytes);
    const central = header(46);
    central.view.setUint32(0, 0x02014b50, true); central.view.setUint16(4, 20, true); central.view.setUint16(6, 20, true); central.view.setUint16(8, 0x0800, true);
    central.view.setUint32(16, crc, true); central.view.setUint32(20, file.bytes.length, true); central.view.setUint32(24, file.bytes.length, true); central.view.setUint16(28, name.length, true); central.view.setUint32(42, localOffset, true);
    centralParts.push(central.bytes, name);
    localOffset += local.bytes.length + name.length + file.bytes.length;
  }
  const localBytes = concat(localParts);
  const centralBytes = concat(centralParts);
  const end = header(22);
  end.view.setUint32(0, 0x06054b50, true); end.view.setUint16(8, files.length, true); end.view.setUint16(10, files.length, true); end.view.setUint32(12, centralBytes.length, true); end.view.setUint32(16, localBytes.length, true);
  return concat([localBytes, centralBytes, end.bytes]);
}

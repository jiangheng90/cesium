// GW-ADD
import pako from "pako";
import createTaskProcessorWorker from "./createTaskProcessorWorker.js";

function decodeGeowayTerrainPacket(parameters, transferableObjects) {
  const buffer = parameters.buffer;
  const width = parameters.width;
  const level = parameters.level;
  const x = parameters.x;
  const y = parameters.y;
  let pos = 0;
  const view = new DataView(buffer);
  // var four_cc = view.getUint32(pos,true);
  pos += Uint32Array.BYTES_PER_ELEMENT;

  const min_val = view.getFloat32(pos, true);
  pos += Float32Array.BYTES_PER_ELEMENT;

  const d_operator = view.getFloat64(pos, true);
  pos += Float64Array.BYTES_PER_ELEMENT;

  const zip_data = new Uint8Array(buffer, pos, buffer.byteLength - 16);
  // var blob = new Blob(buffer);
  const uncompressedPacket = pako.inflate(zip_data);
  const unzaip_data_size = width * width;
  const uncompressedbuffer = new Uint16Array(uncompressedPacket.buffer);
  const gridbuffer = new Float32Array(unzaip_data_size); //uncompressedPacket.buffer;
  let i = 0,
    j = 0;
  for (i = 0; i < unzaip_data_size; i++) {
    const idx = Math.ceil(width - 1 - i / width) * width + (i % width);
    const relative_height = uncompressedbuffer[i];
    if (relative_height < 0) {
      gridbuffer[idx] = relative_height;
    } else {
      gridbuffer[idx] = relative_height * d_operator + min_val;
    }
  }

  const gridbuffer1 = new Float32Array(unzaip_data_size);
  for (i = 0; i < width; i++) {
    for (j = 0; j < width; j++) {
      gridbuffer1[i * width + j] = gridbuffer[(width - 1 - i) * width + j];
    }
  }
  transferableObjects.push(gridbuffer1.buffer);

  return { buffer: gridbuffer1, level: level, x: x, y: y };
}
export default createTaskProcessorWorker(decodeGeowayTerrainPacket);

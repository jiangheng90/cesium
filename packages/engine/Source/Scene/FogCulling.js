/**
 * Fog-based far-distance culling for 3D Tiles. Tiles whose distance to the
 * camera exceeds the point where the exponential fog factor
 * <code>exp(-(distance * density)^2)</code> underflows are culled, with the
 * density interpolated from a camera-height table (the same table
 * cesium-native uses for its fog culling, originally derived from the visual
 * fog tuning).
 *
 * The density table models Earth's atmosphere; the cutoff it produces is
 * heuristic, not a geometric horizon bound.
 *
 * @namespace FogCulling
 * @private
 */
const FogCulling = {};

const FOG_DENSITY_TABLE = [
  { height: 359.393, density: 2.0e-5 },
  { height: 800.749, density: 2.0e-4 },
  { height: 1275.6501, density: 1.0e-4 },
  { height: 2151.1192, density: 7.0e-5 },
  { height: 3141.7763, density: 5.0e-5 },
  { height: 4777.5198, density: 4.0e-5 },
  { height: 6281.2493, density: 3.0e-5 },
  { height: 12364.307, density: 1.9e-5 },
  { height: 15900.765, density: 1.0e-5 },
  { height: 49889.0549, density: 8.5e-6 },
  { height: 78026.8259, density: 6.2e-6 },
  { height: 99260.7344, density: 5.8e-6 },
  { height: 120036.3873, density: 5.3e-6 },
  { height: 151011.0158, density: 5.2e-6 },
  { height: 156091.1953, density: 5.1e-6 },
  { height: 203849.3112, density: 4.2e-6 },
  { height: 274866.9803, density: 4.0e-6 },
  { height: 319916.3149, density: 3.4e-6 },
  { height: 493552.0528, density: 2.6e-6 },
  { height: 628733.5874, density: 2.2e-6 },
  { height: 1000000.0, density: 0.0 },
];

/**
 * Fog density for a camera at the given height above the ellipsoid,
 * linearly interpolated over the density table.
 *
 * @param {number} height The camera height above the ellipsoid, in meters.
 * @returns {number} The fog density.
 */
FogCulling.densityAtHeight = function (height) {
  const table = FOG_DENSITY_TABLE;
  const last = table.length - 1;

  if (height <= table[0].height) {
    return table[0].density;
  }
  if (height >= table[last].height) {
    return table[last].density;
  }

  // Binary search for the first entry with entry.height >= height.
  let lo = 0;
  let hi = last;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (table[mid].height < height) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }

  const a = table[lo - 1];
  const b = table[lo];
  const t = Math.min(
    Math.max((height - a.height) / (b.height - a.height), 0.0),
    1.0,
  );
  return a.density + t * (b.density - a.density);
};

/**
 * Whether a tile at the given distance survives the fog: the exponential
 * fog factor <code>exp(-(distance * density)^2)</code> underflows to zero
 * past the cutoff distance.
 *
 * @param {number} distance The distance of the tile bounding volume to the camera, in meters.
 * @param {number} fogDensity The fog density, see {@link FogCulling.densityAtHeight}.
 * @returns {boolean} Whether the tile is visible in the fog.
 */
FogCulling.isVisible = function (distance, fogDensity) {
  if (fogDensity <= 0.0) {
    return true;
  }
  const fogScalar = distance * fogDensity;
  return Math.exp(-(fogScalar * fogScalar)) > 0.0;
};

export default FogCulling;

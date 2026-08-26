import Cartesian3 from "../Core/Cartesian3.js";
import Cartesian4 from "../Core/Cartesian4.js";
import Cartographic from "../Core/Cartographic.js";
import Ellipsoid from "../Core/Ellipsoid.js";

/**
 * Horizon-based far-distance culling for 3D Tiles: a far plane is appended
 * to a dedicated culling volume (never the render frustum) at the horizon
 * (tangent) distance from the camera, and tiles whose bounding volume lies
 * entirely beyond it are culled during traversal.
 *
 * The tangent distance is computed against a datum ellipsoid — the body
 * ellipsoid with every radius reduced by <code>inset</code> meters — so the
 * bound stays finite and continuous as the camera approaches or dips below
 * the surface. <code>inset</code> doubles as the relief allowance: terrain
 * up to this height keeps a meaningful bound near the ground. Cameras deeper
 * than <code>inset</code> below the surface get no far bound.
 *
 * @namespace HorizonCulling
 * @private
 */
const HorizonCulling = {};

/**
 * The datum ellipsoid: <code>ellipsoid</code> with every radius reduced by
 * <code>inset</code> meters. The inset is clamped to half the smallest
 * radius so a bad value cannot degenerate the ellipsoid.
 *
 * @param {Ellipsoid} ellipsoid The body ellipsoid.
 * @param {number} inset The datum depth below the ellipsoid surface, in meters.
 * @returns {Ellipsoid} A new datum ellipsoid.
 */
HorizonCulling.datumEllipsoid = function (ellipsoid, inset) {
  const clamped = Math.min(Math.max(inset, 0.0), ellipsoid.minimumRadius * 0.5);
  const radii = ellipsoid.radii;
  return new Ellipsoid(radii.x - clamped, radii.y - clamped, radii.z - clamped);
};

const scratchCartographic = new Cartographic();

/**
 * Horizon (tangent) distance from a camera at <code>position</code>,
 * approximating the datum as the sphere through the camera's geodetic foot
 * point: with geodetic height <code>h</code> and geocentric distance
 * <code>d</code>, the foot-point radius is <code>r = d - h</code> and the
 * tangent distance is <code>sqrt(d² - r²)</code>.
 *
 * @param {Cartesian3} position The camera position in world coordinates.
 * @param {Ellipsoid} datum The datum ellipsoid, see {@link HorizonCulling.datumEllipsoid}.
 * @returns {number} The tangent distance in meters, or <code>-1</code> when
 * the camera is at or below the datum surface (no far bound applies).
 */
HorizonCulling.computeMaxCullingDistance = function (position, datum) {
  const cartographic = Cartographic.fromCartesian(
    position,
    datum,
    scratchCartographic,
  );
  if (cartographic.height <= 0.0) {
    return -1.0;
  }
  const d = Cartesian3.magnitude(position);
  const r = d - cartographic.height;
  return Math.sqrt((d - r) * (d + r));
};

/**
 * A culling volume holding only the horizon far plane: the plane through
 * <code>position + direction * maxCullingDistance</code>, perpendicular to
 * the view direction, with bounding volumes beyond it on the culled side.
 *
 * @param {Cartesian3} position The camera position in world coordinates.
 * @param {Cartesian3} direction The camera view direction (unit vector) in world coordinates.
 * @param {number} maxCullingDistance The tangent distance, see {@link HorizonCulling.computeMaxCullingDistance}.
 * @param {CullingVolume} [result] The culling volume to reuse.
 * @returns {CullingVolume} The culling volume with the far plane as its single plane.
 */
HorizonCulling.computeCullingVolume = function (
  position,
  direction,
  maxCullingDistance,
  result,
) {
  if (result.planes.length === 0) {
    result.planes.push(new Cartesian4());
  }
  const plane = result.planes[0];
  // CullingVolume planes are Cartesian4(normal.xyz, w) with the implicit
  // equation normal·p + w = 0. For the far plane with normal -direction
  // through position + direction * distance: w = direction · point.
  plane.x = -direction.x;
  plane.y = -direction.y;
  plane.z = -direction.z;
  plane.w = Cartesian3.dot(direction, position) + maxCullingDistance;
  return result;
};

export default HorizonCulling;

/**
 *
 * @param {Cartographic} position
 * @param {Rectangle} rectangle
 * @param {number} tileWidth
 * @param {number} tileHeight
 *
 * @returns {{x: number, y: number}} result
 */
function project(position, rectangle, tileWidth, tileHeight) {
  const { west, south, east, north } = rectangle;
  const { longitude, latitude } = position;
  const startX = west;
  const x = ((longitude - startX) / Math.abs(east - west)) * tileWidth;
  const startY = north;
  const y = (-(latitude - startY) / Math.abs(south - north)) * tileHeight;
  return { x, y };
}

/**
 *
 * @param {CanvasRenderingContext2D} context
 * @param {HierarchyElement[]} hierarchies
 * @param {Rectangle} rectangle
 * @param {number} tileWidth
 * @param {number} tileHeight
 * @param {boolean} hole
 *
 * @returns {void}
 */
function drawPolygonHierarchies(
  context,
  hierarchies,
  rectangle,
  tileWidth,
  tileHeight,
  hole
) {
  hierarchies.forEach((hierarchy) => {
    const { holes, positions } = hierarchy;
    if (positions) {
      positions.forEach((position, i) => {
        const { x, y } = project(position, rectangle, tileWidth, tileHeight);
        const method = i === 0 ? "moveTo" : "lineTo";
        context[method](x, y);
      });
    }

    if (holes) {
      drawPolygonHierarchies(
        context,
        holes,
        rectangle,
        tileWidth,
        tileHeight,
        !hole
      );
    }
  });
}

export default drawPolygonHierarchies;

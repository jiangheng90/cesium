import Cartographic from "./Cartographic.js";
import HierarchyElement from "./HierarchyElement.js";

/**
 *
 * @param {PolygonHierarchy[]} hierarchies
 * @param {Cartesian3[]} occupiedLocations
 *
 * @returns {HierarchyElement}
 */
function convertHierarchies(hierarchies, occupiedLocations) {
  const result = [];
  hierarchies.forEach((hierarchy) => {
    const hierarchyElement = new HierarchyElement();
    const { holes, positions } = hierarchy;
    if (positions.length > 0) {
      hierarchyElement.positions = positions.map((position) => {
        occupiedLocations.push(position);
        const p = Cartographic.fromCartesian(position);
        p.height = 0;
        return p;
      });
    }
    if (holes.length > 0) {
      hierarchyElement.holes = convertHierarchies(holes, occupiedLocations);
    }
    result.push(hierarchyElement);
  });
  return result;
}
export default convertHierarchies;

/**
 * @alias HierarchyElement
 * @constructor
 *
 */
function HierarchyElement() {
  /**
   * @type {Cartographic[]|undefined}
   * @default undefined
   */
  this.positions = undefined;

  /**
   * @type {HierarchyElement[]|undefined}
   * @default undefined
   */
  this.holes = undefined;
}

export default HierarchyElement;

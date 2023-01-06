/**
 * @enum {Number}
 */
const MaskType = {
  /**
   *
   * @type {Number}
   * @constant
   */
  NONE: 0,

  /**
   *
   * @type {Number}
   * @constant
   */
  WATER: 1,

  /**
   *
   * @type {Number}
   * @constant
   */
  OFFSET: 2,

  /**
   *
   * @type {Number}
   * @constant
   */
  CULL: 3,

  /**
   *
   * @type {Number}
   * @constant
   */
  MATERIAL: 4,
};

/**
 * @param {MaskType} type
 * @returns {Boolean}
 */
MaskType.isWaterMask = function (type) {
  return type === MaskType.WATER;
};

/**
 * @param {MaskType} type
 * @returns {Boolean}
 */
MaskType.isOffsetMask = function (type) {
  return type === MaskType.OFFSET;
};

/**
 * @param {MaskType} type
 * @returns {Boolean}
 */
MaskType.isMaterialMask = function (type) {
  return type === MaskType.MATERIAL;
};

export default Object.freeze(MaskType);

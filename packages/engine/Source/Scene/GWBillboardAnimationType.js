/**
 * @enum {Number}
 */
const GWBillboardAnimationType = {
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
  SHOW: 1,

  /**
   *
   * @type {Number}
   * @constant
   */
  HIDE: 2,
};

GWBillboardAnimationType.visible = function (type) {
  return type === GWBillboardAnimationType.SHOW;
};

GWBillboardAnimationType.invisible = function (type) {
  return type === GWBillboardAnimationType.HIDE;
};

export default Object.freeze(GWBillboardAnimationType);

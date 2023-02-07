import Color from "../Core/Color.js";
import defaultValue from "../Core/defaultValue.js";
import Event from "../Core/Event.js";
import Rectangle from "../Core/Rectangle.js";
import convertHierarchies from "../Core/convertHierarchies.js";
import drawPolygonHierarchies from "../Core/drawPolygonHierarchies.js";

/**
 *
 * @alias PolygonMaskProvider
 * @constructor
 *
 * @param {Object} options
 * @param {PolygonHierarchy[]} options.hierarchies
 * @param {Color} options.color
 * @param {Number} options.imageWidth
 * @param {Number} options.imageHeight
 *
 */
function PolygonMaskProvider(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  this._originalHierarchies = options.hierarchies;
  const scratchOccupiedLocations = [];
  this._hierarchies = convertHierarchies(
    options.hierarchies,
    scratchOccupiedLocations
  );
  this._boundingRectangle = Rectangle.fromCartesianArray(
    scratchOccupiedLocations
  );

  this._color = defaultValue(options.color, Color.YELLOW);
  this._colorInBytes = [
    Math.round(this._color.red * 255),
    Math.round(this._color.green * 255),
    Math.round(this._color.blue * 255),
    Math.round(this._color.alpha * 255),
  ];
  this._errorEvent = new Event();
  this._imageWidth = defaultValue(options.imageWidth, 256);
  this._imageHeight = defaultValue(options.imageHeight, 256);
  this._errorEvent = new Event();
}

Object.defineProperties(PolygonMaskProvider.prototype, {
  /**
   * @memberof PolygonMaskProvider.prototype
   * @type {Number}
   * @readonly
   */
  imageWidth: {
    get: function () {
      return this._imageWidth;
    },
  },

  /**
   * @memberof PolygonMaskProvider.prototype
   * @type {Number}
   * @readonly
   */
  imageHeight: {
    get: function () {
      return this._imageHeight;
    },
  },

  /**
   * Gets an event that is raised when the imagery provider encounters an asynchronous error.  By subscribing
   * to the event, you will be notified of the error and can potentially recover from it.  Event listeners
   * are passed an instance of {@link TileProviderError}.
   * @memberof PolygonMaskProvider.prototype
   * @type {Event}
   * @readonly
   */
  errorEvent: {
    get: function () {
      return this._errorEvent;
    },
  },

  /**
   * Gets a value indicating whether or not the provider is ready for use.
   * @memberof PolygonMaskProvider.prototype
   * @type {Boolean}
   * @readonly
   */
  ready: {
    get: function () {
      return true;
    },
  },

  /**
   * Gets a promise that resolves to true when the provider is ready for use.
   * @memberof PolygonMaskProvider.prototype
   * @type {Promise.<Boolean>}
   * @readonly
   */
  readyPromise: {
    get: function () {
      return undefined;
    },
  },
  /**
   * @memberof PolygonMaskProvider.prototype
   * @type {PolygonHierarchy[]}
   * @readonly
   */
  originalHierarchies: {
    get: function () {
      return this._originalHierarchies;
    },
  },

  /**
   * @memberof PolygonMaskProvider.prototype
   * @type {Rectangle}
   * @readonly
   */
  boundingRectangle: {
    get: function () {
      return this._boundingRectangle;
    },
  },
});

/**
 * @param {PolygonMaskProvider} provider
 * @param {Rectangle} tileRectangle
 */
function makeCanvas(provider, tileRectangle) {
  const canvas = document.createElement("canvas");
  canvas.width = provider._imageWidth;
  canvas.height = provider._imageHeight;
  const context = canvas.getContext("2d");
  context.imageSmoothingEnabled = false;
  const cssColor = provider._color.toCssColorString();
  context.fillStyle = cssColor;
  context.beginPath();
  drawPolygonHierarchies(
    context,
    provider._hierarchies,
    tileRectangle,
    provider._imageWidth,
    provider._imageHeight,
    true
  );
  context.fill();
  return canvas;
}

const scratchIntersectionRectangle = new Rectangle();
const scratchTileRectangle = new Rectangle();

/**
 * @param {Number} west
 * @param {Number} south
 * @param {Number} east
 * @param {Number} north
 * @param {Request} request
 *
 */
PolygonMaskProvider.prototype.requestImage = function (
  west,
  south,
  east,
  north,
  request
) {
  const tileRectangle = Rectangle.fromDegrees(
    west,
    south,
    east,
    north,
    scratchTileRectangle
  );
  const intersected = Rectangle.intersection(
    tileRectangle,
    this._boundingRectangle,
    scratchIntersectionRectangle
  );

  if (intersected) {
    return Promise.resolve(makeCanvas(this, tileRectangle));
  }
};

export default PolygonMaskProvider;

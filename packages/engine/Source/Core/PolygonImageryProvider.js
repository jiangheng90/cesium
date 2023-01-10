// GW-ADD
import Cartesian3 from "./Cartesian3.js";
import Cartographic from "./Cartographic.js";
import Color from "./Color.js";
import defaultValue from "./defaultValue.js";
import defined from "./defined.js";
import Event from "./Event.js";
import GeographicTilingScheme from "./GeographicTilingScheme.js";
import PolygonHierarchy from "./PolygonHierarchy.js";
import Rectangle from "./Rectangle.js";
import MaskType from "../Scene/MaskType.js";

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

/**
 *
 * @param {number[]} degreesArrayHeights
 *
 * @returns {PolygonHierarchy[]}
 */
function buildHierarchiesFromDegreesArrayHeights(degreesArrayHeights) {
  const positions = [];
  for (let i = 0; i < degreesArrayHeights.length; i += 3) {
    const longitude = degreesArrayHeights[i];
    const latitude = degreesArrayHeights[i + 1];
    const position = Cartesian3.fromDegrees(longitude, latitude);
    positions.push(position);
  }
  return [new PolygonHierarchy(positions)];
}

/**
 * @typedef {Object} PolygonImageryProvider.ConstructorOptions
 *
 * Initialization options for the PolygonImageryProvider constructor
 *
 * @property {PolygonHierarchy[]} [hierarchies = []]
 * @property {TilingScheme} [tilingScheme=new GeographicTilingScheme()] The tiling scheme for which to draw tiles.
 * @property {Ellipsoid} [ellipsoid] The ellipsoid.  If the tilingScheme is specified,
 *                    this parameter is ignored and the tiling scheme's ellipsoid is used instead. If neither
 *                    parameter is specified, the WGS84 ellipsoid is used.
 * @property {Color} [color=Color.YELLOW] The color to draw the tile box and label.
 * @property {Number} [tileWidth=256] The width of the tile for level-of-detail selection purposes.
 * @property {Number} [tileHeight=256] The height of the tile for level-of-detail selection purposes.
 */

/**
 * An {@link ImageryProvider} that draws a box around every rendered tile in the tiling scheme, and draws
 * a label inside it indicating the X, Y, Level coordinates of the tile.  This is mostly useful for
 * debugging terrain and imagery rendering problems.
 *
 * @alias PolygonImageryProvider
 * @constructor
 *
 * @param {PolygonImageryProvider.ConstructorOptions} [options] Object describing initialization options
 */
function PolygonImageryProvider(options) {
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
  this._tilingScheme = defined(options.tilingScheme)
    ? options.tilingScheme
    : new GeographicTilingScheme({ ellipsoid: options.ellipsoid });
  this._color = defaultValue(options.color, Color.YELLOW);
  this._colorInBytes = [
    Math.round(this._color.red * 255),
    Math.round(this._color.green * 255),
    Math.round(this._color.blue * 255),
    Math.round(this._color.alpha * 255),
  ];
  this._errorEvent = new Event();
  this._tileWidth = defaultValue(options.tileWidth, 256);
  this._tileHeight = defaultValue(options.tileHeight, 256);
  this._imageWidth = defaultValue(options.imageWidth, 256);
  this._imageHeight = defaultValue(options.imageHeight, 256);
  this._maskType = defaultValue(options.maskType, MaskType.NONE);
  this._readyPromise = Promise.resolve(true);

  /**
   * The default alpha blending value of this provider, with 0.0 representing fully transparent and
   * 1.0 representing fully opaque.
   *
   * @type {Number|undefined}
   * @default undefined
   */
  this.defaultAlpha = undefined;

  /**
   * The default alpha blending value on the night side of the globe of this provider, with 0.0 representing fully transparent and
   * 1.0 representing fully opaque.
   *
   * @type {Number|undefined}
   * @default undefined
   */
  this.defaultNightAlpha = undefined;

  /**
   * The default alpha blending value on the day side of the globe of this provider, with 0.0 representing fully transparent and
   * 1.0 representing fully opaque.
   *
   * @type {Number|undefined}
   * @default undefined
   */
  this.defaultDayAlpha = undefined;

  /**
   * The default brightness of this provider.  1.0 uses the unmodified imagery color.  Less than 1.0
   * makes the imagery darker while greater than 1.0 makes it brighter.
   *
   * @type {Number|undefined}
   * @default undefined
   */
  this.defaultBrightness = undefined;

  /**
   * The default contrast of this provider.  1.0 uses the unmodified imagery color.  Less than 1.0 reduces
   * the contrast while greater than 1.0 increases it.
   *
   * @type {Number|undefined}
   * @default undefined
   */
  this.defaultContrast = undefined;

  /**
   * The default hue of this provider in radians. 0.0 uses the unmodified imagery color.
   *
   * @type {Number|undefined}
   * @default undefined
   */
  this.defaultHue = undefined;

  /**
   * The default saturation of this provider. 1.0 uses the unmodified imagery color. Less than 1.0 reduces the
   * saturation while greater than 1.0 increases it.
   *
   * @type {Number|undefined}
   * @default undefined
   */
  this.defaultSaturation = undefined;

  /**
   * The default gamma correction to apply to this provider.  1.0 uses the unmodified imagery color.
   *
   * @type {Number|undefined}
   * @default undefined
   */
  this.defaultGamma = undefined;

  /**
   * The default texture minification filter to apply to this provider.
   *
   * @type {TextureMinificationFilter}
   * @default undefined
   */
  this.defaultMinificationFilter = undefined;

  /**
   * The default texture magnification filter to apply to this provider.
   *
   * @type {TextureMagnificationFilter}
   * @default undefined
   */
  this.defaultMagnificationFilter = undefined;
}

Object.defineProperties(PolygonImageryProvider.prototype, {
  /**
   * Gets the proxy used by this provider.
   * @memberof PolygonImageryProvider.prototype
   * @type {Proxy}
   * @readonly
   */
  proxy: {
    get: function () {
      return undefined;
    },
  },

  /**
   * Gets the width of each tile, in pixels. This function should
   * not be called before {@link PolygonImageryProvider#ready} returns true.
   * @memberof PolygonImageryProvider.prototype
   * @type {Number}
   * @readonly
   */
  tileWidth: {
    get: function () {
      return this._tileWidth;
    },
  },

  /**
   * Gets the height of each tile, in pixels.  This function should
   * not be called before {@link PolygonImageryProvider#ready} returns true.
   * @memberof PolygonImageryProvider.prototype
   * @type {Number}
   * @readonly
   */
  tileHeight: {
    get: function () {
      return this._tileHeight;
    },
  },

  /**
   * Gets the maximum level-of-detail that can be requested.  This function should
   * not be called before {@link PolygonImageryProvider#ready} returns true.
   * @memberof PolygonImageryProvider.prototype
   * @type {Number|undefined}
   * @readonly
   */
  maximumLevel: {
    get: function () {
      return undefined;
    },
  },

  /**
   * Gets the minimum level-of-detail that can be requested.  This function should
   * not be called before {@link PolygonImageryProvider#ready} returns true.
   * @memberof PolygonImageryProvider.prototype
   * @type {Number}
   * @readonly
   */
  minimumLevel: {
    get: function () {
      return undefined;
    },
  },

  /**
   * Gets the tiling scheme used by this provider.  This function should
   * not be called before {@link PolygonImageryProvider#ready} returns true.
   * @memberof PolygonImageryProvider.prototype
   * @type {TilingScheme}
   * @readonly
   */
  tilingScheme: {
    get: function () {
      return this._tilingScheme;
    },
  },

  /**
   * Gets the rectangle, in radians, of the imagery provided by this instance.  This function should
   * not be called before {@link PolygonImageryProvider#ready} returns true.
   * @memberof PolygonImageryProvider.prototype
   * @type {Rectangle}
   * @readonly
   */
  rectangle: {
    get: function () {
      return this._tilingScheme.rectangle;
    },
  },

  /**
   * Gets the tile discard policy.  If not undefined, the discard policy is responsible
   * for filtering out "missing" tiles via its shouldDiscardImage function.  If this function
   * returns undefined, no tiles are filtered.  This function should
   * not be called before {@link PolygonImageryProvider#ready} returns true.
   * @memberof PolygonImageryProvider.prototype
   * @type {TileDiscardPolicy}
   * @readonly
   */
  tileDiscardPolicy: {
    get: function () {
      return undefined;
    },
  },

  /**
   * Gets an event that is raised when the imagery provider encounters an asynchronous error.  By subscribing
   * to the event, you will be notified of the error and can potentially recover from it.  Event listeners
   * are passed an instance of {@link TileProviderError}.
   * @memberof PolygonImageryProvider.prototype
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
   * @memberof PolygonImageryProvider.prototype
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
   * @memberof PolygonImageryProvider.prototype
   * @type {Promise.<Boolean>}
   * @readonly
   */
  readyPromise: {
    get: function () {
      return this._readyPromise;
    },
  },

  /**
   * Gets the credit to display when this imagery provider is active.  Typically this is used to credit
   * the source of the imagery.  This function should not be called before {@link PolygonImageryProvider#ready} returns true.
   * @memberof PolygonImageryProvider.prototype
   * @type {Credit}
   * @readonly
   */
  credit: {
    get: function () {
      return undefined;
    },
  },

  /**
   * Gets a value indicating whether or not the images provided by this imagery provider
   * include an alpha channel.  If this property is false, an alpha channel, if present, will
   * be ignored.  If this property is true, any images without an alpha channel will be treated
   * as if their alpha is 1.0 everywhere.  Setting this property to false reduces memory usage
   * and texture upload time.
   * @memberof PolygonImageryProvider.prototype
   * @type {Boolean}
   * @readonly
   */
  hasAlphaChannel: {
    get: function () {
      return true;
    },
  },

  /**
   * @memberof PolygonImageryProvider.prototype
   * @type {PolygonHierarchy[]}
   * @readonly
   */
  originalHierarchies: {
    get: function () {
      return this._originalHierarchies;
    },
  },

  /**
   * @memberof PolygonImageryProvider.prototype
   * @type {Rectangle}
   * @readonly
   */
  boundingRectangle: {
    get: function () {
      return this._boundingRectangle;
    },
  },

  /**
   * @memberof PolygonImageryProvider.prototype
   * @type {MaskType}
   * @readonly
   */
  maskType: {
    get: function () {
      return this._maskType;
    },
  },
});

/**
 * Gets the credits to be displayed when a given tile is displayed.
 *
 * @param {Number[]} degreesArrayHeights
 * @param {PolygonImageryProvider.ConstructorOptions} options
 *
 * @returns {PolygonImageryProvider}
 *
 */
PolygonImageryProvider.fromDegreesArrayHeights = function (
  degreesArrayHeights,
  options
) {
  const hierarchies = buildHierarchiesFromDegreesArrayHeights(
    degreesArrayHeights
  );
  const mergeOptions = { hierarchies };
  Object.assign(mergeOptions, options);
  return new PolygonImageryProvider(mergeOptions);
};

/**
 * Gets the credits to be displayed when a given tile is displayed.
 *
 * @param {Number} x The tile X coordinate.
 * @param {Number} y The tile Y coordinate.
 * @param {Number} level The tile level;
 * @returns {Credit[]} The credits to be displayed when the tile is displayed.
 *
 * @exception {DeveloperError} <code>getTileCredits</code> must not be called before the imagery provider is ready.
 */
PolygonImageryProvider.prototype.getTileCredits = function (x, y, level) {
  return undefined;
};

/**
 * Gets the credits to be displayed when a given tile is displayed.
 *
 * @param {Number} r
 * @param {Number} g
 * @param {Number} b
 * @param {Number} a
 * @returns {Boolean}
 *
 */
function isEmpty(r, g, b, a) {
  return r === 0 && g === 0 && b === 0 && a === 0;
}

/**
 * Gets the credits to be displayed when a given tile is displayed.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {Number[]} colorInBytes
 *
 */
function resetColor(canvas, colorInBytes) {
  const context = canvas.getContext("2d");
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    if (!isEmpty(r, g, b, a)) {
      data[i] = colorInBytes[0];
      data[i + 1] = colorInBytes[1];
      data[i + 2] = colorInBytes[2];
      data[i + 3] = colorInBytes[3];
    }
  }
  context.putImageData(imageData, 0, 0);
}

const scratchIntersectionRectangle = new Rectangle();
/**
 * Requests the image for a given tile.  This function should
 * not be called before {@link PolygonImageryProvider#ready} returns true.
 *
 * @param {Number} x The tile X coordinate.
 * @param {Number} y The tile Y coordinate.
 * @param {Number} level The tile level.
 * @param {Request} [request] The request object. Intended for internal use only.
 * @returns {Promise.<HTMLCanvasElement>} The resolved image as a Canvas DOM object.
 */
PolygonImageryProvider.prototype.requestImage = function (
  x,
  y,
  level,
  request
) {
  const tileRectangle = this._tilingScheme.tileXYToRectangle(x, y, level);
  if (
    Rectangle.intersection(
      tileRectangle,
      this._boundingRectangle,
      scratchIntersectionRectangle
    )
  ) {
    const canvas = document.createElement("canvas");
    canvas.width = this._imageWidth;
    canvas.height = this._imageHeight;
    const context = canvas.getContext("2d");
    context.imageSmoothingEnabled = false;
    const cssColor = this._color.toCssColorString();
    context.fillStyle = cssColor;
    context.beginPath();
    drawPolygonHierarchies(
      context,
      this._hierarchies,
      tileRectangle,
      this._imageWidth,
      this._imageHeight,
      true
    );
    context.fill();
    if (MaskType.isOffsetMask(this._maskType)) {
      resetColor(canvas, this._colorInBytes);
    }
    return Promise.resolve(canvas);
  }
};

/**
 * Picking features is not currently supported by this imagery provider, so this function simply returns
 * undefined.
 *
 * @param {Number} x The tile X coordinate.
 * @param {Number} y The tile Y coordinate.
 * @param {Number} level The tile level.
 * @param {Number} longitude The longitude at which to pick features.
 * @param {Number} latitude  The latitude at which to pick features.
 * @return {undefined} Undefined since picking is not supported.
 */
PolygonImageryProvider.prototype.pickFeatures = function (
  x,
  y,
  level,
  longitude,
  latitude
) {
  return undefined;
};
export default PolygonImageryProvider;

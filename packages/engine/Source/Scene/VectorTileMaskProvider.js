import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import Event from "../Core/Event.js";
import Rectangle from "../Core/Rectangle.js";
import Resource from "../Core/Resource.js";
import ImageryProvider from "./ImageryProvider.js";

/**
 *
 * @alias VectorTileMaskProvider
 * @constructor
 *
 * @param {Object} options
 * @param {String} options.url
 * @param {String} options.styleId
 * @param {String} options.proxy
 * @param {String} options.epsg
 *
 */
function VectorTileMaskProvider(options) {
  if (!defined(options.url)) {
    throw new DeveloperError(`url is reqired!`);
  }

  if (!defined(options.styleId)) {
    throw new DeveloperError(`styleId is reqired!`);
  }

  this._url = options.url;
  this._styleId = options.styleId;
  this._proxy = options.proxy;
  this._epsg = defaultValue(options.epsg, 4326);
  this._maximumLevel = options.maximumLevel;
  if (defined(this._proxy) && !defined(this._maximumLevel)) {
    throw new DeveloperError(`maximumLevel is reqired!`);
  }
  this._errorEvent = new Event();
}

Object.defineProperties(VectorTileMaskProvider.prototype, {
  /**
   * @memberof VectorTileMaskProvider.prototype
   * @type {String}
   */
  url: {
    get: function () {
      return this._url;
    },
  },

  /**
   * @memberof VectorTileMaskProvider.prototype
   * @type {String}
   */
  styleId: {
    get: function () {
      return this._styleId;
    },
  },

  /**
   * @memberof VectorTileMaskProvider.prototype
   * @type {String}
   */
  proxy: {
    get: function () {
      return this._proxy;
    },
    set: function (value) {
      this._proxy = value;
    },
  },

  /**
   * @memberof VectorTileMaskProvider.prototype
   * @type {Number}
   */
  epsg: {
    get: function () {
      return this._epsg;
    },
  },

  /**
 
   * @memberof VectorTileMaskProvider.prototype
   * @type {Number|undefined}
   * @readonly
   */
  maximumLevel: {
    get: function () {
      return this._maximumLevel;
    },
  },

  errorEvent: {
    get: function () {
      return this._errorEvent;
    },
  },
});

/**
 * @param {Number} epsg
 *
 */
function getInitRadius(epsg) {
  switch (epsg) {
    case 4326:
      return Math.PI;
    case 3857:
      return Math.PI * 2;
    default:
      return Math.PI;
  }
}

const scratchRectangle = new Rectangle();
/**
 * @param {VectorTileMaskProvider} provider
 * @param {Number} west
 * @param {Number} south
 * @param {Number} east
 * @param {Number} north
 *
 */
function getLevel(provider, west, south, east, north) {
  const radius = getInitRadius(provider.epsg);
  const rectangle = Rectangle.fromDegrees(
    west,
    south,
    east,
    north,
    scratchRectangle
  );
  const width = Rectangle.computeWidth(rectangle);
  let level = 0;
  let loop = true;
  while (loop) {
    const currentWidth = radius / Math.pow(2, level);
    const nextWidth = radius / Math.pow(2, level + 1);
    if (width <= currentWidth && width >= nextWidth) {
      level = level + 1;
      loop = false;
      break;
    }
    level++;
  }
  return level;
}

/**
 * @param {VectorTileMaskProvider} provider
 *
 */
function getProxyUrlParam(provider) {
  return `${provider._url}?styleId=${provider._styleId}`;
}

/**
 * @param {VectorTileMaskProvider} provider
 * @param {Number} west
 * @param {Number} south
 * @param {Number} east
 * @param {Number} north
 * @param {Request} request
 *
 */
function buildImageResource(provider, west, south, east, north, request) {
  const bbox = `${west},${south},${east},${north}`;
  const options = {
    request: request,
  };
  const useProxy = defined(provider._proxy);
  if (useProxy) {
    options.url = provider._proxy;
    options.queryParameters = {
      epsg: provider._epsg,
      maxLevel: provider._maximumLevel,
      bbox: bbox,
      url: getProxyUrlParam(provider),
    };
  } else {
    options.url = provider._url;
    options.queryParameters = {
      styleId: provider._styleId,
      bbox: bbox,
      l: getLevel(provider, west, south, east, north),
    };
  }

  return new Resource(options);
}

/**
 * @param {Number} west
 * @param {Number} south
 * @param {Number} east
 * @param {Number} north
 * @param {Request} request
 *
 */
VectorTileMaskProvider.prototype.requestImage = function (
  west,
  south,
  east,
  north,
  request
) {
  return ImageryProvider.loadImage(
    this,
    buildImageResource(this, west, south, east, north, request)
  );
};

export default VectorTileMaskProvider;

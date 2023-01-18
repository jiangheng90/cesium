import BoundingRectangle from "../Core/BoundingRectangle.js";
import Cartesian3 from "../Core/Cartesian3.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import GeographicTilingScheme from "../Core/GeographicTilingScheme.js";
import Resource from "../Core/Resource.js";
import GWBillboardCollection from "./GWBillboardCollection.js";
import HeightReference from "./HeightReference.js";
import createGuid from "../Core/createGuid.js";
import Color from "../Core/Color.js";
import GWBillboardAnimationType from "./GWBillboardAnimationType.js";
import DeveloperError from "../Core/DeveloperError.js";

function Image3DAnnotationProvider(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  this._id = createGuid();
  this._show = true;
  this._tilingScheme = new GeographicTilingScheme();
  this._ratio = defaultValue(options.ratio, 1);

  this._minimumLevel = defaultValue(options.minimumLevel, 0);
  this._maximumLevel = options.maximumLevel;

  this._rectangle = defaultValue(
    options.rectangle,
    this._tilingScheme.rectangle
  );
  this._tileMatrixLabels = options.tileMatrixLabels;
  this._scene = options.viewer.scene;

  const tempUrl = options.ratio
    ? `${options.url}&ratio=${options.ratio}`
    : options.url;
  const resource = Resource.createIfNeeded(tempUrl);
  this._resource = resource;

  this._subdomains = options.subdomains;
  if (Array.isArray(this._subdomains)) {
    this._subdomains = this._subdomains.slice();
  } else if (defined(this._subdomains) && this._subdomains.length > 0) {
    this._subdomains = this._subdomains.split("");
  } else {
    this._subdomains = ["a", "b", "c"];
  }
  this._index = 0;
  this._clamped2TerrainLevel = defaultValue(options.clamped2TerrainLevel, 10);

  this._priority = defaultValue(options.priority, -1);

  this._scale = defaultValue(options.scale, 1);

  if (this._priority < -1) {
    throw new DeveloperError("priority must above zero");
  }
}

Object.defineProperties(Image3DAnnotationProvider.prototype, {
  /**
   * Gets the URL of the service hosting the imagery.
   * @memberof Image3DAnnotationProvider.prototype
   * @type {String}
   * @readonly
   */
  url: {
    get: function () {
      return this._resource.url;
    },
  },

  /**
   * Gets the maximum level-of-detail that can be requested.  This function should
   * not be called before {@link Image3DAnnotationProvider#ready} returns true.
   * @memberof Image3DAnnotationProvider.prototype
   * @type {Number}
   * @readonly
   */
  maximumLevel: {
    get: function () {
      return this._maximumLevel;
    },
  },

  /**
   * Gets the minimum level-of-detail that can be requested.  This function should
   * not be called before {@link Image3DAnnotationProvider#ready} returns true.
   * @memberof Image3DAnnotationProvider.prototype
   * @type {Number}
   * @readonly
   */
  minimumLevel: {
    get: function () {
      return this._minimumLevel;
    },
  },

  /**
   * Gets the tiling scheme used by this provider.  This function should
   * not be called before {@link Image3DAnnotationProvider#ready} returns true.
   * @memberof Image3DAnnotationProvider.prototype
   * @type {TilingScheme}
   * @readonly
   */
  tilingScheme: {
    get: function () {
      return this._tilingScheme;
    },
  },

  /**
   * Gets the rectangle, in radians, of the provided by this instance.  This function should
   * not be called before {@link Image3DAnnotationProvider#ready} returns true.
   * @memberof Image3DAnnotationProvider.prototype
   * @type {Rectangle}
   * @readonly
   */
  rectangle: {
    get: function () {
      return this._rectangle;
    },
  },

  /**
   * Gets a value indicating whether or not the provider is ready for use.
   * @memberof Image3DAnnotationProvider.prototype
   * @type {Boolean}
   * @readonly
   */
  ready: {
    value: true,
  },

  scale: {
    get: function () {
      return (window.devicePixelRatio * this._scale) / this.ratio;
    },
  },

  ratio: {
    get: function () {
      return this._ratio;
    },
  },

  /**
   * Gets a promise that resolves to true when the provider is ready for use.
   * @memberof Image3DAnnotationProvider.prototype
   * @type {Promise.<Boolean>}
   * @readonly
   */
  readyPromise: {
    get: function () {
      return this._readyPromise;
    },
  },

  show: {
    get: function () {
      return this._show;
    },

    set: function (newShow) {
      if (newShow !== this._show) {
        this._show = newShow;
        this.managerLayerVisible();
      }
    },
  },

  priority: {
    get: function () {
      return this._priority;
    },
    set: function (value) {
      this._priority = value;
    },
  },
});

function requestData(provider, col, row, level, request) {
  const labels = provider._tileMatrixLabels;
  const tileMatrix = defined(labels) ? labels[level] : level.toString();
  const subdomains = provider._subdomains;
  const templateValues = {
    TileMatrix: tileMatrix,
    TileRow: row.toString(),
    TileCol: col.toString(),
    s: subdomains[(col + row + level) % subdomains.length],
  };

  const resource = provider._resource.getDerivedResource({
    request: request,
  });
  resource.setTemplateValues(templateValues);
  return resource.fetchJson();
}

Image3DAnnotationProvider.prototype.requestData = function (
  x,
  y,
  level,
  request
) {
  let result;

  // Couldn't load from cache
  if (!defined(result)) {
    result = requestData(this, x, y, level, request);
  }

  return result;
};

Image3DAnnotationProvider.prototype.parseTileData = function (tile) {
  const that = this;
  that.tile = tile;
  const data = tile._data;

  if (!defined(data.content)) {
    return;
  }

  const len = data.content.length;
  if (len === 0) {
    return;
  }
  tile.collection = new GWBillboardCollection({
    scene: that._scene,
    provider: this,
  });
  tile.collection.show = that._show;
  tile.collection.justAdd = true;

  for (let i = 0; i < len; ++i) {
    const lon = Number(data.content[i]["location"]["x"]);
    const lat = Number(data.content[i]["location"]["y"]);
    const x1 = data.content[i]["offset"][0];
    const y1 = data.content[i]["offset"][1];
    const x2 = data.content[i]["offset"][2];
    const y2 = data.content[i]["offset"][3];

    const width = x2 - x1;
    const height = y2 - y1;

    const heightReference = HeightReference.CLAMP_TO_GROUND;

    let id = data.content[i]["id"];
    if (!defined(id)) {
      id = that._index;
      that._index++;
    }

    tile.collection.add({
      id: id,
      position: Cartesian3.fromDegrees(lon, lat),
      image: data.image,
      color: new Color(1, 1, 1, 1),
      alpha: 0,
      imageSubRegion: new BoundingRectangle(
        x1,
        data.height - y1 - height,
        width,
        height
      ),
      width: width * this.scale,
      height: height * this.scale,
      heightReference: heightReference,
      show: that._show,
      animation: GWBillboardAnimationType.HIDE,
    });
  }
};

export default Image3DAnnotationProvider;

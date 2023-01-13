import BoundingRectangle from "../Core/BoundingRectangle.js";
import Cartesian3 from "../Core/Cartesian3.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
// GeowayGlobe-ADD
import destroyObject from "../Core/destroyObject.js";
// GeowayGlobe-ADD
import GeographicTilingScheme from "../Core/GeographicTilingScheme.js";
import Resource from "../Core/Resource.js";
import GWBillboardCollection from "./GWBillboardCollection.js";
import HeightReference from "./HeightReference.js";
import createGuid from "../Core/createGuid.js";
import Color from "../Core/Color.js";

function animate(onUpdate, onStop, duration) {
  const start = Date.now();
  let animateId;
  duration = defaultValue(duration, 500);
  function loop() {
    const progress = Date.now() - start;
    onUpdate(progress / duration, animateId);
    if (progress <= duration + 1) {
      animateId = requestAnimationFrame(loop);
    } else {
      cancelAnimationFrame(animateId);
      if (onStop instanceof Function) {
        onStop();
      }
    }
  }

  animateId = requestAnimationFrame(loop);
}

function Image3DAnnotationProvider(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  this._id = createGuid();
  this._show = true;
  this._tilingScheme = new GeographicTilingScheme();
  this._ratio = options.ratio ? options.ratio : 1;

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

  this._collectionMap = {};
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
  const result = [];

  // if (defined(data.lables)) {
  //     var len = data.lables.length;
  if (defined(data.content)) {
    const len = data.content.length;
    if (len > 0) {
      tile.collection = new GWBillboardCollection({ scene: that._scene });
    }
    tile.collection.show = that._show;

    const collection_index = `${tile._x}-${tile._y}-${tile._level}`;
    this._collectionMap[collection_index] = tile.collection;

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

      let rowNum = 1;
      if (data.content[i]["rowNums"] > 1) {
        rowNum = 2;
      }

      let id = data.content[i]["id"];
      if (!defined(id)) {
        id = that._index;
        that._index++;
      }

      tile.collection.add({
        //tile._collection
        id: id,
        scale: 1 / that._ratio,
        position: Cartesian3.fromDegrees(lon, lat),
        image: data.image,
        color: new Color(1, 1, 1, 0),
        imageSubRegion: new BoundingRectangle(
          x1,
          data.height - y1 - height,
          width,
          height
        ),
        heightReference: heightReference,
        rowNum: rowNum,
        show: that._show,
      });
      animate(function (progress, animateId) {
        if (!defined(tile.collection)) {
          cancelAnimationFrame(animateId);
          return;
        }
        for (let i = 0; i < tile.collection._billboards.length; i++) {
          const entity = tile.collection._billboards[i];
          entity.color = new Color(1, 1, 1, progress <= 1 ? progress : 1);
        }
      });

      // if (data.content[i]["rowNums"] > 1) {
      //   const x1_line2 = data.content[i]["offset"][4];
      //   const y1_line2 = data.content[i]["offset"][5];
      //   const x2_line2 = data.content[i]["offset"][6];
      //   const y2_line2 = data.content[i]["offset"][7];

      //   const width_line2 = x2_line2 - x1_line2;
      //   const height_line2 = y2_line2 - y1_line2;
      //   id = data.content[i]["id"];
      //   if (!defined(id)) {
      //     id = that._index;
      //     that._index++;
      //   }
      //   tile.collection.add({
      //     //tile._collection
      //     id: id,
      //     scale: 1 / that._ratio,
      //     pixelOffset: new Cartesian2(0, height_line2 / 2 + 8),
      //     position: Cartesian3.fromDegrees(lon, lat),
      //     image: data.image,
      //     color: new Color(1, 1, 1, 0),
      //     imageSubRegion: new BoundingRectangle(
      //       x1_line2,
      //       data.height - y1_line2 - height_line2,
      //       width_line2,
      //       height_line2
      //     ),
      //     heightReference: heightReference,
      //     show: that._show,
      //   });
      // }
    }
  }

  return result;
};

Image3DAnnotationProvider.prototype.freeResources = function (_tileData) {
  if (defined(_tileData) && defined(_tileData.collection)) {
    _tileData.collection.destroy();
    _tileData.collection = null;
    if (this._collectionMap[`${this._x}-${this._y}-${this._level}`]) {
      delete this._collectionMap[`${this._x}-${this._y}-${this._level}`];
    }
    destroyObject(_tileData);
  }
};

Image3DAnnotationProvider.prototype.destroy = function () {};

Image3DAnnotationProvider.prototype.setVisible = function (visible) {
  this.show = visible;
};

Image3DAnnotationProvider.prototype.managerLayerVisible = function () {
  if (this._show) {
    this.setCollectionMapVisible(true);
  } else {
    this.setCollectionMapVisible(false);
  }
};

Image3DAnnotationProvider.prototype.setCollectionMapVisible = function (
  visible
) {
  const keys = Object.keys(this._collectionMap);
  for (let i = 0; i < keys.length; i++) {
    this.setCollectionVisible(this._collectionMap[keys[i]], visible);
  }
};

Image3DAnnotationProvider.prototype.setCollectionVisible = function (
  collection,
  visible
) {
  collection.show = visible;
  const len = collection._billboards.length;
  for (let i = 0; i < len; ++i) {
    const b = collection._billboards[i];
    b.show = visible;
  }
};

export default Image3DAnnotationProvider;

// GW-ADD
import JulianDate from "./JulianDate.js";
import Rectangle from "./Rectangle.js";
import TaskProcessor from "./TaskProcessor.js";
import defined from "../Core/defined.js";
import defaultValue from "./defaultValue.js";
import createGuid from "./createGuid.js";
import GeographicTilingScheme from "./GeographicTilingScheme.js";
import Ellipsoid from "./Ellipsoid.js";
import TerrainProvider from "./TerrainProvider.js";
import TileAvailability from "./TileAvailability.js";
import Resource from "./Resource.js";
import Event from "./Event.js";
import DeveloperError from "./DeveloperError.js";
import HeightmapTerrainData from "./HeightmapTerrainData.js";
import TileProviderError from "./TileProviderError.js";

const julianDateScratch = new JulianDate();
const rectangleScratch = new Rectangle();
const taskProcessor = new TaskProcessor("decodeGeowayTerrainPacket", 10);

function getTileCacheKey(x, y, level) {
  return JSON.stringify([x, y, level]);
}

function isTileAvailable(that, level, x, y) {
  let maxLevel;
  const tileRectangle = that._tilingScheme.tileXYToRectangle(
    x,
    y,
    level,
    rectangleScratch
  );
  that._connections.some(function (provider) {
    const insertRectangle = Rectangle.intersection(
      tileRectangle,
      provider.rectangle,
      rectangleScratch
    );
    if (defined(insertRectangle)) {
      maxLevel = provider.maxLevel;
      return true;
    }
    return null;
  });

  if (!defined(maxLevel)) {
    return false;
  }

  if (level > maxLevel) {
    return false;
  }

  return true;
}

function TerrainCache() {
  this._terrainCache = {};
  this._lastTidy = JulianDate.now();
}

TerrainCache.prototype.add = function (quadKey, buffer) {
  this._terrainCache[quadKey] = {
    buffer: buffer,
    timestamp: JulianDate.now(),
  };
};

TerrainCache.prototype.get = function (quadKey) {
  const terrainCache = this._terrainCache;
  const result = terrainCache[quadKey];
  if (defined(result)) {
    delete this._terrainCache[quadKey];
    return result.buffer;
  }
};

TerrainCache.prototype.tidy = function () {
  JulianDate.now(julianDateScratch);
  if (JulianDate.secondsDifference(julianDateScratch, this._lastTidy) > 10) {
    const terrainCache = this._terrainCache;
    const keys = Object.keys(terrainCache);
    const count = keys.length;
    for (let i = 0; i < count; ++i) {
      const k = keys[i];
      const e = terrainCache[k];
      if (JulianDate.secondsDifference(julianDateScratch, e.timestamp) > 10) {
        delete terrainCache[k];
      }
    }

    JulianDate.clone(julianDateScratch, this._lastTidy);
  }
};

function TiledTerrainProvider(options) {
  this.id = defaultValue(options.id, createGuid());
  this._connections = options.connections;
  this._tilingScheme = new GeographicTilingScheme({
    numberOfLevelZeroTilesX: 2,
    numberOfLevelZeroTilesY: 1,
    ellipsoid: Ellipsoid.WGS84,
  });
  this._width = defaultValue(options.tileCellNum, 33);
  this._height = defaultValue(options.tileCellNum, 33);
  this._levelZeroMaximumGeometricError = TerrainProvider.getEstimatedLevelZeroGeometricErrorForAHeightmap(
    this._tilingScheme.ellipsoid,
    65,
    this._tilingScheme.getNumberOfXTilesAtLevel(0)
  );

  this._connections.sort(function (m, n) {
    if (m.priority < n.priority) {
      return 1;
    } else if (m.priority > n.priority) {
      return -1;
    }
    return 0;
  });
  this._rectangle = this._connections[0].rectangle;
  if (defined(this._connections[0].minLevel)) {
    this._minLevel = this._connections[0].minLevel - 1;
  } else {
    this._minLevel = 0;
  }
  this._maxLevel = this._connections[0].maxLevel - 1;
  this._resource = undefined;
  this._tilesAvailable = new TileAvailability(this._tilingScheme, 14);
  this._tilesAvailable.addAvailableTileRange(
    0,
    0,
    0,
    this._tilingScheme.getNumberOfXTilesAtLevel(0),
    this._tilingScheme.getNumberOfYTilesAtLevel(0)
  );
  const rectangle = new Rectangle();
  const that = this;
  this._connections.forEach(function (provider) {
    provider.resource = Resource.createIfNeeded(provider.url);
    provider.minLevel -= 1;
    if (that._minLevel > provider.minLevel) {
      that._minLevel = provider.minLevel;
    }
    provider.maxLevel -= 1;
    if (that._maxLevel < provider.maxLevel) {
      that._maxLevel = provider.maxLevel;
    }
    Rectangle.expand(that._rectangle, provider.rectangle, rectangle);
    that._rectangle = rectangle;
  });
  this._ready = true;
  this._errorEvent = new Event();
  this._readyPromise = Promise.resolve(true);
  this._terrainCache = new TerrainCache();
}

Object.defineProperties(TiledTerrainProvider.prototype, {
  errorEvent: {
    get: function () {
      return this._errorEvent;
    },
  },

  credit: {
    get: function () {
      //>>includeStart('debug', pragmas.debug);
      if (!this.ready) {
        throw new DeveloperError(
          "credit must not be called before ready returns true."
        );
      }
      //>>includeEnd('debug');
      return this._credit;
    },
  },

  tilingScheme: {
    get: function () {
      //>>includeStart('debug', pragmas.debug);
      if (!this.ready) {
        throw new DeveloperError(
          "tilingScheme must not be called before ready returns true."
        );
      }
      //>>includeEnd('debug');
      return this._tilingScheme;
    },
  },

  ready: {
    get: function () {
      return this._ready;
    },
  },

  readyPromise: {
    get: function () {
      return this._readyPromise;
    },
  },

  hasWaterMask: {
    get: function () {
      return false;
    },
  },

  hasVertexNormals: {
    get: function () {
      return false;
    },
  },

  availability: {
    get: function () {
      return this._tilesAvailable;
    },
  },
});

TiledTerrainProvider.prototype.getLevelMaximumGeometricError = function (
  level
) {
  //>>includeStart('debug', pragmas.debug);
  if (!this.ready) {
    throw new DeveloperError(
      "getLevelMaximumGeometricError must not be called before ready returns true."
    );
  }
  //>>includeEnd('debug');

  return this._levelZeroMaximumGeometricError / (1 << level);
};

TiledTerrainProvider.prototype.requestTileGeometry = function (
  x,
  y,
  level,
  request
) {
  if (!this._ready) {
    throw new DeveloperError(
      "requestTileGeometry must not be called before the terrain provider is ready."
    );
  }

  if (level < this._minLevel) {
    return new HeightmapTerrainData({
      buffer: new Float32Array(33 * 33),
      width: 33,
      height: 33,
    });
  }

  let hasData = true;
  let minLevel;
  const tileRectangle = this._tilingScheme.tileXYToRectangle(
    x,
    y,
    level,
    rectangleScratch
  );
  let insertRectangle;
  const that = this;
  let labels;
  this._connections.some(function (provider) {
    insertRectangle = Rectangle.intersection(
      tileRectangle,
      provider.rectangle,
      rectangleScratch
    );
    if (defined(insertRectangle)) {
      labels = provider.tileMatrixLabels;
      that._resource = provider.resource;
      minLevel = provider.minLevel;
      hasData = true;
      return true;
    }
    hasData = false;
    return null;
  });

  if (defined(minLevel) && level < minLevel) {
    hasData = false;
  }

  if (!hasData) {
    return new HeightmapTerrainData({
      buffer: new Float32Array(33 * 33),
      width: 33,
      height: 33,
    });
  }

  const tileMatrix = defined(labels) ? labels[level] : level.toString();

  const templateValues = {
    TileMatrix: tileMatrix,
    TileRow: y.toString(),
    TileCol: x.toString(),
  };

  this._resource.setTemplateValues(templateValues);

  const tileResource = this._resource.getDerivedResource({
    request: request,
  });

  const terrainCache = this._terrainCache;
  const quadKey = getTileCacheKey(x, y, level);
  const buffer = terrainCache.get(quadKey);
  let promise, decodePromise, taskPromise;
  if (defined(buffer)) {
    decodePromise = taskProcessor.scheduleTask(
      {
        buffer: buffer,
        width: that._width,
        level: tileMatrix,
        x: x.toString(),
        y: y.toString(),
      },
      [buffer]
    );
  } else {
    promise = tileResource.fetchArrayBuffer();
    if (!defined(promise)) {
      return undefined;
    }

    decodePromise = promise.then(function (buffer) {
      if (defined(buffer)) {
        taskPromise = taskProcessor.scheduleTask(
          {
            buffer: buffer,
            width: that._width,
            level: tileMatrix,
            x: x.toString(),
            y: y.toString(),
          },
          [buffer]
        );

        if (!defined(taskPromise)) {
          terrainCache.add(quadKey, buffer);
          return undefined;
        }
        return taskPromise;
      }
    });
  }

  terrainCache.tidy();

  if (!defined(decodePromise)) {
    return undefined;
  }

  return decodePromise
    .then(function (result) {
      if (result.buffer && isNaN(result.buffer[0])) {
        console.error(
          `地形切片有错误，位置为：level="${result.level}, x=${result.x}, y=${result.y}`
        );
        return new HeightmapTerrainData({
          buffer: new Float32Array(that._width * that._width),
          width: that._width,
          height: that._width,
        });
      }
      return new HeightmapTerrainData({
        buffer: result.buffer,
        width: that._width,
        height: that._width,
      });
    })
    .catch(function (error) {
      const message = `An error occurred while accessing ${that._resource.url}.`;
      TileProviderError.handleError(undefined, that, that._errorEvent, message);
      return Promise.reject(error);
    });
};

TiledTerrainProvider.prototype.getTileDataAvailable = function (x, y, level) {
  const result = isTileAvailable(this, level, x, y);
  if (defined(result)) {
    return result;
  }

  return undefined;
};

TiledTerrainProvider.prototype.loadTileDataAvailability = function () {
  return undefined;
};

export default TiledTerrainProvider;

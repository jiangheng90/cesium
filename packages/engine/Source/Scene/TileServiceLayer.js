import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import Rectangle from "../Core/Rectangle.js";
import Request from "../Core/Request.js";
import RequestState from "../Core/RequestState.js";
import RequestType from "../Core/RequestType.js";
import TileData from "./TileData.js";
import TileState from "./TileState.js";

/**
 * An ordered collection of tileservice layers.
 *
 * @alias TileServiceLayer
 * @constructor
 *
 */
function TileServiceLayer(tileDataProvider, options) {
  this._tileDataProvider = tileDataProvider;
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  this._id = tileDataProvider ? tileDataProvider.id : undefined;
  this.show = defaultValue(options.show, true);
  this._show = true;

  this._minimumLevel = this._tileDataProvider.minimumLevel;
  this._maximumLevel = this._tileDataProvider.maximumLevel;

  this._rectangle = this._tileDataProvider.rectangle;

  this._dataCache = {};
}

Object.defineProperties(TileServiceLayer.prototype, {
  id: {
    get: function () {
      return this._tileDataProvider ? this._tileDataProvider.id : undefined;
    },
  },

  tileDataProvider: {
    get: function () {
      return this._tileDataProvider;
    },
  },

  rectangle: {
    get: function () {
      return this._rectangle;
    },
  },
});

function getTileCacheKey(x, y, level) {
  return JSON.stringify([x, y, level]);
}

TileServiceLayer.prototype.getTileFromCache = function (
  x,
  y,
  level,
  rectangle
) {
  const cacheKey = getTileCacheKey(x, y, level);
  let data = this._dataCache[cacheKey];

  if (!defined(data)) {
    data = new TileData(this, x, y, level, rectangle);
    this._dataCache[cacheKey] = data;
  }

  data.addReference();
  return data;
};

TileServiceLayer.prototype.removeTileFromCache = function (tileData) {
  const cacheKey = getTileCacheKey(tileData._x, tileData._y, tileData._level);
  delete this._dataCache[cacheKey];
};

const tileBoundsScratch = new Rectangle();
TileServiceLayer.prototype.createTileSkeletons = function (
  tile,
  terrainProvider,
  insertionPoint
) {
  if (defined(this._minimumLevel) && tile.level < this._minimumLevel) {
    return false;
  }
  if (defined(this._maximumLevel) && tile.level > this._maximumLevel) {
    return false;
  }

  const rectangle = Rectangle.intersection(
    tile.rectangle,
    this._rectangle,
    tileBoundsScratch
  );
  if (!defined(rectangle)) {
    return false;
  }

  // var latitudeClosestToEquator = 0.0;
  // if (rectangle.south > 0.0) {
  //     latitudeClosestToEquator = rectangle.south;
  // } else if (rectangle.north < 0.0) {
  //     latitudeClosestToEquator = rectangle.north;
  // }
  //
  // // Compute the required level in the imagery tiling scheme.
  // // The errorRatio should really be imagerySSE / terrainSSE rather than this hard-coded value.
  // // But first we need configurable imagery SSE and we need the rendering to be able to handle more
  // // images attached to a terrain tile than there are available texture units.  So that's for the future.
  // var errorRatio = 1.0;
  // var targetGeometricError = errorRatio * terrainProvider.getLevelMaximumGeometricError(tile.level);
  // var imageryLevel = getLevelWithMaximumTexelSpacing(this, targetGeometricError, latitudeClosestToEquator);
  // imageryLevel = Math.max(0, imageryLevel);
  // var maximumLevel = this._tileDataProvider.maximumLevel;
  // if (imageryLevel > maximumLevel) {
  //     imageryLevel = maximumLevel;
  // }
  //
  // var tileDataTilingScheme = this._tileDataProvider.tilingScheme;
  // var northwestTileCoordinates = tileDataTilingScheme.positionToTileXY(Rectangle.northwest(rectangle), imageryLevel);
  // var southeastTileCoordinates = tileDataTilingScheme.positionToTileXY(Rectangle.southeast(rectangle), imageryLevel);
  //
  // // If the southeast corner of the rectangle lies very close to the north or west side
  // // of the southeast tile, we don't actually need the southernmost or easternmost
  // // tiles.
  // // Similarly, if the northwest corner of the rectangle lies very close to the south or east side
  // // of the northwest tile, we don't actually need the northernmost or westernmost tiles.
  //
  // // We define "very close" as being within 1/512 of the width of the tile.
  // var veryCloseX = tile.rectangle.width / 512.0;
  // var veryCloseY = tile.rectangle.height / 512.0;
  //
  // var northwestTileRectangle = tileDataTilingScheme.tileXYToRectangle(northwestTileCoordinates.x, northwestTileCoordinates.y, imageryLevel);
  // if (Math.abs(northwestTileRectangle.south - tile.rectangle.north) < veryCloseY && northwestTileCoordinates.y < southeastTileCoordinates.y) {
  //     ++northwestTileCoordinates.y;
  // }
  // if (Math.abs(northwestTileRectangle.east - tile.rectangle.west) < veryCloseX && northwestTileCoordinates.x < southeastTileCoordinates.x) {
  //     ++northwestTileCoordinates.x;
  // }
  //
  // var southeastTileRectangle = tileDataTilingScheme.tileXYToRectangle(southeastTileCoordinates.x, southeastTileCoordinates.y, imageryLevel);
  // if (Math.abs(southeastTileRectangle.north - tile.rectangle.south) < veryCloseY && southeastTileCoordinates.y > northwestTileCoordinates.y) {
  //     --southeastTileCoordinates.y;
  // }
  // if (Math.abs(southeastTileRectangle.west - tile.rectangle.east) < veryCloseX && southeastTileCoordinates.x > northwestTileCoordinates.x) {
  //     --southeastTileCoordinates.x;
  // }
  //
  // // var terrainRectangle = Rectangle.clone(tile.rectangle, terrainRectangleScratch);
  // var tileDataRectangle = tileDataTilingScheme.tileXYToRectangle(northwestTileCoordinates.x, northwestTileCoordinates.y, imageryLevel);
  // var clippedImageryRectangle = Rectangle.intersection(tileDataRectangle, rectangle, clippedRectangleScratch);
  //
  // var tileDataXYToRectangle;
  // var useWebMercatorT = this._tileDataProvider.tilingScheme.projection instanceof WebMercatorProjection &&
  //                       tile.rectangle.north < WebMercatorProjection.MaximumLatitude &&
  //                       tile.rectangle.south > -WebMercatorProjection.MaximumLatitude;
  // // if (useWebMercatorT) {
  // //     tileDataTilingScheme.rectangleToNativeRectangle(terrainRectangle, terrainRectangle);
  // //     tileDataTilingScheme.rectangleToNativeRectangle(imageryRectangle, imageryRectangle);
  // //     tileDataTilingScheme.rectangleToNativeRectangle(clippedImageryRectangle, clippedImageryRectangle);
  // //     tileDataTilingScheme.rectangleToNativeRectangle(imageryBounds, imageryBounds);
  // //     tileDataXYToRectangle = tileDataTilingScheme.tileXYToNativeRectangle.bind(tileDataTilingScheme);
  // //     veryCloseX = terrainRectangle.width / 512.0;
  // //     veryCloseY = terrainRectangle.height / 512.0;
  // // } else {
  // //     tileDataXYToRectangle = tileDataTilingScheme.tileXYToRectangle.bind(tileDataTilingScheme);
  // // }
  // tileDataXYToRectangle = tileDataTilingScheme.tileXYToRectangle.bind(tileDataTilingScheme);
  //
  // for ( var i = northwestTileCoordinates.x; i <= southeastTileCoordinates.x; i++) {
  //     tileDataRectangle = tileDataXYToRectangle(i, northwestTileCoordinates.y, imageryLevel);
  //     clippedImageryRectangle = Rectangle.simpleIntersection(tileDataRectangle, rectangle, clippedRectangleScratch);
  //
  //     if (!defined(clippedImageryRectangle)) {
  //         continue;
  //     }
  //
  //     for ( var j = northwestTileCoordinates.y; j <= southeastTileCoordinates.y; j++) {
  //         tileDataRectangle = tileDataXYToRectangle(i, j, imageryLevel);
  //         clippedImageryRectangle = Rectangle.simpleIntersection(tileDataRectangle, rectangle, clippedRectangleScratch);
  //
  //         if (!defined(clippedImageryRectangle)) {
  //             continue;
  //         }
  //
  //         var surfaceTile = tile.data;
  //         var tiledata = this.getTileFromCache(i, j, imageryLevel,clippedImageryRectangle);
  //         if (!defined(insertionPoint)) {
  //             insertionPoint = surfaceTile.tileServiceDatas.length;
  //         }
  //
  //         surfaceTile.tileServiceDatas.splice(insertionPoint, 0, tiledata);
  //         insertionPoint++;
  //     }
  // }

  const surfaceTile = tile.data;
  const tiledata = this.getTileFromCache(
    tile.x,
    tile.y,
    tile.level,
    tile.rectangle
  );
  if (!defined(insertionPoint)) {
    insertionPoint = surfaceTile.tileServiceDatas.length;
  }

  surfaceTile.tileServiceDatas.splice(insertionPoint, 0, tiledata);

  return true;
};

TileServiceLayer.prototype.requestTileData = function (tiledata) {
  const tileDataProvider = this._tileDataProvider;

  const that = this;

  function success(data) {
    if (!defined(data)) {
      return failure();
    }
    tiledata._data = data;
    tiledata._request = undefined;
    TileServiceLayer.handleSuccess(that._requestImageError);
  }

  function failure(e) {
    if (
      tiledata &&
      tiledata._request &&
      tiledata._request.state === RequestState.CANCELLED
    ) {
      // Cancelled due to low priority - try again later.
      tiledata._state = TileState.START;
      tiledata._request = undefined;
      return;
    }

    // Initially assume failure.  handleError may retry, in which case the state will
    // change to TRANSITIONING.
    if (tiledata && tiledata._state && tiledata._request) {
      tiledata._state = TileState.READY;
      tiledata._request = undefined;
    }

    // var message =
    //   "Failed to obtain tile X: " +
    //   tiledata._x +
    //   " Y: " +
    //   tiledata._y +
    //   " Level: " +
    //   tiledata._level +
    //   ".";
    // that._requestImageError = TileServiceLayer.handleError(
    //   that._requestImageError,
    //   tileDataProvider,
    //   tileDataProvider.errorEvent,
    //   message,
    //   tiledata._x,
    //   tiledata._y,
    //   tiledata._level,
    //   doRequest,
    //   e
    // );
  }

  function doRequest() {
    const request = new Request({
      throttle: false,
      throttleByServer: true,
      type: RequestType.OTHER,
    });
    tiledata._request = request;
    tiledata._state = TileState.LOADING;
    const promise = tileDataProvider.requestData(
      tiledata._x,
      tiledata._y,
      tiledata._level,
      request
    );

    if (!defined(promise)) {
      // Too many parallel requests, so postpone loading tile.
      tiledata._state = TileState.START;
      tiledata.request = undefined;
      return;
    }

    Promise.resolve(promise).then(success).catch(failure);
  }

  if (
    tiledata._level < this._minimumLevel ||
    tiledata._level > this._maximumLevel
  ) {
    return;
  }

  doRequest();
};

TileServiceLayer.prototype.isDestroyed = function () {
  return false;
};

TileServiceLayer.prototype.destroy = function () {
  return destroyObject(this);
};

export default TileServiceLayer;

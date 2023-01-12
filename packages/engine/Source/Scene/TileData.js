import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import Rectangle from "../Core/Rectangle.js";
import TileState from "./TileState.js";

function TileData(layer, x, y, level, rectangle) {
  this._layer = layer;
  this._x = x;
  this._y = y;
  this._level = level;
  this._request = undefined;
  this._data = undefined;

  this._state = TileState.START;
  this._referenceCount = 0;
  this._groundprimitive = undefined;

  if (!defined(rectangle) && layer.tileDataProvider.ready) {
    const tilingScheme = layer.tileDataProvider.tilingScheme;
    rectangle = tilingScheme.tileXYToRectangle(x, y, level);
  }

  this._rectangle = Rectangle.clone(rectangle);

  if (level !== 0) {
    const parentX = (x / 2) | 0;
    const parentY = (y / 2) | 0;
    const parentLevel = level - 1;
    this._parent = this._layer.getTileFromCache(parentX, parentY, parentLevel);
  }

  this._entityidList = [];
}

TileData.prototype.addReference = function () {
  ++this._referenceCount;
};

TileData.prototype.processStateMachine = function (tile, frameState) {
  if (this._state === TileState.START) {
    this._layer.requestTileData(this);
  } else if (this._state === TileState.LOADING && defined(this._data)) {
    this._entityidList = this._layer.tileDataProvider.parseTileData(
      this,
      frameState
    );
    // this.parseTileData(this._data);
    this._state = TileState.READY;
    return true;
  } else if (this._state === TileState.READY) {
    return true;
  }
  return false;
};

// TileData.prototype.parseTileData = function(data) {
//     if (defined(data['POI']) && defined(data['POI']['features'])) {
//         var features = data['POI']['features'];
//         var len = features.length;
//         if (len > 0) {
//             for (var i = 0; i < len; ++i) {
//                 var lonIndex = Number(features[i][2][0]);
//                 var latIndex = Number(features[i][2][1]);
//
//                 var lon = CesiumMath.toDegrees(this._rectangle.west + this._rectangle.width / this._layer.tileDataProvider.tileWidth * lonIndex);
//                 var lat = CesiumMath.toDegrees(this._rectangle.north - this._rectangle.width / this._layer.tileDataProvider.tileHeight * latIndex);
//
//                 this._entities.push({
//                     position : Cartesian3.fromDegrees(lon, lat),
//                     label : {
//                         text : defaultValue(features[i][1][2], ''),
//                         distanceDisplayCondition:new DistanceDisplayCondition(this._near,this._far),
//                         font : '15px 华文宋体',
//                         style:LabelStyle.FILL_AND_OUTLINE,
//                         outlineWidth:2
//                     }
//                 });
//             }
//         }
//     }
// };

TileData.prototype.freeResources = function (frameState) {
  --this._referenceCount;

  if (this._referenceCount === 0) {
    if (defined(this._parent)) {
      this._parent.freeResources(frameState);
    }
    this._layer.removeTileFromCache(this);
    this._layer.tileDataProvider.freeResources(this);
    this._entityidList = [];
    destroyObject(this);
  }
};

// TileData.prototype.addDrawCommandForTile = function(frameState) {
//     // this._layer.tileDataProvider.addTileData(this._entities);
// };

// TileData.prototype.update = function() {
//     this._layer.tileDataProvider.setTileDataVisibel(this);
// };

export default TileData;

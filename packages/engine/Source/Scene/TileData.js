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
}

TileData.prototype.addReference = function () {
  ++this._referenceCount;
};

TileData.prototype.processStateMachine = function (tile, frameState) {
  if (this._state === TileState.START) {
    this._layer.requestTileData(this);
  } else if (this._state === TileState.LOADING && defined(this._data)) {
    this._layer.tileDataProvider.parseTileData(this, frameState);
    this._state = TileState.READY;
    return true;
  } else if (this._state === TileState.READY) {
    return true;
  }
  return false;
};

TileData.prototype.freeResources = function (frameState) {
  --this._referenceCount;

  if (this._referenceCount === 0) {
    if (defined(this._parent)) {
      this._parent.freeResources(frameState);
    }
    this._layer.removeTileFromCache(this);
    // this._layer.tileDataProvider.freeResources(this);
    if (this.collection) {
      this.collection.destroy();
    }
    destroyObject(this);
  }
};

export default TileData;

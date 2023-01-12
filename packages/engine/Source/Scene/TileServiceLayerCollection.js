import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import DeveloperError from "../Core/DeveloperError.js";
import Event from "../Core/Event.js";
import CesiumMath from "../Core/Math.js";
import TileServiceLayer from "./TileServiceLayer.js";

/**
 * An ordered collection of tileservice layers.
 *
 * @alias TileServiceLayerCollection
 * @constructor
 *
 */
function TileServiceLayerCollection() {
  this._layers = [];

  /**
   * An event that is raised when a layer is added to the collection.  Event handlers are passed the layer that
   * was added and the index at which it was added.
   * @type {Event}
   * @default Event()
   */
  this.layerAdded = new Event();

  /**
   * An event that is raised when a layer is removed from the collection.  Event handlers are passed the layer that
   * was removed and the index from which it was removed.
   * @type {Event}
   * @default Event()
   */
  this.layerRemoved = new Event();

  /**
   * An event that is raised when a layer changes position in the collection.  Event handlers are passed the layer that
   * was moved, its new index after the move, and its old index prior to the move.
   * @type {Event}
   * @default Event()
   */
  this.layerMoved = new Event();

  /**
   * An event that is raised when a layer is shown or hidden by setting the
   * {@link TileServiceLayer#show} property.  Event handlers are passed a reference to this layer,
   * the index of the layer in the collection, and a flag that is true if the layer is now
   * shown or false if it is now hidden.
   *
   * @type {Event}
   * @default Event()
   */
  this.layerShownOrHidden = new Event();
}

Object.defineProperties(TileServiceLayerCollection.prototype, {
  /**
   * Gets the number of layers in this collection.
   * @memberof TileServiceCollection.prototype
   * @type {Number}
   */
  length: {
    get: function () {
      return this._layers.length;
    },
  },
});

/**
 * Adds a layer to the collection.
 *
 * @param {TileServiceLayer} layer the layer to add.
 * @param {Number} [index] the index to add the layer at.  If omitted, the layer will
 *                         added on top of all existing layers.
 *
 * @exception {DeveloperError} index, if supplied, must be greater than or equal to zero and less than or equal to the number of the layers.
 */
TileServiceLayerCollection.prototype.add = function (layer, index) {
  const hasIndex = defined(index);

  //>>includeStart('debug', pragmas.debug);
  if (!defined(layer)) {
    throw new DeveloperError("layer is required.");
  }
  if (hasIndex) {
    if (index < 0) {
      throw new DeveloperError("index must be greater than or equal to zero.");
    } else if (index > this._layers.length) {
      throw new DeveloperError(
        "index must be less than or equal to the number of layers."
      );
    }
  }
  //>>includeEnd('debug');

  if (!hasIndex) {
    index = this._layers.length;
    this._layers.push(layer);
  } else {
    this._layers.splice(index, 0, layer);
  }

  this._update();
  this.layerAdded.raiseEvent(layer, index);
};

/**
 * Creates a new layer using the given tileServiceProvider and adds it to the collection.
 *
 * @param {any} any the tileService provider to create a new layer for.
 * @param {Number} [index] the index to add the layer at.  If omitted, the layer will
 *                         added on top of all existing layers.
 * @returns {TileServiceLayer} The newly created layer.
 */
TileServiceLayerCollection.prototype.addTileServiceProvider = function (
  tileServiceProvider,
  index
) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(tileServiceProvider)) {
    throw new DeveloperError("tileServiceProvider is required.");
  }
  //>>includeEnd('debug');

  const layer = new TileServiceLayer(tileServiceProvider);
  this.add(layer, index);
  return layer;
};

/**
 * Removes a layer from this collection, if present.
 *
 * @param {TileServiceLayer} layer The layer to remove.
 * @param {Boolean} [destroy=true] whether to destroy the layers in addition to removing them.
 * @returns {Boolean} true if the layer was in the collection and was removed,
 *                    false if the layer was not in the collection.
 */
TileServiceLayerCollection.prototype.remove = function (layer, destroy) {
  destroy = defaultValue(destroy, true);

  const index = this._layers.indexOf(layer);
  if (index !== -1) {
    this._layers.splice(index, 1);

    this._update();

    this.layerRemoved.raiseEvent(layer, index);

    if (destroy) {
      layer.destroy();
    }

    return true;
  }

  return false;
};

/**
 * Removes all layers from this collection.
 *
 * @param {Boolean} [destroy=true] whether to destroy the layers in addition to removing them.
 */
TileServiceLayerCollection.prototype.removeAll = function (destroy) {
  destroy = defaultValue(destroy, true);

  const layers = this._layers;
  for (let i = 0, len = layers.length; i < len; i++) {
    const layer = layers[i];
    this.layerRemoved.raiseEvent(layer, i);

    if (destroy) {
      layer.destroy();
    }
  }

  this._layers = [];
};

/**
 * Checks to see if the collection contains a given layer.
 *
 * @param {TileServiceLayer} layer the layer to check for.
 *
 * @returns {Boolean} true if the collection contains the layer, false otherwise.
 */
TileServiceLayerCollection.prototype.contains = function (layer) {
  return this.indexOf(layer) !== -1;
};

/**
 * Determines the index of a given layer in the collection.
 *
 * @param {TileServiceLayer} layer The layer to find the index of.
 *
 * @returns {Number} The index of the layer in the collection, or -1 if the layer does not exist in the collection.
 */
TileServiceLayerCollection.prototype.indexOf = function (layer) {
  return this._layers.indexOf(layer);
};

/**
 * Gets a layer by index from the collection.
 *
 * @param {Number} index the index to retrieve.
 *
 * @returns {TileServiceLayer} The tileService layer at the given index.
 */
TileServiceLayerCollection.prototype.get = function (index) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(index)) {
    throw new DeveloperError("index is required.", "index");
  }
  //>>includeEnd('debug');

  return this._layers[index];
};

function getLayerIndex(layers, layer) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(layer)) {
    throw new DeveloperError("layer is required.");
  }
  //>>includeEnd('debug');

  const index = layers.indexOf(layer);

  //>>includeStart('debug', pragmas.debug);
  if (index === -1) {
    throw new DeveloperError("layer is not in this collection.");
  }
  //>>includeEnd('debug');

  return index;
}

function swapLayers(collection, i, j) {
  const arr = collection._layers;
  i = CesiumMath.clamp(i, 0, arr.length - 1);
  j = CesiumMath.clamp(j, 0, arr.length - 1);

  if (i === j) {
    return;
  }

  const temp = arr[i];
  arr[i] = arr[j];
  arr[j] = temp;

  collection._update();

  collection.layerMoved.raiseEvent(temp, j, i);
}

/**
 * Raises a layer up one position in the collection.
 *
 * @param {TileServiceLayer} layer the layer to move.
 *
 * @exception {DeveloperError} layer is not in this collection.
 * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
 */
TileServiceLayerCollection.prototype.raise = function (layer) {
  const index = getLayerIndex(this._layers, layer);
  swapLayers(this, index, index + 1);
};

/**
 * Lowers a layer down one position in the collection.
 *
 * @param {TileServiceLayer} layer the layer to move.
 *
 * @exception {DeveloperError} layer is not in this collection.
 * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
 */
TileServiceLayerCollection.prototype.lower = function (layer) {
  const index = getLayerIndex(this._layers, layer);
  swapLayers(this, index, index - 1);
};

/**
 * Raises a layer to the top of the collection.
 *
 * @param {TileServiceLayer} layer the layer to move.
 *
 * @exception {DeveloperError} layer is not in this collection.
 * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
 */
TileServiceLayerCollection.prototype.raiseToTop = function (layer) {
  const index = getLayerIndex(this._layers, layer);
  if (index === this._layers.length - 1) {
    return;
  }
  this._layers.splice(index, 1);
  this._layers.push(layer);

  this._update();

  this.layerMoved.raiseEvent(layer, this._layers.length - 1, index);
};

/**
 * Lowers a layer to the bottom of the collection.
 *
 * @param {TileServiceLayer} layer the layer to move.
 *
 * @exception {DeveloperError} layer is not in this collection.
 * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
 */
TileServiceLayerCollection.prototype.lowerToBottom = function (layer) {
  const index = getLayerIndex(this._layers, layer);
  if (index === 0) {
    return;
  }
  this._layers.splice(index, 1);
  this._layers.splice(0, 0, layer);

  this._update();

  this.layerMoved.raiseEvent(layer, 0, index);
};

/**
 * Updates frame state to execute any queued texture re-projections.
 *
 * @private
 *
 * @param {FrameState} frameState The frameState.
 */
TileServiceLayerCollection.prototype.queueReprojectionCommands = function (
  frameState
) {
  const layers = this._layers;
  for (let i = 0, len = layers.length; i < len; ++i) {
    layers[i].queueReprojectionCommands(frameState);
  }
};

/**
 * Cancels re-projection commands queued for the next frame.
 *
 * @private
 */
TileServiceLayerCollection.prototype.cancelReprojections = function () {
  const layers = this._layers;
  for (let i = 0, len = layers.length; i < len; ++i) {
    layers[i].cancelReprojections();
  }
};

/**
 * Returns true if this object was destroyed; otherwise, false.
 * <br /><br />
 * If this object was destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
 *
 * @returns {Boolean} true if this object was destroyed; otherwise, false.
 *
 * @see TileServiceLayerCollection#destroy
 */
TileServiceLayerCollection.prototype.isDestroyed = function () {
  return false;
};

/**
 * Destroys the WebGL resources held by all layers in this collection.  Explicitly destroying this
 * object allows for deterministic release of WebGL resources, instead of relying on the garbage
 * collector.
 * <br /><br />
 * Once this object is destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
 * assign the return value (<code>undefined</code>) to the object as done in the example.
 *
 * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
 *
 *
 * @example
 * layerCollection = layerCollection && layerCollection.destroy();
 *
 * @see TileServiceLayerCollection#isDestroyed
 */
TileServiceLayerCollection.prototype.destroy = function () {
  this.removeAll(true);
  return destroyObject(this);
};

TileServiceLayerCollection.prototype._update = function () {
  let isBaseLayer = true;
  const layers = this._layers;
  let layersShownOrHidden;
  let layer;
  let i, len;
  for (i = 0, len = layers.length; i < len; ++i) {
    layer = layers[i];

    layer._layerIndex = i;

    if (layer.show) {
      layer._isBaseLayer = isBaseLayer;
      isBaseLayer = false;
    } else {
      layer._isBaseLayer = false;
    }

    if (layer.show !== layer._show) {
      if (defined(layer._show)) {
        if (!defined(layersShownOrHidden)) {
          layersShownOrHidden = [];
        }
        layersShownOrHidden.push(layer);
      }
      layer._show = layer.show;
    }
  }
  if (defined(layersShownOrHidden)) {
    for (i = 0, len = layersShownOrHidden.length; i < len; ++i) {
      layer = layersShownOrHidden[i];
      this.layerShownOrHidden.raiseEvent(layer, layer._layerIndex, layer.show);
    }
  }
};

export default TileServiceLayerCollection;

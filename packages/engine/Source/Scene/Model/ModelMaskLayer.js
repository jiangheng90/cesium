import defaultValue from "../../Core/defaultValue.js";
import defined from "../../Core/defined.js";
import ModelMaskProviderError from "../../Core/ModelMaskProviderError.js";
import PixelFormat from "../../Core/PixelFormat.js";
import Sampler from "../../Renderer/Sampler.js";
import Texture from "../../Renderer/Texture.js";
import ImageryLayer from "../ImageryLayer.js";

/**
 * @alias ModelMaskLayer
 * @constructor
 *
 * @param {VectorTileMaskProvider} maskProvider
 */
function ModelMaskLayer(context, maskProvider, options) {
  this._provider = maskProvider;
  this._context = context;

  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  /**
   * @type {TextureMinificationFilter}
   * @default {@link ImageryLayer.DEFAULT_MINIFICATION_FILTER}
   */
  this.minificationFilter = defaultValue(
    options.minificationFilter,
    maskProvider
      ? maskProvider.defaultMinificationFilter
      : ImageryLayer.DEFAULT_MINIFICATION_FILTER
  );

  /**
   * @type {TextureMagnificationFilter}
   * @default {@link ImageryLayer.DEFAULT_MAGNIFICATION_FILTER}
   */
  this.magnificationFilter = defaultValue(
    options.magnificationFilter,
    maskProvider
      ? maskProvider.defaultMagnificationFilter
      : ImageryLayer.DEFAULT_MAGNIFICATION_FILTER
  );

  this.texture = this._context.defaultEmptyTexture;
}

Object.defineProperties(ModelMaskLayer.prototype, {
  /**
   * Gets the imagery provider for this layer.
   * @memberof ModelMaskLayer.prototype
   * @type {ModelMaskLayer}
   * @readonly
   */
  provider: {
    get: function () {
      return this._provider;
    },
  },

  /**
   * Gets the rectangle of this layer.  If this rectangle is smaller than the rectangle of the
   * {@link ModelMaskLayer}, only a portion of the imagery provider is shown.
   * @memberof ModelMaskLayer.prototype
   * @type {Rectangle}
   * @readonly
   */
  rectangle: {
    get: function () {
      return this._rectangle;
    },
  },
});

ModelMaskLayer.prototype._requestImagery = function (
  west,
  south,
  east,
  north,
  request
) {
  const provider = this._provider;

  const that = this;

  function failure(e) {
    const message = `Failed to obtain mask tile west: ${west} south: ${south} east: ${east} north: ${north}.`;
    that._requestImageError = ModelMaskProviderError.reportError(
      that._requestImageError,
      provider,
      provider.errorEvent,
      message,
      west,
      south,
      east,
      north,
      e
    );
    // if (that._requestImageError.retry) {
    //   doRequest();
    // }
  }

  function doRequest() {
    // console.log()
    const maskPromise = provider.requestImage(
      west,
      south,
      east,
      north,
      request
    );

    if (!defined(maskPromise)) {
      return;
    }

    maskPromise
      .then(function (image) {
        that.texture = that._createTextureWebGL(image);
      })
      .catch(function (e) {
        failure(e);
      });
  }

  doRequest();
};

ModelMaskLayer.prototype._createTextureWebGL = function (image) {
  const context = this._context;
  const sampler = new Sampler({
    minificationFilter: this.minificationFilter,
    magnificationFilter: this.magnificationFilter,
  });

  if (defined(image.internalFormat)) {
    return new Texture({
      context: context,
      pixelFormat: image.internalFormat,
      width: image.width,
      height: image.height,
      source: {
        arrayBufferView: image.bufferView,
      },
      sampler: sampler,
    });
  }
  return new Texture({
    context: context,
    source: image,
    pixelFormat: PixelFormat.RGBA,
    sampler: sampler,
  });
};

export default ModelMaskLayer;

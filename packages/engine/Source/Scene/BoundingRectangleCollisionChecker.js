import RBush from "rbush";

/**
 * Wrapper around rbush for use with BoundingRectangle types.
 * @private
 */
function BoundingRectangleCollisionChecker() {
  this._tree = new RBush();
}

function RectangleWithId() {
  this.minX = 0.0;
  this.minY = 0.0;
  this.maxX = 0.0;
  this.maxY = 0.0;
  this.id = "";
}

RectangleWithId.fromRectangleAndId = function (id, rectangle, result) {
  result.minX = rectangle.x;
  result.minY = rectangle.y;
  result.maxX = rectangle.x + rectangle.width;
  result.maxY = rectangle.y + rectangle.height;
  result.id = id;
  return result;
};

/**
 * Insert a rectangle into the collision checker.
 *
 * @param {String} id Unique string ID for the rectangle being inserted.
 * @param {BoundingRectangle} rectangle A BoundingRectangle
 * @private
 */
BoundingRectangleCollisionChecker.prototype.insert = function (id, rectangle) {

  const withId = RectangleWithId.fromRectangleAndId(
    id,
    rectangle,
    new RectangleWithId()
  );
  this._tree.insert(withId);
};

function idCompare(a, b) {
  return a.id === b.id;
}

const removalScratch = new RectangleWithId();
/**
 * Remove a rectangle from the collision checker.
 *
 * @param {String} id Unique string ID for the rectangle being removed.
 * @param {BoundingRectangle} rectangle A BoundingRectangle
 * @private
 */
BoundingRectangleCollisionChecker.prototype.remove = function (id, rectangle) {
  const withId = RectangleWithId.fromRectangleAndId(
    id,
    rectangle,
    removalScratch
  );
  this._tree.remove(withId, idCompare);
};

const collisionScratch = new RectangleWithId();
/**
 * Checks if a given rectangle collides with any of the rectangles in the collection.
 *
 * @param {BoundingRectangle} rectangle A BoundingRectangle that should be checked against the rectangles in the collision checker.
 * @returns {Boolean} Whether the rectangle collides with any of the rectangles in the collision checker.
 */
BoundingRectangleCollisionChecker.prototype.collides = function (rectangle) {

  const withId = RectangleWithId.fromRectangleAndId(
    "",
    rectangle,
    collisionScratch
  );
  return this._tree.collides(withId);
};

BoundingRectangleCollisionChecker.prototype.clear = function () {
  this._tree.clear();
};

export default BoundingRectangleCollisionChecker;

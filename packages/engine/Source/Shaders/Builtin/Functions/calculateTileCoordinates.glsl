vec2 czm_calculateTileCoordinates(vec3 positionMC, vec3 modelCenter, vec3 halfAxes) {
    return vec2((positionMC.x - modelCenter.x + halfAxes.x) / (2. * halfAxes.x), (positionMC.y - modelCenter.y + halfAxes.y) / (2. * halfAxes.y));
}
vec2 getDefaultTextureSize(sampler2D texture, int level) {
    return vec2(1024);
}

vec2 czm_getTextureSize(sampler2D texture, int level) {
    vec2 result = getDefaultTextureSize(texture, level);
    result.x = float(int(textureSize(texture, level).x)) / 2.;
    result.y = float(int(textureSize(texture, level).y)) / 2.;
    return result;
}
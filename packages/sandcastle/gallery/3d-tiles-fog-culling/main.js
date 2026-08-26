import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

const viewer = new Cesium.Viewer("cesiumContainer", {
  timeline: false,
  animation: false,
  sceneModePicker: false,
  baseLayerPicker: false,
  geocoder: Cesium.IonGeocodeProviderType.GOOGLE,
  // The globe does not need to be displayed,
  // since the Photorealistic 3D Tiles include terrain
  globe: false,
});

// Enable rendering the sky
viewer.scene.skyAtmosphere.show = true;

// Add Photorealistic 3D Tiles
let tileset;
try {
  tileset = await Cesium.createGooglePhotorealistic3DTileset({
    // Only the Google Geocoder can be used with Google Photorealistic 3D Tiles.  Set the `geocode` property of the viewer constructor options to IonGeocodeProviderType.GOOGLE.
    onlyUsingWithGoogleGeocoder: true,
  });
  viewer.scene.primitives.add(tileset);
} catch (error) {
  console.log(`Error loading Photorealistic 3D Tiles tileset.
          ${error}`);
}

// Toggle fog-based far-distance culling on the tileset at runtime, to
// compare against the default (frustum-only) culling. The camera is placed
// on the Indian plains south of the Himalayas, looking north at the range:
// at low altitude the fog density table culls tiles beyond a few hundred
// kilometers, which removes distant high terrain that is still visible.
if (Cesium.defined(tileset)) {
  Sandcastle.addToggleButton("Fog culling", false, function (checked) {
    tileset.fogCulling = checked;
  });
}

// Point the camera from the Indian plains toward the Himalayas
viewer.scene.camera.setView({
  destination: Cesium.Cartesian3.fromDegrees(86.9, 26.2, 1000.0),
  orientation: {
    heading: Cesium.Math.toRadians(0.0),
    pitch: Cesium.Math.toRadians(0.0),
    roll: 0.0,
  },
});

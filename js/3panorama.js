// Generated by CoffeeScript 1.12.7

/*
 * A panorama viewer base on three.js.
 * Panarama is a type of image which can be watched in 360 degree horizonally and 180 degree vertically.
 *
 * @license Apache 2.0
 * @author MixFlow
 * @date 2017-08
 */

(function() {
  window.threePanorama = function(settings) {
    var animate, bindMouseTouchControl, camera, container, debugSettings, defaultSettings, init, initRenderer, key, lat, lon, mesh, onWindowResize, ref, renderer, scene, update, updateCamera, val;
    defaultSettings = {
      container: document.body,
      image: void 0,
      fov: 65,
      enableDragNewImage: true,
      mouseSensitivity: 0.1,
      lonlat: [0, 0],
      sphere: {
        radius: 500
      },
      debug: {
        imageLoadProgress: false,
        lonlat: false
      }
    };
    settings = settings || {};
    for (key in defaultSettings) {
      val = defaultSettings[key];
      if (!(key in settings)) {
        settings[key] = val;
      }
    }
    if (settings.image == null) {
      throw {
        type: "No image provided.",
        msg: "Please fill panorama image path(string) in the parameter 'image' of settings"
      };
    }
    if (typeof settings.container === "string") {
      container = document.querySelectorAll(setting.container);
    } else {
      container = settings.container;
    }
    lon = settings.lonlat[0];
    lat = settings.lonlat[1];

    /*
     * Initiate the three.js components.
     * Steps:
     *   create a sphere and put panorama on faces inside
     *   create a camera, put it on origin which is also the center of sphere
     *   bind some control:
     *       1. mouse or touch or device orient to control the rotation of camera.
     *   render the scene
     */
    init = function() {
      var camera, geometry, material, mesh, renderer, scene, texture;
      camera = new THREE.PerspectiveCamera(settings.fov, window.innerWidth / window.innerHeight, 1, 1100);
      camera.target = new THREE.Vector3(0, 0, 0);
      geometry = new THREE.SphereBufferGeometry(settings.sphere.radius, 50, 50);
      geometry.scale(-1, 1, 1);
      texture = new THREE.TextureLoader().load(settings.image);
      material = new THREE.MeshBasicMaterial({
        map: texture
      });
      mesh = new THREE.Mesh(geometry, material);
      scene = new THREE.Scene();
      scene.add(mesh);
      renderer = initRenderer();
      container.appendChild(renderer.domElement);
      bindMouseTouchControl(renderer.domElement);
      return {
        camera: camera,
        mesh: mesh,
        scene: scene,
        renderer: renderer
      };
    };
    initRenderer = function() {
      var renderer;
      renderer = new THREE.WebGLRenderer();
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setSize(window.innerWidth, window.innerHeight);
      return renderer;
    };
    bindMouseTouchControl = function(target) {
      var controlEnd, controlMoveHelper, controlStartHelper, controlStartLat, controlStartLon, controlStartX, controlStartY, isUserControling, mouseDownHandle, mouseMoveHandle, mouseUpHandle, touchEndHandle, touchMoveHandle, touchStartHandle;
      controlStartX = 0;
      controlStartY = 0;
      controlStartLon = 0;
      controlStartLat = 0;
      isUserControling = false;
      controlStartHelper = function(isTouch) {
        return function(event) {
          event.preventDefault();
          isUserControling = true;
          controlStartX = !isTouch ? event.clientX : event.changedTouches[0].clientX;
          controlStartY = !isTouch ? event.clientY : event.changedTouches[0].clientY;
          controlStartLon = lon;
          return controlStartLat = lat;
        };
      };
      controlMoveHelper = function(isTouch) {
        return function(event) {
          var sensitivity, x, y;
          if (isUserControling === true) {
            x = !isTouch ? event.clientX : event.changedTouches[0].clientX;
            y = !isTouch ? event.clientY : event.changedTouches[0].clientY;
            sensitivity = settings.mouseSensitivity;
            lon = (controlStartX - x) * sensitivity + controlStartLon;
            lat = (y - controlStartY) * sensitivity + controlStartLat;
            if (settings.debug.lonlat) {
              return console.log("longitude: ", lon, "latitude: ", lat);
            }
          }
        };
      };
      controlEnd = function(event) {
        return isUserControling = false;
      };
      mouseDownHandle = controlStartHelper(false);
      mouseMoveHandle = controlMoveHelper(false);
      mouseUpHandle = controlEnd;
      target.addEventListener('mousedown', mouseDownHandle, false);
      target.addEventListener('mousemove', mouseMoveHandle, false);
      target.addEventListener('mouseup', mouseUpHandle, false);
      touchStartHandle = controlStartHelper(true);
      touchMoveHandle = controlMoveHelper(true);
      touchEndHandle = controlEnd;
      target.addEventListener("touchstart", touchStartHandle, false);
      target.addEventListener("touchmove", touchMoveHandle, false);
      return target.addEventListener("touchend", touchEndHandle, false);
    };
    onWindowResize = function(event) {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      return renderer.setSize(window.innerWidth, window.innerHeight);
    };
    ref = init(), camera = ref.camera, mesh = ref.mesh, scene = ref.scene, renderer = ref.renderer;
    animate = function() {
      requestAnimationFrame(animate);
      update();
    };
    update = function() {
      updateCamera();
      return renderer.render(scene, camera);
    };
    updateCamera = function() {
      var phi, radius, theta, x, y, z;
      lat = Math.max(-85, Math.min(85, lat));
      phi = THREE.Math.degToRad(90 - lat);
      theta = THREE.Math.degToRad(lon);
      radius = settings.sphere.radius;
      x = radius * Math.sin(phi) * Math.cos(theta);
      y = radius * Math.cos(phi);
      z = radius * Math.sin(phi) * Math.sin(theta);
      return camera.lookAt(new THREE.Vector3(x, y, z));
    };
    animate();
    debugSettings = settings.debug;
    return {
      container: container,
      camera: camera,
      mesh: mesh,
      scene: scene,
      renderer: renderer,
      debugSettings: debugSettings
    };
  };

}).call(this);

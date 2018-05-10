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
  var slice = [].slice;

  window.threePanorama = function(settings) {
    var animate, bindDeviceOrientation, bindMouseTouchControl, camera, changeFullscreenState, container, debugSettings, defaultSettings, getFullscreenElement, getFullscreenElementHelper, getViewerSize, height, init, initControls, initRenderer, key, lat, lon, mesh, onWindowResize, records, ref, renderer, requestAndExitFullscreenHelper, scene, toggleTargetFullscreen, update, updateCamera, util, val, width;
    defaultSettings = {
      container: document.body,
      image: void 0,
      fov: 65,
      canUseWindowSize: false,

      /*
          If width or height is missing(0), use this alternate ratio to calculate the missing size.
          If you want set specific ratio, please set your container size(width / height = ratio) and `canUseWindowSize` is false
       */
      alternateRatio: 16 / 9,

      /*
          recommend to set `true`, if you don't set container width and height.
          Prevent the size of the container and renderer growing when window resizes(fire `onWindowResize` event).
          Record width and height data, next time the container width is some record again, use the correlative height.
       */
      canKeepInitalSize: true,
      enableDragNewImage: true,
      mouseSensitivity: 0.1,
      enableDeviceOrientation: true,
      lonlat: [0, 0],
      sphere: {
        radius: 500
      },
      debug: {
        imageLoadProgress: false,
        lonlat: false,
        cameraSize: false
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
      container = document.querySelectorAll(settings.container)[0];
    } else {
      container = settings.container;
    }
    lon = settings.lonlat[0];
    lat = settings.lonlat[1];
    width = 0;
    height = 0;
    records = {};
    getViewerSize = function(canKeepInitalSize) {
      var rect;
      if (canKeepInitalSize == null) {
        canKeepInitalSize = settings.canKeepInitalSize;
      }
      if (!settings.canUseWindowSize) {
        rect = container.getBoundingClientRect();
        width = rect.width;
        height = rect.height;
      } else {
        width = window.innerWidth;
        height = window.innerHeight;
      }
      if (!width && !height) {
        throw {
          type: "Lack of Viewer Size.",
          msg: "Viewer width and height are both missing(value is 0), Please check the container size(width and height > 0). Or use window size to set Viewer size by setting `canUseWindowSize` as `true`"
        };
      } else if (!height) {
        height = width / settings.alternateRatio;
      } else if (!width) {
        width = height * settings.alternateRatio;
      }
      if (canKeepInitalSize === true) {
        if (!(width in records)) {
          records[width] = height;
        } else {
          height = records[width];
        }
      }
      if (settings.debug.cameraSize) {
        console.log("current camera size:", width, height);
      }
      return {
        width: width,
        height: height
      };
    };
    getViewerSize();
    util = (function() {
      var handler, wrapperGenerator;
      handler = {
        addClass: function(domel, clazz) {
          return domel.className += " " + clazz;
        },
        removeClass: function(domel, clazz) {
          return domel.className = domel.className.replace(new RegExp('(\\s|^)' + clazz + '(\\s|$)'), '');
        },
        getAttribute: function(domel, attr) {
          return domel.getAttribute(attr);
        },
        setAttributes: function(domel, options) {
          var results;
          results = [];
          for (key in options) {
            val = options[key];
            results.push(domel.setAttribute(key, val));
          }
          return results;
        },
        css: function(domel, options) {
          var property, results, value;
          results = [];
          for (property in options) {
            value = options[property];
            results.push(domel.style[property] = value);
          }
          return results;
        },
        on: function(domel, event, callback, useCapture) {
          var evt, evts, i, len, results;
          if (useCapture == null) {
            useCapture = false;
          }
          evts = event.split(" ");
          results = [];
          for (i = 0, len = evts.length; i < len; i++) {
            evt = evts[i];
            results.push(domel.addEventListener(evt, callback, useCapture));
          }
          return results;
        },
        off: function(domel, eventsString, callback, useCapture) {
          var evt, evts, i, len, results;
          if (useCapture == null) {
            useCapture = false;
          }
          evts = eventsString.split(" ");
          results = [];
          for (i = 0, len = evts.length; i < len; i++) {
            evt = evts[i];
            results.push(domel.removeEventListener(evt, callback, useCapture));
          }
          return results;
        }
      };
      wrapperGenerator = function(wrapper) {
        var fn, method, methodHelper;
        methodHelper = function(fn) {
          return function() {
            var args;
            args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
            fn.apply(null, [wrapper.domel].concat(slice.call(args)));
            return wrapper;
          };
        };
        for (method in handler) {
          fn = handler[method];
          wrapper[method] = methodHelper(fn);
        }
        return wrapper;
      };
      return function(el) {
        var wrapper;
        if (el != null) {
          wrapper = {
            domel: el
          };
          return wrapperGenerator(wrapper);
        } else {
          return handler;
        }
      };
    })();

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
      camera = new THREE.PerspectiveCamera(settings.fov, width / height, 1, 1100);
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
      initControls(container);
      util(window).on("resize", (function() {
        var resizeTimer;
        resizeTimer = void 0;
        return function(event) {
          clearTimeout(resizeTimer);
          return resizeTimer = setTimeout(function() {
            return onWindowResize(event, false);
          }, 100);
        };
      })(), false);
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
      renderer.setSize(width, height);
      return renderer;
    };
    bindMouseTouchControl = function(target) {
      var controlEnd, controlMoveHelper, controlStartHelper, controlStartLat, controlStartLon, controlStartX, controlStartY, isUserControling, mouseDownHandle, mouseMoveHandle, mouseUpHandle, targetUtil, touchEndHandle, touchMoveHandle, touchStartHandle;
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
      targetUtil = util(target);
      targetUtil.on('mousedown', mouseDownHandle, false).on('mousemove', mouseMoveHandle, false).on('mouseup', mouseUpHandle, false);
      touchStartHandle = controlStartHelper(true);
      touchMoveHandle = controlMoveHelper(true);
      touchEndHandle = controlEnd;
      return targetUtil.on("touchstart", touchStartHandle, false).on("touchmove", touchMoveHandle, false).on("touchend", touchEndHandle, false);
    };
    getFullscreenElementHelper = function(container) {
      if (container == null) {
        container = document;
      }
      return function() {
        return container.fullscreenElement || container.webkitFullscreenElement || container.mozFullScreenElement || container.msFullscreenElement;
      };
    };
    getFullscreenElement = getFullscreenElementHelper();
    requestAndExitFullscreenHelper = function() {

      /*
          The helper function to create the `exitFullscreen` and `requestFullscreen`
          callback function.
          There is no need for checking different broswer methods when
          the fullscreen is toggled every time.
       */
      var exitFn, requestFn;
      if (document.exitFullscreen) {

        /*
            `exitFn = document.exitFullscreen` not work
            alternate way: `exitFn = document.exitFullscreen.bind(document)`  (es5)
         */
        exitFn = function() {
          return document.exitFullscreen();
        };
        requestFn = function(target) {
          return target.requestFullscreen();
        };
      } else if (document.msExitFullscreen) {
        exitFn = function() {
          return document.msExitFullscreen();
        };
        requestFn = function(target) {
          return target.msRequestFullscreen();
        };
      } else if (document.mozCancelFullScreen) {
        exitFn = function() {
          return document.mozCancelFullScreen();
        };
        requestFn = function(target) {
          return target.mozRequestFullscreen();
        };
      } else if (document.webkitExitFullscreen) {
        exitFn = function() {
          return document.webkitExitFullscreen();
        };
        requestFn = function(target) {
          return target.webkitRequestFullscreen();
        };
      } else {
        exitFn = function() {
          return console.log("The bowser doesn't support fullscreen mode");
        };
        requestFn = exitFn;
      }
      return {
        request: requestFn,
        exit: exitFn
      };
    };
    toggleTargetFullscreen = (function() {
      var exit, ref, request;
      ref = requestAndExitFullscreenHelper(), request = ref.request, exit = ref.exit;
      return function(target) {

        /*
            If no fullscreen element, the `target` enters fullscree.
            Otherwise fullscreen element exit fullscreen.
            Both trigge the `fullscreenchange` event.
         */
        if (getFullscreenElement()) {
          return exit();
        } else {
          return request(target);
        }
      };
    })();
    changeFullscreenState = function(target) {

      /*
          the actual behavior when fullscreen state is changed.
       */
      var clazz, fullscreenElement, targetUtil;
      fullscreenElement = getFullscreenElement();
      clazz = "fullscreen-mode";
      targetUtil = util(target);
      if ((fullscreenElement != null)) {
        targetUtil.addClass(clazz);
        target.style.width = "100vw";
        target.style.height = "100vh";
        target.style["max-width"] = "unset";
        return target.style["max-height"] = "unset";
      } else {
        targetUtil.removeClass(clazz);
        target.style.width = null;
        target.style.height = null;
        target.style["max-width"] = null;
        return target.style["max-height"] = null;
      }
    };
    initControls = function(container) {
      var _, controls, fullscreen, fullscreenUtil, iconStyle, ref, settingPanel;
      controls = document.createElement("div");
      controls.className = "3panorama-controls";
      controls.style.position = "absolute";
      controls.style.bottom = 0;
      controls.style.width = "100%";
      controls.style.height = "3.5em";
      controls.style["min-height"] = "32px";
      iconStyle = {
        height: '75%',
        'min-height': '24px',
        padding: '0.3em'
      };
      fullscreen = document.createElement("img");
      fullscreenUtil = util(fullscreen);
      fullscreen.src = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMjAgMzIwIiB3aWR0aD0iMjQiIGhlaWdodD0iMjQiPiAgPHBhdGggZmlsbD0iIzVhOWNmYyIgZD0iTTEyNSAxODAuODVsLTEwNSAxMDVWMjAzLjRIMFYzMjBoMTE2LjZ2LTIwSDM0LjE0bDEwNS4wMS0xMDV6TTIwMy40IDB2MjBoODIuNDZMMTgwLjg1IDEyNWwxNC4xNCAxNC4xNUwzMDAgMzQuMTR2ODIuNDZoMjBWMHoiLz4gIDxwYXRoIGZpbGw9IiNGRkYiIGQ9Ik0yMCAzNC4xNGwxMDUgMTA1IDE0LjE1LTE0LjEzTDM0LjE1IDIwaDgyLjQ1VjBIMHYxMTYuNmgyMHpNMzAwIDI4NS44NkwxOTUgMTgwLjg1bC0xNC4xNSAxNC4xNEwyODUuODYgMzAwSDIwMy40djIwSDMyMFYyMDMuNGgtMjB6Ii8+PC9zdmc+";
      fullscreenUtil.css(iconStyle);
      fullscreenUtil.on("click", function() {
        return toggleTargetFullscreen(container);
      }, false);
      util(document).on("webkitfullscreenchange mozfullscreenchange fullscreenchange msfullscreenchange", function() {
        return changeFullscreenState(container);
      });
      controls.appendChild(fullscreen);
      ref = (function() {
        var panelUtil, setting, settingPanel, settingUtil;
        settingPanel = document.createElement('div');
        panelUtil = util(settingPanel);
        panelUtil.addClass('3panorama-setting-pannel');
        panelUtil.css({
          'visibility': 'hidden',
          display: 'inline',
          position: 'relative',
          background: '#FFF',
          bottom: '100%',
          left: '-24px',
          padding: '0.4em 0.8em'
        });
        setting = document.createElement("img");
        setting.src = "data:image/svg+xml;base64,PHN2ZyBiYXNlUHJvZmlsZT0iZnVsbCIgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+ICA8cGF0aCBkPSJNNDAgODQuNThsNCAxMy4wNGgxMmw0LTEzLjA0YTMwIDMwIDAgMCAwIDE0Ljk1LTguNjNsMTMuMyAzLjA2IDYtMTAuNC05LjMtOS45OGEzMCAzMCAwIDAgMCAwLTE3LjI2bDkuMy05Ljk5LTYtMTAuMzktMTMuMyAzLjA2QTMwIDMwIDAgMCAwIDYwIDE1LjQyTDU2IDIuMzhINDRsLTQgMTMuMDRhMzAgMzAgMCAwIDAtMTQuOTUgOC42M2wtMTMuMy0zLjA2LTYgMTAuNCA5LjMgOS45OGEzMCAzMCAwIDAgMCAwIDE3LjI2bC05LjMgOS45OSA2IDEwLjM5IDEzLjMtMy4wNkEzMCAzMCAwIDAgMCA0MCA4NC41OHpNMzUgNTBhMTUgMTUgMCAxIDEgMzAgMCAxNSAxNSAwIDEgMS0zMCAwIiBmaWxsPSIjZmZmIiBzdHJva2U9IiM1YTljZmMiIHN0cm9rZS13aWR0aD0iNSIvPjwvc3ZnPg==";
        settingUtil = util(setting);
        settingUtil.css(iconStyle);
        settingUtil.on("click", (function() {
          var after, now;
          now = 'hidden';
          after = 'visible';
          return function() {
            var ref;
            panelUtil.css({
              'visibility': after
            });
            return ref = [after, now], now = ref[0], after = ref[1], ref;
          };
        })(), false);
        controls.appendChild(setting);
        controls.appendChild(settingPanel);
        return {
          setting: setting,
          settingPanel: settingPanel
        };
      })(), _ = ref._, settingPanel = ref.settingPanel;
      (function() {
        var off_tag, on_tag, status, switchor, switchorUtil;
        switchor = document.createElement("div");
        switchorUtil = util(switchor);
        switchor.innerText = "Enable Sensor: ";
        switchorUtil.css({
          'display': 'inline',
          'color': "#000",
          'font-size': "1em",
          'font-weight': 'bold'
        });
        status = document.createElement("span");
        util(status).css({
          'font-weight': 'normal'
        });
        on_tag = 'ON';
        off_tag = 'OFF';
        status.innerText = settings.enableDeviceOrientation ? on_tag : off_tag;
        switchor.appendChild(status);
        switchorUtil.on('click', function() {
          settings.enableDeviceOrientation = !settings.enableDeviceOrientation;
          if (settings.enableDeviceOrientation) {
            return status.innerText = on_tag;
          } else {
            return status.innerText = off_tag;
          }
        }, false);
        settingPanel.appendChild(switchor);
        return switchor;
      })();
      return container.appendChild(controls);
    };
    bindDeviceOrientation = function() {
      var eventHandler;
      eventHandler = (function() {

        /*
         * https://developer.mozilla.org/en-US/docs/Web/API/Detecting_device_orientation
         * the event values:
         * alpha: value represents the motion of the device around the z axis, represented in degrees with values ranging from 0 to 360.
         * beta: value represents the motion of the device around the x axis, represented in degrees with values ranging from -180 to 180. This represents a front to back motion of the device.
         * gamma: value represents the motion of the device around the y axis, represented in degrees with values ranging from -90 to 90. This represents a left to right motion of the device.
         */
        var alphaBefore, betaBefore;
        alphaBefore = void 0;
        betaBefore = void 0;
        return function(event) {

          /*
              real event handler function. apply device orientation changed to lon and lat.
           */
          var alpha, alphaDelta, beta, betaDelta;
          if (settings.enableDeviceOrientation) {
            alpha = event.alpha;
            beta = event.beta;
            if (alphaBefore != null) {

              /*
              alphaDelta(Δalpha) and betaDelta(Δbeta) are the changes of the orientation
              which longitude and latitude (lon lat) are applied.
               */
              alphaDelta = alpha - alphaBefore;
              betaDelta = beta - betaBefore;
              lon = lon + alphaDelta;
              lat = lat + betaDelta;
            }
            alphaBefore = alpha;
            return betaBefore = beta;
          } else {
            alphaBefore = void 0;
            return betaBefore = void 0;
          }
        };
      })();
      return util().on(window, "deviceorientation", eventHandler, true);
    };
    bindDeviceOrientation();
    onWindowResize = function(event, doesKeepInitSize) {
      if (doesKeepInitSize == null) {
        doesKeepInitSize = true;
      }
      getViewerSize(doesKeepInitSize);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      return renderer.setSize(width, height);
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
      debugSettings: debugSettings,
      util: util
    };
  };

}).call(this);

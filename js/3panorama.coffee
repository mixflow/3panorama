###
# A panorama viewer base on three.js.
# Panarama is a type of image which can be watched in 360 degree horizonally and 180 degree vertically.
#
# @license Apache 2.0
# @author MixFlow
# @date 2017-08
###

window.threePanorama = (settings) ->

    defaultSettings =
        container: document.body
        image: undefined
        fov: 65  # camera fov(field of view)
        canUseWindowSize: false # If set false(defalut), Camera ratio and render size (Viewer size) are base on container size(fill). If set true, use window innerWidth and innerHeight.
        ###
            If width or height is missing(0), use this alternate ratio to calculate the missing size.
            If you want set specific ratio, please set your container size(width / height = ratio) and `canUseWindowSize` is false
        ###
        alternateRatio: 16/9
        ###
            recommend to set `true`, if you don't set container width and height.
            Prevent the size of the container and renderer growing when window resizes(fire `onWindowResize` event).
            Record width and height data, next time the container width is some record again, use the correlative height.
        ###
        canKeepInitalSize: true
        enableDragNewImage: true  # TODO [Not implemented] can drag image file which will be show as the new panorama to viewer(container)

        # [controls]
        # mouse
        mouseSensitivity: 0.1 # the sensitivity of mouse when is drag to control the camera.

        # device orientation
        enableDeviceOrientation: true # when device orientation(if the device has the sensor) is enabled, user turns around device to change the direction that user look at.
        # [end][controls]

        lonlat: [0, 0] # the initialize position that camera look at.
        sphere: # Default value works well. changing is not necessary.
            radius: 500 # the radius of the sphere whose texture is the panorama.
        debug:
            imageLoadProgress: false # !! not work for now!!
            lonlat: false # output the lon and lat positions. when user is controling.
            cameraSize: false # output camera size when it is changed.

    settings = settings || {}
    # put default setting into settings.
    for key,val of defaultSettings
        if  key not of settings
            settings[key] = val

    # must provide image
    if not settings.image?
        throw {
            type: "No image provided."
            msg: "Please fill panorama image path(string) in the parameter 'image' of settings"
        }

    # set container dom.
    if typeof settings.container is "string"
        # only select first one
        container = document.querySelectorAll(settings.container)[0]
    else
        container = settings.container

    # the longitude and latitude position which are mapped to the sphere
    lon = settings.lonlat[0]
    lat = settings.lonlat[1]
    width = 0
    height = 0

    #  size of render
    records = {} # the camera size records
    getViewerSize = (canKeepInitalSize = settings.canKeepInitalSize)->
        if not settings.canUseWindowSize
            rect = container.getBoundingClientRect()
            width = rect.width
            height = rect.height
        else
            # use the browser window size
            width = window.innerWidth
            height = window.innerHeight

        if not width and not height
            throw {
                type: "Lack of Viewer Size.",
                msg: "Viewer width and height are both missing(value is 0), Please check the container size(width and height > 0).
                    Or use window size to set Viewer size by setting `canUseWindowSize` as `true`"
            }
        else if not height
            height = width / settings.alternateRatio
        else if not width # height is not zero
            width = height * settings.alternateRatio

        if canKeepInitalSize is true
            if width not of records
                # record width height, may use later
                records[width] = height
            else
                # get older data
                height = records[width]

        if settings.debug.cameraSize
            console.log("current camera size:", width, height)

        return {width, height}

    # get init size
    getViewerSize()

    util = do ->

        handler =
            addClass: (domel, clazz) ->
                domel.className += " " + clazz
            removeClass: (domel, clazz) ->
                domel.className = domel.className.replace(new RegExp('(\\s|^)' + clazz + '(\\s|$)'), '')

            getAttribute: (domel, attr) ->
                return domel.getAttribute(attr)
            setAttributes: (domel, options) ->
                domel.setAttribute(key, val) for key,val of options

            css: (domel, options) ->
                for property, value of options
                    domel.style[property] = value

            on: (domel, event, callback, useCapture=false) ->
                evts = event.split(" ")
                domel.addEventListener(evt, callback, useCapture) for evt in evts

            off: (domel, eventsString, callback, useCapture=false) ->
                evts = eventsString.split(" ")
                domel.removeEventListener(evt, callback, useCapture) for evt in evts

        wrapperGenerator = (wrapper)->
            methodHelper = (fn) ->
                # avoid create function in the loop
                return (args...) ->
                    # the real method of util
                    fn(wrapper.domel, args...)
                    wrapper # return wrapper itself to call continually later

            for method, fn of handler
                # transfer the handler methods to the wrapper methods
                wrapper[method] = methodHelper(fn)

            wrapper # the generated wrapper

        return (el)->
            #
            if el?
                wrapper =
                    domel: el # set DOM element

                wrapperGenerator(wrapper)
            else
                return handler

    ###
    # Initiate the three.js components.
    # Steps:
    #   create a sphere and put panorama on faces inside
    #   create a camera, put it on origin which is also the center of sphere
    #   bind some control:
    #       1. mouse or touch or device orient to control the rotation of camera.
    #   render the scene
    ###
    init = ->
        # noraml camera (Perspective). (fov, camera screen ratio(width / height), near clip distance, far clip dist)
        # TODO ? take 'ratio' param from setting?
        camera = new THREE.PerspectiveCamera(settings.fov, width / height, 1, 1100 )
        # the camera lookAt target whose position in 3D space for the camera to point towards
        # TODO the init camera target position
        # camera.lookAt(new THREE.Vector3(0, 0, 0))
        camera.target = new THREE.Vector3( 0, 0, 0 )

        # create the sphere mesh, put panorama on it.
        # SphereBufferGeometry(radius, widthSegments, heightSegments, phiStart, phiLength, thetaStart, thetaLength)
        geometry = new THREE.SphereBufferGeometry(settings.sphere.radius, 50, 50)
        geometry.scale(-1, 1, 1) # filp the face of sphere, because the material(texture) should be on inside.

        # !!onProgress not work now. the part is comment out in the three.js(r87) ImageLoad source code
        # loadingManager = new THREE.LoadingManager()
        # loadingManager.onProgress = (url, loaded, total)->
        #     # onProgress, Will be called while load progresses, he argument will be the XMLHttpRequest instance, which contains .total and .loaded bytes.
        #     precent =  loaded / total * 100
        #     # if settings.debug.imageLoadProgress
        #     console.log("Image loaded: ", Math.round(precent, 2), "%")

        texture = new THREE.TextureLoader().load(settings.image)
        material = new THREE.MeshBasicMaterial
            map: texture

        mesh = new THREE.Mesh(geometry, material)

        # create a scene and put the sphere in the scene.
        scene = new THREE.Scene()
        scene.add(mesh)

        # create renderer and attach the result(renderer dom) in container
        renderer = initRenderer()
        container.appendChild( renderer.domElement )

        # bind mouse event to control the camera
        bindMouseTouchControl(renderer.domElement)

        # control bar
        initControls(container)

        # resize the camera and renderer when window size changed.
        util(window).on("resize",
            do ->
                # prevent fire resize multi times. only need call the function when resize finished
                resizeTimer = undefined
                return (event) ->
                    clearTimeout resizeTimer
                    resizeTimer = setTimeout(
                        ->
                            onWindowResize(event, false)
                        , 100)
            ,false)

        return {camera, mesh, scene, renderer}
        # [end] init

    # the components initiate functions.
    initRenderer = ->
        renderer = new THREE.WebGLRenderer()
        renderer.setPixelRatio( window.devicePixelRatio )
        renderer.setSize(width, height)
        return renderer
        # [end] init_renderer

    bindMouseTouchControl = (target) ->
        # the dom target, which the mouse events are trigged on.
        controlStartX = 0
        controlStartY = 0
        controlStartLon = 0
        controlStartLat = 0
        isUserControling = false

        controlStartHelper = (isTouch) ->
            # Base on `isTouch`, generate touch(true) or mouse(otherwise) version event handler.
            return (event) ->
                event.preventDefault()
                isUserControling = true
                controlStartX = if not isTouch then event.clientX else event.changedTouches[0].clientX
                controlStartY = if not isTouch then event.clientY else event.changedTouches[0].clientY
                controlStartLon = lon
                controlStartLat = lat

        controlMoveHelper = (isTouch) ->

            return (event) ->
                # mouse move over, or touch move over
                if isUserControling is true
                    x = if not isTouch then event.clientX else event.changedTouches[0].clientX
                    y = if not isTouch then event.clientY else event.changedTouches[0].clientY
                    sensitivity = settings.mouseSensitivity # TODO ? touch sensitivity?

                    lon = (controlStartX - x) * sensitivity + controlStartLon
                    lat = (y - controlStartY) * sensitivity + controlStartLat
                    if settings.debug.lonlat
                        console.log "longitude: ", lon, "latitude: ", lat

        controlEnd = (event) ->
            # release the mouse key.
            isUserControling = false

        mouseDownHandle = controlStartHelper(false)
        mouseMoveHandle = controlMoveHelper(false)
        mouseUpHandle = controlEnd

        targetUtil = util(target)
        # bind mouse event
        targetUtil.on 'mousedown', mouseDownHandle, false
            .on 'mousemove', mouseMoveHandle, false
            .on 'mouseup', mouseUpHandle, false

        touchStartHandle = controlStartHelper(true)
        touchMoveHandle = controlMoveHelper(true)
        touchEndHandle = controlEnd
        # touch event
        targetUtil.on "touchstart", touchStartHandle, false
            .on "touchmove", touchMoveHandle, false
            .on "touchend", touchEndHandle, false

    getFullscreenElementHelper = (container) ->
        if not container?
            container = document
        return ->
            container.fullscreenElement or
            container.webkitFullscreenElement or
            container.mozFullScreenElement or
            container.msFullscreenElement

    getFullscreenElement = getFullscreenElementHelper()

    requestAndExitFullscreenHelper = ->
        ###
            The helper function to create the `exitFullscreen` and `requestFullscreen`
            callback function.
            There is no need for checking different broswer methods when
            the fullscreen is toggled every time.

        ###

        if document.exitFullscreen
            ###
                `exitFn = document.exitFullscreen` not work
                alternate way: `exitFn = document.exitFullscreen.bind(document)`  (es5)
            ###
            exitFn = -> document.exitFullscreen()
            requestFn = (target) -> target.requestFullscreen()

        else if document.msExitFullscreen
            exitFn = -> document.msExitFullscreen()
            requestFn = (target) -> target.msRequestFullscreen()

        else if document.mozCancelFullScreen
            exitFn = -> document.mozCancelFullScreen()
            requestFn = (target) -> target.mozRequestFullscreen()

        else if document.webkitExitFullscreen
            exitFn = -> document.webkitExitFullscreen()
            requestFn = (target) -> target.webkitRequestFullscreen()
        else
            exitFn = ->
                console.log("The bowser doesn't support fullscreen mode") # Don't support fullscreen
            requestFn = exitFn

        return {
            request: requestFn
            exit: exitFn
        }

    toggleTargetFullscreen = do ->
        {request, exit} = requestAndExitFullscreenHelper()

        return (target) ->
            ###
                If no fullscreen element, the `target` enters fullscree.
                Otherwise fullscreen element exit fullscreen.
                Both trigge the `fullscreenchange` event.
            ###
            if getFullscreenElement()
                # Before fullscreen state, exit fullscreen now.
                # call the `exit` helper function
                exit()
            else
                # enter fullscreen now.
                # the `request` helper function which requests the fullscreen.
                request(target)

    changeFullscreenState = (target) ->
        ###
            the actual behavior when fullscreen state is changed.
        ###
        # TODO [important] make a wrapper for styling??
        fullscreenElement = getFullscreenElement()

        clazz = "fullscreen-mode"
        targetUtil = util(target)
        if (fullscreenElement?) # fullscreen
            # target.className += " " + clazz
            targetUtil.addClass(clazz)

            target.style.width = "100vw"
            target.style.height = "100vh"
            target.style["max-width"] = "unset"
            target.style["max-height"] = "unset"
        else
            # remove class name
            # TODO clean up. make a helper to handle class name.
            # target.className = target.className.replace(new RegExp('(\\s|^)' + clazz + '(\\s|$)'), '')
            targetUtil.removeClass(clazz)

            target.style.width = null
            target.style.height = null
            target.style["max-width"] = null
            target.style["max-height"] = null

        # [don't uncomment] enter or exit fullscreen will toggle `resize` event of `window`. no need to call the function to resize again.
        # reset 3panorama camera and renderer(cavans) size
        # onWindowResize(undefined, false)


    initControls = (container) ->
        controls = document.createElement("div")
        controls.className = "3panorama-controls"
        # postion: above the container
        controls.style.position = "absolute"
        controls.style.bottom = 0

        controls.style.width = "100%"
        controls.style.height = "3.5em"
        controls.style["min-height"] = "32px"

        iconStyle = {height: '75%', 'min-height': '24px', padding: '0.3em'}
        # fullscreen button
        fullscreen = document.createElement("img")
        fullscreenUtil = util(fullscreen)
        # the converted base64 url based on svg file (fullscreen-icon-opt.svg)
        fullscreen.src = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMjAgMzIwIiB3aWR0aD0iMjQiIGhlaWdodD0iMjQiPiAgPHBhdGggZmlsbD0iIzVhOWNmYyIgZD0iTTEyNSAxODAuODVsLTEwNSAxMDVWMjAzLjRIMFYzMjBoMTE2LjZ2LTIwSDM0LjE0bDEwNS4wMS0xMDV6TTIwMy40IDB2MjBoODIuNDZMMTgwLjg1IDEyNWwxNC4xNCAxNC4xNUwzMDAgMzQuMTR2ODIuNDZoMjBWMHoiLz4gIDxwYXRoIGZpbGw9IiNGRkYiIGQ9Ik0yMCAzNC4xNGwxMDUgMTA1IDE0LjE1LTE0LjEzTDM0LjE1IDIwaDgyLjQ1VjBIMHYxMTYuNmgyMHpNMzAwIDI4NS44NkwxOTUgMTgwLjg1bC0xNC4xNSAxNC4xNEwyODUuODYgMzAwSDIwMy40djIwSDMyMFYyMDMuNGgtMjB6Ii8+PC9zdmc+"
        fullscreenUtil.css iconStyle

        fullscreenUtil.on("click",
            ->
                toggleTargetFullscreen(container)
            , false)

        util(document).on "webkitfullscreenchange mozfullscreenchange fullscreenchange msfullscreenchange",
            -> changeFullscreenState(container)

        controls.appendChild(fullscreen)

        # setting button
        {_, settingPanel} = do ->
            # settings on the pannel
            settingPanel = document.createElement('div')
            panelUtil = util(settingPanel)
            panelUtil.addClass('3panorama-setting-pannel')
            panelUtil.css
                'visibility': 'hidden'
                display: 'inline'
                position: 'relative'
                background: '#FFF'
                bottom: '100%'
                left: '-24px'
                padding: '0.4em 0.8em'

            # setting icon buttion
            setting = document.createElement("img")
            setting.src = '../images/setting-icon-opt.svg'
            settingUtil = util(setting)
            settingUtil.css(iconStyle)
            settingUtil.on("click",
                do ->
                    now = 'hidden'; after = 'visible'
                    return ->
                        panelUtil.css({'visibility': after})
                        # update state
                        tmp = now
                        now = after
                        after = tmp
            , false)

            controls.appendChild(setting)
            controls.appendChild(settingPanel)

            return {setting, settingPanel}

        # device orientation
        do -> # function scope for short variable that would not affect outside(same name)
            switchor = document.createElement("div") # the switch to control whether device orientation is on or off.
            switchorUtil = util(switchor)

            switchor.innerText = "Enable Sensor: "

            switchorUtil.css
                'display': 'inline'
                'color': "#000"
                'font-size': "1em"
                'font-weight': 'bold'
                # 'text-stroke': "0.2px #5a9cfc"
                # '-webkit-text-stroke': "0.2px #5a9cfc"

            status = document.createElement("span")
            util(status).css {'font-weight': 'normal'}

            on_tag = 'ON'
            off_tag = 'OFF'

            status.innerText = if settings.enableDeviceOrientation then on_tag else off_tag

            switchor.appendChild(status)

            switchorUtil.on('click',
                ->
                    # switch change
                    settings.enableDeviceOrientation = !settings.enableDeviceOrientation

                    # update the status text
                    if settings.enableDeviceOrientation
                        status.innerText = on_tag
                    else
                        status.innerText = off_tag

                , false)  # [end] attach event of device orientation switch

            settingPanel.appendChild(switchor)
            return switchor
        # [end] device orientation

        container.appendChild(controls)

    bindDeviceOrientation = () ->
        eventHandler = do ->
            ###
            # https://developer.mozilla.org/en-US/docs/Web/API/Detecting_device_orientation
            # the event values:
            # alpha: value represents the motion of the device around the z axis, represented in degrees with values ranging from 0 to 360.
            # beta: value represents the motion of the device around the x axis, represented in degrees with values ranging from -180 to 180. This represents a front to back motion of the device.
            # gamma: value represents the motion of the device around the y axis, represented in degrees with values ranging from -90 to 90. This represents a left to right motion of the device.
            ###
            alphaBefore = undefined
            betaBefore = undefined
            return (event)->
                ###
                    real event handler function. apply device orientation changed to lon and lat.
                ###
                if settings.enableDeviceOrientation # device orientation enabled
                    alpha = event.alpha
                    beta = event.beta
                    if alphaBefore?
                        ###
                        alphaDelta(Δalpha) and betaDelta(Δbeta) are the changes of the orientation
                        which longitude and latitude (lon lat) are applied.
                        ###
                        alphaDelta = alpha - alphaBefore
                        betaDelta = beta - betaBefore
                        lon = lon + alphaDelta
                        lat = lat + betaDelta

                    # record the orientation data for the next change
                    alphaBefore = alpha
                    betaBefore = beta
                else # device orientation is NOT enabled
                    # reset the record of alpha and beta.
                    alphaBefore = undefined
                    betaBefore = undefined

        # register `deviceorientation` event
        util().on(window, "deviceorientation", eventHandler, true)

    # TODO TESTdeviceorientation
    bindDeviceOrientation()


    onWindowResize = (event, doesKeepInitSize = true) ->
        getViewerSize(doesKeepInitSize)
        camera.aspect = width / height
        camera.updateProjectionMatrix()

        renderer.setSize(width, height)


    {camera, mesh, scene, renderer} = init()

    # animate
    animate = () ->
        requestAnimationFrame animate
        update()
        return

    # the function is excuted each frame
    update = () ->
        # render the scene, capture result with the camera.

        updateCamera()

        renderer.render(scene, camera)

    updateCamera = () ->
        lat = Math.max(-85, Math.min(85, lat)) # the limit [-85, 85] that no pass over pole.

        # covent degrees to radians
        phi = THREE.Math.degToRad(90 - lat)
        theta = THREE.Math.degToRad(lon)
        radius = settings.sphere.radius

        x = radius * Math.sin(phi) * Math.cos(theta)
        y = radius * Math.cos(phi)
        z = radius * Math.sin(phi) * Math.sin(theta)

        camera.lookAt(new THREE.Vector3(x, y, z))

    # first call to start animation.
    animate()

    # expose the object contains variable and function which can be accessed.
    debugSettings = settings.debug
    return {
        container,
        camera, mesh, scene, renderer, debugSettings, util}

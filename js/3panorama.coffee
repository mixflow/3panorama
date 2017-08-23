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
        enableDragNewImage: true  # can drag image file which will be show as the new panorama to viewer(container)
        mouseSensitivity: 0.1 # the sensitivity of mouse when is drag to control the camera.
        lonlat: [0, 0] # the initialize position that camera look at.
        sphere: # Default value works well. changing is not necessary.
            radius: 500 # the radius of the sphere whose texture is the panorama.
        debug:
            imageLoadProgress: false # !! not work for now!!
            lonlat: false # output the lon and lat positions. when user is controling.

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
        container = document.querySelectorAll(setting.container)
    else
        container = settings.container

    # the longitude and latitude position which are mapped to the sphere
    lon = settings.lonlat[0]
    lat = settings.lonlat[1]

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
        camera = new THREE.PerspectiveCamera(settings.fov, window.innerWidth / window.innerHeight, 1, 1100 )
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
        bindMouseControl(renderer.domElement)

        # resize the camera and renderer when window size changed.
        window.addEventListener("resize", onWindowResize, false)

        return {camera, mesh, scene, renderer}
        # [end] init

    # the components initiate functions.
    initRenderer = ->
        renderer = new THREE.WebGLRenderer()
        renderer.setPixelRatio( window.devicePixelRatio )
        renderer.setSize( window.innerWidth, window.innerHeight)
        return renderer
        # [end] init_renderer

    bindMouseControl = (target) ->
        # the dom target, which the mouse events are trigged on.
        onMouseDownX = 0
        onMouseDownY = 0
        onMouseDownLon = 0
        onMouseDownLat = 0
        isUserControling = false

        mouseDown = (event) ->
            # press down the mouse key.
            event.preventDefault()
            isUserControling = true
            onMouseDownX = event.clientX
            onMouseDownY = event.clientY
            onMouseDownLon = lon
            onMouseDownLat = lat

        mouseMove = (event) ->
            # hold mouse key, and move over.
            if isUserControling is true
                lon = (onMouseDownX - event.clientX) * settings.mouseSensitivity + onMouseDownLon
                lat = (event.clientY - onMouseDownY) * settings.mouseSensitivity + onMouseDownLat
                if settings.debug.lonlat
                    console.log "longitude: ", lon, "latitude: ", lat

        mouseUp = (event) ->
            # release the mouse key.
            isUserControling = false

        target.addEventListener 'mousedown', mouseDown, false
        target.addEventListener 'mousemove', mouseMove, false
        target.addEventListener 'mouseup', mouseUp, false

    onWindowResize = (event) ->
        camera.aspect = window.innerWidth / window.innerHeight
        camera.updateProjectionMatrix()

        renderer.setSize(window.innerWidth, window.innerHeight)


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
        camera, mesh, scene, renderer, debugSettings}

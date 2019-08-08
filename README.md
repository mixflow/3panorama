# 3panorama
**Note: 2019.08.08** --- The project would be **NOT** maintained by the author any more.  

I created another new [panorama viewer project](https://github.com/mixflow/panorama.js) which is recommended by myself.

The new one isn't use three.js anymore, instead built  directly on WebGL(three.js and most js 3d engines use WebGL) and no other JavaScript librarys are required except a little matrix lib(a bunch of matrix operations that are required on low-level).  

Also many other advantages and improvement. check the github link: [https://github.com/mixflow/panorama.js](https://github.com/mixflow/panorama.js)

---

A javascript panorama viewer(360° × 180°) based on [Three.js](https://threejs.org/). It doesn't rely on other javascript libraries except three.js.

It loads equirectangular image and display as panorama. You can control(mouse, touch, device orientation) and look around.


_3panorama_ 是一个基于[Three.js](https://threejs.org/) 使用javascript编写的全景图查看器。除了Three.js，并不依赖其他的javascript程序包。\
它可以加载等距长方投影映射 图片，并通过全景图的方式展示。你可以通过鼠标、触摸、设备转向来观看四周。

## DEMO 示例
[www.mix-flow.com/3panorama/](http://www.mix-flow.com/3panorama/)

The forest panorama is a UE4(unreal engine 4, a game engine) work that I created. \
This _3panorama_ library is make. So I'm able to show my 3D and game work in the panoramic viewer.
<!-- TODO add link when the forest article is posted.-->

示例中使用的全景画是我制作的一个UE4(虚幻4)森林场景作品。我制作该项目的目的便是能够通过全景方式来展示我的3D以及游戏作品。

## USAGE 使用方法
1. import `three.js` or `three.min.js` file
2. import `3panorama.js` or `3panorama.min.js` file
3. call `threePanorama` function with settings(panorama url at least).

```html
<!-- code snippet -->
<!DOCTYPE html>
<html>
    <head>
        <meta charset="utf-8">
        <title>3panorama</title>
        <script src="js/three.min.js" charset="utf-8"></script>
        <script src="js/3panorama.js" charset="utf-8"></script>

    </head>
    <body>

    <script>
        var panorama = threePanorama({
            image: "images/Forest-Day_Left.jpg"
        });
    </script>
    </body>
</html>
```

you should pay attention of the load state of document. For example you put script in the `<head>`.

```javascript
document.addEventListener("DOMContentLoaded", function(event){
    var panorama = threePanorama({
        image: "images/Forest-Day_Left.jpg"
    });
}, false); // [end] document ready
```

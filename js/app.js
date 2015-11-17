

// icons:: https://www.iconfinder.com/search/?q=iconset:jigsoar-icons

var appModel = appModel;//require("./appModel");


var startX,startY,currentTarget,selectedIndex = 0;
var currentCanvas;
var context;
var toolActive = false;
var wasPenDrag = false;
var wasMove = false;
var currentColor = "#FFF";

var imageName = "img1"; // used as a key into localStorage 
var pixelData;
var pixelSize = 16;
var zoomRatio = 1.0;
var canvasWidth = 60; // in pixels
var canvasHeight = 72; // in pixels

var maxZoom = 8;
var minZoom = 1;

var offsetX = 0;
var offsetY = 0;

var undoStack = [];
var undoSets = [];

var scrollerObj;

window.init = function () {
    
    initCanvas();
    initAppBar();
    loadImage();


    window.addEventListener("resize",debounce(onResize,200));

    setTimeout(function(){
        splash.style.display = "none";

    },1000);

}

function onResize(){
    var className = (window.innerWidth > window.innerHeight) ?
                    "landscape" : "portrait"; 
    if(toolBar.className != className) {
        toolBar.className = className;
    }
}

function initAppBar() {

    setCurrentColor(getCurrentColor());

    appBar.init();

    clrPicker.onclick = onColorPicker;

    appBar.ontoolBtnDelete = function ontoolBtnDelete(e) {
        // delete all does not affect the current tool
        clearCanvas();
        redraw();
    };

    appBar.ontoolBtnExport = function ontoolBtnExport(e) {
        exportImage();
    };

    appBar.ontoolBtnUndo = function ontoolBtnUndo(e) {
        undoSet();
    };

    appBar.ontoolBtnSave = function ontoolBtnSave(e) {
        saveImage();
    };

    var onZoomOutBtn = function(e) {
        e.preventDefault();
        e.cancelBubble = true;
        doZoom(-1);  
    };

    var onZoomInBtn = function(e) {
        e.preventDefault();
        e.cancelBubble = true;
        doZoom(1);
    };

    divZoomOut.addEventListener("mouseup",onZoomOutBtn);
    divZoomOut.addEventListener("touchend",onZoomOutBtn);

    divZoomIn.addEventListener("mouseup",onZoomInBtn);
    divZoomIn.addEventListener("touchend",onZoomInBtn);

    zoomVal.innerText = zoomRatio;
}

function initCanvas() {

    currentCanvas = content;
    context = currentCanvas.getContext('2d');
    context.width = 480;//canvasWidth;
    context.height = 580;//canvasHeight;

    container.addEventListener("mousedown",onToolStart);
    container.addEventListener("touchstart",onToolStart);

    currentCanvas.addEventListener("click", onToolClick);

    scrollerObj = new Scroller(function(left, top, zoom) {
        // apply coordinates/zooming
        //console.log(left + " : " + top + " : " + zoom);
        render(left,top,zoom);
    }, 
    {
        zooming :true,
        maxZoom:8,
        minZoom:0.25
    });

    scrollerObj.setDimensions(480,580,480,580);
    
}

function initPixelData(w,h) {
    for(var i = 0; i < w; i++) {
            pixelData[i] = [];
        for(var j = 0; j < h; j++) {
            pixelData[i][j] = 0;
        }
    }
}

function clearCanvas() {
    pixelData = [];
    undoStack = [];
    undoSets = [];

    initPixelData(canvasWidth,canvasHeight);
}

function redraw() {

    offsetX = Math.max(offsetX,0);
    offsetY = Math.max(offsetY,0);

    context.clearRect(0,0,480,580);//canvasWidth,canvasHeight);

    context.fillStyle = "#000";
    //context.strokeStyle = "#333";
    context.beginPath();

    var pX = Math.ceil(canvasWidth / pixelSize);
    var pY = Math.ceil(canvasHeight / pixelSize);


    for (var x = 0; x < canvasWidth; x++) {
        // if pixel x is offscreen, skip it

        for (var y = 0; y < canvasHeight; y++) {
            var adjX = x - offsetX;
            var adjY = y  - offsetY;

            // if pixel.y is onscreen, draw it
            // if it has pixel data, fill it, otherwise draw the grid
            if(pixelData[x][y]) {
                context.fillStyle = pixelData[x][y];
            }
            else {
                context.fillStyle = ( (x % 2 ^ y % 2) ? "#000" : "#333");
            }
            
            context.fillRect(adjX * pixelSize, adjY * pixelSize, pixelSize, pixelSize);
            //context.strokeRect(adjX * pixelSize, adjY * pixelSize, pixelSize, pixelSize);
        }
    }
    //context.stroke();
    context.closePath();
}

function loadImage() {
    //pixelData = appModel.getImageAt(0) || [];
    clearCanvas();
    var imageData = localStorage[imageName];
    if(imageData) {
        pixelData = JSON.parse(imageData);
    }
    redraw();
}

function saveImage() {
    //appModel.saveImageAt(0,"MyImage",pixelData);
    var imageData = JSON.stringify(pixelData);
    localStorage[imageName] = imageData;
}

// data is expected to be a 2 dimensional array of pixel color values
function imageFromData(data) {

    var w = pixelData.length;
    var h = pixelData[0].length;
    var arr = [];

    for(var y = 0; y < h; y++) {
        for(var x = 0; x < w; x++) {
            var clr = pixelData[x][y];
            var pixel = [0,0,0,255];

            var loc = 4 * (y * w + x);
            if(clr) {
                pixel[0] = parseInt("0x" + clr.substr(1,2));
                pixel[1] = parseInt("0x" + clr.substr(3,2));
                pixel[2] = parseInt("0x" + clr.substr(5,2));
            }
            arr[loc] = pixel[0];
            arr[loc + 1] = pixel[1];
            arr[loc + 2] = pixel[2];
            arr[loc + 3] = pixel[3];
        }
    }

    var tempCanvas = document.createElement("canvas");
    // var tSty = tempCanvas.style;
    // tSty.position = "absolute";
    // tSty.right = "20px";
    // tSty.bottom = "20px";
    // tSty.border = "solid 1px Red";
    // document.body.appendChild(tempCanvas);

    // not sure why the canvas has to be halved, but the image comes out all mucked otherwise.
    tempCanvas.width = w / 2;
    tempCanvas.height = h / 2;

    var ctx = tempCanvas.getContext('2d');
    var imageData = ctx.createImageData(w,h);
    imageData.data.set(arr);

    ctx.putImageData(imageData,0,0);

    var imgData = tempCanvas.toDataURL("image/png", 1.0);

    return imgData;
}


function exportImage() {

    var imgData = imageFromData(pixelData);

    // are we in a cordova app with a saveImageToCameraRoll method?
    try {
        window.device.saveImageDataToCameraRoll(null, null, imgData);
    }
    catch(e) {
        window.open(imgData);
    }
}

function doZoom(dir) {

    zoomRatio += dir;
    
    if(zoomRatio > maxZoom) {
        //zoomRatio = minZoom;
        zoomRatio = maxZoom;
        return;
    }
    else if(zoomRatio < minZoom) {
        //zoomRatio = maxZoom;
        zoomRatio = minZoom;
        return;
    }
    zoomVal.innerText = zoomRatio;

    scrollerObj.zoomTo(zoomRatio,true,0,0);
}

function getCurrentColor() {
    return window.localStorage.currentColor || "#FF0F0F";
}

function setCurrentColor(clr) {
    window.localStorage.currentColor = clr;
    toolBtnColor.style.borderBottom = "3px solid " + clr;
    //toolBar.style.borderBottom = "3px solid " + clr;
}

function onColorPicker(evt) {
    toolBtnColor.active = false;
    // use the bg color of the touched div
    if(evt.target.style.backgroundColor) {
        setCurrentColor(evt.target.style.backgroundColor);
    }
    
    showColorPicker(false);
}







//returns true if the color value has changed
function setPixelColor(x,y,clr,noUndo) {
    // ignore if the pixel is not changing colors.
    if(pixelData[x][y] != clr) {
        if (!noUndo) {
            undoStack.push({ x: x, y: y, clr: pixelData[x][y] });
        }
        pixelData[x][y] = clr;
        return true;
    }
    return false;
}

function drawPixel(x,y,clr,noUndo) {
    var fillStyle = context.fillStyle;
    if(!clr) {
        context.fillStyle = ( (x % 2 ^ y % 2) ? "#000" : "#333");
    }
    else {
        context.fillStyle = clr;
    }
    if(setPixelColor(x, y, clr,noUndo)) {
        context.beginPath();
        context.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
        context.closePath();
        context.fillStyle = fillStyle;
    }
}

function undoSet() {
    if(undoSets.length) {
        var undoIndex = undoSets.pop();
        var diff = undoStack.length - undoIndex;
        for(var n = 0; n < diff; n++ ) {
            doUndoable();
        }
    }
    appBar.enableUndoBtn(undoSets.length);
}

function doUndoable() {
    var obj = undoStack.pop();
    if (obj) {
        drawPixel(obj.x, obj.y, obj.clr, true);
        if (undoStack.length < 1) {
               // TODO: disable undo btn
        }
    }
}

function onToolStart(evt) {

    var e = evt.touches ? evt.touches[0] : evt;
    // note: clientX is a quick patch, but it is not accurate, need to account for canvas offset

    //("e.clientX = " + e.clientX);

    var offsetX = e.offsetX || e.clientX; //container
    var offsetY = e.offsetY || e.clientY;

    if(toolBtnColor.active || toolBtnZoom.active) {
        return;
    }

    undoSets.push(undoStack.length);

    if(evt.type == "mousedown") {
        container.addEventListener("mousemove",onToolMove);
        window.addEventListener("mouseup",  onToolEnd);
    }
    else {
        container.addEventListener("touchmove",onToolMove);
        window.addEventListener("touchend",  onToolEnd);
    }

    toolActive = true;

    var x = Math.floor( offsetX / pixelSize );
    var y = Math.floor( offsetY / pixelSize );

    startX = offsetX;
    startY = offsetY;

    wasPenDrag = false;

    if(appBar.selectedTool == toolBtnMove) {
        scrollerObj.doTouchStart([{
            pageX: e.pageX,
            pageY: e.pageY
        }], e.timeStamp);
    }
    else if(appBar.selectedTool == toolBtnErase) {
        evt.preventDefault();
        context.save();
        context.beginPath();
    }
    else { // default is the pen tool
        evt.preventDefault();
        context.save();
        context.fillStyle = getCurrentColor();
        context.beginPath();
    }
}

function onToolClick(e) {

    // console.log("onToolClick");

    if(!wasPenDrag) { // dragging the pen also fills pixels, so we ignore click events if the 'pen' moved

        var x = Math.floor( e.offsetX / pixelSize );
        var y = Math.floor( e.offsetY / pixelSize );

        if(appBar.selectedTool == toolBtnErase) {
            drawPixel(x,y,0);
        }
        else if(appBar.selectedTool == toolBtnMove) {
            // click should do nothing for move tool
        }
        else {
            drawPixel(x,y,context.fillStyle);
        }
    }
}

function onToolMove(evt) {

    // need tool active for mouse-move support
    if(!toolActive) {
        return;
    }

    var e = evt.touches ? evt.touches[0] : evt;

    var offsetX = e.offsetX || e.clientX;
    var offsetY = e.offsetY || e.clientY;

    var x = Math.floor( offsetX / pixelSize );
    var y = Math.floor( offsetY / pixelSize );

    if(appBar.selectedTool == toolBtnMove) {
        scrollerObj.doTouchMove([{
            pageX: e.pageX,
            pageY: e.pageY
        }], e.timeStamp);
    }
    else if(appBar.selectedTool == toolBtnErase) {
        evt.preventDefault();
        if(x != startX || y != startY) {
            drawPixel(x,y,0);
            wasPenDrag = true;
        }
    }
    else {
        evt.preventDefault();
        wasPenDrag = true;
        // ctrl key to mimic multitouch pinch+zoom
        if(evt.ctrlKey) {
            var dY = startY - y;
            if(Math.abs(dY / 10) > 1) {
                doZoom(Math.round(dY / 10));
                startX = x;
                startY = y;
            }
            return;
        }
        if(x != startX || y != startY) {
            drawPixel(x,y,context.fillStyle);
        }
    }

    startX = x;
    startY = y;
}

function onToolEnd(evt) {
    console.log("onToolEnd");
                
    var e = evt.touches ? evt.touches[0] : evt;

    var offsetX = e.offsetX || e.clientX;
    var offsetY = e.offsetY || e.clientY;

    if(evt.type == "mouseup") {
        container.removeEventListener("mousemove",onToolMove);
        window.removeEventListener("mouseup",  onToolEnd);
    }
    else {
        container.removeEventListener("touchmove",onToolMove);
        window.removeEventListener("touchend",  onToolEnd);
    }

    toolActive = false; 
    startX = -1;
    startY = -1;

    if(appBar.selectedTool == toolBtnMove) {
        scrollerObj.doTouchEnd(e.timeStamp);
    }
    else {
        evt.preventDefault();
        context.closePath(); // finish drawing
    }
}


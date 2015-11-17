(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){


// icons:: https://www.iconfinder.com/search/?q=iconset:jigsoar-icons

var appModel = require("./appModel");


var startX,startY,currentTarget,selectedIndex = 0;
var currentCanvas;
var context;
var toolActive = false;
var wasPenDrag = false;
var wasMove = false;
var currentColor = "#FFF";
var selectedTool;

var selectionColor = "#88C"; // applied to the toolbar items
var nonSelectColor = "#000";

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
    
    window.alert("here comes the init");
    
    loadImage();
    initCanvas();
    initAppBar();

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

    var btns = document.querySelectorAll("#toolBar div");
    for(var n = 0; n<btns.length; n++) {
        console.log("adding click handler for " + n);
        btns[n].addEventListener('click',onToolBtn);
    }
    
    onToolBtn({target:btns[0]});
    clrPicker.onclick = onColorPicker;

    divZoomOut.addEventListener(digits.end,function(e){
        e.preventDefault();
        e.cancelBubble = true;
        doZoom(-1);
    });

    divZoomIn.addEventListener(digits.end,function(e){
        e.preventDefault();
        e.cancelBubble = true;
        doZoom(1);
    });

    zoomVal.innerText = zoomRatio;
}

function initCanvas() {

    currentCanvas = content;
    context = currentCanvas.getContext('2d');
    context.width = 480;//canvasWidth;
    context.height = 580;//canvasHeight;
    
    

    container.addEventListener(digits.start,onToolStart);
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
    clearCanvas();
    loadImage();
    redraw();
    
}

function clearCanvas() {
    pixelData = [];
    undoStack = [];
    undoSets = [];

    for(var i = 0; i < canvasWidth; i++) {
            pixelData[i] = [];
        for(var j = 0; j < canvasHeight; j++) {
            pixelData[i][j] = 0;
        }
    }
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

    var imageData = localStorage[imageName];
    if(imageData) {
        pixelData = JSON.parse(imageData);
    }
}

function saveImage() {
    var imageData = JSON.stringify(pixelData);
    localStorage[imageName] = imageData;
}


function exportImage() {

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
    var tSty = tempCanvas.style;
    tSty.position = "absolute";
    tSty.right = "20px";
    tSty.bottom = "20px";
    tSty.border = "solid 1px Red";
    document.body.appendChild(tempCanvas);

    // not sure why the canvas has to be halved, but the image comes out all mucked otherwise.
    tempCanvas.width = w / 2;
    tempCanvas.height = h / 2;

    var ctx = tempCanvas.getContext('2d');
    var imageData = ctx.createImageData(w,h);
    imageData.data.set(arr);

    ctx.putImageData(imageData,0,0);

    var imgData = tempCanvas.toDataURL("image/png", 1.0);

    // are we in a cordova app with a saveImageToCameraRoll method?
    try {
        window.device.saveImageDataToCameraRoll(null, null, imgData);
    }
    catch(e) {
        window.open(imgData);
    }
}

function onToolBtn(e)
{

    var btns = document.querySelectorAll("#toolBar div");
    for(var n = 0; n<btns.length; n++) {
        btns[n].style.backgroundColor = nonSelectColor;
    }

    switch(e.target.id) {
        case "toolBtnSave" :
            saveImage();
            return;
            break;
        case "toolBtnMove" : 
            selectedTool = e.target;
            break;
        case "toolBtnUndo" : 
            // undo tool should not affect the active tool, it is an action
            undoSet();
            break;
        case "toolBtnColor" : 
            if(e.target.active) {
                e.target.active = false;
                showColorPicker(false);
                e.target.style.backgroundColor = nonSelectColor;
                return;
            }
            else {
                e.target.active = true;
                e.target.style.backgroundColor = selectionColor;
                showColorPicker(true);
            }
            break;
        case "toolBtnExport":
            exportImage();
            break;
        case "toolBtnSettings": 
            break;
        case "toolBtnDraw" : 
            selectedTool = e.target;
            break;
        case "toolBtnErase" : 
            selectedTool = e.target;
            break;                    
        case "toolBtnDelete" : 
            // delete all does not affect the current tool
            clearCanvas();
            break;
        case "toolBtnZoom" :
            if(e.target.active) {
                e.target.active = false;
                showZoomControls(false);
                e.target.style.backgroundColor = nonSelectColor;
            }
            else {
                e.target.active = true;
                showZoomControls(true);
                e.target.style.backgroundColor = selectionColor;
            }
            break;
    }

    selectedTool.active = true;
    selectedTool.style.backgroundColor = selectionColor;

}


function showZoomControls(bShow) {
    if(bShow) {
        document.body.addEventListener(digits.end,removeSelection);
        zoomBar.style.display = "table";
    }
    else {
        document.body.removeEventListener(digits.end,removeSelection);
        zoomBar.style.display = "none";
    }
}

function doZoom(dir) {

    zoomRatio += dir;
    
    if(zoomRatio > maxZoom) {
        zoomRatio = minZoom;
    }
    else if(zoomRatio < minZoom) {
        zoomRatio = maxZoom;
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

function removeSelection() {

    toolBtnColor.style.backgroundColor = "#000";
    setTimeout(function(){
        toolBtnColor.active = false;
        showColorPicker(false);
        toolBtnZoom.active = false;
        showZoomControls(false);
    },10);
}

function createColorPicker() {
    var pre = [0,128,256];
    var colors = [];
    var stride = pre.length;

    for(var b = 0; b < stride; b++) {
        for(var g = 0; g < stride; g++) {
            for(var r = 0; r < stride; r++) {
                colors.push("rgba(" + pre[r] + "," + pre[g] + "," + pre[b] + ",1.0)");
                colors.push("rgba(" + pre[r]/2 + "," + pre[g]/2 + "," + pre[b] /2+ ",1.0)");  
            }
        }
    }

    colors = colors.filter(function(elem, pos) {
        return colors.indexOf(elem) == pos;
    });

    colors.sort();
        
    for(var n = 0; n < colors.length; n++) {
        var elem = document.createElement("div");
        elem.style.backgroundColor = colors[n];
        clrPicker.appendChild(elem);
    }
}

function showColorPicker(bShow)
{
    if(clrPicker.children.length == 0) {
        createColorPicker();
    }

    if(bShow) {
        document.body.addEventListener("mouseup",removeSelection);
        clrPicker.style.display = "block";
    }
    else {
        document.body.removeEventListener("mouseup",removeSelection);
        clrPicker.style.display = "none";
    }
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

    var e = digits.canTouch ? evt.touches[0] : evt;
    // note: clientX is a quick patch, but it is not accurate, need to account for canvas offset

    window.alert("e.clientX = " + e.clientX);

    var offsetX = e.offsetX || e.clientX; //container
    var offsetY = e.offsetY || e.clientY;


    if(toolBtnColor.active || toolBtnZoom.active) {
        return;
    }

    undoSets.push(undoStack.length);

    container.addEventListener(digits.move,onToolMove);
    window.addEventListener(digits.end,  onToolEnd);

    toolActive = true;

    var x = Math.floor( offsetX / pixelSize );
    var y = Math.floor( offsetY / pixelSize );

    startX = -1;//x;
    startY = -1;//y;

    wasPenDrag = false;

    if(selectedTool == toolBtnMove) {
        scrollerObj.doTouchStart([{
            pageX: e.pageX,
            pageY: e.pageY
        }], e.timeStamp);
    }
    else if(selectedTool == toolBtnErase) {
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

    console.log("onToolClick");

    if(!wasPenDrag) { // dragging the pen also fills pixels, so we ignore click events if the 'pen' moved

        var x = Math.floor( e.offsetX / pixelSize );
        var y = Math.floor( e.offsetY / pixelSize );

        if(selectedTool == toolBtnErase) {
            drawPixel(x,y,0);
        }
        else if(selectedTool == toolBtnMove) {
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

    var e = digits.canTouch ? evt.touches[0] : evt;

    var offsetX = e.offsetX || e.clientX;
    var offsetY = e.offsetY || e.clientY;

    var x = Math.floor( offsetX / pixelSize );
    var y = Math.floor( offsetY / pixelSize );

    if(selectedTool == toolBtnMove) {
        scrollerObj.doTouchMove([{
            pageX: e.pageX,
            pageY: e.pageY
        }], e.timeStamp);
    }
    else if(selectedTool == toolBtnErase) {
        evt.preventDefault();
        if(x != startX || y != startY) {
            drawPixel(x,y,0);
            wasPenDrag = true;
        }
    }
    else {
        
        evt.preventDefault();
        if(x != startX || y != startY) {
            drawPixel(x,y,context.fillStyle);
            wasPenDrag = true;
        }
    }

    startX = x;
    startY = y;
}

function onToolEnd(evt) {
    console.log("onToolEnd");
                
    var e = digits.canTouch ? evt.touches[0] : evt;

    var offsetX = e.offsetX || e.clientX;
    var offsetY = e.offsetY || e.clientY;

    container.removeEventListener(digits.move,onToolMove);
    window.removeEventListener(digits.end,  onToolEnd);

    toolActive = false; 
    startX = -1;
    startY = -1;

    if(selectedTool == toolBtnMove) {
        scrollerObj.doTouchEnd(e.timeStamp);
    }
    else {
        evt.preventDefault();
        context.closePath(); // finish drawing
    }
}


},{"./appModel":2}],2:[function(require,module,exports){


var EB = require("./eventbroadcaster");

var dataKey = "imageData";

var getData = function(){
    return JSON.parse(localStorage[dataKey]);
}

var setData = function(data){
    localStorage[dataKey] = JSON.stringify(data);
}

module.exports.appModel = {

    saveImageAt:function(index,title,data){
        var data = getData();
        data[index] = {title:title,data:data};
        setData(data);
    },
    getImageAt:function(index){
        return getData()[index];
    },
    getImageList:function(){
        var data = getData();
        var retList = [];
        for(var n = 0; n < data.length; n++) {
            returnList.push({index:n,title:data[n].title});
        }
        return retList;
    },
    deleteImageAt:function(index){
        var data = getData();
        data[index] = null;
        data.splice(index,1);
        setData(data);
        this.dispatchEvent("changed");// dispatch changed dispatchEvent
    }
};

},{"./eventbroadcaster":3}],3:[function(require,module,exports){


// install our event system
var EventBroadcaster = function(){};
EventBroadcaster.prototype = {

    addEventListener: function(name, callback, bUseCapture)
    {
        // evNames are insensitive when it comes to case.
        var evtName = name.toLowerCase();
        this._evtMap = this._evtMap || {};        
        this._evtMap[evtName] = this._evtMap[evtName] || [];
        this._evtMap[evtName].push({ "cb": callback, "bCap": bUseCapture });
    },
    removeEventListener: function(name, callback, bUseCapture)
    {
        var evtName = name.toLowerCase();
        this._evtMap = this._evtMap || {};
        var listeners = this._evtMap[evtName];
        for(var n = listeners.length - 1; n >= 0 ; n--)
        {
            if(listeners[n].cb == callback && listeners[n].bCap == bUseCapture)
            {
                listeners.splice(n,1);
            }
        }
        return callback;
    },

    dispatchEvent: function(name)
    {
        var evtName = name.toLowerCase();
        var evtArgs = arguments.slice ? arguments.slice() : Array.prototype.slice.apply(arguments,arguments);
        evtArgs[0] = {"type":evtName,"name": evtName,"target": this };
        // need to make a copy, in case eventHandlers call removeEventListener
        
        this._evtMap = this._evtMap || {};     
        this._evtMap[evtName] =  this._evtMap[evtName] || [];
        var listeners = this._evtMap[evtName].slice();
        for(var n = listeners.length - 1; n >= 0; n--)
        {
            var cb = listeners[n].cb;
            if(cb.apply)
            {
                cb.apply(this, evtArgs);
            }
            else if(cb.handleEvent && cb.handleEvent.apply)
            {
                cb.handleEvent.apply(cb,evtArgs);
            }
        }
    }
};

// Static method for attaching this functionality to another object
// install EB Methods on an instance:
// var myEB = {}; EventBroadcaster.mixin(myEB);
// or to a class :: EventBroadcaster.mixin(MyObj.prototype);
EventBroadcaster.mixin = function(targ)
{
    targ.addEventListener    = this.prototype.addEventListener;
    targ.dispatchEvent = this.prototype.dispatchEvent;
    targ.removeEventListener    = this.prototype.removeEventListener;
    targ.hasListener    = this.prototype.hasListener;
}

module.exports = EventBroadcaster;
},{}]},{},[1])
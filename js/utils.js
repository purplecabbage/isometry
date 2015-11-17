
window.onerror = function (err, fn, ln) {
    console.log("error : " + err + ", " + fn + " : " + ln);
};


 function debounce(func, delay, immediate) {
    var timeout;
    return function() {
        var context = this, args = arguments;
        function doLater() {
            timeout = null;
            func.apply(context, args);
        }
        var callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(doLater, delay);
        if (callNow) { 
            func.apply(context, args);
        }
    };
};

function alertIt(evt) {
    alert(evt.type);

}


// var digits = (function(){
//     var dig = {
//         start:"mousedown",
//         end:"mouseup",
//         move:"mousemove",
//         cancel:"touchcancel"
//     }
//     dig.canTouch = false;
//     if(false){//('ontouchstart' in window) || window.DocumentTouch && document instanceof DocumentTouch) {
//     try  { 
//         document.createEvent("TouchEvent"); 
//         // update events to use touch events, they are available
//         dig.canTouch = true; 
//         dig.start = "touchstart";
//         dig.end = "touchend";
//         dig.move = "touchmove";
//         dig.cancel = "touchcancel";
//     } 
//     catch (e) { //look for exception to feature-detection touch events.
//         dig.canTouch = false;
//     }
//     }
//     return dig;
// })();

window.onerror = function (err, fn, ln) {
    console.log("error : " + err + ", " + fn + " : " + ln);
};


function debounce(func, delay, immediate) {

    var timeout;

    return function() {
        var context = this;
        var args = arguments;

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
}

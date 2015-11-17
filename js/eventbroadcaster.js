

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

//module.exports = EventBroadcaster;
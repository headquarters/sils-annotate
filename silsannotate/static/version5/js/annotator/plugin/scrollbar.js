var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };


Annotator.Plugin.Scrollbar = (function(_super) {
    __extends(Scrollbar, _super);
    
    
    Scrollbar.prototype.events = {
        "annotationsLoaded": "showScrollbar",
    };
    
    /**
     * Plugin constructor. Runs when first instantiated.
     */
    function Scrollbar(element, options) {

        
        this.showScrollbar = __bind(this.showScrollbar, this);
        Scrollbar.__super__.constructor.apply(this, arguments);   
    }
    

    Scrollbar.prototype.showScrollbar = function(annotations) {
    };

    return Scrollbar;

})(Annotator.Plugin);
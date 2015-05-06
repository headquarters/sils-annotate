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
    

   /**
     * Shows the heat map that represents highlight clumps.
     * In version 5, pilot article, the following load times were recorded using HTML elements, SVG, and Canvas:
     * HTML: 167ms
     * SVG: 337ms
     * Canvas: 97ms
     * Canvas is the winner for rendering time on page load, but there is no way to access the elements (rectangles) 
     * that are added for each highlight. SVG would allow for targeting via IDs on elements, but it's slower than 
     * just drawing HTML elements. So, we stick with the original version0 implementation and draw with HTML DOM elements. 
     */
    Scrollbar.prototype.showScrollbar = function(annotationsArray) {
//console.time("showScrollbar");        
        var scrollbar = $('<div id="scrollbar"></div>').appendTo(document.body);
        var availableScreenHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0); 
        var scrollbarScaleFactor = availableScreenHeight / $("article").height();
        
        var annotations = $("article .annotator-hl");

        var fragment = document.createDocumentFragment();

        for(var i = 0; i < annotations.length; i++){
            var elem = annotations[i];
            var $elem = $(elem);
            var top = ($elem.offset().top) * scrollbarScaleFactor;
            var height = ($elem.height() * scrollbarScaleFactor);

            var block = $("<div></div>");

            block.css({
                top: top + "px",
                left: 0,
                height: height + "px"
            })
            .attr("data-annotation-id", $elem.data("annotation-id"))
            .addClass("scrollbar-block")
            .appendTo(fragment);
        }

        scrollbar.append(fragment);
//console.timeEnd("showScrollbar");  //167ms pilot version 5

        scrollbar.on("mouseover", hoverOnScrollbar);
        scrollbar.on("mouseout", hoverOutScrollbar);
        scrollbar.on("click", ".scrollbar-block", clickOnScrollbar);

        function hoverOnScrollbar(e){
            var block = $(e.target);
            var id = block.attr("data-annotation-id");
            $("[data-annotation-id='" + id + "']").addClass("active");
        }

        function hoverOutScrollbar(e){
            var block = $(e.target);
            var id = block.attr("data-annotation-id");
            $("[data-annotation-id='" + id + "']").removeClass("active");
        }

        function clickOnScrollbar(e){
            var block = $(e.target);
            var id = block.attr("data-annotation-id");
            var highlight = $(".annotator-hl[data-annotation-id='" + id + "']");
            //TODO: tweak this offset to get things inside the reading section
            var offset = -$("#reading-section").position().top - highlight.height() - 50;
            //TODO: disable the scrolling keepAnnotationInView here
            highlight.velocity("scroll", { offset: offset, duration: 500 });
        }
    }    

    return Scrollbar;

})(Annotator.Plugin);
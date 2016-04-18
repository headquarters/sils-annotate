var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = Object.prototype.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

/*
 * TEST THIS OUT
 * $(".annotator-hl").filter(function(){
    var viewTop = $(window).scrollTop();
    var viewBottom = viewTop + $(window).height();
    var elementTop = $(this).offset().top;

    return (elementTop >= viewTop && elementTop <= viewBottom);
});
 *
 *
 */
Annotator.Plugin.Scrollbar = (function(_super) {

    __extends(Scrollbar, _super);

    Scrollbar.prototype.events = {
        'annotationsLoaded': 'updateScrollbar'
    };

    function Scrollbar(element, options) {
        this.updateScrollbar = __bind(this.updateScrollbar, this);
        Scrollbar.__super__.constructor.apply(this, arguments);
    }

    Scrollbar.prototype.updateScrollbar = function(annotations) {

//expose this for debugging purposes
        //window.allAnnotations = annotations;

        var userToShow = false;
        var focusedIds = {};

        var textContainers$ = $(".text-container");
        var displayStyles = ["hidden", "icons", "snippets", "full"];
        
        //this variable isn't used elsewhere in this file; safe to delete?
        var nextDisplayStyle = {
            "icons": "snippets",
            "snippets": "full",
            "full": "full"
        }
        
        var snippetHeight = 30 // super brittle

        // get id of current user; pasted from silsannotate.js
        var url = window.location.pathname
        var cleanUrl = url.replace("sandbox/", "")
        var textId = cleanUrl.split("/")[2]
        var m = window.location.href.match(/user=(\w+)/)
    
        if (!m){
          alert("You have to be logged in to view; add '?user=<username>' to the url.")
        }
    
        var userId = m[1]

        /***********************************************************************
         * functions
         **********************************************************************/

        var showCounts = function(){
            var annos = getAnnotationsFromSetOfHls($("html"));
//off by 2-6
//console.log("window.allAnnotations count", window.allAnnotations.length);
//console.log("showCounts", annos.length);
            $(".submenu.annotations-count span.num").text(annos.length)
    
            var annosByUser = _.groupBy(annos, function(anno){return anno.userId})
            $(".submenu.users-count span.num").text(_.size(annosByUser))
    
            var annosByThisUser = _.filter(annos, function(anno){
              return anno.userId == userId
            });
            
            $(".submenu.this-user-annotations-count span.num").text(_.size(annosByThisUser))
        }; //end showCounts

        var handleGlobalControls = function() {
            $("#menubar a.display-style").click(function(){
                var newState = _.intersection(displayStyles, this.className.split(" "))[0]
                changeGlobalDisplayState(newState)
            });

            $("#menubar ul.enable-disable-annotation a").click(function(){
                if ($(this).hasClass("disabled")){
                    return false
                }
                enableDisableAnnotation();
            });

            $(".submenu.enable-highlights").click(function(){
                $(".annotator-hl").each(function(){
                    if ($(this).data().annotation.userId != userId) {
                        $(this).toggleClass("hidden");
                    }
                });

              $(this).find("a").toggleClass("active").toggleClass("ready")
            });
        }; //end handleGlobalControls


        var enableDisableAnnotation = function() {
            enableAnnotation = !enableAnnotation
            $("#menubar ul.enable-disable-annotation a")
                .toggleClass("active")
                .toggleClass("ready");
        };



        var changeGlobalDisplayState = function(newState){
console.time("changeGlobalDisplayState to " + newState);

            if ($("#menubar a.hidden").hasClass("active")){
                enableDisableAnnotation();
            }
   
            //$('body').removeClass(displayStyles.join(" "))
            //   .addClass(newState);

            $("#menubar a.display-style")
                .removeClass("active")
                .filter("." + newState)
                .addClass("active")

//what does adding #scrollbar do here? its extra class appears to be unused
            textContainers$
                //.add("#scrollbar")
                .removeClass(displayStyles.join(" "))
                .addClass(newState);

            redrawAllAnnoPanes();

            // if annotations are hidden, you can't make new ones
            if ($("#menubar a.hidden").hasClass("active")) {
                $("#menubar ul.enable-disable-annotation a").addClass("disabled");
                if (enableAnnotation) {
                    enableDisableAnnotation();
                }
            }
            else {
                $("#menubar ul.enable-disable-annotation a").removeClass("disabled");
            }            
console.timeEnd("changeGlobalDisplayState to " + newState);            
        }; //end changeGlobalDisplayState

        var renderAnno = function(anno) {
            if (userToShow && userToShow != anno.userId) return false


            var idClass = "id-" + anno._id
            var annoLi$ = $('<li class="sils-anno '
                                + idClass
                                + ' ' + anno.userId
                                + '"><span class="text"><span class="username">'
                                + (anno.userId)
                                + '</span></span><div class="mask"></div></li>')
            var userIconUrl = "/static/release/2/img/users/" + anno.userId + ".png"
            var userIcon = $('<img src="'+ userIconUrl +'">')
            annoLi$.prepend(userIcon)
            annoLi$.prepend("<div class='more-indicator'>+</div>")
            annoLi$.find("span.text").append(anno.text)
//TODO: can be event delegated from $(document)
            annoLi$.hover(
                function(){
                    $("."+idClass)
                        .find(".annotator-hl")
                        .andSelf()
                        .addClass("active")
                        .parents("ul.sils-annos")
                        .addClass("active");
//console.log("hovering to activate idClass", idClass)
                },
                function(){
                    $("."+idClass)
                        .find(".annotator-hl")
                        .andSelf()
                        .removeClass("active")
                        .parents("ul.sils-annos")
                        .removeClass("active");
                }
            )
            return annoLi$;

        }


        var annoFocus = function(elems) {
            if (!enableAnnotation) return false

            // add to the focusedIds array
            $(elems).each(function(){
                var thisId = readIdFromClassStr(this.className)
                focusedIds[thisId] = $('.annotator-hl.'+thisId).text().length
            })

            activateShortestId()

            return false
        }

        var activateShortestId = function(){
            // find which ids have the shortest length (array b/c ties are allowed)
            var shortestIds = []
            var shortestLenSoFar = Infinity
            _.each(focusedIds, function(len, id){
                if (len < shortestLenSoFar) {
                    shortestLenSoFar = len
                    shortestIds = [id]
                }
                else if (len == shortestLenSoFar) {
                    shortestIds.push(id)
                }
            })


            $(".text-container .active, #scrollbar .active").removeClass("active")
            if (!shortestIds.length) return false
            var activeIdsSelector = "."+shortestIds.join(", .")
            $(activeIdsSelector).find(".annotator-hl").andSelf().addClass("active")
        }


        var annoBlur = function(e) {
            var annoId = readIdFromClassStr(e.className)
            delete focusedIds[annoId]
            activateShortestId()

        }

        function capitaliseFirstLetter(string) {
            return string.charAt(0).toUpperCase() + string.slice(1);
        }

        var readIdFromClassStr = function(classStr, removePrefix) {
            var re = /id-(\w+)/
            var ret = false
            if (re.test(classStr)) {
                if (removePrefix) {
                    return re.exec(classStr)[1]
                }
                else {
                    return re.exec(classStr)[0]
                }
            }
            return ret
        }

        var getAnnotationsFromSetOfHls = function(elem$) {
//console.time("getAnnotationsFromSetOfHls");
          var annos = {}
          elem$.find(".annotator-hl").each(function(){
              annos[readIdFromClassStr(this.className)] = $(this).data().annotation
          });
//console.timeEnd("getAnnotationsFromSetOfHls");
          return _.values(annos)
        }
//takes up to half a second with more than 1000 annotations
        var writeAnnotationTexts = function() {
console.time("writeAnnotationTexts");
//added clearfix to sils-annos UL in order to capture floating children and fix height measurements
            var textContainerContents$ = $(
                "<div class='anno-display'>"
                    + "<ul class='container-states'>"
                            + "<li class='state icons'>Icons</li>"
                            + "<li class='sep'>&middot;</li>"
                            + "<li class='state snippets'>Snippets</li>"
                            + "<li class='sep'>&middot;</li>"
                            + "<li class='state full'>Full</li>"
                    + "</ul>"
                    + "<ul class='sils-annos clearfix'></ul>"
                + "</div>");
            
            textContainerContents$.find("li.state").click(function(){
                var parentContainer$ = $(this).parents(".text-container")
                var newState = _.intersection(
                    displayStyles,
                    this.className.split(" ")
                )[0];

                //$('body').removeClass(displayStyles.join(" "))
                //    .addClass(newState);
                parentContainer$
                    .removeClass(displayStyles.join(" "))
                    .addClass(newState);
                    
                redrawAnnoPane(parentContainer$);
            });

            textContainers$
                .append(textContainerContents$)
                .each(function(){
                    var annos = getAnnotationsFromSetOfHls($(this));
                    var renderedAnnosList$ = $(this).find("ul.sils-annos")
                    _.each(annos, function(anno){
                        var renderedAnno = renderAnno(anno)
                        renderedAnnosList$.append(renderedAnno)
                    });
//console.log("each", annos.length);
                    if (annos.length === 0){
                        $(this).addClass("no-annos");
                    }

                });
console.timeEnd("writeAnnotationTexts");
        }

//this adjusts height on .text-container to compensate for the height of the .anno-display block to
//the right of it
//body div.annotator-wrapper .text-container div.anno-display
        var redrawAnnoPane = function(container$) {
//console.log("redrawAnnoPane called");

//Uncomment to test the scrollbar on annotation panes. 
//return; 
            var annoListHeight = container$.find("ul.sils-annos").height()
            if (annoListHeight > 0){
                annoListHeight += 30;
            }
            container$.css("min-height", annoListHeight + "px");
        }

        var redrawAllAnnoPanes = function(){  
console.time("redrawAllAnnoPanes");
//this runs in about 120ms
            /*for(var i = 0; i < textContainers$.length; i++){
                var elem = textContainers$[i];
                redrawAnnoPane($(elem))
            }*/
            textContainers$.each(function(){
                //for this annotation container, ".text-container"
                //find ul.sils-anno in it and get its height
                //if that height is greater than 0, add 30 to it
                //then set min-height of this annotation container to that height
                
                redrawAnnoPane($(this))
            });

console.timeEnd("redrawAllAnnoPanes");                 
            drawScrollbarBlocks();             
            //fetchScrollbar();
//showCounts should not need to be called every time
//showCounts()    
        }

        var drawScrollbarBlocksCanvas = function(){
console.time("drawScrollbarBlocks");
            var scrollbar = $('<canvas id="scrollbar" width="24" height="' + screen.height + '"></canvas>');
            $(document.body).append(scrollbar);
            
            var scrollbarScaleFactor = screen.height / $("html").height();
            
            var canvas = scrollbar[0];//document.getElementById('scrollbar');
            var ctx = canvas.getContext('2d');
            ctx.fillStyle = "yellow";
            
            //ctx.fillRect(0, 50, 24, 20);
            
            var annotations = $("span.annotator-hl");

            //return;
            for(var i = 0; i < annotations.length; i++){
                var elem = annotations[i];
                var elem$ = $(elem);
                var top = (elem$.offset().top * scrollbarScaleFactor);
                var height = (elem$.height() * scrollbarScaleFactor);
                
                ctx.fillRect(0, top, 50, height);
            }
console.timeEnd("drawScrollbarBlocks");              
        }

        var drawGroupedScrollbarBlocks = function(){
console.time("drawScrollbarBlocks");       
            var scrollbarScaleFactor = $("#scrollbar").height() / $("html").height()
            $("#scrollbar").empty();

            var fragment = document.createDocumentFragment();
//expensive iteration
            //var annotations = $("span.annotator-hl");
            var annotationPanes = $(".sils-annos:not(:empty)");            
            
            for(var i = 0; i < annotationPanes.length; i++){
                var elem = annotationPanes[i];
                var elem$ = $(elem);
                //var idClassName = readIdFromClassStr(elem.className)
                $("<div class='scrollbar-block'></div>")
                    .css(
                    {
                        top: (elem$.offset().top * scrollbarScaleFactor) +"px",
                        height: (elem$.height() * scrollbarScaleFactor) + "px"
                    }
                )
                //.addClass(idClassName)
                .appendTo(fragment);
            }
            
            $('#scrollbar').append(fragment);
console.timeEnd("drawScrollbarBlocks");   
        }

        var drawScrollbarBlocks = function(){
console.time("drawScrollbarBlocks");       
            var scrollbarScaleFactor = $("#scrollbar").height() / $("html").height()
            $("#scrollbar").empty();

            var fragment = document.createDocumentFragment();
//expensive iteration
            var annotations = $("span.annotator-hl");
//annotations.length here is many times more than the count of annotations
console.log("annotations count: ", annotations.length);            
            for(var i = 0; i < annotations.length; i++){
                var elem = annotations[i];
                var elem$ = $(elem);
                var idClassName = readIdFromClassStr(elem.className)
                $("<div class='scrollbar-block'></div>")
                    .css(
                    {
                        top: (elem$.offset().top * scrollbarScaleFactor) +"px",
                        height: (elem$.height() * scrollbarScaleFactor) + "px"
                    }
                )
                .addClass(idClassName)
                .appendTo(fragment);
            }
            
            $('#scrollbar').append(fragment);
console.timeEnd("drawScrollbarBlocks");   
        }

        //can this be done at the time the annotations are added to the DOM the first time around?
        var setHlClassNames = function() {
            $("span.annotator-hl").each(function(){

                // add an id- class
                var elem$ = $(this)
                var thisClassName = "id-" + elem$.data().annotation.id
                elem$.addClass(thisClassName)

                // add a nested-depth class
                var numHlParents = elem$.parents(".annotator-hl").length + 1
                if (numHlParents > 3) numHlParents = 3
                var nestedDepthClassName = "nested-"+numHlParents
                elem$.addClass(nestedDepthClassName)

            })

        }

        var markLongAnnotations = function() {
            $("li.sils-anno").each(function(){
                var this$ = $(this)
                var textHeight = this$.find("span.text")[0].clientHeight
                if (textHeight > snippetHeight) {
                    $(this).addClass("long")
                    if (textHeight > (snippetHeight + 13)) {
                        this$.addClass("extra-long")
                    }
                }
            })
        }

        var scrollbarClickChangesLocation = function(){
            $("#scrollbar").click(function(e){
                var percFromTop = (e.clientY / $(this).height()) * 100;
                
                $(document).scrollTo(percFromTop+"%", 500);
            });
        }


        /***********************************************************************
         * procedural code
         **********************************************************************/


        //Rewritten to utilize event delegation; original code below it.
        $(document).on("mouseenter", ".annotator-hl", function(e){
            annoFocus(this);
            
        }).on("mouseleave", ".annotator-hl", function(e){
            annoBlur(this);            
        });
        /*
        $(".annotator-hl").hover(
            function(){
                annoFocus(this);
            },
            function(){
                annoBlur(this)
            }
        );*/

        setHlClassNames();
        writeAnnotationTexts();
        handleGlobalControls();
        markLongAnnotations();
        scrollbarClickChangesLocation();
        redrawAllAnnoPanes();
        
        //update the toolbar with counts of annotations for this user, all users, and # of users
        showCounts();

    }; //end updateScrollbar

    return Scrollbar;

})(Annotator.Plugin);

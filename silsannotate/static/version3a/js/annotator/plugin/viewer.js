var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { 
        for (var key in parent) { 
            if (__hasProp.call(parent, key)) child[key] = parent[key]; 
        } 
        function ctor() { this.constructor = child; } 
        ctor.prototype = parent.prototype; 
        child.prototype = new ctor(); 
        child.__super__ = parent.prototype; return child; 
    };

/*    
    viewer.js/LinkParser may be useful for making links work in the annotations
/*
 * TEST THIS OUT
 * $(".annotator-hl").filter(function(){
    var viewTop = $(window).scrollTop();
    var viewBottom = viewTop + $(window).height();
    var elementTop = $(this).offset().top;

    return (elementTop >= viewTop && elementTop <= viewBottom);
});
 *    
*/

Annotator.Plugin.Viewer = (function(_super) {
    __extends(Viewer, _super);
    
    var annotationPanel;
    var infoPanel = '<div class="annotation-info">\
                        <div class="info-item">Your annotations: <span id="current-user-annotations-count"></span></div>\
                        <div class="info-item">All annotations: <span id="all-annotations-count"></span></div>\
                        <div class="info-item">Number of users: <span id="number-of-annotators"></span></div>\
                    </div>';
    var menuBar =   '<div class="annotation-menubar">\
                        <div class="menu-container">\
                            <div class="mode-controls controls">\
                                <a href="#highlight" data-mode="highlight" title="Highlight" class="active">\
                                    <img src="/static/' + interfaceName + '/img/highlight-icon.png" alt="Highlight" />\
                                </a>\
                                <a href="#select" data-mode="select" title="Select">\
                                    <img src="/static/' + interfaceName + '/img/select-icon.png" alt="Select" />\
                                </a>\
                            </div>\
                            <div class="highlight-controls controls">\
                                <a href="#hide-highlights" title="Hide highlights">\
                                    <img src="/static/' + interfaceName + '/img/highlights-off-icon.png" alt="Hide highlights" />\
                                </a>\
                                <a href="#show-my-highlights" title="Show only my highlights">\
                                    <img src="/static/' + interfaceName + '/img/highlights-mine-only.png" alt="Show only my highlights" />\
                                </a>\
                                <a href="#show-all-highlights" title="Show all highlights" class="active">\
                                    <img src="/static/' + interfaceName + '/img/highlights-everyone.png" alt="Show all highlights" />\
                                </a>\
                            </div>\
                            <div class="info-control controls">\
                                <a href="#annotation-info" class="info-panel-trigger" title="Info">\
                                    <img src="/static/' + interfaceName + '/img/info-icon.png" alt="Info" />\
                                </a>\
                            </div>\
                            <div class="display-controls controls">\
                                <a href="#icons" data-mode="icons" title="Icons">\
                                    <img src="/static/' + interfaceName + '/img/icons-icon.png" alt="Icons" />\
                                </a>\
                                <a href="#snippets" data-mode="snippets" class="active" title="Snippets">\
                                    <img src="/static/' + interfaceName + '/img/snippets-icon.png" alt="Snippets" />\
                                </a>\
                                <a href="#full" data-mode="full" title="Full text">\
                                    <img src="/static/' + interfaceName + '/img/full-icon.png" alt="Full text" />\
                                </a>\
                            </div>\
                        </div>\
                    </div>';
    var annotationMaxHeight = 42; /* ~42px (3.8em at 11px) */
    var textDivisions;
    var scrollbar;
    var focusedIds = {};
    var numberOfUsers = 0;
    var numberOfAnnotationsByCurrentUser = 0;
    var numberOfAnnotationsByAllUsers = 0;
    var displayMode = "snippets";
    var interactiveMode = "annotate";
    var timer = null;
    var menuBarHeight;
    
    Viewer.prototype.events = {
        "annotationsLoaded": "showAnnotations",
        "annotationDataReady": "showNewAnnotation"
    };
    
    function getAnnotationIdFromClass(classStr, removePrefix) {
        var re = /id-(\w+)/;
        
        if (re.test(classStr)) {
            if (removePrefix) {
                return re.exec(classStr)[1];
            }
            else {
                return re.exec(classStr)[0];
            }
        }
        return false;
    }    
    
    function activateShortestId(){
        // find which ids have the shortest length (array b/c ties are allowed)
        var shortestIds = [];
        var shortestLenSoFar = Infinity;
        
        _.each(focusedIds, function(len, id){
            if (len < shortestLenSoFar) {
                shortestLenSoFar = len;
                shortestIds = [id];
            }
            else if (len == shortestLenSoFar) {
                shortestIds.push(id);
            }
        });

        //$(".text-container .active, #scrollbar .active").removeClass("active");
        $(".annotator-hl.active, .annotation.active").removeClass("active");
        if (!shortestIds.length){
            return false;
        }
        
        var activeIdsSelector = "." + shortestIds.join(", .")
        $(activeIdsSelector).find(".annotator-hl").andSelf().addClass("active");
        
        var annotationInPane = $(activeIdsSelector, annotationPanel);
        //annotationInPane.parents(".annotation-pane").stop().scrollTo(annotationInPane[0], 250);
        
        //TODO: draw the activated red line on the scrollbar
    }
    
    function annotationFocus(annotations) {
        // add to the focusedIds array
        $(annotations).each(function(){
            var thisId = getAnnotationIdFromClass(this.className);
            focusedIds[thisId] = $('.annotator-hl.' + thisId).text().length;
        });

        activateShortestId();
        return false;
    }
    
    function annotationBlur(annotation){      
        var annotationId = getAnnotationIdFromClass(annotation.className);
        delete focusedIds[annotationId];
        activateShortestId();
    }
    
    /**
     *
     */
    function getAnnotationsFromHighlights(highlightedElement) {
        var annotations = {};
        
        highlightedElement.find(".annotator-hl").each(function(){
            //a single annotation can have multiple .annotator-hl elements,
            //so using the ID "collapses" them into deduplicated annotations
            //...should be a better way to do this
            annotations[$(this).data().annotation.id] = $(this).data().annotation;
        });
     
        return _.values(annotations);
    }    
    
    /**
     *
     */
    function buildAnnotationPane(annotations){
        var contents = "";
 
        //if a single annotation is passed in, put it in an array
        if (!_.isArray(annotations)) {
            annotations = [annotations];
        }
        
        for(var i = 0; i < annotations.length; i++){
            contents += buildAnnotationContents(annotations[i]);
        }
        
        return contents;
    };
    
    /**
     *
     */
    function buildAnnotationContents(annotation){        
        if (annotation.highlights.length < 1 || annotation.ranges.length < 1) {
            //In the "pilot" article, there are 2 annotations with .highlights and .ranges
            //equal to Array[0] (i.e. empty values). They were not shown originally.
            return "";
        }
        
        var annotationClass = "annotation id-" + annotation.id;
        
        var annotationContents = '<div class="annotation-contents">\
                                    <div class="' + annotationClass + '">\
                                        <img src="/static/' + interfaceName + '/img/users/' + annotation.userId + '.png" alt="" />\
                                        <span class="user-id">' + annotation.userId + '</span>\
                                        <span class="text">' + annotation.text + '</span>\
                                    </div>\
                                </div>';
        return annotationContents;
    };
    
    /**
     *
     */
    function setAnnotationHighlightClassNames(highlightElements){
        var highlights;
        
        if (!highlightElements) {
            //TODO: will caching this selector speed things up any?
            highlightElements = $("span.annotator-hl");
        }
        
        highlightElements.each(function(){
            //add an id- class
            var $this = $(this);
            var className = "id-" + $this.data().annotation.id;
            $this.addClass(className);
            
            //add a nested-depth class
            var numberOfHighlightParents = $this.parents(".annotator-hl").length + 1;
            if (numberOfHighlightParents > 3){
                numberOfHighlightParents = 3;
            }
            
            var nestedDepthClassName = "nested-" + numberOfHighlightParents;
            $this.addClass(nestedDepthClassName);          
        });
    }  
    
   
    /**
     * Plugin constructor. Runs when first instantiated.
     */
    function Viewer(element, options) {
        Viewer.__super__.constructor.apply(this, arguments);

        //create the annotation panel DOM element that will house the annotations
        annotationPanel = $('<div id="annotation-panel"></div>');
        
        //select the DOM elements that serve as breaking points or transitions in the document
        //this list is chosen based on what makes the most sense in an article format
        textDivisions = $("p,h1,h2,h3,h4,h5,h6");
        
        $("#container").append(annotationPanel);
        $(document.body).append(menuBar);
        $(document.body).append(infoPanel);
        
        menuBarHeight = $(".annotation-menubar").height();
//DEBUG 
        var readingSection = $('<div id="reading-section"></div>').css({
            position: "fixed",
            top: (window.outerHeight / 4),
            bottom: ((window.outerHeight / 4) * 2),
            height: (window.outerHeight / 4),
            width: 800,
            opacity: 0.5,
            border: "1px solid #999",
            zIndex: 50
        });

        $(document.body).append(readingSection);
//DEBUG          

        //binding events elsewhere screws up the context for `this`, which
        //was used by the original code, so stick with the manual document event binding
        $(document).on("mouseenter", ".annotator-hl", function(e){
            annotationFocus(this);
        }).on("mouseleave", ".annotator-hl", function(e){
            annotationBlur(this);
        });
        
        $(document).on("mouseenter", ".annotation", function(e){
            var id = getAnnotationIdFromClass(this.className);
            var annotation = $(".annotator-hl." + id);

            if(annotation.data().annotation.userId == AnnotationView.userId && annotation.data().annotation.text.length < 1){
                $(this).children(".text").text("edit").css({ "font-style": "italic" });
            }            
            //pass DOM elements to focus
            annotationFocus(annotation[0]);
        }).on("mouseleave", ".annotation", function(e){
            var id = getAnnotationIdFromClass(this.className);
            var annotation = $(".annotator-hl." + id);

            if(annotation.data().annotation.userId == AnnotationView.userId && annotation.data().annotation.text.length < 1){
                $(this).children(".text").text("").css({ "font-style": "normal" });
            }

            //pass DOM elements to blur           
            annotationBlur(annotation[0]);
        });


        this.showAnnotations = __bind(this.showAnnotations, this);
        this.showNewAnnotation = __bind(this.showNewAnnotation, this);
        this.changeInteractiveMode = __bind(this.changeInteractiveMode, this);
        this.changeDisplayMode = __bind(this.changeDisplayMode, this);
        this.toggleHighlights = __bind(this.toggleHighlights, this);
        this.goToScrollbarClickPosition = __bind(this.goToScrollbarClickPosition, this);
        this.disableDefaultEvents = __bind(this.disableDefaultEvents, this);
        this.saveHighlight = __bind(this.saveHighlight, this);
        this.editAnnotation = __bind(this.editAnnotation, this);        
        this.bringAnnotationIntoView = __bind(this.bringAnnotationIntoView, this);
        
        this.disableDefaultEvents();

        //set highlighting by default
        $(document).unbind({
            "mouseup": Annotator.checkForEndSelection
        }).bind({
            "mouseup": this.saveHighlight
        }); 
        
        //attach menubar controls here...not working as part of prototype.events for some reason
        $(document).on("click", ".annotation-menubar .mode-controls a", this.changeInteractiveMode);
        $(document).on("click", ".annotation-menubar .display-controls a", this.changeDisplayMode);;
        $(document).on("click", ".annotation-menubar .highlight-controls a", this.toggleHighlights);
        $(document).on("click", ".annotation-menubar .info-control a", showAnnotationsInfoPanel);
        $(document).on("click", "#scrollbar", this.goToScrollbarClickPosition);
        $(document).on("click", ".expand-pane", expandAnnotationPane);
        $(document).on("click", "#container", hideAnnotationsInfoPanel);
        $(document).on("click", "#annotation-panel .annotation .text", this.editAnnotation);
        $(document).on("click", "article .annotator-hl", this.bringAnnotationIntoView);
        $(document).on("click", "#annotation-panel .annotation", bringHighlightIntoView);
        $(document).on("scroll", keepAnnotationsInView);

        $("article .reference").each(function(){
            var $this = $(this);
            var referenceID = $this.attr("href");

            var referenceLink = $(referenceID).find("a:eq(0)").attr("href");

            $this.attr("href", referenceLink);

            $this.attr("target", "_blank");
        });

    }
    
    Viewer.prototype.showAnnotations = function(annotations) {
        getCounts(annotations);
        
        $("#current-user-annotations-count").text(numberOfAnnotationsByCurrentUser);
        $("#all-annotations-count").text(numberOfAnnotationsByAllUsers);
        $("#number-of-annotators").text(numberOfUsers);
        
        setAnnotationHighlightClassNames();
        
        var annotationPanes = "";
console.time("Writing annotations");
        textDivisions.each(function(index){
            //create an annotation-pane for each text division that is at its same top position
            var $this = $(this);
            
            //this class couples a text division (paragraph/heading/etc) with a corresponding
            //annotation pane where its annotations will exist
            var textDivisionClass = "annotation-pane-" + Util.uuid();
            
            $this.addClass(textDivisionClass);
            
            //get the top of this text block to match annotation pane top; minus 10 to compensate for padding on each .annotation-pane
            var textTop = $this.position().top +
                            parseInt($this.css("margin-top")) +
                            parseInt($this.css("padding-top")) - 10;
            
            //get the total height of this text block to give this annotation pane a max height
            //using height() rather than outerHeight() because the extra height provided by including
            //padding or margin would not be useful (i.e. no annotation should be next to whitespace)
            var maxHeight = $this.height();
            
            //get the annotations in this block for the annotation pane
            var annotations = getAnnotationsFromHighlights($this);
            
            if (annotations.length > 0) {
                //build the HTML for annotation pane contents
                var contents = buildAnnotationPane(annotations);
                
                //TODO?
                //if previous pane bottom is below the top of this text division, then just add normal margin
                //else, add enough margin to put this pane inline with its text division (the current one)

                annotationPanes += '<div class="annotation-pane ' + textDivisionClass + '">'
                                        + contents +
                                    '</div>';
            }
        });
        
        annotationPanel.append(annotationPanes);       
console.timeEnd("Writing annotations");
        showScrollbar();
    };

    function rgb2hex(rgb) {
        rgb = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
        function hex(x) {
            return ("0" + parseInt(x).toString(16)).slice(-2);
        }
        return "#" + hex(rgb[1]) + hex(rgb[2]) + hex(rgb[3]);
    }
    
    Viewer.prototype.showNewAnnotation = function(annotation){
        var id = annotation.id;
        var text = annotation.text;
        //Override annotation.userId since this setup does not currently use Annotator's permissions plugin
        annotation.userId = AnnotationView.userId; 
    
        var highlightStart = $(annotation.highlights[0]);
        //TODO: get rid of flicker of yellow before the lightblue is added
        highlightStart.css("background-color", "#9CFBFC");

        //add annotation id to highlighted element
        setAnnotationHighlightClassNames(highlightStart);
        
        var highlightTextDivision = highlightStart.parents("h1,h2,h3,h4,h5,h6,p");
        
        var annotationPaneClass = highlightTextDivision[0].className;
        
        var annotationPane = annotationPanel.children("." + annotationPaneClass);

        //Velocity only supports hex values for colors and .css("background-color") returns
        //rgb() instead, so it needs to be converted
        var bgColor = highlightStart.css("background-color");
        var bgColorAsHex = rgb2hex(bgColor);
        highlightStart.velocity({
                    backgroundColor: bgColorAsHex
                }, { 
                    delay: 1000, 
                    duration: 500,
                    complete: function(e){
                        $(e).css("background-color", "");
                    }
                });
        if (annotationPane.length) {
            //add to existing .annotation-pane
            var numberOfPreviousHighlights = 0;
        
            highlightTextDivision.find(".annotator-hl").each(function(){
                if ($(this).data().annotation.id != id) {
                    numberOfPreviousHighlights++;
                    //keep going
                    return true;
                } else {
                    //found the highlight that was just created, so stop
                    return false;
                }
            });
            
            var contents = $(buildAnnotationContents(annotation)); 

            if(numberOfPreviousHighlights > 0){
                annotationPane
                        .children(".annotation-contents:nth-child(" + numberOfPreviousHighlights + ")" )
                        .after(contents);    
            } else {
                annotationPane
                        .children(".annotation-contents")
                        .before(contents);    
            }

            contents.css("background-color", "#9CFBFC").velocity({
                    backgroundColor: "#ffffff"
                }, { delay: 1000, duration: 500, complete: function(e){ $(e).css("background-color", ""); } });            
        } else {
            //add new .annotation-pane to contain this annotation
            //TODO: refactor!!!
            try {
                //get the annotation-pane number
                var paneNumber = parseInt(/\d/.exec(annotationPaneClass)[0]);
                var previousTextDivisionClass = "annotation-pane-" + (paneNumber - 1);
                var textDivisionClass = "annotation-pane-" + paneNumber;
               
                var contentsHTML = buildAnnotationPane(annotation);
                var contents = $(contentsHTML);                

                annotationPane = '<div class="annotation-pane ' + textDivisionClass + '">'
                                        + contentsHTML +
                                 '</div>';
                                    
                $("#annotation-panel ." + previousTextDivisionClass).after(annotationPane);    
                $("#annotation-panel .id-" + id).css("background-color", "#9CFBFC").velocity({
                        backgroundColor: "#ffffff"
                    }, { delay: 1000, duration: 500, complete: function(e){ $(e).css("background-color", ""); } });            
            } catch(e) {
                alert("A problem occurred showing the new annotation. Refresh the page to view it.");
            } 
        }
        
        //TODO: add the newest annotation's heatmap mark on the scrollbar
    };
    
    Viewer.prototype.bringAnnotationIntoView = function(e){
//console.log("bringAnnotationIntoView");        
        //the highlight clicked
        var annotationHighlight = e.target;
        var annotationId = getAnnotationIdFromClass(annotationHighlight.className);
        //the corresponding annotation for this highlight
        var annotation = $('#annotation-panel .' + annotationId);
        //what to bring into view
        var highlightTop = $(annotationHighlight).offset().top;
        //current position of annotation in annotation panel
        var annotationTop = annotation.offset().top;
        var annotationPositionTop = annotation.position().top;
        //get top for panel
        var annotationPanelTop = parseInt($("#annotation-panel").css("top"));

        var topOfHighlight = (highlightTop - annotationTop) + annotationPanelTop;
        var topOfViewableArea = window.scrollY - annotationPositionTop + menuBarHeight;
        
        var windowScrollTop = $(window).scrollTop();
        var windowScrollBottom = windowScrollTop + $(window).height() - menuBarHeight;
        console.log(windowScrollTop, windowScrollBottom, annotationTop)
        if(annotationTop >= windowScrollTop && annotationTop <= windowScrollBottom){
            console.log("Annotation already in view.");
        } else {
            $("#annotation-panel").velocity({ 
                                top: topOfHighlight
                            }, 
                            { 
                                duration: 400, 
                                easing: [500, 50],
                                complete: function(){
                                    //console.log("After scroll ----------");
                                    //console.log("Annotation panel top: ", $("#annotation-panel").offset().top);
                                    //console.log("Annotation top after: ", $("#annotation-panel ." + id).offset().top);
                                    //console.log("Highlight top after: ", $(highlightsInView[0]).offset().top);
                                } 
                            }
                        );   
        }

        //prevent the nested <span>s from causing multiple instances to fire
        return false;
    }
    
    //this isn't bound to Viewer.prototype because that method of binding
    //makes `this` the Viewer object, rather than the clicked element
    //and `this` is always the .annotation element with this method
    /**
        User clicks an annotation to bring the corresponding highlight into view in the
        article pane. If this scrolls the window, though, then keepAnnotationsInView will fire.


        So, move the article instead? Then that would require resetting on any window scroll event...
        Also, can't scroll window because the annotation panel will scroll with it.
        How easy to pass a flag to keepAnnotationsInView to NOT run?
    */
    function bringHighlightIntoView(e){
//console.log("bringHighlightIntoView");        
        var annotation = this;
        var annotationId = getAnnotationIdFromClass(annotation.className);
        var annotationHighlight = $('article .' + annotationId).eq(0);
        
        var annotationTop = $(annotation).offset().top;

        //how far from the top of the document is this highlight?
        var annotationHighlightTop = $(annotationHighlight).offset().top;

        //how far has the window scrolled to bring it into view?
        var windowScrollTop = $(window).scrollTop();

        //how far from the top of the document is the annotation panel?
        var annotationPanelTop = parseInt($("#annotation-panel").css("margin-top"));

        //offset necessary to bring highlight in line with the annotation, 
        //rather than just putting it at the top of the window
        var offset = -(annotationTop - windowScrollTop);

//console.log(annotationTop, annotationHighlightTop, windowScrollTop, offset);

        annotationHighlight.velocity("scroll", { duration: 300, offset: offset });

        //prevent the nested <span>s from causing multiple instances to fire
        return false;
    }      

    Viewer.prototype.disableDefaultEvents = function(e){
        this._removeEvent(".annotator-hl", "mouseover", "onHighlightMouseover");
    };
    
    Viewer.prototype.saveHighlight = function(e) {
        var adder = this.annotator.checkForEndSelection(e);
        if(adder == "undefined" || adder[0].style.display == "none"){
            //checkForEndSelection failed to find a valid selection    
            return;
        } else {
            //valid end selection
            //submit the annotator editor without any annotation
            this.annotator.editor.element.children("form").submit();
        }
    };

    Viewer.prototype.editAnnotation = function(e){
        //TODO: rather than grabbing text, this should probably be a data attribute or class
        var annotationText = $(e.target);
        var userId = annotationText.prev(".user-id").text();
        var text = annotationText.text() == "edit" ? "" : annotationText.text();
        var editor = $("<textarea />").val(text);


        if(userId == AnnotationView.userId){
            console.log(editor);
            annotationText.after(editor);
            annotationText.hide();
            editor.focus();
        }

        $(document).on("click.saveEditedAnnotation", function(){
            editor.remove();
            if(editor.val().length > 0){
                annotationText.text(editor.val());
                
                //TODO: save it!
                var id = getAnnotationIdFromClass(annotationText.parents(".annotation")[0].className);
                var annotation = $(".annotator-hl." + id);
                var data = { text: annotationText.text() };
                //annotation is an array of annotations, rather than the single one needed
                console.log(id, data);
                //this.annotator.plugins.Store.prototype.updateaAnnotation(annotation, data)
            }
            annotationText.show();
            $(document).off("click.saveEditedAnnotation");
        });
        //this.annotator.editor.load();
    }    
    
    function keepAnnotationsInView(e){
        //return;
        var viewportThird = window.outerHeight / 4;

        if(timer !== null){
            clearTimeout(timer);
        }

        timer = setTimeout(function(){
            var readingSectionTop = $(window).scrollTop() + viewportThird;            
            var readingSectionBottom = readingSectionTop + viewportThird;    

            var highlightsInView = $(".annotator-hl").filter(function(){
                var elementTop = $(this).offset().top;

                //return only those highlights that are inside the reading "area"
                return (elementTop >= readingSectionTop && elementTop <= readingSectionBottom);
            });
//console.log(viewportThird, readingSectionTop, readingSectionBottom);
//console.log("In view: ", highlightsInView[0]);
            if(highlightsInView.length < 1){
                return;
            } else {
                //$(highlightsInView[0])
                var id = getAnnotationIdFromClass(highlightsInView[0].className);
                //what to bring into view
                var highlightTop = $(highlightsInView[0]).offset().top;
                //current position of annotation in annotation panel
                var annotationTop = $("#annotation-panel ." + id).offset().top;
                var annotationPositionTop = $("#annotation-panel ." + id).position().top;
                //get top for panel
                var annotationPanelTop = parseInt($("#annotation-panel").css("top"));

                var topOfHighlight = (highlightTop - annotationTop) + annotationPanelTop;
                var topOfViewableArea = window.scrollY - annotationPositionTop + menuBarHeight;

//console.log("Before scroll ----------");
//console.log("Annotation panel top: ", $("#annotation-panel").offset().top);
//console.log("Annotation top: ", annotationTop); 
//console.log("Highlight top: ", highlightTop);       
                //scrollTo(<object>) puts that object at the top of the scrollbar
                //we want it to be inline with its corresponding highlight
                if(window.scrollY !== 0){ 

                    $("#annotation-panel").velocity({ 
                            //top: topOfHighlight
                            top: topOfViewableArea
                        }, 
                        { 
                            duration: 400, 
                            easing: [500, 50],
                            complete: function(){
                                //console.log("After scroll ----------");
                                //console.log("Annotation panel top: ", $("#annotation-panel").offset().top);
                                //console.log("Annotation top after: ", $("#annotation-panel ." + id).offset().top);
                                //console.log("Highlight top after: ", $(highlightsInView[0]).offset().top);
                            } 
                        }
                    );    
                } else {
                    $("#annotation-panel").velocity({ top: 0 }, { duration: 400, easing: [500, 0] });    
                }
                
            }
        }, 150);
    }    

    Viewer.prototype.changeInteractiveMode = function(e){
console.time("changeInteractiveMode");    
        var link = $(e.target).parent();
        var newInteractiveMode = link.data("mode");
        
        
        if (newInteractiveMode === "select") {
            //disable annotating
            $(document).unbind({
                "mouseup": this.saveHighlight,
                "mousedown": this.annotator.checkForStartSelection
            });
        } else {
            //allow highlighting and annotating
            $(document).unbind({
                "mouseup": this.annotator.checkForEndSelection,
            }).bind({
                "mouseup": this.saveHighlight
            });
        } /*else {
            //enable annotating (default)
            $(document).unbind({
                "mouseup": this.saveHighlight
            }).bind({
                "mouseup": this.annotator.checkForEndSelection,
                "mousedown": this.annotator.checkForStartSelection
            });
        }*/
        
        $("article").removeClass(interactiveMode).addClass(newInteractiveMode);
        
        $(".mode-controls .active").removeClass("active");
        link.addClass("active");
        
        interactiveMode = newInteractiveMode;
console.timeEnd("changeInteractiveMode");         
    };
    
    Viewer.prototype.changeDisplayMode = function(e){
console.time("changeDisplayMode");
        var link = $(e.target).parent();
        var newDisplayMode = link.data("mode");
        
        annotationPanel.removeClass(displayMode).addClass(newDisplayMode);
        
        $(".display-controls .active").removeClass("active");
        link.addClass("active");
        displayMode = newDisplayMode;
console.timeEnd("changeDisplayMode");        
    };
    
    Viewer.prototype.toggleHighlights = function(e){
        e.preventDefault();
        
        var link = $(e.target).parent();
        var action = link.attr("href");

        if(action == "#show-my-highlights"){
            $(document.body).removeClass("hide-annotations");  

            $(".annotator-hl").each(function(){
                if ($(this).data().annotation.userId != AnnotationView.userId) {
                  $(this).addClass("hidden")
                }
            });
        } else if (action == "#show-all-highlights"){
            $(document.body).removeClass("hide-annotations");  
            $(".annotator-hl").removeClass("hidden");
        } else {
            $(document.body).addClass("hide-annotations");        
        }
        
        link.siblings("a").removeClass("active");
        link.addClass("active");
    }
    
    Viewer.prototype.goToScrollbarClickPosition = function(e){
        //TODO: remove hard-coded 53 here; it corresponds to the #scrollbar offset from top of screen
        var percFromTop = ((e.clientY - 53) / $("#scrollbar").height()) * 100;
console.log("% from top: ", percFromTop)
        $(document).scrollTo(percFromTop + "%", 500);
    }
    
    function expandAnnotationPane(e){
        var $this = $(this);
        var pane = $this.parent('.annotation-pane');
        var paneMaxHeight = pane.css("max-height");

        if (paneMaxHeight === "none") {
            $this.text("More");
            pane.removeClass("active");
        } else {
            $this.text("Less");
            pane.data("maxheight", paneMaxHeight).addClass("active")
        }
    }
    
    /**
     * Show the number of annotations by the current user,
     * show the number of annotations by all users,
     * and show the total number of users.
     */
    function showAnnotationsInfoPanel(e) {
        e.preventDefault();
        
        $(".annotation-info").toggleClass("visible");
    }
    
    function hideAnnotationsInfoPanel(e) {
        $(".annotation-info").removeClass("visible");
    }
    
    function getCounts(annotations) {
        var annotationsWithHighlights = _.filter(annotations, function(annotation){
            //only count annotations that have a highlight and a range value
            return (annotation.highlights.length > 0 && annotation.ranges.length > 0);
        });
        
        numberOfAnnotationsByAllUsers = annotationsWithHighlights.length;


        var annotationsByUser = _.groupBy(annotations, function(annotation){return annotation.userId})
        numberOfUsers = _.size(annotationsByUser);

        var annotationsByThisUser = _.filter(annotations, function(annotation){
            return annotation.userId == AnnotationView.userId;
        });
        
        numberOfAnnotationsByCurrentUser = _.size(annotationsByThisUser);
    }
    
    function showScrollbar() {
console.time("showScrollbar");
        //TODO: remove hard-coded 53 here
        var availableScreenHeight = screen.height - 53; /* 53px falls below the .annotation-menubar */

        scrollbar = $('<canvas id="scrollbar" width="24" height="' + availableScreenHeight + '"></canvas>');
        $(document.body).append(scrollbar);
        
        var scrollbarScaleFactor = availableScreenHeight / $("article").height();
            
        var canvas = scrollbar[0];
        var ctx = canvas.getContext('2d');
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = "yellow";
        
        var annotations = $("article .annotator-hl");

        for(var i = 0; i < annotations.length; i++){
            var elem = annotations[i];
            var elem$ = $(elem);
            var top = (elem$.offset().top * scrollbarScaleFactor);
            var height = (elem$.height() * scrollbarScaleFactor);
            
            ctx.fillRect(0, top, 24, height);
        }
console.timeEnd("showScrollbar");
    }
    
    return Viewer;

})(Annotator.Plugin);
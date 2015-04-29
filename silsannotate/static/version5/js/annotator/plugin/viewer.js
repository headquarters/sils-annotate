/**
 * These functions are at the top of every Annotator file, so they're included here, too.
 */
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

/**
 * Instantiate the Viewer Plugin. There is also a viewer.js "module" used by Annotator, which
 * shows the annotations in a tooltip on mouseover. This plugin replaces that functionality altogether and shows
 * annotations in the right margin. 
 */
Annotator.Plugin.Viewer = (function(_super) {
    __extends(Viewer, _super);
    
    //the annotation panel where annotations will be rendered
    var annotationPanel;
    //the information panel that is hidden off screen until a user clicks the upper "info" button
    var infoPanel = '<div class="annotation-info">\
                        <div class="panel-section clearfix">\
                            <div class="panel-title">Display annotations as</div>\
                            <div class="panel-details display-controls"> \
                                <label><input type="radio" name="display_annotations" value="icons" /> Icons </label><br />\
                                <label><input type="radio" name="display_annotations" value="snippets" checked="checked" /> Snippets </label><br />\
                                <label><input type="radio" name="display_annotations" value="full" /> Full text </label>\
                            </div> \
                        </div>\
                        <hr />\
                        <div class="panel-section clearfix">\
                            <div class="panel-title">Show empty annotations</div>\
                            <div class="panel-details hide-empty-annotations">\
                                <label><input type="radio" name="show_empty_annotations" value="show" checked="checked" /> Show</label><br />\
                                <label><input type="radio" name="show_empty_annotations" value="hide" /> Hide</label>\
                            </div>\
                        </div>\
                        <hr />\
                        <div class="panel-section clearfix">\
                            <div class="panel-title">Show annotation panel</div>\
                            <div class="panel-details hide-annotation-panel">\
                                <label><input type="radio" name="show_annotation_panel" value="show" checked="checked" /> Show</label><br />\
                                <label><input type="radio" name="show_annotation_panel" value="hide" /> Hide</label>\
                            </div>\
                        </div>\
                        <hr />\
                        <div class="panel-section clearfix">\
                            <div class="panel-title">About this article</div>\
                            <div class="panel-details">\
                                <div class="info-item">Your annotations: <span id="current-user-annotations-count"></span></div>\
                                <div class="info-item">All annotations: <span id="all-annotations-count"></span></div>\
                                <div class="info-item">Number of users: <span id="number-of-annotators"></span></div>\
                            </div>\
                        </div>\
                    </div>';
    //the menu bar at the top of the screen that holds all the interface icons                    
    var menuBar =   '<div class="annotation-menubar">\
                        <div class="menu-container">\
                            <div class="mode-controls controls">\
                                <a href="#select" data-mode="select" title="Select">\
                                    <img src="/static/' + interfaceName + '/img/select-icon.png" alt="Select" />\
                                </a>\
                                <a href="#highlight" data-mode="highlight" title="Highlight" class="active">\
                                    <img src="/static/' + interfaceName + '/img/highlight-icon.png" alt="Highlight" />\
                                </a>\
                            </div>\
                            <div class="highlight-controls controls">\
                                <a href="#show-my-highlights" title="Show only my highlights">\
                                    <img src="/static/' + interfaceName + '/img/highlights-mine-only.png" alt="Show only my highlights" />\
                                </a>\
                                <a href="#show-all-highlights" title="Show all highlights" class="active">\
                                    <img src="/static/' + interfaceName + '/img/highlights-everyone.png" alt="Show all highlights" />\
                                </a>\
                            </div>\
                            <div class="debug-controls" style="width:260px;float:left;">\
                                <label>Duration: <input type="text" name="duration" style="width:30px;"/></label>\
                                <label>Timeout: <input type="text" name="timeout" style="width:30px;" /></label>\
                            </div>\
                            <div class="info-control controls">\
                                <a href="#annotation-info" class="info-panel-trigger" title="Info">\
                                    <img src="/static/' + interfaceName + '/img/info-icon.png" alt="Info" />\
                                </a>\
                            </div>\
                        </div>\
                    </div>';

    //this refers to elements in the page where we want to divide annotation panes, usually by paragraph or header
    var textDivisions;
    //the scrollbar that will appear to the right with a "heatmap" of annotations
    var scrollbar;
    //this will contain all the annotation IDs currently being focused on; see activateShortedId()
    var focusedIds = {};

    //data about the current set of annotations
    var numberOfUsers = 0;
    var numberOfAnnotationsByCurrentUser = 0;
    var numberOfAnnotationsByAllUsers = 0;

    //default display mode
    var displayMode = "snippets";
    //default interactive mode 
    var interactiveMode = "annotate";

    //timer for keeping annotations in view on window scroll
    var timer = null;

    //height of the menu bar when it's appended to the DOM
    var menuBarHeight;

    //used as a lock to prevent the annotations panel from moving when the window scrolls in some instances
    var allowKeepAnnotationsInView = true;

    //if an annotation was just updated or not
    var annotationUpdated = false;

    //stores all the annotations loaded, updates when new one created, and used to get counts
    var annotations = [];

    //stores all the highlights that are moused over for calculating shortest one to activate on click
    var highlights = {};

    var hidingEmptyAnnotations = false;
    
    Viewer.prototype.events = {
        "annotationsLoaded": "showAnnotations",
        "annotationDataReady": "showNewAnnotation"
    };
    
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
        
        //add the UI elements to the page
        $("#container").append(annotationPanel);
        $(document.body).append(menuBar);
        $(document.body).append(infoPanel);
        
        //get the height of the menu bar; helps with adjusting vertical placement of other items
        menuBarHeight = $(".annotation-menubar").height();
//DEBUG 
        var readingSection = $('<div id="reading-section"></div>').css({
            top: (window.outerHeight / 4),
            bottom: ((window.outerHeight / 4) * 2),
            height: (window.outerHeight / 4)
        });

        $(document.body).append(readingSection);
//DEBUG          

        //binding events elsewhere screws up the context for `this`, which
        //was used by the original code, so stick with the manual document event binding
        $(document).on("mouseenter", ".annotator-hl:not(.hidden)", function(e){
            annotationFocus(this);
        }).on("mouseleave", ".annotator-hl:not(.hidden)", function(e){      
            annotationBlur(this);
        });
      
        $(document).on("mouseenter", ".annotation", function(e){
            var id = $(this).data("annotation-id");
            var annotation = $(".annotator-hl[data-annotation-id='" + id + "']");
            if(annotation.data().annotation.userId == AnnotationView.userId){
                
                var edit = $("<a href='#edit-annotation' class='edit-annotation'>Edit</a>");
                $(this).append(edit);
            }            
            //pass DOM elements to focus
            annotationFocus(annotation[0]);
        }).on("mouseleave", ".annotation", function(e){
            var id = $(this).data("annotation-id");
            var annotation = $(".annotator-hl[data-annotation-id='" + id + "']");

            if(annotation.data().annotation.userId == AnnotationView.userId){
                $(this).find(".edit-annotation").remove();                             
            }

            //pass DOM elements to blur           
            annotationBlur(annotation[0]);
        });


        this.showAnnotations = __bind(this.showAnnotations, this);
        this.showNewAnnotation = __bind(this.showNewAnnotation, this);
        this.changeInteractiveMode = __bind(this.changeInteractiveMode, this);
        this.changeDisplayMode = __bind(this.changeDisplayMode, this);
        this.toggleHighlights = __bind(this.toggleHighlights, this);
        this.disableDefaultEvents = __bind(this.disableDefaultEvents, this);
        this.editAnnotation = __bind(this.editAnnotation, this);        
        this.bringAnnotationIntoView = __bind(this.bringAnnotationIntoView, this);
        this.hideEmptyAnnotations = __bind(this.hideEmptyAnnotations, this);
        this.hideAnnotationPanel = __bind(this.hideAnnotationPanel, this);
        
        this.disableDefaultEvents();
        
        //attach menubar controls here...not working as part of prototype.events for some reason
        $(document).on("click", ".annotation-menubar .mode-controls a", this.changeInteractiveMode);
        $(document).on("change", ".annotation-info .display-controls input", this.changeDisplayMode);
        $(document).on("change", ".annotation-info .hide-empty-annotations input", this.hideEmptyAnnotations);
        $(document).on("change", ".annotation-info .hide-annotation-panel input", this.hideAnnotationPanel);
        $(document).on("click", ".annotation-menubar .highlight-controls a", this.toggleHighlights);
        $(document).on("click", ".annotation-menubar .info-control a", showAnnotationsInfoPanel);
        $(document).on("click", "#container", hideAnnotationsInfoPanel);
        $(document).on("click", "#annotation-panel .annotation .edit-annotation", this.editAnnotation);
        $(document).on("click", "article .annotator-hl", this.bringAnnotationIntoView);
        $(document).on("click", "#annotation-panel .annotation", bringHighlightIntoView);
        $(document).on("scroll", keepAnnotationsInView);

        $("article a").each(function(){
            var $this = $(this);

            //replace reference links with actual HREF values rather than in-page links
            if($this.hasClass("reference")){
                var referenceID = $this.attr("href");

                var referenceLink = $(referenceID).find("a:eq(0)").attr("href");

                $this.attr("href", referenceLink);    
            }            

            //open all links in external tab/window
            $this.attr("target", "_blank");
        });

        var _this = this;

        this.subscribe('annotationCreated', function(){
            //TODO: rely on data, rather than text
            $("#current-user-annotations-count").text(parseInt($("#current-user-annotations-count").text()) + 1);
            $("#all-annotations-count").text(parseInt($("#all-annotations-count").text()) + 1);
        });
    }
    
    /**
     * Extracts the annotation ID from a class string.
     * @param {string} classStr - Class name of an element, such as "id-29f87alkjsdf".
     * @param {boolean} removePrefix - Whether to remove the "id-" prefix when returning the value.
     * @returns {string | boolean} 
     */
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
    
    /**
     * Adds the "active" class to the shortest span of text in nested highlights.
     */
    function activateShortestId(){
        var shortestIds = [];
        var shortestLenSoFar = Infinity;
        
//console.log("IDs that were hovered on:");
        _.each(focusedIds, function(len, id){
            if (len < shortestLenSoFar) {
                shortestLenSoFar = len;
                shortestIds = [id];
            }
            else if (len == shortestLenSoFar) {
                shortestIds.push(id);
            }
//console.log(id, len);            
        });

        $(".annotator-hl.active, .annotation.active, .scrollbar-block.active").removeClass("active");
        if (!shortestIds.length){
            return false;
        }

//console.log("Activating these IDs:");        
        shortestIds = shortestIds.map(function(s){
//console.log(s);
            return "[data-annotation-id='" + s + "']";
        });

        var activeIdsSelector = shortestIds.join(", ");
        var highlights = $(activeIdsSelector).find(".annotator-hl").andSelf();

        highlights.addClass("active");
        //TODO: draw the activated red line on the scrollbar
    }
    
    /**
     * Add annotation IDs and text lengths to the focusedIds object literal. 
     */    
    function annotationFocus(annotations) { 
        $(annotations).each(function(){
            var thisId = $(this).data("annotation").id;//getAnnotationIdFromClass(this.className);
//console.log(thisId, $('.annotator-hl.' + thisId).text().length);
            focusedIds[thisId] = $('.annotator-hl[data-annotation-id="' + thisId + '"]').text().length;
        });

        activateShortestId();
        return false;
    }
    
    /**
     * Deletes the annotation ID from focusedIds on blur.
     */
    function annotationBlur(annotation){     
        var annotationId = $(annotation).data("annotation").id;//getAnnotationIdFromClass(annotation.className);
        delete focusedIds[annotationId];
        activateShortestId();
    }
    
    /**
     * Get annotations from highlighted element, keys are annotation IDs, values are annotation data.
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
     * Concatenate all the annotations for one text division into a single pane.
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
     * Create the HTML contents of an annotation.
     */
    function buildAnnotationContents(annotation){        
        if (annotation.highlights.length < 1 || annotation.ranges.length < 1) {
            //In the "pilot" article, there are 2 annotations with .highlights and .ranges
            //equal to Array[0] (i.e. empty values). They were not shown originally.
            return "";
        }
        
        var annotationClass = "annotation id-" + annotation.id;

        if(AnnotationView.userId === annotation.userId){
            annotationClass += " my-annotation";
        }
        
        var annotationContents = '<div class="annotation-contents">\
                                    <div class="' + annotationClass + '" data-annotation-id="' + annotation.id + '">\
                                        <img src="/static/' + interfaceName + '/img/users/' + annotation.userId.toLowerCase() + '.png" alt="" />\
                                        <span class="user-id">' + annotation.userId + '</span>\
                                        <span class="text">' + annotation.text + '</span>\
                                    </div>\
                                </div>';
        return annotationContents;
    };
    
    /**
     * Adds "my-annotation" class to highlights the current user created. 
     * Adds data-annotation-id attribute to highlights.
     * @param {jQuery Object} highlightElements - The elements to add classes to.
     * @returns void
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

            if($this.data().annotation.userId === AnnotationView.userId){
                $this.addClass("my-annotation");
            }

            //FIXES: https://github.com/openannotation/annotator/issues/495
            $this.attr("data-annotation-id", $this.data().annotation.id);
            
            //add a nested-depth class
            /*var numberOfHighlightParents = $this.parents(".annotator-hl").length + 1;
            if (numberOfHighlightParents > 3){
                numberOfHighlightParents = 3;
            }
            
            var nestedDepthClassName = "nested-" + numberOfHighlightParents;
            $this.addClass(nestedDepthClassName);*/          
        });
    }      

    Viewer.prototype.showAnnotations = function(annotations) {
        this.annotations = annotations;

        getCounts(annotations);
        
        $("#current-user-annotations-count").text(numberOfAnnotationsByCurrentUser);
        $("#all-annotations-count").text(numberOfAnnotationsByAllUsers);
        $("#number-of-annotators").text(numberOfUsers);
        
        var annotationPanes = "";
//console.time("Writing annotations");
        var i = 0;
        textDivisions.each(function(index){
            //create an annotation-pane for each text division that is at its same top position
            var $this = $(this);
            
            //this class couples a text division (paragraph/heading/etc) with a corresponding
            //annotation pane where its annotations will exist
            var textDivisionClass = "annotation-pane-" + i;
            i++;
            
            $this.addClass(textDivisionClass);
            
            //get the total height of this text block to give this annotation pane a max height
            //using height() rather than outerHeight() because the extra height provided by including
            //padding or margin would not be useful (i.e. no annotation should be next to whitespace)
            var maxHeight = $this.height();
            
            //get the annotations in this block for the annotation pane
            var annotations = getAnnotationsFromHighlights($this);
            
            if (annotations.length > 0) {
                //build the HTML for annotation pane contents
                var contents = buildAnnotationPane(annotations);

                annotationPanes += '<div class="annotation-pane ' + textDivisionClass + '">'
                                        + contents +
                                    '</div>';
            } else {
                //always ensure there is at least an empty pane for each text division
                annotationPanes += '<div class="annotation-pane ' + textDivisionClass + '"></div>';
            }
        });
        
        annotationPanel.append(annotationPanes);       
//console.timeEnd("Writing annotations");
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
        annotations.push(annotation);
//console.log("showNewAnnotation", annotation);        
        if(annotationUpdated){
            annotationUpdated = false;
            return;
        }        
//console.log("Show new annotation", annotation);
        var id = annotation.id;
        var text = annotation.text;
        //Override annotation.userId since this setup does not currently use Annotator's permissions plugin
        annotation.userId = AnnotationView.userId; 
    
        var highlightStart = $(annotation.highlights[0]);
        //TODO: get rid of flicker of yellow before the lightblue is added
        //highlightStart.css("background-color", "#9CFBFC");

        var highlightTextDivision = highlightStart.parents("h1,h2,h3,h4,h5,h6,p");

        //add annotation id to highlighted element
        setAnnotationHighlightClassNames(highlightTextDivision.find(".annotator-hl"));

        var annotationPaneClass = highlightTextDivision[0].className;
        
        var annotationPane = annotationPanel.children("." + annotationPaneClass);

        //Velocity only supports hex values for colors and .css("background-color") returns
        //rgb() instead, so it needs to be converted
        /*var bgColor = highlightStart.css("background-color");
        var bgColorAsHex = rgb2hex(bgColor);
        highlightStart.velocity({
                    backgroundColor: bgColorAsHex
                }, { 
                    delay: 1000, 
                    duration: 500,
                    complete: function(e){
                        //TODO: this can be moved to the other callbacks below to make the changes sync up
                        $(e).css("background-color", "");
                    }
                });
        */
console.log("Adding new annotation with ID: ", id);
        var numberOfPreviousHighlights = 0;
    
        var highlightsInTextDivision = getAnnotationsFromHighlights(highlightTextDivision);

        for(var i = 0; i < highlightsInTextDivision.length; i++){
            if (highlightsInTextDivision[i].id != id) {
                numberOfPreviousHighlights++;
                //keep going
                continue;
            } else {
                //found the highlight that was just created, so stop
                break;
            }
        }          

        var contents = $(buildAnnotationContents(annotation)); 
        if(numberOfPreviousHighlights === 0){
            annotationPane.prepend(contents);    
        } else {
            annotationPane
                .children(".annotation-contents:nth-child(" + numberOfPreviousHighlights + ")" )
                .after(contents);    
        }


        highlightStart.css("border", "1px solid #333");
        contents.css("border", "1px solid #333");

        setTimeout(function(){
            highlightStart.css("border", "none");
            contents.css("border", "none");

        }, 2000);
        
        /*
        contents.css("background-color", "#9CFBFC").velocity({
                backgroundColor: "#ffffff"
            }, { 
                delay: 1000, 
                duration: 500, 
                complete: function(e){ 
                    $(e).css("background-color", ""); 
                } 
            });
        */            

        highlights[id] = 1;
        bringShortestIdIntoView();
        addAnnotationToScrollbar(annotation);
        //TODO: add the newest annotation's heatmap mark on the scrollbar
    };

    Viewer.prototype.bringAnnotationIntoView = function(e){
        var highlight = $(e.currentTarget).data("annotation");

        //if a highlight <span> is inside a link, fire off the link rather than
        //bringing the annotation into view
        if($(e.target).parents("a").length > 0){
            var href = $(e.target).parents("a").attr("href");
            window.open(href);
            e.preventDefault();
            return false;
        }

        //add this element to the highlights array, indexed by its ID
        //and having value of its length, then we can activate the shortest one on click
        //when all the bubbling is done
        highlights[highlight.id] = $('.annotator-hl[data-annotation-id="' + highlight.id + '"]').text().length;
        
        if($(e.currentTarget).parents(".annotator-hl").length === 0){
            //bubbled as far as we need to go
            bringShortestIdIntoView();
            return false;
        }
    }

    var bringShortestIdIntoView = function(){

        var shortestIds = [];
        var shortestLenSoFar = Infinity;
        
        _.each(highlights, function(len, id){
            if (len < shortestLenSoFar) {
                shortestLenSoFar = len;
                shortestIds = [id];
            }
            else if (len == shortestLenSoFar) {
                shortestIds.push(id);
            }
        });

        if (!shortestIds.length){
            return false;
        }

        shortestIds = shortestIds.map(function(s){
            return "[data-annotation-id='" + s + "']";
        });

        var activeIdsSelector = shortestIds.join(", ");

        highlights = {};

        //the highlight clicked
        //only bring into view the first annotation that was found (should be the top one this way)
        var annotationHighlight = $(activeIdsSelector)[0]
        var annotationId = $(annotationHighlight).data("annotation-id");

console.log("Bring annotation into view for ID: ", annotationId);
        //the corresponding annotation for this highlight
        var annotation = $('#annotation-panel [data-annotation-id="' + annotationId + '"]');
        //what to bring into view
        var highlightTop = $(annotationHighlight).offset().top;
        //current position of annotation in annotation panel
        var annotationTop = annotation.offset().top;
        var annotationPositionTop = annotation.position().top;
        //get top for panel
        var annotationPanelTop = parseInt($("#annotation-panel").css("top"));
 
        var newAnnotationPanelTop = (highlightTop - annotationTop) + annotationPanelTop;

        $("#annotation-panel").velocity({ 
                top: newAnnotationPanelTop
            }, 
            { 
                duration: 400, 
                easing: [500, 50],
                complete: function(element){
                    if(newAnnotationPanelTop < 0){
                        //get rid of excess white space left behind by moving the annotations up
                        $(element).css("margin-bottom", newAnnotationPanelTop);    
                    }             
                    //console.log("After scroll ----------");
                    //console.log("Highlight offset top: ", $(annotationHighlight).offset().top);
                    //console.log("Annotation offset top: ", $("#annotation-panel ." + annotationId).offset().top);
                    //console.log("Annotation panel offset top: ", $("#annotation-panel").offset().top);                                
                } 
            }
        );  
    }
    
    //this isn't bound to Viewer.prototype because that method of binding
    //makes `this` the Viewer object, rather than the clicked element
    //and `this` is always the .annotation element with this method
    function bringHighlightIntoView(e){  
        allowKeepAnnotationsInView = false;
        console.log(e.target);
//console.log("Turning off scroll event.");            
        $(document).off("scroll", keepAnnotationsInView);

        var annotation = this;
        var annotationId = $(annotation).data("annotation-id"); //getAnnotationIdFromClass(annotation.className);
        var annotationHighlight = $('.annotator-hl[data-annotation-id="' + annotationId + '"]').eq(0);
console.log("Bring highlight into view for ID: ", annotationId);        
        var annotationTop = $(annotation).offset().top;
        var annotationPositionTop = $(annotation).position().top;
        //how far from the top of the document is this highlight?
        var highlightTop = $(annotationHighlight).offset().top;

        //how far has the window scrolled?
        var windowScrollTop = $(window).scrollTop();

        //how far from the top of the document is the annotation panel?
        var annotationPanelTop = parseInt($("#annotation-panel").css("top"));

        var topOfHighlight = (highlightTop - annotationTop) + annotationPanelTop;
        //offset necessary to bring highlight in line with the annotation, 
        //rather than just putting it at the top of the window
        //var offset = -(annotationTop - windowScrollTop);
        var clickedOffset = this.getBoundingClientRect().top;
   
        if(window.scrollY !== 0){ 
            //scroll the highlight into view, inline with where user clicked mouse
            annotationHighlight.velocity("scroll", { 
                duration: 300, 
                offset: -clickedOffset,
                progress: function(){
                    //clearTimeout(timer);
                },
                begin: function(elements){
                        $("#annotation-panel").velocity({ 
                            top: topOfHighlight // + clickedOffset
                            //top: topOfViewableArea
                        }, 
                        { 
                            duration: 300, 
                            complete: function(){
                                //console.log("After scroll ----------");
                                //console.log("Highlight top: ", $(annotationHighlight).offset().top);
                                //console.log("Annotation top: ", $(annotation).offset().top);
                                //console.log("Annotation panel top: ", $("#annotation-panel").offset().top); 
                            } 
                        }
                    );
                },
                complete: function(elements){
                    //console.log("Rebinding scroll event.");
                    //cheap attempt to avoid race condition with scroll event firing immediately after
                    //this scroll finishes
                    setTimeout(function(){
                        $(document).on("scroll", keepAnnotationsInView);
                    }, 150);
                    
                }
            });
        } 
    }      

    function keepAnnotationsInView(e){   
//console.log("Scroll event fired.");
        var duration = $("input[name='duration']").val() || 100;
        var timeout = $("input[name='timeout']").val() || 50;

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
                try {

                    //$(highlightsInView[0])
                    var id = $(highlightsInView[0]).data("annotation-id"); //getAnnotationIdFromClass(highlightsInView[0].className);
                    //what to bring into view
                    var highlightTop = $(highlightsInView[0]).offset().top;
                    //current position of annotation in annotation panel
                    //var annotationTop = $("#annotation-panel [data-annotation-id='" + id + "']").offset().top;
                    var annotationPositionTop = $("#annotation-panel [data-annotation-id='" + id + "']").position().top;
                    //get top for panel
                    var annotationPanelTop = parseInt($("#annotation-panel").css("top"));

                    //var topOfHighlight = (highlightTop - annotationTop) + annotationPanelTop + menuBarHeight;
                    var topOfViewableArea = window.scrollY - annotationPositionTop + menuBarHeight;

    //console.log("Before scroll ----------");
    //console.log("Annotation panel top: ", $("#annotation-panel").offset().top);
    //console.log("Annotation top: ", annotationTop); 
    //console.log("Highlight top: ", highlightTop);       
                    if(window.scrollY === 0){ 
                        topOfViewableArea = 0;
                    }

                    $("#annotation-panel").velocity({ 
                            //top: topOfHighlight
                            top: topOfViewableArea
                        }, 
                        { 
                            duration: duration, 
                            complete: function(element){
                                if(topOfViewableArea < 0){
                                    //get rid of excess white space left behind by moving the annotations up
                                    $(element).css("margin-bottom", topOfViewableArea);    
                                }                                    
                                //console.log("After scroll ----------");
                                //console.log("Annotation panel top: ", $("#annotation-panel").offset().top);
                                //console.log("Annotation top after: ", $("#annotation-panel ." + id).offset().top);
                                //console.log("Highlight top after: ", $(highlightsInView[0]).offset().top);
                            } 
                        }
                    ); 
                } catch (e){
                    console.log("Failed to bring annotation into view.", e.message);
                }
            }
        }, timeout);
    }    

    Viewer.prototype.disableDefaultEvents = function(e){
        this._removeEvent(".annotator-hl", "mouseover", "onHighlightMouseover");
    };
    
    Viewer.prototype.editAnnotation = function(e){
        var _this = this;
        var id = $(e.target).parent().data("annotation-id");
        var annotation = $(".annotator-hl[data-annotation-id='" + id + "']").data("annotation");
        var annotationText = $(e.target).prev(".text");
        var userId = annotation.userId;
        var text = annotation.text;
        var editor = $("<textarea />").val(text);

        if(userId !== AnnotationView.userId){
            return;
        }

        //console.log(editor);
        annotationText.after(editor);
        annotationText.hide();
        editor.focus();

        $(document).on("click.saveEditedAnnotation", function(e){
            //":not(.annotation textarea)" selector didn't work, so manually check the click wasn't inside the text area
            if(e.target === editor[0]){
                return false;
            } else {
                editor.remove();
                if(editor.val().length > 0){
                    annotationText.text(editor.val());
                    annotation.text = editor.val();
                    annotationUpdated = true;
                    _this.publish('annotationUpdated', [annotation]);
                }
            }
            
            annotationText.show();
            $(document).off("click.saveEditedAnnotation");
        });
    }    
    

    Viewer.prototype.changeInteractiveMode = function(e){
//console.time("changeInteractiveMode");    
        var link = $(e.target).parent();
        var newInteractiveMode = link.data("mode");
        
        
        if (newInteractiveMode === "select") {
            //disable annotating
            $(document).unbind({
                "mouseup": this.annotator.checkForEndSelection,
                "mousedown": this.annotator.checkForStartSelection
            });
        } else {
            //allow highlighting and annotating
            $(document).bind({
                "mouseup": this.annotator.checkForEndSelection,
                "mousedown": this.annotator.checkForStartSelection
            });
        } 
        
        $(document.body).removeClass(interactiveMode).addClass(newInteractiveMode);
        
        $(".mode-controls .active").removeClass("active");
        link.addClass("active");
        
        interactiveMode = newInteractiveMode;
//console.timeEnd("changeInteractiveMode");         
    };
    
    Viewer.prototype.changeDisplayMode = function(e){
//console.time("changeDisplayMode");
        var radio = $(e.target);
        var newDisplayMode = radio.val();
        
        annotationPanel.removeClass(displayMode).addClass(newDisplayMode);
        
        displayMode = newDisplayMode;
//console.timeEnd("changeDisplayMode");        
    };

    Viewer.prototype.hideEmptyAnnotations = function(e){
        var radio = $(e.target);
        //create array of annotations that have empty text
        var emptyTextAnnotations = this.annotations.filter(function(annotation){
            return (annotation.text.length < 1);
        });

        var elements = "";

        //find those elements in the DOM and hide them
        for(var i = 0; i < emptyTextAnnotations.length; i++){
            var annotation = emptyTextAnnotations[i];

            //hide the highlight that has empty text and the annotation itself in the right pane
            elements += ".annotator-hl[data-annotation-id='" + annotation.id + "'], "; 
            elements += ".annotation[data-annotation-id='" + annotation.id + "'], ";              
        }

        elements = elements.substring(0, elements.length - 2);

        if(radio.val() == "hide"){
            $(elements).addClass("hidden");
        } else {
            $(elements).removeClass("hidden");
        }

        //TODO: this could be handled by switching a class on the body, but each 
        //empty annotation would need a class to designate that it has not empty
    };    
    
    Viewer.prototype.hideAnnotationPanel = function(e){ 
        var radio = $(e.target);

        if(radio.val() == "hide"){
            annotationPanel.addClass("hidden");
        } else {
            annotationPanel.removeClass("hidden");
        }
    }

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
    };
    
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

        var annotationsByUser = _.groupBy(annotations, function(annotation){return annotation.userId});
        numberOfUsers = _.size(annotationsByUser);

        var annotationsByThisUser = _.filter(annotations, function(annotation){
            return annotation.userId == AnnotationView.userId;
        });
        
        numberOfAnnotationsByCurrentUser = _.size(annotationsByThisUser);
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
    function showScrollbar() {
//console.time("showScrollbar");        
        var scrollbar = $('<div id="scrollbar"></div>').appendTo(document.body);
        var availableScreenHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0); // - menuBarHeight; //$(window).height(); // - menuBarHeight; 
        var scrollbarScaleFactor = availableScreenHeight / $("article").height();
        //var scrollbar = SVG('scrollbar').size(24, availableScreenHeight);
        
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

    function addAnnotationToScrollbar(annotation){
        //TODO: refactor showScrollbar to use this smaller function for adding annotations
        var scrollbar = $("#scrollbar");
        var availableScreenHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0) - menuBarHeight; //$(window).height(); // - menuBarHeight; 
        var scrollbarScaleFactor = availableScreenHeight / $("article").height();
        
        var $element = $(".annotator-hl[data-annotation-id='" + annotation.id + "']");

        var top = ($element.offset().top) * scrollbarScaleFactor;
        var height = ($element.height() * scrollbarScaleFactor);
        var block = $("<div></div>");

        block.css({
            top: top + "px",
            left: 0,
            height: height + "px"
        })
        .attr("data-annotation-id", $element.data("annotation-id"))
        .addClass("scrollbar-block")
        .appendTo(scrollbar);
    }

    return Viewer;

})(Annotator.Plugin);
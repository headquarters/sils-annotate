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
 * annotations in the right margin. Some modifications have also been made to the core annotator.js files. 
 * Search for the word "MODIFIED" to find the code that was changed to support the prototype interfaces.
 */
Annotator.Plugin.Viewer = (function(_super) {
    __extends(Viewer, _super);
    
    //the annotation panel where annotations will be rendered
    var annotationPanel;
    //the information panel that is hidden off screen until a user clicks the upper "info" button
    var infoPanel = '<div class="annotation-info" style="z-index:16000" >\
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
    
    //AnnotatorJS events are tied to function callbacks by placing the callback name on the right side
    //and the event name on the left side
    //annotationsLoaded is an AnnotatorJS event
    //annotationDataReady is an extra event added to the Store.js plugin 
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
        
        //originally intended for debugging the scrolling reading window section, but has become part of the interface
        var readingSection = $('<div id="reading-section" style="display:none;"></div>').css({
            top: (window.outerHeight / 4),
            bottom: ((window.outerHeight / 4) * 2),
            height: (window.outerHeight / 4)
        });

        $(document.body).append(readingSection);
        //end the reading section          

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
        this.addAdminControls = __bind(this.addAdminControls, this);
        
        this.disableDefaultEvents();
        
        //extra events are attached here because they were not working as part of the Viewer.prototype.events object
        $(document).on("click", ".annotation-menubar .mode-controls a", this.changeInteractiveMode);
        $(document).on("change", ".annotation-info .display-controls input", this.changeDisplayMode);
        $(document).on("change", ".annotation-info .hide-empty-annotations input", this.hideEmptyAnnotations);
        $(document).on("change", ".annotation-info .hide-annotation-panel input", this.hideAnnotationPanel);
        $(document).on("click", ".annotation-menubar .highlight-controls a", this.toggleHighlights);
        $(document).on("click", ".annotation-menubar .info-control a", showAnnotationsInfoPanel);
        $(document).on("click", "#container", hideAnnotationsInfoPanel);
        $(document).on("click", ".qtip-focus .annotation .edit-annotation", this.editAnnotation);
        $(document).on("click", "article .annotator-hl", this.bringAnnotationIntoView);
        $(document).on("click", "#annotation-panel .annotation", bringHighlightIntoView);
        // $(document).on("scroll", keepAnnotationsInView);



        //all external links should open in new tabs/windows
        $("article a").each(function(){
            var $this = $(this);

            //replace reference links with actual HREF values rather than in-page links
            if($this.hasClass("reference")){
                var referenceID = $this.attr("href");

                var referenceLink = $(referenceID).find("a:eq(0)").attr("href");

                $this.attr("href", referenceLink);    
            }            

            var href = $this.attr("href");
            if(href.indexOf("#") !== 0){
                //open all external links in external tab/window
                $this.attr("target", "_blank");    
            }
            
        });

        //when a new annotation is created, increment the counters in the info panel
        this.subscribe('annotationCreated', function(){
            //TODO: rely on data, rather than text
            $("#current-user-annotations-count").text(parseInt($("#current-user-annotations-count").text()) + 1);
            $("#all-annotations-count").text(parseInt($("#all-annotations-count").text()) + 1);
        });

        //if user=admin, show extra controls in the info panel
        if(AnnotationView.userId === "admin"){
            this.addAdminControls();
        }
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
        
        _.each(focusedIds, function(len, id){
            if (len < shortestLenSoFar) {
                shortestLenSoFar = len;
                shortestIds = [id];
            }
            else if (len == shortestLenSoFar) {
                shortestIds.push(id);
            }          
        });

        $(".annotator-hl.active, .annotation.active, .scrollbar-block.active").removeClass("active");
        if (!shortestIds.length){
            return false;
        }
    
        shortestIds = shortestIds.map(function(s){
            return "[data-annotation-id='" + s + "']";
        });

        var activeIdsSelector = shortestIds.join(", ");
        var highlights = $(activeIdsSelector).find(".annotator-hl").andSelf();

        highlights.addClass("active");
    }
    
    /**
     * Add annotation IDs and text lengths to the focusedIds object literal. 
     */    
    function annotationFocus(annotations) { 
        $(annotations).each(function(){
            var thisId = $(this).data("annotation").id;
            focusedIds[thisId] = $('.annotator-hl[data-annotation-id="' + thisId + '"]').text().length;
        });

        activateShortestId();
        return false;
    }
    
    /**
     * Deletes the annotation ID from focusedIds on blur.
     */
    function annotationBlur(annotation){     
        var annotationId = $(annotation).data("annotation").id;
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
            //equal to Array[0] (i.e. empty values). They were not shown originally, so don't include them here.
            return "";
        }
        
        var annotationClass = "annotation id-" + annotation.id;

        if(AnnotationView.userId === annotation.userId){
            annotationClass += " my-annotation";
        }

        var annotationContents = '<div class="annotation-contents" >\
                                    <div class="' + annotationClass + '" data-annotation-id="' + annotation.id + '">\
                                        <img src="/static/' + interfaceName + '/img/users/' + annotation.userId.toLowerCase() + '.png" alt="" />\
                                        <span class="user-id" style="font-size:11px;"><b>' + annotation.userId + '</b></span>\
                                        <span class="text" style="font-size:11px;">' + annotation.text + '</span>\
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
        });
    }      

    /**
     * These controls should only be visible when user=admin is present in the URL.
     * These provide ways to tweak the duration and timeout values for the keepAnnotationsInView function
     * and a means for batch deleting annotations. 
     * @returns void
     */
    Viewer.prototype.addAdminControls = function(){
        var self = this;
        var infoPanel = $(".annotation-info");

        var adminControls = '<div class="panel-section clearfix">\
                                <div class="panel-title">Internal program settings</div>\
                                <div class="panel-details internal-controls">\
                                    <label>Duration: <input type="text" name="duration" /></label>\
                                    <label>Timeout: <input type="text" name="timeout" /></label>\
                                    <a href="#batch-delete">Show Batch Delete</a>\
                                </div>\
                            </div>'
        infoPanel.append(adminControls);

        $(".annotation-info [href='#batch-delete']").on("click", function(){
            hideAnnotationsInfoPanel();
            $("#annotation-panel .annotation").each(function(){
                var id = $(this).data("annotation-id");
                $(this).prepend('<input type="checkbox" name="delete" value="' + id + '" />');
            });

            var deleteControls = '<div class="delete-controls">\
                                    <button type="button">Delete</button>\
                                    <a href="#select-all">Select All</a>\
                                    <a href="#select-none">Select None</a>\
                                    <a href="#select-highlights">Select Empty Highlights</a>\
                                </div>';

            $("#annotation-panel").prepend(deleteControls);
        });

        $("#annotation-panel").on("click", ".delete-controls button", function(){
            if(confirm("Are you sure you want to delete the selected annotations? This cannot be undone.")){
                var id;
                var inputs = $("#annotation-panel input:checked");
                var annotation;

                for(var i = 0; i < inputs.length; i++){
                    id = inputs[i].value;
                    annotation = $(".annotator-hl[data-annotation-id='" + id + "']").data("annotation");
                    
                    //Delete AnnotatorJS-controlled annotation 
                    self.annotator.deleteAnnotation(annotation);

                    //Delete custom annotation
                    var removed = $(".annotation[data-annotation-id='" + id + "']").remove();
                }
            }
        });

        $("#annotation-panel").on("click", ".delete-controls [href='#select-all']", function(){
            $("#annotation-panel input").prop("checked", true);
        });

        $("#annotation-panel").on("click", ".delete-controls [href='#select-none']", function(){
            $("#annotation-panel input").prop("checked", false);
        });

        $("#annotation-panel").on("click", ".delete-controls [href='#select-highlights']", function(){
            var emptyTextAnnotations = self.annotations.filter(function(annotation){
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
            $(elements).children("input").prop("checked", true);
        });
    }

    /**
     * Show annotations that were loaded in by AnnotatorJS framework. 
     * @param {Array} annotations - all annotations loaded in when Store plugin was initiated.
     * @returns void
     */
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
            //get the top of this text block to match annotation pane top; minus 10 to compensate for padding on each .annotation-pane
            var textTop = $this.position().top +
                            parseInt($this.css("margin-top")) +
                            parseInt($this.css("padding-top")) - 10;

            var maxHeight = $this.height();
            
            //get the annotations in this block for the annotation pane
            var annotations = getAnnotationsFromHighlights($this);
            if (annotations.length > 0) {
                //build the HTML for annotation pane contents
                var contents = buildAnnotationPane(annotations);
                var textTop = $this.position().top + parseInt($this.css("margin-top")) + parseInt($this.css("padding-top")) - 10;

                annotationPanes += '<div style="margin-left:-8%;margin-top:0px;width:30px;position:absolute;top: '+textTop+'px;" class="hasTooltip annotation-pane ' + textDivisionClass +
                '"><a href="#plus-toggle"  class="plus-toggle" title="Click to display annotations"><img src="/static/version8a/img/article-icon.png" alt="Select" style="width:27px; height:33px;"></a></div><div style="height:88vh;overflow-y:auto;display:none;">'
                                        + contents +
                                    '</div>';
            } else {
                //always ensure there is at least an empty pane for each text division
                annotationPanes += '<div class="annotation-pane ' + textDivisionClass + '"></div>';
            }
        });
        annotationPanel.append(annotationPanes);
        //annotationPanel.children(annotationPanes).remove();
        $('.hasTooltip').each(function() { // Notice the .each() loop, discussed below
            // set a ratio value to adpot qtip to dynamic window size
            var windowWidth = $(window).width();
            var qtipRatio= (windowWidth / 1440) - 0.2;



            $(this).qtip({
                show: {
                    event: 'click',
                    effect: function() {
                        // close info panel when q-tip is displayed
                        // $(".annotation-info").removeClass("visible");
                        $(this).show('slide',200
                        //);
                            ,function(){
                                    $(".qtip").not($(this)).slideUp("fast");
                                // $(this).html('<img src="/static/version8/img/article-selected-icon.png" alt="Select" style="width:26px; height:33px;">');
                        //        $(".plus-toggle").not($(this)).html('<img src="/static/version8/img/article-unselected-icon.png" alt="Select" style="width:26px; height:33px;">');
                        }
                        );
                    }
                },
                hide: {
                    event: 'click',
                    effect: function() {
                        $(this).hide('fold',200
                        //);
                            ,function(){
                                 {
                                    $(".plus-toggle").html('<img src="/static/version8a/img/article-icon.png" alt="Select" style="width:26px; height:33px;">');
                                     $(".plus-toggle").data('clicked', false);
                                     $(".plus-toggle").attr('clicked', "0");
                                     $(".plus-toggle").animate({opacity:1});
                                }
                        }
                        );
                    }
                },
                content: {
                    text: $(this).next('div')
                },
                position: {
                    my: 'top center',  // Position my top left...
                    at: 'bottom center', // at the bottom right of...
                    target: $('.menu-container'), // my target
                    adjust: {
                        x: 330*(1/qtipRatio-0.3),
                        y: 10,
                        resize: false // prevent qtip from repositioning itself when size changes
                    },
                },
                style: {
                    // check main.css for detail
                    font:12,
                    width:600*qtipRatio
                }
            });
        });

        $(".plus-toggle").click(function(){

            //$(".plus-toggle").html('<img src="/static/version8/img/article-icon.png" alt="Select" style="width:26px; height:33px;">');
            //$(".hasTooltip").not($(this)).html('<img src="/static/version8/img/minus-icon.png" alt="Select" style="width:26px; height:33px;">');
            //$(this).fadeOut(100);
            $(this).html('<img src="/static/version8a/img/article-selected-icon.png" alt="Select" style="width:28px; height:36px;">').animate({opacity:1});

            //$(".plus-toggle").not($(this)).fadeOut("fast");
            //$(".plus-toggle").not($(this)).fadeIn("fast").html('<img src="/static/version8a/img/article-unselected-icon.png" alt="Select" style="width:20px; height:26px;">');
            $(".plus-toggle").not($(this)).html('<img src="/static/version8a/img/article-unselected-icon.png" alt="Select" style="width:20px; height:26px;">').animate({opacity:0.4},'slow');
            //add a checker to avoid multiple click event in annotator/annotator.js line 529
            $(this).data('clicked', true);
            $(".plus-toggle").not($(this)).data('clicked', false);
            $(this).attr('clicked', "1");
            $(".plus-toggle").not($(this)).attr('clicked', "0");

            // allow qtip to close when selected button is out of view.
            $(window).scroll(function() {  //When the user scrolls
                var elem=$(".plus-toggle[clicked ='1']");
                var offset = elem.offset().top;
                var $window = $(window);
                var docViewTop = $window.scrollTop();
                var docViewBottom = docViewTop + $window.height();
                //console.log(offset-docViewBottom);
                //console.log(offset>docViewTop);
                if((offset>docViewBottom)||((offset<docViewTop))){
                    $('div.qtip:visible').qtip('hide');
                    $(".plus-toggle[clicked ='1']").data('clicked', false);
                    $(".plus-toggle[clicked ='1']").attr('clicked', "0");
                }
                //console.log(offset);


            });
            //var elem=$(this).attr("clicked", true);
            //var $elem = $(elem);
            //var $window = $(window);
            //var docViewTop = $window.scrollTop();
            //var docViewBottom = docViewTop + $window.height();
            ////
            ////
            ////var elemBottom = elemTop + $elem.height();

            //
            //    if ((elemBottom <= docViewBottom) && (elemTop >= docViewTop)){
            //
            //};
        })
        ;




//console.timeEnd("Writing annotations");
    };
    
    /**
     * Show the new annotation that was just created. 
     * @param {object} annotation - annotation that was just created
     * @returns void
     */
    Viewer.prototype.showNewAnnotation = function(annotation){
        annotations.push(annotation);

        if(annotationUpdated){
            annotationUpdated = false;
            return;
        }        

        var id = annotation.id;
        var text = annotation.text;
        //Override annotation.userId since this setup does not currently use Annotator's permissions plugin
        annotation.userId = AnnotationView.userId; 
    
        var highlightStart = $(annotation.highlights[0]);

        var highlightTextDivision = highlightStart.parents("h1,h2,h3,h4,h5,h6,p");

        //add annotation id to highlighted element
        setAnnotationHighlightClassNames(highlightTextDivision.find(".annotator-hl"));

        //var annotationPaneClass = "qtip-focus.annotation-pane."+highlightTextDivision[0].className;
        var annotationPane =$(".qtip-focus").children(".qtip-content").children();
        if (annotationPane.length <1) {
            this.showAnnotations();
        }
        //var annotationPane = annotationPanel.children("." + annotationPaneClass);
        //var annotationPane = $(".qtip-focus");
        //var annotationPane = annotationPanes;
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


        if(annotation.highlights.length === 1){
            highlightStart.css("border", "1px solid #333");
        } else {
            for(var i = 0; i < annotation.highlights.length; i++){
                if(i === 0){
                    //first highlight
                    $(annotation.highlights[i]).css({
                        "border-left": "1px solid #333"
                    });
                } 
                if(i === annotation.highlights.length - 1){
                    //last highlight
                    $(annotation.highlights[i]).css({
                        "border-right": "1px solid #333"
                    });
                } 
                //all highlights need top and bottom border
                $(annotation.highlights[i]).css({
                    "border-top": "1px solid #333",
                    "border-bottom": "1px solid #333"
                });
            }
        }

        contents.css("border", "1px solid #333");


        setTimeout(function(){
            $(annotation.highlights).css("border", "none");
            contents.css("border", "none");

        }, 2000);

        highlights[id] = 1;
        bringShortestIdIntoView();
        addAnnotationToScrollbar(annotation);
    };

    /**
     * When a highlight is clicked, get that highlights ID and its text length.
     * Add that to the highlights array. 
     * Once the event stops bubbling up (i.e. there a no more highlights above this one), 
     * call bringShortestIdIntoView.
     * 
     * @param {object} e - click event
     * @returns void
     */
    Viewer.prototype.bringAnnotationIntoView = function(e){
        var highlight = $(e.currentTarget).data("annotation");

        // open the qTip box when user press the corresponding paragraph.
        // simple but workable approach. may require further debugging.
        // need to consider multiple parent pissibilities: p/h2/h1
        var parentP = $(e.currentTarget).parents('p').prop('className')
            || $(e.currentTarget).parents('h2').prop('className')
            ||$(e.currentTarget).parents('h1').prop('className');

        // console.log(parentP);
        if (!$('.' + parentP).find('.plus-toggle').data("clicked"))
        {
            $('.' + parentP).find('.plus-toggle').trigger("click");
            $('.' + parentP).find('.plus-toggle').attr('clicked', "1");
        };


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
            // set a timeout function so it will wait until q-tip is rendered.
            setTimeout(bringShortestIdIntoView,200);
            return false;
        }
    }

    /**
     * Bring the annotation into view for the shortest highlight that was clicked.
     *
     * @returns void
     */
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
        //the corresponding annotation for this highlight
        //var annotation = $('#annotation-panel [data-annotation-id="' + annotationId + '"]');
        var annotation = $('.qtip-focus [data-annotation-id="' + annotationId + '"]');
        //what to bring into view
        //var highlightTop = $(annotationHighlight).offset().top;
        //current position of annotation in annotation panel
        //var annotationTop = annotation.offset().top;
        //var annotationPositionTop = annotation.position().top;
        //get top for panel
        //var annotationPanelTop = parseInt($("#annotation-panel").css("top"));
        //var annotationPanelTop = parseInt($(".qtip-focus").css("top"));
        //var newAnnotationPanelTop = (highlightTop - annotationTop) + annotationPanelTop;
        annotation.velocity("scroll", {
            container: $(".qtip-focus").find(".qtip-content").children(),
            duration: 700,
            delay: 200
        });
    }
    
    /**
     * Bring highlight into view for the annotation that was clicked.
     * This method isn't bound to Viewer.prototype because that form of binding
     * makes `this` the Viewer object, rather than the clicked element.  
     * In this form of binding, `this` is always the .annotation element, 
     * making it easier to access its properties.
     * @param {object} e - click event
     * @returns void
     */
    function bringHighlightIntoView(e){
        allowKeepAnnotationsInView = false;
        $(document).off("scroll", keepAnnotationsInView);

        var annotation = this;
        var annotationId = $(annotation).data("annotation-id"); 
        var annotationHighlight = $('.annotator-hl[data-annotation-id="' + annotationId + '"]').eq(0);        
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
                            top: topOfHighlight 
                        }, 
                        { 
                            duration: 300
                        }
                    );
                },
                complete: function(elements){
                    //cheap attempt to avoid race condition with scroll event firing immediately after
                    //this scroll finishes
                    setTimeout(function(){
                        $(document).on("scroll", keepAnnotationsInView);
                    }, 150);
                    
                }
            });
        } 
    }     

    /**
     * Keeps annotations in view as user scrolls. When user stops scrolling and the timeout function
     * fires, then the annotation that is inside the reading window area gets put at the top of the viewport.
     * 
     * @param {object} e - scroll event
     * @returns void
     */

    function keepAnnotationsInView(e){
        if(allowKeepAnnotationsInView) {
            //get admin-controlled input values or use defaults
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

                if(highlightsInView.length < 1){
                    return;
                } else {
                    try {
                        var id = $(highlightsInView[0]).data("annotation-id");
                        //what to bring into view
                        var highlightTop = $(highlightsInView[0]).offset().top;
                        //current position of annotation in annotation panel
                        //var annotationTop = $("#annotation-panel [data-annotation-id='" + id + "']").offset().top;
                        var annotationPositionTop = $("#annotation-panel [data-annotation-id='" + id + "']").position().top;
                        //get top for panel
                        var annotationPanelTop = parseInt($("#annotation-panel").css("top"));

                        //var topOfHighlight = (highlightTop - annotationTop) + annotationPanelTop + menuBarHeight;
                        var topOfViewableArea = window.scrollY - annotationPositionTop + menuBarHeight;

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
                                }
                            }
                        );
                    } catch (e){
                        console.log("Failed to bring annotation into view.", e.message);
                    }
                }
            }, timeout);
        }
        else {
            allowKeepAnnotationsInView = true;
        }
    }

    /**
     * Disable the default mouseover event that would show the AnnotatorJS viewer,
     * since this plugin replaces its functionality.
     * 
     * @returns void
     */
    Viewer.prototype.disableDefaultEvents = function(){
        this._removeEvent(".annotator-hl", "mouseover", "onHighlightMouseover");
    };
    
    /**
     * Show textarea to edit annotation text when user clicks "edit" link for an annotation.
     * 
     * @param {object} e - click event
     * @returns void
     */
    Viewer.prototype.editAnnotation = function(e){
        var _this = this;
        console.log(e);
        var id = $(e.target).parent().data("annotation-id");
        var annotation = $(".annotator-hl[data-annotation-id='" + id + "']").data("annotation");
        console.log(annotation);
        var annotationText = $(e.target).prev(".text");
        var userId = annotation.userId;
        var text = annotation.text;
        var editor = $("<textarea />").val(text);

        if(userId !== AnnotationView.userId){
            return;
        }

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
    
    /**
     * Change modes between selecting only (browser default)
     * and highlighting mode.
     * 
     * @param {object} e - click event
     * @returns void
     */
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
    
    /**
     * Change how annotations are displayed, i.e. as icons, snippets, or full text.
     * 
     * @param {object} e - click event
     * @returns void
     */
    Viewer.prototype.changeDisplayMode = function(e){
//console.time("changeDisplayMode");
        var radio = $(e.target);
        var newDisplayMode = radio.val();
        
        annotationPanel.removeClass(displayMode).addClass(newDisplayMode);
        
        displayMode = newDisplayMode;
//console.timeEnd("changeDisplayMode");        
    };

    /**
     * Hide those annotations that have no user-specified text.
     * 
     * @param {object} e - click event
     * @returns void
     */
    Viewer.prototype.hideEmptyAnnotations = function(e){
         //Zhenwei

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
    
    /**
     * Show or hide the annotations panel.
     * 
     * @param {object} e - click event
     * @returns void
     */
    Viewer.prototype.hideAnnotationPanel = function(e){ 
        var radio = $(e.target);

        if(radio.val() == "hide"){
            annotationPanel.addClass("hidden");
        } else {
            annotationPanel.removeClass("hidden");
        }
    }

    /**
     * Show all highlights or just the current user's highlights.
     * 
     * @param {object} e - click event
     * @returns void
     */
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
    
    /**
     * Show annotations info panel. A CSS transition takes care of showing it with a class.
     * 
     * @param {object} e - click event
     * @returns void
     */    
    function showAnnotationsInfoPanel(e) {
        e.preventDefault();
        // relative hide
        // $('div.qtip:visible').qtip('hide');
        $(".annotation-info").toggleClass("visible");

    }
    
    /**
     * Hide annotations info panel. A CSS transition takes care of hiding it by removing a class.
     * 
     * @param {object} e - click event
     * @returns void
     */
    function hideAnnotationsInfoPanel(e) {
        $(".annotation-info").removeClass("visible");
    }
    
    /**
     * Get counts to update the info panel.
     * 
     * @param {Array} annotations - all annotations
     * @returns void
     */    
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
     * Add new annotation indicator to scrollbar. 
     * TODO: should be handled by scrollbar plugin, rather than this plugin.
     * 
     * @param {object} annotation - new annotation added
     * @returns void
     */    
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
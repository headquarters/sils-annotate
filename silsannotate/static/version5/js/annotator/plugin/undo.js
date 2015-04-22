var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };


Annotator.Plugin.Undo = (function(_super) {
    __extends(Undo, _super);
    
    var recentAnnotations = [];
    
    Undo.prototype.events = {
        //"annotationsLoaded": "setupUndo",
        "annotationCreated": "addAnnotationToUndoList"
    };
    
    /**
     * Plugin constructor. Runs when first instantiated.
     */
    function Undo(element, options) {
        Undo.__super__.constructor.apply(this, arguments); 

        this.keyboardUndo = __bind(this.keyboardUndo, this);
        this.undo = __bind(this.undo, this);

        $(document).on("keyup", this.keyboardUndo);

          
    }
    
    Undo.prototype.keyboardUndo = function(e){
        //TODO: support CMD Z on Mac: http://stackoverflow.com/questions/3902635/how-does-one-capture-a-macs-command-key-via-javascript
        if(e.which === 90 && e.ctrlKey){
            this.undo();
        }
    }

    Undo.prototype.undo = function(){
        console.log("calling undo");

        var annotation = recentAnnotations.pop();

        this.annotator.deleteAnnotation(annotation);
    }

    Undo.prototype.addAnnotationToUndoList = function(annotation) {
        //show Undo icon
        console.log("addAnnotationToUndoList", annotation);

        recentAnnotations.push(annotation);
    };

    return Undo;

})(Annotator.Plugin);
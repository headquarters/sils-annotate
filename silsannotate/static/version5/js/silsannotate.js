var AnnotationView = (function($, window){
    var self = this;
    
    self.textId = window.location.pathname.substr(window.location.pathname.lastIndexOf("/") + 1);
    if(self.textId == "a2-v0"){
        self.textId = "a2";
    }
    self.userId = window.location.href.match(/user=(\w+)/)[1];
    
    self.allowAnnotating = true;
    
    function setupAnnotator(){
        var content = $("article").annotator();

        content.annotator("addPlugin", "Store", {
            // The endpoint of the store on your server.
            prefix: apiRoot, // set at document level by Flask
    
            // Attach the uri of the current page to all annotations to allow search.
            annotationData: {
                "textId": self.textId,
                "userId": self.userId,
                "db": dbName
            },
    
            // This will perform a "search" action rather than "read" when the plugin
            // loads. 
            // eg. /store/endpoint/search?limit=20&uri=http://this/document/only
            loadFromSearch: {
                "limit": 0,
                "textId": self.textId,
                "db": dbName
            }
        });
        
        content.annotator("addPlugin", "Viewer");
        content.annotator("addPlugin", "Scrollbar");
    };    
    
    self.init = function(){
        if (!self.textId){
            alert("No textId provided in the URL.");
        }
        if(!self.userId) {
            alert('No userId provided. Add "?user=<userId> to the URL.');
        }
        
        setupAnnotator();
    };
    
    return self;
})(jQuery, window);

AnnotationView.init();

console.time("silsannotate.js document ready");
var enableAnnotation = true
$(document).ready(function(){
  // mark text containers
    $("p,h1,h2,h3,h4,h5,h6").addClass("text-container snippets")


    // prep the scrollbar:
    $("body")
        .append("<div id='scrollbar'></div>")
        .append("<div id='menubar' class='menubar-right menubar'>" +
                        "<div class='submenu enable-annotation'>" +
                            "<h3>Allow annotation</h3>" +
                            "<ul class='enable-disable-annotation'>" +
                                "<li><a class='on active'>On</a></li>" +
                                "<li><a class='off ready'>Off</a></li>" +
                            "</ul>" +
                        "</div>" +
                        "<div class='submenu display-style'>" +
                            "<h3>Annotation display style</h3>" +
                            "<ul class='display-style'>" +
                                "<li><a class='display-style hidden ready'>Hidden</a></li>" +
                                "<li><a class='display-style icons ready'>Icons</a></li>" +
                                "<li><a class='display-style snippets active'>Snippets</a></li>" +
                                "<li><a class='display-style full ready'>Full</a></li>" +
                            "</ul>" +
                      "</div>" +


                      "<div class='submenu users-count count' title='Total users'>" +
                        "<i class='fa fa-group'></i>" +
//                        "<i class='fa fa-user'></i>" +
                        "<span class='num users'></span>" +
                      "</div>" +

                      "<div class='submenu annotations-count count' title='Everyone&apos;s annotations'>" +
                        "<i class='fa fa-comments'></i>" +
                        "<span class='num annotations'></span> " +
                      "</div>" +

                      "<div class='submenu this-user-annotations-count count' title='Your annotations'>" +
                        "<i class='fa fa-comment'></i>" +
                        "<span class='num annotations'></span> " +
                      "</div>" +

                    "</div>")
      .append("" +
        "<div id='menubar-left' class='menubar-left menubar'>" +
          "<div class='submenu enable-highlights'>" +
            "<h3>Show highlights from</h3>" +
            "<ul class='enable-disable-highlights'>" +
                "<li><a class='on active'>Everyone</a></li>" +
                "<li><a class='off ready'>Just me</a></li>" +
            "</ul>" +
          "</div>" +
        "</div>")

    var url = window.location.pathname
    var cleanUrl = url.replace("sandbox/", "")
    var textId = cleanUrl.split("/")[3]
    var m = window.location.href.match(/user=(\w+)/)

    if (!m){
      alert("you have to be logged in to view; add '?user=<username>' to the url.")
    }

    var userId = m[1]

    var content = $(document.body).annotator();

    content.annotator('addPlugin', 'Store', {
        // The endpoint of the store on your server.
        prefix: apiRoot, // set at document level by Flask

        // Attach the uri of the current page to all annotations to allow search.
        annotationData: {
            'textId': textId,
            'userId': userId
            //'viewportOffset': $(annotation).offset().top
            //then load all annotations where viewportOffset < $(window).height()
        }

        // This will perform a "search" action rather than "read" when the plugin
        // loads. Will request the last 20 annotations for the current url.
        // eg. /store/endpoint/search?limit=20&uri=http://this/document/only
        ,loadFromSearch: {
            'limit': 0,
            'textId':textId
        }
    });
    
//addPlugin Store happens in about 7 ms

    content.annotator('addPlugin', "Scrollbar");
    //annotations are stored on the $.fn.data for each highlight
    //$('.annotator-hl').data("annotation");
console.timeEnd("silsannotate.js document ready");    
})
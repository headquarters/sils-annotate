import json, couchdb, os, shortuuid
import time
import inspect
from flask import render_template, request, make_response, g, abort
from jinja2 import TemplateNotFound
from silsannotate import app

couch = couchdb.Server(url=os.getenv("SILS_CLOUDANT_URL"))

@app.before_request
def set_db():
    g.start_time = time.time()
    # print request
    db_name = request.args.get("db")

    # Only access DB by name when this parameter is set
    # This parameter will NOT be set on requests to static assets in the local environment (maybe even on Heroku)
    if db_name:
        # Try to connect to whichever DB name was passed in through the URL
        # This flexibility is needed since up to 40 different users have their own database
        # Needs a try/except block, but can't figure out what kind of exception a missing DB throws
        g.db = couch[db_name]
        g.api_root = "/api"

@app.teardown_request
def teardown(exception=None):
    time_diff = time.time() - g.start_time

@app.errorhandler(500)
def internal_error(exception):
    app.logger.exception(exception)
    return render_template('500.html', 500)

@app.route('/')
def hello_world():
    return 'Hello World!'

@app.route('/<interface_name>/<text_id>')
def show_text(interface_name, text_id):
    try:
        return render_template("{0}/{1}.html".format(interface_name, text_id), dir_prefix=interface_name)
    except TemplateNotFound:
        abort(404, "No page found at this URL. URLs are in the format /<interface_name>/<text_id>?user=username&db=<db_name>.")

@app.route("/store")
def store_root():
    pass

@app.route("/api/search")
def search():
    textId = request.args.get("textId")
    limit = request.args.get("limit")
    # Limit doesn't work quite right here because if you only pull back the first 10 or 20
    # they may be completely at the bottom...is there a way to group or order by document *position*
    # rather than simply ID (which takes into account time, rather than position)???
    # view = g.db.view("main/by_textId", None, limit=limit)
    '''
    "ranges": [                                # list of ranges covered by annotation (usually only one entry)
        {
          "start": "/p[69]/span/span",           # (relative) XPath to start element
          "end": "/p[70]/span/span",             # (relative) XPath to end element
          "startOffset": 0,                      # character offset within start element
          "endOffset": 120                       # character offset within end element
        }
      ],
    order by ranges[0].start?
    '''    
    view = g.db.view("main/by_textId")
    
    matches = view[textId]

    ret = {
        "total": matches.total_rows,
        "rows": []
    }

    for anno in matches.rows:
        doc = anno["value"]
        doc["id"] = doc["_id"]
        ret["rows"].append(doc)

    resp = make_response(json.dumps(ret, indent=4), 200)
    resp.mimetype = "application/json"
    return resp

#@app.route("/delete-user-andy-pilot-annotations", methods=["GET"])
#def delete_empty_annotations():
#    view = g.db.view("main/user-andy-pilot")
#    for anno in view.rows:
#        del g.db[anno["id"]]
#    return "Done"

@app.route("/api/annotations", methods=["POST"])
def post_new_annotation():
    doc = request.json
    doc["_id"] = shortuuid.uuid()
    # Which database to save to?
    db_name = doc["db"]

    # Remove this so it isn't saved as part of the annotation
    del doc["db"]

    g.db = couch[db_name]

    if "annotationstudy1-2014" != db_name: # and "annotationplaypen" != db_name:
        # print "Saving to " + g.db.name
        couch_resp = g.db.save(doc)
        resp_object = { "db_name": db_name, "id": couch_resp[0], "_rev": couch_resp[1] }
    else:
        # Do not allow modifying the original annotation study database through the UI
        resp_object = { "id": doc["_id"], "_rev": 1 }

    resp = make_response(json.dumps(resp_object, indent=4), 200)
    resp.mimetype = "application/json"
    return resp

@app.route("/api/annotations/<id>", methods=["POST", "PUT"])
def edit_annotation(id):
    doc = request.json

    # Which database to save to?
    db_name = doc["db"]
    
    g.db = couch[db_name]

    # Remove this so it isn't saved as part of the annotation
    del doc["db"]

    if "annotationstudy1-2014" != db_name: # and "annotationplaypen" != db_name:
        couch_resp = g.db.save(doc)
        resp_object = { "id": couch_resp[0], "_rev": couch_resp[1] }
    else:
        # Do not allow modifying the original annotation study database through the UI
        resp_object = { "id": doc["_id"], "_rev": 1 }

    resp = make_response(json.dumps(resp_object, indent=4), 200)
    resp.mimetype = "application/json"
    return resp

@app.route("/api/annotations/<id>", methods=["DELETE"])
def delete_annotation(id):
    doc = request.json

    # Which database to save to?
    db_name = doc["db"]
    
    g.db = couch[db_name]

    doc = g.db[id]

    # rev = doc['_rev']
    rev = doc.json()['_rev']

    doc.delete(rev)
    # resp = g.db.delete(rev)

    print "REV"
    print rev
    print "RESPONSE"
    print resp

    #if "annotationstudy1-2014" != db_name: # and "annotationplaypen" != db_name:
    #    couch_resp = g.db.save(doc)
        # resp_object = { "id": couch_resp[0], "_rev": couch_resp[1] }

    #print couch_resp
    # Sample
    # $ curl -i -X DELETE http://example.com/api/annotations/d41d8cd98f00b204e9800998ecf8427e
    # HTTP/1.0 204 NO CONTENT (no content)
    # Content-Length: 0
    return '', 204
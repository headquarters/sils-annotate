sils-annotate
=============

A proof-of-concept application for supporting very-large-scale web annotation.


What's in here?
--------------

There are four parts:

1. The backend is written in Python using the [Flask](http://flask.pocoo.org/) microframework. It runs on Heroku.
Most of that's in in `silsannotate/views.py`.
2. The frontend is written in Javascript, based on the  
[okfn/annotator](https://github.com/okfn/annotator/) project. It's all in the `silsannotate/static/js` folder.
3. The data store is CouchDB, currently hosted on [Cloudant](http://cloudant.com).
4. The user and article data is in source control, even though it should be in the db. It's easier this way, especially
since they don't change over time. User data is simply a PNG picture whose name is the user's (made-up) first name.
They're in `silsannotate/static/img/users`. The documents to annotate are in `silsannotate/templates`; there's one 
for every article. Each article inherits a layout, so you only need to create the article "view" itself.

What's with all the versions?
----------

There are multiple versions of the interface for testing different prototypes. 

Each set of static files and templates is under a versioned folder, such as:

	static/version0/
	templates/version0/

This does create a lot of duplicate files, but it allows every version to have its own independent resources (JS, images, CSS, etc). That way, 
every prototype can have significant changes made without effecting other prototypes.


To edit locally
----------

You'll need to install and use Git. Thankfully, you can ignore 95% of what Git can do; you just need to be able
to clone, push, and commit. There are lots of tutorials on Git online. Here are a few: 

* http://www.webdesignerdepot.com/2009/03/intro-to-git-for-web-designers/
* http://www.youtube.com/GitHubGuides
* http://sixrevisions.com/resources/git-tutorials-beginners/


To install and run locally
-------------

First, make sure that Python and pip are installed. 

You can follow instructions from Heroku on [getting started](https://devcenter.heroku.com/articles/python) and cloning from an 
[existing project](https://devcenter.heroku.com/articles/git-clone-heroku-app). Once you've done that, you can get
the relevant configs by running `heroku config --app secure-dusk-1121`; you'll need to [set these up as environmental
variables](https://devcenter.heroku.com/articles/config-vars) on your system.

Once the code is pulled down through GitHub or from the Heroku project, you can run 
	
	pip install -r requirements.txt

to install all the requirements for the project. 





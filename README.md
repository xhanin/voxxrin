Voxxr.in
========

Voxxr.in is a tool to bring interactivity to your talks, training, meetings, you name it!

You can host it yourself, or apply to use http://voxxr.in hosting by contacting info@voxxr.in.

Source organization
-------------------

Sources are organized in modules:

*   voxxr-web is the main module, containing both
    *   the main server part (in src/main/java), sometimes called agenda service or schedule service, developed in Java running on Google App Engine for Java.
    *   the client in web folder, with:
        *   m.html the main client web app (also packaged as an app with phonegap)
        *   d.html a dashboard component
        *   p.html a poll result component

_Note : If you need to deploy the app on GAE, you will need to download & install ivy, then run a `ant -lib ivy.jar deps` in voxxr-web folder to copy your libraries to WEB-INF/lib folder._

*   voxxr-room is the module with the real time room service, developped in Java using atmosphere and cassandra
    There are also scripts to deploy it on ovh public cloud service
*   voxxr-home-j is the source of the front web server serving http://voxxr.in/ hosted on GAE, nothing fancy here
*   voxxr-devoxx-crawler is the module which allow to crawl the devoxx rest API and feed the agenda it
    (for Devoxx France schedule at the time being). It is using node.js and can be deployed on heroku.

_You can easily deploy it on heroku by running a `git subtree push --prefix voxxr-devoxx-crawler heroku master` command._

*   voxxr-droid is the module which allow to package the app as an android app, thanks to phonegap
*   voxxr-ios is the same for ios
*   voxxr-prez is the source of the presentation for which Voxxr.in was originally developped by Xavier Hanin.
    This presentation heavily relies on impressjs and a good browser in general (tested mainly on chrome).
    This presentation embeds both the actual presentation and the structure to embed a dashboard, poll results and
    commands in an html5 presentation. In the future the structure should be extracted from the presentation content to
    be easily reusable with other presentations.

IDEA Configuration
------------------

To configure IDEA properly (without having to change/ignore anything after `git clone`), you will need :
* Having custom Plugins `IvyIDEA` and `NodeJS` installed
* A JDK 1.6 or greater configured as your default Project JDK
  Note that to work properly you will have to name this JDK "1.7", yes this is weird ! (see [this tweet](https://twitter.com/fcamblor/status/327434205380354048))
* Install GAE Java SDK 1.7.5 in $USER_HOME$/tools/appengine/appengine-java-sdk-1.7.5
* Install Android SDK 2.3.3 on your filesystem, then reference it in the Platform Setting/SDKs section, with the exact name "Android 2.3.3 Platform"
  Note that to install it, you will need to install [ADT Bundle](http://developer.android.com/sdk/index.html). Once installed, run the `sdk/tools/android` package manager
  which will download and install the proper Android SDK.
* Run `ant -lib ivy.jar compile` on `voxxr-web` project, which will fetch needed ivy dependencies and paste them in `WEB-INF/lib` folder
  Note that if you come to change any ivy dependency, you should re-run the `ant -lib ivy.jar compile` to update libraries accordingly.

License
-------

Unless otherwise noted (especially for dependencies), this source code is dually licensed with MIT and GPL licenses.

Status
------

This project was originally developped as a toy project, no intent to have clean code, so you can expect rough edges.


Development
-----------

The best way to develop on Voxxr.in is to use IntelliJ IDEA, which has excellent Java and HTML/CSS/JS support.
IDEA metadata are currently commited here which should help to import it, though you may still have problems with
some hardcoded paths (pull requests welcomed!).
You will need the IvyIDEA plugin in IntelliJ to resolve the dependencies.

For client only development you don't even need an IDE if you don't want: edit the html / less / js they will by default
access server on http://app.voxxr.in .

In voxxr-web there is a watch.js that you can run with "node watch.js" to automatically recompile the less file into a
regular css.

Dependencies
------------
Please note that some (many?) dependencies (especially js) used here have been forked and slightly patched,
without using a real github fork :(

Check the file history to see what has changed compared to the original version.

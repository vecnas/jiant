Jiant
=====

    Javascript Interface Abstract Notation

The aim of this project is maximally reduce complexity of large ajax, highly dynamic 
javascript project development and support. 

It provides means for modern auto-complete tools. Jiant eliminates usage of strings for UI elements identification
as far as possible, replacing it by variables. It also moves linking of html elements to javascript variables 
from execution time to start time where possible.

Jiant is more of philosophy how to develop application, not particular technical implementation of set of tricks.


Global principles Jiant bases on
--------------------------------
1) any UI consists of View widgets, every widget is unique in frames of interface. Examples of View:

    a) ContactListView (represents list of contacts)
    b) NewContactView (screen or widget for new contact creation)
    c) MainMenuView (application main menu)
    d) MainLayoutView (general layout of application)

2) each View consists of components:

    a) MainLayoutView contains several panels for menu, main widget, tooolbar, etc
    b) NewContact contains set of inputs to enter data, and control to submit it, may be control to reset it

3) best approach to UI generation is to put ready to use parts of code and then use them, not generate 
with DOM or string manipulation. So using View for unique widgets and templates for repeating elements.


Fast start
----------

1) define UI specification as json variable in following form:

    var myappId = myappId || (function(jiant) {    
      var container = jiant.container,
          ctl = jiant.ctl,
          label = jiant.label;
      return {
      
        ajax: {
          getData: function(dataId, cb) {}
        },
        
        views: {
          mainLayoutView: {
            contentContainer: container,
            menuContainer: container,
            title: label
          },
          mainMenuView: {}
        },
        
        templates: {
          tmMenuItem: {
            control: ctl  
          }
        },
        
      };
    })(jiant);

  Note - no html or javascript coding on this stage, that's important part of Jiant philosophy - you now working 
  with abstract interface, that's point of separation of view and logic
  
2) Implement each view UI in html, like

    <div id="_mainLayoutView">
      <h1 class="_title"></h1>
      <div class="_menuContainer></div>
      <div class="_contentContainer></div>
    </div>
    
  or
  
    <ul id="_mainMenuView"></ul>
    
  or template:
  
    <div id="_tmMenuItem">
      <li>
        <a class="_control">!!label!!</a>
      </li>
    </div>
    
3) on document ready call

    jiant.bindUi("_", myappId);
    
4) and work with views or ajax calls to server without referring to HTML 
  (each View and view controls referring to jQuery objects now):

    var main = myappId.views.mainLayoutView,
        menu = myappId.views.mainMenuView,
        tmMenuItem = myappId.templates.tmMenuItem;
        
    main.menuContainer.append(menu);
    myappId.ajax.getData(someDataIdHere, function(serverData) {
      jQuery.each(serverData.menuItems, function(idx, menuItem) {
        var menuElem = tmMenuItem.parseTemplate({label: menuItem.labelText});
        menu.append(menuElem);
        menuElem.control.click(function() {
          alert("Where we are go today?");
        });
      });
    });
    
    
How it works
------------

Always call bindUi on Document.ready event, for example as first line in document ready function.

Views and templates are bound to HTML elements with id equal to prefix + name. 
Controls inside of view or template are bound to classes inside of according element.
So you can refer to same element using different controls:

    <div id='_someView'>
      <button class="_allCtls _ctlOk>Ok</button>
      <button class="_allCtls _ctlCancel>Cancel</button>
    </div>
    
    ----------------
    
    views: {
      someView: {
        ctlCancel: ctl,
        ctlOk: ctl,
        allCtls: collection
      }
    }

All elements are bound at startup time, except jiant.lookup, which replaced by jQuery.find function.
When binding elements, Jiant reports all missing HTML elements to console, and finally gives summary alert 
to developer with clear description, like "expected element of class _someClass inside of #someId view".
Examples of error message:

    non existing object referred by class under object id '_tmRelationProposal', check stack trace for details, expected obj class: _ctlAccept 
    non existing object referred by id, check stack trace for details, expected obj id: _reward 

Templates actually bound twice - first on declaration, at startup time, and later after parsing template 
and returning resulting element - declared controls also bound to variables.

View and template are bound via extending UI declaration variable by jQuery object properties and functions. 
Message for developer printed to console, if any collisions occur (for example, name some element "text"
while jQuery provides function "text". 

All controls are replaced by related jQuery objects. This means - we can refer to View or Template and store
references to them at any time, but can refer to controls of View only after binding UI performed.


Full currently available API
----------------------------

    jiant.bindUi(prefix, root, devMode)
    
should be called when all HTML elements are available, binds UI definition to actual HTML UI implementation.
prefix parameter is string to add to element name for HTML resolution. 
For example, if use prefix "myapp_" in example above, then HTML elements should be named 
myapp_mainLayoutView. Empty prefix "" could be used to have exactly same id and class names as declared in UI spec.
root parameter is root of json, it could contain following nodes (all are optional):

    views - children of this element are bound as view
    templates - children of this element are bound as templates
    ajax - children of this template automatically replaced with ajax calls to server
    
Parameter devMode turns on and off DEV_MODE, by default it is off. logInfo works only in DEV_MODE, see below 
more details.
Next is

    jiant.handleErrorFn - function to be called on errors from server, by default it prints error to console, if available
    
This function accepts one parameter, error text.
Two functions exposed for convenience, print info or error messages to console, if available:

    jiant.logInfo
    jiant.logError
    
Control types. Mainly used for UI document read convenience:

    jiant.collection
    jiant.container,
    jiant.ctl,
    jiant.fn,
    jiant.form,
    jiant.grid,
    jiant.image,
    jiant.input,
    jiant.inputInt,
    jiant.label,
    jiant.lookup,
    jiant.pager,
    jiant.slider,
    jiant.stub,
    jiant.tabs

Few of them add extra features to described HTML element:

    jiant.tabs - called elem.tabs() during binding, will work only if jqueryui available
    jiant.inputInt - adds keydown listener to bound HTML input, to restrict it to numbers and some other keys, 
               like arrows, tab, home/end
    jiant.lookup - replaced by jQuery.find function, such elements are not bound and verified at application start time
    jiant.pager - exposes object 
        {onValueChange: function(callback), 
         updatePager: function(page)}
         and builds bootstrap-compatible HTML infrastructure inside of element declared as pager. 
         That's experiment about building whole UI framework around Jiant

Parameters:

    jiant.DEV_MODE
    jiant.PAGER_RADIUS

first turns on development mode, could be set at any time or as 3rd argument for bindUi call. Dev mode means
print info logs and alert developer about not bound elements as additional notification (to not miss error 
because didn't take a look at console).

seconds specifies "radius" of pager - amount of pages to show before and after currently selected, if jiant.pager
control used


Templates
---------

All templates expose function 

    parseTemplate(data)
    
which produces jQuery element with all UI specification fields bound to resulting HTML elements.
And second function

    parseTemplate2Text(data)
    
which return plain string
Template format is 

    !!var!! 
    
for substituted values. For example:

    <div id="_tmSomeTemplate">
      !!substituteMeByValue!!
      <b>!!substituteMeByValue.andMyChildToo!!</b>
    </div>
    
Note, that root element of template is not included into result, so when referring to template, 
we talk abount innerHTML. For View - root element included, that's the difference.
When using table rows as template, best layout is following:

    <table style="display: none;">
      <tbody id="_tmRelationFriend" >
        <tr>
          <td><span class="_ctlDetails context_help">!!name!!</span></td>
          <td><span class="_ctlCancel clickable">X</span></td>
        </tr>
      </tbody>
    </table>

That's because browsers always add tbody element, so when declaring just <tr> - will get table with lot of tbodies.

When using image src as substituted value:

    <div id="_tmImage">
      <img src="!!imgSrc!!"/>
    </div>
    ----------------------
    In Chrome:
    GET http://localhost/!!imgSrc!! 404 (Not Found) 

getting 404 in console. There are 3 solutions: add images with such strange names to web application, 
or just ignore, or put template as script body:

    <script id="_tmImage" type="text/html">
       <img class="_img" src="!!imgSrc!!"/>
    </script>
    --------------------
    // this ok - 
    templates: {
      tmImage: {}
    }
    --------------------
    // but this is not ok - 
    templates: {
      tmImage: {
        img: ctl
      }
    }
 
in last case whole DOM structure will be unavailable at start time, so referring template controls 
will produce errors. However parsing template will still produce bound elements. 
I personally always prefer don't use script tags for templates content.


Ajax
----

applicationId.ajax section must contain function declarations only. Example:

    ajax: {
    
       getContact: function(id, cb) {},
       getUserData: function(id, cb) {},
       listContacts: function(cb) {},
       saveContact: function(contactData, cb) {}
       
    }

Each declaration is replaced by actual ajax performer function (jQuery.ajax).
Last request parameter should be always async callback function.
Anti cache parameter always added to call (named antiCache3721, contains current timestamp) to protect vs browser cache.
Request results analized and passed as array or java object or raw data to callback function (defined automatically).
When actual call performed, last argument always supposed to be callback, so any optional arguments should 
be placed just before it, for example:

    myapp.ajax.getUserData(userId, function(contactData) {});
    myapp.ajax.getUserData(function(contactData) {}); // get currently logged user data, no userId sent to server
    
    myapp.ajax.getUserData(userId); //will interpret userId as callback and don't pass parameter to server
    
Important - when doing ajax call, {traditional: true} used. Complex parameters passed in following manner:

    var contact = {
      fname: "Tom",
      lname: "Jerry",
      moreComplexParam: {}
    };
    
    myapp.ajax.saveContact(contact, function(result) {});
    ------------------------
    produces:
    http://localhost/saveContact?contact.fname=Tom&contact.lname=Jerry&contact.moreComplexParam=[object]
    
If use pure Jquery - with traditional you will get

    http://localhost/saveContact?contact=[object]

and without traditional - fully encoded contact object like

    http://localhost/saveContact?contact%5D.. etc

This behaviour is for best Spring integration. If you dislike, always can still use direct jQuery call:

    jQuery.ajax("/saveContact", etc....


DEV MODE
--------

To simplify development - DEV MODE introduced. When in dev mode - lot of debug printed into console, all bindings:

    binding UI for view: dailyBonus jiant.js:147
        bound UI for: container jiant.js:147
        bound UI for: ctls 
        
ajax bindings:

    binding ajax for function: getUserHomeInfo 
    binding ajax for function: getUserStatistics
    binding ajax for function: i18n 
    
any ajax actual calls:

    getChannelToken has returned {"obj":"channel-ek7t0k-1360440635275-111"} 
    
any errors added to final error alert (shown only if errors present in code).

ctl+alt+shift+mouse click any element on UI will show nearest bound element, useful to identify UI 
element fast without looking at html source

DEV MODE could be turned on by providing 3rd argument to bindUi call or via direct setting jiant.DEV_MODE.
Note, if you setting it after binding performed - debug click handlers not assigned.

    
Spring
------

For better Spring (java framework) integration now 2 features added:

1) passing complex parameters as name.field - see few rows above

2) auto checking returned call object - because void controller methods return not proper json (empty string)
and without use of Jiant - you always should know is returned value void or some data, and use jQuery.getJSON
or jQuery.ajax depending on it


Possible extensions
-------------------

1) replace binding function to bind UI to some stubs for testing purposes - view, template and ajax

2) specific behaviour depending on UI element type (jiant.label, jiant.container, etc), 
like now jiant.tabs are bound to jQuery.tabs call

3) HTML element type verification, for example prevent binding of jiant.input to div element


Summary
-------

I've found following application areas improved with Jiant:

1) documentation, because of UI specification file

2) performance, because of start time resolution

3) quality, because of start time verification

4) debug, because of possibility to put your hooks or debug staff into single place

5) speed of modification, because of easier to find staff usage code


Advertisement (full of excitement)
----------------------------------

what I get when using Jiant (because written it just to simplify my own life):

1) auto complete in IDE, instead of 

    elem.find(".someClass")

, write 

    elem.so 

and press enter, space or what is fast key for autocomplete

2) and - no errors when referring HTML, because Jiant already checked all references and notified about any mistakes

3) protection from web designer - because designer deleted some UI elements when re-designed page 
with working functionality, and Jiant notified me about it

4) life of designer is simpler - (s)he just designs web page, not dynamically produced staff

5) project fully documented - all ajax calls, views, templates and all are reachable via "go to usage" 
in my favorite IDE

6) highest level of UI abstraction, may be it's possible to teach business analyst to describe interface in Jiant format?

7) Jiant adds it's benefits without asking for your soul as cost, for example following code lines 2 and 3 are equal 
except 3 is faster because reference to HTML element already resolved:

    var mainView = myapp.views.mainView;
    mainView.find("._someClass").attr("css", "border: 1px");
    mainView.someClass.attr("css", "border: 1px");
    
So if you need any specific not covered by Jiant binding - just use great jQuery objects and get anything you want.

8) follows from previous - Jiant could be added on any stage to any project, it doesn't require you cancel your 
current religion and believe in new God. It just not wonders when your believe comes to him in natural way. 
You may use Jiant binding inside of existing code and move to Jiant when feel how simpler your life becomes.

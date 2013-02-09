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
1) any UI consists of View widgets, every widget is unique being in frames of interface. Examples of View:

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

Templates actually bound twice - first on declaration, at startup time, and later after parsing template 
and returning resulting element - declared controls also bound to variables.

View and template are bound via extending UI declaration variable by jQuery object properties and functions. 
Message for developer printed to console, if any collisions occur (for example, name some element "text"
while jQuery provides function "text". 

All controls are replaced by related jQuery objects. This means - we can refer to View or Template and store
references to them at any time, but can refer to controls of View only after binding UI performed.

    
Full currently available API
----------------------------

    jiant.bindUi(prefix, root)
    
should be called when all HTML elements are available, binds UI definition to actual HTML UI implementation.
prefix parameter is string to add to element name for HTML resolution. 
For example, if use prefix "myapp_" in example above, then HTML elements should be named 
myapp_mainLayoutView. Empty prefix "" could be used to have exactly same id and class names as declared in UI spec.
root parameter is root of json, it could contain following nodes:

    views - children of this element are bound as view
    templates - children of this element are bound as templates
    ajax - children of this template automatically replaced with ajax calls to server
    
Next is

    handleErrorFn - function to be called on errors from server, by default it prints error to console, if available
    
This function accepts one parameter, error text.
Two functions exposed for convenience, print info or error messages to console, if available:

    logInfo
    logError
    
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


Possible extensions
-------------------

1) replace binding function to bind UI to some stubs for testing purposes - view, template and ajax

2) specific behaviour depending on UI element type (jiant.label, jiant.container, etc), 
like now jiant.tabs are bound to jQuery.tabs call

3) HTML element type verification, for example prevent binding of jiant.input to div element

Summary
-------

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
    
    
How it works internally
-----------------------

working on this section right now
    
Full currently available API
----------------------------

Jiant
=====

Javascript Interface Abstract Notation

The aim of this project is maximally reduce complexity of large jscript project development and support. 
It provides means for modern auto-complete tools. Jiant eliminates usage of strings for UI elements identification
as far as possible, replacing it by variables.

Global principles Jiant bases on
------------------------------------------
1) any UI consists of View widgets, every widget is unique being in borders of interface. Examples of View:

  <li> ContactListView (represents list of contacts)
  <li> NewContactView (screen or widget for new contact creation)
  <li> MainMenuView (application main menu)
  <li> MainLayoutView (general layout of application)

2) each View consists of components:
  a) MainLayoutView contains several panels for menu, main widget, tooolbar, etc
  b) NewContact contains set of inputs to enter data, and control to submit it, may be control to reset it

Jiant
=====

    Javascript Interface Abstract Notation

The aim of this project is maximally reduce complexity of large ajax, high dynamic 
javascript project development and support. 

Initially Jiant provided means for modern auto-complete tools. Jiant eliminates usage of strings for UI elements identification as far as possible, replacing it by variables. It also moves linking of html elements to javascript variables from execution time to start time when possible.

Later evolution made Jiant covering all aspects of client UI framework, such as server connectivity, application states, event bus, data models, MVC implementation, templating, cross domain, dependency management, program logic abstraction.

Cross-domain notes
------------------

- Cross-domain requests and module loading rely on standard CORS headers from the remote origin.
- Set `appRoot.crossDomain = true` for cross-domain calls, and `appRoot.withCredentials = true` only if you need cookies/credentials.

Jiant is more of philosophy how to develop application, not particular technical implementation of set of tricks.

Documentation website on Jiant: http://sites.google.com/site/jiantscript/

Website updated to Jiant version 1.00

Latest todomvc version: https://github.com/vecnas/todomvc-jiant-2020

Документация на русском языке: http://vecnas.github.io

Ближайшие наработки
-------------------

- визуальный граф приложения

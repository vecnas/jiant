Usage Examples

This folder contains runnable browser demos for Jiant. Start a local HTTP server from the repo root
and open the HTML files in a browser (AJAX and module loading require http/https, not file://).

Index
- index.html: main interactive demo (views, templates, events, states, ajax)
- test_ajax.html: ajax helpers (prefix/override)
- test_render.html: optional components and template rendering
- test_templates.html: template parsing and binding examples
- cross_models/: cross-model demo
- filter/: filter UI demo
- init_onpropagate/: init + propagate demo
- tutorial/: module basics tutorial

Notes
- Examples use native DOM APIs.
- Most examples now use jiant.app instead of the legacy bindUi.

if (! window.jiant) {
  alert("Use this script when Jiant available on a page");
} else {
  jiant.setUiFactory(new function() {

    function view(prefix, root, appRoot, viewId, viewContent, setupExtras) {
      var viewElem = $("<div></div>");
      viewElem.attr("id", prefix + viewId);
      viewElem.attr("title", "view: " + viewId);
      $("body").append(viewElem);
      $.each(viewContent, function(elemId, elemSpec) {
        var elem;
        if (elemSpec == jiant.input || elemSpec == jiant.inputInt) {
          elem = $("<input type='text'/>");
        } else if (elemSpec == jiant.ctl) {
          elem = $("<button>" + elemId + "</button>");
        } else {
          alert("Unsupported element type: " + elemSpec);
          elem = $("<div>" + elemId + "</div>");
        }
        elem.attr("class", prefix + elemId);
        elem.attr("title", viewId + "." + elemId);
        viewElem.append(elem);
        setupExtras(appRoot, elem, elemSpec, viewId, elemId);
      });
      return viewElem;
    }

    function template(prefix, root, appRoot, tmId, tmContent) {
    }

    function start() {}

    function end() {}

    return {
      end: end,
      start: start,
      template: template,
      view: view
    }

  });
}

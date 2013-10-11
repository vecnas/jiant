if (! window.jiant) {
  alert("Use this script when Jiant available on a page");
} else {
  jiant.setUiFactory(new function() {

    function view(prefix, viewId) {
      var viewElem = $("<div>" + viewId + "</div>");
      viewElem.attr("id", prefix + viewId);
      viewElem.attr("title", "view: " + viewId);
      viewElem.attr("class", "jiant_view");
      $("body").append(viewElem);
      return viewElem;
    }

    function template(prefix, tmId, tmContent) {
      var tmElem = $("<div><div>" + tmId + "</div></div>");
      tmElem.attr("id", prefix + tmId);
      tmElem.attr("title", "tm: " + tmId);
      tmElem.attr("class", "jiant_tm");
      tmElem.hide();
      $("body").append(tmElem);
      return tmElem;
    }

    function viewComponent(viewElem, viewId, prefix, componentId, componentContent) {
      var elem;
      if (componentContent == jiant.input || componentContent == jiant.inputInt) {
        elem = $("<input type='text'/>");
      } else if (componentContent == jiant.ctl) {
        elem = $("<button>" + componentId + "</button>");
      } else if (componentContent == jiant.container) {
        elem = $("<div>" + componentId + "</div>");
      } else if (componentContent == jiant.pager) {
        elem = $("<div>" + componentId + "</div>");
      } else {
        alert("Unsupported element type: " + componentContent);
        elem = $("<div>" + componentId + "</div>");
      }
      elem.attr("class", prefix + componentId + " jiant_elem");
      elem.attr("title", viewId + "." + componentId);
      viewElem.append(elem);
      return elem;
    }


    return {
      template: template,
      view: view,
      viewComponent: viewComponent
    }

  });
}

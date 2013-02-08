jQuery(function ($) {

  var askView = helloJiant.views.askView,
      showView = helloJiant.views.showView,
      templ = helloJiant.templates.templ,
      templ2 = helloJiant.templates.templ2,
      name;

  jiant.bindUi("_", helloJiant);

  askView.brokenCtl.click(function() {
    alert("never");
  });

  askView.setNameCtl.click(function() {
    name = askView.nameInput.val();
    showView.nameLabel.html(name);
  });

  askView.addTemplateCtl.click(function() {
    var elem = templ.parseTemplate({name: name});
    showView.templatedContainer.append(elem);
  });

  askView.addTemplate2Ctl.click(function() {
    var elem = templ2.parseTemplate({name: name});
    showView.templatedContainer.append(elem);
    elem.name.click(function() {
      elem.name.html(name ? name : "");
    });
  });

  askView.colorizeLookupsCtl.click(function() {
    showView.name().css("color", "#33f");
  });

});

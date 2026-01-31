jiant.onUiBound(helloJiant, function() {


  alert(2);

  jiant.dom.on(helloJiant.views.askView.brokenCtl, "click", function() {
    jiant.css(helloJiant.views.askView.brokenCtl, "background-color", "#ff0");
  });

});

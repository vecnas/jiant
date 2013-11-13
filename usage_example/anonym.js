jiant.onUiBound(helloJiant, function() {


  alert(2);

  helloJiant.views.askView.brokenCtl.click(function() {
    helloJiant.views.askView.brokenCtl.css("background-color", "#ff0");
  });

});

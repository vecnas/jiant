jiant.module("m0",function() {

  $("body").append("<h1>M0 text</h1>");

  return {
    setColor: function(color) {
      $("body").css("background-color", color);
    }
  }

});
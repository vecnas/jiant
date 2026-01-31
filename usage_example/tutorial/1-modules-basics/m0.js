jiant.module("m0",function() {

  const h1 = document.createElement("h1");
  h1.textContent = "M0 text";
  jiant.dom.append(document.body, h1);

  return {
    setColor: function(color) {
      jiant.css(document.body, "background-color", color);
    }
  }

});

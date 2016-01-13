/*
0.01 initial several custom types
 */
(function() {

  jiant.types = {
    inputFloatRu: "inputFloatRu",
    inputFloatRu0: "inputFloatRu0",
    numLabel00: "numLabel00"
  };

  jiant.registerCustomType(jiant.types.inputFloatRu, function (elem) {
    elem.change(function () {
      elem.val(elem.val().replace(",", "."))
    });
    var oldVal = elem.val;
    elem.val = function (value) {
      if (arguments.length == 0) {
        var currVal = oldVal.apply(elem);
        return currVal == "" ? "0" : currVal;
      } else {
        if (value + "" == "0") {
          return oldVal.apply(elem, [""]);
        } else {
          return oldVal.apply(elem, arguments);
        }
      }
    }
  });

  jiant.registerCustomType(jiant.types.inputFloatRu0, function (elem) {
    elem.change(function () {
      elem.val(elem.val().replace(",", "."))
    });
  });

  jiant.registerCustomType(jiant.types.numLabel00, function (elem) {
    var html = elem.html;
    elem.html = function (num) {
      if (!num && num != 0) {
        html.call(this, num);
      } else if (parseInt(num) == num) {
        html.call(this, num + ".00");
      } else if (num.toFixed) {
        html.call(this, num.toFixed(2));
      } else {
        html.call(this, num);
      }
    }
  });
})();

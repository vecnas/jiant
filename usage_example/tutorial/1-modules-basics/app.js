(function(jiant) {

  jiant.DEV_MODE = true;

  jiant.module("m1", ["m0"], function($, app, jiant, params, m0) {
    $("body").append("<h1>M1 text</h1>");
    $(document).click(() => m0.setColor("lime"));
  });

  const app = {
    id: "modules-basics",
    modules: ["m0", "m1"]
  };

  jiant.app(app);

})(jiant);
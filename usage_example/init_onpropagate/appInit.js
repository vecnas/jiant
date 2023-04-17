(function(jiant) {

  const app = {

    id: "init-onpropagate-test",

    appPrefix: "_",

    modules: ["initMain", "initBtnLogic"],

    views: {
      main: {
        btns: jiant.optional(jiant.comp("btnTm")),
        mainBtn: jiant.comp("btnTm")
      }
    },

    templates: {}

  };

  jiant.app(app);

})(jiant);
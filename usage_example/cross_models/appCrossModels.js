(function(jiant) {

  const app = {

    id: "cross_models",

    appPrefix: "_",

    modules: ["crossModelsMain", "testData"],

    views: {
      superView: {
        subs: jiant.optional(jiant.comp("tmSub")),
        total: jiant.numLabel
      }
    },

    templates: {
      tmSub: {
        name: jiant.label,
        price: jiant.numLabel
      }
    },

    models: {
      sub: {
        jRepo: {
          sumPrice: function() {}
        },
        name: function(val) {},
        price: function(val) {}
      },
      // such dependency doesn't work currently with propagate data-binding engine and jiant.comp
      // changes in underlying model should fire changes here
      // propagate should use current .all(), however filtered bindings desired
      super: {
        jRepo: {},
        subs: function() { return app.models.sub},
        total: function() {return app.models.sub.jRepo.sumPrice()}
      }
    }

  };

  jiant.app(app);

})(jiant);
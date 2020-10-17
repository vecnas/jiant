(function(jiant) {

  const app = {

    id: "filter",

    appPrefix: "_",

    modules: ["filterMain"],

    views: {
      filterView: {
        filters: jiant.optional(jiant.comp("filterTm"))
      },
      contentView: {
        optionBox: jiant.cssMarker
      }
    },

    templates: {
      filterTm: {
        label: jiant.label,
        options: jiant.optional(jiant.comp("optionTm"))
      },
      optionTm: {
        label: jiant.label
      }
    },

    models: {
      filter: {
        jRepo: {},
        optionBox: function(val) {}
      }
    }

  };

  jiant.app(app);

})(jiant);
var helloJiant = helloJiant || (function(jiant) {

  var ctl = jiant.ctl,
      container = jiant.container,
      input = jiant.input,
      label = jiant.label,
      lookup = jiant.lookup,
      tabs = jiant.tabs,
      fn = jiant.fn;
  return {

    views: {

      askView: {
        addTemplateCtl: ctl,
        addTemplate2Ctl: ctl,
        brokenCtl: ctl,
        colorizeLookupsCtl: ctl,
        nameInput: input,
        setNameCtl: ctl
      },

      showView: {
        nameLabel: label,
        templatedContainer: container,
        name: lookup
      },

      tabsPlayView: {
      }

    },

    templates: {

      templ: {
        name: label
      },

      templ2: {
        name: label
      }

    }
  };

})(jiant);

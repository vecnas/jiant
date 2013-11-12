var helloJiant = helloJiant || (function(jiant) {

  var goState = jiant.goState,
      collection = jiant.collection,
      container = jiant.container,
      ctl = jiant.ctl,
      form = jiant.form,
      fn = jiant.fn,
      grid = jiant.grid,
      image = jiant.image,
      input = jiant.input,
      inputInt = jiant.inputInt,
      label = jiant.label,
      lookup = jiant.lookup,
      on = jiant.on,
      pager = jiant.pager,
      slider = jiant.slider,
      stub = jiant.stub,
      tabs = jiant.tabs;

  return {

    id: "helloJiant",

    ajax: {

      getData: function(cb) {},
      getDataItem: function(id, cb) {},
      saveData: function(data2save, cb) {}

    },

    events: {

      custom1: {
        fire: function(message, userName) {},
        on: on
      },
      custom2: {
        fire: function(someParamToPass) {},
        on: on
      }

    },

    states: {

      main: {
        go: function(name, color) {},
        start: on,
        end: on,
        root: true
      },

      customEventsView: {
        go: function(eventType) {},
        start: on,
        end: on,
        root: false
      }

    },

    views: {

      askView: {
        addTemplateCtl: ctl,
        addTemplate2Ctl: ctl,
        brokenCtl: ctl,
        colorizeLookupsCtl: ctl,
        ctlNavCustom1: ctl,
        ctlNavCustom2: ctl,
        ctlNavMainBlue: ctl,
        ctlNavMainGreen: ctl,
        fire1Ctl: ctl,
        fire2Ctl: ctl,
        nameInput: input,
        setNameCtl: ctl
      },

      customEventsView: {
        ctlRoot: ctl,
        ctlMain: ctl,
        ctlMainBlue: ctl,
        eventsCountLabel: label,
        eventsTypeLabel: label,
        logContainer: container
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

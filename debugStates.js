(function () {

  var logger = {
    stateEndCallHandler: function(app, name, stateSpec, trace) {
      jiant.infop("!!. STATES. called state end handler: !!, registered at ", app.id, name, trace);
    },
    stateEndRegisterHandler: function(app, name, stateSpec) {
      jiant.errorp("!!. STATES. register state end handler: !!", app.id, name);
    },
    stateEndTrigger: function(app, name) {
      jiant.errorp("!!. STATES. trigger state end: !!", app.id, name);
    },
    stateError: function(app, name, stateSpec, message) {
      jiant.errorp("!!. STATES. state '!!' possible error: !!", app.id, name, message);
    },
    stateStartCallHandler: function(app, name, stateSpec, trace, args) {
      jiant.infop("!!. STATES. called state start handler: !!, registered at ", app.id, name, trace);
    },
    stateStartRegisterHandler: function(app, name, stateSpec) {
      jiant.errorp("!!. STATES. register state start handler: !!", app.id, name);
    },
    stateStartTrigger: function(app, name, params) {
      jiant.errorp("!!. STATES. trigger state start: !!, with params: !!", app.id, name, params);
    }
  };
  jiant.addListener(logger);
})();

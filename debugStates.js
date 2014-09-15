(function () {

  var logger = {
    debugStateEndCallHandler: function(app, name, stateSpec, trace) {
      jiant.infop("!!. STATES. called state end handler: !!, registered at ", app.id, name, trace);
    },
    debugStateEndRegisterHandler: function(app, name, stateSpec) {
      jiant.errorp("!!. STATES. register state end handler: !!", app.id, name);
    },
    debugStateEndTrigger: function(app, name) {
      jiant.errorp("!!. STATES. trigger state end: !!", app.id, name);
    },
    debugStateError: function(app, name, stateSpec, message) {
      jiant.errorp("!!. STATES. state '!!' possible error: !!", app.id, name, message);
    },
    debugStateStartCallHandler: function(app, name, stateSpec, trace, args) {
      jiant.infop("!!. STATES. called state start handler: !!, registered at ", app.id, name, trace);
    },
    debugStateStartRegisterHandler: function(app, name, stateSpec) {
      jiant.errorp("!!. STATES. register state start handler: !!", app.id, name);
    },
    debugStateStartTrigger: function(app, name, params) {
      jiant.errorp("!!. STATES. trigger state start: !!, with params: !!", app.id, name, params);
    }
  };
  jiant.addListener(logger);
})();

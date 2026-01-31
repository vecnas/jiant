document.addEventListener("DOMContentLoaded", function() {

  var app = helloJiant,
      name;

  jiant.onApp(app, function(app) {
    var obj1 = {
          a: 2,
          b: 3,
          c: {
            "d.f": 12,
            e: 15
          }
        },
        arr = [123, 456];
    app.ajax.traditionalTest(obj1, arr, function() {});
  });

  jiant.onApp(app, function(app) {
    jiant.logInfo("registered for onApp, immediate");
  });

  jiant.onApp(app, ["asObj"], function(app) {
    jiant.logInfo("registered for onApp 2, waiting for asObj");
  });

  jiant.onApp(app, [], function(app) {
    jiant.logInfo("registered for onApp 3, immediate");
  });

  jiant.onApp(app, ["asObj", "asObj2"], function(app) {
    jiant.logInfo("registered for onApp 4, waiting for asObj, asObj2");
  });

  jiant.onApp(app, ["asObj2"], function(app) {
    jiant.logInfo("registered for onApp 5, waiting for asObj2");
  });

  jiant.onApp(app, function() {
    jiant.logInfo("registered for onApp after bind");
  });

  jiant.onApp(app, ["asObj", "asObj2"], function(app) {
    jiant.logInfo("registered for onApp 6, waiting for asObj, asObj2");
  });

  jiant.onApp(app, ["ext0"], function(app) {
    app.logic.ext0.show();
  });

  jiant.declare("ext0", {
    show: function() {jiant.logInfo("show0")}
  });

  jiant.onApp(app, function(app) {
    var askView = app.views.askView,
        showView = app.views.showView,
        templ = app.templates.templ,
        templ2 = app.templates.templ2,
        dom = jiant.dom;

    app.ajax.getData();

    dom.on(askView.brokenCtl, "click", function() {
      alert("never");
    });

    dom.on(askView.setNameCtl, "click", function() {
      name = dom.getVal(askView.nameInput);
      app.states.main.go(name, undefined);
    });

    dom.on(askView.addTemplateCtl, "click", function() {
      var elem = templ.parseTemplate({name: name});
      dom.append(showView.templatedContainer, elem);
    });

    dom.on(askView.addTemplate2Ctl, "click", function() {
      var elem = templ2.parseTemplate({name: name});
      dom.append(showView.templatedContainer, elem);
      dom.on(elem.name, "click", function() {
        dom.html(elem.name, name ? name : "");
      });
    });

    dom.on(askView.colorizeLookupsCtl, "click", function() {
      var nameElem = typeof showView.name === "function" ? showView.name() : showView.name;
      jiant.css(nameElem, "color", "#33f");
    });

    dom.on(askView.fire1Ctl, "click", function() {
      app.events.custom1.fire("Just some message", name);
    });

    dom.on(askView.fire2Ctl, "click", function() {
      app.events.custom2.fire("Some rnd params");
    });

    app.states.main.start(function(name, color) {
      dom.html(showView.nameLabel, name);
      dom.setVal(askView.nameInput, name);
      jiant.css(askView, "background-color", color);
      jiant.show(askView);
    });

    app.states[""].start(function() {
      app.states.main.go();
    });

    app.states.main.end(function(name, color) {
      jiant.hide(askView);
    });

    dom.on(askView.ctlNavCustom1, "click", function() {
      app.states.customEventsView.go("custom1");
    });
    dom.on(askView.ctlNavCustom2, "click", function() {
      app.states.customEventsView.go("custom2");
    });
    dom.on(askView.ctlNavMainBlue, "click", function() {
      app.states.main.go(undefined, "blue");
    });
    dom.on(askView.ctlNavMainGreen, "click", function() {
      app.states.main.go(undefined, "green");
    });

    app.logic.asObj.implement({
      test: function() {jiant.logInfo("test is called");},
      test2: function() {jiant.logInfo("test2 is called");}
    });
    app.logic.asObj2.implement({});
    app.logic.asObj.test(22, 44);
    app.logic.asObj.test2("zzz");

    app.models.test.id.on(function(test, id) {
      jiant.logInfo("id field changed to " + id);
    });
    app.models.test.on(function(test, val) {
      jiant.logInfo("test object changed to ", test, val);
    });
    app.models.test.id(3);
    jiant.logInfo("id must be 3: " + app.models.test.id());
    app.models.test.tt(2);
    jiant.logInfo("tt must be 2: " + app.models.test.tt());
    app.models.test.setIdAndTt(13, 222);
    jiant.logInfo("id must be 13: " + app.models.test.id());
    jiant.logInfo("tt must be 222: " + app.models.test.tt());

    (function(app) {
      var counts = {
        custom1: 0,
        custom2: 0
      };
      app.events.custom1.on(function(message, userName) {
        var line = document.createElement("div");
        line.textContent = "got custom1 event with message: " + message + " with name: " + userName;
        dom.append(app.views.customEventsView.logContainer, line);
        counts.custom1++;
      });
      app.events.custom2.on(function(someParamToPass) {
        var line = document.createElement("div");
        line.textContent = "got custom2 event with params: " + someParamToPass;
        dom.append(app.views.customEventsView.logContainer, line);
        counts.custom2++;
      });

      app.states.customEventsView.start(function(eventType) {
        jiant.show(app.views.customEventsView);
        eventType = eventType == "custom1" ? "custom1" : "custom2";
        dom.html(app.views.customEventsView.eventsTypeLabel, eventType);
        dom.html(app.views.customEventsView.eventsCountLabel, "" + counts[eventType]);
      });
      app.states.customEventsView.end(function(params) {
        jiant.hide(app.views.customEventsView);
      });

      dom.on(app.views.customEventsView.ctlMain, "click", function() {
        app.states.main.go("", "");
      });
      dom.on(app.views.customEventsView.ctlMainBlue, "click", function() {
        app.states.main.go(undefined, "blue");
      });

      dom.on(app.views.askView.fire1Ctl, "click", function() {
        app.templates.templ.parseTemplate({name: "agaaga"});
      });

      dom.on(app.views.customEventsView.ctlRoot, "click", function() {
        jiant.goRoot();
      });

    })(app);

  });

  jiant.app(app);

});

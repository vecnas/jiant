jQuery(function ($) {

  var app = helloJiant,
      askView = helloJiant.views.askView,
      showView = helloJiant.views.showView,
      templ = helloJiant.templates.templ,
      templ2 = helloJiant.templates.templ2,
      name;

  jiant.bindUi("_", helloJiant, true);

  askView.brokenCtl.click(function() {
    alert("never");
  });

  askView.setNameCtl.click(function() {
    name = askView.nameInput.val();
    helloJiant.states.main.go(name, undefined);
  });

  askView.addTemplateCtl.click(function() {
    var elem = templ.parseTemplate({name: name});
    showView.templatedContainer.append(elem);
  });

  askView.addTemplate2Ctl.click(function() {
    var elem = templ2.parseTemplate({name: name});
    showView.templatedContainer.append(elem);
    elem.name.click(function() {
      elem.name.html(name ? name : "");
    });
  });

  askView.colorizeLookupsCtl.click(function() {
    showView.name().css("color", "#33f");
  });

  askView.fire1Ctl.click(function() {
    app.events.custom1.fire("Just some message", name);
  });

  askView.fire2Ctl.click(function() {
    app.events.custom2.fire("Some rnd params");
  });

  app.states.main.start(function(name, color) {
    showView.nameLabel.html(name);
    $("body").css("background-color", color);
    askView.show();
  });

  app.states.main.end(function(name, color) {
    askView.hide();
  });

  askView.ctlNavCustom1.click(function() {
    app.states.customEventsView.go("custom1");
  });
  askView.ctlNavCustom2.click(function() {
    app.states.customEventsView.go("custom2");
  });
  askView.ctlNavMainBlue.click(function() {
    app.states.main.go(undefined, "blue");
  });
  askView.ctlNavMainGreen.click(function() {
    app.states.main.go(undefined, "green");
  });


  var customHandler = (function(app) {
    var counts = {
      custom1: 0,
      custom2: 0
    };
    app.events.custom1.on(function(message, userName) {
      app.views.customEventsView.logContainer.append("got custom1 event with message: " + message + " with name: " + userName);
      counts.custom1++;
    });
    app.events.custom2.on(function(someParamToPass) {
      app.views.customEventsView.logContainer.append("got custom2 event with params: " + someParamToPass);
      counts.custom2++;
    });

    app.states.customEventsView.start(function(eventType) {
      app.views.customEventsView.show();
      eventType = eventType == "custom1" ? "custom1" : "custom2";
      app.views.customEventsView.eventsTypeLabel.html(eventType);
      app.views.customEventsView.eventsCountLabel.html("" + counts[eventType]);
    });
    app.states.customEventsView.end(function(params) {
      app.views.customEventsView.hide();
    });

    app.views.customEventsView.ctlMain.click(function() {
      app.states.main.go(undefined, undefined);
    });
    app.views.customEventsView.ctlMainBlue.click(function() {
      app.states.main.go(undefined, "blue");
    });
    app.views.customEventsView.ctlRoot.click(function() {
      jiant.goRoot();
    })

  })(helloJiant);

});

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
    helloJiant.states.main.go({name: name}, true);
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

  app.states.main.start(function(params) {
    if (params.color) {
      $("body").css("background-color", params.color);
    }
    showView.nameLabel.html(params.name);
  });

  askView.ctlNavCustom1.click(function() {
    app.states.customEventsView.go({eventType: "custom1"});
  });
  askView.ctlNavCustom2.click(function() {
    app.states.customEventsView.go({eventType: "custom2"});
  });
  askView.ctlNavMainBlue.click(function() {
    app.states.main.go({color: "blue"}, true);
  });
  askView.ctlNavMainGreen.click(function() {
    app.states.main.go({color: "green"}, true);
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

    app.states.customEventsView.start(function(params) {
      app.views.customEventsView.show();
      var eventType = params.eventType == "custom1" ? "custom1" : "custom2";
      app.views.customEventsView.eventsTypeLabel.html(eventType);
      app.views.customEventsView.eventsCountLabel.html("" + counts[eventType]);
    });
    app.states.customEventsView.end(function(params) {
      app.views.customEventsView.hide();
    });

    app.views.customEventsView.ctlMain.click(function() {
      app.states.main.go({}, false);
    });
    app.views.customEventsView.ctlMainBlue.click(function() {
      app.states.main.go({color: "blue"}, true);
    });
    app.views.customEventsView.ctlRoot.click(function() {
      jiant.goRoot();
    })

  })(helloJiant);

});

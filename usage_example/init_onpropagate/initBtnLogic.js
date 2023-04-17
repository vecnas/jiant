jiant.module("initBtnLogic", function($, app) {

  app.templates.btnTm = {
    impl: "<i><div><button class='_title'></button>-<button class='_currentTitle'></button>-<button class='_initialTitle'></button></div></i>",
    initialTitle: jiant.label,
    currentTitle: jiant.label,
    title: jiant.label,
    value: jiant.data
  };

  app.templates.btnTm.jInit = function(elem) {
    //app.templates.btnTm.init(function(data, elem) {
    //elem.initialTitle.html(data.title);
    jiant.logInfo("Called init with this and first arg: ", this, elem);

    // elem.initialTitle.click(()=>alert(data.value));
    this.title.click(()=>alert(this.data("value")));
    // elem.currentTitle.click(()=>alert(latestValue));
  };

  // title and currentTitle are identical, but title enhanced by jiant auto-mechanics, so don't need latestValue storage
  jiant.onApp(app, function() {
    let latestValue;

    // app.templates.btnTm.onPropagate(function(data, elem) {
    //   elem.currentTitle.html(data.title);
    //   latestValue = data.value;
    // });

  });

});
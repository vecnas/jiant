jiant.xl = {

  ctl2state: function(ctl, state, selectedCssClass) {
    ctl.click(state.go);
    selectedCssClass && state.start(function() {
      ctl.addClass(selectedCssClass);
    });
    selectedCssClass && state.end(function() {
      ctl.removeClass(selectedCssClass);
    });
  },

  elementVisibilityByEvent: function(elem, eventsList) {},

  removeCtl: function(ctl, model) {}

};

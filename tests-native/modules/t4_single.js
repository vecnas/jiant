jiant.module("t4_single", function() {
  if (window.__jiantTestState) {
    window.__jiantTestState.singleCount = (window.__jiantTestState.singleCount || 0) + 1;
  }
  this.singleton();
  return {id: "singleton"};
});

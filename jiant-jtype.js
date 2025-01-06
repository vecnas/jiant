jiant.module("jiant-jtype", function() {

  this.singleton();

  const {logInfo, logError} = jiant;

  const JType = class {
    constructor(_data = {}) {
      this.data = _data;
    }

    getData = () => {
      return this.data;
    }
  }

  const jt = {
    JType,
    initType: function({clz, fields = {}, componentProducer, renderProducer, alwaysUpdatable}) {
      for (const [key,] of Object.entries({field: 0, optional: 0, ...fields})) {
        clz.prototype[key] = function(val) {
          if (arguments.length === 0) {
            return this.data[key];
          }
          const args = {...this.data};
          args[key] = val;
          return new clz(args);
        }
      }
      if (componentProducer) {
        clz.prototype.componentProducer = componentProducer;
      }
      if (renderProducer) {
        clz.prototype.renderProducer = renderProducer;
      }
      const rootInstance = new clz();
      clz.prototype.tp = () => rootInstance;
      clz.prototype.alwaysUpdatable = !!alwaysUpdatable;
      return rootInstance;
    }
  }

  for (let key in jt) {
    jiant[key] = jt[key];
  }

  return jt;

});
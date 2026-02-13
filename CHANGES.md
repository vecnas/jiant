# Jiant Changes

- `4.00` jiant broken on modules, loaded when used by application
- `4.01` bindXXX methods (see docs), bindTree initial version
- `4.02` app.cacheInStorage enables modules cache in local storage
- `4.03` jiant cache disabling - jiant.disableCache = true, core log calls filtered by DEV_MODE again
- `4.04` jiant-xl autoload with app definition
- `4.05` proper source for modules including cached
- `4.06` jiant-events refactored to pure js, no batch off more, internal extra info storage for fields changed to object
- `4.07` customRenderer replaced by renderer per element cb({obj, field, view, elem}), onRender added, module called with obj instead of array
- `4.08` some renderer related tunings/debugs because of testing
- `4.09` separation of spec for views/templates
- `4.10` jsdoc commented, some fixes

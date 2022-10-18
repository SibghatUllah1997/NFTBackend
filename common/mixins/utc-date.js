
const moment = require('moment');

module.exports = function(Model, value) {
  if (Model && Model.sharedClass) {
    const properties = Model.definition.properties;
    Object.keys(properties).forEach(property => {
      if (
        properties[property].defaultFn &&
        properties[property].defaultFn === 'now'
      ) {
        /**
         * @see https://github.com/strongloop/loopback/issues/292#issuecomment-69641098
         */
        Model.definition.rawProperties[property].default =
        Model.definition.properties[property].default = function() {
          return moment().utc().toDate().getTime();
        };
      }
    });
  }
};

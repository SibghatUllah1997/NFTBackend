
module.exports = function(Model, options) {
  Model.observe('before save', function event(ctx, next) {
    const path = ctx.instance ? 'instance' : 'data';
    options.properties.forEach(property => {
        ctx[path][property] = ctx[path][property].toLowerCase();
    });
    next();
  });
};

/**
 * @see https://github.com/strongloop/loopback/issues/651#issuecomment-167111395
 * @see https://loopback.io/doc/en/lb3/Exposing-models-over-REST.html
 */

const camelCase = require('lodash/camelCase');
const uniq = require('lodash/uniq');

module.exports = function(Model, options) {
  if (Model && Model.sharedClass) {
    const remoting = options.remoting || {};
    const sharedMethods = remoting.sharedMethods || {};
    let methodNames = Model.sharedClass.methods().map(method => {
      const pttype = method.isStatic ? '' : 'prototype.';
      return `${pttype}${method.name}`;
    });
    const modelName = camelCase(Model.modelName);
    const plural = Model.definition.settings.plural || modelName;
    const relations = Model.definition.settings.relations || {};
    Object.keys(relations).forEach(relation => {
      const list = [
        '__findById__',
        '__destroyById__',
        '__updateById__',
        '__exists__',
        '__link__',
        '__get__',
        '__create__',
        '__update__',
        '__destroy__',
        '__unlink__',
        '__count__',
        '__delete__',
        'prototype.__findById__',
        'prototype.__destroyById__',
        'prototype.__updateById__',
        'prototype.__exists__',
        'prototype.__link__',
        'prototype.__get__',
        'prototype.__create__',
        'prototype.__update__',
        'prototype.__destroy__',
        'prototype.__unlink__',
        'prototype.__count__',
        'prototype.__delete__',
      ];
      methodNames = methodNames.concat(
        list.map(name => `${name}${relation}`),
      );
      methodNames = methodNames.concat(
        list.map(name => `${name}${relation}__${modelName}`),
      );
      methodNames = methodNames.concat(
        list.map(name => `${name}${relation}__${plural}`),
      );
    });
    uniq(methodNames).forEach(name => {
      const isEnable = Object.keys(sharedMethods)
        .includes(name) && sharedMethods[name] === true;
      if (
        !isEnable && Object.keys(sharedMethods).includes('*') &&
        sharedMethods['*'] === false
      ) {
        Model.disableRemoteMethodByName(name);
      }
    });
  }
};

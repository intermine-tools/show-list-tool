define([], function () {

  return {
    isEditable: isEditable,
    isAssignableTo: isAssignableTo,
    eq: eq
  };

  function isEditable (c) {
    return c.editable;
  }

  function eq (prop, value) {
    return function (thing) {
      return thing && thing[prop] === value;
    };
  }

  function isAssignableTo (model, pathType, className) {
    var clazz = model.makePath(className);

    return clazz.isa(pathType);
  }

});

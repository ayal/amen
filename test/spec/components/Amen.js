'use strict';

describe('Amen', function () {
  var React = require('react/addons');
  var Amen, component;

  beforeEach(function () {
    Amen = require('components/Amen.js');
    component = React.createElement(Amen);
  });

  it('should create a new instance of Amen', function () {
    expect(component).toBeDefined();
  });
});

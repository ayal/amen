'use strict';

describe('AmenApp', function () {
  var React = require('react/addons');
  var AmenApp, component;

  beforeEach(function () {
    var container = document.createElement('div');
    container.id = 'content';
    document.body.appendChild(container);

    AmenApp = require('components/AmenApp.js');
    component = React.createElement(AmenApp);
  });

  it('should create a new instance of AmenApp', function () {
    expect(component).toBeDefined();
  });
});

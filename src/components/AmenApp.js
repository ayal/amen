'use strict';

var React = require('react/addons');
var ReactTransitionGroup = React.addons.TransitionGroup;

// CSS
require('normalize.css');
require('../styles/main.css');
var amen = require('../components/Amen.js')();

var imageURL = require('../images/yeoman.png');

var AmenApp = React.createClass({
  render: function() {
    return (
      <div className='main'>
	  {amen}
      </div>
    );
  }
});

module.exports = AmenApp;

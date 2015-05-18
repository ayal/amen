'use strict';

var React = require('react/addons');

var events = require('events');
var eventEmitter = new events.EventEmitter();

var _ = require('lodash');
require('styles/Amen.less');
var ditty = require('ditty')();

var Bopper = require('bopper');
var context = new window.AudioContext()||window.webkitAudioContext();

var analyser = context.createAnalyser();
analyser.connect(context.destination);

var makesound = function(buffer,g) {
    var source = context.createBufferSource();
    source.buffer = buffer;
    var gainNode = context.createGain();
    gainNode.gain.value = g;
    gainNode.connect(analyser);    
    source.connect(gainNode);
    source.start();
};

var scheduler = Bopper(context);

scheduler.pipe(ditty).on('data', function(data){
	// data: id, event (start or stop), time, position, args
	if (data.event === 'start'){
	    eventEmitter.emit('sound', data);
	    if (data.id !== 100) {
		makesound(Bopper.bufferList[data.id], data.id === 1 || data.id === 2 ?  0.1 : 0.09);
	    }
	} else if (data.event === 'stop'){
	}
    });


var setx = function(id, bars){
    var forDitty = bars.map(function(arr,i){
	    return arr.map(function(x){
		    return [x + i * 16, 0.9];
		});
	    });
    forDitty = _.union.apply(null,forDitty);
    console.log(id,forDitty);

    ditty.set(id, forDitty, 64);
    
};

/*setx(0, [[0,2,4,6,8,10,12,14], [0,2,4,6,8,10,12,14], [0,2,4,6,8,10,12,14], [0,2,4,6,8,10,12,14]]);
setx(1, [[4,7,9,12,15],[4,7,9,12,15],[4,7,9,14],[1,4,7,9,14]]);
setx(2, [[0,2,10,11],[0,2,10,11], [0,2,10], [2,3,10]]);*/
setx(100, [_.range(0,16),_.range(0,16),_.range(0,16),_.range(0,16)]);

scheduler.setTempo(400);

/* buffer loading */
var BufferLoaderC = require('../scripts/bufferLoader.js');

function finishedLoading(bufferList) {
    Bopper.bufferList = bufferList;
    console.log('starting');
    scheduler.start();

}

var bufferLoader = new BufferLoaderC(
    context,
    [
     '../sounds/C.mp4',
     '../sounds/S.mp4',
     '../sounds/B.mp4',
     '../sounds/R.mp4'
    ],
    finishedLoading
    );

bufferLoader.load();

var Amen = React.createClass({
	getInitialState: function() {
	    return {marked:{}};
	},
  componentDidMount: function() {
	    var that = this;
    eventEmitter.on('sound', function(data) {
	    if (data.id === 100) {
		that.setState({col: Math.round(data.position) % 64});
	    }
    });
  },	
	mark: function(row,column){
	    var that = this;
	    return function() {
		var marked = _.clone(that.state.marked);
		if (!marked[row]) {
		    marked[row] = {};
		}
		if (marked[row][column]) {
		    delete marked[row][column];
		}
		else {
		    marked[row][column] = [column,0.09];
		}

		that.setState({marked:marked});
		if (marked[row]) {
		    ditty.set(row+1, _.values(marked[row]), 64);
		}
	    };
	},
	loadamen: function() {
	    var that = this;
	    var marked = _.clone(that.state.marked);
	    _.each([
		    [[4,7,9,12,15],[4,7,9,12,15],[4,7,9,14],[1,4,7,9,14]],
		    [[0,2,10,11],[0,2,10,11], [0,2,10], [2,3,10]],
		    [[0,2,4,6,8,10,12,14], [0,2,4,6,8,10,12,14], [0,2,4,6,8,10,12,14], [0,2,4,6,8,10,12,14]]
		    ], function(data, id){
		    _.each(data, function(v,k){
			    _.each(v, function(x,i){
				    if (!marked[id]) {
					marked[id] = {};
				    }
				    marked[id][x + k*16] = [x + k*16, 0];
				});
			});/////////
		    ditty.set(id+1, _.values(marked[id]), 64);
		});
	    that.setState({marked:marked});
	},
	changeTempo: function(e){
	    var tempo = e.target.value;
	    console.log('tempo',tempo);
	    scheduler.setTempo(tempo);
	},
  render: function () {
	    var that = this;
	    var rows = 3;
	    var columns = 16;

	    var boxes = [];
	    _.each([0,1,2,3], function(i){
		    boxes.push(
			       (<div className="amen-mini-box">
				   {_.map(_.range(0,rows), function(x){
				       return (<div className="amenrow" data-row={x}>
					   {_.map(_.range(0+i*16,columns+i*16), function(y){
						       var exClass = (y === that.state.col) ? 'selected' : 'nothing' ;
						       var marked = (that.state.marked[x] && that.state.marked[x][y]) ? 'marked' : 'nothing' ;
						       return (<span className={"amenblock unselectable " + exClass + " " + marked} data-col={y} onClick={that.mark(x,y)}>
							       
							       </span>);
						   })}
					       </div>);
					   })}
				</div>));
			});

    return (
        <div className="amenbox unselectable">
	<input className="tempo" type="range" min="0" max="600" step="50" onChange={this.changeTempo} value="400" />
   	  <button className="amen-load" onClick={this.loadamen}>Load Amen</button>
	    {boxes}
        </div>
      );
  }
});

module.exports = Amen; 


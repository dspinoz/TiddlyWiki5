(function(){

"use strict";

var Widget = require("$:/core/modules/widgets/widget.js").widget;
var d3 = require("$:/plugins/tiddlywiki/ds/d3.js/d3.js");
var crossfilter = require("$:/plugins/tiddlywiki/ds/crossfilter.js/crossfilter.js").crossfilter;
var dc = require("$:/plugins/tiddlywiki/ds/dc.js/dc.js")(d3,crossfilter);
var ds = require("$:/plugins/tiddlywiki/ds/ds-charts/ds.js")(d3,dc);
var count = 0;

var BarWidget = function(parseTreeNode,options) {
	this.initialise(parseTreeNode,options);
	this.facts = crossfilter();
};

/*
Inherit from the base widget class
*/
BarWidget.prototype = new Widget();

/*
Render this widget into the DOM
*/
BarWidget.prototype.render = function(parent,nextSibling) {
	// Save the parent dom node
	this.parentDomNode = parent;
	// Compute our attributes
	this.computeAttributes();
	// Execute our logic
	this.execute();
	// Create the chart
        var self = this;

		var format = d3.time.format("Time Entry %Y/%m/%d");
		var entries = d3.map();

        this.tiddlers.forEach(function(t) {

		    if (t.startsWith("Draft of")) {
				return;
			}

			var f = d3.map(self.wiki.getTiddler(t).fields);
			f.remove('title');
			f.remove('text');
			f.remove('tags');
			f.remove('created');
			f.remove('modified');
			f.remove('creator');
			f.remove('modifier');
			f.remove('bag');
			f.remove('revision');
			f.remove('type');

			entries.set(t, f);

        });


		var data = [];

		entries.forEach(function(key,value) {
			data.push({title:key, date:format.parse(key), items: value.entries()});
		});

		data = data.sort(function(a,b) {
		  return d3.ascending(a.date, b.date);
		});

		console.log('timesheet entries', data);



	var div = d3.select(parent).selectAll('div').data([{class:'dscal'}]);

	div.exit().remove();
	div.enter().append('div');

	div.attr('class', function(d) {
	  return d.class;
	});

	var a = div.selectAll('h1').data([{id:'total',html:"Total: <span class='numberDisplay'/>"}]);

	a.exit().remove();
	a.enter().append('h1');

	a.attr('id', function(d) {
	  return d.id;
	}).html(function(d) {
	  return d.html || null;
	});

	a = div.selectAll('div').data(['calendar', 'yearcal']);

	a.exit().remove();
	a.enter().append('div');

	a.attr('id', function(d) {
	  return d;
	}).style('float','none');








// ensure all data is removed
dc.filterAll();
this.facts.remove();

this.facts.add(data);



var total = dc.numberDisplay("#total");
var cal = ds.calendar("#calendar");

function getTotal(d) {
  var total = 0;
  d.items.forEach(function(i) {
    total += +i.value;
  });
  return total;
}

total
  .group(this.facts.groupAll().reduceSum(getTotal))
  .valueAccessor(function(d) {
    return d;
  })
  .formatNumber(d3.format("0.1f"));

	var calDim = this.facts.dimension(function(d) { return d3.time.day(d.date); });

	cal.width(800)
	.cellDateFormat("%b %e")
	//.showDays(3)
	//.showHeading(false)
	//.useGroup(false)
	.dateAccessor(function(d) {
	  return d.date ? d.date : d.key;
	})
	.cellRenderer(function(sel, d) {

		var cellFormat = ds.d3.time.format('%b %d');
		var entryFormat = ds.d3.time.format('%Y/%m/%d');

		function fmtDate(d) {
		  var str = '<a href="#Time%20Entry%20'+ entryFormat(d) +'" class="tc-tiddlylink tc-tiddlylink-missing">' + cellFormat(d) + '</a>';
		  return str;
		}

		// draw items in the day cell
		var cell = d3.select(sel).selectAll('div.cell').data(function(d) {
			var count = 0;
			if (d.value && d.value.items) {
			  count = d.value.items.reduce(function(total, d) {
			    return total + (+d.value);
			  }, 0);
			} else if (d.value && d.value.value) {
			  count = d.value.value;
			}

			return [
			  {'class':'date', value: fmtDate(d.key) },
		      {'class':'hours', value: count == 0 ? '' : count}
			];
		});

		cell.exit().remove();
		cell.enter().append('div').attr('class','cell');

		cell.attr('class', function(d) {
			return 'cell '+d.class;
		}).html(function(d) {
			return d.value;
		}).each(function(d) {
		   var hasData = false;

			if (this.nextSibling) {
			  hasData = d3.select(this.nextSibling).datum().value === '';
			}

			d3.select(this).selectAll('a')
				.classed('tc-tiddlylink-missing',  hasData)
				.classed('tc-tiddlylink-resolves', !hasData)
				.on('click', function() {
				  // stop the filtering event from propagating up from an embedded link
				  d3.event.stopPropagation();
				});
		});
	})
	.dimension(calDim)
	.group(calDim.group().reduceSum(getTotal));

	dc.renderAll();

	return div.node();
};

/*
Compute the internal state of the widget
*/
BarWidget.prototype.execute = function() {

    this.tiddlers_prev = this.tiddlers || [];
	this.tiddlers = this.wiki.getTiddlersWithTag("time-entry");
};

BarWidget.prototype.refresh = function(changedTiddlers) {

	this.execute();

	if (this.tiddlers_prev.length != this.tiddlers.length) {
	  this.refreshSelf();
	  return true;
	}

	for (var i = 0; i < this.tiddlers.length; i++) {
	  if (changedTiddlers[this.tiddlers[i]]) {
	    this.refreshSelf();
		return true;
	  }
	}

    return false;
};

exports.dstimesheet = BarWidget;

})();

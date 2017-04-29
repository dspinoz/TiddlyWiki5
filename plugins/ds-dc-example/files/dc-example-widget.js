(function(){

"use strict";

var Widget = require("$:/core/modules/widgets/widget.js").widget;
var d3 = require("$:/plugins/tiddlywiki/ds/d3.js/d3.js");
var crossfilter = require("$:/plugins/tiddlywiki/ds/crossfilter.js/crossfilter.js").crossfilter;
var dc = require("$:/plugins/tiddlywiki/ds/dc.js/dc.js")(d3,crossfilter);

var BarWidget = function(parseTreeNode,options) {
	this.initialise(parseTreeNode,options);
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
        console.log('createChart');

	// Get the data we're plotting
	var data = this.wiki.getTiddlerData(this.barData);

  var div = d3.select(parent).append('div').attr('class','dsdcexample');
  div.append('div').attr('id', 'total-x').style('float','none');
  div.append('div').attr('id', 'total-y').style('float','none');
  div.append('div').attr('id', 'type-pie').style('float','none');

  var facts = crossfilter();

  var totalX = dc.numberDisplay('#total-x').formatNumber(d3.format('f'));
  var totalY = dc.numberDisplay('#total-y').formatNumber(d3.format('f'));

  totalX
    .group(facts.groupAll().reduceSum(function(d) { return d.x; }))
    .valueAccessor(function(d) {
      return d;
    });

  totalY
    .group(facts.groupAll().reduceSum(function(d) { return d.y; }))
    .valueAccessor(function(d) {
      return d;
    });

  var typePie = dc.pieChart('#type-pie');
  var typeDim = facts.dimension(function(d) { return d.type; });

  typePie
    .innerRadius(30)
    .dimension(typeDim)
    .group(typeDim.group().reduceSum(function(d) { return d.y; }));


  facts.add(data);
  dc.renderAll();

	return div.node();
};

/*
Compute the internal state of the widget
*/
BarWidget.prototype.execute = function() {
	// Get the parameters from the attributes
	this.barData = this.getAttribute("data");
};

BarWidget.prototype.refresh = function(changedTiddlers) {
	var changedAttributes = this.computeAttributes();
        console.log('refresh', changedTiddlers, changedTiddlers[this.barData], changedAttributes);
	if(changedAttributes.data || changedTiddlers[this.barData]) {
		this.refreshSelf();
		return true;
        }
        return false;
};

exports.dsdcexample = BarWidget;

})();

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
        console.log('createChart');

	// Get the data we're plotting
	var data = this.wiki.getTiddlerData(this.barData);

  var div = d3.select(parent).append('div').attr('class','dstree');
  div.append('div').attr('id', 'dstree-chart').style('float','none');

  var facts = crossfilter();

  var tree = ds.tree('#dstree-chart');
  
  
tree
  //.colors(catColors)
  .colorAccessor(function(d) {
    return d.key;
  })
  .title(function(d) { 
    if (!Array.isArray(d.values)) {
      return d.key + ": " + d.values;
    }
    
    var tot = 0;
    d.values.forEach(function(v) {
      tot += v.values;
    });
    
    return d.key + ": " + tot; 
  })
  .extent(function(d) { 
    if (!Array.isArray(d.values)) {
      return d.values;
    }
    
    var tot = 0;
    d.values.forEach(function(v) {
      tot += v.values;
    });
    
    return tot; 
  })
  //.scale(d3.scale.linear().range([5,50]).domain([1,300]))
  /*.renderNode(function(sel) {
    var c = sel.selectAll('circle').data(function(d) { return [d]; });
    c.exit().remove();
    c.enter().append('circle');
    c.attr('r', 5);
  })*/
  .dimension(facts.dimension(function(d) { return d.category; }))
  .filterFunc(function(d) {
    if (d.depth <= 1)
      return d.key;
      
    subcatPie.filter(d.key);
    return d.parent.key;
  });
  
tree.nest()
  .key(function(d) { return d.type; })
  .rollup(function(values) { 
    var tot = 0;
    values.forEach(function(d) {
      tot += d.x;
    });
    return tot;
  });
  
tree.scale()
  .range([5,50]);
  
  
  
  facts.add(data);
  dc.renderAll();

  return div.node();
};

/*
Compute the internal state of the widget
*/
BarWidget.prototype.execute = function() {

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

exports.dstreechart = BarWidget;

})();

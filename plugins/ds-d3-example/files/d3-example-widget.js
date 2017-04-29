(function(){

"use strict";

var Widget = require("$:/core/modules/widgets/widget.js").widget,
	d3 = require("$:/plugins/tiddlywiki/ds/d3.js/d3.js");

var MyWidget = function(parseTreeNode,options) {
	this.initialise(parseTreeNode,options);
};

/*
Inherit from the base widget class
*/
MyWidget.prototype = new Widget();

/*
Render this widget into the DOM
*/
MyWidget.prototype.render = function(parent,nextSibling) {
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
	// Create element
	var p = d3.select(parent).selectAll('p.item').data(data);

        p.exit().remove();

        p.enter().append('p').attr('class','item');

        p.text(function(d) {
          return d.x + "/" + d.y;
        });

	// Return the p node
	return p.node();
};

/*
Compute the internal state of the widget
*/
MyWidget.prototype.execute = function() {
	// Get the parameters from the attributes
	this.barData = this.getAttribute("data");
};

MyWidget.prototype.refresh = function(changedTiddlers) {
	var changedAttributes = this.computeAttributes();
        console.log('refresh', changedTiddlers, changedTiddlers[this.barData], changedAttributes);
	if(changedAttributes.data || changedTiddlers[this.barData]) {
		this.refreshSelf();
		return true;
        }
        return false;
};

exports.dsd3example = MyWidget;

})();

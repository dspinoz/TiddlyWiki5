(function() {

	function _init(d3, dc) {

		'use strict';

		var ds = {
			version: '0.1.0',
			d3: d3,
			dc: dc
		};

    ds.yearcalendar = function (parent, chartGroup) {
      var _chart = ds.dc.colorMixin(dc.marginMixin(dc.baseMixin({})));

      _chart._mandatoryAttributes(['dimension', 'group']);

      // TBD move color styles to here
      // based on "d3 Calendar View" by mbostock
      _chart.linearColors(["#F00", "#100"]);

      _chart.colorAccessor(function(d) { return d.value; });

      var _G;
      var _width, _height;

      var _yearFormat = ds.d3.time.format('%Y'),
          _monthFormat = ds.d3.time.format('%m'),
          _cellWidth = 0,
          _cellHeight = 0,
          _textHeight = 12; //TBD dynamically calculate year.text size

      var _title = function(d) { return d.key + ": " + d.value; };
      var _key = function(d) { return d.key; };
      var _value = function(d) { return d.value; };
      var _valueFilter = function(d) { return d.value.toFixed(1) > 0; };

      _chart._doRender = function () {
        _chart.resetSvg();

        _width = _chart.width() - _chart.margins().right - _chart.margins().left;
        _height = _chart.height() - _chart.margins().top - _chart.margins().bottom;

        _G = _chart.svg()
            .attr("width", _width + _chart.margins().right + _chart.margins().left)
            .attr("height", _height + _chart.margins().top + _chart.margins().bottom)
          .append("g")
            .attr("transform", "translate(" + _chart.margins().left + "," + _chart.margins().top + ")");

        _chart.redraw();

        return _chart;
      };

      _chart._doRedraw = function () {

        var data = _chart.group().all();

        var keyExtent = ds.d3.extent(data, _chart.key());
        _chart.colors().domain(d3.extent(data, _chart.value()));

        var begin = ds.d3.time.year(keyExtent[0]),
            end = ds.d3.time.year(keyExtent[1]);

        // TBD is this correct for all data?
        // modify extent so that time range shows all data
        var ybegin = new Date(begin), yend = new Date(end);
        yend.setFullYear(yend.getFullYear()+1);


        var years = ds.d3.time.years(ybegin,yend);

        if (!_cellWidth) {
          _cellWidth = _width / 53; //53 is max weeks in year
        }

        if (!_cellHeight) {
          _cellHeight = _height / 7 / years.length; // 7 is max days in week
        }


        var year = _G.selectAll("g.year").data(years);

        year.exit().remove();

    	 // group svg element types and keep months on top
        var yEnter = year.enter().append("g")
    		.attr('class', 'year');
        yEnter.append('g').attr('class', 'days');
        yEnter.append('g').attr('class', 'months');

        year.transition()
          .attr("transform", function(d,i) {
            return "translate(0," + (((_cellHeight*7)+_textHeight)*i) + ")";
          });

        var yearText = year.selectAll('text').data(function(d) { return [d]; });

        yearText.exit().remove();

        yearText.enter().append('text')
            .attr("transform", "translate(-6," + _cellHeight * 3.5 + ")rotate(-90)")
            .style("text-anchor", "middle");

        yearText.transition()
          .text(function(d) { return _yearFormat(d); });


        var month = year.select('g.months').selectAll(".month")
          .data(function(d) {
            var months = ds.d3.time.months(new Date(+_yearFormat(d), +_monthFormat(d) -1, 1),
                                           new Date(+_yearFormat(d)+1, +_monthFormat(d)-1, 1));

            var data = [];

            months.forEach(function(d) {
              data.push(d);
            });

            return data;
          });

        month.exit().remove();

        month.enter().append("path")
          .attr("class", "month")
          .style("fill", "none")
          .style("stroke", "#555")
          .style("stroke-width", "1px");

        month.transition()
          .attr("d", monthPath);


        var day = year.select('g.days').selectAll(".day")
          .data(function(d) {
            var days = ds.d3.time.days(new Date(+_yearFormat(d), 0, 1), new Date(+_yearFormat(d) + 1, 0, 1));

            var data = [];

            days.forEach(function(d) {
              data.push({_date: d, height: _cellHeight, width: _cellWidth});
            });

            return data;
          });

        day.exit().remove();

        day.enter().append("rect")
          .attr("class", "day")
          .attr("width", function(d) { return d.width; })
          .attr("height", function(d) { return d.height; })
          .on('click', function() {
            var d = ds.d3.select(this).datum();

            if (_chart.value()(d) != undefined) {
              _chart.onClick(d);
              _chart.redraw();
            }
          })
          .on('mouseover', function() {
            var d = ds.d3.select(this).datum();

            ds.d3.select(this).call(dayStyle,
              // check for bound data, and verify value filter as other chart filters can affect the value
              (_chart.value()(d) != undefined &&  _chart.valueFilter()(d)),
              // always highlight the current day
              true);
          })
          .on('mouseout', function() {
            var d = ds.d3.select(this).datum();

            ds.d3.select(this).call(dayStyle,
              // check for bound data, and verify value filter as other chart filters can affect the value
              (_chart.value()(d) != undefined &&  _chart.valueFilter()(d)),
              // see if the day is filtered to retain style
              _chart.filters().filter(function(f) {
                if (_chart.value()(d) == undefined) return false;
                return f.getTime() == _chart.key()(d).getTime();
              }).length != 0);
          })
          .append('title');

        day.transition()
          .attr("x", function(d) { return ds.d3.time.weekOfYear(d._date) * d.width; })
          .attr("y", function(d) { return d._date.getDay() * d.height; });

        // no data attached and not filtered
        day.call(dayStyle, false, false);

        day.select('title')
          .text(function(d,i) {
            var tmp = {key: d._date, value: undefined};
            return _chart.title()(tmp);
          });


        var map = ds.d3.map(data, _chart.key());

        var dataDays = day
          .filter(function(d) {
            if (map.has(d._date)) {

              d.key = d._date;
              d.value = map.get(d._date).value;

              if (_chart.valueFilter()(d))
                return true;
            }

            return false;
          });

        // data attached, not filtered
        dataDays.call(dayStyle, true, false);

        dataDays.select('title').text(_chart.title());


        var set = ds.d3.set(_chart.filters());

        var filteredDays = day
          .filter(function(d) {
            if (set.has(d._date)) {

              d.key = d._date;
              d.value = map.get(d._date).value;

              if (_chart.valueFilter()(d))
                return true;
            }

            return false;
          });

        // data attached, filtered
        filteredDays.call(dayStyle, true, true);

        return _chart;
      };

      function dayStyle(selection, hasData, isFiltered) {

        if (!hasData) {
          //reset style as no data is attached
          selection
            .style('stroke-width', 1)
            .style('stroke', '#ccc')
            .style('fill', '#fff')
            .classed('highlight', false);
          return;
        }

        if (hasData && isFiltered) {
          selection
            .style('fill', _chart.getColor)
            .style("stroke-width", 3)
            .style("stroke", function(d,i) {
              var color = d3.rgb(_chart.getColor(d,i));
              return color.darker();
            })
            .classed('deselected', false);
          return;
        }

        if (_chart.filters().length == 0) {
          selection
            .style('fill', _chart.getColor)
            .style('stroke-width', 1)
            .style('stroke', '#ccc');
        }
        else {
          selection
            .style('fill', null)
            .style('stroke-width', null)
            .style('stroke', null)
            .classed('deselected', true);
        }
      }

      function monthPath(t0) {
        var t1 = new Date(t0.getFullYear(), t0.getMonth() + 1, 0),
            d0 = t0.getDay(), w0 = d3.time.weekOfYear(t0),
            d1 = t1.getDay(), w1 = d3.time.weekOfYear(t1);
        return "M" + (w0 + 1) * _cellWidth + "," + d0 * _cellHeight
            + "H" + w0 * _cellWidth + "V" + 7 * _cellHeight
            + "H" + w1 * _cellWidth + "V" + (d1 + 1) * _cellHeight
            + "H" + (w1 + 1) * _cellWidth + "V" + 0
            + "H" + (w0 + 1) * _cellWidth + "Z";
      }


      _chart.cellSize = function (f) {
        if (!arguments.length) {
          return _cellSize;
        }
        _cellWidth = f;
        _cellHeight = f;
        return _chart;
      };

      _chart.key = function (f) {
        if (!arguments.length) {
          return _key;
        }
        _key = f;
        return _chart;
      };

      _chart.value = function (f) {
        if (!arguments.length) {
          return _value;
        }
        _value = f;
        return _chart;
      };

      _chart.valueFilter = function (f) {
        if (!arguments.length) {
          return _valueFilter;
        }
        _valueFilter = f;
        return _chart;
      };

      _chart.title = function (f) {
        if (!arguments.length) {
          return _title;
        }
        _title = f;
        return _chart;
      };

      return _chart.anchor(parent, chartGroup);
    };





  ds.calendar = function(parent, chartGroup) {

	  var _chart = ds.dc.baseMixin({});

	  _chart._mandatoryAttributes(['dimension']);

	  //_chart.colorAccessor(function(d) { return d.value; });

	  var _minmax = undefined,
	      _showDays = 7,
		  _showHeading = true,
		  _showWeeks = true,
		  _useGroup = true,
		  _cellRenderer = function(d) { return 'default render'; },
		  _dateAccessor = function(d) { return d.key; },
		  _cellDateFormat = "%Y-%m-%d",
		  _timeInterval = ds.d3.time.monday,
		  _dayHeadingFormat = ds.d3.time.format("%a"),
		  _weekNumFormat = ds.d3.time.format("%W");

	  _chart.showDays = function (v) {
		if (!arguments.length) {
		  return _showDays;
		}
		_showDays = v;
		return _chart;
	  };

	  _chart.showHeading = function (v) {
		if (!arguments.length) {
		  return _showHeading;
		}
		_showHeading = v;
		return _chart;
	  };

	  _chart.cellDateFormat = function (v) {
		if (!arguments.length) {
		  return _cellDateFormat;
		}
		_cellDateFormat = v;
		return _chart;
	  };

	  _chart.cellRenderer = function(v) {
		if (!arguments.length) {
		  return _cellRenderer;
		}
		_cellRenderer = v;
		return _chart;
	  };

	  _chart.dateAccessor = function(v) {
		if (!arguments.length) {
		  return _dateAccessor;
		}
		_dateAccessor = v;
		return _chart;
	  };

	  _chart.useGroup = function(v) {
		if (!arguments.length) {
		  return _useGroup;
		}
		_useGroup = v;
		return _chart;
	  };

	  _chart._doRender = function () {

		_chart.redraw();

		return _chart;
	  };

	  _chart._doRedraw = function () {

		var data = [];

		if (_useGroup) {
		  data = _chart.data();
		}
		else {
		  data = _chart.dimension().top(Infinity);
		}

		var now = ds.d3.time.day(new Date());

		// retain minmax as filters can affect it
		if (!_minmax)
			_minmax = ds.d3.extent(data, function(d) { return _dateAccessor(d).getTime(); });

		// days within the calendar, including the max
		var alldays = ds.d3.time.days(_timeInterval.floor(new Date(_minmax[0])), _timeInterval.floor(_timeInterval.offset(_minmax[1],1)));

		// convert to rows of days
		var rows = [];

		while (alldays.length > 0)
			rows.push(alldays.splice(0, _showDays));


		for (var i = 0; i < rows.length; i++)
		{
			rows[i] = rows[i].map(function(x) {

				// x is date within the range for this row (week)
				// determine value in data that actually matches this date
				// ensure all data values are passed down as far as possible

				var v = data.filter(function(a) { return _dateAccessor(a).getTime() == x.getTime(); });

				if (v.length == 1) {
					return {key: x, value: v[0]};
				} else {
					return {key:x};
				}

			});
		}

		var table = _chart.selectAll('table').data([ rows ]);

		table.exit().remove();
		table.enter().append('table');

		// heading row for number of specified days starting from the first date available
		// adhere to the first data point for rendering the table
		if (_showHeading) {

			var thr = table.selectAll('tr.heading').data(function(d) { return d.length > 0 ? [d[0]] : []; });

			thr.exit().remove();
			thr.enter().append('tr').attr('class','heading');

			var thd = thr.selectAll('th').data(function(d) {

				var ret = d.map(function(t) {
					return _dayHeadingFormat(t.key);
				});

				if (_showWeeks) ret.unshift('#'); //week number heading as the first column
				return ret;
			});

			thd.exit().remove();
			thd.enter().append('th');

			thd.text(function(d) { return d; });
		}

		// rows for weeks
		// ensure all missing dates are displayed
		// show number of configured days

		var tr = table.selectAll('tr.data').data(function(d) { return d; });

		tr.exit().remove();
		tr.enter().append('tr').attr('class','data');

		// columns for days

		var td = tr.selectAll('td').data(function(d) {
			//put date in the list for the week number
			if (_showWeeks)  d.unshift({date: d[d.length-1].key, noclick:true});
			return d;
		});

		td.exit().remove();
		td.enter().append('td')
			.attr('class', function(d) {
				if (_showWeeks && d.date) return 'heading';
				return 'data';
			})
			.style('cursor', function(d) {
				if (d.noclick) return null;
				return 'pointer';
			})
			.on('click', function(d) {
				if (!d.noclick) _chart.onClick(d);
			});

		td.classed('today', function(d) {
			return d.key == undefined ? false : d.key.getTime() == now.getTime();
		});

		// allow days on the chart to be selected/filtered
		if (_chart.hasFilter()) {
			td.each(function(d) {
				if (_chart.hasFilter(d.key)) {
					_chart.highlightSelected(this);
				} else {
					_chart.fadeDeselected(this);
				}
			});
		} else {
			td.each(function() {
				_chart.resetHighlight(this);
			});
		}


		td.each(function(d,i) {

			if (_showWeeks && d.date && i == 0) {
			  d3.select(this).html('<div class="cell weeknum">' +(+_weekNumFormat(d.date) +1)+ '</div>');
			  return;
			}

			_cellRenderer(this,d,i);
		});

		return _chart;
	  };

	return _chart.anchor(parent, chartGroup);
  };
  
  
  
  
ds.tree = function (parent, chartGroup) {
  var _chart = dc.colorMixin(dc.marginMixin(dc.baseMixin({})));
  
  _chart._mandatoryAttributes(['dimension']);
  
  _chart.colorAccessor(function(d) { return d.key; });
  
  var _treeG;
  
  var _nest = d3.nest();
  var _title = function(d) { return _key(d); };
  var _filterFunc = function(d) { return _key(d); };
  var _projection = function(d) { return [d.x, d.y]; };
  var _children = function(d) { return Array.isArray(d.values) ? d.values : undefined; };
  var _key = function(d) { return d.key; };
  var _value = function(d) { 
    if (Array.isArray(d.values)) {
      return 1; 
    }
    return d.values;
  };
  var _renderNode = function(selection) {
    var c = selection.selectAll('circle').data(function(d) { return [d]; });
    c.exit().remove();
    c.enter().append('circle').attr('r', _scale(1));
    c
      .attr('fill', _chart.getColor)
      .attr('stroke', _chart.getColor)
      .attr('r', function(d) {
        return _scale(_value(d));
      });
  };
  var _extent = function(d) {
    return _value(d);
  };
  
  var _tree = d3.layout.tree().children(_children);
  var _diagonal = d3.svg.diagonal().projection(_projection);
  var _scale = d3.scale.linear().range([5,30]);
  
  _chart.drawTreeNodes = function() {
    
    // new data is regenerated every refresh - not persistent!!
    var data = _nest.entries(_chart.dimension().top(Infinity));
    
    var treeData = _chart.dataRoot(data);
    
    
    // flattens the hierarchial data structure
    // sort nodes to ensure that bigger nodes are drawn first
    // TBD collision detection and move nodes within the tree structure
    
    var nodes = _tree.nodes(treeData).sort(function(a,b) {
      return d3.descending(_value(a), _value(b));
    });
    
    _scale.domain(d3.extent(nodes, _extent));
    
    
    var links = _treeG.selectAll('path.link').data(_tree.links(nodes));
    links.exit().remove();
    links.enter().append('path').attr('class', 'link');
    links.transition().attr('d', _diagonal);
    
    var g = _treeG.selectAll('g.node').data(nodes);
    
    g.exit().remove();
    g.enter().append('g').attr('class', 'node')
      .on('click', function() {
        // TBD save state for what item is selected and maintain selection as data changes
        
        var d = d3.select(this).datum();
        
        _chart.filter(_filterFunc(d));
        
        dc.redrawAll();
      });
      
    g.transition().attr('transform', function(d) { return 'translate('+d.x+','+d.y+')'; });
    
    var t = g.selectAll('title').data(function(d) { return [d]; });
    t.exit().remove();
    t.enter().append('title');
    t.text(_chart.title());
    
    _renderNode(g);
  };
  
  _chart._doRender = function () {
    _chart.resetSvg();
    
    var width = _chart.width() - _chart.margins().right - _chart.margins().left,
        height = _chart.height() - _chart.margins().top - _chart.margins().bottom;

    _tree.size([width, height]);

    _treeG = _chart.svg()
        .attr("width", width + _chart.margins().right + _chart.margins().left)
        .attr("height", height + _chart.margins().top + _chart.margins().bottom)
      .append("g")
        .attr("transform", "translate(" + _chart.margins().left + "," + _chart.margins().top + ")");
    
    _chart.drawTreeNodes();
    
    return _chart;
  };

  _chart._doRedraw = function () {
    
    _chart.drawTreeNodes();
    
    return _chart;
  };

  _chart.children = function (f) {
    if (!arguments.length) {
      return _children;
    }
    _children = f;
    return _chart;
  };

  _chart.projection = function (f) {
    if (!arguments.length) {
      return _projection;
    }
    _projection = f;
    return _chart;
  };

  _chart.key = function (f) {
    if (!arguments.length) {
      return _key;
    }
    _key = f;
    return _chart;
  };
  
  _chart.value = function (f) {
    if (!arguments.length) {
      return _value;
    }
    _value = f;
    return _chart;
  };
  
  _chart.scale = function (scale) {
    if (!arguments.length) {
      return _scale;
    }
    _scale = scale;
    return _chart;
  };
  
  _chart.extent = function (f) {
    if (!arguments.length) {
      return _extent;
    }
    _extent = f;
    return _chart;
  };
  
  _chart.treeChildren = function (f) {
    if (!arguments.length) {
      return _tree.children();
    }
    _tree.children(f);
    return _chart;
  };
  
  _chart.title = function (f) {
    if (!arguments.length) {
      return _title;
    }
    _title = f;
    return _chart;
  };
  
  _chart.renderNode = function (f) {
    if (!arguments.length) {
      return _renderNode;
    }
    _renderNode = f;
    return _chart;
  };

  _chart.filterFunc = function (f) {
    if (!arguments.length) {
      return _filterFunc;
    }
    _filterFunc = f;
    return _chart;
  };

  _chart.nest = function() {
    return _nest;
  };
  
  _chart.dataRoot = function(entries) {
    return {key: "Root", values: entries};
  };

  return _chart.anchor(parent, chartGroup);
};


	  return ds;
	}

	module.exports = _init;

})();
document.addEventListener("DOMContentLoaded", function (event) {
	"use strict";

	var data_path = FV.hydrograph_data_path;

	// Set the dimensions of the canvas / graph
	var margin = {top: 30, right: 20, bottom: 30, left: 50};
	var width = FV.chart_dimensions.width - margin.left - margin.right;
	var height = FV.chart_dimensions.height - margin.top - margin.bottom;

	// Set the ranges
	var x = d3.scaleTime().range([0, width]);
	var y = d3.scaleLog().range([height, 0]);

	// Define the voronoi
	var voronoi = d3.voronoi()
		.x(function (d) {
			return x(d.time_mili);
		})
		.y(function (d) {
			return y(d.value);
		})
		.extent([[-margin.left, -margin.top], [width + margin.right, height + margin.bottom]])

	// Define the line
	var line = d3.line()
		.x(function (d) {
			return x(d.time_mili);
		})
		.y(function (d) {
			return y(d.value);
		});

	// Get the data
	d3.json(data_path, function (error, data) {

		//save the original data
		var original_data = data;

		update(data);

		/**
		 * @param {Array} data -- an array containing the json data to be drawn
		 *
		 * Draws the svg, scales the range of the data, draws the line for each site, and creates the Voronoi
		 * tesselation and mouseover interactions, all based on the data set as it was passed in. Called as needed
		 * when data changes (as in removal of a line).
		 *
		 */
		function update(data) {

			// Adds the svg canvas
			var svg = d3.select("#hydrograph")
				.append("svg")
				.attr("width", width + margin.left + margin.right)
				.attr("height", height + margin.top + margin.bottom)
				.append("g")
				.attr("transform",
					"translate(" + margin.left + "," + margin.top + ")");

			var graph_data = data.map(function(d) {
				return  { "date": d.date, "key": d.key, "name": d.name, "time": d.time, "time_mili": d.time_mili,
					"timezone": d.timezone, "value": Number(d.value) } ;
			});

			// Scale the range of the data
			x.domain(d3.extent(graph_data, function (d) {
				return d.time_mili;
			}));
			y.domain([20, d3.max(graph_data, function (d) {
				return d.value;
			})]);

			// Nest the entries by site number
			var dataNest = d3.nest()
				.key(function (d) {
					return d.key;
				})
				.entries(graph_data);

			// Loop through each symbol / key
			dataNest.forEach(function (d) {

				svg.append("g")
					.attr('class', 'gages')
					.append("path")
					.attr("id", "hydro" + d.key)
					.attr("d", line(d.values));
			});

			// Add the X Axis
			svg.append("g")
				.attr("class", "axis")
				.attr("transform", "translate(0," + height + ")")
				.call(d3.axisBottom(x).tickFormat(d3.timeFormat("%B %e")));

			// Add the Y Axis
			svg.append("g")
				.attr("class", "axis")
				.call(d3.axisLeft(y).ticks(10, ".0f"));

			var focus = svg.append("g")
				.attr("transform", "translate(-100,-100)")
				.attr("class", "focus");
			focus.append("circle")
				.attr("r", 3.5);

			focus.append("text")
				.attr("y", -10);

			var voronoiGroup = svg.append("g")
				.attr("class", "voronoi");

			voronoiGroup.selectAll("path")
				.data(voronoi.polygons(d3.merge(dataNest.map(function (d) {
					return d.values
				}))))
				.enter().append("path")
				.attr("d", function (d) {
					return d ? "M" + d.join("L") + "Z" : null;
				})
				.on("mouseover", mouseover)
				.on("mouseout", mouseout)
				.on("click", function(d) { click(d.data.key, graph_data); });

			function mouseover(d) {
				d3.select(d.data.name).classed("gage--hover", true);
				focus.attr("transform", "translate(" + x(d.data.time_mili) + "," + y(d.data.value) + ")");
				focus.select("text").html(d.data.key + ": " + d.data.value + " cfs " + " " + d.data.time + " " + d.data.timezone);
			}

			function mouseout(d) {
				d3.select(d.data.name).classed("gage--hover", false);
				focus.attr("transform", "translate(-100,-100)");
			}
		}

		function click(key, data) {

			d3.select("svg").remove();

			var new_data = data.filter(function(d) {
				return d.key !== key;
			});

			update(new_data);
		}
	});
});
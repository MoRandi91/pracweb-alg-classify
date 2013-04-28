// vim: et si sw=2

function btnClear_do() {
  var $input = $("#inputData");
  $input.val("");
  $input.change();
}

function btnRandom_do() {
  var $input = $("#inputData");
  var text = "";
  var data = generateData();
  for (var i=0; i<data.length; ++i) {
    var item = data[i];
    text += item.x.toFixed(1) + " " 
          + item.y.toFixed(1) + " " 
          + item.c + " " 
          + (item.t?1:0) + "\n";
  }
  $input.val(text);
  $input.change();
}

function btnSubmit_do() {
  var colormap = {},
      colors = visual.color.domain();
  for (var i=0; i < colors.length; ++i) {
    var color = d3.rgb(visual.color(colors[i]));
    colormap[colors[i]] = [color.r, color.g, color.b];
  }
  var x_domain = visual.x.domain(),
      y_domain = visual.y.domain(),
      x_range = visual.x.range(),
      y_range = visual.y.range();

  var request = {
    objects: pracData
      .filter(function(d) { return d.valid; })
      .map(function(d) { return {x: d.x, y: d.y, c: d.c, t: d.t}; }),
    model: {
      classifiers: $("#selClassifiers").val(),
      corrector: $("#selCorrector").val(),
    },
    colors: colormap,
    grid: {
      left: x_domain[0],
      bottom: y_domain[0],
      right: x_domain[1],
      top: y_domain[1],
      width: x_range[1] - x_range[0],
      height: y_range[0] - y_range[1],
    }
  };

  $.ajax({
    url: "classifier",
    type: 'POST',
    contentType: 'application/json',
    processData: false,
    crossDomain: true,
    data: JSON.stringify(request),
  }).done(function(data) {
    var images = "";
    for (var img_name in data) {
      images += img_name + ': <img src="' + data[img_name]  +'" alt="' + img_name + '"> <br>';
    }
    $("#alerts").append(
    '<div class="alert alert-success">'
    + '<button type="button" class="close" '
    + 'data-dismiss="alert">&times;</button>'
    + images
    + '</div>');
  }).fail(function(xhr, textStatus, errorThrown) {
    $("#alerts").append(
    '<div class="alert alert-error">'
    + '<button type="button" class="close" '
    + 'data-dismiss="alert">&times;</button>'
    + '<strong>ERROR:</strong> ' + xhr.status 
    + ' (' + xhr.statusText + ') ' + xhr.responseText
    + '</div>');
  });
}

function parseInput(text) {
  var comment = /^\s*(?:\/\/.*)?$/;
  var object = /^\s*(\S+)\s+(\S+)\s+(\S+)\s+([01])\s*$/;
  var lines = text.split("\n");
  var data = Array();
  for (var i=0; i<lines.length; ++i) {
    if (comment.test(lines[i]))
      continue;
    var match = object.exec(lines[i]);
    var broken = false;
    if (match) {
      match[1] = +match[1];
      match[2] = +match[2];
      match[4] = +match[4];
      if (!isNaN(match[1]) && !isNaN(match[2])) {
        data.push({
          line: i,
          valid: true,
          x: match[1],
          y: match[2],
          c: match[3],
          t: match[4]
        });
      }
      else
        broken = true;
    } // if (match)
    else
      broken = true;
    if (broken) {
      data.push({
        line: i,
        valid: false,
        text: lines[i]
      });
    }
  }
  return data;
}

// STUB: generate a random data set
function generateData() {
  var data = new Array(),
      gen1 = d3.random.normal(10, 5),
      gen2 = d3.random.normal(20, 7),
      gen3 = d3.random.normal(25, 5),
      gen4 = d3.random.normal(5, 30),
      n1 = 25, nc1 = 7,
      n2 = 30, nc2 = 10;
  for (var i=0; i<n1; ++i) {
    data.push({x: gen1(), 
        y: gen2(), 
        c: "first",
        t: i < nc1});
  }
  for (var i=0; i<n2; ++i) {
    data.push({x: gen3(), 
        y: gen4(), 
        c: "second",
        t: i < nc2});
  }
  return data;
}

function smartExtent(data, accessor) {
  if (!data.length)
    return [0, 1];
  if (data.length == 1)
  {
    var d = accessor(data[0]);
    return [d-1, d+1];
  }
  var extent = d3.extent(data, accessor);
  var delta = Math.max(1.0, 0.1 * (extent[1] - extent[0]));
  extent[0] -= delta;
  extent[1] += delta;
  return extent;
}

function createVisual() {
  var width = $("#viewport").width() - margin.left - margin.right,
      height = $("#viewport").height() - margin.top - margin.bottom;

  visual.x = d3.scale.linear().range([0, width]);
  visual.y = d3.scale.linear().range([height, 0]);
  visual.color = d3.scale.category10();

  visual.xAxis = d3.svg.axis()
    .scale(visual.x)
    .orient("bottom");

  visual.yAxis = d3.svg.axis()
    .scale(visual.y)
    .orient("left");

  viewport = d3.select("#viewport")
    .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  // X axis
  viewport
    .append("g")
      .attr("id", "xAxis")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
      .call(visual.xAxis)
      .append("text")
        .attr("class", "label")
        .attr("x", width)
        .attr("y", -6)
        .style("text-anchor", "end")
        .text("X");

  // Y axis
  viewport
    .append("g")
      .attr("id", "yAxis")
      .attr("class", "y axis")
      .call(visual.yAxis)
      .append("text")
        .attr("class", "label")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", ".71em")
        .style("text-anchor", "end")
        .text("Y")
}

function redrawVisual(data) {
  data = data.filter(function(d) { return d.valid; });

  var width = $("#viewport").width() - margin.left - margin.right,
      height = $("#viewport").height() - margin.top - margin.bottom;

  visual.x
    .range([0, width])
    .domain(smartExtent(data, function(d) { return d.x; })).nice();
  visual.y
    .range([height, 0])
    .domain(smartExtent(data, function(d) { return d.y; })).nice();
  visual.color = d3.scale.category10();

  visual.xAxis.scale(visual.x); 
  visual.yAxis.scale(visual.y); 

  // X axis
  viewport.select("#xAxis")
    .transition()
    .attr("transform", "translate(0," + height + ")")
    .call(visual.xAxis)
    .select(".label")
      .attr("x", width)

  // Y axis
  viewport.select("#yAxis")
    .transition()
    .call(visual.yAxis)

  redrawObjects(data);
  redrawLegend(data);
}

function redrawObjects(data) {
  function transform(d, scale) {
    s = "translate(" + visual.x(d.x) + "," + visual.y(d.y) + ")";
    if (scale != null)
      s += ", scale(" + scale + ")";
    return s;
  }

  var showTrain = $("#toggleTrain").hasClass("active"),
      showControl = $("#toggleControl").hasClass("active"),
      showMap = $("#toggleMap").hasClass("active");
  console.log("toggles: ", showTrain, showControl, showMap);

  var object = viewport.selectAll(".dot")
    .data(data, function(d) { return [d.line, d.t]; });

  object.enter()
    .append("path")
      .attr("class", "dot")
      .attr("transform", function(d) { return transform(d, 5); })
      .attr("d", d3.svg.symbol()
          .type(function(d) { return d.t? "circle" : "triangle-up"; })
          .size(50))
      .style("opacity", 0)

  object
    .transition()
    .attr("transform", function(d) { return transform(d); })
    .style("opacity", function(d) {
      if (d.t)
        return showControl? 0.8 : 0;
      else
        return showTrain? 0.8 : 0;
    })
    .style("fill", function(d) { return visual.color(d.c); });

  object.exit()
    .transition()
    .attr("transform", function(d) { return transform(d, 5); })
    .style("opacity", 0)
    .remove();
}

function redrawLegend(data) {
  var legend = d3.select("#legend").selectAll("li")
    .data(visual.color.domain().sort(), function(d) { return d; });

  enter = legend.enter()
    .append("li")
      .append("span")
      .attr("class", "label")
      .text(function(d) { return d; })
      .style("background-color", visual.color);

  legend
    .transition()
    .selectAll("span")
      .text(function(d) { return d; })
      .style("background-color", visual.color);

  exit = legend.exit()
    .remove()
}

function drawObjTable(data) {
  var table = d3.select("#objTable tbody");
  
  var object = table.selectAll(".object")
    .data(data, function(d) { return [d.line, d.class, d.control] });

  object.enter().append("tr")
    .attr("class", "object");

  object.each(function(d) {
    var object = d3.select(this),
        line = d.line + 1;
    if (d.valid)
      object
        .classed("error", false)
        .html("<td>" + line + "</td>"
          + "<td>" + d.x + "</td>"
          + "<td>" + d.y + "</td>"
          + "<td>" + d.c + "</td>"
          + "<td>" + (d.t? "<i class=\"icon-ok\"></i>" : "") + "</td>");
    else
      object
        .classed("error", true)
        .html("<td>" + line + "</td>"
          + "<td colspan=4>" 
          + "<span class=\"label label-important\">Синтаксическая ошибка</span>" 
          + "<pre>" + d.text + "</pre></td>");
  });

  object.exit().remove();
}

function resizeViewport() {
  var viewport = $("#viewport")[0];
  fullSize = $(viewport).parent().width();
  $(viewport)
    .width(fullSize)
    .height(fullSize);
}

// Achtung: global variables!
var pracData = [];
var visual = new Object();
var margin = {top: 20, right: 20, bottom: 30, left: 40};
var viewport = null;


// Initialization
$("#inputData").keyup(function() {
  $("#inputData").change();
});
$("#inputData").change(function() {
  pracData = parseInput($("#inputData").val());
  redrawVisual(pracData);
  drawObjTable(pracData);
});
$(window).resize(resizeViewport);

$("#layerToggles button").click(function() { 
  $(this).toggleClass("btn-primary"); 
  setTimeout(function() { redrawVisual(pracData); }, 0);
});

$(window).load(function() {
  resizeViewport();
  createVisual();
  $("#inputData").change();
});

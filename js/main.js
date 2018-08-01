import { mouse, select, selectAll } from "d3-selection";
import { scaleOrdinal, scaleTime, scaleLinear } from "d3-scale";
import { schemeCategory10 } from "d3-scale-chromatic";
import { color } from "d3-color";
import { json } from "d3-fetch";
import { hierarchy, treemap } from "d3-hierarchy";
import { timeParse } from "d3-time-format";
import { extent, max } from "d3-array";
import { line, curveMonotoneX } from "d3-shape";
import { axisBottom, axisLeft } from "d3-axis";

window.addEventListener("load", function() {
  const getColor = (d, highlight) => {
    const c = color(colorScale(d.parent.data.key));
    c.opacity = highlight ? 1 : 0.8;
    return c;
  };

  const windowWidth = document.documentElement.clientWidth;
  const padding = 20;

  // tree
  const width = windowWidth - padding < 1040 ? windowWidth - padding : 1040,
    height = width / 2;

  const chart = select("#chart")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  const tm = treemap()
    .size([width, height])
    .round(true)
    .paddingInner(1);

  const colorScheme = schemeCategory10;
  colorScheme.push(colorScheme.shift(), colorScheme.shift());
  const colorScale = scaleOrdinal(colorScheme);

  const textSize = 13,
    textPadLeft = 4,
    textPadTop = 2;

  // line
  const lineWidth = 400,
    lineHeight = 200;

  const parseTime = timeParse("%b-%y");

  const x = scaleTime().range([0, lineWidth]),
    y = scaleLinear().range([lineHeight, 0]);

  // load data
  Promise.all([
    json("data-grouped.json"),
    json("data-monthly.json")
  ]).then(
    ([data, dataMonthly]) => {
      const root = hierarchy(data, d => d.values)
        .sum(d => d.value)
        .sort((a, b) => b.value - a.value);

      tm(root);

      const cell = chart
        .selectAll("g")
        .data(root.leaves())
        .enter()
        .append("g")
        .attr("transform", d => `translate(${d.x0},${d.y0})`);

      cell
        .append("rect")
        .attr("width", d => d.x1 - d.x0)
        .attr("height", d => d.y1 - d.y0)
        .attr("fill", d => getColor(d, false));

      const text = cell
        .append("text")
        .attr("x", textPadLeft)
        .attr("y", textSize + textPadTop)
        .text(d => d.data.key)
        .attr("font-size", `${textSize}px`)
        .classed("hidden", true);

      // only show text elements which fit into containing cell
      text.each(function(d) {
        const textBbox = this.getBBox(),
          textWidth = textBbox.width,
          textHeight = textBbox.height;

        const cellWidth = d.x1 - d.x0,
          cellHeight = d.y1 - d.y0;

        if (
          cellWidth > textWidth + textPadLeft &&
          cellHeight > textHeight + textPadTop
        ) {
          select(this).classed("hidden", false);
        }
      });

      // tooltip
      const tooltip = select("#chart")
        .append("div")
        .attr("class", "tooltip");

      selectAll("rect")
        .on("mouseover", function(d) {
          select(this).attr("fill", d => getColor(d, true));
        })
        .on("mousemove", function(d) {
          // place tooltip depending on mouse position
          const xPos = mouse(this)[0] + d.x0,
            yPos = mouse(this)[1] + d.y0;

          if (xPos < width / 2) {
            tooltip.style("left", `${xPos + 15}px`);
            tooltip.style("right", "auto");
          } else {
            tooltip.style("right", `${width - xPos + 15}px`);
            tooltip.style("left", "auto");
          }

          if (yPos < height / 2) {
            tooltip.style("top", `${yPos - 40}px`);
            tooltip.style("bottom", "auto");
          } else {
            tooltip.style("bottom", `${height - yPos - 40}px`);
            tooltip.style("top", "auto");
          }

          tooltip.html(
            `Type: <b>${
              d.parent.data.key
            }</b><br>Command: <b>${
              d.data.key
            }</b><br>Total executions: <b>${
              d.data.value
            }</b><div class="line-chart-title">Executions per month</div><div id="line-chart"></div>`
          );

          tooltip.style("display", "block");

          // line chart
          // find matching command in monthly data
          const key = d.data.key;
          const lineData = dataMonthly.find(datum => {
            if (key === "alias")
              return datum.cmd === key && datum.group === d.parent.data.key;
            else return datum.cmd === key;
          });

          // get monthly data for current command into correct format
          const months = [];
          for (let month in lineData.count) {
            months.push({
              month: parseTime(month),
              value: lineData.count[month]
            });
          }

          x.domain(extent(months, d => d.month));
          const maxValue = max(months, d => d.value);
          y.domain([0, maxValue]).nice();

          const cmdLine = line()
            .x(d => x(d.month))
            .y(d => y(d.value))
            .curve(curveMonotoneX);

          const lineChart = select("#line-chart")
            .append("svg")
            .attr("width", lineWidth)
            .attr("height", lineHeight)
            .append("g")
            .attr("transform", `translate(0, -20)`);

          lineChart
            .append("g")
            .attr("transform", `translate(0, ${lineHeight})`)
            .call(axisBottom(x));

          const numTicks = maxValue <= 5 ? 2 : 5;
          lineChart.append("g").call(axisLeft(y).ticks(numTicks));

          lineChart
            .append("path")
            .datum(months)
            .attr("class", "line")
            .attr("stroke", getColor(d, true))
            .attr("d", cmdLine);
        })
        .on("mouseleave", function(d) {
          select(this).attr("fill", d => getColor(d, false));
          tooltip.style("display", "none");
        });
    }
  );
});

const appState = {
    year: 2021,
    pollutant: 'Overall_AQI',
    linePollutant: 'All',
    selectedStates: [], 
    rawData: [],
    geoData: null,
    activeView: "map",
    datasetLoaded: false
};

const validStates = [
    "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Delaware",
    "District of Columbia","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa",
    "Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan","Minnesota",
    "Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire","New Jersey",
    "New Mexico","New York","North Carolina","North Dakota","Ohio","Oklahoma","Oregon",
    "Pennsylvania","Rhode Island","South Carolina","South Dakota","Tennessee","Texas","Utah",
    "Vermont","Virginia","Washington","West Virginia","Wisconsin","Wyoming"
];

const mainStates = validStates.filter(s => s !== "Alaska" && s !== "Hawaii");
const tooltip = d3.select("#tooltip");

Promise.all([
    d3.json("pollution_yearly_avg.json", d => {
        return {
            Year: +d.Year,
            State: d.State,
            "CO Mean": +d["CO Mean"],
            "NO2 Mean": +d["NO2 Mean"],
            "SO2 Mean": +d["SO2 Mean"],
            "O3 Mean": +d["O3 Mean"],
            "Overall_AQI": +d["Overall_AQI"],
            "CO AQI": +d["CO AQI"],
            "NO2 AQI": +d["NO2 AQI"],
            "SO2 AQI": +d["SO2 AQI"],
            "O3 AQI": +d["O3 AQI"],
            Main_Pollutant: d.Main_Pollutant
        };
    }),
    d3.json("https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json")
]).then(([data, us]) => {
    appState.rawData = data;
    appState.geoData = topojson.feature(us, us.objects.states);
    appState.fipsMap = buildFipsMap();
    init();
}).catch(err => {
    console.error("Data loading error:", err);
});

function buildFipsMap() {
    return {
        "01":"Alabama","02":"Alaska","04":"Arizona","05":"Arkansas","06":"California",
        "08":"Colorado","09":"Connecticut","10":"Delaware","11":"District of Columbia",
        "12":"Florida","13":"Georgia","15":"Hawaii","16":"Idaho","17":"Illinois",
        "18":"Indiana","19":"Iowa","20":"Kansas","21":"Kentucky","22":"Louisiana",
        "23":"Maine","24":"Maryland","25":"Massachusetts","26":"Michigan","27":"Minnesota",
        "28":"Mississippi","29":"Missouri","30":"Montana","31":"Nebraska","32":"Nevada",
        "33":"New Hampshire","34":"New Jersey","35":"New Mexico","36":"New York",
        "37":"North Carolina","38":"North Dakota","39":"Ohio","40":"Oklahoma","41":"Oregon",
        "42":"Pennsylvania","44":"Rhode Island","45":"South Carolina","46":"South Dakota",
        "47":"Tennessee","48":"Texas","49":"Utah","50":"Vermont","51":"Virginia",
        "53":"Washington","54":"West Virginia","55":"Wisconsin","56":"Wyoming"
    };
}

function init() {
    d3.select("#pollutant-selector").on("change", function() {
        appState.pollutant = this.value;
        d3.select("#pollutant-name-txt").text(this.options[this.selectedIndex].text);
        update();
    });

    d3.select("#year-slider").on("input", function() {
        appState.year = +this.value;
        d3.select("#year-val").text(appState.year);
        d3.select("#map-year-txt").text(`(${appState.year})`);
        update();
    });

    d3.select("#line-pollutant-selector")
    .on("change", function() {

        appState.linePollutant = this.value;

        renderLineChart();
    });

    d3.select("#reset-btn").on("click", () => {
        appState.selectedStates = [];
        d3.selectAll(".state")
            .attr("stroke", "#0a0a0c")
            .attr("stroke-width", 0.8);
        update();
    });
    
    d3.selectAll(".view-btn").on("click", function() {
    appState.activeView = this.dataset.view;

    d3.selectAll(".view-btn").classed("active", false);
    d3.select(this).classed("active", true);

    update();
});

    d3.selectAll(".nav-btn, .hero-btn").on("click", function() {
    const page = this.dataset.page;

    d3.selectAll(".page-section").classed("hidden", true);
    d3.select(`#${page}-section`).classed("hidden", false);

    d3.selectAll(".nav-btn").classed("active", false);
    d3.select(`.nav-btn[data-page="${page}"]`).classed("active", true);
    
    if (page === "dataset") {
    renderDatasetPreview();
}
    if (page === "analytics") {
        update();
    }
});

    const stateOptions = mainStates
    .filter(s => s !== "West Virginia")
    .map(s => `<option value="${s}">${s}</option>`)
    .join("");

d3.select("#state-1-selector").html(`<option value="">State 1</option>${stateOptions}`);
d3.select("#state-2-selector").html(`<option value="">State 2</option>${stateOptions}`);

d3.select("#state-1-selector").on("change", updateSelectedStatesFromDropdown);
d3.select("#state-2-selector").on("change", updateSelectedStatesFromDropdown);

    update();
}

function update() {
    renderTop5();

    d3.select(".map-box").style("display", appState.activeView === "map" ? "block" : "none");
    d3.select(".line-box").style("display", appState.activeView === "line" ? "block" : "none");
    d3.select(".heatmap-box").style("display", appState.activeView === "heat" ? "block" : "none");

    if (appState.activeView === "map") renderMap();
    if (appState.activeView === "line") renderLineChart();
    if (appState.activeView === "heat") renderHeatmap();
}


function getStateColor(stateName) {
    return "#add8e6";
}

function renderMap() {
    const container = d3.select("#map-container");
    container.selectAll("svg").remove();

    const svg = container.append("svg")
        .attr("viewBox", `0 0 960 600`)
        .attr("width", "100%")
        .attr("height", "100%")
        .style("background", "transparent")
        .style("overflow", "visible")
        .style("display", "block");

    svg.append("text")
        .attr("x", 480)
        .attr("y", 28)
        .attr("text-anchor", "middle")
        .attr("fill", "#ffffff")
        .attr("font-size", "18px")
        .attr("font-weight", "bold")
        .attr("letter-spacing", "3px")
        .attr("font-family", "Segoe UI, Tahoma, sans-serif")
        .text(`POLLUTION MAP ${appState.year}`);

    const zoomGroup = svg.append("g")
        .attr("class", "zoom-group");

    const statesGroup = zoomGroup.append("g")
        .attr("class", "states-group");

    const zoom = d3.zoom()
        .scaleExtent([1, 8])
        .translateExtent([[0, 0], [960, 600]])
        .on("zoom", (event) => {
            zoomGroup.attr("transform", event.transform);
        });

    svg.call(zoom)
       .on("dblclick.zoom", null);

    const projection = d3.geoAlbersUsa()
        .scale(1280)
        .translate([480, 300]);

    const path = d3.geoPath().projection(projection);

    const yearData = appState.rawData.filter(d => d.Year === appState.year);
    const dataMap = new Map(yearData.map(d => [d.State, d]));

    function lookupState(stateName) {
        if (!stateName) return null;
        if (dataMap.has(stateName)) return dataMap.get(stateName);

        for (const [k, v] of dataMap) {
            if (k.toLowerCase() === stateName.toLowerCase()) {
                return v;
            }
        }
        return null;
    }

    const fipsMap = appState.fipsMap;

    const features = (appState.geoData.features || []).filter(f => {
        const fips = String(f.id).padStart(2, '0');

        if (fips === "02" || fips === "15") return false;

        const name = fipsMap[fips];

        if (!name) return false;
        if (!mainStates.includes(name)) return false;

        return true;
    });

    statesGroup.selectAll(".state")
        .data(features)
        .enter()
        .append("path")
        .attr("class", "state")
        .attr("d", d => path(d) || "")
        .attr("fill", d => {
            const fips = String(d.id).padStart(2, '0');
            const name = fipsMap[fips];
            return name ? getStateColor(name) : "#333";
        })
        .attr("fill-opacity", 0.75)
        .attr("stroke", d => {
            const name = fipsMap[String(d.id).padStart(2, '0')];
            return appState.selectedStates.includes(name)
                ? "#ffffff"
                : "#0a0a0c";
        })
        .attr("stroke-width", d => {
            const name = fipsMap[String(d.id).padStart(2, '0')];
            return appState.selectedStates.includes(name)
                ? 2.5
                : 0.8;
        })
        .attr("data-state", d => {
            const fips = String(d.id).padStart(2, '0');
            return fipsMap[fips] || "";
        })

        .on("mouseover", function(event, d) {

            const fips = String(d.id).padStart(2, '0');
            const name = fipsMap[fips];

            if (name === "West Virginia") {
                tooltip.transition()
                    .duration(100)
                    .style("opacity", 1);

                tooltip.html(`
                    <div class="tooltip-wv">
                        There is no available data for West Virginia
                    </div>
                `);

                return;
            }

            const s = lookupState(name);

            d3.select(this)
                .raise()
                .attr("stroke", "#ffffff")
                .attr("stroke-width", 2.5)
                .attr("fill-opacity", 1);

            const aqi = s
                ? s.Overall_AQI.toFixed(1)
                : 'N/A';

            const aqiColor = s
                ? aqiToColor(s.Overall_AQI)
                : '#fff';

            tooltip.transition()
                .duration(100)
                .style("opacity", 1);

            tooltip.html(`
                <div style="border-bottom:1px solid #333; padding-bottom:8px; margin-bottom:8px;">
                    <strong style="color:#4db8ff; font-size:16px">
                        ${name || 'Unknown'}
                    </strong>
                </div>

                <div class="tooltip-row">
                    <span>Overall AQI:</span>
                    <span class="val-bold" style="color:${aqiColor}">
                        ${aqi}
                    </span>
                </div>

                <div class="tooltip-row">
                    <span>O3 AQI:</span>
                    <span>${s ? s["O3 AQI"].toFixed(1) : 'N/A'}</span>
                </div>

                <div class="tooltip-row">
                    <span>NO2 AQI:</span>
                    <span>${s ? s["NO2 AQI"].toFixed(1) : 'N/A'}</span>
                </div>

                <div class="tooltip-row">
                    <span>SO2 AQI:</span>
                    <span>${s ? s["SO2 AQI"].toFixed(1) : 'N/A'}</span>
                </div>

                <div class="tooltip-row">
                    <span>CO AQI:</span>
                    <span>${s ? s["CO AQI"].toFixed(1) : 'N/A'}</span>
                </div>

                ${s ? `
                    <div class="tooltip-row"
                        style="margin-top:6px;
                        border-top:1px solid #333;
                        padding-top:6px;">
                        
                        <span>Main Pollutant:</span>

                        <span style="color:#f9a825">
                            ${s.Main_Pollutant}
                        </span>
                    </div>
                ` : ''}
            `);
        })

        .on("mousemove", (event) => {
            tooltip
                .style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY - 15) + "px");
        })

        .on("mouseout", function(event, d) {

            const fips = String(d.id).padStart(2, '0');
            const name = fipsMap[fips];

            const isSelected =
                appState.selectedStates.includes(name);

            d3.select(this)
                .attr("stroke",
                    isSelected ? "#ffffff" : "#0a0a0c")
                .attr("stroke-width",
                    isSelected ? 2.5 : 0.8)
                .attr("fill-opacity", 0.75);

            tooltip.transition()
                .duration(200)
                .style("opacity", 0);
        })

        .on("click", function(event, d) {

            const fips = String(d.id).padStart(2, '0');
            const stateName = fipsMap[fips];

            if (stateName === "West Virginia") return;
            if (!stateName) return;

            const idx =
                appState.selectedStates.indexOf(stateName);

            if (idx > -1) {
                appState.selectedStates.splice(idx, 1);
            } else {

                if (appState.selectedStates.length >= 2) {
                    appState.selectedStates.shift();
                }

                appState.selectedStates.push(stateName);
            }

            svg.selectAll(".state")
                .attr("stroke", feature => {

                    const fName =
                        fipsMap[String(feature.id).padStart(2, '0')];

                    return appState.selectedStates.includes(fName)
                        ? "#ffffff"
                        : "#0a0a0c";
                })
                .attr("stroke-width", feature => {

                    const fName =
                        fipsMap[String(feature.id).padStart(2, '0')];

                    return appState.selectedStates.includes(fName)
                        ? 2.5
                        : 0.8;
                });

            syncStateDropdowns();
            renderLineChart();
        });

    const labelStates = [
        "California","Texas","Montana","New Mexico","Arizona",
        "Nevada","Colorado","Oregon","Wyoming","Idaho","Utah",
        "Kansas","Nebraska","South Dakota","North Dakota",
        "Oklahoma","Missouri","Minnesota","Iowa","Wisconsin",
        "Illinois","Michigan","Indiana","Ohio","Georgia",
        "Florida","Alabama","Mississippi","Tennessee",
        "Kentucky","Virginia","Pennsylvania","New York",
        "North Carolina","Arkansas","Louisiana","Washington"
    ];

    statesGroup.selectAll(".state-label")
        .data(features.filter(d => {
            const fips = String(d.id).padStart(2, '0');
            return labelStates.includes(fipsMap[fips]);
        }))
        .enter()
        .append("text")
        .attr("class", "state-label")
        .attr("transform", d => {
            const centroid = path.centroid(d);

            if (!centroid || isNaN(centroid[0])) {
                return "translate(0,0)";
            }

            return `translate(${centroid})`;
        })
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "central")
        .attr("fill", "rgba(255,255,255,0.85)")
        .attr("font-size", "9px")
        .attr("font-weight", "600")
        .attr("font-family", "Segoe UI, Tahoma, sans-serif")
        .attr("pointer-events", "none")
        .text(d => {
            const fips = String(d.id).padStart(2, '0');
            const name = fipsMap[fips];

            return name === "District of Columbia"
                ? "DC"
                : stateAbbr(name);
        });
    };

function aqiToColor(aqi) {
    if (aqi <= 50) return "#00e400";
    if (aqi <= 100) return "#ffff00";
    if (aqi <= 150) return "#ff7e00";
    if (aqi <= 200) return "#ff0000";
    return "#8f3f97";
}

function stateAbbr(name) {
    const map = {
        "Alabama":"AL","Alaska":"AK","Arizona":"AZ","Arkansas":"AR","California":"CA",
        "Colorado":"CO","Connecticut":"CT","Delaware":"DE","District of Columbia":"DC",
        "Florida":"FL","Georgia":"GA","Hawaii":"HI","Idaho":"ID","Illinois":"IL",
        "Indiana":"IN","Iowa":"IA","Kansas":"KS","Kentucky":"KY","Louisiana":"LA",
        "Maine":"ME","Maryland":"MD","Massachusetts":"MA","Michigan":"MI","Minnesota":"MN",
        "Mississippi":"MS","Missouri":"MO","Montana":"MT","Nebraska":"NE","Nevada":"NV",
        "New Hampshire":"NH","New Jersey":"NJ","New Mexico":"NM","New York":"NY",
        "North Carolina":"NC","North Dakota":"ND","Ohio":"OH","Oklahoma":"OK","Oregon":"OR",
        "Pennsylvania":"PA","Rhode Island":"RI","South Carolina":"SC","South Dakota":"SD",
        "Tennessee":"TN","Texas":"TX","Utah":"UT","Vermont":"VT","Virginia":"VA",
        "Washington":"WA","West Virginia":"WV","Wisconsin":"WI","Wyoming":"WY"
    };
    return map[name] || (name ? name.slice(0,2).toUpperCase() : "");
}

function renderTop5() {
    const yearData = appState.rawData.filter(d => d.Year === appState.year);
    const top5 = [...yearData].sort((a, b) => b[appState.pollutant] - a[appState.pollutant]).slice(0, 5);

    const container = d3.select("#top-5-list").html("");
    top5.forEach((d, i) => {
        container.append("div").attr("class", "top-card").html(`
            <div><span class="top-rank">#${i+1}</span> ${d.State}</div>
            <div style="font-weight:bold">${d[appState.pollutant].toFixed(2)}</div>
        `);
    });
}

function renderLineChart() {
    const container = d3.select("#line-chart-container");
    const width = container.node().clientWidth;
    const height = container.node().clientHeight;
    container.selectAll("svg").remove();

    const states = appState.selectedStates;
    
    let titleText = "National Average";
    if (states.length === 1) titleText = states[0];
    if (states.length === 2) titleText = `${states[0]} vs ${states[1]}`;
    d3.select("#state-name-txt").text(titleText);

    let chartData = [];
    const allPollutants = [
    "NO2 Mean",
    "CO Mean",
    "SO2 Mean",
    "O3 Mean"
];

    const pollutants =
        appState.linePollutant === "All"
            ? allPollutants
            : [appState.linePollutant];

    const colorMap = {
        "NO2 Mean": "#ff4757",
        "CO Mean": "#4db8ff",
        "SO2 Mean": "#00e676",
        "O3 Mean": "#f9a825"
};

    if (states.length > 0) {
        states.forEach(state => {
            const stateData = appState.rawData
                .filter(d => d.State === state)
                .sort((a, b) => a.Year - b.Year);
            if(stateData.length > 0) chartData.push({ name: state, data: stateData });
        });
    } else {
        const years = [...new Set(appState.rawData.map(d => d.Year))].sort();
        const natData = years.map(y => {
            const yearRows = appState.rawData.filter(d => d.Year === y);
            const row = { Year: y };
            pollutants.forEach(p => {
                row[p] = d3.mean(yearRows, d => d[p]);
            });
            return row;
        });
        chartData.push({ name: "National", data: natData });
    }

    if (chartData.length === 0) return;

    const svg = container.append("svg").attr("width", width).attr("height", height);
    const margin = { top: 20, right: 100, bottom: 40, left: 55 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const yScales = {};
    pollutants.forEach(p => {
        let maxVal = 0;
        chartData.forEach(series => {
            const seriesMax = d3.max(
                    series.data.filter(d => d[p] != null),
                    d => d[p]
            ) || 0;
            if (seriesMax > maxVal) maxVal = seriesMax;
        });
        yScales[p] = d3.scaleLinear().domain([0, maxVal * 1.15]).range([innerH, 0]);
    });

    const allYears = chartData.flatMap(series =>
    series.data.map(d => d.Year)
);

const x = d3.scaleLinear()
    .domain([
        d3.min(allYears),
        d3.max(allYears)
    ])
    .range([0, innerW]);

    g.append("g")
        .attr("transform", `translate(0,${innerH})`)
        .call(d3.axisBottom(x).tickFormat(d3.format("d")))
        .selectAll("text").attr("fill", "#aaa");

    g.append("g")
        .call(
                d3.axisLeft(
                    yScales[pollutants[0]]
                ).ticks(5)
            )
        .selectAll("text").attr("fill", "#aaa");

    g.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -40)
        .attr("x", -innerH / 2)
        .attr("text-anchor", "middle")
        .attr("fill", "#5a6480")
        .style("font-size", "10px")
        .text("Relative Trend Values");

    chartData.forEach((series, sIdx) => {
        const isDashed = sIdx === 1;
        const dashArray = isDashed ? "6,4" : "none";

        pollutants.forEach((p, pIdx) => {
            const line = d3.line()
                .defined(d => d[p] != null && !isNaN(d[p]))
                .x(d => x(d.Year))
                .y(d => yScales[p](d[p]))
                .curve(d3.curveMonotoneX);

            g.append("path")
                .datum(series.data)
                .attr("fill", "none")
                .attr("stroke", colorMap[p])
                .attr("stroke-width", 2.5)
                .attr("stroke-dasharray", dashArray)
                .attr("d", line);

            g.selectAll(`.dot-${sIdx}-${pIdx}`)
                .data(series.data.filter(d =>
                        d[p] != null && !isNaN(d[p])
                    ))
                .enter().append("circle")
                .attr("cx", d => x(d.Year))
                .attr("cy", d => yScales[p](d[p]))
                .attr("r", 3.5)
                .attr("fill", isDashed ? "#080a0e" : colorMap[p])
                .attr("stroke", colorMap[p])
                .attr("stroke-width", 1.5);
        });
    });

    const legend = svg.append("g")
        .attr("transform", `translate(${width - margin.right + 15}, ${margin.top})`);
        
    pollutants.forEach((p, i) => {
        const legendRow = legend.append("g").attr("transform", `translate(0, ${i * 20})`);
        legendRow.append("rect")
            .attr("width", 12)
            .attr("height", 12)
            .attr("fill", colorMap[p]);
        legendRow.append("text").attr("x", 18).attr("y", 10).attr("fill", "#c8d0e0").style("font-size", "11px").text(p.replace(" Mean", ""));
    });

    if (states.length === 2) {
        const stateLegend = svg.append("g")
            .attr("transform", `translate(${width - margin.right + 15}, ${margin.top + pollutants.length * 20 + 15})`);
        
        stateLegend.append("line").attr("x1", 0).attr("x2", 12).attr("y1", 6).attr("y2", 6).attr("stroke", "#fff").attr("stroke-width", 2);
        stateLegend.append("text").attr("x", 18).attr("y", 10).attr("fill", "#fff").style("font-size", "10px").text(states[0]);
        
        stateLegend.append("line").attr("x1", 0).attr("x2", 12).attr("y1", 26).attr("y2", 26).attr("stroke", "#fff").attr("stroke-width", 2).attr("stroke-dasharray", "4,3");
        stateLegend.append("text").attr("x", 18).attr("y", 30).attr("fill", "#fff").style("font-size", "10px").text(states[1]);
    }
}

function renderHeatmap() {
    const container = d3.select("#heatmap-container");
    container.selectAll("svg").remove();

    const width = container.node().clientWidth;
    const states = mainStates.filter(s => s !== "West Virginia");
    const cellH = 18;
    const height = Math.max(container.node().clientHeight, states.length * cellH + 90);

    if (!width || !height) return;

    const svg = container.append("svg")
        .attr("width", width)
        .attr("height", height);

    const margin = { top: 30, right: 30, bottom: 45, left: 115 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const pollutant = appState.pollutant;

    const years = [...new Set(appState.rawData.map(d => d.Year))]
        .sort((a, b) => a - b);

    const data = appState.rawData.filter(d =>
        states.includes(d.State) &&
        d[pollutant] != null &&
        !isNaN(d[pollutant])
    );

    const x = d3.scaleBand()
        .domain(years)
        .range([0, innerW])
        .padding(0.04);

    const y = d3.scaleBand()
        .domain(states)
        .range([0, innerH])
        .padding(0.15);

    const color = d3.scaleSequential()
        .interpolator(d3.interpolateYlOrRd)
        .domain([
            d3.min(data, d => d[pollutant]),
            d3.max(data, d => d[pollutant])
        ]);

    g.selectAll(".heat-cell")
        .data(data)
        .enter()
        .append("rect")
        .attr("class", "heat-cell")
        .attr("x", d => x(d.Year))
        .attr("y", d => y(d.State))
        .attr("width", x.bandwidth())
        .attr("height", y.bandwidth())
        .attr("rx", 2)
        .attr("fill", d => color(d[pollutant]))
        .on("mouseover", function(event, d) {
            tooltip.transition().duration(100).style("opacity", 1);
            tooltip.html(`
                <strong style="color:#4db8ff">${d.State}</strong><br>
                Year: ${d.Year}<br>
                ${pollutant}: ${d[pollutant].toFixed(2)}
            `);
        })
        .on("mousemove", event => {
            tooltip
                .style("left", event.pageX + 15 + "px")
                .style("top", event.pageY - 15 + "px");
        })
        .on("mouseout", () => {
            tooltip.transition().duration(200).style("opacity", 0);
        });

    g.append("g")
        .attr("transform", `translate(0,${innerH})`)
        .call(
            d3.axisBottom(x)
                .tickValues(years.filter(y => y % 2 === 0))
                .tickFormat(d3.format("d"))
        )
        .selectAll("text")
        .attr("fill", "#aaa")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end");

    g.append("g")
        .call(d3.axisLeft(y))
        .selectAll("text")
        .attr("fill", "#aaa")
        .style("font-size", "8px");
}

function updateSelectedStatesFromDropdown() {
    const s1 = d3.select("#state-1-selector").property("value");
    const s2 = d3.select("#state-2-selector").property("value");

    appState.selectedStates = [];

    if (s1) appState.selectedStates.push(s1);
    if (s2 && s2 !== s1) appState.selectedStates.push(s2);

    renderLineChart();
}

function renderDatasetPreview() {
    if (appState.datasetLoaded) return;
    const container = d3.select("#dataset-table-container");
    container.html("");

    d3.csv("pollution_2000_2021.csv").then(data => {
        const previewData = data.slice(0, 100);
        const columns = Object.keys(previewData[0]);

        const table = container.append("table")
            .attr("class", "dataset-table");

        table.append("thead")
            .append("tr")
            .selectAll("th")
            .data(columns)
            .enter()
            .append("th")
            .text(d => d);

        const rows = table.append("tbody")
            .selectAll("tr")
            .data(previewData)
            .enter()
            .append("tr");

        rows.selectAll("td")
            .data(row => columns.map(col => row[col]))
            .enter()
            .append("td")
            .text(d => d);

        appState.datasetLoaded = true;
    });
}

function syncStateDropdowns() {
    d3.select("#state-1-selector")
        .property("value", appState.selectedStates[0] || "");

    d3.select("#state-2-selector")
        .property("value", appState.selectedStates[1] || "");
}

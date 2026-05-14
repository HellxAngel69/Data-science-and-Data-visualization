const appState = {
    year: 2021,
    pollutant: 'Overall_AQI',
    selectedStates: [], 
    rawData: [],
    geoData: null
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

    d3.select("#reset-btn").on("click", () => {
        appState.selectedStates = [];
        d3.selectAll(".state")
            .attr("stroke", "#0a0a0c")
            .attr("stroke-width", 0.8);
        update();
    });

    update();
}

function update() {
    renderMap();
    renderTop5();
    renderLineChart();
}

const stateColorIndex = {};
validStates.forEach((s, i) => { stateColorIndex[s] = i; });

function getStateColor(stateName) {
    const idx = stateColorIndex[stateName] ?? 0;
    const hue = (idx * 137.508) % 360; 
    return `hsl(${hue}, 65%, 52%)`;
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

    const projection = d3.geoAlbersUsa().scale(1280).translate([480, 300]);
    const path = d3.geoPath().projection(projection);

    const yearData = appState.rawData.filter(d => d.Year === appState.year);
    const dataMap = new Map(yearData.map(d => [d.State, d]));

    function lookupState(stateName) {
        if (!stateName) return null;
        if (dataMap.has(stateName)) return dataMap.get(stateName);
        for (const [k, v] of dataMap) {
            if (k.toLowerCase() === stateName.toLowerCase()) return v;
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

    const statesGroup = svg.append("g").attr("class", "states-group");

    statesGroup.selectAll(".state")
        .data(features)
        .enter().append("path")
        .attr("class", "state")
        .attr("d", d => {
            const result = path(d);
            return result || "";
        })
        .attr("fill", d => {
            const fips = String(d.id).padStart(2, '0');
            const name = fipsMap[fips];
            return name ? getStateColor(name) : "#333";
        })
        .attr("fill-opacity", 0.75)
        .attr("stroke", d => {
            const name = fipsMap[String(d.id).padStart(2, '0')];
            return appState.selectedStates.includes(name) ? "#ffffff" : "#0a0a0c";
        })
        .attr("stroke-width", d => {
            const name = fipsMap[String(d.id).padStart(2, '0')];
            return appState.selectedStates.includes(name) ? 2.5 : 0.8;
        })
        .attr("data-state", d => {
            const fips = String(d.id).padStart(2, '0');
            return fipsMap[fips] || "";
        })
        .on("mouseover", function(event, d) {
            const fips = String(d.id).padStart(2, '0');
            const name = fipsMap[fips];

            if (name === "West Virginia") {
                tooltip.transition().duration(100).style("opacity", 1);
                tooltip.html(`<div class="tooltip-wv">There is no available data for West Virginia</div>`);
                return;
            }

            const s = lookupState(name);

            d3.select(this)
                .raise() 
                .attr("stroke", "#ffffff")
                .attr("stroke-width", 2.5)
                .attr("fill-opacity", 1);

            const aqi = s ? s.Overall_AQI.toFixed(1) : 'N/A';
            const aqiColor = s ? aqiToColor(s.Overall_AQI) : '#fff';

            tooltip.transition().duration(100).style("opacity", 1);
            tooltip.html(`
                <div style="border-bottom:1px solid #333; padding-bottom:8px; margin-bottom:8px;">
                    <strong style="color:#4db8ff; font-size:16px">${name || 'Unknown'}</strong>
                </div>
                <div class="tooltip-row"><span>Overall AQI:</span> <span class="val-bold" style="color:${aqiColor}">${aqi}</span></div>
                <div class="tooltip-row"><span>O3 AQI:</span> <span>${s ? s["O3 AQI"].toFixed(1) : 'N/A'}</span></div>
                <div class="tooltip-row"><span>NO2 AQI:</span> <span>${s ? s["NO2 AQI"].toFixed(1) : 'N/A'}</span></div>
                <div class="tooltip-row"><span>SO2 AQI:</span> <span>${s ? s["SO2 AQI"].toFixed(1) : 'N/A'}</span></div>
                <div class="tooltip-row"><span>CO AQI:</span> <span>${s ? s["CO AQI"].toFixed(1) : 'N/A'}</span></div>
                ${s ? `<div class="tooltip-row" style="margin-top:6px; border-top:1px solid #333; padding-top:6px;"><span>Main Pollutant:</span> <span style="color:#f9a825">${s.Main_Pollutant}</span></div>` : ''}
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
            const isSelected = appState.selectedStates.includes(name);

            d3.select(this)
                .attr("stroke", isSelected ? "#ffffff" : "#0a0a0c")
                .attr("stroke-width", isSelected ? 2.5 : 0.8)
                .attr("fill-opacity", 0.75);
                
            tooltip.transition().duration(200).style("opacity", 0);
        })
        .on("click", function(event, d) {
            const fips = String(d.id).padStart(2, '0');
            const stateName = fipsMap[fips];
            
            if (stateName === "West Virginia") return; 
            if (!stateName) return;

            const idx = appState.selectedStates.indexOf(stateName);
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
                    const fName = fipsMap[String(feature.id).padStart(2, '0')];
                    return appState.selectedStates.includes(fName) ? "#ffffff" : "#0a0a0c";
                })
                .attr("stroke-width", feature => {
                    const fName = fipsMap[String(feature.id).padStart(2, '0')];
                    return appState.selectedStates.includes(fName) ? 2.5 : 0.8;
                });
            
            svg.selectAll(".state").filter(feature => {
                const fName = fipsMap[String(feature.id).padStart(2, '0')];
                return appState.selectedStates.includes(fName);
            }).raise();

            renderLineChart();
        });

    const labelStates = [
        "California","Texas","Montana","New Mexico","Arizona","Nevada","Colorado","Oregon",
        "Wyoming","Idaho","Utah","Kansas","Nebraska","South Dakota","North Dakota","Oklahoma",
        "Missouri","Minnesota","Iowa","Wisconsin","Illinois","Michigan","Indiana","Ohio",
        "Georgia","Florida","Alabama","Mississippi","Tennessee","Kentucky","Virginia",
        "Pennsylvania","New York","North Carolina","Arkansas","Louisiana","Washington"
    ];

    statesGroup.selectAll(".state-label")
        .data(features.filter(d => {
            const fips = String(d.id).padStart(2, '0');
            return labelStates.includes(fipsMap[fips]);
        }))
        .enter().append("text")
        .attr("class", "state-label")
        .attr("transform", d => {
            const centroid = path.centroid(d);
            if (!centroid || isNaN(centroid[0])) return "translate(0,0)";
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
            return name === "District of Columbia" ? "DC" : stateAbbr(name);
        });
}

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
    const pollutants = ["NO2 Mean", "CO Mean", "SO2 Mean", "O3 Mean"];
    const colors = ["#ff4757", "#4db8ff", "#00e676", "#f9a825"];

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
            const seriesMax = d3.max(series.data, d => d[p]);
            if (seriesMax > maxVal) maxVal = seriesMax;
        });
        yScales[p] = d3.scaleLinear().domain([0, maxVal * 1.15]).range([innerH, 0]);
    });

    const x = d3.scaleLinear()
        .domain([
            d3.min(chartData[0].data, d => d.Year),
            d3.max(chartData[0].data, d => d.Year)
        ])
        .range([0, innerW]);

    g.append("g")
        .attr("transform", `translate(0,${innerH})`)
        .call(d3.axisBottom(x).tickFormat(d3.format("d")))
        .selectAll("text").attr("fill", "#aaa");

    g.append("g")
        .call(d3.axisLeft(yScales["NO2 Mean"]).ticks(5))
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
                .x(d => x(d.Year))
                .y(d => yScales[p](d[p]))
                .curve(d3.curveMonotoneX);

            g.append("path")
                .datum(series.data)
                .attr("fill", "none")
                .attr("stroke", colors[pIdx])
                .attr("stroke-width", 2.5)
                .attr("stroke-dasharray", dashArray)
                .attr("d", line);

            g.selectAll(`.dot-${sIdx}-${pIdx}`)
                .data(series.data)
                .enter().append("circle")
                .attr("cx", d => x(d.Year))
                .attr("cy", d => yScales[p](d[p]))
                .attr("r", 3.5)
                .attr("fill", isDashed ? "#080a0e" : colors[pIdx])
                .attr("stroke", colors[pIdx])
                .attr("stroke-width", 1.5);
        });
    });

    const legend = svg.append("g")
        .attr("transform", `translate(${width - margin.right + 15}, ${margin.top})`);
        
    pollutants.forEach((p, i) => {
        const legendRow = legend.append("g").attr("transform", `translate(0, ${i * 20})`);
        legendRow.append("rect").attr("width", 12).attr("height", 12).attr("fill", colors[i]);
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

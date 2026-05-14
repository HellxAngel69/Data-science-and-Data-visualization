const appState = {
    year: 2021,
    pollutant: 'Overall_AQI',
    selectedState: null,
    rawData: [],
    geoData: null
};

// CHỐT CỨNG 51 BANG ĐỂ XÓA 2 Ô VUÔNG RÁC
const validStates = [
    "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Delaware",
    "District of Columbia","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa",
    "Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan","Minnesota",
    "Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire","New Jersey",
    "New Mexico","New York","North Carolina","North Dakota","Ohio","Oklahoma","Oregon",
    "Pennsylvania","Rhode Island","South Carolina","South Dakota","Tennessee","Texas","Utah",
    "Vermont","Virginia","Washington","West Virginia","Wisconsin","Wyoming"
];

// States that are rendered inline (not in inset boxes)
const mainStates = validStates.filter(s => s !== "Alaska" && s !== "Hawaii");

const tooltip = d3.select("#tooltip");

Promise.all([
    d3.json("pollution_yearly_avg.json"),
    // Use albersusa topojson which has proper AK/HI insets already handled,
    // or use the census cartographic boundary which is clean.
    // Using a reliable source that has individual state features without a bounding box.
    d3.json("https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json")
]).then(([data, us]) => {
    appState.rawData = data;
    // Convert topojson to geojson
    appState.geoData = topojson.feature(us, us.objects.states);
    // Attach FIPS-to-name mapping
    appState.fipsMap = buildFipsMap();
    init();
}).catch(err => {
    console.error("Data loading error:", err);
});

// FIPS codes for all 50 states + DC, excluding Alaska (02) and Hawaii (15)
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
        appState.selectedState = null;
        update();
    });

    update();
}

function update() {
    renderMap();
    renderTop5();
    renderLineChart();
}

// Assign a fixed unique color index to each state so colors never change
const stateColorIndex = {};
validStates.forEach((s, i) => { stateColorIndex[s] = i; });

function getStateColor(stateName) {
    const idx = stateColorIndex[stateName] ?? 0;
    const hue = (idx * 137.508) % 360; // golden angle — maximally distinct
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

    // Map title overlay
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

    // AlbersUSA projection — this naturally places AK & HI as insets,
    // but since we filter them out by FIPS, they simply won't appear.
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

    // Filter features: only include continental 48 + DC
    // FIPS "02" = Alaska, "15" = Hawaii — exclude both
    const features = (appState.geoData.features || []).filter(f => {
        const fips = String(f.id).padStart(2, '0');
        if (fips === "02" || fips === "15") return false; // No AK or HI
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
            // Some features may not project (outside AlbersUSA bounds) — guard against null
            const result = path(d);
            return result || "";
        })
        .attr("fill", d => {
            const fips = String(d.id).padStart(2, '0');
            const name = fipsMap[fips];
            return name ? getStateColor(name) : "#333";
        })
        .attr("fill-opacity", 0.75)
        .attr("stroke", "#0a0a0c")
        .attr("stroke-width", 0.8)
        .attr("data-state", d => {
            const fips = String(d.id).padStart(2, '0');
            return fipsMap[fips] || "";
        })
        .on("mouseover", function(event, d) {
            const fips = String(d.id).padStart(2, '0');
            const name = fipsMap[fips];
            const s = lookupState(name);

            // Only highlight THIS path
            d3.select(this)
                .raise() // bring to front so stroke isn't clipped
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
        .on("mouseout", function() {
            d3.select(this)
                .attr("stroke", "#0a0a0c")
                .attr("stroke-width", 0.8)
                .attr("fill-opacity", 0.75);
            tooltip.transition().duration(200).style("opacity", 0);
        })
        .on("click", function(event, d) {
            const fips = String(d.id).padStart(2, '0');
            appState.selectedState = fipsMap[fips] || null;
            renderLineChart();
        });

    // State abbreviation labels for larger states
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

    const state = appState.selectedState;
    d3.select("#state-name-txt").text(state ? state : "National Average");

    let data;
    if (state) {
        data = appState.rawData.filter(d => d.State === state || d.State.toLowerCase() === state.toLowerCase())
            .sort((a, b) => a.Year - b.Year);
    } else {
        const years = [...new Set(appState.rawData.map(d => d.Year))].sort();
        data = years.map(y => ({
            Year: y,
            [appState.pollutant]: d3.mean(appState.rawData.filter(d => d.Year === y), d => d[appState.pollutant])
        }));
    }

    const svg = container.append("svg").attr("width", width).attr("height", height);
    const margin = { top: 20, right: 30, bottom: 40, left: 55 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear().domain(d3.extent(data, d => d.Year)).range([0, innerW]);
    const y = d3.scaleLinear().domain([0, d3.max(data, d => d[appState.pollutant]) * 1.15]).range([innerH, 0]);

    // Grid lines
    g.append("g")
        .attr("class", "grid")
        .call(d3.axisLeft(y).tickSize(-innerW).tickFormat(""))
        .selectAll("line")
        .attr("stroke", "#2d2d35")
        .attr("stroke-dasharray", "3,3");
    g.select(".grid .domain").remove();

    // Axes
    g.append("g")
        .attr("transform", `translate(0,${innerH})`)
        .call(d3.axisBottom(x).tickFormat(d3.format("d")))
        .selectAll("text").attr("fill", "#aaa");
    g.append("g")
        .call(d3.axisLeft(y))
        .selectAll("text").attr("fill", "#aaa");

    // Area fill
    const area = d3.area()
        .x(d => x(d.Year))
        .y0(innerH)
        .y1(d => y(d[appState.pollutant]));

    g.append("path")
        .datum(data)
        .attr("fill", "rgba(77,184,255,0.12)")
        .attr("d", area);

    // Line
    const line = d3.line().x(d => x(d.Year)).y(d => y(d[appState.pollutant]));
    g.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", "#4db8ff")
        .attr("stroke-width", 2.5)
        .attr("d", line);

    // Dots
    g.selectAll(".dot")
        .data(data)
        .enter().append("circle")
        .attr("class", "dot")
        .attr("cx", d => x(d.Year))
        .attr("cy", d => y(d[appState.pollutant]))
        .attr("r", 4)
        .attr("fill", "#4db8ff")
        .attr("stroke", "#0a0a0c")
        .attr("stroke-width", 1.5);
}

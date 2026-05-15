# Data-science-and-Data-visualization
# US Air Quality Analytics Dashboard

Interactive environmental data visualization dashboard built with **D3.js** for analyzing U.S. air pollution trends from **2000-2021**.

This project transforms large-scale EPA pollution datasets into interactive visual analytics, including choropleth maps, trend analysis charts, and heatmaps.

---

## Preview

### Landing Page

* Modern environmental-themed interface
* Multi-page navigation
* Interactive dashboard experience

### Analytics Dashboard

* Interactive U.S. pollution map
* Multi-state comparison
* Pollutant trend analysis
* Heatmap visualization
* Top polluted states ranking
* AQI scale reference

---

## Features

### Interactive Choropleth Map

* U.S. state visualization
* Hover tooltips
* AQI information
* State selection
* Zoom & pan support

### Trend Analysis

* Multi-line chart visualization
* Compare up to 2 states
* Pollutant filtering
* Dynamic legends

### Heatmap Visualization

* State vs Year analysis
* Pollution intensity overview
* Long-term pattern recognition

### Dataset Preview

* View first 100 records
* Dataset information section
* EPA source reference

### Dashboard Navigation

* Intro page
* Dataset page
* Analytics page

---

## Dataset

### Source

U.S. Environmental Protection Agency (EPA)

EPA AirData:
https://aqs.epa.gov/aqsweb/airdata/download_files.html

### Pollutants Included

* Carbon Monoxide (CO)
* Nitrogen Dioxide (NO₂)
* Sulphur Dioxide (SO₂)
* Ozone (O₃)

### Time Range

2000-2021

### Dataset Size

* 600,000+ records
* 50 U.S. states
* Aggregated yearly averages

---

# Technologies Used

| Technology | Purpose            |
| ---------- | ------------------ |
| HTML5      | Structure          |
| CSS3       | Styling            |
| JavaScript | Interaction Logic  |
| D3.js      | Data Visualization |
| TopoJSON   | U.S. Map Rendering |
| Python     | Data Preprocessing |
| Pandas     | Data Cleaning      |
| GitHub     | Version Control    |

---

# Project Structure

```bash
US-Air-Quality-Analytics/
│
├── index.html
├── styles.css
├── app.js
│
├── pollution_yearly_avg.json
├── pollution_2000_2021.csv
│
│
└── README.md
```
# Dashboard Sections

## Intro Section

Modern landing page introducing the environmental monitoring dashboard.

## Dataset Section

* Dataset description
* EPA references
* Dataset preview table

## Analytics Section

Contains:

* Choropleth Map
* Trend Analysis
* Heatmap
* AQI Ranking
* AQI Scale

---

# Key Insights

### Pollution Trends

* SO₂ and NO₂ generally decreased after 2010.
* O₃ remained relatively stable across years.
* Industrial regions showed higher AQI values.

### Geographic Differences

* Western states frequently recorded higher O₃ levels.
* Some states contained incomplete historical records.

### Heatmap Findings

* High pollution intensity was observed during 2000-2008.
* Significant SO₂ reduction appeared over time.

---

# Challenges

* Large dataset rendering performance
* Missing data in some states
* Responsive visualization layout
* Synchronizing multiple interactive charts

---

# Future Improvements

* Real-time EPA API integration
* Mobile responsive optimization
* AQI forecasting
* Machine learning prediction
* Export charts as PNG/PDF
* Advanced filtering system

---

# Screenshots

## Intro Page
<img width="2553" height="1280" alt="image" src="https://github.com/user-attachments/assets/eddd12ec-d0ea-4ade-bc70-c4608f07a6f9" />

## Interactive Map

<img width="1517" height="730" alt="image" src="https://github.com/user-attachments/assets/f75d86a5-0efe-4f0c-b280-3ec24590901a" />


## Trend Analysis

<img width="1521" height="453" alt="image" src="https://github.com/user-attachments/assets/096212b7-8e88-47e8-ad62-be66cef7e4a2" />


## Heatmap Visualization

<img width="1506" height="922" alt="image" src="https://github.com/user-attachments/assets/2edfd7fd-ec85-4a9b-b977-6b3040e7bcb1" />


---

# Course Information

**Course:** Data Science and Data Visualization
**University:** Vietnam National University Ho Chi Minh City — International University

---

# Repository

https://github.com/HellxAngel69/Data-science-and-Data-visualization.git 

---

# License

This project is for educational and academic purposes.


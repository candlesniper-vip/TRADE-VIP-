import { createChart, LineSeries, createSeriesMarkers } from 'lightweight-charts';
const div = document.createElement('div');
const chart = createChart(div);
const series = chart.addSeries(LineSeries);
const markers = createSeriesMarkers(series);
markers.setMarkers([{ time: '2020-01-01', position: 'aboveBar', color: 'red', shape: 'arrowDown' }]);
console.log('Passed');

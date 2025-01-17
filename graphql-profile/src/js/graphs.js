import * as d3 from './lib/d3.js';

export function renderXPOverTime(container, data) {
    // Clear any existing content
    container.innerHTML = '';
    
    if (!data || data.length === 0) {
        container.innerHTML = 'No XP data available';
        return;
    }

    // Sort data by date and calculate cumulative XP
    let cumulativeXP = 0;
    const processedData = [...data]
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
        .map(d => ({
            date: new Date(d.createdAt),
            xp: (cumulativeXP += Number(d.amount))
        }));

    // Set up dimensions
    const margin = { top: 40, right: 30, bottom: 30, left: 60 };  // Increased top margin for title
    const width = container.clientWidth - margin.left - margin.right;
    const height = container.clientHeight - margin.top - margin.bottom;

    // Create SVG
    const svg = d3.select(container)
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // Add title
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', -margin.top / 2)
        .attr('text-anchor', 'middle')
        .style('font-size', '16px')
        .style('fill', '#ecf0f1')
        .text('XP Progression');

    // Create scales
    const x = d3.scaleTime()
        .domain(d3.extent(processedData, d => d.date))
        .range([0, width]);

    const y = d3.scaleLinear()
        .domain([0, d3.max(processedData, d => d.xp)])
        .range([height, 0]);

    // Create line generator
    const line = d3.line()
        .x(d => x(d.date))
        .y(d => y(d.xp))
        .curve(d3.curveMonotoneX);

    // Add axes
    svg.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x)
            .tickFormat(d => {
                const month = d.toLocaleString('en-US', { month: 'short' });
                const year = d.getFullYear();
                return `${month} '${year.toString().slice(2)}`;
            }));

    svg.append('g')
        .call(d3.axisLeft(y)
            .tickFormat(d => `${(d / 1000).toFixed(0)}kB`));

    // Add line path
    const path = svg.append('path')
        .datum(processedData)
        .attr('fill', 'none')
        .attr('stroke', '#3498db')
        .attr('stroke-width', 2)
        .attr('d', line);

    // Add animation
    const pathLength = path.node().getTotalLength();
    path
        .attr('stroke-dasharray', pathLength)
        .attr('stroke-dashoffset', pathLength)
        .transition()
        .duration(2000)
        .attr('stroke-dashoffset', 0);

    // Add tooltip
    const tooltip = d3.select(container)
        .append('div')
        .attr('class', 'graph-tooltip')
        .style('opacity', 0)
        .style('position', 'absolute')
        .style('background', '#2c3e50')
        .style('color', '#ecf0f1')
        .style('padding', '8px')
        .style('border', '1px solid #34495e')
        .style('border-radius', '4px')
        .style('pointer-events', 'none')
        .style('z-index', '10');

    // Add interactive points
    svg.selectAll('.dot')
        .data(processedData)
        .enter()
        .append('circle')
        .attr('class', 'dot')
        .attr('cx', d => x(d.date))
        .attr('cy', d => y(d.xp))
        .attr('r', 4)
        .attr('fill', '#3498db')
        .on('mouseover', (event, d) => {
            tooltip.transition()
                .duration(200)
                .style('opacity', .9);
            tooltip.html(`Date: ${d.date.toLocaleDateString()}<br/>XP: ${(d.xp / 1000).toFixed(0)}kB`)
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 28) + 'px');
        })
        .on('mouseout', () => {
            tooltip.transition()
                .duration(500)
                .style('opacity', 0);
        });
}

export function renderProjectRatio(container, data) {
    // Clear previous content
    container.innerHTML = '';
    
    // Ensure we have valid data
    if (!data || data.length === 0) {
        console.error('No data provided for project ratio graph');
        return;
    }

    // Set up dimensions
    const margin = { top: 20, right: 30, bottom: 30, left: 30 };
    const width = container.clientWidth - margin.left - margin.right;
    const height = container.clientHeight - margin.top - margin.bottom;
    const radius = Math.min(width, height) / 2;

    // Create SVG
    const svg = d3.select(container)
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${width/2},${height/2})`);

    // Create color scale
    const color = d3.scaleOrdinal()
        .domain(['Passed', 'Failed'])
        .range(['#2ecc71', '#e74c3c']);

    // Create pie layout
    const pie = d3.pie()
        .value(d => d.value)
        .sort(null);

    // Create arc generator
    const arc = d3.arc()
        .innerRadius(radius * 0.6)
        .outerRadius(radius * 0.8);

    // Create outer arc for labels
    const outerArc = d3.arc()
        .innerRadius(radius * 0.9)
        .outerRadius(radius * 0.9);

    // Add tooltip
    const tooltip = d3.select(container)
        .append('div')
        .attr('class', 'graph-tooltip')
        .style('opacity', 0)
        .style('position', 'absolute')
        .style('pointer-events', 'none');

    // Create pie slices
    const slices = svg.selectAll('path')
        .data(pie(data))
        .enter()
        .append('path')
        .attr('class', d => d.data.label.toLowerCase() + '-slice')
        .attr('d', arc)
        .attr('stroke', '#ecf0f1')
        .attr('stroke-width', '2')
        .style('cursor', 'pointer')
        .on('mouseover', (event, d) => {
            tooltip.transition()
                .duration(200)
                .style('opacity', 0.9);
            tooltip.html(`${d.data.label}: ${d.data.value} (${Math.round(d.data.value / data.reduce((sum, d) => sum + d.value, 0) * 100)}%)`)
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 28) + 'px');
        })
        .on('mouseout', () => {
            tooltip.transition()
                .duration(500)
                .style('opacity', 0);
        });

    // Add labels
    const text = svg.selectAll('text')
        .data(pie(data))
        .enter()
        .append('text')
        .attr('transform', d => {
            const pos = outerArc.centroid(d);
            return `translate(${pos})`;
        })
        .style('text-anchor', 'middle')
        .style('fill', '#ecf0f1');

    text.append('tspan')
        .text(d => d.data.label)
        .attr('y', '-0.6em')
        .style('font-weight', 'bold');

    text.append('tspan')
        .text(d => `${d.data.value}`)
        .attr('x', 0)
        .attr('y', '1em');

    // Add animations
    slices.transition()
        .duration(1000)
        .attrTween('d', function(d) {
            const interpolate = d3.interpolate({startAngle: 0, endAngle: 0}, d);
            return function(t) {
                return arc(interpolate(t));
            };
        });
}

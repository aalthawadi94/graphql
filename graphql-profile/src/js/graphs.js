import * as d3 from './lib/d3.js';

export function renderXPOverTime(container, transactions) {
    // Clear any existing content
    container.innerHTML = '';

    if (!transactions || transactions.length === 0) {
        container.innerHTML = '<p>No XP data available</p>';
        return;
    }

    // Process the data
    const data = transactions
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
        .reduce((acc, curr) => {
            const date = new Date(curr.createdAt);
            const lastEntry = acc[acc.length - 1];
            const xp = curr.amount;
            const name = curr.object?.name || 'Unknown';

            if (!lastEntry) {
                acc.push({ date, xp, name });
            } else {
                acc.push({ date, xp: lastEntry.xp + xp, name });
            }
            return acc;
        }, []);

    // Set up dimensions to match container size
    const margin = { top: 20, right: 30, bottom: 40, left: 60 };
    const width = container.clientWidth - margin.left - margin.right;
    const height = container.clientHeight || width * 0.6; // Make height proportional to width if not set

    // Create SVG
    const svg = d3.select(container)
        .append('svg')
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('viewBox', `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // Set up scales
    const x = d3.scaleTime()
        .domain(d3.extent(data, d => d.date))
        .range([0, width]);

    const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.xp)])
        .range([height, 0]);

    // Create line
    const line = d3.line()
        .x(d => x(d.date))
        .y(d => y(d.xp));

    // Add X axis with fewer ticks
    svg.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x)
            .ticks(6)
            .tickFormat(d => {
                const date = new Date(d);
                return date.toLocaleString('default', { month: 'short', year: '2-digit' });
            }))
        .selectAll('text')
        .style('fill', '#fff')
        .style('font-size', '12px');

    // Add Y axis
    svg.append('g')
        .call(d3.axisLeft(y)
            .tickFormat(d => `${d/1000}kB`))
        .selectAll('text')
        .style('fill', '#fff')
        .style('font-size', '12px');

    // Add the line
    svg.append('path')
        .datum(data)
        .attr('fill', 'none')
        .attr('stroke', '#00bfff')
        .attr('stroke-width', 2)
        .attr('d', line);

    // Add dots
    svg.selectAll('.dot')
        .data(data)
        .enter()
        .append('circle')
        .attr('class', 'dot')
        .attr('cx', d => x(d.date))
        .attr('cy', d => y(d.xp))
        .attr('r', 4)
        .style('fill', '#00bfff')
        .append('title')
        .text(d => `Project: ${d.name}\nDate: ${d.date.toLocaleDateString()}\nXP: ${d.xp.toLocaleString()}kB`);
}

export function renderSkillsRadar(container, skills) {
    // Clear any existing content
    container.innerHTML = '';

    if (!skills || skills.length === 0) {
        container.innerHTML = '<p>No skills data available</p>';
        return;
    }

    // Define the fixed order of skills we want to show
    const skillOrder = ['Prog', 'Go', 'Back-End', 'Front-End', 'Js', 'Html'];
    
    // Process skills data - normalize skill names
    const skillsMap = new Map();
    skills.forEach(skill => {
        const rawName = skill.type.replace('skill_', '').toLowerCase();
        let normalizedName;
        
        switch(rawName) {
            case 'prog': normalizedName = 'Prog'; break;
            case 'go': normalizedName = 'Go'; break;
            case 'front-end': normalizedName = 'Front-End'; break;
            case 'js': normalizedName = 'Js'; break;
            case 'back-end': normalizedName = 'Back-End'; break;
            case 'html': normalizedName = 'Html'; break;
            default: normalizedName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
        }
        
        const currentAmount = skillsMap.get(normalizedName) || 0;
        skillsMap.set(normalizedName, currentAmount + skill.amount);
    });

    // Transform the data to match our fixed order
    const skillsData = skillOrder.map(skillName => ({
        axis: skillName,
        value: skillsMap.get(skillName) || 0
    }));

    // Set up dimensions to match container size
    const margin = { top: 50, right: 50, bottom: 50, left: 50 };
    const width = container.clientWidth - margin.left - margin.right;
    const height = container.clientHeight || width; // Make it square if height not set
    const radius = Math.min(width, height) / 2;

    // Create SVG
    const svg = d3.select(container)
        .append('svg')
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('viewBox', `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
        .append('g')
        .attr('transform', `translate(${width/2 + margin.left},${height/2 + margin.top})`);

    // Number of axes (skills)
    const numAxes = skillsData.length;
    const angleSlice = (Math.PI * 2) / numAxes;

    // Scale for the radius
    const rScale = d3.scaleLinear()
        .domain([0, 100])
        .range([0, radius]);

    // Draw the circular grid
    const levels = 10;
    const gridCircles = svg.selectAll('.grid-circle')
        .data(d3.range(1, levels + 1).reverse())
        .enter()
        .append('circle')
        .attr('class', 'grid-circle')
        .attr('r', d => radius * d/levels)
        .style('fill', 'none')
        .style('stroke', '#666')
        .style('stroke-opacity', 0.3);

    // Draw the axes
    const axes = svg.selectAll('.axis')
        .data(skillsData)
        .enter()
        .append('g')
        .attr('class', 'axis');

    axes.append('line')
        .attr('x1', 0)
        .attr('y1', 0)
        .attr('x2', (d, i) => radius * Math.cos(angleSlice * i - Math.PI/2))
        .attr('y2', (d, i) => radius * Math.sin(angleSlice * i - Math.PI/2))
        .style('stroke', '#666')
        .style('stroke-width', '1px');

    // Add labels
    axes.append('text')
        .attr('class', 'legend')
        .attr('text-anchor', 'middle')
        .attr('dy', '0.35em')
        .attr('x', (d, i) => (radius + 30) * Math.cos(angleSlice * i - Math.PI/2))
        .attr('y', (d, i) => (radius + 30) * Math.sin(angleSlice * i - Math.PI/2))
        .text(d => d.axis)
        .style('fill', '#fff')
        .style('font-size', '12px');

    // Draw the radar chart path
    const radarLine = d3.lineRadial()
        .radius(d => rScale(d.value))
        .angle((d, i) => i * angleSlice)
        .curve(d3.curveLinearClosed);

    // Add the path
    svg.append('path')
        .datum(skillsData)
        .attr('class', 'radar-path')
        .attr('d', radarLine)
        .style('fill', 'rgba(147, 112, 219, 0.5)')
        .style('stroke', 'rgb(147, 112, 219)')
        .style('stroke-width', '2px');

    // Add dots at each data point
    svg.selectAll('.radar-dot')
        .data(skillsData)
        .enter()
        .append('circle')
        .attr('class', 'radar-dot')
        .attr('r', 4)
        .attr('cx', (d, i) => rScale(d.value) * Math.cos(angleSlice * i - Math.PI/2))
        .attr('cy', (d, i) => rScale(d.value) * Math.sin(angleSlice * i - Math.PI/2))
        .style('fill', 'rgb(147, 112, 219)');
}

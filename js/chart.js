/**
 * KOKO Grocery ERP - Custom SVG Charting Component
 * Creates responsive line charts with animated paths, grid lines, and interactive tooltips.
 */

const KokoChart = {
  // Render a beautiful interactive line chart in a target container
  renderLineChart(containerId, data, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Reset container
    container.innerHTML = "";

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 300;
    const padding = { top: 30, right: 30, bottom: 40, left: 60 };

    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Extract values
    const labels = data.map(d => d.label);
    const values = data.map(d => d.value);
    
    // Scale maths
    const maxValue = Math.max(...values, 1000) * 1.15; // 15% headroom
    const minValue = 0;
    const valueRange = maxValue - minValue;

    // Convert values to chart coordinates
    const points = data.map((d, index) => {
      const x = padding.left + (index / (data.length - 1)) * chartWidth;
      const y = padding.top + chartHeight - ((d.value - minValue) / valueRange) * chartHeight;
      return { x, y, label: d.label, value: d.value };
    });

    // Create SVG element
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.style.overflow = "visible";

    // Define Gradients and Filters
    svg.innerHTML = `
      <defs>
        <!-- Glow effects -->
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <!-- Line gradient -->
        <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="var(--primary)" />
          <stop offset="100%" stop-color="var(--info)" />
        </linearGradient>
        <!-- Area gradient -->
        <linearGradient id="areaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="var(--primary)" stop-opacity="0.25" />
          <stop offset="100%" stop-color="var(--primary)" stop-opacity="0.0" />
        </linearGradient>
      </defs>
    `;

    // 1. Draw Grid Lines & Axes Labels
    const numGridLines = 5;
    for (let i = 0; i <= numGridLines; i++) {
      const ratio = i / numGridLines;
      const val = Math.round(maxValue - ratio * valueRange);
      const y = padding.top + ratio * chartHeight;

      // Grid line
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", padding.left);
      line.setAttribute("y1", y);
      line.setAttribute("x2", padding.left + chartWidth);
      line.setAttribute("y2", y);
      line.setAttribute("class", "chart-grid-line");
      svg.appendChild(line);

      // Y-axis label (INR format)
      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", padding.left - 12);
      text.setAttribute("y", y + 4);
      text.setAttribute("text-anchor", "end");
      text.setAttribute("class", "chart-label");
      text.textContent = window.formatINR(val).replace('.00', '');
      svg.appendChild(text);
    }

    // X-Axis Labels
    const numXLabels = Math.min(labels.length, 7);
    const step = Math.ceil(labels.length / numXLabels);
    for (let i = 0; i < labels.length; i += step) {
      const pt = points[i];
      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", pt.x);
      text.setAttribute("y", padding.top + chartHeight + 20);
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("class", "chart-label");
      text.textContent = pt.label;
      svg.appendChild(text);
    }

    // 2. Draw Area path under line
    let areaPathData = `M ${points[0].x} ${padding.top + chartHeight} `;
    points.forEach(pt => {
      areaPathData += `L ${pt.x} ${pt.y} `;
    });
    areaPathData += `L ${points[points.length - 1].x} ${padding.top + chartHeight} Z`;

    const area = document.createElementNS("http://www.w3.org/2000/svg", "path");
    area.setAttribute("d", areaPathData);
    area.setAttribute("fill", "url(#areaGrad)");
    svg.appendChild(area);

    // 3. Draw Line path
    let linePathData = `M ${points[0].x} ${points[0].y} `;
    for (let i = 1; i < points.length; i++) {
      // Calculate cubic bezier curves for smooth look
      const cpX1 = points[i-1].x + (points[i].x - points[i-1].x) / 2;
      const cpY1 = points[i-1].y;
      const cpX2 = points[i-1].x + (points[i].x - points[i-1].x) / 2;
      const cpY2 = points[i].y;
      linePathData += `C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${points[i].x} ${points[i].y} `;
    }

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", linePathData);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "url(#lineGrad)");
    path.setAttribute("class", "chart-series-line");
    path.style.filter = "url(#glow)";
    svg.appendChild(path);

    // 4. Draw Interaction Tooltip overlay
    const tooltip = document.createElement("div");
    tooltip.className = "chart-tooltip";
    container.appendChild(tooltip);

    // 5. Draw Interactive points
    points.forEach(pt => {
      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("cx", pt.x);
      circle.setAttribute("cy", pt.y);
      circle.setAttribute("r", "4");
      circle.setAttribute("fill", "var(--primary)");
      circle.setAttribute("stroke", "var(--bg-secondary)");
      circle.setAttribute("class", "chart-point");

      // Hover triggers
      circle.addEventListener("mouseenter", (e) => {
        circle.setAttribute("r", "7");
        circle.setAttribute("fill", "var(--info)");
        
        tooltip.style.display = "block";
        tooltip.innerHTML = `
          <strong>${pt.label}</strong><br/>
          Sales: <span style="color:var(--success); font-weight:700;">${window.formatINR(pt.value)}</span>
        `;
        
        // Position tooltip
        const rect = container.getBoundingClientRect();
        const tooltipX = pt.x - tooltip.clientWidth / 2;
        const tooltipY = pt.y - tooltip.clientHeight - 12;
        
        tooltip.style.left = `${tooltipX}px`;
        tooltip.style.top = `${tooltipY}px`;
      });

      circle.addEventListener("mouseleave", () => {
        circle.setAttribute("r", "4");
        circle.setAttribute("fill", "var(--primary)");
        tooltip.style.display = "none";
      });

      svg.appendChild(circle);
    });

    container.appendChild(svg);
  }
};

window.KokoChart = KokoChart;

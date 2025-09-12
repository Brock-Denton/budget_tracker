const fs = require('fs');
const { createCanvas } = require('canvas');

// Create canvas
const canvas = createCanvas(180, 180);
const ctx = canvas.getContext('2d');

// Modern gradient background (pink like successful fintech apps)
const gradient = ctx.createLinearGradient(0, 0, 180, 180);
gradient.addColorStop(0, '#ff9a9e');
gradient.addColorStop(0.5, '#fecfef');
gradient.addColorStop(1, '#fecfef');

// Background with perfect rounded corners
ctx.fillStyle = gradient;
ctx.beginPath();
ctx.roundRect(0, 0, 180, 180, 40);
ctx.fill();

// Add subtle inner shadow for depth
ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
ctx.shadowBlur = 10;
ctx.shadowOffsetY = 5;

// Inner background for contrast
ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
ctx.beginPath();
ctx.roundRect(20, 20, 140, 140, 30);
ctx.fill();

ctx.shadowBlur = 0;
ctx.shadowOffsetY = 0;

// Modern dollar sign with 3D effect
ctx.fillStyle = '#2d3748';
ctx.font = 'bold 80px Arial';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';

// Add text shadow for 3D effect
ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
ctx.shadowBlur = 5;
ctx.shadowOffsetX = 2;
ctx.shadowOffsetY = 2;
ctx.fillText('$', 90, 90);

ctx.shadowBlur = 0;
ctx.shadowOffsetX = 0;
ctx.shadowOffsetY = 0;

// Add modern geometric elements
const elements = [
    {x: 45, y: 45, size: 8, color: '#ff6b6b', rotation: 0},
    {x: 135, y: 45, size: 6, color: '#4ecdc4', rotation: 45},
    {x: 45, y: 135, size: 7, color: '#45b7d1', rotation: 90},
    {x: 135, y: 135, size: 5, color: '#96ceb4', rotation: 135}
];

elements.forEach(element => {
    ctx.save();
    ctx.translate(element.x, element.y);
    ctx.rotate(element.rotation * Math.PI / 180);
    ctx.fillStyle = element.color;
    ctx.beginPath();
    ctx.roundRect(-element.size/2, -element.size/2, element.size, element.size, 2);
    ctx.fill();
    ctx.restore();
});

// Add success/positive elements (upward trending)
ctx.strokeStyle = '#10b981';
ctx.lineWidth = 4;
ctx.beginPath();
ctx.moveTo(30, 120);
ctx.lineTo(50, 100);
ctx.lineTo(70, 110);
ctx.lineTo(90, 80);
ctx.lineTo(110, 90);
ctx.lineTo(130, 70);
ctx.lineTo(150, 80);
ctx.stroke();

// Add small success dots
const successDots = [
    {x: 50, y: 100},
    {x: 70, y: 110},
    {x: 90, y: 80},
    {x: 110, y: 90},
    {x: 130, y: 70}
];

successDots.forEach(dot => {
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(dot.x, dot.y, 3, 0, 2 * Math.PI);
    ctx.fill();
});

// Save the image
const buffer = canvas.toBuffer('image/png');
fs.writeFileSync('./public/icons/icon-180.png', buffer);

console.log('Pink budget icon generated successfully!');

const fs = require('fs');
const path = require('path');

function convertAtlasToJSON(inputPath, outputPath) {
  // Read the input file
  const data = fs.readFileSync(inputPath, 'utf8');
  
  // Split into lines and process
  const lines = data.split('\n');
  const result = {
    textureSize: { width: 2048, height: 2048 }, // Adjust based on your actual atlas size
    frames: {}
  };

  lines.forEach(line => {
    if (!line.trim()) return;
    
    const [name, ...parts] = line.split('\t');
    const frame = {};
    
    parts.forEach(part => {
      const [key, value] = part.split('=');
      frame[key] = parseInt(value);
    });
    
    result.frames[name] = frame;
  });

  // Write the output
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
  console.log(`Converted ${lines.length} entries to ${outputPath}`);
}

// Usage:
convertAtlasToJSON(
  path.join(__dirname, 'atlas.txt'),
  path.join(__dirname, 'atlas.json')
);
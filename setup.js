const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Create directories
const publicDir = path.join(__dirname, 'public');
const panoDir = path.join(publicDir, 'ucf_panos');

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir);
}

if (!fs.existsSync(panoDir)) {
  fs.mkdirSync(panoDir);
}

// Create sample CSV
const sampleCsv = `pano_id,lat,lng
J52ZXa_jSmPwCOFvOcce0Q,28.599083861386735,-81.20530840140005
`;

fs.writeFileSync(path.join(publicDir, 'panorama_log.csv'), sampleCsv);

// Install dependencies
console.log('Installing dependencies...');
exec('npm install leaflet@1.9.4 react-leaflet@4.2.1 pannellum-react@1.2.4 --legacy-peer-deps', 
  (error, stdout, stderr) => {
    if (error) {
      console.error(`Error: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`stderr: ${stderr}`);
    }
    console.log(`stdout: ${stdout}`);
    console.log('Setup complete! Add your panorama images to the public/ucf_panos directory.');
  }
);

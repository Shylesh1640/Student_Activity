const fs = require('fs');
const path = require('path');

function replaceDynamic(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (!fullPath.includes('node_modules') && !fullPath.includes('.git') && !fullPath.includes('dist')) {
        replaceDynamic(fullPath);
      }
    } else if (fullPath.endsWith('.js') || fullPath.endsWith('.jsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Replace string literals: 'http://172.../api...' or "..."
      // e.g. 'http://172.23.139.109:3000/api/admin/login' => `http://${window.location.hostname}:3000/api/admin/login`
      content = content.replace(/['"]http:\/\/\d+\.\d+\.\d+\.\d+:3000\/api(.*?)['"]/g, '`http://${window.location.hostname}:3000/api$1`');
      
      // Replace template literals: `http://172.../api...`
      content = content.replace(/`http:\/\/\d+\.\d+\.\d+\.\d+:3000\/api(.*?)`/g, '`http://${window.location.hostname}:3000/api$1`');
      
      // Replace WebSockets string literals
      content = content.replace(/['"]ws:\/\/\d+\.\d+\.\d+\.\d+:3000(.*?)['"]/g, '`ws://${window.location.hostname}:3000$1`');
      
      // Replace local URLs for reports like `http://...${data.downloadUrl}`
      content = content.replace(/`http:\/\/\d+\.\d+\.\d+\.\d+:3000(.*?)`/g, '`http://${window.location.hostname}:3000$1`');

      fs.writeFileSync(fullPath, content);
    }
  }
}

replaceDynamic(path.join(__dirname, 'dashboard', 'src'));
console.log('Dynamic API resolution applied!');

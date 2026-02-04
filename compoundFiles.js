import fs from 'fs';
import path from 'path';
import { EOL } from 'os';

// const consoleFiles = (err, data) => {
//   /* If an error exists, show it, otherwise show the file */
//   console.log(data.toString('utf8'));
// };

function readFilesRecursively(dirPath, fileList = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    const stats = fs.statSync(fullPath);

    if (stats.isDirectory()) {
      // If it's a directory, recurse into it
      readFilesRecursively(fullPath, fileList);
    } else {
      // If it's a file, add to the list
      fileList.push(fullPath);
    }
  });

  return fileList.map((fileName) => `./${fileName.replace(/\\/g, '/')}`);
}

const directoryPath = './src'; // Replace with the directory you want to read

try {
  const allFileNames = readFilesRecursively(directoryPath);
  fs.writeFile('./compoundedCode.txt', '', () => {});

  allFileNames.forEach((fileName) => {
    fs.appendFileSync('./compoundedCode.txt', `${fileName}\r\n`);
    fs.appendFileSync('./compoundedCode.txt', fs.readFileSync(fileName, { encoding: 'utf8' }));
    fs.appendFileSync('./compoundedCode.txt', EOL, 'utf8');
  });
} catch (err) {
  // eslint-disable-next-line no-console
  console.error('Error reading directory:', err.message);
}

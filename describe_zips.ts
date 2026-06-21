// @ts-ignore
import AdmZip from 'adm-zip';
import fs from 'fs';

function describeZip(path: string) {
  console.log(`\n--- Describing ZIP: ${path} ---`);
  if (!fs.existsSync(path)) {
    console.log(`File does not exist: ${path}`);
    return;
  }
  const zip = new AdmZip(path);
  const entries = zip.getEntries();
  console.log(`Total entries: ${entries.length}`);
  console.log("First 15 entries:");
  entries.slice(0, 15).forEach((entry: any) => {
    console.log(`  - ${entry.entryName} (${entry.header.size} bytes)`);
  });
}

function run() {
  describeZip("./extracted/ProjektBasis-main/familyspace-repo.zip");
  describeZip("./extracted/ProjektBasis-main/pdfrest-api-samples-main.zip");
  describeZip("./extracted/ProjektBasis-main/public-apis-master.zip");
}

run();

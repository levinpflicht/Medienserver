// @ts-ignore
import AdmZip from 'adm-zip';

async function main() {
  console.log("Extracting repo.zip...");
  try {
    const zip = new AdmZip("./repo.zip");
    zip.extractAllTo("./extracted", true);
    console.log("Extraction complete!");
  } catch (err) {
    console.error("Extraction failed:", err);
  }
}

main();

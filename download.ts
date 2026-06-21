import https from 'https';
import fs from 'fs';
import { IncomingMessage } from 'http';

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    
    const request = (targetUrl: string) => {
      https.get(targetUrl, (response: IncomingMessage) => {
        if (response.statusCode === 301 || response.statusCode === 302) {
          const redirectUrl = response.headers.location;
          if (redirectUrl) {
            console.log(`Following redirect to ${redirectUrl}`);
            request(redirectUrl);
            return;
          }
        }
        
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to get '${targetUrl}' (status code: ${response.statusCode})`));
          return;
        }
        
        response.pipe(file);
        
        file.on('finish', () => {
          file.close();
          console.log(`Download finished: ${dest}`);
          resolve();
        });
      }).on('error', (err) => {
        fs.unlink(dest, () => {});
        reject(err);
      });
    };
    
    request(url);
  });
}

async function run() {
  console.log("Starting download of PromptBrainless/ProjektBasis zip file...");
  const zipUrl = "https://github.com/PromptBrainless/ProjektBasis/archive/refs/heads/main.zip";
  const zipPath = "./repo.zip";
  
  try {
    await downloadFile(zipUrl, zipPath);
    console.log("Successfully downloaded zip!");
  } catch (err: any) {
    console.error("Error during download:", err);
  }
}

run();

const { Jimp } = require('jimp');

async function removeMagenta() {
  console.log("Loading image...");
  const image = await Jimp.read('../assets/ui/combat-ui.jpg');
  console.log("Processing " + image.bitmap.width + "x" + image.bitmap.height + "...");
  
  // We'll iterate over all pixels
  image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
    const red = this.bitmap.data[idx + 0];
    const green = this.bitmap.data[idx + 1];
    const blue = this.bitmap.data[idx + 2];
    
    // Pure magenta is 255, 0, 255. 
    // Jpeg artifacts blend the edges.
    // We check for high red, high blue, and low green.
    if (red > 150 && blue > 150 && green < 120) {
        // Just evaluating how magenta it is. 
        if (red > 200 && blue > 200 && green < 80) {
            this.bitmap.data[idx + 3] = 0; // Fully transparent
        } else {
            // Edges (pink halation) -> make it fully transparent to avoid pink borders
            this.bitmap.data[idx + 3] = 0;
        }
    }
  });

  const targetPath = '../apps/client/public/assets/ui/combat_overlay_v2.png';
  await image.write(targetPath);
  console.log("Image saved safely as " + targetPath + " (did NOT overwrite the original)");
}

removeMagenta().catch(console.error);

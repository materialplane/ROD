from PIL import Image
import os
import sys
import colorsys

def remove_magenta_aggressive(img_path):
    if not os.path.exists(img_path):
        print(f"Error: File not found -> {img_path}")
        return

    print(f"Applying advanced HSV magenta key to: {img_path}")
    img = Image.open(img_path).convert("RGBA")
    pixels = img.load()
    width, height = img.size
    
    for y in range(height):
        for x in range(width):
            pr, pg, pb, pa = pixels[x, y]
            
            # RGB to HSV (values 0.0 to 1.0)
            h, s, v = colorsys.rgb_to_hsv(pr/255.0, pg/255.0, pb/255.0)
            
            # Magenta hue is around 300 degrees (0.83).
            is_magenta_hue = (h > 0.75 and h < 0.95)
            
            if is_magenta_hue and s > 0.2:
                if v > 0.5 and s > 0.5:
                    pixels[x, y] = (pr, pg, pb, 0)
                else:
                    alpha_drop = int(s * 255 * 1.5)
                    new_a = max(0, pa - alpha_drop)
                    nr, ng, nb = colorsys.hsv_to_rgb(h, 0.0, v)
                    pixels[x, y] = (int(nr*255), int(ng*255), int(nb*255), new_a)
            elif pr > 200 and pb > 200 and pg < 100:
                pixels[x, y] = (pr, pg, pb, 0)

    img.save(img_path, "PNG")
    print("Success! Image keyed with anti-aliasing preserved.")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python remove_magenta.py <path_to_image>")
        sys.exit(1)
        
    target_path = sys.argv[1]
    remove_magenta_aggressive(target_path)

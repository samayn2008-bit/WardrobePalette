// imageInput points to the file, preview to canvas, context to drawing tools
const imageInput = document.querySelector("#imageInput");
const preview = document.querySelector("#preview");
const context = preview.getContext("2d", {
    willReadFrequently: true
});
const colorName = document.querySelector("#colorName");
const visualSwatch = document.querySelector("#colorSwatch");
const pantList = document.querySelector("#pantList");

//Check if user does an action
imageInput.addEventListener("change", () => {
    const file = imageInput.files[0];

    if (!file) {
        return;
    }

// make the canvas same size as image
    const image = new Image();
    image.onload = () => {
        preview.width = image.width;
        preview.height = image.height;
        context.drawImage(image, 0, 0);

        // set variables for functions
        const w = preview.width;
        const h = preview.height;
        let r = 0;
        let g = 0
        let b = 0;
        let weight = 0;
        // get all the pixelData of the image
        const pixelData = context.getImageData(0, 0, w, h);

        //filter through the whole image and calculate the total r, g, b values
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                let onEdge = x == 0 || y == 0 || x == w - 1 || y == h - 1;
                const pixel = getPixelRgb(pixelData, x, y, w);
                const alpha = pixel.a;
                r += pixel.r;
                g += pixel.g;
                b += pixel.b;
            }
        }

        //return the data of one pixel
        //index is based on the number of pixels before the current pixel
        function getPixelRgb(pixelData, x, y, width) {
            const data = pixelData.data;
            let index = (y*width+x)*4;
            return {
                r: data[index], g: data[index+1], b: data[index+2], a: data[index+3]
            };
        }

        //find the average RGB
        const pixelsProcessed = w*h;
        const roundedR = Math.round(r/pixelsProcessed);
        const roundedG = Math.round(g/pixelsProcessed);
        const roundedB = Math.round(b/pixelsProcessed);
        const averageColor = {
            r: roundedR, 
            g: roundedG, 
            b: roundedB
        }

        //test cases - remove later
        visualSwatch.style.backgroundColor = `rgb(${averageColor.r}, ${averageColor.g}, ${averageColor.b})`;
        console.log(averageColor);
        const hsbColor = rgbToHsb(averageColor);
        console.log(hsbColor);
        colorName.textContent = "Color: " + nameforHsb(hsbColor);
    }
    //temporary reference
    image.src = URL.createObjectURL(file);

    //convert the averageColor object to an object with Hue, Saturation, Brightness
    function rgbToHsb(color) {
        //rgb ranges from 0-255 and Hsb ranges from 0 to 1
        const r = color.r / 255;
        const g = color.g / 255;
        const b = color.b / 255;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const delta = max - min;

        let h = 0;
        if (delta !== 0) {
            if (max === r) h = (g - b) / delta + (g < b ? 6 : 0);
            else if (max === g) h = (b - r) / delta + 2;
            else if (max === b) h = (r - g) / delta + 4;
            h /= 6;
        }

        return {
            h: Math.round(h * 360),
            s: Math.round(max === 0 ? 0 : (delta / max) * 100),
            b: Math.round(max * 100) // "b" for Brightness
        };
    };

    //color theory to give a name for the color
    function nameforHsb(hsbColor) {
        if (hsbColor.s < 12) {
            if (hsbColor.b < 18) {
                return "Black";
            } else if (hsbColor.b > 85) {
                return "White";
            } else if (hsbColor.b < 50) {
                return "Charcoal Gray";
            } else {
                return "Light Gray";
            }
        }
        const names = ["Red", "Orange", "Gold", "Yellow-green", "Green", "Teal", "Sky Blue", "Blue", "Indigo", "Purple", "Pink", "Red"];
        const limits = [15, 45, 70, 100, 150, 180, 210, 250, 280, 320, 345, 361];
        for (let i = 0; i < limits.length; i++) {
            if (hsbColor.h < limits[i]) {
                let shade = "";

                if (hsbColor.b < 35) {
                    shade = "Dark ";
                } else if (hsbColor.b > 70) {
                    shade = "Light ";
                }

                return shade + names[i].toLowerCase();
            }
        }
        return "Red";
    };
    
    //Make the array of pants options
    const pants = [
        {name: "Khaki", hex: "#C3B091"}, 
        {name: "Navy", hex: "#1F2A44"},
        {name: "Charcoal", hex: "#1F2A44"},
        {name: "Olive", hex: "#1F2A44"},
        {name: "Black", hex: "#1F2A44"},
        {name: "White", hex: "#1F2A44"},
        {name: "Denim blue", hex: "#1F2A44"},
        {name: "Burgundy", hex: "#1F2A44"}
    ];

    function displayPants() {
        pantList.innerHTML = "";

        for (const pant of pants) {
            const card = document.createElement("div");
            card.className = "pant-card";

            const swatch = document.createElement("div");
            swatch.className = "pant-swatch";
            swatch.style.backgroundColor = pant.hex;

            const name = document.createElement("span");
            name.textContent = '${pant.name} ${pant.hex}';

            card.appendChild(swatch);
            card.appendChild(name);
            pantList.appendChild(card);
        }
    }

    displayPants();

});


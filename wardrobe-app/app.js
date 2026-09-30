// imageInput points to the file, preview to canvas, context to drawing tools
const imageInput = document.querySelector("#imageInput");
const preview = document.querySelector("#preview");
const context = preview.getContext("2d", {
    willReadFrequently: true
});

// Set up DOM references for buttons
const resetButton = document.querySelector("#resetButton");
const selectionColorButton = document.querySelector("#selectionColorButton");
let selectionColor = "#fef0e7";
const selectionHint = document.querySelector("#selectionHint");

//Set up DOM references for the detected color section
const colorName = document.querySelector("#colorName");
const colorDetails = document.querySelector("#colorDetails");
const visualSwatch = document.querySelector("#colorSwatch");

//Set up DOM references for pants
const pantList = document.querySelector("#pantList");
const pantCount = document.querySelector(".pants-count");
const previewFrame = document.querySelector(".preview-frame");
const previewPlaceholder = document.querySelector("#previewPlaceholder");
const matchStatus = document.querySelector("#matchStatus");

// Initialize variables for tracking the image upload
let originalCanvas = null;
let selection = null;
let selectionStart = null;

//Make the array of pants options
const pants = [
    {name: "Khaki", hex: "#C3B091"}, 
    {name: "Navy Blue", hex: "#1F2A44"},
    {name: "Charcoal Gray", hex: "#36393D"},
    {name: "Olive Green", hex: "#556B2F"},
    {name: "Black", hex: "#1B1B1D"},
    {name: "White", hex: "#F5F5F0"},
    {name: "Denim blue", hex: "#4B6584"},
    {name: "Burgundy", hex: "#6E2C3B"}
];

//rgbToHsb function converts (red, green, blue) to (hue, saturation, brightness) for color comparison
function rgbToHsb(color) {
    //Convert each RGB channel from a 0–255 range to a 0–1 range
    const r = color.r / 255;
    const g = color.g / 255;
    const b = color.b / 255;

    //Find strongest and weakest RGB channel values
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;

    //Calculate hue based on whichever RGB channel is strongest
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

//Update the colors after image is loaded
function updateColorResult(averageColor) {
    colorDetails.textContent = `RGB: ${averageColor.r}, ${averageColor.g}, ${averageColor.b}`;

    const detectedRgb = `rgb(${averageColor.r}, ${averageColor.g}, ${averageColor.b})`;

    visualSwatch.style.backgroundColor = detectedRgb;
    visualSwatch.style.borderColor = detectedRgb;

    const hsbColor = rgbToHsb(averageColor);

    colorName.textContent = "Color: " + nameforHsb(hsbColor);

    displayPants(hsbColor);
}

// Analyze the pixels inside selected region and calculate average RGB
function analyzeSelectedRegion() {
    if (!originalCanvas || !selection) {
        return;
    }

    const originalContext = originalCanvas.getContext("2d");

    const selectedPixels = originalContext.getImageData(selection.x, selection.y, selection.width, selection.height);

    const data = selectedPixels.data;

    let red = 0, green = 0, blue = 0, count = 0;
    for (let i = 0; i < data.length; i += 4) {
        const alpha = data[i+3];
        if (alpha === 0) {
            continue;
        }

        red += data[i];
        green += data[i+1];
        blue += data[i+2];
        count++;
    }

    if (count === 0) {
        console.log("The selected region has no visible foreground.")
        return;
    }

    const averageColor = {
        r: Math.round(red/count),
        g: Math.round(green / count),
        b: Math.round(blue / count)
    };

    updateColorResult(averageColor);
}

//Convert mouse position into coordinates that match the canvas image
function getCanvasPoint(event) {
    const bounds = preview.getBoundingClientRect();

    return {
        x: Math.round(
            (event.clientX - bounds.left)
            * preview.width
            / bounds.width
        ),
        y: Math.round(
            (event.clientY - bounds.top)
            * preview.height
            / bounds.height
        )
    };
}

//Rank pants by compatability and display them
function displayPants(shirtHsb) {
    pantList.innerHTML = "";

    const rankedPants = pants
        .map(pant => ({
            ...pant,
            score: calculatePantScore(shirtHsb, pant.hex)
        }))
        .sort((first, second) => second.score - first.score);

    for (const pant of rankedPants) {
        const card = document.createElement("div");
        card.className = "pant-card";

        const swatch = document.createElement("div");
        swatch.className = "pant-swatch";
        swatch.style.backgroundColor = pant.hex;

        const information = document.createElement("div");
        information.className = "pant-information";

        const name = document.createElement("div");
        name.className = "pant-name";
        name.textContent = pant.name;

        const hex = document.createElement("div");
        hex.className = "pant-hex";
        hex.textContent = pant.hex;

        const scoreBar = document.createElement("div");
        scoreBar.className = "pant-score";

        const scoreFill = document.createElement("div");
        scoreFill.className = "pant-score-fill";
        scoreFill.style.width = `${pant.score}%`;

        scoreBar.appendChild(scoreFill);

        information.appendChild(name);
        information.appendChild(hex);
        information.appendChild(scoreBar);

        card.appendChild(swatch);
        card.appendChild(information);
            
        pantList.appendChild(card);
    }
    pantCount.textContent = `${pants.length} colors`;
    matchStatus.textContent = "Color matched";
}

// Redraw the original image and display the selection border
function redrawPreview() {
    if (!originalCanvas) {
        return;
    }

    context.clearRect(0, 0, preview.width, preview.height);
    context.drawImage(originalCanvas, 0, 0);

    if (!selection) {
        return;
    }

    context.save();

    const bounds = preview.getBoundingClientRect();
    const scaleX = preview.width / bounds.width;

    context.strokeStyle = selectionColor;
    context.lineWidth = 2 * scaleX;
    context.setLineDash([10, 7]);

    context.strokeRect(
        selection.x,
        selection.y,
        selection.width,
        selection.height
    );

    context.restore();
}

//Switch selection color between cream and black
selectionColorButton.addEventListener("click", () => {
    if (selectionColor === "#fef0e7") {
        selectionColor = "#000000";
        selectionColorButton.textContent = "Use cream border";
    } else {
        selectionColor = "#fef0e7";
        selectionColorButton.textContent = "Use black border";
    }

    redrawPreview();
});

//convert each pant color from hex to HSB
function hexToRgb(hex) {
    return {
        r: parseInt(hex.slice(1, 3), 16),
        g: parseInt(hex.slice(3, 5), 16),
        b: parseInt(hex.slice(5, 7), 16)
    };
}

//Find distance of two specific hues in an image
function hueDistance(firstHue, secondHue) {
    const difference = Math.abs(firstHue - secondHue);
    return Math.min(difference, 360 - difference);
}

//Calculate how well a pair of pants matches the shirt color
function calculatePantScore(shirtHsb, pantHex) {
    const pantRgb = hexToRgb(pantHex);
    const pantHsb = rgbToHsb(pantRgb);

    //Find distance between shirt hue and pant hue
    const hueDifference = hueDistance(shirtHsb.h, pantHsb.h);

    //Store the pant's hue compatability score
    let hueScore;

    //Similar hues get a moderate score
    //A larger hue difference creates a complementary contrast
    if (hueDifference < 25) {
        hueScore = 70;
    } else if (hueDifference < 60) {
        hueScore = 85;
    } else if (hueDifference < 120) {
        hueScore = 100;
    //Other combinations are set at an acceptable level
    } else {
        hueScore = 75;
    }

    //Measure the difference between shirt and pants brightness
    const brightnessDifference =
        Math.abs(shirtHsb.b - pantHsb.b);

    //Turn the brightness contrast into a score
    const contrastScore = Math.min(
        100,
        50 + brightnessDifference
    );

    //Combine the two score with hue as 60% and contrast as 40% 
    return Math.round(
        hueScore * 0.6 + contrastScore * 0.4
    );
}

//Load the image into the app
function loadImageFile(file) {
    if (!file) {
        return;
    }
    // make the canvas same size as image
    const image = new Image();
    image.onload = () => {
        preview.width = image.width;
        preview.height = image.height;

        originalCanvas = document.createElement("canvas");
        originalCanvas.width = image.width;
        originalCanvas.height = image.height;

        const originalContext = originalCanvas.getContext("2d");
        context.clearRect(0, 0, preview.width, preview.height);
        originalContext.drawImage(image, 0, 0);

        context.drawImage(image, 0, 0);
        
        //remove the container border after image upload
        previewFrame.classList.add("has-image");
        preview.style.visibility = "visible";
        preview.style.borderColor = "#f3f0e7";
        previewPlaceholder.style.display = "none";
    }

    image.src = URL.createObjectURL(file);

}

//record when the mouse is pressed and save those coordinates
preview.addEventListener("mousedown", (event) => {
    const point = getCanvasPoint(event);

    selectionStart = point;
    selection = {
        x: point.x,
        y: point.y,
        width: 0,
        height: 0
    };
    selectionHint.textContent = "Release to analyze this area";
});

//track mouse movement when dragging over the image
preview.addEventListener("mousemove", (event) => {
    if (!selectionStart) {
        return;
    }

    const currentPoint = getCanvasPoint(event);

    selection = {
        x: Math.min(selectionStart.x, currentPoint.x),
        y: Math.min(selectionStart.y, currentPoint.y),
        width: Math.abs(currentPoint.x - selectionStart.x),
        height: Math.abs(currentPoint.y - selectionStart.y)
    };

    redrawPreview();
});

//track when mouse is released
preview.addEventListener("mouseup", () => {
    selectionStart = null;

    if (selection && selection.width > 5 && selection.height > 5) {
        analyzeSelectedRegion();
    }
    selectionHint.textContent = "Selection analyzed: drag again to retry";
});

//Reset button event listener
resetButton.addEventListener("click", () => {
    imageInput.value = "";

    context.clearRect(0, 0, preview.width, preview.height);

    preview.style.visibility = "hidden";
    previewFrame.classList.remove("has-image");
    previewPlaceholder.style.display = "grid";

    colorName.textContent = "No color detected";
    colorDetails.textContent = "Upload an image to begin.";

    visualSwatch.style.backgroundColor = "transparent";
    visualSwatch.style.borderColor = "var(--cream)";

    originalCanvas = null;
    selection = null;
    selectionStart = null;

    pantList.innerHTML = "";
    pantCount.textContent = "0 colors";
    matchStatus.textContent = "Color matching";
    selectionHint.innerHTML = `<span class="hint-icon">↗</span>Click and drag over the shirt to identify its color`;
});

//Allow the user to paste images into the file
//Reset if an image is pasted while another image is already on display
document.addEventListener("paste", (event) => {
    const clipboardItems = event.clipboardData.items;

    for (const item of clipboardItems) {
        if (item.type.startsWith("image/")) {
            const imageFile = item.getAsFile();

            resetButton.click();
            loadImageFile(imageFile);

            event.preventDefault();
            return;
        }
    }
});
  
//Check if user does an action
imageInput.addEventListener("change", () => {
    const file = imageInput.files[0];
    loadImageFile(file);
});

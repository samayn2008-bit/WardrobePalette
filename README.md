# Wardrobe Palette

Wardrobe Palette is a browser-based color-matching app that helps users find pants that complement a shirt.

Users can upload or paste an image, select the shirt area, and receive color-based pants recommendations.

## Features
- Upload, drag and drop, or paste an image
- Manually select the shirt with a drag box
- Calculate the selected region’s average RGB color
- Display a readable detected color name
- Show the detected color with a sample
- Rank compatible pant colors from strongest to weakest match
- Display recommendation scores with visual bars
- Change the selection-border color
- Reset the current analysis
- Interactive interface with animations

## Built With
- HTML
- CSS
- JavaScript
- HTML Canvas API
- RGB and HSB color calculations

## Project Structure

```bash
wardrobe-javascript/
├── index.html
├── style.css
└── app.js

```

## How to Run Wardrobe Palette

1. Download or clone the folder called:
```text
wardrobe-app
```
  
2. Open Terminal and move into the project folder:
```bash
cd "/Users/your-name/App Project/wardrobe-javascript"
```

4. Start a local web server, enter this:
```bash
python3 -m http.server 8000
```

4. Open a browser and open:
http://localhost:8000


6. Use the app
- Click Choose a photo.
- Drag an image into the page.
- Paste an image with Command + V on macOS or Ctrl + V on Windows/Linux.
- Drag a selection box over the shirt.
- Release the mouse to analyze the selected color.
- View the detected color and ranked pants recommendations.

6. To stop the server, go back to Terminal and press:
```Plain text
Control + C
```




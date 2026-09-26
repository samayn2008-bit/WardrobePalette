import java.awt.*;
import java.awt.datatransfer.DataFlavor;
import java.awt.dnd.DropTarget;
import java.awt.dnd.DropTargetAdapter;
import java.awt.dnd.DropTargetDropEvent;
import java.awt.image.BufferedImage;
import java.io.File;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import javax.imageio.ImageIO;
import javax.swing.*;
import javax.swing.border.*;
import javax.swing.filechooser.FileNameExtensionFilter;
import java.util.ArrayDeque;
import java.awt.event.*;

/* A standalone desktop version of the Wardrobe Palette color-matching app */
public class WardrobePaletteApp extends JFrame {
    private static final Color INK = Color.decode("#1E2523");
    private static final Color PAPER = Color.decode("#F3F0E7");
    private static final Color MUTED = Color.decode("#B0B9AE");
    private static final Color DENIM = Color.decode("#91B59B");
    private static final Pant[] PANTS = {
        new Pant("Khaki", "#C3B091"), new Pant("Navy", "#1F2A44"),
        new Pant("Charcoal", "#36393D"), new Pant("Olive", "#556B2F"),
        new Pant("Black", "#1B1B1D"), new Pant("White", "#F5F5F0"),
        new Pant("Denim blue", "#4B6584"), new Pant("Burgundy", "#6E2C3B")
    };

    private final JPanel results = new JPanel();
    
    private final ImagePreview preview = new ImagePreview();
    private BufferedImage currentImage;
    private final JLabel status = label("Choose a photo to get started.", 13, MUTED, Font.PLAIN);
    private final JCheckBox removeBackground = new JCheckBox("Ignore background", true);
    private final JSlider tolerance = new JSlider(5, 100, 35);
    private long loadVersion;
    private final JLabel shirtName = new JLabel("—");
    
    private final JLabel shirtHex = new JLabel("—");
    private final JPanel shirtSwatch = new JPanel();
    private final JPanel pantList = new JPanel();
    
    public WardrobePaletteApp() {
        super("Wardrobe Palette");
        setDefaultCloseOperation(EXIT_ON_CLOSE);
        setMinimumSize(new Dimension(620, 620));
        setSize(760, 900);
        setLocationByPlatform(true);

        JPanel root = new JPanel();
        root.setBackground(INK);
        root.setBorder(new EmptyBorder(38, 38, 38, 38));
        root.setLayout(new BoxLayout(root, BoxLayout.Y_AXIS));

        JScrollPane scrollPane = new JScrollPane(root);
        scrollPane.getViewport().setBackground(INK);
        scrollPane.setBorder(null);
        scrollPane.getVerticalScrollBar().setUnitIncrement(18);
        setContentPane(scrollPane);

        JLabel title = label("Wardrobe palette", 36, PAPER, Font.BOLD);
        JLabel subtitle = label("Choose a photo of a top to see pant colors ranked by color theory.", 14, MUTED, Font.PLAIN);
        subtitle.setBorder(new EmptyBorder(6, 0, 26, 0));
        root.add(title); 
        root.add(subtitle);

        JPanel dropzone = new JPanel(new GridLayout(2, 1, 0, 4));
        dropzone.setBackground(new Color(47, 65, 55));
        dropzone.setBorder(new CompoundBorder(new LineBorder(DENIM, 2, true), new EmptyBorder(28, 16, 28, 16)));
        dropzone.setMaximumSize(new Dimension(Integer.MAX_VALUE, 120));
        JLabel prompt = label("Drop a photo here, or click to choose one", 16, PAPER, Font.BOLD);
        JLabel types = label("JPG, PNG, and other supported image files", 13, PAPER, Font.PLAIN);
        prompt.setHorizontalAlignment(SwingConstants.CENTER); 
        types.setHorizontalAlignment(SwingConstants.CENTER);
        dropzone.add(prompt); 
        dropzone.add(types);
        dropzone.setCursor(Cursor.getPredefinedCursor(Cursor.HAND_CURSOR));

        dropzone.addMouseListener(new java.awt.event.MouseAdapter() {
            public void mouseClicked(java.awt.event.MouseEvent e) {
                chooseFile();
             }
        });        

        new DropTarget(dropzone, new DropTargetAdapter() {
            @Override public void drop(DropTargetDropEvent e) {
                try {
                    if (!e.isDataFlavorSupported(DataFlavor.javaFileListFlavor)) {
                        e.rejectDrop();
                        return;
                    }
                    e.acceptDrop(java.awt.dnd.DnDConstants.ACTION_COPY);
                    @SuppressWarnings("unchecked") List<File> files = (
                        List<File>) e.getTransferable().getTransferData(DataFlavor.javaFileListFlavor);
                    if (!files.isEmpty()) {
                        SwingUtilities.invokeLater(() -> loadImage(files.get(0)));
                    }
                    e.dropComplete(true);
                } catch (Exception ex) { 
                    showImageError(ex); 
                }
            }
        });
        dropzone.setAlignmentX(LEFT_ALIGNMENT);
        JButton browse = new JButton("Choose photo");
        browse.addActionListener(e -> chooseFile());
        dropzone.add(browse);
        dropzone.setLayout(new GridLayout(3, 1, 0, 6));
        dropzone.setMaximumSize(new Dimension(Integer.MAX_VALUE, 165));
        root.add(dropzone);
        root.add(Box.createVerticalStrut(28));

        results.setOpaque(false);
        results.setLayout(new BoxLayout(results, BoxLayout.Y_AXIS));
        results.setVisible(false);

        // Added 
        results.setAlignmentX(LEFT_ALIGNMENT);

        preview.setAlignmentX(LEFT_ALIGNMENT);
        results.add(preview);
        results.add(Box.createVerticalStrut(12));

        JPanel controls = new JPanel(new FlowLayout(FlowLayout.LEFT, 8, 4));
        controls.setOpaque(false);
        controls.setAlignmentX(LEFT_ALIGNMENT);
        controls.setMaximumSize(new Dimension(Integer.MAX_VALUE, 48));

        removeBackground.setOpaque(false);
        removeBackground.setForeground(PAPER);
        removeBackground.addActionListener(e -> analyzeImage());

        tolerance.setOpaque(false);
        tolerance.setPreferredSize(new Dimension(110, 24));
        tolerance.setToolTipText(
            "Higher values remove more edge-connected background colors."
        );

        tolerance.addChangeListener(e -> {
            if (!tolerance.getValueIsAdjusting()) {
                analyzeImage();
            }
        });

        JButton reset = new JButton("Reset selection");
        reset.addActionListener(e -> {
        preview.selection = null;
            analyzeImage();
        });

        controls.add(removeBackground);
        controls.add(label("Tolerance", 12, MUTED, Font.PLAIN));
        controls.add(tolerance);
        controls.add(reset);

        results.add(controls);
        results.add(label(
            "Drag over the shirt to select a region on busy backgrounds.",
            13,
            MUTED,
            Font.PLAIN
        ));
        results.add(Box.createVerticalStrut(20));

        JPanel shirt = new JPanel(new FlowLayout(FlowLayout.LEFT, 14, 0)); 
        shirt.setOpaque(false); 
        shirt.setAlignmentX(LEFT_ALIGNMENT);

        shirtSwatch.setPreferredSize(new Dimension(64, 64)); 
        shirtSwatch.setBorder(new LineBorder(PAPER, 1, true));
        
        JPanel info = new JPanel(); 
        info.setOpaque(false); 
        info.setLayout(new BoxLayout(info, BoxLayout.Y_AXIS));

        shirtName.setFont(new Font("Serif", Font.PLAIN, 20)); 
        shirtName.setForeground(PAPER);

        shirtHex.setFont(new Font("SansSerif", Font.PLAIN, 13)); 
        shirtHex.setForeground(MUTED);

        info.add(Box.createVerticalGlue()); 
        info.add(shirtName); 
        info.add(shirtHex); 
        info.add(Box.createVerticalGlue());

        shirt.add(shirtSwatch);
        shirt.add(info);

        results.add(shirt); 
        results.add(Box.createVerticalStrut(28));

        results.add(label("Best matching pants, ranked", 13, MUTED, Font.BOLD)); 
        results.add(Box.createVerticalStrut(10));

        pantList.setOpaque(false); 
        pantList.setLayout(new BoxLayout(pantList, BoxLayout.Y_AXIS)); 
        results.add(pantList);

        status.setAlignmentX(LEFT_ALIGNMENT);
        root.add(status);
        root.add(Box.createVerticalStrut(16));

        root.add(results);
    }

    private void chooseFile() {
        JFileChooser chooser = new JFileChooser();
        chooser.setFileFilter(new FileNameExtensionFilter(
            "Image files", "jpg", "jpeg", "png", "gif", "bmp"
        ));
        if (chooser.showOpenDialog(this) == JFileChooser.APPROVE_OPTION) {
            loadImage(chooser.getSelectedFile());
        }
    }

    private void loadImage(File file) {
        long version = ++loadVersion;
        status.setText("Opening photo…");

        new SwingWorker<BufferedImage, Void>() {
            @Override
            protected BufferedImage doInBackground() throws Exception {
                BufferedImage image = ImageIO.read(file);

                if (image == null) {
                    throw new IllegalArgumentException(
                        "That image format is not supported."
                    );
                }

                double ratio = Math.min(
                    1,
                    1000.0 / Math.max(image.getWidth(), image.getHeight())
                );

                int width = Math.max(1, (int) (image.getWidth() * ratio));
                int height = Math.max(1, (int) (image.getHeight() * ratio));

                return scale(image, width, height);
            }

            @Override
            protected void done() {
                if (version != loadVersion) {
                    return;
                }

                try {
                    currentImage = get();
                    preview.selection = null;
                    results.setVisible(true);
                    analyzeImage();
                } catch (Exception e) {
                    status.setText("Could not open photo. Choose another image.");
                    showImageError(e);
                }
            }
        }.execute();
    }

    private void analyzeImage() {
        if (currentImage == null) {
            return;
        }
        BufferedImage region = currentImage;

        if (preview.selection != null) {
            Rectangle r = preview.selection;
            region = currentImage.getSubimage(r.x, r.y, r.width, r.height);
        }

        boolean filterBackground = 
            removeBackground.isSelected() && preview.selection == null;

        Analysis analysis = extractColor(
            region,
            filterBackground,
            tolerance.getValue()
        );
        
        preview.display = preview.selection == null ? analysis.masked : currentImage;
        preview.repaint();
        
        if (analysis.color == null) {
            status.setText("No distinct foreground found. Drag over the shirt to select it.");
            shirtName.setText("Select the shirt");
            shirtHex.setText("—");
            shirtSwatch.setBackground(INK);
            pantList.removeAll();
        } else {
            Color shirt = analysis.color;
            shirtSwatch.setBackground(shirt);
            shirtName.setText(nameForHsl(toHsl(shirt)));
            shirtHex.setText(hex(shirt));
            showRankings(shirt);
            status.setText(preview.selection != null ? "Using your selection. Drag again to refine it."
                : removeBackground.isSelected() ? "Background filtered. Check the preview; select the shirt if needed."
                : "Using the full photo. Transparent pixels are ignored.");
        }
        revalidate();
        repaint();
    }
    
    private void showRankings(Color shirt) {
        Hsl shirtHsl = toHsl(shirt);
        List<ScoredPant> scored = new ArrayList<>();
        for (Pant pant : PANTS) {
            Color pantColor = Color.decode(pant.hex);
            Hsl pantHsl = toHsl(pantColor);
            double matchScore = score(shirtHsl, pantHsl);
            scored.add(new ScoredPant(pant, matchScore));
        }

        scored.sort(Comparator.comparingDouble(ScoredPant::score).reversed());

        pantList.removeAll();
        double max = scored.get(0).score;

        for (int i = 0; i < scored.size(); i++) {
            pantList.add(pantCard(scored.get(i), i == 0, max));
            pantList.add(Box.createVerticalStrut(8));
        }
    }

    private JPanel pantCard(ScoredPant ranked, boolean best, double max) {
        JPanel row = new JPanel(new BorderLayout(12, 0));
        Color backgroundColor;
        Color borderColor;

        if (best) {
            backgroundColor = new Color(47, 65, 55);
            borderColor = DENIM;
        } else {
            backgroundColor = new Color(43, 39, 36);
            borderColor = new Color(80, 75, 68);
        }

        row.setBackground(backgroundColor);

        row.setBorder(new CompoundBorder(
            new LineBorder(borderColor, 1, true),
            new EmptyBorder(10, 12, 10, 12)
        ));
        
        row.setMaximumSize(new Dimension(Integer.MAX_VALUE, 62)); 
        row.setAlignmentX(LEFT_ALIGNMENT);

        JPanel swatch = new JPanel(); 
        swatch.setBackground(Color.decode(ranked.pant.hex)); 
        swatch.setPreferredSize(new Dimension(36, 36)); 
        row.add(swatch, BorderLayout.WEST);

        JPanel text = new JPanel(); 
        text.setOpaque(false); 
        text.setLayout(new BoxLayout(text, BoxLayout.Y_AXIS));

        text.add(label(ranked.pant.name, 14, PAPER, Font.BOLD)); 
        text.add(label(ranked.pant.hex, 12, MUTED, Font.PLAIN)); 
        row.add(text, BorderLayout.CENTER);

        JProgressBar score = new JProgressBar(0, 100); 
        score.setValue((int) Math.round(ranked.score / max * 100)); 
        score.setPreferredSize(new Dimension(72, 8)); 
        score.setForeground(DENIM); 
        score.setBackground(INK); 
        score.setBorderPainted(false);

        row.add(score, BorderLayout.EAST);
        return row;
    }

    private static BufferedImage scale(BufferedImage src, int width, int height) {
        BufferedImage out = new BufferedImage(
            width,
            height,
            BufferedImage.TYPE_INT_ARGB
        );
        Graphics2D g = out.createGraphics(); 
        g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR); 
        g.drawImage(src, 0, 0, width, height, null); 
        g.dispose(); 
        return out;
    }

    static Analysis extractColor(
        BufferedImage image,
        boolean remove,
        int tolerance
    ) {
        double ratio = Math.min(
            1,
            280.0 / Math.max(image.getWidth(), image.getHeight())
        );

        BufferedImage sample = scale(
            image,
            Math.max(1, (int) (image.getWidth() * ratio)),
            Math.max(1, (int) (image.getHeight() * ratio))
        );

        int w = sample.getWidth();
        int h = sample.getHeight();

        boolean[] background = new boolean[w * h];
        List<Color> edges = new ArrayList<>();

        // Collect visible colors along the image boundary.
        for (int y = 0; y < h; y++) {
            for (int x = 0; x < w; x++) {
                boolean onEdge =
                x == 0 || y == 0 || x == w - 1 || y == h - 1;

                int alpha = sample.getRGB(x, y) >>> 24;

                if (onEdge && alpha >= 128) {
                    edges.add(new Color(sample.getRGB(x, y)));
                }
            }
        }

        ArrayDeque<Integer> queue = new ArrayDeque<>();

        if (remove) {
            // Start with pixels along the image boundary.
            for (int y = 0; y < h; y++) {
                for (int x = 0; x < w; x++) {
                    if (x == 0 || y == 0 || x == w - 1 || y == h - 1) {
                        int index = y * w + x;
                        background[index] = true;
                        queue.add(index);
                    }
                }
            }

            // Visit connected pixels matching background colors.
            while (!queue.isEmpty()) {
                int index = queue.removeFirst();
                int x = index % w;
                int y = index / w;

                int[] neighbors = {
                    x > 0 ? index - 1 : -1,
                    x + 1 < w ? index + 1 : -1,
                    y > 0 ? index - w : -1,
                    y + 1 < h ? index + w : -1
                };

                for (int next : neighbors) {
                    if (next < 0 || background[next]) {
                        continue;
                    }

                    int rgb = sample.getRGB(next % w, next / w);
                    boolean matches = (rgb >>> 24) < 128;
                    Color pixel = new Color(rgb);

                    for (Color edge : edges) {
                        int dr = pixel.getRed() - edge.getRed();
                        int dg = pixel.getGreen() - edge.getGreen();
                        int db = pixel.getBlue() - edge.getBlue();

                        int distance = dr * dr + dg * dg + db * db;

                        if (distance <= tolerance * tolerance) {
                            matches = true;
                            break;
                        }
                    }

                    if (matches) {
                        background[next] = true;
                        queue.add(next);
                    }
                }
            }
        }

        long r = 0;
        long g = 0;
        long b = 0;
        long weight = 0;

        // Average retained pixels, weighted by opacity.
        for (int y = 0; y < h; y++) {
            for (int x = 0; x < w; x++) {
                int rgb = sample.getRGB(x, y);
                int alpha = rgb >>> 24;
                if (background[y * w + x] || alpha == 0) {
                    sample.setRGB(x, y, 0);
                    continue;
                }

                Color pixel = new Color(rgb);

                r += (long) pixel.getRed() * alpha;
                g += (long) pixel.getGreen() * alpha;
                b += (long) pixel.getBlue() * alpha;
                weight += alpha;
            }
        }

        Color color = null;

        if (weight > 0) {
            color = new Color(
            (int) (r / weight),
            (int) (g / weight),
            (int) (b / weight)
            );
        }

        return new Analysis(color, sample);
    }

    record Analysis(Color color, BufferedImage masked) { }

    private class ImagePreview extends JPanel {
        BufferedImage display;
        Rectangle selection;
        Point start;
        Rectangle imageBounds = new Rectangle();

        ImagePreview() {
            setPreferredSize(new Dimension(580, 270));
            setMaximumSize(new Dimension(Integer.MAX_VALUE, 270));
            setCursor(Cursor.getPredefinedCursor(Cursor.CROSSHAIR_CURSOR));
            MouseAdapter mouse = new MouseAdapter() {
                public void mousePressed(MouseEvent e) {
                    if (currentImage != null && imageBounds.contains(e.getPoint())) start = imagePoint(e.getPoint());
                }
                public void mouseDragged(MouseEvent e) {
                    if (start == null) return;
                    Point end = imagePoint(e.getPoint());
                    selection = new Rectangle(Math.min(start.x, end.x), Math.min(start.y, end.y),
                        Math.abs(end.x - start.x) + 1, Math.abs(end.y - start.y) + 1);
                    repaint();
                }
                public void mouseReleased(MouseEvent e) {
                    if (start == null) return;
                    start = null;
                    analyzeImage();
                }
            };
            addMouseListener(mouse);
            addMouseMotionListener(mouse);
        }

        private Point imagePoint(Point point) {
            int x = (int)((point.x - imageBounds.x) * (double)currentImage.getWidth() / imageBounds.width);
            int y = (int)((point.y - imageBounds.y) * (double)currentImage.getHeight() / imageBounds.height);
            return new Point(Math.max(0, Math.min(currentImage.getWidth() - 1, x)),
                Math.max(0, Math.min(currentImage.getHeight() - 1, y)));
        }

        protected void paintComponent(Graphics graphics) {
            super.paintComponent(graphics);
            Graphics2D g = (Graphics2D)graphics.create();
            for (int y = 0; y < getHeight(); y += 12) for (int x = 0; x < getWidth(); x += 12) {
                g.setColor((x / 12 + y / 12) % 2 == 0 ? new Color(48, 55, 51) : new Color(57, 64, 60));
                g.fillRect(x, y, 12, 12);
            }
            if (display != null && currentImage != null) {
                double ratio = Math.min((double)getWidth() / currentImage.getWidth(),
                    (double)getHeight() / currentImage.getHeight());
                int w = Math.max(1, (int)(currentImage.getWidth() * ratio));
                int h = Math.max(1, (int)(currentImage.getHeight() * ratio));
                imageBounds.setBounds((getWidth() - w) / 2, (getHeight() - h) / 2, w, h);
                g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
                g.drawImage(display, imageBounds.x, imageBounds.y, w, h, null);
                if (selection != null) {
                    g.setColor(DENIM);
                    g.setStroke(new BasicStroke(2));
                    g.drawRect(imageBounds.x + (int)(selection.x * ratio), imageBounds.y + (int)(selection.y * ratio),
                        (int)(selection.width * ratio), (int)(selection.height * ratio));
                }
            }
            g.dispose();
        }
    }

    private static Hsl toHsl(Color color) {
        float[] hsl = Color.RGBtoHSB(color.getRed(), color.getGreen(), color.getBlue(), null); 
        return new Hsl(hsl[0] * 360, hsl[1], hsl[2]); 
    }
    
    private static double hueDistance(double a, double b) { 
        double d = Math.abs(a - b) % 360; 
        if (d > 180) {
            return 360-d;
        }
        return d;
    }

    private static double score(Hsl shirt, Hsl pant) { 
        if (pant.s < 0.15) {
            double difference = Math.abs(shirt.l - pant.l);
            return 70 + difference*30;
        }

        double oppositeHue = (shirt.h + 180) % 360;
        double difference = hueDistance(pant.h, oppositeHue);
        return 100 - difference;
    }

    private static String hex(Color c) { 
        return String.format("#%02X%02X%02X", c.getRed(), c.getGreen(), c.getBlue()); 
    }

    private static String nameForHsl(Hsl hsl) {
        if (hsl.s < .12) {
            if (hsl.l < 0.18) {
                return "Black";
            } else if (hsl.l > 0.85) {
                return "White";
            } else if (hsl.l < 0.5) {
                return "Charcoal Gray";
            } else {
                return "Light Gray";
            }
        }
        String[] names = {"Red", "Orange", "Gold", "Yellow-green", "Green", "Teal", "Sky blue", "Blue", "Indigo", "Purple", "Pink", "Red"};
        int[] limits = {15, 45, 70, 100, 150, 180, 210, 250, 280, 320, 345, 361};
        for (int i = 0; i < limits.length; i++) {
            if (hsl.h < limits[i]) {
                String shade = "";

                if (hsl.l < 0.35) {
                    shade = "Dark ";
                } else if (hsl.l > 0.7) {
                    shade = "Light ";
                }

                return shade + names[i].toLowerCase();
            }
        }
        return "Red";
    }


    private static JLabel label(String text, int size, Color color, int style) { 
        JLabel label = new JLabel(text); 
        label.setFont(new Font("SansSerif", style, size)); 
        label.setForeground(color); 
        return label; 
    }
    private void showImageError(Exception e) { 
        JOptionPane.showMessageDialog(this, e.getMessage(), "Could not open image", JOptionPane.ERROR_MESSAGE); 
    }
    private record Pant(String name, String hex) { }
    private record Hsl(double h, double s, double l) { }
    private record ScoredPant(Pant pant, double score) { }
    public static void main(String[] args) { 
        SwingUtilities.invokeLater(() -> new WardrobePaletteApp().setVisible(true)); 
    }
}

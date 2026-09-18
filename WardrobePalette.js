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

/** A standalone desktop version of the Wardrobe Palette color-matching app. */
public class WardrobePaletteApp extends JFrame {
    private static final Color INK = Color.decode("#262220");
    private static final Color PAPER = Color.decode("#EFE9DF");
    private static final Color MUTED = Color.decode("#8A8374");
    private static final Color DENIM = Color.decode("#5A6E8C");
    private static final Pant[] PANTS = {
        new Pant("Khaki", "#C3B091"), new Pant("Navy", "#1F2A44"),
        new Pant("Charcoal", "#36393D"), new Pant("Olive", "#556B2F"),
        new Pant("Black", "#1B1B1D"), new Pant("White", "#F5F5F0"),
        new Pant("Denim blue", "#4B6584"), new Pant("Burgundy", "#6E2C3B")
    };

    private final JPanel results = new JPanel();
    private final JLabel preview = new JLabel();
    private final JLabel shirtName = new JLabel("—");
    private final JLabel shirtHex = new JLabel("—");
    private final JPanel shirtSwatch = new JPanel();
    private final JPanel pantList = new JPanel();

    public WardrobePaletteApp() {
        super("Wardrobe Palette");
        setDefaultCloseOperation(EXIT_ON_CLOSE);
        setMinimumSize(new Dimension(620, 620));
        setSize(680, 760);
        setLocationByPlatform(true);

        JPanel root = new JPanel();
        root.setBackground(INK);
        root.setBorder(new EmptyBorder(38, 38, 38, 38));
        root.setLayout(new BoxLayout(root, BoxLayout.Y_AXIS));
        setContentPane(new JScrollPane(root) {{ getViewport().setBackground(INK); setBorder(null); }});

        JLabel title = label("Wardrobe palette", 30, PAPER, Font.PLAIN);
        JLabel subtitle = label("Choose a photo of a top to see pant colors ranked by color theory.", 14, MUTED, Font.PLAIN);
        subtitle.setBorder(new EmptyBorder(6, 0, 26, 0));
        root.add(title); root.add(subtitle);

        JPanel dropzone = new JPanel(new GridLayout(2, 1, 0, 4));
        dropzone.setBackground(new Color(58, 74, 99));
        dropzone.setBorder(new CompoundBorder(new LineBorder(DENIM, 2, true), new EmptyBorder(28, 16, 28, 16)));
        dropzone.setMaximumSize(new Dimension(Integer.MAX_VALUE, 120));
        JLabel prompt = label("Drop a photo here, or click to choose one", 16, PAPER, Font.BOLD);
        JLabel types = label("JPG, PNG, and other supported image files", 13, PAPER, Font.PLAIN);
        prompt.setHorizontalAlignment(SwingConstants.CENTER); types.setHorizontalAlignment(SwingConstants.CENTER);
        dropzone.add(prompt); dropzone.add(types);
        dropzone.setCursor(Cursor.getPredefinedCursor(Cursor.HAND_CURSOR));
        dropzone.addMouseListener(new java.awt.event.MouseAdapter() { public void mouseClicked(java.awt.event.MouseEvent e) { chooseFile(); } });
        new DropTarget(dropzone, new DropTargetAdapter() {
            @Override public void drop(DropTargetDropEvent e) {
                try {
                    e.acceptDrop(e.getDropAction());
                    @SuppressWarnings("unchecked") List<File> files = (List<File>) e.getTransferable().getTransferData(DataFlavor.javaFileListFlavor);
                    if (!files.isEmpty()) loadImage(files.getFirst());
                } catch (Exception ex) { showImageError(ex); }
            }
        });
        root.add(dropzone);
        root.add(Box.createVerticalStrut(28));

        results.setOpaque(false);
        results.setLayout(new BoxLayout(results, BoxLayout.Y_AXIS));
        results.setVisible(false);
        JPanel shirt = new JPanel(new FlowLayout(FlowLayout.LEFT, 14, 0)); shirt.setOpaque(false); shirt.setAlignmentX(LEFT_ALIGNMENT);
        preview.setPreferredSize(new Dimension(64, 64)); preview.setBorder(new LineBorder(PAPER, 1, true));
        shirtSwatch.setPreferredSize(new Dimension(64, 64)); shirtSwatch.setBorder(new LineBorder(PAPER, 1, true));
        JPanel info = new JPanel(); info.setOpaque(false); info.setLayout(new BoxLayout(info, BoxLayout.Y_AXIS));
        shirtName.setFont(new Font("Serif", Font.PLAIN, 20)); shirtName.setForeground(PAPER);
        shirtHex.setFont(new Font("SansSerif", Font.PLAIN, 13)); shirtHex.setForeground(MUTED);
        info.add(Box.createVerticalGlue()); info.add(shirtName); info.add(shirtHex); info.add(Box.createVerticalGlue());
        shirt.add(preview); shirt.add(shirtSwatch); shirt.add(info);
        results.add(shirt); results.add(Box.createVerticalStrut(28));
        results.add(label("Best matching pants, ranked", 13, MUTED, Font.BOLD)); results.add(Box.createVerticalStrut(10));
        pantList.setOpaque(false); pantList.setLayout(new BoxLayout(pantList, BoxLayout.Y_AXIS)); results.add(pantList);
        root.add(results);
    }

    private void chooseFile() {
        JFileChooser chooser = new JFileChooser();
        chooser.setFileFilter(new FileNameExtensionFilter("Image files", "jpg", "jpeg", "png", "gif", "bmp", "webp"));
        if (chooser.showOpenDialog(this) == JFileChooser.APPROVE_OPTION) loadImage(chooser.getSelectedFile());
    }

    private void loadImage(File file) {
        try {
            BufferedImage image = ImageIO.read(file);
            if (image == null) throw new IllegalArgumentException("That file is not a supported image.");
            Color shirt = averageColor(image);
            preview.setIcon(new ImageIcon(scale(image, 64, 64)));
            shirtSwatch.setBackground(shirt);
            shirtName.setText(nameForHsl(toHsl(shirt)));
            shirtHex.setText(hex(shirt));
            showRankings(shirt);
            results.setVisible(true);
            revalidate(); repaint();
        } catch (Exception e) { showImageError(e); }
    }

    private void showRankings(Color shirt) {
        Hsl shirtHsl = toHsl(shirt);
        List<ScoredPant> scored = new ArrayList<>();
        for (Pant pant : PANTS) scored.add(new ScoredPant(pant, score(shirtHsl, toHsl(Color.decode(pant.hex)))));
        scored.sort(Comparator.comparingDouble(ScoredPant::score).reversed());
        pantList.removeAll(); double max = scored.getFirst().score;
        for (int i = 0; i < scored.size(); i++) pantList.add(pantCard(scored.get(i), i == 0, max));
    }

    private JPanel pantCard(ScoredPant ranked, boolean best, double max) {
        JPanel row = new JPanel(new BorderLayout(12, 0));
        row.setBackground(best ? new Color(58, 74, 99) : new Color(43, 39, 36));
        row.setBorder(new CompoundBorder(new LineBorder(best ? DENIM : new Color(80, 75, 68), 1, true), new EmptyBorder(10, 12, 10, 12)));
        row.setMaximumSize(new Dimension(Integer.MAX_VALUE, 62)); row.setAlignmentX(LEFT_ALIGNMENT);
        JPanel swatch = new JPanel(); swatch.setBackground(Color.decode(ranked.pant.hex)); swatch.setPreferredSize(new Dimension(36, 36)); row.add(swatch, BorderLayout.WEST);
        JPanel text = new JPanel(); text.setOpaque(false); text.setLayout(new BoxLayout(text, BoxLayout.Y_AXIS));
        text.add(label(ranked.pant.name, 14, PAPER, Font.BOLD)); text.add(label(ranked.pant.hex, 12, MUTED, Font.PLAIN)); row.add(text, BorderLayout.CENTER);
        JProgressBar score = new JProgressBar(0, 100); score.setValue((int) Math.round(ranked.score / max * 100)); score.setPreferredSize(new Dimension(72, 8)); score.setForeground(DENIM); score.setBackground(INK); score.setBorderPainted(false);
        row.add(score, BorderLayout.EAST); pantList.add(row); pantList.add(Box.createVerticalStrut(8));
        return row;
    }

    private static BufferedImage scale(BufferedImage src, int width, int height) {
        BufferedImage out = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = out.createGraphics(); g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR); g.drawImage(src, 0, 0, width, height, null); g.dispose(); return out;
    }
    private static Color averageColor(BufferedImage image) {
        BufferedImage sample = scale(image, 100, 100); long r = 0, g = 0, b = 0;
        for (int y = 0; y < 100; y++) for (int x = 0; x < 100; x++) { Color p = new Color(sample.getRGB(x, y)); r += p.getRed(); g += p.getGreen(); b += p.getBlue(); }
        return new Color((int)(r / 10000), (int)(g / 10000), (int)(b / 10000));
    }
    private static Hsl toHsl(Color color) { float[] hsl = Color.RGBtoHSB(color.getRed(), color.getGreen(), color.getBlue(), null); return new Hsl(hsl[0] * 360, hsl[1], hsl[2]); }
    private static double hueDistance(double a, double b) { double d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; }
    private static double score(Hsl shirt, Hsl pant) { return pant.s < .15 ? 70 + Math.abs(shirt.l - pant.l) * 30 : 100 - hueDistance(pant.h, (shirt.h + 180) % 360); }
    private static String hex(Color c) { return String.format("#%02X%02X%02X", c.getRed(), c.getGreen(), c.getBlue()); }
    private static String nameForHsl(Hsl hsl) {
        if (hsl.s < .12) return hsl.l < .18 ? "Black" : hsl.l > .85 ? "White" : hsl.l < .5 ? "Charcoal gray" : "Light gray";
        String[] names = {"Red", "Orange", "Gold", "Yellow-green", "Green", "Teal", "Sky blue", "Blue", "Indigo", "Purple", "Pink", "Red"};
        int[] limits = {15, 45, 70, 100, 150, 180, 210, 250, 280, 320, 345, 361};
        for (int i = 0; i < limits.length; i++) if (hsl.h < limits[i]) return (hsl.l < .35 ? "Dark " : hsl.l > .7 ? "Light " : "") + names[i].toLowerCase();
        return "Red";
    }
    private static JLabel label(String text, int size, Color color, int style) { JLabel label = new JLabel(text); label.setFont(new Font("SansSerif", style, size)); label.setForeground(color); return label; }
    private void showImageError(Exception e) { JOptionPane.showMessageDialog(this, e.getMessage(), "Could not open image", JOptionPane.ERROR_MESSAGE); }
    private record Pant(String name, String hex) { }
    private record Hsl(double h, double s, double l) { }
    private record ScoredPant(Pant pant, double score) { }
    public static void main(String[] args) { SwingUtilities.invokeLater(() -> new WardrobePaletteApp().setVisible(true)); }
}

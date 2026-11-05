package com.boreal.portal;

// BF_ANDROID_STAFF_v1 - "Mark up / Sign" a PDF on Android: the twin of the iPad's MultiPageAnnotatorViewController.
// Every page can be written on with a finger or a stylus (ink in dark blue, the colour of a signing pen), page by
// page, with Undo. Done saves a new PDF next to the original (the portal uploads it as "<name> (signed).pdf"; the
// original is never changed). Pages are kept as sharp images at twice screen resolution with the ink drawn on.

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Matrix;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.RectF;
import android.graphics.pdf.PdfDocument;
import android.graphics.pdf.PdfRenderer;
import android.os.Bundle;
import android.os.ParcelFileDescriptor;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.ContextCompat;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

public class MarkupActivity extends AppCompatActivity {

    public static final String EXTRA_INPUT = "bf_markup_input";
    public static final String EXTRA_OUTPUT = "bf_markup_output";
    public static final String EXTRA_PAGES = "bf_markup_pages";
    private static final int INK = 0xFF0B2A6B;

    private PdfRenderer renderer;
    private ParcelFileDescriptor descriptor;
    private File input;
    private int pageIndex = 0;
    private final List<List<float[]>> inkPerPage = new ArrayList<>(); // per page: strokes of [x0,y0,x1,y1,...] in PDF points
    private InkView ink;
    private TextView pageLabel;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        String path = getIntent().getStringExtra(EXTRA_INPUT);
        try {
            input = new File(path == null ? "" : path);
            descriptor = ParcelFileDescriptor.open(input, ParcelFileDescriptor.MODE_READ_ONLY);
            renderer = new PdfRenderer(descriptor);
        } catch (IOException | SecurityException e) {
            Toast.makeText(this, R.string.bf_markup_cannot_open, Toast.LENGTH_LONG).show();
            setResult(Activity.RESULT_CANCELED);
            finish();
            return;
        }
        for (int i = 0; i < renderer.getPageCount(); i++) inkPerPage.add(new ArrayList<>());
        setContentView(buildLayout());
        showPage(0);
    }

    @Override
    protected void onDestroy() {
        try {
            if (renderer != null) renderer.close();
            if (descriptor != null) descriptor.close();
        } catch (IOException ignored) { }
        super.onDestroy();
    }

    private int dp(int v) {
        return Math.round(TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v, getResources().getDisplayMetrics()));
    }

    private Button bar(int label, View.OnClickListener click) {
        Button b = new Button(this);
        b.setText(label);
        b.setAllCaps(false);
        b.setTextSize(TypedValue.COMPLEX_UNIT_SP, 16);
        b.setTextColor(ContextCompat.getColor(this, R.color.bf_on_brand));
        b.setBackgroundColor(Color.TRANSPARENT);
        b.setOnClickListener(click);
        return b;
    }

    private View buildLayout() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(0xFFE9ECF1);

        LinearLayout top = new LinearLayout(this);
        top.setBackgroundColor(ContextCompat.getColor(this, R.color.bf_brand));
        top.setGravity(Gravity.CENTER_VERTICAL);
        top.setPadding(dp(8), dp(8), dp(8), dp(8));
        top.addView(bar(R.string.bf_cancel, v -> { setResult(Activity.RESULT_CANCELED); finish(); }));
        pageLabel = new TextView(this);
        pageLabel.setTextColor(ContextCompat.getColor(this, R.color.bf_on_brand));
        pageLabel.setTextSize(TypedValue.COMPLEX_UNIT_SP, 16);
        pageLabel.setGravity(Gravity.CENTER);
        top.addView(pageLabel, new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f));
        top.addView(bar(R.string.bf_undo, v -> ink.undo()));
        top.addView(bar(R.string.bf_done, v -> save()));
        root.addView(top);

        ink = new InkView(this);
        root.addView(ink, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 0, 1f));

        LinearLayout bottom = new LinearLayout(this);
        bottom.setBackgroundColor(ContextCompat.getColor(this, R.color.bf_brand));
        bottom.setPadding(dp(8), dp(4), dp(8), dp(4));
        Button prev = bar(R.string.bf_previous_page, v -> showPage(pageIndex - 1));
        Button next = bar(R.string.bf_next_page, v -> showPage(pageIndex + 1));
        bottom.addView(prev, new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f));
        bottom.addView(next, new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f));
        root.addView(bottom);
        return root;
    }

    private void showPage(int index) {
        if (renderer == null || index < 0 || index >= renderer.getPageCount()) return;
        pageIndex = index;
        pageLabel.setText(String.format(Locale.getDefault(), getString(R.string.bf_page_of), index + 1, renderer.getPageCount()));
        ink.post(() -> {
            int target = Math.max(ink.getWidth(), 800);
            try (PdfRenderer.Page page = renderer.openPage(index)) {
                float scale = (float) target / page.getWidth();
                Bitmap bmp = Bitmap.createBitmap(target, Math.max(1, Math.round(page.getHeight() * scale)), Bitmap.Config.ARGB_8888);
                bmp.eraseColor(Color.WHITE);
                page.render(bmp, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY);
                ink.setPage(bmp, page.getWidth(), page.getHeight(), inkPerPage.get(index));
            }
        });
    }

    private void save() {
        if (renderer == null) return;
        File out = new File(input.getParentFile(), "signed-" + System.currentTimeMillis() + ".pdf");
        PdfDocument doc = new PdfDocument();
        Paint stroke = InkView.inkPaint(2f);
        try {
            for (int i = 0; i < renderer.getPageCount(); i++) {
                try (PdfRenderer.Page page = renderer.openPage(i)) {
                    int w = page.getWidth();
                    int h = page.getHeight();
                    Bitmap bmp = Bitmap.createBitmap(w * 2, h * 2, Bitmap.Config.ARGB_8888);
                    bmp.eraseColor(Color.WHITE);
                    page.render(bmp, null, null, PdfRenderer.Page.RENDER_MODE_FOR_PRINT);
                    PdfDocument.Page p = doc.startPage(new PdfDocument.PageInfo.Builder(w, h, i + 1).create());
                    Canvas canvas = p.getCanvas();
                    canvas.drawBitmap(bmp, null, new RectF(0, 0, w, h), new Paint(Paint.FILTER_BITMAP_FLAG));
                    for (float[] s : inkPerPage.get(i)) canvas.drawPath(InkView.pathOf(s, 1f), stroke);
                    doc.finishPage(p);
                    bmp.recycle();
                }
            }
            try (FileOutputStream fos = new FileOutputStream(out)) {
                doc.writeTo(fos);
            }
        } catch (IOException | RuntimeException e) {
            Toast.makeText(this, R.string.bf_markup_cannot_save, Toast.LENGTH_LONG).show();
            return;
        } finally {
            doc.close();
        }
        setResult(Activity.RESULT_OK, new Intent()
            .putExtra(EXTRA_OUTPUT, out.getAbsolutePath())
            .putExtra(EXTRA_PAGES, renderer.getPageCount()));
        finish();
    }

    /** One page with the ink drawn over it; strokes are kept in PDF points so they land in the same place when saved. */
    static final class InkView extends View {
        private Bitmap page;
        private float pageW = 1f;
        private float pageH = 1f;
        private List<float[]> strokes = new ArrayList<>();
        private final List<Float> current = new ArrayList<>();
        private final Matrix toScreen = new Matrix();
        private final Matrix toPage = new Matrix();
        private final Paint bitmapPaint = new Paint(Paint.FILTER_BITMAP_FLAG);

        InkView(Context c) {
            super(c);
        }

        static Paint inkPaint(float width) {
            Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
            p.setColor(INK);
            p.setStyle(Paint.Style.STROKE);
            p.setStrokeWidth(width);
            p.setStrokeCap(Paint.Cap.ROUND);
            p.setStrokeJoin(Paint.Join.ROUND);
            return p;
        }

        static Path pathOf(float[] s, float scale) {
            Path path = new Path();
            if (s.length < 2) return path;
            path.moveTo(s[0] * scale, s[1] * scale);
            for (int i = 2; i + 1 < s.length; i += 2) path.lineTo(s[i] * scale, s[i + 1] * scale);
            if (s.length == 2) path.lineTo(s[0] * scale + 0.1f, s[1] * scale + 0.1f);
            return path;
        }

        void setPage(Bitmap bmp, float w, float h, List<float[]> pageStrokes) {
            if (page != null && page != bmp) page.recycle();
            page = bmp;
            pageW = w;
            pageH = h;
            strokes = pageStrokes;
            current.clear();
            layoutMatrix();
            invalidate();
        }

        void undo() {
            if (!strokes.isEmpty()) strokes.remove(strokes.size() - 1);
            invalidate();
        }

        private void layoutMatrix() {
            if (getWidth() == 0 || getHeight() == 0) return;
            float scale = Math.min(getWidth() / pageW, getHeight() / pageH);
            float dx = (getWidth() - pageW * scale) / 2f;
            float dy = (getHeight() - pageH * scale) / 2f;
            toScreen.setScale(scale, scale);
            toScreen.postTranslate(dx, dy);
            toScreen.invert(toPage);
        }

        @Override
        protected void onSizeChanged(int w, int h, int oldw, int oldh) {
            super.onSizeChanged(w, h, oldw, oldh);
            layoutMatrix();
        }

        @Override
        protected void onDraw(Canvas canvas) {
            super.onDraw(canvas);
            if (page == null) return;
            canvas.save();
            canvas.concat(toScreen);
            canvas.drawBitmap(page, null, new RectF(0, 0, pageW, pageH), bitmapPaint);
            Paint p = inkPaint(2f);
            for (float[] s : strokes) canvas.drawPath(pathOf(s, 1f), p);
            if (current.size() >= 2) {
                float[] live = new float[current.size()];
                for (int i = 0; i < live.length; i++) live[i] = current.get(i);
                canvas.drawPath(pathOf(live, 1f), p);
            }
            canvas.restore();
        }

        @Override
        public boolean onTouchEvent(MotionEvent e) {
            if (page == null) return false;
            float[] pt = { e.getX(), e.getY() };
            toPage.mapPoints(pt);
            switch (e.getActionMasked()) {
                case MotionEvent.ACTION_DOWN:
                    current.clear();
                    current.add(pt[0]);
                    current.add(pt[1]);
                    getParent().requestDisallowInterceptTouchEvent(true);
                    break;
                case MotionEvent.ACTION_MOVE:
                    for (int h = 0; h < e.getHistorySize(); h++) {
                        float[] hp = { e.getHistoricalX(h), e.getHistoricalY(h) };
                        toPage.mapPoints(hp);
                        current.add(hp[0]);
                        current.add(hp[1]);
                    }
                    current.add(pt[0]);
                    current.add(pt[1]);
                    break;
                case MotionEvent.ACTION_UP:
                case MotionEvent.ACTION_CANCEL:
                    float[] done = new float[current.size()];
                    for (int i = 0; i < done.length; i++) done[i] = current.get(i);
                    if (done.length >= 2) strokes.add(done);
                    current.clear();
                    performClick();
                    break;
                default:
                    break;
            }
            invalidate();
            return true;
        }

        @Override
        public boolean performClick() {
            return super.performClick();
        }
    }
}

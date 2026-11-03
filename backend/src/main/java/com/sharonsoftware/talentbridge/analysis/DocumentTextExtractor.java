package com.sharonsoftware.talentbridge.analysis;

import java.io.IOException;
import java.io.InputStream;
import java.util.Locale;
import org.apache.tika.Tika;
import org.apache.tika.exception.TikaException;
import org.springframework.stereotype.Component;

@Component
public class DocumentTextExtractor {

    private final Tika tika = new Tika();

    public String extract(InputStream input, String filename) throws IOException, TikaException {
        String normalizedFilename = filename == null ? "" : filename.toLowerCase(Locale.ROOT);
        if (!normalizedFilename.endsWith(".pdf")
                && !normalizedFilename.endsWith(".docx")
                && !normalizedFilename.endsWith(".txt")) {
            throw new IllegalArgumentException("Only PDF, DOCX, and TXT submissions can be analyzed");
        }
        String text = tika.parseToString(input).trim();
        if (text.isEmpty()) {
            throw new IllegalArgumentException("The submitted file contains no extractable text");
        }
        return text;
    }
}
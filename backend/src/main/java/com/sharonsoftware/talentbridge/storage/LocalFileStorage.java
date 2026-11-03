package com.sharonsoftware.talentbridge.storage;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

@Component
public class LocalFileStorage implements FileStorage {

    private final Path rootDirectory;

    public LocalFileStorage(@Value("${app.storage.local-directory:./uploads}") String directory) {
        this.rootDirectory = Path.of(directory).toAbsolutePath().normalize();
    }

    @Override
    public StoredFile store(MultipartFile file) throws IOException {
        String storageKey = UUID.randomUUID().toString();
        Path destination = rootDirectory.resolve(storageKey).normalize();
        if (!destination.startsWith(rootDirectory)) {
            throw new IOException("Invalid storage key");
        }
        Files.createDirectories(rootDirectory);
        try (var input = file.getInputStream()) {
            Files.copy(input, destination);
        }
        return new StoredFile(storageKey, cleanFilename(file.getOriginalFilename()), file.getContentType(), file.getSize());
    }

    @Override
    public InputStream open(String storageKey) throws IOException {
        String validatedKey;
        try {
            validatedKey = UUID.fromString(storageKey).toString();
        } catch (IllegalArgumentException exception) {
            throw new IOException("Invalid storage key", exception);
        }
        Path file = rootDirectory.resolve(validatedKey).normalize();
        if (!file.startsWith(rootDirectory)) {
            throw new IOException("Invalid storage key");
        }
        return Files.newInputStream(file);
    }

    private static String cleanFilename(String filename) {
        if (filename == null || filename.isBlank()) {
            return "upload";
        }
        String basename = filename.replace('\\', '/');
        basename = basename.substring(basename.lastIndexOf('/') + 1).replaceAll("[\\p{Cntrl}]", "_");
        return basename.substring(0, Math.min(basename.length(), 255));
    }
}
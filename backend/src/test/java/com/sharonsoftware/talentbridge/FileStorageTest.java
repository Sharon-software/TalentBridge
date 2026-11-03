package com.sharonsoftware.talentbridge;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.sharonsoftware.talentbridge.storage.FileStorage;
import com.sharonsoftware.talentbridge.storage.LocalFileStorage;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;

class FileStorageTest {

    @TempDir
    Path storageDirectory;

    @Test
    void storesBytesUnderGeneratedKeyAndSanitizesOriginalFilename() throws Exception {
        byte[] content = "assignment response".getBytes(java.nio.charset.StandardCharsets.UTF_8);
        MockMultipartFile upload = new MockMultipartFile("file", "..\\private\\response.txt", "text/plain", content);
        FileStorage storage = new LocalFileStorage(storageDirectory.toString());

        FileStorage.StoredFile storedFile = storage.store(upload);

        assertEquals("response.txt", storedFile.originalFilename());
        assertTrue(storedFile.storageKey().matches("[0-9a-f-]{36}"));
        assertArrayEquals(content, Files.readAllBytes(storageDirectory.resolve(storedFile.storageKey())));
    }
}
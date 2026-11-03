package com.sharonsoftware.talentbridge.storage;

import java.io.InputStream;
import java.io.IOException;
import org.springframework.web.multipart.MultipartFile;

public interface FileStorage {

    StoredFile store(MultipartFile file) throws IOException;

    InputStream open(String storageKey) throws IOException;

    record StoredFile(String storageKey, String originalFilename, String contentType, long size) {
    }
}
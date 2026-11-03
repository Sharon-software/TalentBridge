package com.sharonsoftware.talentbridge.storage;

import java.io.IOException;
import org.springframework.web.multipart.MultipartFile;

public interface FileStorage {

    StoredFile store(MultipartFile file) throws IOException;

    record StoredFile(String storageKey, String originalFilename, String contentType, long size) {
    }
}
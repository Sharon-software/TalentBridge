package com.sharonsoftware.talentbridge.persistence;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import java.io.IOException;
import java.util.List;

@Converter
public class StringListJsonConverter implements AttributeConverter<List<String>, String> {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
    private static final TypeReference<List<String>> LIST_TYPE = new TypeReference<>() {
    };

    @Override
    public String convertToDatabaseColumn(List<String> values) {
        if (values == null) {
            return null;
        }
        try {
            return OBJECT_MAPPER.writeValueAsString(values);
        } catch (JsonProcessingException exception) {
            throw new IllegalArgumentException("Unable to serialize analysis feedback", exception);
        }
    }

    @Override
    public List<String> convertToEntityAttribute(String value) {
        if (value == null) {
            return null;
        }
        try {
            return OBJECT_MAPPER.readValue(value, LIST_TYPE);
        } catch (IOException exception) {
            throw new IllegalArgumentException("Unable to deserialize analysis feedback", exception);
        }
    }
}
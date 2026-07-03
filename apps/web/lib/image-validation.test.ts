import test from 'node:test';
import assert from 'node:assert/strict';
import {
    IMAGE_VALIDATION_CODES,
    inferMimeType,
    validateImageFile,
} from './image-validation';

test('inferMimeType uses extension when file.type is empty', () => {
    const file = { name: 'capture.PNG', type: '', size: 100 } as File;
    assert.equal(inferMimeType(file), 'image/png');
});

test('validateImageFile rejects HEIC by extension', () => {
    const file = { name: 'photo.heic', type: '', size: 100 } as File;
    const result = validateImageFile(file);
    assert.equal(result.valid, false);
    if (!result.valid) {
        assert.equal(result.error, IMAGE_VALIDATION_CODES.HEIC_UNSUPPORTED);
    }
});

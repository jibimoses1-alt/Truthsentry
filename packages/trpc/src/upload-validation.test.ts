import test from 'node:test';
import assert from 'node:assert/strict';
import {
    mimeFromFilename,
    normalizeUploadMimeType,
    UploadValidationError,
    UPLOAD_ERROR_CODES,
    validateUploadFile,
} from './upload-validation';

const ALLOWED = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_BYTES = 5_242_880;

test('normalizeUploadMimeType infers from extension when type empty', () => {
    assert.equal(normalizeUploadMimeType('', 'photo.jpg'), 'image/jpeg');
    assert.equal(normalizeUploadMimeType('application/octet-stream', 'x.png'), 'image/png');
});

test('mimeFromFilename maps common extensions', () => {
    assert.equal(mimeFromFilename('a.webp'), 'image/webp');
    assert.equal(mimeFromFilename('a.heic'), null);
});

test('validateUploadFile rejects HEIC', () => {
    assert.throws(
        () =>
            validateUploadFile({
                mimeType: 'image/heic',
                filename: 'photo.heic',
                allowedMimeTypes: ALLOWED,
                maxBytes: MAX_BYTES,
            }),
        (err: unknown) =>
            err instanceof UploadValidationError &&
            err.code === UPLOAD_ERROR_CODES.HEIC_UNSUPPORTED,
    );
});

test('validateUploadFile rejects oversize files', () => {
    assert.throws(
        () =>
            validateUploadFile({
                mimeType: 'image/png',
                filename: 'big.png',
                sizeBytes: MAX_BYTES + 1,
                allowedMimeTypes: ALLOWED,
                maxBytes: MAX_BYTES,
            }),
        (err: unknown) =>
            err instanceof UploadValidationError && err.code === UPLOAD_ERROR_CODES.TOO_LARGE,
    );
});

test('validateUploadFile accepts normalized jpeg upload', () => {
    const result = validateUploadFile({
        mimeType: '',
        filename: 'scan.jpeg',
        sizeBytes: 1024,
        allowedMimeTypes: ALLOWED,
        maxBytes: MAX_BYTES,
    });
    assert.equal(result.mimeType, 'image/jpeg');
});

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { verifyCourseOwnership } from './exam-focus';

describe('verifyCourseOwnership', () => {
  it('returns null gracefully for empty or invalid courseId and userId', async () => {
    const res1 = await verifyCourseOwnership('', '');
    assert.equal(res1, null);

    const res2 = await verifyCourseOwnership('user-1', '');
    assert.equal(res2, null);

    const res3 = await verifyCourseOwnership('', 'course-1');
    assert.equal(res3, null);
  });
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanChatTitle } from './chatTitle';

test('cleanChatTitle handles null, undefined, or empty inputs', () => {
  assert.equal(cleanChatTitle(null), 'New Study Session');
  assert.equal(cleanChatTitle(undefined), 'New Study Session');
  assert.equal(cleanChatTitle(''), 'New Study Session');
  assert.equal(cleanChatTitle('    '), 'New Study Session');
});

test('cleanChatTitle purges raw HTML and DOCTYPE fragments', () => {
  const raw1 = '<! DOCTYPE html> <html> <hend> <title>Student Registration System</title> <body>...';
  assert.equal(cleanChatTitle(raw1), 'Student Registration System');

  const raw2 = '<! DOCTYPE html> <html> <hend> <title>Student Re';
  assert.equal(cleanChatTitle(raw2), 'Student Re');

  const raw3 = '<div><h1>Separation of Powers in Ghana</h1><p>Explain the three arms...</p></div>';
  assert.equal(cleanChatTitle(raw3, 50), 'Separation of Powers in Ghana');
});

test('cleanChatTitle strips markdown and slash commands', () => {
  assert.equal(cleanChatTitle('/test BCPC 208 Contracts Law'), 'BCPC 208 Contracts Law');
  assert.equal(cleanChatTitle('/plan Week 5 Macroeconomics Revision'), 'Week 5 Macroeconomics Revision');
  assert.equal(cleanChatTitle('### Summary of Chapter 2: Tort Liability'), 'Summary of Chapter 2: Tort Liability');
  assert.equal(cleanChatTitle('**Crucial Question:** What is Consideration?'), 'Crucial Question: What is Consideration?');
});

test('cleanChatTitle handles code blocks gracefully', () => {
  const code = '```python\ndef calculate_gpa(courses):\n    return sum(courses)/len(courses)\n```';
  assert.equal(cleanChatTitle(code), 'Code & Implementation Discussion');
});

test('cleanChatTitle truncates cleanly at word boundaries', () => {
  const longPrompt = 'Can you thoroughly explain the principle of judicial review established in Marbury v Madison and how it applies to constitutional law in Ghana?';
  const cleaned = cleanChatTitle(longPrompt, 45);
  assert.ok(cleaned.length <= 48);
  assert.ok(cleaned.endsWith('...'));
  // Ensure it didn't cut words awkwardly
  assert.ok(!cleaned.includes(' judic...'));
});

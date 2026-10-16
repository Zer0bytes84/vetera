import { describe, it, expect } from 'vitest';
import { assertDocumentBundle } from '../scripts/check-document-bundle.mjs';
describe('Documents compilé', () => {
  it('accepte les dépendances partagées sans cycle', () => {
    expect(assertDocumentBundle({ page: { file: 'assets/NotesPro-test.js', imports: ['editor', 'react'] }, editor: { imports: ['react'] }, react: {} })).toBe(3);
  });
  it('rejette le cycle Documents → éditeur → Documents', () => {
    expect(() => assertDocumentBundle({ page: { file: 'assets/NotesPro-test.js', imports: ['editor'] }, editor: { imports: ['page'] } })).toThrow('Dépendance circulaire');
  });
  it('rejette un module absent', () => { expect(() => assertDocumentBundle({})).toThrow('absent'); });
});

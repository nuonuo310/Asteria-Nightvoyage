export class FakeProvider {
  identity = 'fake-v1';
  async generate({ stage, index }) {
    if (stage === 'wake') return { fragment: 'A paper light over a dry harbor.', residue: 0.1, associations: [] };
    return { event: index === 0 ? 'Paper lanterns dim over an unfinished bridge.' : 'The bridge turns sideways; the harbor remains dry.', appraisal: { goalEffect: -1, control: 0.3, uncertainty: 0.8 }, delta: { valence: -0.1, arousal: 0.1 } };
  }
}

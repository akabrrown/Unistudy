import { routeRequest } from './backend/src/lib/ai/router';

async function test() {
  try {
    const res = await routeRequest({
      userId: 'test-user',
      feature: 'flashcard_generation',
      task: 'low_priority',
      priority: 'low',
      payload: {
        text: 'Mitochondria is the powerhouse of the cell. It produces ATP.',
        title: 'Cell Biology'
      }
    } as any);
    console.log(JSON.stringify(res, null, 2));
  } catch(e) {
    console.error(e);
  }
}
test();

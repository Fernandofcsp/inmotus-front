import { fetchPhysiotherapists } from './src/lib/sheets.ts';
import 'dotenv/config';

async function run() {
  const result = await fetchPhysiotherapists();
  console.log(JSON.stringify(result, null, 2));
}
run();

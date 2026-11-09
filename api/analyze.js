import { endpoint, readJson, json } from '../server/http.mjs';
import { analyze } from '../server/analysis.mjs';
export default endpoint(async (req, res) => json(res, 200, await analyze(await readJson(req, 800_000))));

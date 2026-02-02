import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = process.env.DOTENV_CONFIG_PATH || path.join(__dirname, '..', '..', '.env');

dotenv.config({ path: envPath });

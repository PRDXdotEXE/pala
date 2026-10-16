import { createApp } from './app';
import { createAiProvider } from './ai';
import { env } from './config/env';

const app = createApp(createAiProvider());

app.listen(env.PORT, () => {
  console.log(`Server listening on http://localhost:${env.PORT}`);
});
